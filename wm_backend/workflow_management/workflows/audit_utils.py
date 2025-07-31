# workflows/audit_utils.py
from django.db import models
from .models import Movement, Work

def serialize_value(value):
    """
    Değerleri JSON serializable hale getir
    """
    if isinstance(value, models.Model):
        # ForeignKey ilişkileri için ID ve string representation
        return {
            'id': value.pk,
            'display': str(value)
        }
    elif hasattr(value, 'isoformat'):
        # Date/DateTime değerleri için ISO format
        return value.isoformat()
    elif value is None:
        return None
    else:
        # Diğer değerler için string'e çevir
        return str(value)

def log_work_action(user, work, action, old_data=None, new_data=None):
    """
    Work modelindeki değişiklikleri loglar
    
    Args:
        user: İşlemi yapan kullanıcı
        work: İşlem yapılan Work instance
        action: 'create', 'update', 'delete'
        old_data: Güncelleme durumunda eski veriler (dict)
        new_data: Güncelleme durumunda yeni veriler (dict)
    """
    
    # Kullanıcı kontrolü - Anonymous user ise log tutma
    if not user or not user.is_authenticated:
        print(f"Kullanıcı giriş yapmamış, {action} işlemi loglanmadı")
        return
    
    # Kullanıcı adı soyadı
    user_fullname = f"{user.first_name} {user.last_name}".strip()
    if not user_fullname:
        user_fullname = user.username
    
    # İş adı
    work_name = work.name if work else None
    
    if action == 'create':
        description = f"{work_name} isimli yeni iş oluşturuldu"
        changes = None
        
    elif action == 'update':
        # Sadece değişen alanları bul
        changed_data = {
            'old': {},
            'new': {}
        }
        changed_fields = []
        change_details = []
        
        if old_data and new_data:
            for field_name, old_value in old_data.items():
                new_value = new_data.get(field_name)
                if old_value != new_value:
                    # Değerleri serialize et
                    serialized_old = serialize_value(old_value)
                    serialized_new = serialize_value(new_value)
                    
                    # Sadece değişen alanları kaydet
                    changed_data['old'][field_name] = serialized_old
                    changed_data['new'][field_name] = serialized_new
                    changed_fields.append(field_name)
                    
                    # Model'deki verbose_name'i al
                    try:
                        field = work._meta.get_field(field_name)
                        field_verbose = field.verbose_name
                    except:
                        field_verbose = field_name
                    
                    # Değer formatlaması görüntüleme için
                    if isinstance(old_value, models.Model):
                        old_display = str(old_value)
                    elif old_value is None:
                        old_display = 'Boş'
                    elif isinstance(old_value, bool):
                        old_display = 'Evet' if old_value else 'Hayır'
                    else:
                        old_display = str(old_value)
                    
                    if isinstance(new_value, models.Model):
                        new_display = str(new_value)
                    elif new_value is None:
                        new_display = 'Boş'
                    elif isinstance(new_value, bool):
                        new_display = 'Evet' if new_value else 'Hayır'
                    else:
                        new_display = str(new_value)
                    
                    change_details.append(f"{field_verbose}: {old_display} → {new_display}")
        
        if change_details:
            description = f"{work_name} isimli iş güncellendi. Değişiklikler: {', '.join(change_details)}"
        else:
            description = f"{work_name} isimli iş güncellendi"
            
        changes = changed_data if changed_data['old'] else None
        
    elif action == 'delete':
        description = f"{work_name} isimli iş silindi"
        changes = None
    
    else:
        return
    
    Movement.objects.create(
        user=user,
        user_fullname=user_fullname,
        work=work if action != 'delete' else None,
        work_name=work_name,
        action=action,
        description=description,
        changes=changes
    )