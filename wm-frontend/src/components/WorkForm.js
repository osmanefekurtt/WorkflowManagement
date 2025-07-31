// src/components/WorkForm.js
import React, { useState, useEffect } from 'react';
import { usePermissions, useDropdowns, useApp, useOnce } from '../hooks';
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
    links: [],  // Yeni: Array olarak
    note: ''
  });

  // Yeni link ekleme için state
  const [newLink, setNewLink] = useState({ url: '', title: '', description: '' });
  const [linkError, setLinkError] = useState('');

  // Context'ten dropdown verileri ve yetkiler
  const { categories, workTypes, salesChannels, loading: dropdownsLoading } = useDropdowns();
  const { workPermissions, canReadField, canWriteField, hasFieldPermission } = usePermissions();
  const { actions } = useApp();
  
  // Orijinal veriyi sakla
  const [originalData, setOriginalData] = useState(null);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  // Component mount olduğunda work permissions'ı yükle - sadece bir kere
  useOnce(() => {
    const loadPermissions = async () => {
      setLoadingPermissions(true);
      await actions.loadWorkPermissions();
      setLoadingPermissions(false);
    };
    
    loadPermissions();
  });

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
        links: work.links || [],
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

  const handleNewLinkChange = (e) => {
    const { name, value } = e.target;
    setNewLink(prev => ({
      ...prev,
      [name]: value
    }));
    setLinkError('');
  };

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddLink = () => {
    if (!canWriteField('links')) {
      return;
    }

    if (!newLink.url) {
      setLinkError('URL alanı zorunludur');
      return;
    }

    if (!validateUrl(newLink.url)) {
      setLinkError('Geçerli bir URL giriniz (https://... şeklinde)');
      return;
    }

    // Aynı URL daha önce eklenmişse uyar
    if (formData.links.some(link => link.url === newLink.url)) {
      setLinkError('Bu bağlantı zaten eklenmiş');
      return;
    }

    setFormData(prev => ({
      ...prev,
      links: [...prev.links, { ...newLink }]
    }));

    // Formu temizle
    setNewLink({ url: '', title: '', description: '' });
    setLinkError('');
  };

  const handleRemoveLink = (index) => {
    if (!canWriteField('links')) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index)
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
        if (['id', 'created', 'updated', 'link', 'link_title'].includes(key)) {
          return;
        }
        
        if (!canWriteField(key)) {
          return;
        }
        
        if (originalData && JSON.stringify(formData[key]) !== JSON.stringify(originalData[key])) {
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

        {/* Bağlantılar - Yeni Tasarım */}
        {isFieldVisible('links') && (
          <div className="form-section full-width">
            <h3>Bağlantılar</h3>
            
            {/* Mevcut Bağlantılar */}
            {formData.links && formData.links.length > 0 && (
              <div className="links-list">
                {formData.links.map((link, index) => (
                  <div key={index} className="link-item">
                    <div className="link-info">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-url">
                        {link.title || link.url}
                      </a>
                      {link.description && (
                        <span className="link-description">{link.description}</span>
                      )}
                      {link.added_by && (
                        <span className="link-meta">
                          Ekleyen: {link.added_by} 
                          {link.added_at && ` - ${new Date(link.added_at).toLocaleDateString('tr-TR')}`}
                        </span>
                      )}
                    </div>
                    {isFieldEditable('links') && (
                      <button
                        type="button"
                        className="link-remove-btn"
                        onClick={() => handleRemoveLink(index)}
                        title="Bağlantıyı Kaldır"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Yeni Bağlantı Ekleme Formu */}
            {isFieldEditable('links') && (
              <div className="add-link-form">
                <h4>Yeni Bağlantı Ekle</h4>
                {linkError && <div className="link-error">{linkError}</div>}
                <div className="link-form-row">
                  <input
                    type="url"
                    name="url"
                    placeholder="https://..."
                    value={newLink.url}
                    onChange={handleNewLinkChange}
                    className="link-input"
                  />
                  <input
                    type="text"
                    name="title"
                    placeholder="Başlık (opsiyonel)"
                    value={newLink.title}
                    onChange={handleNewLinkChange}
                    className="link-input"
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="link-add-btn"
                  >
                    ➕ Ekle
                  </button>
                </div>
                <textarea
                  name="description"
                  placeholder="Açıklama (opsiyonel)"
                  value={newLink.description}
                  onChange={handleNewLinkChange}
                  className="link-textarea"
                  rows="2"
                />
              </div>
            )}
          </div>
        )}

        {/* Notlar */}
        {isFieldVisible('note') && (
          <div className="form-section full-width">
            <h3>Notlar</h3>
            <div className="form-group">
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                disabled={!isFieldEditable('note')}
                rows="4"
              />
            </div>
          </div>
        )}
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