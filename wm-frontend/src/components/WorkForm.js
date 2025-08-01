import React, { useState, useEffect } from 'react';
import { usePermissions, useDropdowns, useApp, useOnce } from '../hooks';
import SearchableDropdown from './SearchableDropdown';
import api from '../services/api';
import './css/WorkForm.css';

const WorkForm = ({ work, onSave, onCancel, onDelete, isNew = false }) => {
  const initialFormData = {
    name: '',
    category: '',
    price: '',
    type: '',
    sales_channel: '',
    designer: '',
    design_start_date: '',
    design_end_date: '',
    confirm_date: '',
    printing_location: '',
    printing_confirm: false,
    printing_control: false,
    printing_controller: '',
    printing_start_date: '',
    printing_end_date: '',
    mixed: '',
    packaging_date: '',
    stock_entry: false,
    shipping_date: '',
    links: [],
    note: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [designers, setDesigners] = useState([]);
  const [designersLoading, setDesignersLoading] = useState(false);
  const [controllers, setControllers] = useState([]);
  const [controllersLoading, setControllersLoading] = useState(false);
  const [newLink, setNewLink] = useState({ url: '', title: '', description: '' });
  const [linkError, setLinkError] = useState('');
  const [originalData, setOriginalData] = useState(null);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  const { categories, workTypes, salesChannels, loading: dropdownsLoading } = useDropdowns();
  const { workPermissions, canReadField, canWriteField, hasFieldPermission } = usePermissions();
  const { actions } = useApp();

  // Load permissions once
  useOnce(() => {
    const loadPermissions = async () => {
      setLoadingPermissions(true);
      await actions.loadWorkPermissions();
      setLoadingPermissions(false);
    };
    loadPermissions();
  });

  // Initialize form data from work
  useEffect(() => {
    if (work) {
      const workData = {
        ...work,
        price: work.price || '',
        category: work.category || '',
        type: work.type || '',
        sales_channel: work.sales_channel || '',
        designer: work.designer || '',
        printing_confirm: work.printing_confirm || false,
        printing_control: work.printing_control || false,
        printing_controller: work.printing_controller || '',
        mixed: work.mixed || false,
        stock_entry: work.stock_entry || false,
        links: work.links || [],
      };
      setFormData(workData);
      setOriginalData(workData);
    }
  }, [work]);

  // User search function
  const searchUsers = async (searchTerm, setLoading, setUsers) => {
    setLoading(true);
    try {
      const response = await api.get('/auth/users/search/', {
        params: { q: searchTerm, limit: 50 }
      });
      if (response.data.success) {
        setUsers(response.data.data.users || []);
      }
    } catch (error) {
      console.error('Kullanıcı arama hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchDesigners = searchTerm => searchUsers(searchTerm, setDesignersLoading, setDesigners);
  const searchControllers = searchTerm => searchUsers(searchTerm, setControllersLoading, setControllers);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    
    if (!canWriteField(name)) return;
    
    // Special handling for printing_control
    if (name === 'printing_control' && !checked) {
      setFormData(prev => ({
        ...prev,
        printing_control: false,
        printing_controller: ''
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDropdownChange = (field, value) => {
    if (!canWriteField(field)) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNewLinkChange = e => {
    const { name, value } = e.target;
    setNewLink(prev => ({ ...prev, [name]: value }));
    setLinkError('');
  };

  const validateUrl = url => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddLink = () => {
    if (!canWriteField('links')) return;

    if (!newLink.url) {
      setLinkError('URL alanı zorunludur');
      return;
    }

    if (!validateUrl(newLink.url)) {
      setLinkError('Geçerli bir URL giriniz (https://... şeklinde)');
      return;
    }

    if (formData.links.some(link => link.url === newLink.url)) {
      setLinkError('Bu bağlantı zaten eklenmiş');
      return;
    }

    setFormData(prev => ({
      ...prev,
      links: [...prev.links, { ...newLink }]
    }));

    setNewLink({ url: '', title: '', description: '' });
    setLinkError('');
  };

  const handleRemoveLink = index => {
    if (!canWriteField('links')) return;
    
    setFormData(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    
    const dataToSend = isNew 
      ? getNewWorkData() 
      : getUpdatedWorkData();
    
    if (!isNew && Object.keys(dataToSend).length === 0) return;
    
    onSave(dataToSend);
  };

  const getNewWorkData = () => {
    const data = {};
    Object.keys(formData).forEach(key => {
      if (canWriteField(key)) {
        data[key] = formData[key] === '' ? null : formData[key];
      }
    });
    return data;
  };

  const getUpdatedWorkData = () => {
    const data = {};
    const excludedFields = ['id', 'created', 'updated', 'link', 'link_title', 'printing_control_date'];
    
    Object.keys(formData).forEach(key => {
      if (!excludedFields.includes(key) && canWriteField(key)) {
        if (originalData && JSON.stringify(formData[key]) !== JSON.stringify(originalData[key])) {
          data[key] = formData[key] === '' ? null : formData[key];
        }
      }
    });
    
    return data;
  };

  const handleDelete = () => {
    if (onDelete && work?.id) {
      onDelete(work.id);
    }
  };

  if (loadingPermissions || dropdownsLoading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  const renderFormField = (fieldName, label, renderInput) => {
    if (!hasFieldPermission(fieldName)) return null;
    
    return (
      <div className="form-group" key={fieldName}>
        <label>{label}{fieldName === 'name' && ' *'}</label>
        {renderInput(canWriteField(fieldName))}
      </div>
    );
  };

  const renderInput = (name, type = 'text', additionalProps = {}) => isEditable => (
    <input
      type={type}
      name={name}
      value={formData[name]}
      onChange={handleChange}
      disabled={!isEditable}
      {...additionalProps}
    />
  );

  const renderSelect = (name, options) => isEditable => (
    <select
      name={name}
      value={formData[name]}
      onChange={handleChange}
      disabled={!isEditable}
    >
      <option value="">Seçiniz</option>
      {options.map(opt => (
        <option key={opt.id} value={opt.id}>
          {opt.name}
        </option>
      ))}
    </select>
  );

  const renderCheckbox = (name, label) => isEditable => (
    <div className="form-checkbox">
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={formData[name]}
        onChange={handleChange}
        disabled={!isEditable}
      />
      <label htmlFor={name}>{label}</label>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="work-form">
      <div className="form-grid">
        {/* Temel Bilgiler */}
        <div className="form-section">
          <h3>Temel Bilgiler</h3>
          
          {renderFormField('name', 'İş İsmi', renderInput('name', 'text', { required: canWriteField('name') }))}

          <div className="form-row">
            {renderFormField('category', 'Kategori', renderSelect('category', categories))}
            {renderFormField('price', 'Fiyat', renderInput('price', 'number', { step: '0.01' }))}
          </div>

          <div className="form-row">
            {renderFormField('type', 'Tip', renderSelect('type', workTypes))}
            {renderFormField('sales_channel', 'Satış Kanalı', renderSelect('sales_channel', salesChannels))}
          </div>
        </div>

        {/* Tasarım Bilgileri */}
        <div className="form-section">
          <h3>Tasarım Bilgileri</h3>
          
          {renderFormField('designer', 'Tasarımcı', isEditable => (
            <SearchableDropdown
              value={formData.designer}
              onChange={value => handleDropdownChange('designer', value)}
              onSearch={searchDesigners}
              options={designers}
              placeholder="Tasarımcı seçiniz..."
              searchPlaceholder="İsim veya kullanıcı adı ile ara..."
              disabled={!isEditable}
              loading={designersLoading}
              displayKey="display_name"
              valueKey="id"
              noResultsText="Kullanıcı bulunamadı"
              loadOnOpen={true}
            />
          ))}
          
          <div className="form-row">
            {renderFormField('design_start_date', 'Tasarım Başlangıç', renderInput('design_start_date', 'date'))}
            {renderFormField('design_end_date', 'Tasarım Bitiş', renderInput('design_end_date', 'date'))}
          </div>

          {renderFormField('confirm_date', 'Onay Tarihi', renderInput('confirm_date', 'date'))}
        </div>

        {/* Baskı Bilgileri */}
        <div className="form-section">
          <h3>Baskı Bilgileri</h3>
          
          {renderFormField('printing_location', 'Baskı Lokasyonu', renderInput('printing_location'))}
          
          {hasFieldPermission('printing_confirm') && renderCheckbox('printing_confirm', 'Baskı Onayı')(canWriteField('printing_confirm'))}

          {/* Baskı Kontrolü */}
          {hasFieldPermission('printing_control') && (
            <div className="printing-control-container">
              {renderCheckbox('printing_control', 'Baskı Kontrolü')(canWriteField('printing_control'))}
              
              {formData.printing_control && hasFieldPermission('printing_controller') && (
                <div className="controller-dropdown">
                  <SearchableDropdown
                    value={formData.printing_controller}
                    onChange={value => handleDropdownChange('printing_controller', value)}
                    onSearch={searchControllers}
                    options={controllers}
                    placeholder="Kontrolü yapan kişiyi seçiniz..."
                    searchPlaceholder="İsim veya kullanıcı adı ile ara..."
                    disabled={!canWriteField('printing_controller')}
                    loading={controllersLoading}
                    displayKey="display_name"
                    valueKey="id"
                    noResultsText="Kullanıcı bulunamadı"
                    loadOnOpen={true}
                  />
                  {work?.printing_control_date && (
                    <small className="control-date">
                      Kontrol tarihi: {new Date(work.printing_control_date).toLocaleString('tr-TR')}
                    </small>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="form-row">
            {renderFormField('printing_start_date', 'Baskı Başlangıç', renderInput('printing_start_date', 'date'))}
            {renderFormField('printing_end_date', 'Baskı Bitiş', renderInput('printing_end_date', 'date'))}
          </div>
        </div>

        {/* Paketleme ve Sevkiyat */}
        <div className="form-section">
          <h3>Paketleme ve Sevkiyat</h3>
          
          {renderFormField('mixed', 'Karışık', isEditable => (
            <input
              type="text"
              name="mixed"
              value={formData.mixed}
              onChange={handleChange}
              disabled={!isEditable}
              placeholder="Karışık bilgisi giriniz..."
            />
          ))}

          <div className="form-row">
            {renderFormField('packaging_date', 'Paketleme Tarihi', renderInput('packaging_date', 'date'))}
            {renderFormField('shipping_date', 'Sevkiyat Tarihi', renderInput('shipping_date', 'date'))}
          </div>

          {hasFieldPermission('stock_entry') && renderCheckbox('stock_entry', 'Stok Girişi')(canWriteField('stock_entry'))}
        </div>

        {/* Bağlantılar */}
        {hasFieldPermission('links') && (
          <div className="form-section full-width">
            <h3>Bağlantılar</h3>
            
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
                    {canWriteField('links') && (
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

            {canWriteField('links') && (
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
        {renderFormField('note', 'Notlar', isEditable => (
          <textarea
            name="note"
            value={formData.note}
            onChange={handleChange}
            disabled={!isEditable}
            rows="4"
          />
        ))}
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