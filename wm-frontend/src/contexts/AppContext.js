// src/contexts/AppContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';
import permissionService from '../services/permissionService';
import api from '../services/api';

// Initial State
const initialState = {
  // Auth
  user: null,
  isAuthenticated: false,
  
  // Permissions
  workPermissions: {},
  systemPermissions: {
    work_create: false,
    work_delete: false
  },
  
  // Works
  works: [],
  selectedWork: null,
  worksLoading: false,
  worksError: null,
  workStats: {
    total: 0,
    inProgress: 0,
    completed: 0
  },
  
  // Movements
  movements: [],
  movementsLoading: false,
  movementsError: null,
  
  // Users & Roles
  users: [],
  roles: [],
  usersLoading: false,
  rolesLoading: false,
  
  // Dropdown Data
  categories: [],
  workTypes: [],
  salesChannels: [],
  dropdownsLoading: false,
  
  // UI State
  toasts: [],
  modals: {
    workModal: false,
    userModal: false,
    roleModal: false,
    confirmModal: false
  },
  filters: {
    workStatus: 'active',
    movementAction: 'all',
    searchTerm: ''
  }
};

// Action Types
const ActionTypes = {
  // Auth Actions
  SET_AUTH: 'SET_AUTH',
  LOGOUT: 'LOGOUT',
  
  // Permission Actions
  SET_PERMISSIONS: 'SET_PERMISSIONS',
  
  // Work Actions
  SET_WORKS: 'SET_WORKS',
  SET_WORKS_LOADING: 'SET_WORKS_LOADING',
  SET_WORKS_ERROR: 'SET_WORKS_ERROR',
  ADD_WORK: 'ADD_WORK',
  UPDATE_WORK: 'UPDATE_WORK',
  DELETE_WORK: 'DELETE_WORK',
  SET_SELECTED_WORK: 'SET_SELECTED_WORK',
  
  // Movement Actions
  SET_MOVEMENTS: 'SET_MOVEMENTS',
  SET_MOVEMENTS_LOADING: 'SET_MOVEMENTS_LOADING',
  SET_MOVEMENTS_ERROR: 'SET_MOVEMENTS_ERROR',
  
  // User & Role Actions
  SET_USERS: 'SET_USERS',
  SET_ROLES: 'SET_ROLES',
  SET_USERS_LOADING: 'SET_USERS_LOADING',
  SET_ROLES_LOADING: 'SET_ROLES_LOADING',
  ADD_USER: 'ADD_USER',
  UPDATE_USER: 'UPDATE_USER',
  ADD_ROLE: 'ADD_ROLE',
  UPDATE_ROLE: 'UPDATE_ROLE',
  
  // Dropdown Actions
  SET_DROPDOWNS: 'SET_DROPDOWNS',
  SET_DROPDOWNS_LOADING: 'SET_DROPDOWNS_LOADING',
  UPDATE_DROPDOWN_ITEM: 'UPDATE_DROPDOWN_ITEM',
  
  // UI Actions
  SHOW_TOAST: 'SHOW_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
  TOGGLE_MODAL: 'TOGGLE_MODAL',
  SET_FILTER: 'SET_FILTER',
  
  // Global Actions
  RESET_STATE: 'RESET_STATE'
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    // Auth
    case ActionTypes.SET_AUTH:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: action.payload.isAuthenticated
      };
    
    case ActionTypes.LOGOUT:
      return {
        ...initialState,
        toasts: state.toasts // Toast'ları koru
      };
    
    // Permissions
    case ActionTypes.SET_PERMISSIONS:
      return {
        ...state,
        workPermissions: action.payload.workPermissions || state.workPermissions,
        systemPermissions: action.payload.systemPermissions || state.systemPermissions
      };
    
    // Works
    case ActionTypes.SET_WORKS:
      const works = action.payload;
      const stats = {
        total: works.length,
        inProgress: works.filter(w => w.status_code !== 'completed').length,
        completed: works.filter(w => w.status_code === 'completed').length
      };
      return {
        ...state,
        works: works,
        workStats: stats,
        worksLoading: false,
        worksError: null
      };
    
    case ActionTypes.SET_WORKS_LOADING:
      return {
        ...state,
        worksLoading: action.payload
      };
    
    case ActionTypes.SET_WORKS_ERROR:
      return {
        ...state,
        worksError: action.payload,
        worksLoading: false
      };
    
    case ActionTypes.ADD_WORK:
      return {
        ...state,
        works: [...state.works, action.payload]
      };
    
    case ActionTypes.UPDATE_WORK:
      return {
        ...state,
        works: state.works.map(work => 
          work.id === action.payload.id ? action.payload : work
        )
      };
    
    case ActionTypes.DELETE_WORK:
      return {
        ...state,
        works: state.works.filter(work => work.id !== action.payload)
      };
    
    case ActionTypes.SET_SELECTED_WORK:
      return {
        ...state,
        selectedWork: action.payload
      };
    
    // Movements
    case ActionTypes.SET_MOVEMENTS:
      return {
        ...state,
        movements: action.payload,
        movementsLoading: false,
        movementsError: null
      };
    
    case ActionTypes.SET_MOVEMENTS_LOADING:
      return {
        ...state,
        movementsLoading: action.payload
      };
    
    case ActionTypes.SET_MOVEMENTS_ERROR:
      return {
        ...state,
        movementsError: action.payload,
        movementsLoading: false
      };
    
    // Users & Roles
    case ActionTypes.SET_USERS:
      return {
        ...state,
        users: action.payload,
        usersLoading: false
      };
    
    case ActionTypes.SET_ROLES:
      return {
        ...state,
        roles: action.payload,
        rolesLoading: false
      };
    
    case ActionTypes.SET_USERS_LOADING:
      return {
        ...state,
        usersLoading: action.payload
      };
    
    case ActionTypes.SET_ROLES_LOADING:
      return {
        ...state,
        rolesLoading: action.payload
      };
    
    case ActionTypes.ADD_USER:
      return {
        ...state,
        users: [...state.users, action.payload]
      };
    
    case ActionTypes.UPDATE_USER:
      return {
        ...state,
        users: state.users.map(user => 
          user.id === action.payload.id ? action.payload : user
        )
      };
    
    case ActionTypes.ADD_ROLE:
      return {
        ...state,
        roles: [...state.roles, action.payload]
      };
    
    case ActionTypes.UPDATE_ROLE:
      return {
        ...state,
        roles: state.roles.map(role => 
          role.id === action.payload.id ? action.payload : role
        )
      };
    
    // Dropdowns
    case ActionTypes.SET_DROPDOWNS:
      return {
        ...state,
        categories: action.payload.categories || state.categories,
        workTypes: action.payload.workTypes || state.workTypes,
        salesChannels: action.payload.salesChannels || state.salesChannels,
        dropdownsLoading: false
      };
    
    case ActionTypes.SET_DROPDOWNS_LOADING:
      return {
        ...state,
        dropdownsLoading: action.payload
      };
    
    case ActionTypes.UPDATE_DROPDOWN_ITEM:
      const { type, items } = action.payload;
      return {
        ...state,
        [type]: items
      };
    
    // UI
    case ActionTypes.SHOW_TOAST:
      const newToast = {
        id: Date.now(),
        ...action.payload
      };
      return {
        ...state,
        toasts: [...state.toasts, newToast]
      };
    
    case ActionTypes.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload)
      };
    
    case ActionTypes.TOGGLE_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.modal]: action.payload.isOpen
        }
      };
    
    case ActionTypes.SET_FILTER:
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.filter]: action.payload.value
        }
      };
    
    case ActionTypes.RESET_STATE:
      return initialState;
    
    default:
      return state;
  }
};

