# core/jwt_auth.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.utils.translation import gettext_lazy as _
from rest_framework import exceptions

class CustomJWTAuthentication(JWTAuthentication):
    """
    JWT Authentication with Turkish error messages
    """
    
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except InvalidToken as e:
            # Token hatalarını Türkçe'ye çevir
            messages = e.detail.get('messages', [])
            
            if messages:
                first_message = messages[0]
                
                # Token expired kontrolü
                if 'expired' in str(first_message).lower():
                    raise exceptions.AuthenticationFailed(
                        detail='Token süresi dolmuş. Lütfen tekrar giriş yapın.',
                        code='token_expired'
                    )
                
                # Invalid token kontrolü
                elif 'invalid' in str(first_message).lower():
                    raise exceptions.AuthenticationFailed(
                        detail='Geçersiz token. Lütfen tekrar giriş yapın.',
                        code='invalid_token'
                    )
                
                # Token not found
                elif 'not found' in str(first_message).lower():
                    raise exceptions.AuthenticationFailed(
                        detail='Token bulunamadı. Lütfen giriş yapın.',
                        code='token_not_found'
                    )
            
            # Diğer durumlar için genel mesaj
            raise exceptions.AuthenticationFailed(
                detail='Kimlik doğrulama başarısız. Lütfen tekrar giriş yapın.',
                code='authentication_failed'
            )
        except TokenError:
            raise exceptions.AuthenticationFailed(
                detail='Geçersiz token formatı.',
                code='invalid_token_format'
            )