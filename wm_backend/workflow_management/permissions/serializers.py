# permissions/serializers.py
from rest_framework import serializers
from .models import Role, ColumnPermission, UserRole, SystemPermission
from django.contrib.auth.models import User

class ColumnPermissionSerializer(serializers.ModelSerializer):
    column_display = serializers.CharField(source='get_column_name_display', read_only=True)
    permission_display = serializers.CharField(source='get_permission_display', read_only=True)
    
    class Meta:
        model = ColumnPermission
        fields = ['id', 'column_name', 'column_display', 'permission', 'permission_display']


class SystemPermissionSerializer(serializers.ModelSerializer):
    permission_display = serializers.CharField(source='get_permission_type_display', read_only=True)
    
    class Meta:
        model = SystemPermission
        fields = ['id', 'permission_type', 'permission_display', 'granted']


class RoleSerializer(serializers.ModelSerializer):
    column_permissions = ColumnPermissionSerializer(many=True, read_only=True)
    system_permissions = SystemPermissionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'column_permissions', 'system_permissions', 'created', 'updated']
        read_only_fields = ['created', 'updated']


class RoleCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Rol oluşturma ve güncelleme için serializer
    """
    permissions = serializers.DictField(
        child=serializers.ChoiceField(choices=['none', 'read', 'write']),
        write_only=True,
        required=False,
        help_text="Kolon adı: yetki tipi şeklinde dictionary. Boş bırakılırsa tüm kolonlara okuma yetkisi verilir."
    )
    system_permissions = serializers.DictField(
        child=serializers.BooleanField(),
        write_only=True,
        required=False,
        help_text="{'work_create': true, 'work_delete': false}"
    )
    
    class Meta:
        model = Role
        fields = ['name', 'description', 'permissions', 'system_permissions']
    
    def create(self, validated_data):
        permissions_data = validated_data.pop('permissions', {})
        system_permissions_data = validated_data.pop('system_permissions', {})
        
        role = Role.objects.create(**validated_data)
        
        # Column permissions
        if permissions_data:
            # Signal tarafından oluşturulan varsayılan yetkileri sil
            role.column_permissions.all().delete()
            
            # Verilen yetkileri oluştur
            for column_name, permission in permissions_data.items():
                if column_name in [choice[0] for choice in ColumnPermission.COLUMN_CHOICES]:
                    ColumnPermission.objects.create(
                        role=role,
                        column_name=column_name,
                        permission=permission
                    )
        # Eğer permissions verilmemişse, signal otomatik olarak tüm kolonlara okuma yetkisi verecek
        
        # System permissions
        for perm_type, granted in system_permissions_data.items():
            if perm_type in [choice[0] for choice in SystemPermission.PERMISSION_CHOICES]:
                SystemPermission.objects.create(
                    role=role,
                    permission_type=perm_type,
                    granted=granted
                )
        
        return role
    
    def update(self, instance, validated_data):
        permissions_data = validated_data.pop('permissions', None)
        system_permissions_data = validated_data.pop('system_permissions', None)
        
        # Rol bilgilerini güncelle
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.save()
        
        # Column permissions güncelleme
        if permissions_data is not None:
            # Mevcut yetkileri sil
            instance.column_permissions.all().delete()
            
            # Yeni yetkileri oluştur
            for column_name, permission in permissions_data.items():
                if column_name in [choice[0] for choice in ColumnPermission.COLUMN_CHOICES]:
                    ColumnPermission.objects.create(
                        role=instance,
                        column_name=column_name,
                        permission=permission
                    )
        
        # System permissions güncelleme
        if system_permissions_data is not None:
            # Mevcut sistem izinlerini sil
            instance.system_permissions.all().delete()
            
            # Yeni sistem izinlerini oluştur
            for perm_type, granted in system_permissions_data.items():
                if perm_type in [choice[0] for choice in SystemPermission.PERMISSION_CHOICES]:
                    SystemPermission.objects.create(
                        role=instance,
                        permission_type=perm_type,
                        granted=granted
                    )
        
        return instance


class UserRoleSerializer(serializers.ModelSerializer):
    user_detail = serializers.SerializerMethodField()
    role_detail = RoleSerializer(source='role', read_only=True)
    assigned_by_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = UserRole
        fields = ['id', 'user', 'user_detail', 'role', 'role_detail', 'assigned_by_detail', 'assigned_at']
        read_only_fields = ['assigned_by', 'assigned_at']
    
    def get_user_detail(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'full_name': obj.user.get_full_name() or obj.user.username
        }
    
    def get_assigned_by_detail(self, obj):
        if obj.assigned_by:
            return {
                'id': obj.assigned_by.id,
                'username': obj.assigned_by.username,
                'full_name': obj.assigned_by.get_full_name() or obj.assigned_by.username
            }
        return None
    
    def create(self, validated_data):
        validated_data['assigned_by'] = self.context['request'].user
        return super().create(validated_data)