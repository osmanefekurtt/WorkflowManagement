// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import WorkForm from '../components/WorkForm';
import ToastContainer from '../components/ToastContainer';
import { useDashboard, useAuth } from '../hooks';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const {
    // Works
    filteredWorks,
    loading: worksLoading,
    stats,
    fetchWorks,
    createWork,
    updateWork,
    deleteWork,
    selectedWork,
    setSelectedWork,
    
    // Permissions
    canCreateWork,
    canDeleteWork,
    
    // UI
    toasts,
    showToast,
    removeToast,
    toggleModal,
    modals,
    filters,
    setFilter,
    
    // Dropdowns
    fetchDropdowns
  } = useDashboard();
  
  const [isNewWork, setIsNewWork] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workToDelete, setWorkToDelete] = useState(null);

  useEffect(() => {
    // Initial data fetch
    fetchWorks();
    fetchDropdowns();
    
    // Auto refresh every 10 seconds
    const interval = setInterval(() => {
      fetchWorks();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

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
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorks.map((work, index) => (
                    <tr 
                      key={work.id} 
                      className="work-row"
                      onClick={() => handleWorkClick(work)}
                    >
                      <td>{index + 1}</td>
                      <td className="work-name">{work.name || '-'}</td>
                      <td>{work.category_name || work.category_detail?.name || '-'}</td>
                      <td>{work.price ? `${work.price} TL` : '-'}</td>
                      <td>{work.type_name || work.type_detail?.name || '-'}</td>
                      <td>{work.sales_channel_name || work.sales_channel_detail?.name || '-'}</td>
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
              
              {filteredWorks.length === 0 && (
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