// src/pages/Dashboard.js
import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import WorkForm from '../components/WorkForm';
import ToastContainer from '../components/ToastContainer';
import { useDashboard, useAuth, useOnce } from '../hooks';
import api from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const {
    // Works
    works,
    loading: worksLoading,
    stats,
    fetchWorks,
    createWork,
    updateWork,
    deleteWork,
    selectedWork,
    setSelectedWork,
    
    // Permissions - Context'ten geliyor
    systemPermissions,
    
    // UI
    toasts,
    showToast,
    removeToast,
    toggleModal,
    modals,
    filters,
    setFilter,
    
    // Dropdowns
    categories,
    workTypes,
    salesChannels,
    fetchDropdowns
  } = useDashboard();
  
  const [isNewWork, setIsNewWork] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workToDelete, setWorkToDelete] = useState(null);
  
  // Local sistem izinleri state'i
  const [localSystemPermissions, setLocalSystemPermissions] = useState({
    work_create: false,
    work_delete: false
  });

  // İlk yükleme - sadece bir kere çalışır
  useOnce(() => {
    fetchWorks();
    fetchDropdowns();
    checkUserPermissions();
  });

  // Sistem izinlerini kontrol et
  const checkUserPermissions = async () => {
    try {
      const response = await api.get('/permissions/my-system-permissions/');
      console.log('System permissions response:', response.data);
      
      if (response.data.success) {
        setLocalSystemPermissions({
          work_create: response.data.data.work_create || false,
          work_delete: response.data.data.work_delete || false
        });
      }
    } catch (error) {
      console.error('Sistem izinleri alınırken hata:', error);
    }
  };

  // Auto refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWorks();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Filtrelenmiş işler
  const filteredWorks = useMemo(() => {
    return works.filter(work => {
      if (filters.workStatus === 'active') {
        return work.status_code !== 'completed';
      } else {
        return work.status_code === 'completed';
      }
    });
  }, [works, filters.workStatus]);

  // ID'lerden isimleri bulmak için helper fonksiyonlar
  const getCategoryName = (categoryId) => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : '-';
  };

  const getTypeName = (typeId) => {
    if (!typeId) return '-';
    const type = workTypes.find(t => t.id === typeId);
    return type ? type.name : '-';
  };

  const getSalesChannelName = (salesChannelId) => {
    if (!salesChannelId) return '-';
    const channel = salesChannels.find(sc => sc.id === salesChannelId);
    return channel ? channel.name : '-';
  };

  // Works listesini dropdown isimleriyle zenginleştir
  const enrichedWorks = useMemo(() => {
    return filteredWorks.map(work => ({
      ...work,
      // Eğer detail alanları yoksa, ID'lerden isimleri bul
      category_name: work.category_name || work.category_detail?.name || getCategoryName(work.category),
      type_name: work.type_name || work.type_detail?.name || getTypeName(work.type),
      sales_channel_name: work.sales_channel_name || work.sales_channel_detail?.name || getSalesChannelName(work.sales_channel)
    }));
  }, [filteredWorks, categories, workTypes, salesChannels]);

  // İzin kontrolleri
  const canCreateWork = user?.is_superuser || localSystemPermissions.work_create || systemPermissions?.work_create;
  const canDeleteWork = user?.is_superuser || localSystemPermissions.work_delete || systemPermissions?.work_delete;

  const handleWorkClick = (work) => {
    setSelectedWork(work);
    setIsNewWork(false);
    toggleModal('workModal', true);
  };

  const handleNewWork = () => {
    setSelectedWork(null);
    setIsNewWork(true);
    toggleModal('workModal', true);
  };

  const handleCloseModal = () => {
    toggleModal('workModal', false);
    setSelectedWork(null);
    setIsNewWork(false);
  };

  const handleSaveWork = async (workData) => {
    setSaving(true);
    try {
      let result;
      
      if (isNewWork) {
        result = await createWork(workData);
      } else {
        result = await updateWork(selectedWork.id, workData);
      }
      
      if (result.success) {
        handleCloseModal();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWork = (workId) => {
    setWorkToDelete(workId);
    toggleModal('confirmModal', true);
  };

  const confirmDelete = async () => {
    if (!workToDelete) return;
    
    const result = await deleteWork(workToDelete);
    if (result.success) {
      handleCloseModal();
    }
    
    toggleModal('confirmModal', false);
    setWorkToDelete(null);
  };

  // Debug için
  console.log('Works:', works);
  console.log('Filtered Works:', filteredWorks);
  console.log('Enriched Works:', enrichedWorks);
  console.log('Can Create:', canCreateWork);
  console.log('Can Delete:', canDeleteWork);

  return (
    <Layout>
      <div className="dashboard">
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        
        {/* Header */}
        <div className="dashboard-header">
          <h1>İş Yönetimi Paneli</h1>
          {canCreateWork && (
            <button className="add-work-btn" onClick={handleNewWork}>
              ➕ Yeni İş Ekle
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon blue">📋</div>
            <div className="stat-content">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Toplam İş</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon orange">⏳</div>
            <div className="stat-content">
              <div className="stat-number">{stats.inProgress}</div>
              <div className="stat-label">Devam Eden</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div className="stat-content">
              <div className="stat-number">{stats.completed}</div>
              <div className="stat-label">Tamamlanan</div>
            </div>
          </div>
        </div>

        {/* Works Table */}
        <div className="works-section">
          <div className="works-header">
            <h2>İş Listesi</h2>
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filters.workStatus === 'active' ? 'active' : ''}`}
                onClick={() => setFilter('workStatus', 'active')}
              >
                Devam Eden ({stats.inProgress})
              </button>
              <button 
                className={`filter-btn ${filters.workStatus === 'completed' ? 'active' : ''}`}
                onClick={() => setFilter('workStatus', 'completed')}
              >
                Tamamlanan ({stats.completed})
              </button>
            </div>
          </div>
          
          {worksLoading ? (
            <div className="loading">Yükleniyor...</div>
          ) : (
            <div className="works-table-container">
              <table className="works-table">
                <thead>
                  <tr>
                    <th>Sıra</th>
                    <th>İş İsmi</th>
                    <th>Kategori</th>
                    <th>Fiyat</th>
                    <th>Tip</th>
                    <th>Satış Kanalı</th>
                    <th>Bağlantılar</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedWorks.map((work, index) => (
                    <tr 
                      key={work.id} 
                      className="work-row"
                      onClick={() => handleWorkClick(work)}
                    >
                      <td>{index + 1}</td>
                      <td className="work-name">{work.name || '-'}</td>
                      <td>{work.category_name || '-'}</td>
                      <td>{work.price ? `${work.price} TL` : '-'}</td>
                      <td>{work.type_name || '-'}</td>
                      <td>{work.sales_channel_name || '-'}</td>
                      <td>
                        <span className="link-count">
                          {work.links && work.links.length > 0 ? (
                            <>🔗 {work.links.length}</>
                          ) : (
                            '-'
                          )}
                        </span>
                      </td>
                      <td>
                        <span 
                          className="status-badge" 
                          style={{ backgroundColor: work.status_color || '#6c757d' }}
                        >
                          {work.status_text || 'Beklemede'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {enrichedWorks.length === 0 && (
                <div className="no-data">
                  {filters.workStatus === 'active' 
                    ? 'Devam eden iş bulunmamaktadır.' 
                    : 'Tamamlanmış iş bulunmamaktadır.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Work Modal */}
        <Modal
          isOpen={modals.workModal}
          onClose={handleCloseModal}
          title={isNewWork ? 'Yeni İş Ekle' : 'İş Detayları'}
        >
          <WorkForm
            work={selectedWork}
            onSave={handleSaveWork}
            onCancel={handleCloseModal}
            onDelete={canDeleteWork ? handleDeleteWork : null}
            isNew={isNewWork}
          />
        </Modal>

        {/* Delete Confirm Modal */}
        <ConfirmModal
          isOpen={modals.confirmModal}
          onClose={() => {
            toggleModal('confirmModal', false);
            setWorkToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="İşi Sil"
          message="Bu işi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
          confirmText="Sil"
          cancelText="İptal"
        />
      </div>
    </Layout>
  );
};

export default Dashboard;