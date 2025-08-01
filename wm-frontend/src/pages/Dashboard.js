import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import WorkForm from '../components/WorkForm';
import ToastContainer from '../components/ToastContainer';
import { useDashboard, useAuth, useOnce } from '../hooks';
import api from '../services/api';
import './css/Dashboard.css';

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
    
    // Permissions
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
  const [localSystemPermissions, setLocalSystemPermissions] = useState({
    work_create: false,
    work_delete: false
  });

  // Initial load
  useOnce(() => {
    fetchWorks();
    fetchDropdowns();
    checkUserPermissions();
  });

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(fetchWorks, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkUserPermissions = async () => {
    try {
      const response = await api.get('/permissions/my-system-permissions/');
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

  // Filtered and enriched works
  const { filteredWorks, enrichedWorks } = useMemo(() => {
    const filtered = works.filter(work => 
      filters.workStatus === 'active' 
        ? work.status_code !== 'completed' 
        : work.status_code === 'completed'
    );

    const enriched = filtered.map(work => ({
      ...work,
      category_name: work.category_name || work.category_detail?.name || getDropdownName(categories, work.category),
      type_name: work.type_name || work.type_detail?.name || getDropdownName(workTypes, work.type),
      sales_channel_name: work.sales_channel_name || work.sales_channel_detail?.name || getDropdownName(salesChannels, work.sales_channel)
    }));

    return { filteredWorks: filtered, enrichedWorks: enriched };
  }, [works, filters.workStatus, categories, workTypes, salesChannels]);

  // Helpers
  const getDropdownName = (items, id) => {
    if (!id) return '-';
    const item = items.find(i => i.id === id);
    return item ? item.name : '-';
  };

  const canCreateWork = user?.is_superuser || localSystemPermissions.work_create || systemPermissions?.work_create;
  const canDeleteWork = user?.is_superuser || localSystemPermissions.work_delete || systemPermissions?.work_delete;

  // Handlers
  const handleWorkClick = work => {
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

  const handleSaveWork = async workData => {
    setSaving(true);
    try {
      const result = isNewWork 
        ? await createWork(workData)
        : await updateWork(selectedWork.id, workData);
      
      if (result.success) {
        handleCloseModal();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWork = workId => {
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
          <StatCard icon="📋" label="Toplam İş" value={stats.total} color="blue" />
          <StatCard icon="⏳" label="Devam Eden" value={stats.inProgress} color="orange" />
          <StatCard icon="✅" label="Tamamlanan" value={stats.completed} color="green" />
        </div>

        {/* Works Table */}
        <div className="works-section">
          <div className="works-header">
            <h2>İş Listesi</h2>
            <div className="filter-buttons">
              <FilterButton 
                active={filters.workStatus === 'active'}
                onClick={() => setFilter('workStatus', 'active')}
                label={`Devam Eden (${stats.inProgress})`}
              />
              <FilterButton 
                active={filters.workStatus === 'completed'}
                onClick={() => setFilter('workStatus', 'completed')}
                label={`Tamamlanan (${stats.completed})`}
              />
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
                    <WorkRow 
                      key={work.id}
                      work={work}
                      index={index}
                      onClick={() => handleWorkClick(work)}
                    />
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

        {/* Confirm Modal */}
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

// Sub-components
const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card">
    <div className={`stat-icon ${color}`}>{icon}</div>
    <div className="stat-content">
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

const FilterButton = ({ active, onClick, label }) => (
  <button 
    className={`filter-btn ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    {label}
  </button>
);

const WorkRow = ({ work, index, onClick }) => (
  <tr className="work-row" onClick={onClick}>
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
        ) : '-'}
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
);

export default Dashboard;