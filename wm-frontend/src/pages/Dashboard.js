// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import WorkForm from '../components/WorkForm';
import ToastContainer from '../components/ToastContainer';
import useToast from '../hooks/useToast';
import api from '../services/api';
import authService from '../services/authService';
import './Dashboard.css';

const Dashboard = () => {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewWork, setIsNewWork] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('active'); // 'active' veya 'completed'
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0
  });
  
  // Permission state'i
  const [systemPermissions, setSystemPermissions] = useState({
    work_create: false,
    work_delete: false
  });
  
  // Confirm modal state'leri
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [workToDelete, setWorkToDelete] = useState(null);
  
  const { toasts, showToast, removeToast } = useToast();
  const user = authService.getCurrentUser();

  useEffect(() => {
    fetchWorks();
    checkUserPermissions();
    
    // Her 10 saniyede bir veriyi yenile
    const interval = setInterval(() => {
      fetchWorks();
    }, 10000); // 10000 ms = 10 saniye
    
    // Component unmount olduğunda interval'i temizle
    return () => clearInterval(interval);
  }, []);

  const checkUserPermissions = async () => {
    try {
      const response = await api.get('/permissions/my-system-permissions/');
      console.log('System permissions response:', response.data); // Debug için
      
      if (response.data.success) {
        setSystemPermissions({
          work_create: response.data.data.work_create || false,
          work_delete: response.data.data.work_delete || false
        });
      }
    } catch (error) {
      console.error('Sistem izinleri alınırken hata:', error);
    }
  };

  const fetchWorks = async () => {
    try {
      const response = await api.get('/workflows/');
      if (response.data.success) {
        const worksData = response.data.data;
        setWorks(worksData);
        
        // İstatistikleri hesapla
        setStats({
          total: worksData.length,
          inProgress: worksData.filter(w => w.status_code !== 'completed').length,
          completed: worksData.filter(w => w.status_code === 'completed').length
        });
      }
    } catch (error) {
      console.error('İşler yüklenirken hata:', error);
      // Otomatik yenileme sırasında toast gösterme
      if (loading) {
        showToast('İşler yüklenirken bir hata oluştu', 'error');
      }
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  };

  const handleWorkClick = (work) => {
    setSelectedWork(work);
    setIsNewWork(false);
    setIsModalOpen(true);
  };

  const handleNewWork = () => {
    setSelectedWork(null);
    setIsNewWork(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedWork(null);
    setIsNewWork(false);
  };

  const handleSaveWork = async (workData) => {
    setSaving(true);
    try {
      let response;
      
      if (isNewWork) {
        // Yeni iş oluştur
        response = await api.post('/workflows/', workData);
      } else {
        // Mevcut işi güncelle
        response = await api.patch(`/workflows/${selectedWork.id}/`, workData);
      }
      
      if (response.data.success) {
        // Listeyi yenile
        await fetchWorks();
        handleCloseModal();
        
        // Başarı bildirimi
        showToast(
          isNewWork ? 'İş başarıyla oluşturuldu!' : 'İş başarıyla güncellendi!',
          'success',
          2000
        );
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      
      // Hata bildirimi
      let errorMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';
      
      if (error.response?.data?.errors?.field_errors) {
        // İlk field hatasını göster
        const firstFieldError = Object.values(error.response.data.errors.field_errors)[0];
        if (Array.isArray(firstFieldError) && firstFieldError.length > 0) {
          errorMessage = firstFieldError[0];
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showToast(errorMessage, 'error', 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWork = (workId) => {
    setWorkToDelete(workId);
    setConfirmModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!workToDelete) return;
    
    try {
      const response = await api.delete(`/workflows/${workToDelete}/`);
      
      // Silme başarılı
      await fetchWorks();
      handleCloseModal();
      showToast('İş başarıyla silindi!', 'success', 2000);
    } catch (error) {
      console.error('Silme hatası:', error);
      let errorMessage = 'Silme işlemi başarısız oldu.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showToast(errorMessage, 'error', 4000);
    } finally {
      setConfirmModalOpen(false);
      setWorkToDelete(null);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Tamamlandı':
        return 'status-completed';
      case 'Devam Eden':
        return 'status-progress';
      case 'İptal':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  };

  // Filtrelenmiş işler
  const filteredWorks = works.filter(work => {
    if (filterStatus === 'active') {
      return work.status_code !== 'completed';
    } else {
      return work.status_code === 'completed';
    }
  });

  // Debug için
  console.log('User:', user);
  console.log('System Permissions:', systemPermissions);
  console.log('Can show create button:', user?.is_superuser || systemPermissions.work_create);

  return (
    <Layout>
      <div className="dashboard">
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        
        {/* Header */}
        <div className="dashboard-header">
          <h1>İş Yönetimi Paneli</h1>
          {(user?.is_superuser || systemPermissions.work_create) && (
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
                className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
                onClick={() => setFilterStatus('active')}
              >
                Devam Eden ({stats.inProgress})
              </button>
              <button 
                className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
                onClick={() => setFilterStatus('completed')}
              >
                Tamamlanan ({stats.completed})
              </button>
            </div>
          </div>
          
          {loading ? (
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
                  {filterStatus === 'active' 
                    ? 'Devam eden iş bulunmamaktadır.' 
                    : 'Tamamlanmış iş bulunmamaktadır.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Work Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={isNewWork ? 'Yeni İş Ekle' : 'İş Detayları'}
        >
          <WorkForm
            work={selectedWork}
            onSave={handleSaveWork}
            onCancel={handleCloseModal}
            onDelete={systemPermissions.work_delete ? handleDeleteWork : null}
            isNew={isNewWork}
          />
        </Modal>

        {/* Delete Confirm Modal */}
        <ConfirmModal
          isOpen={confirmModalOpen}
          onClose={() => {
            setConfirmModalOpen(false);
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