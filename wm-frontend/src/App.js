// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { useAuth } from './hooks';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import Settings from './pages/Settings';
import './App.css';

// Korumalı route komponenti - Context kullanacak şekilde güncellendi
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Staff kontrolü yapan route komponenti - Context kullanacak şekilde güncellendi
const StaffRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!user?.is_staff) {
    return <Navigate to="/" />;
  }
  
  return children;
};

// Login route - giriş yapmış kullanıcılar ana sayfaya yönlendirilir
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/" />;
};

// Router Component - Provider dışında olmalı
const AppRouter = () => {
  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/movements" 
        element={
          <StaffRoute>
            <Movements />
          </StaffRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <StaffRoute>
            <Settings />
          </StaffRoute>
        } 
      />
      {/* 404 - Mevcut olmayan sayfalar için ana sayfaya yönlendir */}
      <Route 
        path="*" 
        element={<Navigate to="/" replace />} 
      />
    </Routes>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="App">
          <AppRouter />
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;