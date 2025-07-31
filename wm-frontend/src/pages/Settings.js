// src/pages/Settings.js
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import UserModal from '../components/UserModal';
import RoleModal from '../components/RoleModal';
import ToastContainer from '../components/ToastContainer';
import useToast from '../hooks/useToast';
import api from '../services/api';
import './Settings.css';
import DropdownManager from '../components/DropdownManager'; // Bu satırı ekleyin


const Settings = () => {
  const [activeTab, setActiveTab] = useState('users'); // users, roles
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'roles') {
      fetchRoles();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get('/auth/users/');
      
      // Response yapısına göre data'yı al
      if (response.data.success && response.data.data && Array.isArray(response.data.data.data)) {
        setUsers(response.data.data.data);
      } else if (response.data.success && Array.isArray(response.data.data)) {
        setUsers(response.data.data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      showToast('Kullanıcılar yüklenirken hata oluştu', 'error');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await api.get('/permissions/roles/');
      if (response.data.success) {
        setRoles(response.data.data);
      }
    } catch (error) {
      console.error('Roller yüklenirken hata:', error);
      showToast('Roller yüklenirken hata oluştu', 'error');
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleNewUser = () => {
    setSelectedUser(null);
    setUserModalOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };

  const handleNewRole = () => {
    setSelectedRole(null);
    setRoleModalOpen(true);
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setRoleModalOpen(true);
  };

  const handleSaveUser = async (userData, roles) => {
    try {
      let response;
      
      if (selectedUser) {
        // Kullanıcı güncelleme
        response = await api.patch(`/auth/users/${selectedUser.id}/`, userData);
        
        // Güncelleme başarılıysa rolleri güncelle
        if (response.data.success || response.status === 200) {
          // Önce mevcut rolleri sil
          try {
            const userRolesResponse = await api.get('/permissions/user-roles/');
            if (userRolesResponse.data.success) {
              const currentUserRoles = userRolesResponse.data.data.filter(
                ur => ur.user === selectedUser.id
              );
              
              // Mevcut rolleri sil
              for (const userRole of currentUserRoles) {
                await api.delete(`/permissions/user-roles/${userRole.id}/`);
              }
            }
          } catch (error) {
            console.error('Mevcut roller silinirken hata:', error);
          }
          
          // Yeni rolleri ekle
          for (const roleId of roles) {
            try {
              await api.post('/permissions/user-roles/', {
                user: selectedUser.id,
                role: roleId
              });
            } catch (error) {
              console.error('Rol atama hatası:', error);
            }
          }
          
          showToast('Kullanıcı güncellendi', 'success');
        }
      } else {
        // Yeni kullanıcı oluşturma
        response = await api.post('/auth/register/', userData);
        
        if (response.data.success) {
          // Eğer kullanıcı oluşturulduysa ve roller varsa, rolleri ata
          if (roles.length > 0 && response.data.data?.user?.id) {
            const userId = response.data.data.user.id;
            for (const roleId of roles) {
              try {
                await api.post('/permissions/user-roles/', {
                  user: userId,
                  role: roleId
                });
              } catch (error) {
                console.error('Rol atama hatası:', error);
              }
            }
          }
          
          showToast('Kullanıcı oluşturuldu', 'success');
        }
      }
      
      fetchUsers();
      setUserModalOpen(false);
      
    } catch (error) {
      console.error('Kullanıcı kaydetme hatası:', error);
      let errorMessage = 'Bir hata oluştu';
      
      if (error.response?.data?.errors?.non_field_errors) {
        errorMessage = error.response.data.errors.non_field_errors[0];
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  const handleSaveRole = async (roleData) => {
    try {
      let response;
      
      if (selectedRole) {
        // Rol güncelleme
        response = await api.put(`/permissions/roles/${selectedRole.id}/`, roleData);
      } else {
        // Yeni rol oluşturma
        response = await api.post('/permissions/roles/', roleData);
      }
      
      if (response.data.success || response.status === 200 || response.status === 201) {
        showToast(
          selectedRole ? 'Rol güncellendi' : 'Rol oluşturuldu',
          'success'
        );
        fetchRoles();
        setRoleModalOpen(false);
      }
    } catch (error) {
      console.error('Rol kaydetme hatası:', error);
      let errorMessage = 'Bir hata oluştu';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showToast(errorMessage, 'error');
      throw error;
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

        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button 
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Kullanıcılar
          </button>
          <button 
            className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            🔐 Roller
          </button>
          <button 
            className={`tab-button ${activeTab === 'dropdowns' ? 'active' : ''}`}
            onClick={() => setActiveTab('dropdowns')}
          >
            📝 Dropdown Yönetimi
          </button>

        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'users' && (
            <div className="users-section">
              <div className="section-header">
                <h2>Kullanıcı Yönetimi</h2>
                <button className="primary-btn" onClick={handleNewUser}>
                  ➕ Yeni Kullanıcı
                </button>
              </div>
              
              <div className="content-area">
                {loadingUsers ? (
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
                                onClick={() => handleEditUser(user)}
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
          )}

          {activeTab === 'roles' && (
            <div className="roles-section">
              <div className="section-header">
                <h2>Rol Yönetimi</h2>
                <button className="primary-btn" onClick={handleNewRole}>
                  ➕ Yeni Rol
                </button>
              </div>
              
              <div className="content-area">
                {loadingRoles ? (
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
                                onClick={() => handleEditRole(role)}
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
          )}

          {activeTab === 'dropdowns' && (
            <div className="dropdowns-section">
              <div className="dropdown-management">
                {/* Kategoriler */}
                <div className="dropdown-group">
                  <h3>Kategoriler</h3>
                  <DropdownManager 
                    title="Kategori"
                    endpoint="/categories/"
                    onUpdate={() => {/* refresh if needed */}}
                  />
                </div>
                
                {/* İş Tipleri */}
                <div className="dropdown-group">
                  <h3>İş Tipleri</h3>
                  <DropdownManager 
                    title="İş Tipi"
                    endpoint="/work-types/"
                    onUpdate={() => {/* refresh if needed */}}
                  />
                </div>
                
                {/* Satış Kanalları */}
                <div className="dropdown-group">
                  <h3>Satış Kanalları</h3>
                  <DropdownManager 
                    title="Satış Kanalı"
                    endpoint="/sales-channels/"
                    onUpdate={() => {/* refresh if needed */}}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Modal */}
        <UserModal
          isOpen={userModalOpen}
          onClose={() => setUserModalOpen(false)}
          onSave={handleSaveUser}
          user={selectedUser}
        />
        
        {/* Role Modal */}
        <RoleModal
          isOpen={roleModalOpen}
          onClose={() => setRoleModalOpen(false)}
          onSave={handleSaveRole}
          role={selectedRole}
        />
      </div>
    </Layout>
  );
};

export default Settings;