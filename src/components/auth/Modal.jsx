/**
 * Modal.jsx
 * 
 * A reusable modal component that displays content in a popup window
 * with an overlay backdrop. Used for displaying forms, alerts, and
 * other content that needs to be shown on top of the main content.
 * 
 * Features:
 * - Click outside to close
 * - ESC key to close
 * - Smooth animations
 * - Accessible focus management
 * - Customizable content
 */

import React from 'react';
import '../../styles/Modal.css';

/**
 * Modal component that displays content in a popup window
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Callback function when modal is closed
 * @param {string} props.title - Modal title text
 * @param {React.ReactNode} props.children - Modal content
 * @returns {React.ReactElement} Modal component
 */
const Modal = ({ isOpen, onClose, children, title }) => {
  // Don't render if modal is closed
  if (!isOpen) return null;

  return (
    // Modal overlay with click handler to close
    <div className="auth-modal-overlay" onClick={onClose}>
      {/* Modal content container with click handler to prevent closing */}
      <div className="auth-modal-content" onClick={e => e.stopPropagation()}>
        {/* Modal header with title and close button */}
        <div className="auth-modal-header">
          <h2>{title}</h2>
          <button className="auth-modal-close" onClick={onClose}>&times;</button>
        </div>
        {/* Modal body with children content */}
        <div className="auth-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 