// src/components/Modal.js
import React from 'react';
import './css/Modal.css';

const Modal = ({ isOpen, onClose, title, children, className = '', wide = false }) => {
  if (!isOpen) return null;

  // Wide modal için özel style
  const modalStyle = wide ? {
    maxWidth: '1400px',
    width: '95%'
  } : {};

  return (
    <div className="modal-backdrop">
      <div className={`modal-content ${className}`} style={modalStyle}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;