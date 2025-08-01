import React, { useEffect } from 'react';
import Layout from '../components/Layout';
import ToastContainer from '../components/ToastContainer';
import { useMovements, useUI, useAuth, useOnce } from '../hooks';
import './css/Movements.css';

const Movements = () => {
  const { user } = useAuth();
  const { 
    filteredMovements, 
    loading, 
    fetchMovements 
  } = useMovements();
  const { 
    toasts, 
    showToast, 
    removeToast,
    filters,
    setFilter 
  } = useUI();

  // Initial load with permission check
  useOnce(() => {
    if (!user?.is_staff) {
      showToast('Bu sayfayı görüntüleme yetkiniz yok.', 'error');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      return;
    }
    
    fetchMovements();
  });

  // Auto refresh
  useEffect(() => {
    if (user?.is_staff) {
      const interval = setInterval(fetchMovements, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Helpers
  const getActionIcon = action => {
    const icons = {
      create: '➕',
      update: '✏️',
      delete: '🗑️'
    };
    return icons[action] || '📝';
  };

  const getActionColor = action => `action-${action}`;

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = value => {
    if (value && typeof value === 'object' && value.display) {
      return value.display;
    }
    
    if (value === null || value === undefined) {
      return 'Boş';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Evet' : 'Hayır';
    }
    
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}(T|$)/)) {
      const date = new Date(value);
      if (!isNaN(date)) {
        return date.toLocaleDateString('tr-TR');
      }
    }
    
    return String(value);
  };

  const formatChanges = changes => {
    if (!changes || !changes.old || !changes.new) return null;

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
      printing_control: 'Baskı Kontrolü',
      printing_controller: 'Kontrolü Yapan',
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
    
    const changedFields = Object.keys(changes.old)
      .filter(key => formatValue(changes.old[key]) !== formatValue(changes.new[key]))
      .map(key => ({
        field: fieldNames[key] || key,
        old: formatValue(changes.old[key]),
        new: formatValue(changes.new[key])
      }));

    return changedFields.length > 0 ? changedFields : null;
  };

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
              value={filters.movementAction} 
              onChange={e => setFilter('movementAction', e.target.value)}
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
              value={filters.searchTerm}
              onChange={e => setFilter('searchTerm', e.target.value)}
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
              {filters.searchTerm || filters.movementAction !== 'all' 
                ? 'Filtrelere uygun hareket bulunamadı.' 
                : 'Henüz kayıtlı hareket bulunmamaktadır.'}
            </div>
          ) : (
            <div className="movements-timeline">
              {filteredMovements.map(movement => (
                <MovementItem 
                  key={movement.id}
                  movement={movement}
                  getActionIcon={getActionIcon}
                  getActionColor={getActionColor}
                  formatDate={formatDate}
                  formatChanges={formatChanges}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

// Movement Item Component
const MovementItem = ({ movement, getActionIcon, getActionColor, formatDate, formatChanges }) => {
  const changes = formatChanges(movement.changes);
  
  return (
    <div className="movement-item">
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
            <strong>Kullanıcı:</strong> {
              movement.user_display || 
              movement.user_fullname || 
              movement.user?.username || 
              'Bilinmiyor'
            }
          </span>
          {(movement.work || movement.work_name) && (
            <span className="meta-item">
              <strong>İş:</strong> {
                movement.work_display || 
                movement.work_name || 
                movement.work?.name || 
                '-'
              }
            </span>
          )}
        </div>
        
        {movement.changes && movement.action === 'update' && changes && (
          <div className="movement-changes">
            <h4>Değişiklikler:</h4>
            <div className="changes-list">
              {changes.map((change, index) => (
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
  );
};

export default Movements;