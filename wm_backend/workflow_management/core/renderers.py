# core/renderers.py
from rest_framework.renderers import JSONRenderer
from datetime import datetime
import json

class CustomJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get('response') if renderer_context else None
        
        # Eğer data None ise boş dict yap
        if data is None:
            data = {}
        
        # Status code'u al
        status_code = response.status_code if response else 200
        
        # Success durumunu belirle
        success = 200 <= status_code < 400
        
        # Response formatını oluştur
        formatted_response = {
            'success': success,
            'message': self.get_message(data, status_code, success),
            'data': self.get_data(data, status_code, success),
            'errors': self.get_errors(data, status_code, success),
            'timestamp': datetime.now().isoformat(),
            'status_code': status_code
        }
        
        # JSON olarak döndür
        return super().render(formatted_response, accepted_media_type, renderer_context)
    
    def get_message(self, data, status_code, success):
        """Duruma göre Türkçe mesaj döndür"""
        
        # Özel mesaj varsa onu kullan
        if isinstance(data, dict):
            if 'message' in data:
                return data.get('message')
            if 'detail' in data:
                return self.translate_message(str(data.get('detail')))
        
        # Status code'a göre varsayılan mesajlar
        messages = {
            200: "İşlem başarıyla tamamlandı",
            201: "Kayıt başarıyla oluşturuldu",
            204: "Kayıt başarıyla silindi",
            400: "Geçersiz istek. Lütfen bilgileri kontrol edin",
            401: "Bu işlem için giriş yapmanız gerekiyor",
            403: "Bu işlem için yetkiniz bulunmuyor",
            404: "Aradığınız kayıt bulunamadı",
            405: "Bu istek yöntemi desteklenmiyor",
            500: "Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin"
        }
        
        return messages.get(status_code, "İşlem tamamlandı")
    
    def get_data(self, data, status_code, success):
        """Başarılı durumlarda veriyi döndür"""
        if not success:
            return None
            
        # Eğer data dict ve içinde özel alanlar varsa
        if isinstance(data, dict):
            # Hata alanlarını temizle
            clean_data = {k: v for k, v in data.items() 
                         if k not in ['message', 'detail', 'errors', 'non_field_errors']}
            return clean_data if clean_data else data
        
        # Liste ise direkt döndür
        return data
    
    def get_errors(self, data, status_code, success):
        """Hata durumlarında error bilgilerini döndür"""
        if success:
            return None
        
        errors = {
            'error_code': self.get_error_code(status_code, data)
        }
        
        # Field errors varsa ekle
        if isinstance(data, dict):
            field_errors = {}
            non_field_errors = []
            
            for key, value in data.items():
                if key in ['detail', 'message']:
                    non_field_errors.append(self.translate_message(str(value)))
                elif key == 'non_field_errors':
                    non_field_errors.extend([self.translate_message(str(v)) for v in value])
                elif isinstance(value, list):
                    field_errors[key] = [self.translate_message(str(v)) for v in value]
                elif key not in ['error_code']:
                    field_errors[key] = [self.translate_message(str(value))]
            
            if field_errors:
                errors['field_errors'] = field_errors
            if non_field_errors:
                errors['non_field_errors'] = non_field_errors
        
        return errors
    
    def get_error_code(self, status_code, data):
        """Error code belirle"""
        if isinstance(data, dict) and 'error_code' in data:
            return data['error_code']
        
        error_codes = {
            400: 'VALIDATION_ERROR',
            401: 'AUTHENTICATION_REQUIRED',
            403: 'PERMISSION_DENIED',
            404: 'NOT_FOUND',
            405: 'METHOD_NOT_ALLOWED',
            500: 'INTERNAL_SERVER_ERROR'
        }
        
        return error_codes.get(status_code, 'UNKNOWN_ERROR')
    
    def translate_message(self, message):
        """Mesajı olduğu gibi döndür - Django zaten Türkçe"""
        return str(message)