// Create Context
const AppContext = createContext(null);

// Provider Component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize auth state
  useEffect(() => {
    const user = authService.getCurrentUser();
    const isAuthenticated = authService.isAuthenticated();
    
    if (isAuthenticated && user) {
      dispatch({
        type: ActionTypes.SET_AUTH,
        payload: { user, isAuthenticated }
      });
      
      // Load permissions
      loadPermissions();
    }
  }, []);

  // Context Actions
  const actions = {
    // Auth Actions
    login: async (username, password) => {
      try {
        const result = await authService.login(username, password);
        
        if (result.success) {
          dispatch({
            type: ActionTypes.SET_AUTH,
            payload: {
              user: result.user,
              isAuthenticated: true
            }
          });
          
          // Load permissions after login
          await loadPermissions();
          
          return { success: true };
        }
        
        return { success: false, message: result.message };
      } catch (error) {
        return { success: false, message: 'Giriş başarısız' };
      }
    },
    
    logout: () => {
      authService.logout();
      dispatch({ type: ActionTypes.LOGOUT });
    },
    
    // Permission Actions
    loadPermissions: async () => {
      try {
        const [workPerms, sysPerms] = await Promise.all([
          permissionService.getMyWorkPermissions(),
          api.get('/permissions/my-system-permissions/')
        ]);
        
        dispatch({
          type: ActionTypes.SET_PERMISSIONS,
          payload: {
            workPermissions: workPerms,
            systemPermissions: sysPerms.data.success ? sysPerms.data.data : state.systemPermissions
          }
        });
      } catch (error) {
        console.error('Permissions load error:', error);
      }
    },
    
    // Work Actions
    fetchWorks: async () => {
      dispatch({ type: ActionTypes.SET_WORKS_LOADING, payload: true });
      
      try {
        const response = await api.get('/workflows/');
        if (response.data.success) {
          dispatch({
            type: ActionTypes.SET_WORKS,
            payload: response.data.data
          });
        }
      } catch (error) {
        dispatch({
          type: ActionTypes.SET_WORKS_ERROR,
          payload: error.message
        });
        showToast('İşler yüklenirken hata oluştu', 'error');
      }
    },
    
    createWork: async (workData) => {
      try {
        const response = await api.post('/workflows/', workData);
        if (response.data.success) {
          await actions.fetchWorks(); // Refresh list
          showToast('İş başarıyla oluşturuldu!', 'success');
          return { success: true };
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Bir hata oluştu';
        showToast(errorMessage, 'error');
        return { success: false, message: errorMessage };
      }
    },
    
    updateWork: async (workId, workData) => {
      try {
        const response = await api.patch(`/workflows/${workId}/`, workData);
        if (response.data.success) {
          await actions.fetchWorks(); // Refresh list
          showToast('İş başarıyla güncellendi!', 'success');
          return { success: true };
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Bir hata oluştu';
        showToast(errorMessage, 'error');
        return { success: false, message: errorMessage };
      }
    },
    
    deleteWork: async (workId) => {
      try {
        await api.delete(`/workflows/${workId}/`);
        dispatch({ type: ActionTypes.DELETE_WORK, payload: workId });
        showToast('İş başarıyla silindi!', 'success');
        return { success: true };
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Silme işlemi başarısız';
        showToast(errorMessage, 'error');
        return { success: false, message: errorMessage };
      }
    },
    
    setSelectedWork: (work) => {
      dispatch({ type: ActionTypes.SET_SELECTED_WORK, payload: work });
    },
    
    // Movement Actions
    fetchMovements: async () => {
      dispatch({ type: ActionTypes.SET_MOVEMENTS_LOADING, payload: true });
      
      try {
        const response = await api.get('/movements/');
        if (response.data.success) {
          dispatch({
            type: ActionTypes.SET_MOVEMENTS,
            payload: response.data.data
          });
        }
      } catch (error) {
        dispatch({
          type: ActionTypes.SET_MOVEMENTS_ERROR,
          payload: error.message
        });
        
        if (error.response?.status !== 403) {
          showToast('Hareketler yüklenirken hata oluştu', 'error');
        }
      }
    },
    
    // User & Role Actions
    fetchUsers: async () => {
      dispatch({ type: ActionTypes.SET_USERS_LOADING, payload: true });
      
      try {
        const response = await api.get('/auth/users/');
        if (response.data.success) {
          const users = response.data.data?.data || response.data.data || [];
          dispatch({ type: ActionTypes.SET_USERS, payload: users });
        }
      } catch (error) {
        showToast('Kullanıcılar yüklenirken hata oluştu', 'error');
      }
    },
    
    fetchRoles: async () => {
      dispatch({ type: ActionTypes.SET_ROLES_LOADING, payload: true });
      
      try {
        const response = await api.get('/permissions/roles/');
        if (response.data.success) {
          dispatch({ type: ActionTypes.SET_ROLES, payload: response.data.data });
        }
      } catch (error) {
        showToast('Roller yüklenirken hata oluştu', 'error');
      }
    },
    
    // Dropdown Actions
    fetchDropdowns: async () => {
      dispatch({ type: ActionTypes.SET_DROPDOWNS_LOADING, payload: true });
      
      try {
        const [catResponse, typeResponse, channelResponse] = await Promise.all([
          api.get('/categories/'),
          api.get('/work-types/'),
          api.get('/sales-channels/')
        ]);
        
        dispatch({
          type: ActionTypes.SET_DROPDOWNS,
          payload: {
            categories: catResponse.data.success ? catResponse.data.data : [],
            workTypes: typeResponse.data.success ? typeResponse.data.data : [],
            salesChannels: channelResponse.data.success ? channelResponse.data.data : []
          }
        });
      } catch (error) {
        console.error('Dropdown verileri yüklenirken hata:', error);
      }
    },
    
    updateDropdownItem: (type, items) => {
      dispatch({
        type: ActionTypes.UPDATE_DROPDOWN_ITEM,
        payload: { type, items }
      });
    },
    
    // UI Actions
    showToast: (message, type = 'success', duration = 3000) => {
      dispatch({
        type: ActionTypes.SHOW_TOAST,
        payload: { message, type, duration }
      });
    },
    
    removeToast: (id) => {
      dispatch({ type: ActionTypes.REMOVE_TOAST, payload: id });
    },
    
    toggleModal: (modal, isOpen) => {
      dispatch({
        type: ActionTypes.TOGGLE_MODAL,
        payload: { modal, isOpen }
      });
    },
    
    setFilter: (filter, value) => {
      dispatch({
        type: ActionTypes.SET_FILTER,
        payload: { filter, value }
      });
    }
  };

  // Helper function for permissions
  const loadPermissions = actions.loadPermissions;
  const showToast = actions.showToast;

  // Combine state and actions
  const value = {
    state,
    actions,
    dispatch
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the App Context
export const useApp = () => {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  
  return context;
};

// Export action types for external use if needed
export { ActionTypes };