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

  // Kolonları kategorize et
  const categorizeColumns = (columns) => {
    const categories = {
      basic: {
        title: 'Temel Bilgiler',
        icon: '📋',
        columns: ['name', 'category', 'price', 'type', 'sales_channel']
      },
      design: {
        title: 'Tasarım Bilgileri',
        icon: '🎨',
        columns: ['designer', 'design_start_date', 'design_end_date', 'confirm_date']
      },
      printing: {
        title: 'Baskı Bilgileri',
        icon: '🖨️',
        columns: ['printing_location', 'printing_confirm', 'printing_start_date', 'printing_end_date']
      },
      shipping: {
        title: 'Paketleme ve Sevkiyat',
        icon: '📦',
        columns: ['mixed', 'packaging_date', 'stock_entry', 'shipping_date']
      },
      additional: {
        title: 'Ek Bilgiler',
        icon: '🔗',
        columns: ['links', 'note']
      }
    };

    const categorizedColumns = {};
    
    Object.entries(categories).forEach(([key, category]) => {
      categorizedColumns[key] = {
        ...category,
        columns: columns.filter(col => category.columns.includes(col.column_name))
      };
    });

    return categorizedColumns;
  };

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

  const setCategoryPermission = (categoryColumns, permission) => {
    const updatedPermissions = { ...formData.permissions };
    categoryColumns.forEach(col => {
      updatedPermissions[col.column_name] = permission;
    });
    setFormData(prev => ({
      ...prev,
      permissions: updatedPermissions
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

  const categorizedColumns = categorizeColumns(availableColumns);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={role ? 'Rol Düzenle' : 'Yeni Rol'}
      className="role-modal"
    >
      <form onSubmit={handleSubmit} className="role-form">
        <div className="role-form-header">
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
        </div>

        {/* Sistem İzinleri */}
        <div className="permissions-container">
          <div className="system-permissions-card">
            <h3 className="section-title">
              <span className="section-icon">⚙️</span>
              Sistem İzinleri
            </h3>
            
            <div className="system-permissions-grid">
              <div className="system-permission-item">
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={formData.system_permissions.work_create}
                    onChange={() => handleSystemPermissionChange('work_create')}
                    disabled={loading}
                  />
                  <span className="switch-slider"></span>
                  <div className="permission-content">
                    <span className="permission-name">İş Oluşturma</span>
                    <span className="permission-desc">Yeni iş kaydı oluşturabilir</span>
                  </div>
                </label>
              </div>
              
              <div className="system-permission-item">
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={formData.system_permissions.work_delete}
                    onChange={() => handleSystemPermissionChange('work_delete')}
                    disabled={loading}
                  />
                  <span className="switch-slider"></span>
                  <div className="permission-content">
                    <span className="permission-name">İş Silme</span>
                    <span className="permission-desc">Mevcut iş kayıtlarını silebilir</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Kolon Yetkileri */}
          <div className="column-permissions-section">
            <h3 className="section-title">
              <span className="section-icon">🔐</span>
              Kolon Yetkileri
            </h3>
            
            <div className="permissions-categories">
              {Object.entries(categorizedColumns).map(([categoryKey, category]) => (
                category.columns.length > 0 && (
                  <div key={categoryKey} className="permission-category-card">
                    <div className="category-header">
                      <div className="category-title">
                        <span className="category-icon">{category.icon}</span>
                        <h4>{category.title}</h4>
                      </div>
                      <div className="bulk-actions">
                        <button
                          type="button"
                          className="bulk-btn bulk-none"
                          onClick={() => setCategoryPermission(category.columns, 'none')}
                          title="Tümüne Yetki Yok"
                        >
                          Yetki Yok
                        </button>
                        <button
                          type="button"
                          className="bulk-btn bulk-read"
                          onClick={() => setCategoryPermission(category.columns, 'read')}
                          title="Tümüne Okuma"
                        >
                          Okuma
                        </button>
                        <button
                          type="button"
                          className="bulk-btn bulk-write"
                          onClick={() => setCategoryPermission(category.columns, 'write')}
                          title="Tümüne Yazma"
                        >
                          Yazma
                        </button>
                      </div>
                    </div>
                    
                    <div className="category-permissions">
                      {category.columns.map(column => (
                        <div key={column.column_name} className="permission-item">
                          <span className="column-label">{column.display_name}</span>
                          <div className="permission-controls">
                            <label className={`permission-option ${formData.permissions[column.column_name] === 'none' ? 'active' : ''}`}>
                              <input
                                type="radio"
                                name={`perm_${column.column_name}`}
                                value="none"
                                checked={formData.permissions[column.column_name] === 'none'}
                                onChange={() => handlePermissionChange(column.column_name, 'none')}
                                disabled={loading}
                              />
                              <span className="option-label none">✖</span>
                            </label>
                            
                            <label className={`permission-option ${formData.permissions[column.column_name] === 'read' ? 'active' : ''}`}>
                              <input
                                type="radio"
                                name={`perm_${column.column_name}`}
                                value="read"
                                checked={formData.permissions[column.column_name] === 'read'}
                                onChange={() => handlePermissionChange(column.column_name, 'read')}
                                disabled={loading}
                              />
                              <span className="option-label read">👁️</span>
                            </label>
                            
                            <label className={`permission-option ${formData.permissions[column.column_name] === 'write' ? 'active' : ''}`}>
                              <input
                                type="radio"
                                name={`perm_${column.column_name}`}
                                value="write"
                                checked={formData.permissions[column.column_name] === 'write'}
                                onChange={() => handlePermissionChange(column.column_name, 'write')}
                                disabled={loading}
                              />
                              <span className="option-label write">✏️</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
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