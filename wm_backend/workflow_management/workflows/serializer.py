# workflows/serializers.py
from rest_framework import serializers
from workflows.models import Work, Movement, Category, SalesChannel, WorkType
from permissions.utils import PermissionChecker

from django.core.validators import URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError

from django.utils import timezone


class LinkListField(serializers.ListField):
    """Bağlantı listesi için özel field"""
    
    def to_internal_value(self, data):
        if not isinstance(data, list):
            raise serializers.ValidationError('Bağlantılar liste formatında olmalıdır.')
        
        validated_links = []
        url_validator = URLValidator()
        
        for i, item in enumerate(data):
            if not isinstance(item, dict):
                raise serializers.ValidationError(f'Bağlantı {i+1}: Geçersiz format')
            
            # URL kontrolü - zorunlu
            url = item.get('url', '').strip()
            if not url:
                raise serializers.ValidationError(f'Bağlantı {i+1}: URL alanı zorunludur')
            
            try:
                url_validator(url)
            except DjangoValidationError:
                raise serializers.ValidationError(f'Bağlantı {i+1}: Geçerli bir URL giriniz')
            
            # Validasyondan geçen link
            validated_link = {
                'url': url,
                'title': item.get('title', '').strip() or None,
                'description': item.get('description', '').strip() or None,
                'added_at': item.get('added_at') or timezone.now().isoformat(),
                'added_by': item.get('added_by')
            }
            
            validated_links.append(validated_link)
        
        return validated_links
    
    def to_representation(self, value):
        """Çıktıda gereksiz None değerleri temizle"""
        if not value:
            return []
        
        clean_links = []
        for link in value:
            clean_link = {'url': link.get('url')}
            
            if link.get('title'):
                clean_link['title'] = link['title']
            if link.get('description'):
                clean_link['description'] = link['description']
            if link.get('added_at'):
                clean_link['added_at'] = link['added_at']
            if link.get('added_by'):
                clean_link['added_by'] = link['added_by']
                
            clean_links.append(clean_link)
        
        return clean_links


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
    
    # Links field with custom validation
    links = LinkListField(required=False, allow_empty=True)

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
        
        # Geriye dönük uyumluluk için eski link alanlarını doldur
        if instance.links and len(instance.links) > 0:
            data['link'] = instance.links[0].get('url')
            data['link_title'] = instance.links[0].get('title', '')
        
        return data
    
    def create(self, validated_data):
        # Link eklerken kullanıcı bilgisini ekle
        request = self.context.get('request')
        if request and validated_data.get('links'):
            user_info = f"{request.user.get_full_name() or request.user.username} ({request.user.id})"
            for link in validated_data['links']:
                link['added_by'] = user_info
                link['added_at'] = timezone.now().isoformat()
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Yeni link eklenirken kullanıcı bilgisini ekle
        request = self.context.get('request')
        if request and 'links' in validated_data:
            existing_links = instance.links or []
            new_links = validated_data.get('links', [])
            
            # Yeni eklenen linkleri tespit et
            existing_urls = {link.get('url') for link in existing_links}
            user_info = f"{request.user.get_full_name() or request.user.username} ({request.user.id})"
            
            for link in new_links:
                if link.get('url') not in existing_urls:
                    link['added_by'] = user_info
                    link['added_at'] = timezone.now().isoformat()
        
        return super().update(instance, validated_data)


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