# permissions/utils.py
from django.contrib.auth.models import User
from .models import UserRole, ColumnPermission, SystemPermission

class PermissionChecker:
    """
    Kullanıcı yetki kontrolü için yardımcı sınıf
    """
    
    @staticmethod
    def get_user_column_permissions(user):
        """
        Kullanıcının tüm kolon yetkilerini döndürür
        
        Returns:
            dict: {column_name: permission_type}
        """
        if user.is_superuser:
            # Superuser'lar tüm kolonlara yazma yetkisine sahip
            return {choice[0]: 'write' for choice in ColumnPermission.COLUMN_CHOICES}
        
        permissions = {}
        user_roles = UserRole.objects.filter(user=user).select_related('role')
        
        for user_role in user_roles:
            role_permissions = ColumnPermission.objects.filter(role=user_role.role)
            
            for perm in role_permissions:
                current_perm = permissions.get(perm.column_name, 'none')
                
                # Daha yüksek yetkiyi al (none < read < write)
                if perm.permission == 'write':
                    permissions[perm.column_name] = 'write'
                elif perm.permission == 'read' and current_perm != 'write':
                    permissions[perm.column_name] = 'read'
        
        return permissions
    
    @staticmethod
    def get_user_system_permissions(user):
        """
        Kullanıcının sistem izinlerini döndürür
        
        Returns:
            dict: {permission_type: granted}
        """
        if user.is_superuser:
            # Superuser'lar tüm izinlere sahip
            return {
                'work_create': True,
                'work_delete': True
            }
        
        permissions = {
            'work_create': False,
            'work_delete': False
        }
        
        # Kullanıcının rollerini al
        user_roles = UserRole.objects.filter(user=user).select_related('role')
        
        # Her rol için sistem izinlerini kontrol et
        for user_role in user_roles:
            system_perms = SystemPermission.objects.filter(role=user_role.role, granted=True)
            
            for perm in system_perms:
                permissions[perm.permission_type] = True
        
        return permissions
    
    @staticmethod
    def can_read_column(user, column_name):
        """
        Kullanıcının belirli bir kolonu okuyup okuyamayacağını kontrol eder
        """
        if user.is_superuser:
            return True
            
        permissions = PermissionChecker.get_user_column_permissions(user)
        perm = permissions.get(column_name, 'none')
        return perm in ['read', 'write']
    
    @staticmethod
    def can_write_column(user, column_name):
        """
        Kullanıcının belirli bir kolona yazıp yazamayacağını kontrol eder
        """
        if user.is_superuser:
            return True
            
        permissions = PermissionChecker.get_user_column_permissions(user)
        return permissions.get(column_name, 'none') == 'write'
    
    @staticmethod
    def can_create_work(user):
        """
        Kullanıcının iş oluşturma yetkisi var mı?
        """
        if user.is_superuser:
            return True
        
        permissions = PermissionChecker.get_user_system_permissions(user)
        return permissions.get('work_create', False)
    
    @staticmethod
    def can_delete_work(user):
        """
        Kullanıcının iş silme yetkisi var mı?
        """
        if user.is_superuser:
            return True
        
        permissions = PermissionChecker.get_user_system_permissions(user)
        return permissions.get('work_delete', False)
    
    @staticmethod
    def filter_readable_fields(user, data):
        """
        Kullanıcının okuma yetkisi olmadığı alanları filtreler
        """
        if user.is_superuser:
            return data
            
        permissions = PermissionChecker.get_user_column_permissions(user)
        filtered_data = {}
        
        for field, value in data.items():
            if field in permissions and permissions[field] in ['read', 'write']:
                filtered_data[field] = value
        
        # Her zaman görülebilecek sistem alanları ve ilişkili alanlar
        system_fields = [
            'id', 'created', 'updated', 
            'status_code', 'status_text', 'status_color',
            # Detail alanlarını da ekle
            'category_detail', 'type_detail', 'sales_channel_detail',
            'category_name', 'type_name', 'sales_channel_name'
        ]
        
        for field in system_fields:
            if field in data:
                filtered_data[field] = data[field]
        
        return filtered_data
    
    @staticmethod
    def validate_writable_fields(user, data):
        """
        Kullanıcının yazma yetkisi olmadığı alanları kontrol eder
        
        Returns:
            tuple: (is_valid, error_message)
        """
        if user.is_superuser:
            return True, None
            
        permissions = PermissionChecker.get_user_column_permissions(user)
        unauthorized_fields = []
        
        for field in data.keys():
            # Sistem alanlarını atla
            if field in ['id', 'created', 'updated']:
                continue
                
            if field in [choice[0] for choice in ColumnPermission.COLUMN_CHOICES]:
                if permissions.get(field, 'none') != 'write':
                    unauthorized_fields.append(field)
        
        if unauthorized_fields:
            field_names = [dict(ColumnPermission.COLUMN_CHOICES).get(f, f) for f in unauthorized_fields]
            return False, f"Bu alanlara yazma yetkiniz yok: {', '.join(field_names)}"
        
        return True, None