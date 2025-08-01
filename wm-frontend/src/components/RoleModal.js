import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useUI } from '../hooks';
import api from '../services/api';
import './css/RoleModal.css';

const RoleModal = ({ isOpen, onClose, onSave, role = null }) => {
  const initialFormData = {
    name: '',
    description: '',
    permissions: {},
    system_permissions: {
      work_create: false,
      work_delete: false
    }
  };
  
  const [formData, setFormData] = useState(initialFormData);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { showToast } = useUI();

  const categorizeColumns = columns => {
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
        columns: [
          'printing_location', 
          'printing_confirm', 
          'printing_control',
          'printing_controller',
          'printing_start_date', 
          'printing_end_date'
        ]
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

  // Load available columns
  useEffect(() => {
    if (isOpen) {
      fetchAvailableColumns();
    }
  }, [isOpen]);

  // Initialize form with role data
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
      fetchRolePermissions(role.id);
    } else {
      // New role - default permissions
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

  const fetchRolePermissions = async roleId => {
    try {
      const response = await api.get(`/permissions/roles/${roleId}/`);
      if (response.data.success) {
        const permissions = {};
        const systemPermissions = {
          work_create: false,
          work_delete: false
        };
        
        // Initialize all columns with 'none'
        availableColumns.forEach(col => {
          permissions[col.column_name] = 'none';
        });
        
        // Update with actual permissions
        response.data.data.column_permissions?.forEach(perm => {
          permissions[perm.column_name] = perm.permission;
        });
        
        response.data.data.system_permissions?.forEach(perm => {
          systemPermissions[perm.permission_type] = perm.granted;
        });
        
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

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
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

  const handleSystemPermissionChange = permissionType => {
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
    setFormData(prev => ({ ...prev, permissions: updatedPermissions }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name) {
      newErrors.name = 'Rol adı zorunludur';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      await onSave({
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
        system_permissions: formData.system_permissions
      });
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

        {/* System Permissions */}
        <div className="permissions-container">
          <SystemPermissions 
            permissions={formData.system_permissions}
            onChange={handleSystemPermissionChange}
            loading={loading}
          />

          {/* Column Permissions */}
          <div className="column-permissions-section">
            <h3 className="section-title">
              <span className="section-icon">🔐</span>
              Kolon Yetkileri
            </h3>
            
            <div className="permissions-categories">
              {Object.entries(categorizedColumns).map(([categoryKey, category]) => (
                category.columns.length > 0 && (
                  <PermissionCategory
                    key={categoryKey}
                    category={category}
                    permissions={formData.permissions}
                    onPermissionChange={handlePermissionChange}
                    onBulkChange={setCategoryPermission}
                    loading={loading}
                  />
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

// Sub-components
const SystemPermissions = ({ permissions, onChange, loading }) => (
  <div className="system-permissions-card">
    <h3 className="section-title">
      <span className="section-icon">⚙️</span>
      Sistem İzinleri
    </h3>
    
    <div className="system-permissions-grid">
      <SystemPermissionItem
        label="İş Oluşturma"
        description="Yeni iş kaydı oluşturabilir"
        checked={permissions.work_create}
        onChange={() => onChange('work_create')}
        disabled={loading}
      />
      
      <SystemPermissionItem
        label="İş Silme"
        description="Mevcut iş kayıtlarını silebilir"
        checked={permissions.work_delete}
        onChange={() => onChange('work_delete')}
        disabled={loading}
      />
    </div>
  </div>
);

const SystemPermissionItem = ({ label, description, checked, onChange, disabled }) => (
  <div className="system-permission-item">
    <label className="switch-label">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="switch-slider"></span>
      <div className="permission-content">
        <span className="permission-name">{label}</span>
        <span className="permission-desc">{description}</span>
      </div>
    </label>
  </div>
);

const PermissionCategory = ({ category, permissions, onPermissionChange, onBulkChange, loading }) => (
  <div className="permission-category-card">
    <div className="category-header">
      <div className="category-title">
        <span className="category-icon">{category.icon}</span>
        <h4>{category.title}</h4>
      </div>
      <div className="bulk-actions">
        <button
          type="button"
          className="bulk-btn bulk-none"
          onClick={() => onBulkChange(category.columns, 'none')}
          title="Tümüne Yetki Yok"
        >
          Yetki Yok
        </button>
        <button
          type="button"
          className="bulk-btn bulk-read"
          onClick={() => onBulkChange(category.columns, 'read')}
          title="Tümüne Okuma"
        >
          Okuma
        </button>
        <button
          type="button"
          className="bulk-btn bulk-write"
          onClick={() => onBulkChange(category.columns, 'write')}
          title="Tümüne Yazma"
        >
          Yazma
        </button>
      </div>
    </div>
    
    <div className="category-permissions">
      {category.columns.map(column => (
        <PermissionItem
          key={column.column_name}
          column={column}
          permission={permissions[column.column_name]}
          onChange={onPermissionChange}
          disabled={loading}
        />
      ))}
    </div>
  </div>
);

const PermissionItem = ({ column, permission, onChange, disabled }) => {
  const options = [
    { value: 'none', label: '✖', className: 'none' },
    { value: 'read', label: '👁️', className: 'read' },
    { value: 'write', label: '✏️', className: 'write' }
  ];
  
  return (
    <div className="permission-item">
      <span className="column-label">{column.display_name}</span>
      <div className="permission-controls">
        {options.map(option => (
          <label 
            key={option.value}
            className={`permission-option ${permission === option.value ? 'active' : ''}`}
          >
            <input
              type="radio"
              name={`perm_${column.column_name}`}
              value={option.value}
              checked={permission === option.value}
              onChange={() => onChange(column.column_name, option.value)}
              disabled={disabled}
            />
            <span className={`option-label ${option.className}`}>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default RoleModal;