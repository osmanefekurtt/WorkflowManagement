// src/services/authService.js
import api from './api';

const authService = {
  login: async (username, password) => {
    try {
      const response = await api.post('/auth/login/', {
        username,
        password
      });
      
      if (response.data.success) {
        const { access_token, refresh_token, user } = response.data.data;
        
        // Token'ları localStorage'a kaydet
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        return {
          success: true,
          user: user
        };
      }
      
      return {
        success: false,
        message: response.data.message || 'Giriş başarısız'
      };
    } catch (error) {
      // Daha detaylı hata mesajı alma
      let errorMessage = 'Bir hata oluştu';
      
      if (error.response?.data) {
        const data = error.response.data;
        
        // Önce non_field_errors'a bak
        if (data.errors?.non_field_errors?.length > 0) {
          errorMessage = data.errors.non_field_errors[0];
        }
        // Sonra field_errors'a bak
        else if (data.errors?.field_errors) {
          const firstFieldError = Object.values(data.errors.field_errors)[0];
          if (Array.isArray(firstFieldError) && firstFieldError.length > 0) {
            errorMessage = firstFieldError[0];
          }
        }
        // En son genel mesaja bak
        else if (data.message) {
          errorMessage = data.message;
        }
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  }
};

export default authService;