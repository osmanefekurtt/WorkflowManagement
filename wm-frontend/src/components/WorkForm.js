// src/components/WorkForm.js
import React, { useState, useEffect } from 'react';
import { usePermissions, useDropdowns } from '../hooks';
import './WorkForm.css';

const WorkForm = ({ work, onSave, onCancel, onDelete, isNew = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    type: '',
    sales_channel: '',
    design_start_date: '',
    design_end_date: '',
    confirm_date: '',
    printing_location: '',
    printing_confirm: false,
    printing_start_date: '',
    printing_end_date: '',
    mixed: false,
    packaging_date: '',
    stock_entry: false,
    shipping_date: '',
    link: '',
    link_title: '',
    note: ''
  });

  // Context'ten dropdown verileri ve yetkiler
  const { categories, workTypes, salesChannels, loading: dropdownsLoading } = useDropdowns();
  const { workPermissions, canReadField, canWriteField, hasFieldPermission } = usePermissions();
  
  // Orijinal veriyi sakla
  const [originalData, setOriginalData] = useState(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    if (work) {
      const workData = {
        ...work,
        price: work.price || '',
        category: work.category || '',
        type: work.type || '',
        sales_channel: work.sales_channel || '',
        printing_confirm: work.printing_confirm || false,
        mixed: work.mixed || false,
        stock_entry: work.stock_entry || false,
      };
      setFormData(workData);
      setOriginalData(workData);
    }
  }, [work]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Yazma yetkisi kontrolü
    if (!canWriteField(name)) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let dataToSend;
    
    if (isNew) {
      dataToSend = {};
      Object.keys(formData).forEach(key => {
        if (!canWriteField(key)) {
          return;
        }
        
        if (formData[key] === '') {
          dataToSend[key] = null;
        } else {
          dataToSend[key] = formData[key];
        }
      });
    } else {
      dataToSend = {};
      Object.keys(formData).forEach(key => {
        if (['id', 'created', 'updated'].includes(key)) {
          return;
        }
        
        if (!canWriteField(key)) {
          return;
        }
        
        if (originalData && formData[key] !== originalData[key]) {
          if (formData[key] === '') {
            dataToSend[key] = null;
          } else {
            dataToSend[key] = formData[key];
          }
        }
      });
      
      if (Object.keys(dataToSend).length === 0) {
        return;
      }
    }
    
    onSave(dataToSend);
  };

  const handleDelete = () => {
    if (onDelete && work?.id) {
      onDelete(work.id);
    }
  };

  const isFieldVisible = (fieldName) => {
    return hasFieldPermission(fieldName);
  };

  const isFieldEditable = (fieldName) => {
    return canWriteField(fieldName);
  };

  if (loadingPermissions || dropdownsLoading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="work-form">
      <div className="form-grid">
        {/* Temel Bilgiler */}
        <div className="form-section">
          <h3>Temel Bilgiler</h3>
          
          {isFieldVisible('name') && (
            <div className="form-group">
              <label>İş İsmi *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!isFieldEditable('name')}
                required={isFieldEditable('name')}
              />
            </div>
          )}

          <div className="form-row">
            {isFieldVisible('category') && (
              <div className="form-group">
                <label>Kategori</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={!isFieldEditable('category')}
                >
                  <option value="">Seçiniz</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isFieldVisible('price') && (
              <div className="form-group">
                <label>Fiyat</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  disabled={!isFieldEditable('price')}
                  step="0.01"
                />
              </div>
            )}
          </div>

          <div className="form-row">
            {isFieldVisible('type') && (
              <div className="form-group">
                <label>Tip</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  disabled={!isFieldEditable('type')}
                >
                  <option value="">Seçiniz</option>
                  {workTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isFieldVisible('sales_channel') && (
              <div className="form-group">
                <label>Satış Kanalı</label>
                <select
                  name="sales_channel"
                  value={formData.sales_channel}
                  onChange={handleChange}
                  disabled={!isFieldEditable('sales_channel')}
                >
                  <option value="">Seçiniz</option>
                  {salesChannels.map(channel => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tasarım Bilgileri */}
        <div className="form-section">
          <h3>Tasarım Bilgileri</h3>
          
          <div className="form-row">
            {isFieldVisible('design_start_date') && (
              <div className="form-group">
                <label>Tasarım Başlangıç</label>
                <input
                  type="date"
                  name="design_start_date"
                  value={formData.design_start_date || ''}
                  onChange={handleChange}
                  disabled={!isFieldEditable('design_start_date')}
                />
              </div>
            )}

            {isFieldVisible('design_end_date') && (
              <div className="form-group">
                <label>Tasarım Bitiş</label>
                <input
                  type="date"
                  name="design_end_date"
                  value={formData.design_end_date || ''}
                  onChange={handleChange}
                  disabled={!isFieldEditable('design_end_date')}
                />
              </div>
            )}
          </div>

          {isFieldVisible('confirm_date') && (
            <div className="form-group">
              <label>Onay Tarihi</label>
              <input
                type="date"
                name="confirm_date"
                value={formData.confirm_date || ''}
                onChange={handleChange}
                disabled={!isFieldEditable('confirm_date')}
              />
            </div>
          )}
        </div>

        {/* Baskı Bilgileri */}
        <div className="form-section">
          <h3>Baskı Bilgileri</h3>
          
          {isFieldVisible('printing_location') && (
            <div className="form-group">
              <label>Baskı Lokasyonu</label>
              <input
                type="text"
                name="printing_location"
                value={formData.printing_location}
                onChange={handleChange}
                disabled={!isFieldEditable('printing_location')}
              />
            </div>
          )}

          {isFieldVisible('printing_confirm') && (
            <div className="form-checkbox">
              <input
                type="checkbox"
                id="printing_confirm"
                name="printing_confirm"
                checked={formData.printing_confirm}
                onChange={handleChange}
                disabled={!isFieldEditable('printing_confirm')}
              />
              <label htmlFor="printing_confirm">Baskı Onayı</label>
            </div>
          )}

          <div className="form-row">
            {isFieldVisible('printing_start_date') && (
              <div className="form-group">
                <label>Baskı Başlangıç</label>
                <input
                  type="date"
                  name="printing_start_date"
                  value={formData.printing_start_date || ''}
                  onChange={handleChange}
                  disabled={!isFieldEditable('printing_start_date')}
                />
              </div>
            )}

            {isFieldVisible('printing_end_date') && (
              <div className="form-group">
                <label>Baskı Bitiş</label>
                <input
                  type="date"
                  name="printing_end_date"
                  value={formData.printing_end_date || ''}
                  onChange={handleChange}
                  disabled={!isFieldEditable('printing_end_date')}
                />
              </div>
            )}
          </div>
        </div>

        {/* Paketleme ve Sevkiyat */}
        <div className="form-section">
          <h3>Paketleme ve Sevkiyat</h3>
          
          {isFieldVisible('mixed') && (
            <div className="form-checkbox">
              <input
                type="checkbox"
                id="mixed"
                name="mixed"
                checked={formData.mixed}
                onChange={handleChange}
                disabled={!isFieldEditable('mixed')}
              />
              <label htmlFor="mixed">Karışık</label>
            </div>
          )}

          <div className="form-row">
            {isFieldVisible('packaging_date') && (
              <div className="form-group">
                <label>Paketleme Tarihi</label>
                <input
                  type="date"
                  name="packaging_date"
                  value={formData.packaging_date || ''}
                  onChange={handleChange}
                  disabled={!isFieldEditable('packaging_date')}
                />
              </div>
            )}

            {isFieldVisible('shipping_date') && (
              <div className="form-group">
                <label>Sevkiyat Tarihi</label>
                <input
                  type="date"
                  name="shipping_date"
                  value={formData.shipping_date || ''}
                  onChange={handleChange}
                  disabled={!isFieldEditable('shipping_date')}
                />
              </div>
            )}
          </div>

          {isFieldVisible('stock_entry') && (
            <div className="form-checkbox">
              <input
                type="checkbox"
                id="stock_entry"
                name="stock_entry"
                checked={formData.stock_entry}
                onChange={handleChange}
                disabled={!isFieldEditable('stock_entry')}
              />
              <label htmlFor="stock_entry">Stok Girişi</label>
            </div>
          )}
        </div>

        {/* Ek Bilgiler */}
        <div className="form-section full-width">
          <h3>Ek Bilgiler</h3>
          
          <div className="form-row">
            {isFieldVisible('link') && (
              <div className="form-group">
                <label>Bağlantı</label>
                <input
                  type="url"
                  name="link"
                  value={formData.link}
                  onChange={handleChange}
                  disabled={!isFieldEditable('link')}
                />
              </div>
            )}

            {isFieldVisible('link_title') && (
              <div className="form-group">
                <label>Bağlantı Başlığı</label>
                <input
                  type="text"
                  name="link_title"
                  value={formData.link_title}
                  onChange={handleChange}
                  disabled={!isFieldEditable('link_title')}
                />
              </div>
            )}
          </div>

          {isFieldVisible('note') && (
            <div className="form-group">
              <label>Notlar</label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                disabled={!isFieldEditable('note')}
                rows="4"
              />
            </div>
          )}
        </div>
      </div>

      <div className="form-actions">
        <div className="form-actions-left">
          {!isNew && onDelete && (
            <button type="button" onClick={handleDelete} className="btn-delete">
              🗑️ Sil
            </button>
          )}
        </div>
        
        <div className="form-actions-right">
          <button type="button" onClick={onCancel} className="btn-cancel">
            İptal
          </button>
          <button type="submit" className="btn-save">
            {isNew ? 'Oluştur' : 'Kaydet'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default WorkForm;