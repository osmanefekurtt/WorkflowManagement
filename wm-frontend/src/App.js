// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import Settings from './pages/Settings';
import authService from './services/authService';
import './App.css';

// Korumalı route komponenti
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Staff kontrolü yapan route komponenti
const StaffRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();
  
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
  const isAuthenticated = authService.isAuthenticated();
  return !isAuthenticated ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <div className="App">
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
      </div>
    </Router>
  );
}

export default App;