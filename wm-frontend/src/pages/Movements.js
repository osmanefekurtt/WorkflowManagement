// src/pages/Movements.js
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ToastContainer from '../components/ToastContainer';
import useToast from '../hooks/useToast';
import api from '../services/api';
import authService from '../services/authService';
import './Movements.css';

const Movements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toasts, showToast, removeToast } = useToast();
  
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    // Staff değilse dashboard'a yönlendir
    if (!currentUser?.is_staff) {
      showToast('Bu sayfayı görüntüleme yetkiniz yok.', 'error');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      return;
    }
    
    fetchMovements();
    
    // Her 10 saniyede bir veriyi yenile
    const interval = setInterval(() => {
      fetchMovements();
    }, 10000); // 10000 ms = 10 saniye
    
    // Component unmount olduğunda interval'i temizle
    return () => clearInterval(interval);
  }, []);

  const fetchMovements = async () => {
    try {
      const response = await api.get('/movements/');
      if (response.data.success) {
        setMovements(response.data.data);
      }
    } catch (error) {
      console.error('Hareketler yüklenirken hata:', error);
      
      // Admin değilse yetki hatası
      if (error.response?.status === 403) {
        showToast('Bu sayfayı görüntüleme yetkiniz yok.', 'error');
      } else {
        showToast('Hareketler yüklenirken bir hata oluştu.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      default:
        return '📝';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'create':
        return 'action-create';
      case 'update':
        return 'action-update';
      case 'delete':
        return 'action-delete';
      default:
        return '';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = (value) => {
    // Object kontrolü - eğer {id, display} formatında ise
    if (value && typeof value === 'object' && value.display) {
      return value.display;
    }
    
    // Null veya undefined kontrolü
    if (value === null || value === undefined) {
      return 'Boş';
    }
    
    // Boolean kontrolü
    if (typeof value === 'boolean') {
      return value ? 'Evet' : 'Hayır';
    }
    
    // Date string kontrolü
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}(T|$)/)) {
      const date = new Date(value);
      if (!isNaN(date)) {
        return date.toLocaleDateString('tr-TR');
      }
    }
    
    // Diğer durumlar için string'e çevir
    return String(value);
  };

  const formatChanges = (changes) => {
    if (!changes || !changes.old || !changes.new) return null;

    const changedFields = [];
    
    // Alan isimlerini Türkçeleştir
    const fieldNames = {
      name: 'İsim',
      category: 'Kategori',
      price: 'Fiyat',
      type: 'Tip',
      sales_channel: 'Satış Kanalı',
      design_start_date: 'Tasarım Başlangıç',
      design_end_date: 'Tasarım Bitiş',
      confirm_date: 'Onay Tarihi',
      printing_location: 'Baskı Lokasyonu',
      printing_confirm: 'Baskı Onayı',
      printing_start_date: 'Baskı Başlangıç',
      printing_end_date: 'Baskı Bitiş',
      mixed: 'Karışık',
      packaging_date: 'Paketleme Tarihi',
      stock_entry: 'Stok Girişi',
      shipping_date: 'Sevkiyat Tarihi',
      link: 'Bağlantı',
      link_title: 'Bağlantı Başlığı',
      note: 'Not'
    };
    
    Object.keys(changes.old).forEach(key => {
      const oldValue = formatValue(changes.old[key]);
      const newValue = formatValue(changes.new[key]);
      
      // Sadece gerçekten değişen alanları göster
      if (oldValue !== newValue) {
        changedFields.push({
          field: fieldNames[key] || key,
          old: oldValue,
          new: newValue
        });
      }
    });

    return changedFields.length > 0 ? changedFields : null;
  };

  // Filtreleme
  const filteredMovements = movements.filter(movement => {
    // Action filter
    if (filter !== 'all' && movement.action !== filter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        movement.description.toLowerCase().includes(search) ||
        movement.user?.username?.toLowerCase().includes(search) ||
        movement.work?.name?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  return (
    <Layout>
      <div className="movements">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        
        {/* Header */}
        <div className="movements-header">
          <h1>İşlem Hareketleri</h1>
          <div className="header-info">
            <span className="info-text">
              Sistemdeki tüm değişikliklerin kaydı
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="movements-filters">
          <div className="filter-group">
            <label>İşlem Tipi:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tümü</option>
              <option value="create">Oluşturma</option>
              <option value="update">Güncelleme</option>
              <option value="delete">Silme</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Ara:</label>
            <input
              type="text"
              placeholder="Kullanıcı, iş adı veya açıklama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-search"
            />
          </div>
        </div>

        {/* Movements List */}
        <div className="movements-container">
          {loading ? (
            <div className="loading">Yükleniyor...</div>
          ) : filteredMovements.length === 0 ? (
            <div className="no-data">
              {searchTerm || filter !== 'all' 
                ? 'Filtrelere uygun hareket bulunamadı.' 
                : 'Henüz kayıtlı hareket bulunmamaktadır.'}
            </div>
          ) : (
            <div className="movements-timeline">
              {filteredMovements.map((movement) => (
                <div key={movement.id} className="movement-item">
                  <div className="movement-icon">
                    <span className={`icon ${getActionColor(movement.action)}`}>
                      {getActionIcon(movement.action)}
                    </span>
                  </div>
                  
                  <div className="movement-content">
                    <div className="movement-header">
                      <h3>{movement.description}</h3>
                      <span className="movement-date">
                        {formatDate(movement.created)}
                      </span>
                    </div>
                    
                    <div className="movement-meta">
                      <span className="meta-item">
                        <strong>Kullanıcı:</strong> {movement.user_display || movement.user_fullname || movement.user?.username || 'Bilinmiyor'}
                      </span>
                      {(movement.work || movement.work_name) && (
                        <span className="meta-item">
                          <strong>İş:</strong> {movement.work_display || movement.work_name || movement.work?.name || '-'}
                        </span>
                      )}
                    </div>
                    
                    {movement.changes && movement.action === 'update' && (
                      <div className="movement-changes">
                        <h4>Değişiklikler:</h4>
                        <div className="changes-list">
                          {formatChanges(movement.changes)?.map((change, index) => (
                            <div key={index} className="change-item">
                              <span className="change-field">{change.field}:</span>
                              <span className="change-old">{change.old}</span>
                              <span className="change-arrow">→</span>
                              <span className="change-new">{change.new}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Movements;