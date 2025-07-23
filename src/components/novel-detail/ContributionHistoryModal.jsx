import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import config from '../../config/config';
import LoadingSpinner from '../LoadingSpinner';
import '../../styles/components/ContributionModal.css';

const ContributionHistoryModal = ({ isOpen, onClose, novelId }) => {
  const [contributions, setContributions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create portal container
  const [portalContainer, setPortalContainer] = useState(null);

  useEffect(() => {
    // Create or get portal container
    let container = document.getElementById('vt-contribution-history-modal-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'vt-contribution-history-modal-portal';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.zIndex = '10000';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    // Cleanup function
    return () => {
      if (container && container.parentNode && !isOpen) {
        // Only remove if no other modals are using it
        const existingModals = container.children.length;
        if (existingModals === 0) {
          container.parentNode.removeChild(container);
        }
      }
    };
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('vt-modal-open');
      // Enable pointer events for the portal when modal is open
      if (portalContainer) {
        portalContainer.style.pointerEvents = 'auto';
      }
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('vt-modal-open');
      // Disable pointer events when modal is closed
      if (portalContainer) {
        portalContainer.style.pointerEvents = 'none';
      }
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('vt-modal-open');
      if (portalContainer) {
        portalContainer.style.pointerEvents = 'none';
      }
    };
  }, [isOpen, portalContainer]);

  // Fetch contribution history when modal opens
  useEffect(() => {
    const fetchContributions = async () => {
      if (isOpen && novelId) {
        setIsLoading(true);
        try {
          const response = await axios.get(
              `${config.backendUrl}/api/novels/${novelId}/contribution-history`
          );
          setContributions(response.data.contributions || []);
        } catch (error) {
          console.error('Failed to fetch contribution history:', error);
          setContributions([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchContributions();
  }, [isOpen, novelId]);

  // Format date to Vietnamese format (DD/MM/YYYY)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format contribution note with gift indicator for backward compatibility
  const formatContributionNote = (contribution) => {
    let note = contribution.note && contribution.note.trim()
        ? contribution.note
        : contribution.description || 'Không có ghi chú';
    
    // Add "(Quà tặng)" for gift contributions if "Quà tặng" is not already present
    // This handles backward compatibility for old gift records
    if (contribution.type === 'gift' && !note.includes('Quà tặng')) {
      note = `${note} (Quà tặng)`;
    }
    
    return note;
  };

  // Handle overlay click to close modal
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !portalContainer) return null;

  // Render modal content with portal
  const modalContent = (
      <div className="vt-contribution-history-modal-overlay" onClick={handleOverlayClick}>
        <div className="vt-contribution-history-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="contribution-history-modal-header">
            <h3 className="modal-title">Lịch sử đóng góp</h3>
            <button className="close-modal" onClick={onClose}>&times;</button>
          </div>
          <div className="vt-contribution-history-modal-body">
            {isLoading ? (
                <LoadingSpinner size="small" text="Đang tải..." />
            ) : contributions.length > 0 ? (
                <table className="history-table">
                  <thead>
                  <tr>
                    <th>Người đóng góp</th>
                    <th>Ghi chú</th>
                    <th>Số lúa</th>
                    <th>Kho lúa</th>
                  </tr>
                  </thead>
                  <tbody>
                  {contributions.map((contribution, index) => (
                      <tr key={contribution._id || index} className={contribution.type === 'system' ? 'system-row' : ''}>
                        <td>
                          <div className="contributor-info">
                            <div className={contribution.type === 'system' ? 'system-user' : 'history-user'}>
                              {contribution.type === 'system' ? (
                                  <>
                                    <i className="fas fa-cog system-icon"></i>
                                    Hệ thống
                                  </>
                              ) : (
                                  contribution.user?.displayName || 'Người dùng ẩn danh'
                              )}
                            </div>
                            <div className="contribution-date">
                              {formatDate(contribution.createdAt || contribution.updatedAt)}
                            </div>
                          </div>
                        </td>
                        <td className={`contribution-note ${contribution.type === 'system' ? 'system-note' : ''}`}>
                          {formatContributionNote(contribution)}
                        </td>
                        <td className={`history-amount ${contribution.amount >= 0 ? 'positive' : 'negative'}`}>
                          {contribution.amount >= 0 ? '+' : ''}{contribution.amount.toLocaleString()}
                        </td>
                        <td className="history-balance">{contribution.budgetAfter?.toLocaleString() || 0}</td>
                      </tr>
                  ))}
                  </tbody>
                </table>
            ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <p>Chưa có lịch sử đóng góp nào</p>
                </div>
            )}
          </div>
        </div>
      </div>
  );

  // Use createPortal to render outside the component tree
  return createPortal(modalContent, portalContainer);
};

export default ContributionHistoryModal;