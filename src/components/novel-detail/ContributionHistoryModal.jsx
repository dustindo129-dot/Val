import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config/config';
import LoadingSpinner from '../LoadingSpinner';
import '../../styles/components/ContributionModal.css';

const ContributionHistoryModal = ({ isOpen, onClose, novelId }) => {
  const [contributions, setContributions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="contribution-history-modal-content">
        <div className="contribution-history-modal-header">
          <h3 className="modal-title">Lịch sử đóng góp</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="contribution-history-modal-body">
          {isLoading ? (
            <LoadingSpinner size="small" text="Đang tải..." />
          ) : contributions.length > 0 ? (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Người đóng góp</th>
                  <th>Ngày</th>
                  <th>Ghi chú</th>
                  <th>Số lúa</th>
                  <th>Kho lúa</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((contribution, index) => (
                  <tr key={contribution._id || index} className={contribution.type === 'system' ? 'system-row' : ''}>
                    <td>
                      <div className={contribution.type === 'system' ? 'system-user' : 'history-user'}>
                        {contribution.type === 'system' ? 'Hệ thống' : (contribution.user?.username || 'Người dùng ẩn danh')}
                      </div>
                    </td>
                    <td>{formatDate(contribution.createdAt || contribution.updatedAt)}</td>
                    <td>{contribution.note || contribution.description || 'Không có ghi chú'}</td>
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
};

export default ContributionHistoryModal; 