import api from './api';

const authService = {
  login: async (username, password) => {
    try {
      const response = await api.post('/auth/login/', { username, password });
      
      if (response.data.success) {
        const { access_token, refresh_token, user } = response.data.data;
        
        // Store tokens
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        return { success: true, user };
      }
      
      return {
        success: false,
        message: response.data.message || 'Giriş başarısız'
      };
    } catch (error) {
      const errorMessage = authService.extractErrorMessage(error);
      return { success: false, message: errorMessage };
    }
  },
  
  logout: () => {
    ['access_token', 'refresh_token', 'user'].forEach(key => 
      localStorage.removeItem(key)
    );
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
  
  extractErrorMessage: error => {
    if (!error.response?.data) {
      return 'Bir hata oluştu';
    }
    
    const data = error.response.data;
    
    // Check error sources in order
    const errorSources = [
      () => data.errors?.non_field_errors?.[0],
      () => {
        const fieldErrors = data.errors?.field_errors;
        if (fieldErrors) {
          const firstError = Object.values(fieldErrors)[0];
          return Array.isArray(firstError) ? firstError[0] : null;
        }
      },
      () => data.message
    ];
    
    for (const source of errorSources) {
      const message = source();
      if (message) return message;
    }
    
    return 'Bir hata oluştu';
  }
};

export default authService;