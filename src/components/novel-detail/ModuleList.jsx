import React, { memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import ModuleChapters from './ModuleChapters';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';

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

  // Check if user can edit
  const canEdit = user && (user.role === 'admin' || user.role === 'moderator');
  // Check if user can delete
  const canDelete = user && user.role === 'admin';

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

  return (
    <div className="modules-list">
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
                      <span className="mode-tag mode-paid">PAID</span>
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
                    {module.title || 'Untitled Module'}
                  </h3>
                </div>
                
                {canEdit && (
                  <div className="module-actions">
                    <button
                      className="edit-module-btn"
                      onClick={() => handleEditModule(module)}
                      title="Edit module"
                    >
                      Edit
                    </button>
                    {canDelete && (
                      <button
                        className="delete-module-btn"
                        onClick={() => handleModuleDelete(module._id)}
                        title="Delete module"
                      >
                        Delete
                      </button>
                    )}
                    <Link
                      to={`/novel/${novelId}/module/${module._id}/add-chapter`}
                      className="add-chapter-btn"
                      title="Add chapter to this module"
                    >
                      Add Chapter
                    </Link>
                  </div>
                )}
              </div>

              <ModuleChapters
                chapters={module.chapters || []}
                novelId={novelId}
                moduleId={module._id}
                user={user}
                canEdit={canEdit}
                canDelete={canDelete}
                handleChapterReorder={handleChapterReorder}
                handleChapterDelete={handleChapterDelete}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

// Update the styles
const styles = `
  /* Module mode styling */
  .module-reorder-buttons {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  
  .reorder-buttons-row {
    display: flex;
    gap: 4px;
  }
  
  .module-mode-tag {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  
  .module-balance-row {
    display: flex;
    justify-content: center;
  }
  
  .module-container.module-mode-paid {
    border-left: 3px solid #3498db;
  }
  
  .module-balance {
    font-size: 11px;
    background: #2980b9;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    min-width: 24px;
    text-align: center;
    letter-spacing: 0.5px;
  }

  .mode-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
  }

  .mode-paid {
    background-color: #3498db;
    color: white;
  }
`;

// Add the styles to the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

ModuleList.displayName = 'ModuleList';

export default ModuleList; 