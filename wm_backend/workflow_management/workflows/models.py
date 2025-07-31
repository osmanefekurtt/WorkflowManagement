# models.py
from django.db import models
from django.conf import settings


class Category(models.Model):
    """Kategori seçenekleri"""
    name = models.CharField(max_length=100, unique=True, verbose_name='Kategori Adı')
    is_active = models.BooleanField(default=True, verbose_name='Aktif')
    order = models.IntegerField(default=0, verbose_name='Sıralama')
    created = models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma Tarihi')
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = 'Kategori'
        verbose_name_plural = 'Kategoriler'
        ordering = ['order', 'name']


class WorkType(models.Model):
    """İş tipi seçenekleri"""
    name = models.CharField(max_length=100, unique=True, verbose_name='Tip Adı')
    is_active = models.BooleanField(default=True, verbose_name='Aktif')
    order = models.IntegerField(default=0, verbose_name='Sıralama')
    created = models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma Tarihi')
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = 'İş Tipi'
        verbose_name_plural = 'İş Tipleri'
        ordering = ['order', 'name']


class SalesChannel(models.Model):
    """Satış kanalı seçenekleri"""
    name = models.CharField(max_length=100, unique=True, verbose_name='Kanal Adı')
    is_active = models.BooleanField(default=True, verbose_name='Aktif')
    order = models.IntegerField(default=0, verbose_name='Sıralama')
    created = models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma Tarihi')
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = 'Satış Kanalı'
        verbose_name_plural = 'Satış Kanalları'
        ordering = ['order', 'name']

# workflows/models.py içinde Work modelini güncelleyin:

class Work(models.Model):
    name = models.CharField(max_length=200, verbose_name='İsim')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Kategori')
    price = models.FloatField(verbose_name='Fiyat', blank=True, null=True)
    type = models.ForeignKey(WorkType, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Tip')
    sales_channel = models.ForeignKey(SalesChannel, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Satış Kanalı')
    design_start_date = models.DateField(verbose_name='Tasarım Başlangıç Tarihi', blank=True, null=True)
    design_end_date = models.DateField(verbose_name='Tasarım Bitiş Tarihi', blank=True, null=True)
    confirm_date = models.DateField(verbose_name='Onay Tarihi', blank=True, null=True)
    printing_location = models.CharField(max_length=100, verbose_name='Baskı Lokasyonu', blank=True, null=True)
    printing_confirm = models.BooleanField(verbose_name='Baskı Onayı', default=False)
    printing_start_date = models.DateField(verbose_name='Baskı Başlangıç Tarihi', blank=True, null=True)
    printing_end_date = models.DateField(verbose_name='Baskı Bitiş Tarihi', blank=True, null=True)
    mixed = models.BooleanField(verbose_name='Karışık', default=False)
    packaging_date = models.DateField(verbose_name='Paketleme Tarihi', blank=True, null=True)
    stock_entry = models.BooleanField(verbose_name='Stok Girişi', default=False)
    shipping_date = models.DateField(verbose_name='Sevkiyat Tarihi', blank=True, null=True)
    
    # Eski link alanlarını kaldır ve yeni JSONField ekle
    links = models.JSONField(
        verbose_name='Bağlantılar',
        default=list,
        blank=True,
        help_text='[{"url": "https://...", "title": "Başlık", "description": "Açıklama"}]'
    )
    
    # Geriye dönük uyumluluk için eski alanları geçici olarak tut
    link = models.URLField(verbose_name='Bağlantı (Eski)', blank=True, null=True)
    link_title = models.CharField(max_length=150, verbose_name='Bağlantı Başlığı (Eski)', blank=True, null=True)
    
    note = models.TextField(verbose_name='Not', blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma Tarihi', blank=True, null=True)
    updated = models.DateTimeField(auto_now=True, verbose_name='Güncellenme Tarihi', blank=True, null=True)
    
    def __str__(self):
        return f"{self.name} - {self.category}"
    
    def clean(self):
        """Link formatlarını validate et"""
        from django.core.validators import URLValidator
        from django.core.exceptions import ValidationError
        
        if self.links:
            validator = URLValidator()
            for i, link_data in enumerate(self.links):
                if not isinstance(link_data, dict):
                    raise ValidationError(f'Bağlantı {i+1}: Geçersiz format')
                
                url = link_data.get('url')
                if not url:
                    raise ValidationError(f'Bağlantı {i+1}: URL zorunludur')
                
                try:
                    validator(url)
                except ValidationError:
                    raise ValidationError(f'Bağlantı {i+1}: Geçersiz URL formatı')
    
    @property
    def calculated_status(self):
        """İşin durumunu otomatik hesapla"""
        if self.stock_entry:
            return {
                'code': 'completed',
                'text': 'Tamamlandı',
                'color': '#dc3545'  # Kırmızı
            }
        elif self.printing_confirm:
            return {
                'code': 'printing',
                'text': 'Baskı',
                'color': '#28a745'  # Yeşil
            }
        else:
            return {
                'code': 'waiting',
                'text': 'Beklemede',
                'color': '#6c757d'  # Gri
            }
    
    @property
    def status_code(self):
        return self.calculated_status['code']
    
    @property
    def status_text(self):
        return self.calculated_status['text']
    
    @property
    def status_color(self):
        return self.calculated_status['color']
    
    class Meta:
        verbose_name = 'İş'
        verbose_name_plural = 'İşler'
        ordering = ['-created']


class Movement(models.Model):
    # Mevcut user field'ı kalsın (opsiyonel olsun)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Kullanıcı'
    )
    # Yeni field: Kullanıcı adı text olarak
    user_fullname = models.CharField(
        max_length=200,
        verbose_name='Kullanıcı Adı',
        blank=True,
        null=True
    )
    
    # Mevcut work field'ı kalsın (opsiyonel olsun)
    work = models.ForeignKey(
        Work,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='İş'
    )
    # Yeni field: İş adı text olarak
    work_name = models.CharField(
        max_length=200,
        verbose_name='İş Adı',
        blank=True,
        null=True
    )
    
    action = models.CharField(
        max_length=20,
        choices=[
            ('create', 'Oluşturma'),
            ('update', 'Güncelleme'),
            ('delete', 'Silme')
        ],
        verbose_name='İşlem'
    )
    description = models.TextField(verbose_name='Açıklama')
    changes = models.JSONField(
        verbose_name='Değişiklikler',
        blank=True,
        null=True,
        help_text='Güncelleme durumunda eski ve yeni değerler'
    )
    created = models.DateTimeField(auto_now_add=True, verbose_name='Tarih')
    
    def __str__(self):
        return f"{self.user_fullname or self.user} - {self.action} - {self.created}"
    
    class Meta:
        verbose_name = 'Hareket'
        verbose_name_plural = 'Hareketler'
        ordering = ['-created']