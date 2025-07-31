# workflows/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from workflows.models import Work, Movement, Category, WorkType, SalesChannel
from workflows.serializer import (
    WorkflowSerializer, MovementSerializer, 
    CategorySerializer, WorkTypeSerializer, SalesChannelSerializer
)
from .audit_utils import log_work_action
from permissions.utils import PermissionChecker

class CategoryViewSet(viewsets.ModelViewSet):
    """
    Kategori yönetimi - Sadece admin kullanıcılar güncelleyebilir
    """
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            # Okuma işlemleri için sadece giriş yapmış olmak yeterli
            permission_classes = [IsAuthenticated]
        else:
            # Yazma işlemleri için admin olmak gerekli
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]


class WorkTypeViewSet(viewsets.ModelViewSet):
    """
    İş tipi yönetimi - Sadece admin kullanıcılar güncelleyebilir
    """
    queryset = WorkType.objects.filter(is_active=True)
    serializer_class = WorkTypeSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]


class SalesChannelViewSet(viewsets.ModelViewSet):
    """
    Satış kanalı yönetimi - Sadece admin kullanıcılar güncelleyebilir
    """
    queryset = SalesChannel.objects.filter(is_active=True)
    serializer_class = SalesChannelSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Work.objects.all()
    serializer_class = WorkflowSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def add_link(self, request, pk=None):
        """Tek bir link ekleme"""
        work = self.get_object()
        
        # Yazma yetkisi kontrolü
        if not PermissionChecker.can_write_column(request.user, 'links'):
            return Response({
                'message': 'Bağlantı ekleme yetkiniz yok'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Link verilerini al
        link_data = {
            'url': request.data.get('url'),
            'title': request.data.get('title'),
            'description': request.data.get('description')
        }
        
        # URL validasyonu
        from django.core.validators import URLValidator
        from django.core.exceptions import ValidationError as DjangoValidationError
        
        validator = URLValidator()
        try:
            validator(link_data['url'])
        except (DjangoValidationError, TypeError):
            return Response({
                'message': 'Geçerli bir URL giriniz'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Mevcut linkleri al ve yenisini ekle
        current_links = work.links or []
        link_data['added_by'] = f"{request.user.get_full_name() or request.user.username} ({request.user.id})"
        link_data['added_at'] = timezone.now().isoformat()
        
        current_links.append(link_data)
        work.links = current_links
        work.save()
        
        # Log kaydet
        log_work_action(
            user=request.user,
            work=work,
            action='update',
            old_data={'links_count': len(current_links) - 1},
            new_data={'links_count': len(current_links)}
        )
        
        return Response({
            'message': 'Bağlantı eklendi',
            'links': work.links
        })
    
    @action(detail=True, methods=['post'])
    def remove_link(self, request, pk=None):
        """Link silme"""
        work = self.get_object()
        
        # Yazma yetkisi kontrolü
        if not PermissionChecker.can_write_column(request.user, 'links'):
            return Response({
                'message': 'Bağlantı silme yetkiniz yok'
            }, status=status.HTTP_403_FORBIDDEN)
        
        url_to_remove = request.data.get('url')
        if not url_to_remove:
            return Response({
                'message': 'Silinecek bağlantı URL\'si gerekli'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Mevcut linklerden çıkar
        current_links = work.links or []
        new_links = [link for link in current_links if link.get('url') != url_to_remove]
        
        if len(new_links) == len(current_links):
            return Response({
                'message': 'Bağlantı bulunamadı'
            }, status=status.HTTP_404_NOT_FOUND)
        
        work.links = new_links
        work.save()
        
        # Log kaydet
        log_work_action(
            user=request.user,
            work=work,
            action='update',
            old_data={'links_count': len(current_links)},
            new_data={'links_count': len(new_links)}
        )
        
        return Response({
            'message': 'Bağlantı silindi',
            'links': work.links
        })
    
    def list(self, request, *args, **kwargs):
        """
        Liste görünümünde kullanıcının okuma yetkisi olmayan alanları filtrele
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Her bir item için yetki kontrolü yap
            filtered_data = []
            for item in serializer.data:
                filtered_item = PermissionChecker.filter_readable_fields(request.user, item)
                filtered_data.append(filtered_item)
            return self.get_paginated_response(filtered_data)
        
        serializer = self.get_serializer(queryset, many=True)
        # Her bir item için yetki kontrolü yap
        filtered_data = []
        for item in serializer.data:
            filtered_item = PermissionChecker.filter_readable_fields(request.user, item)
            filtered_data.append(filtered_item)
        
        return Response(filtered_data)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Detay görünümünde kullanıcının okuma yetkisi olmayan alanları filtrele
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        # Yetki kontrolü yap
        filtered_data = PermissionChecker.filter_readable_fields(request.user, serializer.data)
        
        return Response(filtered_data)
    
    def create(self, request, *args, **kwargs):
        """
        Yeni kayıt oluştururken create ve field yazma yetkisi kontrolü
        """
        # Önce create yetkisi kontrolü
        if not PermissionChecker.can_create_work(request.user):
            return Response({
                'message': 'İş oluşturma yetkiniz yok'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Sonra field yazma yetkisi kontrolü
        is_valid, error_message = PermissionChecker.validate_writable_fields(request.user, request.data)
        if not is_valid:
            return Response({
                'message': error_message
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        work = serializer.save()
        
        # Yeni iş oluşturulduğunu logla
        log_work_action(
            user=request.user,
            work=work,
            action='create'
        )
        
        headers = self.get_success_headers(serializer.data)
        
        # Response'da da yetki kontrolü yap
        filtered_data = PermissionChecker.filter_readable_fields(request.user, serializer.data)
        
        return Response(filtered_data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """
        Güncelleme işleminde yazma yetkisi kontrolü
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Yazma yetkisi kontrolü
        is_valid, error_message = PermissionChecker.validate_writable_fields(request.user, request.data)
        if not is_valid:
            return Response({
                'message': error_message
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Tüm alanları otomatik olarak al
        old_data = {}
        for field in instance._meta.fields:
            field_name = field.name
            if field_name not in ['id', 'created', 'updated']:
                old_data[field_name] = getattr(instance, field_name)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Güncellenmiş instance'ı tekrar al
        instance.refresh_from_db()
        
        # Yeni verileri al
        new_data = {}
        for field in instance._meta.fields:
            field_name = field.name
            if field_name not in ['id', 'created', 'updated']:
                new_data[field_name] = getattr(instance, field_name)
        
        # Sadece değişen alanları bul
        changed_fields = {}
        for field_name, old_value in old_data.items():
            new_value = new_data[field_name]
            if old_value != new_value:
                changed_fields[field_name] = {
                    'eski': old_value,
                    'yeni': new_value
                }
        
        # Eğer değişiklik varsa logla
        if changed_fields:
            log_work_action(
                user=request.user,
                work=instance,
                action='update',
                old_data=old_data,
                new_data=new_data
            )
        
        # Response'da yetki kontrolü yap
        filtered_data = PermissionChecker.filter_readable_fields(request.user, serializer.data)
        
        return Response(filtered_data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Silme işlemi - Sadece delete yetkisi olanlar yapabilir
        """
        if not PermissionChecker.can_delete_work(request.user):
            return Response({
                'message': 'İş silme yetkiniz yok'
            }, status=status.HTTP_403_FORBIDDEN)
        
        instance = self.get_object()
        work_name = instance.name
        
        # Silinmeden önce logla
        log_work_action(
            user=request.user,
            work=instance,
            action='delete'
        )
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Movement kayıtları sadece okunabilir.
    Sistem tarafından otomatik oluşturulur.
    Sadece admin kullanıcıları görebilir.
    """
    queryset = Movement.objects.all()
    serializer_class = MovementSerializer
    permission_classes = [IsAdminUser]