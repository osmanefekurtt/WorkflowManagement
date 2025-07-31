# workflows/serializers.py
from rest_framework import serializers
from workflows.models import Work, Movement, Category, SalesChannel, WorkType
from permissions.utils import PermissionChecker


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class WorkTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkType
        fields = ['id', 'name']


class SalesChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesChannel
        fields = ['id', 'name']


class WorkflowSerializer(serializers.ModelSerializer):
    # Calculated fields
    status_code = serializers.ReadOnlyField()
    status_text = serializers.ReadOnlyField()
    status_color = serializers.ReadOnlyField()

    # Dropdown fields - read için nested, write için id
    category_detail = CategorySerializer(source='category', read_only=True)
    type_detail = WorkTypeSerializer(source='type', read_only=True)
    sales_channel_detail = SalesChannelSerializer(source='sales_channel', read_only=True)

    # Write için ID alanları
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(is_active=True),
        required=False,
        allow_null=True
    )
    type = serializers.PrimaryKeyRelatedField(
        queryset=WorkType.objects.filter(is_active=True),
        required=False,
        allow_null=True
    )
    sales_channel = serializers.PrimaryKeyRelatedField(
        queryset=SalesChannel.objects.filter(is_active=True),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Work
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Frontend'in beklediği formata uygun olması için
        if 'category_detail' in data and data['category_detail']:
            data['category_name'] = data['category_detail']['name']
        if 'type_detail' in data and data['type_detail']:
            data['type_name'] = data['type_detail']['name']
        if 'sales_channel_detail' in data and data['sales_channel_detail']:
            data['sales_channel_name'] = data['sales_channel_detail']['name']
        return data
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Request'ten user'ı al
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            
            # Superuser değilse yetki kontrolü yap
            if not user.is_superuser:
                permissions = PermissionChecker.get_user_column_permissions(user)
                
                # Okuma yetkisi olmayan alanları kaldır
                fields_to_remove = []
                for field_name in self.fields:
                    if field_name in permissions:
                        if permissions[field_name] == 'none':
                            fields_to_remove.append(field_name)
                
                for field_name in fields_to_remove:
                    self.fields.pop(field_name)
    
    def validate(self, attrs):
        """
        Yazma yetkisi kontrolü
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            
            # Superuser kontrolü
            if not user.is_superuser:
                # Sadece update işleminde kontrol yap
                if self.instance:
                    is_valid, error_message = PermissionChecker.validate_writable_fields(user, attrs)
                    if not is_valid:
                        raise serializers.ValidationError(error_message)
        
        return attrs


class MovementSerializer(serializers.ModelSerializer):
    # Geriye dönük uyumluluk için computed fields
    user_display = serializers.SerializerMethodField()
    work_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Movement
        fields = '__all__'
    
    def get_user_display(self, obj):
        # Önce user_fullname'e bak, yoksa user'dan al
        if obj.user_fullname:
            return obj.user_fullname
        elif obj.user:
            fullname = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return fullname if fullname else obj.user.username
        return 'Bilinmiyor'
    
    def get_work_display(self, obj):
        # Önce work_name'e bak, yoksa work'ten al
        if obj.work_name:
            return obj.work_name
        elif obj.work:
            return obj.work.name
        return '-'