// src/hooks/index.js
import { useApp } from '../contexts/AppContext';
import { useCallback, useMemo } from 'react';
import permissionService from '../services/permissionService';

// Auth Hook
export const useAuth = () => {
  const { state, actions } = useApp();
  
  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    login: actions.login,
    logout: actions.logout
  };
};

// Permissions Hook
export const usePermissions = () => {
  const { state } = useApp();
  
  const canCreateWork = useMemo(() => {
    return state.user?.is_superuser || state.systemPermissions.work_create;
  }, [state.user, state.systemPermissions]);
  
  const canDeleteWork = useMemo(() => {
    return state.user?.is_superuser || state.systemPermissions.work_delete;
  }, [state.user, state.systemPermissions]);
  
  const canReadField = useCallback((fieldName) => {
    return permissionService.canRead(state.workPermissions, fieldName);
  }, [state.workPermissions]);
  
  const canWriteField = useCallback((fieldName) => {
    return permissionService.canWrite(state.workPermissions, fieldName);
  }, [state.workPermissions]);
  
  const hasFieldPermission = useCallback((fieldName) => {
    return permissionService.hasPermission(state.workPermissions, fieldName);
  }, [state.workPermissions]);
  
  return {
    workPermissions: state.workPermissions,
    systemPermissions: state.systemPermissions,
    canCreateWork,
    canDeleteWork,
    canReadField,
    canWriteField,
    hasFieldPermission
  };
};

// Works Hook
export const useWorks = () => {
  const { state, actions } = useApp();
  
  const filteredWorks = useMemo(() => {
    return state.works.filter(work => {
      if (state.filters.workStatus === 'active') {
        return work.status_code !== 'completed';
      } else {
        return work.status_code === 'completed';
      }
    });
  }, [state.works, state.filters.workStatus]);
  
  return {
    works: state.works,
    filteredWorks,
    selectedWork: state.selectedWork,
    loading: state.worksLoading,
    error: state.worksError,
    stats: state.workStats,
    fetchWorks: actions.fetchWorks,
    createWork: actions.createWork,
    updateWork: actions.updateWork,
    deleteWork: actions.deleteWork,
    setSelectedWork: actions.setSelectedWork
  };
};

// Movements Hook
export const useMovements = () => {
  const { state, actions } = useApp();
  
  const filteredMovements = useMemo(() => {
    return state.movements.filter(movement => {
      // Action filter
      if (state.filters.movementAction !== 'all' && movement.action !== state.filters.movementAction) {
        return false;
      }

      // Search filter
      if (state.filters.searchTerm) {
        const search = state.filters.searchTerm.toLowerCase();
        return (
          movement.description.toLowerCase().includes(search) ||
          movement.user?.username?.toLowerCase().includes(search) ||
          movement.work?.name?.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [state.movements, state.filters.movementAction, state.filters.searchTerm]);
  
  return {
    movements: state.movements,
    filteredMovements,
    loading: state.movementsLoading,
    error: state.movementsError,
    fetchMovements: actions.fetchMovements
  };
};

// Users & Roles Hook
export const useUsersAndRoles = () => {
  const { state, actions } = useApp();
  
  return {
    users: state.users,
    roles: state.roles,
    usersLoading: state.usersLoading,
    rolesLoading: state.rolesLoading,
    fetchUsers: actions.fetchUsers,
    fetchRoles: actions.fetchRoles
  };
};

// Dropdowns Hook
export const useDropdowns = () => {
  const { state, actions } = useApp();
  
  return {
    categories: state.categories,
    workTypes: state.workTypes,
    salesChannels: state.salesChannels,
    loading: state.dropdownsLoading,
    fetchDropdowns: actions.fetchDropdowns,
    updateDropdownItem: actions.updateDropdownItem
  };
};

// UI Hook
export const useUI = () => {
  const { state, actions } = useApp();
  
  return {
    toasts: state.toasts,
    modals: state.modals,
    filters: state.filters,
    showToast: actions.showToast,
    removeToast: actions.removeToast,
    toggleModal: actions.toggleModal,
    setFilter: actions.setFilter
  };
};

// Combined Hook for Dashboard
export const useDashboard = () => {
  const works = useWorks();
  const permissions = usePermissions();
  const ui = useUI();
  const dropdowns = useDropdowns();
  
  return {
    ...works,
    ...permissions,
    ...ui,
    ...dropdowns
  };
};