# authentication/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from datetime import datetime, timezone
from django.contrib.auth.models import User
from django.db.models import Q
from .serializers import LoginSerializer, UserSerializer, LoginResponseSerializer, RegisterSerializer
from .permissions import IsSuperUser


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    """
    Kullanıcı arama endpoint'i - tasarımcı seçimi için
    Query params:
    - q: arama terimi (isim, soyisim veya username)
    - limit: maksimum sonuç sayısı (default: 20)
    """
    search_term = request.query_params.get('q', '').strip()
    limit = int(request.query_params.get('limit', 20))
    
    # Boş arama durumunda tüm aktif kullanıcıları getir
    if not search_term:
        users = User.objects.filter(is_active=True).order_by('first_name', 'last_name')[:limit]
    else:
        # İsim, soyisim veya username'de arama yap
        users = User.objects.filter(
            Q(first_name__icontains=search_term) |
            Q(last_name__icontains=search_term) |
            Q(username__icontains=search_term),
            is_active=True
        ).order_by('first_name', 'last_name')[:limit]
    
    # Kullanıcı listesini formatla
    users_data = []
    for user in users:
        full_name = user.get_full_name() or user.username
        users_data.append({
            'id': user.id,
            'username': user.username,
            'full_name': full_name,
            'email': user.email,
            'display_name': f"{full_name} ({user.username})",
            'is_staff': user.is_staff
        })
    
    return Response({
        'message': f'{len(users_data)} kullanıcı bulundu',
        'users': users_data
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Kullanıcı girişi için API endpoint'i
    
    Custom response formatı otomatik olarak uygulanacak:
    {
        "success": true,
        "message": "Giriş başarılı",
        "data": {
            "access_token": "...",
            "refresh_token": "...",
            "token_type": "Bearer",
            "expires_in": 3600,
            "user": {...}
        },
        "errors": null,
        "timestamp": "2025-07-23T14:30:00Z",
        "status_code": 200
    }
    """
    serializer = LoginSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        refresh = RefreshToken.for_user(user)
        
        # Token'ın biteceği zamanı hesapla
        access_token_lifetime = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']
        refresh_token_lifetime = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
        
        now = datetime.now(timezone.utc)
        access_expires_at = now + access_token_lifetime
        refresh_expires_at = now + refresh_token_lifetime
        
        # Custom renderer otomatik olarak format uygulayacak
        return Response({
            'message': 'Giriş başarılı',
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'token_type': 'Bearer',
            'access_expires_at': access_expires_at.isoformat(),
            'refresh_expires_at': refresh_expires_at.isoformat(),
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    # Hata durumunda serializer.errors otomatik olarak formatlanacak
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsSuperUser])
def register_view(request):
    """
    Yeni kullanıcı kaydı için API endpoint'i (Sadece superuser'lar kullanabilir)
    
    Custom response formatı otomatik olarak uygulanacak:
    {
        "success": true,
        "message": "Kullanıcı başarıyla oluşturuldu",
        "data": {
            "user": {...}
        },
        "errors": null,
        "timestamp": "2025-07-23T14:30:00Z",
        "status_code": 201
    }
    """
    serializer = RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # Custom renderer otomatik olarak format uygulayacak
        return Response({
            'message': 'Kullanıcı başarıyla oluşturuldu',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    # Hata durumunda serializer.errors otomatik olarak formatlanacak
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_users(request):
    """
    Tüm kullanıcıları listele (Sadece admin kullanıcılar)
    """
    users = User.objects.all().order_by('-date_joined')
    users_data = []
    
    for user in users:
        users_data.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'is_active': user.is_active,
            'date_joined': user.date_joined,
            'last_login': user.last_login
        })
    
    # Direkt users_data döndür, CustomJSONRenderer zaten sarmalayacak
    return Response(users_data)



@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsSuperUser])  # Sadece superuser
def user_detail(request, pk):
    """
    Kullanıcı detay, güncelleme ve silme işlemleri (Sadece superuser)
    """
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({
            'message': 'Kullanıcı bulunamadı'
        }, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        # Kullanıcı detayı
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
            'is_active': user.is_active,
            'date_joined': user.date_joined,
            'last_login': user.last_login,
            'roles': list(user.user_roles.values_list('role_id', flat=True))
        }
        return Response(user_data)
    
    elif request.method == 'PATCH':
        # Kullanıcı güncelleme
        data = request.data
        
        # Güncellenebilir alanlar
        if 'email' in data:
            # Email benzersizlik kontrolü
            if User.objects.filter(email=data['email']).exclude(pk=pk).exists():
                return Response({
                    'message': 'Bu email adresi zaten kullanılıyor'
                }, status=status.HTTP_400_BAD_REQUEST)
            user.email = data['email']
        
        if 'first_name' in data:
            user.first_name = data['first_name']
        
        if 'last_name' in data:
            user.last_name = data['last_name']
        
        if 'is_active' in data:
            user.is_active = data['is_active']
        
        # is_staff KALDIRILDI - Django otomatik yönetir
        
        # Kendi kendini superuser'lıktan çıkarmasını engelle
        if 'is_superuser' in data and user.id == request.user.id and not data['is_superuser']:
            return Response({
                'message': 'Kendi superuser yetkinizi kaldıramazsınız'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if 'is_superuser' in data:
            user.is_superuser = data['is_superuser']
        
        user.save()
        
        return Response({
            'message': 'Kullanıcı başarıyla güncellendi',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser
            }
        })
    
    elif request.method == 'DELETE':
        # Kendi kendini silmesini engelle
        if user.id == request.user.id:
            return Response({
                'message': 'Kendinizi silemezsiniz'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        username = user.username
        user.delete()
        
        return Response({
            'message': f'{username} kullanıcısı başarıyla silindi'
        })