import api from './api';

const permissionService = {
  getMyWorkPermissions: async () => {
    try {
      const response = await api.get('/permissions/my-work-permissions/');
      return response.data.success ? response.data.data : {};
    } catch (error) {
      console.error('Yetkiler alınırken hata:', error);
      return {};
    }
  },
  
  getSystemPermissions: async () => {
    try {
      const response = await api.get('/permissions/my-permissions/');
      
      if (response.data.success && response.data.data) {
        const systemPerms = {};
        const { permissions, user } = response.data.data;
        
        // Check superuser
        if (user?.is_superuser) {
          return { work_create: true, work_delete: true };
        }
        
        // Extract system permissions
        permissions?.forEach(perm => {
          if (['work_create', 'work_delete'].includes(perm.column_name)) {
            systemPerms[perm.column_name] = perm.can_write || perm.permission === 'write';
          }
        });
        
        return systemPerms;
      }
      
      return { work_create: false, work_delete: false };
    } catch (error) {
      console.error('Sistem yetkileri alınırken hata:', error);
      return { work_create: false, work_delete: false };
    }
  },
  
  // Helper functions
  canRead: (permissions, fieldName) => {
    const perm = permissions[fieldName];
    return perm === 'r' || perm === 'rw';
  },
  
  canWrite: (permissions, fieldName) => {
    return permissions[fieldName] === 'rw';
  },
  
  hasPermission: (permissions, fieldName) => {
    return permissions.hasOwnProperty(fieldName);
  }
};

export default permissionService;