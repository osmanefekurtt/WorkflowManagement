// src/components/Layout.js
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks';
import './css/Layout.css';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>İş Yönetimi</h2>
        </div>
        
        <nav className="sidebar-nav">
          <Link 
            to="/" 
            className={`nav-item ${isActive('/') ? 'active' : ''}`}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </Link>
          
          {/* Hareketler linki sadece staff kullanıcılara görünür */}
          {user?.is_staff && (
            <Link 
              to="/movements" 
              className={`nav-item ${isActive('/movements') ? 'active' : ''}`}
            >
              <span className="nav-icon">📝</span>
              <span className="nav-text">Hareketler</span>
            </Link>
          )}
          
          {/* Ayarlar linki sadece staff kullanıcılara görünür */}
          {user?.is_staff && (
            <Link 
              to="/settings" 
              className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">Ayarlar</span>
            </Link>
          )}
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.username || 'Kullanıcı'}</span>
            {user?.is_staff && (
              <span className="user-role">Yetkili</span>
            )}
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

export default Layout;