// src/components/RoleModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useUI } from '../hooks';
import api from '../services/api';
import './RoleModal.css';

const RoleModal = ({ isOpen, onClose, onSave, role = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {},
    system_permissions: {
      work_create: false,
      work_delete: false
    }
  });
  
  const [availableColumns, setAvailableColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Context hook
  const { showToast } = useUI();

  // Mevcut kolonları yükle
  useEffect(() => {
    if (isOpen) {
      fetchAvailableColumns();
    }
  }, [isOpen]);


  // Role verisi gelirse formu doldur
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        permissions: {},
        system_permissions: {
          work_create: false,
          work_delete: false
        }
      });
      // Rol izinlerini yükle
      fetchRolePermissions(role.id);
    } else {
      // Yeni rol için varsayılan izinler (hepsi read)
      const defaultPermissions = {};
      availableColumns.forEach(col => {
        defaultPermissions[col.column_name] = 'read';
      });
      
      setFormData({
        name: '',
        description: '',
        permissions: defaultPermissions,
        system_permissions: {
          work_create: false,
          work_delete: false
        }
      });
    }
    setErrors({});
  }, [role, availableColumns]);

  const fetchAvailableColumns = async () => {
    try {
      const response = await api.get('/permissions/roles/available_columns/');
      if (response.data.success) {
        setAvailableColumns(response.data.data.columns || []);
      }
    } catch (error) {
      console.error('Kolonlar yüklenirken hata:', error);
      showToast('Kolon bilgileri yüklenirken hata oluştu', 'error');
    }
  };

  const fetchRolePermissions = async (roleId) => {
    try {
      const response = await api.get(`/permissions/roles/${roleId}/`);
      if (response.data.success) {
        const permissions = {};
        const systemPermissions = {
          work_create: false,
          work_delete: false
        };
        
        // Önce tüm kolonlara 'none' ver
        availableColumns.forEach(col => {
          permissions[col.column_name] = 'none';
        });
        
        // Sonra mevcut kolon izinlerini güncelle
        if (response.data.data.column_permissions) {
          response.data.data.column_permissions.forEach(perm => {
            permissions[perm.column_name] = perm.permission;
          });
        }
        
        // Sistem izinlerini güncelle
        if (response.data.data.system_permissions) {
          response.data.data.system_permissions.forEach(perm => {
            systemPermissions[perm.permission_type] = perm.granted;
          });
        }
        
        setFormData(prev => ({
          ...prev,
          permissions,
          system_permissions: systemPermissions
        }));
      }
    } catch (error) {
      console.error('Rol izinleri yüklenirken hata:', error);
      showToast('Rol izinleri yüklenirken hata oluştu', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePermissionChange = (columnName, permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [columnName]: permission
      }
    }));
  };

  const handleSystemPermissionChange = (permissionType) => {
    setFormData(prev => ({
      ...prev,
      system_permissions: {
        ...prev.system_permissions,
        [permissionType]: !prev.system_permissions[permissionType]
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name) {
      newErrors.name = 'Rol adı zorunludur';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    const dataToSend = {
      name: formData.name,
      description: formData.description,
      permissions: formData.permissions,
      system_permissions: formData.system_permissions
    };
    
    try {
      await onSave(dataToSend);
      onClose();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={role ? 'Rol Düzenle' : 'Yeni Rol'}
    >
      <form onSubmit={handleSubmit} className="role-form">
        <div className="form-row">
          <div className="form-group">
            <label>Rol Adı *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              disabled={loading}
              placeholder="Örn: Muhasebe, Satış Müdürü"
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>
        </div>

        <div className="form-group">
          <label>Açıklama</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
            rows="3"
            placeholder="Bu rol hakkında kısa bir açıklama..."
          />
        </div>

        {/* Sistem İzinleri */}
        <div className="system-permissions-section">
          <h3>Sistem İzinleri</h3>
          <p className="permissions-info">
            Bu role sahip kullanıcıların yapabileceği genel işlemler.
          </p>
          
          <div className="system-permissions-list">
            <div className="system-permission-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.system_permissions.work_create}
                  onChange={() => handleSystemPermissionChange('work_create')}
                  disabled={loading}
                />
                <span className="checkbox-custom"></span>
                <div className="permission-info">
                  <span className="permission-title">İş Oluşturma</span>
                  <span className="permission-desc">Yeni iş kaydı oluşturabilir</span>
                </div>
              </label>
            </div>
            
            <div className="system-permission-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.system_permissions.work_delete}
                  onChange={() => handleSystemPermissionChange('work_delete')}
                  disabled={loading}
                />
                <span className="checkbox-custom"></span>
                <div className="permission-info">
                  <span className="permission-title">İş Silme</span>
                  <span className="permission-desc">Mevcut iş kayıtlarını silebilir</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Kolon Yetkileri */}
        <div className="permissions-section">
          <h3>Kolon Yetkileri</h3>
          <p className="permissions-info">
            Her kolon için yetki seviyesi belirleyin. Kullanıcılar sadece yetkili oldukları alanları görebilir ve düzenleyebilir.
          </p>
          
          <div className="permissions-table">
            <div className="permissions-header">
              <div className="column-name">Kolon Adı</div>
              <div className="permission-options">
                <span>Yetki Yok</span>
                <span>Sadece Okuma</span>
                <span>Okuma ve Yazma</span>
              </div>
            </div>
            
            {availableColumns.map(column => (
              <div key={column.column_name} className="permission-row">
                <div className="column-name">
                  {column.display_name}
                </div>
                <div className="permission-radios">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name={`perm_${column.column_name}`}
                      value="none"
                      checked={formData.permissions[column.column_name] === 'none'}
                      onChange={() => handlePermissionChange(column.column_name, 'none')}
                      disabled={loading}
                    />
                    <span className="radio-custom none"></span>
                  </label>
                  
                  <label className="radio-label">
                    <input
                      type="radio"
                      name={`perm_${column.column_name}`}
                      value="read"
                      checked={formData.permissions[column.column_name] === 'read'}
                      onChange={() => handlePermissionChange(column.column_name, 'read')}
                      disabled={loading}
                    />
                    <span className="radio-custom read"></span>
                  </label>
                  
                  <label className="radio-label">
                    <input
                      type="radio"
                      name={`perm_${column.column_name}`}
                      value="write"
                      checked={formData.permissions[column.column_name] === 'write'}
                      onChange={() => handlePermissionChange(column.column_name, 'write')}
                      disabled={loading}
                    />
                    <span className="radio-custom write"></span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-cancel"
            disabled={loading}
          >
            İptal
          </button>
          <button 
            type="submit" 
            className="btn-save"
            disabled={loading}
          >
            {loading ? 'Kaydediliyor...' : (role ? 'Güncelle' : 'Oluştur')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RoleModal;