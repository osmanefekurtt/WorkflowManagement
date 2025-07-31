// src/services/permissionService.js
import api from './api';

const permissionService = {
  getMyWorkPermissions: async () => {
    try {
      const response = await api.get('/permissions/my-work-permissions/');
      if (response.data.success) {
        return response.data.data;
      }
      return {};
    } catch (error) {
      console.error('Yetkiler alınırken hata:', error);
      return {};
    }
  },
  
  getSystemPermissions: async () => {
    try {
      const response = await api.get('/permissions/my-permissions/');
      if (response.data.success && response.data.data) {
        // System permissions'ı çıkar
        const systemPerms = {};
        response.data.data.permissions?.forEach(perm => {
          if (perm.column_name === 'work_create' || perm.column_name === 'work_delete') {
            systemPerms[perm.column_name] = perm.can_write || perm.permission === 'write';
          }
        });
        
        // Eğer superuser ise tüm izinler true
        if (response.data.data.user?.is_superuser) {
          return {
            work_create: true,
            work_delete: true
          };
        }
        
        return systemPerms;
      }
      return {
        work_create: false,
        work_delete: false
      };
    } catch (error) {
      console.error('Sistem yetkileri alınırken hata:', error);
      return {
        work_create: false,
        work_delete: false
      };
    }
  },
  
  // Yardımcı fonksiyonlar
  canRead: (permissions, fieldName) => {
    const perm = permissions[fieldName];
    return perm === 'r' || perm === 'rw';
  },
  
  canWrite: (permissions, fieldName) => {
    const perm = permissions[fieldName];
    return perm === 'rw';
  },
  
  hasPermission: (permissions, fieldName) => {
    return permissions.hasOwnProperty(fieldName);
  }
};

export default permissionService;