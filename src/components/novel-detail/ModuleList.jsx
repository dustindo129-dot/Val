import React, { memo, useCallback, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ModuleChapters from './ModuleChapters';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import '../../styles/components/ModuleList.css';
import api from '../../services/api';

/**
 * DeleteModuleConfirmationModal Component
 * 
 * Modal component that requires typing the module title to confirm deletion.
 */
const DeleteModuleConfirmationModal = ({ module, onConfirm, onCancel }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isMatch, setIsMatch] = useState(false);
  
  useEffect(() => {
    const moduleTitle = module.title || 'Tập không có tên';
    setIsMatch(confirmText === moduleTitle);
  }, [confirmText, module.title]);
  
  return (
    <div className="delete-confirmation-modal-overlay">
      <div className="delete-confirmation-modal">
        <h3>Xác nhận xóa tập</h3>
        <p>Hành động này không thể hoàn tác. Để xác nhận, hãy nhập chính xác tiêu đề tập: <strong className="non-selectable-text">{module.title || 'Tập không có tên'}</strong></p>
        
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Nhập tiêu đề tập"
          className="confirmation-input"
        />
        
        <div className="confirmation-actions">
          <button 
            onClick={() => onConfirm(module._id)} 
            disabled={!isMatch}
            className={`confirm-delete-btn ${isMatch ? 'enabled' : 'disabled'}`}
          >
            Xóa tập
          </button>
          <button onClick={onCancel} className="cancel-delete-btn">
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  );
};

const ModuleList = memo(({
  modules,
  novelId,
  user,
  handleModuleReorder,
  handleModuleDelete,
  handleEditModule,
  handleChapterReorder,
  handleChapterDelete
}) => {
  const [isReordering, setIsReordering] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  // Add state for delete confirmation modal
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState({
    isOpen: false,
    moduleToDelete: null
  });

  // Check if user can edit
  const canEdit = user && (user.role === 'admin' || user.role === 'moderator');
  // Check if user can delete
  const canDelete = user && user.role === 'admin';
  // Check if user can access paid content
  const canAccessPaidContent = user && (user.role === 'admin' || user.role === 'moderator');
  
  // Fetch pending requests count for this novel
  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (novelId) {
        const count = await api.getPendingNovelRequests(novelId);
        setPendingRequestsCount(count);
      }
    };
    
    fetchPendingRequests();
  }, [novelId]);

  const handleReorderClick = useCallback(async (moduleId, direction) => {
    if (isReordering) return; // Prevent concurrent reordering
    
    try {
      setIsReordering(true);
      await handleModuleReorder(moduleId, direction);
    } finally {
      // Add a small delay before allowing next reorder
      setTimeout(() => {
        setIsReordering(false);
      }, 500);
    }
  }, [handleModuleReorder, isReordering]);

  /**
   * Opens the delete confirmation modal
   * @param {Object} module - Module to be deleted
   */
  const openDeleteConfirmation = (module) => {
    setDeleteConfirmationModal({
      isOpen: true,
      moduleToDelete: module
    });
  };

  /**
   * Closes the delete confirmation modal
   */
  const closeDeleteConfirmation = () => {
    setDeleteConfirmationModal({
      isOpen: false,
      moduleToDelete: null
    });
  };

  /**
   * Initiates the module deletion process
   * @param {Object} module - Module to delete
   */
  const initiateModuleDelete = (module) => {
    openDeleteConfirmation(module);
  };

  /**
   * Performs the actual module deletion after confirmation
   * @param {string} moduleId - ID of the module to delete
   */
  const confirmModuleDelete = (moduleId) => {
    handleModuleDelete(moduleId);
    closeDeleteConfirmation();
  };

  return (
    <div className="modules-list">
      {/* Delete Confirmation Modal */}
      {deleteConfirmationModal.isOpen && (
        <DeleteModuleConfirmationModal 
          module={deleteConfirmationModal.moduleToDelete}
          onConfirm={confirmModuleDelete}
          onCancel={closeDeleteConfirmation}
        />
      )}

      {modules.map((module, moduleIndex) => (
        <div 
          key={module._id} 
          className={`module-container ${isReordering ? 'reordering' : ''} ${module.mode ? `module-mode-${module.mode}` : ''}`}
        >
          <div className="module-content">
            <div className="module-cover">
              <img 
                src={module.illustration || "https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png"} 
                alt={`${module.title} cover`}
                className="module-cover-image"
              />
              {canEdit && (
                <div className="module-reorder-buttons">
                  <div className="reorder-buttons-row">
                    <button
                      className={`reorder-btn ${moduleIndex === 0 ? 'disabled' : ''}`}
                      onClick={() => handleReorderClick(module._id, 'up')}
                      disabled={moduleIndex === 0 || isReordering}
                      title="Move module up"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                        <path d="M18 15l-6-6-6 6"/>
                      </svg>
                    </button>
                    <button
                      className={`reorder-btn ${moduleIndex === modules.length - 1 ? 'disabled' : ''}`}
                      onClick={() => handleReorderClick(module._id, 'down')}
                      disabled={moduleIndex === modules.length - 1 || isReordering}
                      title="Move module down"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        width="16" 
                        height="16"
                      >
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                  {module.mode === 'paid' && (
                    <div className="module-mode-tag">
                      <span className="mode-tag mode-paid">TRẢ PHÍ</span>
                      {module.moduleBalance > 0 && (
                        <div className="module-balance-row">
                          <span className="module-balance">{module.moduleBalance}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="module-details">
              <div className="module-header">
                <div className="module-title-area">
                  <h3 className="module-title">
                    {module.title || 'Tập không có tên'}
                  </h3>
                </div>
                
                {canEdit && (
                  <div className="module-actions">
                    <button
                      className="edit-module-btn"
                      onClick={() => handleEditModule(module)}
                      title="Sửa tập"
                    >
                      Sửa
                    </button>
                    {canDelete && (
                      <button
                        className="delete-module-btn"
                        onClick={() => initiateModuleDelete(module)}
                        title="Xóa tập"
                      >
                        Xóa
                      </button>
                    )}
                    <Link
                      to={`/novel/${novelId}/module/${module._id}/add-chapter`}
                      className="add-chapter-btn"
                      title="Thêm chương vào tập"
                    >
                      Thêm chương
                    </Link>
                  </div>
                )}
              </div>

              {/* Render module content with locking layer for paid modules */}
              <div className={`module-content-wrapper ${module.mode === 'paid' && !canAccessPaidContent ? 'locked-content' : ''}`}>
                {module.mode === 'paid' && !canAccessPaidContent && (
                  <div className="locked-layer">
                    <div className="locked-content-message">
                      <FontAwesomeIcon icon={faLock} className="lock-icon" />
                      <p>Cần {module.moduleBalance} 🌾 để mở khóa. Vui lòng đến bảng yêu cầu!</p>
                      <p>{pendingRequestsCount} yêu cầu đang chờ</p>
                      <Link to="/market" className="go-to-market-btn">Đến bảng yêu cầu</Link>
                    </div>
                  </div>
                )}

                <ModuleChapters
                  chapters={module.chapters || []}
                  novelId={novelId}
                  moduleId={module._id}
                  user={user}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  handleChapterReorder={handleChapterReorder}
                  handleChapterDelete={handleChapterDelete}
                  isPaidModule={module.mode === 'paid'}
                  canAccessPaidContent={canAccessPaidContent}
                  pendingRequestsCount={pendingRequestsCount}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

ModuleList.displayName = 'ModuleList';

export default ModuleList; 