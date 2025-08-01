// src/components/DropdownManager.js
import React, { useState, useEffect, useRef } from 'react';
import { useDropdowns, useUI } from '../hooks';
import api from '../services/api';
import './css/DropdownManager.css';

const DropdownManager = ({ title, endpoint, onUpdate }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  const [error, setError] = useState('');
  
  // Mount kontrolü için ref
  const isMounted = useRef(false);
  
  // Context hooks
  const { fetchDropdowns } = useDropdowns();
  const { showToast } = useUI();

  useEffect(() => {
    // İlk mount'ta çalışsın
    if (!isMounted.current) {
      isMounted.current = true;
      fetchItems();
    }
  }, [endpoint]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await api.get(endpoint);
      if (response.data.success) {
        setItems(response.data.data || []);
      }
    } catch (error) {
      console.error(`${title} yüklenirken hata:`, error);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('İsim alanı zorunludur');
      return;
    }

    try {
      let response;
      if (editingItem) {
        // Güncelleme
        response = await api.put(`${endpoint}${editingItem.id}/`, formData);
      } else {
        // Yeni kayıt
        response = await api.post(endpoint, formData);
      }

      if (response.data.success || response.status === 200 || response.status === 201) {
        fetchItems();
        resetForm();
        
        // Context'i güncelle
        fetchDropdowns();
        
        // Toast göster
        showToast(
          editingItem ? `${title} güncellendi` : `${title} eklendi`,
          'success'
        );
        
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      setError(error.response?.data?.message || 'Kaydetme sırasında hata oluştu');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ name: item.name });
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const response = await api.delete(`${endpoint}${id}/`);
      if (response.data.success || response.status === 204) {
        fetchItems();
        
        // Context'i güncelle
        fetchDropdowns();
        
        // Toast göster
        showToast(`${title} silindi`, 'success');
        
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      setError(error.response?.data?.message || 'Silme sırasında hata oluştu');
      showToast('Silme işlemi başarısız', 'error');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({ name: '' });
    setError('');
  };

  const handleNewItem = () => {
    resetForm();
    setShowForm(true);
  };

  return (
    <div className="dropdown-manager">
      <div className="dropdown-header">
        <h4>{title} Yönetimi</h4>
        <button className="btn-add" onClick={handleNewItem}>
          ➕ Yeni {title}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="dropdown-form">
          <div className="form-inline">
            <input
              type="text"
              placeholder={`${title} adı`}
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              className="form-input"
              autoFocus
            />
            <button type="submit" className="btn-save-inline">
              {editingItem ? '✓ Güncelle' : '✓ Ekle'}
            </button>
            <button type="button" onClick={resetForm} className="btn-cancel-inline">
              ✕ İptal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="loading-message">Yükleniyor...</div>
      ) : items.length === 0 ? (
        <div className="empty-message">Henüz {title.toLowerCase()} eklenmemiş.</div>
      ) : (
        <ul className="dropdown-list">
          {items.map(item => (
            <li key={item.id} className="dropdown-item">
              <span className="item-name">{item.name}</span>
              <div className="item-actions">
                <button
                  className="btn-icon edit"
                  onClick={() => handleEdit(item)}
                  title="Düzenle"
                >
                  ✏️
                </button>
                <button
                  className="btn-icon delete"
                  onClick={() => handleDelete(item.id)}
                  title="Sil"
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropdownManager;