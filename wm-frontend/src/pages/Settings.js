import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import UserModal from '../components/UserModal';
import RoleModal from '../components/RoleModal';
import ToastContainer from '../components/ToastContainer';
import DropdownManager from '../components/DropdownManager';
import { useUsersAndRoles, useUI } from '../hooks';
import api from '../services/api';
import './css/Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  
  const {
    users,
    roles,
    usersLoading,
    rolesLoading,
    fetchUsers,
    fetchRoles
  } = useUsersAndRoles();
  
  const {
    toasts,
    showToast,
    removeToast,
    modals,
    toggleModal
  } = useUI();

  // Load data based on active tab
  useEffect(() => {
    const loadTabData = {
      users: fetchUsers,
      roles: fetchRoles
    };
    
    loadTabData[activeTab]?.();
  }, [activeTab]);

  // User handlers
  const handleNewUser = () => {
    setSelectedUser(null);
    toggleModal('userModal', true);
  };

  const handleEditUser = user => {
    setSelectedUser(user);
    toggleModal('userModal', true);
  };

  const handleSaveUser = async (userData, roles) => {
    try {
      const isUpdate = !!selectedUser;
      const endpoint = isUpdate 
        ? `/auth/users/${selectedUser.id}/` 
        : '/auth/register/';
      const method = isUpdate ? 'patch' : 'post';
      
      const response = await api[method](endpoint, userData);
      
      if (response.data.success || response.status === 200) {
        // Handle roles
        if (isUpdate && roles.length >= 0) {
          await updateUserRoles(selectedUser.id, roles);
        } else if (!isUpdate && roles.length > 0 && response.data.data?.user?.id) {
          await assignUserRoles(response.data.data.user.id, roles);
        }
        
        showToast(
          isUpdate ? 'Kullanıcı güncellendi' : 'Kullanıcı oluşturuldu', 
          'success'
        );
        fetchUsers();
        toggleModal('userModal', false);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  const updateUserRoles = async (userId, newRoles) => {
    // Get current roles
    const userRolesResponse = await api.get('/permissions/user-roles/');
    if (userRolesResponse.data.success) {
      const currentUserRoles = userRolesResponse.data.data.filter(
        ur => ur.user === userId
      );
      
      // Delete current roles
      for (const userRole of currentUserRoles) {
        await api.delete(`/permissions/user-roles/${userRole.id}/`);
      }
    }
    
    // Assign new roles
    await assignUserRoles(userId, newRoles);
  };

  const assignUserRoles = async (userId, roleIds) => {
    for (const roleId of roleIds) {
      try {
        await api.post('/permissions/user-roles/', {
          user: userId,
          role: roleId
        });
      } catch (error) {
        console.error('Rol atama hatası:', error);
      }
    }
  };

  // Role handlers
  const handleNewRole = () => {
    setSelectedRole(null);
    toggleModal('roleModal', true);
  };

  const handleEditRole = role => {
    setSelectedRole(role);
    toggleModal('roleModal', true);
  };

  const handleSaveRole = async roleData => {
    try {
      const isUpdate = !!selectedRole;
      const endpoint = isUpdate 
        ? `/permissions/roles/${selectedRole.id}/` 
        : '/permissions/roles/';
      const method = isUpdate ? 'put' : 'post';
      
      const response = await api[method](endpoint, roleData);
      
      if ([200, 201].includes(response.status) || response.data.success) {
        showToast(
          isUpdate ? 'Rol güncellendi' : 'Rol oluşturuldu',
          'success'
        );
        fetchRoles();
        toggleModal('roleModal', false);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  const extractErrorMessage = error => {
    return error.response?.data?.message || 'Bir hata oluştu';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersSection 
          users={users}
          loading={usersLoading}
          onNewUser={handleNewUser}
          onEditUser={handleEditUser}
        />;
      
      case 'roles':
        return <RolesSection 
          roles={roles}
          loading={rolesLoading}
          onNewRole={handleNewRole}
          onEditRole={handleEditRole}
        />;
      
      case 'dropdowns':
        return <DropdownsSection />;
      
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="settings">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        
        {/* Header */}
        <div className="settings-header">
          <h1>Ayarlar</h1>
          <p>Sistem yönetimi ve kullanıcı ayarları</p>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          <TabButton 
            active={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            icon="👥"
            label="Kullanıcılar"
          />
          <TabButton 
            active={activeTab === 'roles'}
            onClick={() => setActiveTab('roles')}
            icon="🔐"
            label="Roller"
          />
          <TabButton 
            active={activeTab === 'dropdowns'}
            onClick={() => setActiveTab('dropdowns')}
            icon="📝"
            label="Dropdown Yönetimi"
          />
        </div>

        {/* Content */}
        <div className="tab-content">
          {renderContent()}
        </div>

        {/* Modals */}
        <UserModal
          isOpen={modals.userModal}
          onClose={() => toggleModal('userModal', false)}
          onSave={handleSaveUser}
          user={selectedUser}
        />
        
        <RoleModal
          isOpen={modals.roleModal}
          onClose={() => toggleModal('roleModal', false)}
          onSave={handleSaveRole}
          role={selectedRole}
        />
      </div>
    </Layout>
  );
};

// Sub-components
const TabButton = ({ active, onClick, icon, label }) => (
  <button 
    className={`tab-button ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    {icon} {label}
  </button>
);

const UsersSection = ({ users, loading, onNewUser, onEditUser }) => (
  <div className="users-section">
    <div className="section-header">
      <h2>Kullanıcı Yönetimi</h2>
      <button className="primary-btn" onClick={onNewUser}>
        ➕ Yeni Kullanıcı
      </button>
    </div>
    
    <div className="content-area">
      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : users.length === 0 ? (
        <div className="no-data">Henüz kullanıcı bulunmamaktadır.</div>
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Kullanıcı Adı</th>
                <th>Ad Soyad</th>
                <th>E-posta</th>
                <th>Süper Yönetici</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(users) && users.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.is_superuser ? 'badge-success' : 'badge-default'}`}>
                      {user.is_superuser ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="action-btn"
                      onClick={() => onEditUser(user)}
                      title="Düzenle"
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);

const RolesSection = ({ roles, loading, onNewRole, onEditRole }) => (
  <div className="roles-section">
    <div className="section-header">
      <h2>Rol Yönetimi</h2>
      <button className="primary-btn" onClick={onNewRole}>
        ➕ Yeni Rol
      </button>
    </div>
    
    <div className="content-area">
      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : roles.length === 0 ? (
        <div className="no-data">Henüz rol tanımlanmamış.</div>
      ) : (
        <div className="roles-table">
          <table>
            <thead>
              <tr>
                <th>Rol Adı</th>
                <th>Açıklama</th>
                <th>Yetki Sayısı</th>
                <th>Oluşturulma Tarihi</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(role => (
                <tr key={role.id}>
                  <td>{role.name}</td>
                  <td>{role.description || 'Açıklama yok'}</td>
                  <td>
                    <span className="badge badge-default">
                      {role.column_permissions?.length || 0} yetki
                    </span>
                  </td>
                  <td>
                    {role.created ? new Date(role.created).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td>
                    <button 
                      className="action-btn"
                      onClick={() => onEditRole(role)}
                      title="Düzenle"
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);

const DropdownsSection = () => (
  <div className="dropdowns-section">
    <div className="dropdown-management">
      <div className="dropdown-group">
        <h3>Kategoriler</h3>
        <DropdownManager 
          title="Kategori"
          endpoint="/categories/"
          onUpdate={() => {}}
        />
      </div>
      
      <div className="dropdown-group">
        <h3>İş Tipleri</h3>
        <DropdownManager 
          title="İş Tipi"
          endpoint="/work-types/"
          onUpdate={() => {}}
        />
      </div>
      
      <div className="dropdown-group">
        <h3>Satış Kanalları</h3>
        <DropdownManager 
          title="Satış Kanalı"
          endpoint="/sales-channels/"
          onUpdate={() => {}}
        />
      </div>
    </div>
  </div>
);

export default Settings;