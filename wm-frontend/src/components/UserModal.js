// src/components/UserModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useUsersAndRoles } from '../hooks';
import api from '../services/api';
import './UserModal.css';

const UserModal = ({ isOpen, onClose, onSave, user = null }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    re_password: '',
    roles: []
  });
  
  const { roles, fetchRoles } = useUsersAndRoles();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Modal açıldığında rolleri yükle
  useEffect(() => {
    if (isOpen && roles.length === 0) {
      fetchRoles();
    }
  }, [isOpen]);

  // User verisi gelirse formu doldur
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        password: '',
        re_password: '',
        roles: user.roles || []
      });
      
      // Kullanıcının mevcut rollerini yükle
      if (user.id) {
        fetchUserRoles(user.id);
      }
    } else {
      // Yeni kullanıcı için formu temizle
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        re_password: '',
        roles: []
      });
    }
    setErrors({});
  }, [user]);

  const fetchUserRoles = async (userId) => {
    try {
      const response = await api.get('/permissions/user-roles/');
      if (response.data.success) {
        const userRoles = response.data.data
          .filter(ur => ur.user === userId)
          .map(ur => ur.role);
        
        setFormData(prev => ({
          ...prev,
          roles: userRoles
        }));
      }
    } catch (error) {
      console.error('Roller yüklenirken hata:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Hata varsa temizle
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoleChange = (roleId) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter(id => id !== roleId)
        : [...prev.roles, roleId]
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username) {
      newErrors.username = 'Kullanıcı adı zorunludur';
    }
    
    if (!formData.email) {
      newErrors.email = 'E-posta zorunludur';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }
    
    if (!formData.first_name) {
      newErrors.first_name = 'Ad zorunludur';
    }
    
    if (!formData.last_name) {
      newErrors.last_name = 'Soyad zorunludur';
    }
    
    // Yeni kullanıcı için şifre kontrolü
    if (!user) {
      if (!formData.password) {
        newErrors.password = 'Şifre zorunludur';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Şifre en az 8 karakter olmalıdır';
      }
      
      if (formData.password !== formData.re_password) {
        newErrors.re_password = 'Şifreler eşleşmiyor';
      }
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
      username: formData.username,
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name
    };
    
    // Yeni kullanıcı için şifre ekle
    if (!user && formData.password) {
      dataToSend.password = formData.password;
      dataToSend.re_password = formData.re_password;
    }
    
    try {
      await onSave(dataToSend, formData.roles);
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
      title={user ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
    >
      <form onSubmit={handleSubmit} className="user-form">
        <div className="form-row">
          <div className="form-group">
            <label>Ad *</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className={errors.first_name ? 'error' : ''}
              disabled={loading}
            />
            {errors.first_name && <span className="error-text">{errors.first_name}</span>}
          </div>
          
          <div className="form-group">
            <label>Soyad *</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className={errors.last_name ? 'error' : ''}
              disabled={loading}
            />
            {errors.last_name && <span className="error-text">{errors.last_name}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Kullanıcı Adı *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={errors.username ? 'error' : ''}
              disabled={loading || user}
            />
            {errors.username && <span className="error-text">{errors.username}</span>}
          </div>
          
          <div className="form-group">
            <label>E-posta *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              disabled={loading}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>
        </div>

        {!user && (
          <div className="form-row">
            <div className="form-group">
              <label>Şifre *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                disabled={loading}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>
            
            <div className="form-group">
              <label>Şifre Tekrar *</label>
              <input
                type="password"
                name="re_password"
                value={formData.re_password}
                onChange={handleChange}
                className={errors.re_password ? 'error' : ''}
                disabled={loading}
              />
              {errors.re_password && <span className="error-text">{errors.re_password}</span>}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Roller</label>
          {roles.length === 0 ? (
            <p className="no-roles">Henüz rol tanımlanmamış. Önce rol oluşturun.</p>
          ) : (
            <div className="roles-grid">
              {roles.map(role => (
                <div 
                  key={role.id} 
                  className={`role-card ${formData.roles.includes(role.id) ? 'selected' : ''}`}
                  onClick={() => handleRoleChange(role.id)}
                >
                  <div className="role-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.roles.includes(role.id)}
                      onChange={() => {}}
                      disabled={loading}
                    />
                  </div>
                  <div className="role-info">
                    <h4>{role.name}</h4>
                    {role.description && (
                      <p>{role.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
            {loading ? 'Kaydediliyor...' : (user ? 'Güncelle' : 'Oluştur')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserModal;