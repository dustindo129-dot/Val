import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCog } from '@fortawesome/free-solid-svg-icons';

const ChapterHeader = ({ 
  novel,
  novelId, 
  chapter, 
  isEditing, 
  editedTitle, 
  setEditedTitle, 
  handleEditChapter, 
  handleDeleteChapter,
  isSaving, 
  setIsEditing, 
  formatDate, 
  decreaseFontSize, 
  increaseFontSize, 
  setShowSettingsModal,
  user
}) => {
  return (
    <div className="chapter-header">
      <div className="chapter-navigation-header">
        <div className="title-section">
          {/* Admin actions */}
          {user?.role === 'admin' && (
            <div className="admin-actions">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="edit-chapter-btn">
                  <FontAwesomeIcon icon={faEdit}/> Edit Chapter
                </button>
              ) : (
                <div className="edit-actions">
                  <button
                    onClick={handleEditChapter}
                    className="save-btn"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="cancel-btn"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                </div>
              )}
              <button
                onClick={handleDeleteChapter}
                className="delete-chapter-btn"
                disabled={isSaving}
              >
                Delete Chapter
              </button>
            </div>
          )}
        </div>

        <div className="chapter-info">
          <div className="chapter-header-novel-title">
            <Link to={`/novel/${novelId}`}>{novel.title}</Link>
          </div>

          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="chapter-title-input"
              placeholder="Chapter Title"
            />
          ) : (
            <span className="chapter-title">
              {chapter.title}
            </span>
          )}
        </div>

        <div className="chapter-date-section">
          {formatDate(chapter.createdAt)}
        </div>
      </div>

      {/* Reading options */}
      <div className="reading-options">
        <button onClick={decreaseFontSize} className="font-button">A-</button>
        <button onClick={increaseFontSize} className="font-button">A+</button>
        <button onClick={() => setShowSettingsModal(true)} className="font-button">
          <FontAwesomeIcon icon={faCog}/>
        </button>
      </div>
    </div>
  );
};

export default ChapterHeader; 