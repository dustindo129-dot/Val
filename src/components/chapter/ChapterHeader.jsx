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
  user,
  children
}) => {
  return (
    <header className="chapter-header">
      <div className="chapter-breadcrumb">
        <a href="/" className="breadcrumb-item">Home</a>
        <span className="breadcrumb-separator">&gt;</span>
        <a href={`/novel/${novelId}`} className="breadcrumb-item">{novel?.title}</a>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-current">{chapter?.title}</span>
      </div>
      
      <div className="header-meta">
        <div className="chapter-meta">
          {/* Removing chapter view date from here */}
        </div>
        
        <div>
          <div className="reader-controls">
            <button
              className="font-size-btn decrease"
              onClick={decreaseFontSize}
              title="Decrease font size"
            >
              A-
            </button>
            <button
              className="font-size-btn increase"
              onClick={increaseFontSize}
              title="Increase font size"
            >
              A+
            </button>
            <button
              className="settings-btn"
              onClick={() => setShowSettingsModal(true)}
              title="Reading settings"
            >
              ⚙️
            </button>
          </div>
          {children}
        </div>
      </div>
    </header>
  );
};

export default ChapterHeader; 