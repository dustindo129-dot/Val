import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faSave, faHome, faTrash, faTimes } from '@fortawesome/free-solid-svg-icons';
import { createUniqueSlug, generateNovelUrl } from '../../utils/slugUtils';
import LoadingSpinner from '../LoadingSpinner';

const ChapterHeader = ({
  novel,
  novelId,
  chapter,
  moduleData,
  isEditing,
  editedTitle,
  setEditedTitle,
  handleEditChapter,
  handleDeleteChapter,
  isSaving,
  setIsEditing,
  formatDate,
  user,
  canEdit,
  canDelete
}) => {
  const novelSlug = createUniqueSlug(novel?.title, novelId);
  const localizedNovelUrl = generateNovelUrl(novel || { _id: novelId, title: '' });
  
  return (
    <div className="header-nav-container">
      <div className="breadcrumb-nav">
        <div className="breadcrumb-info">
          <div className="breadcrumb-text">
            <Link to="/"><FontAwesomeIcon icon={faHome}/> Trang chủ</Link>
            <span className="breadcrumb-separator">&gt;</span>
            <Link to={localizedNovelUrl}>{novel?.title}</Link>
            <span className="breadcrumb-separator">&gt;</span>
            {moduleData && (
              <>
                <span className="breadcrumb-current">{moduleData.title}</span>
                <span className="breadcrumb-separator">&gt;</span>
              </>
            )}
            <span className="breadcrumb-current">{chapter?.title}</span>
          </div>
          
          {canEdit && (
            <div className="admin-controls">
              {isEditing ? (
                <>
                  <button 
                    className="save-changes-btn" 
                    onClick={handleEditChapter}
                    disabled={isSaving}
                    title="Lưu thay đổi"
                  >
                    {isSaving ? (
                      <LoadingSpinner inline text="Đang lưu..." />
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faSave} />
                        <span>Lưu thay đổi</span>
                      </>
                    )}
                  </button>
                  <button 
                    className="cancel-edit-btn" 
                    onClick={() => {
                      if (window[`clearAutoSave_${chapter._id}`]) {
                        window[`clearAutoSave_${chapter._id}`]();
                      }
                      setIsEditing(false);
                    }}
                    disabled={isSaving}
                    title="Hủy bỏ thay đổi"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                    <span>Hủy bỏ</span>
                  </button>
                </>
              ) : (
                <button 
                  className="edit-chapter-btn" 
                  onClick={() => setIsEditing(true)}
                  title="Chỉnh sửa nội dung chương"
                >
                  <FontAwesomeIcon icon={faEdit} /> 
                  <span>Chỉnh sửa chương</span>
                </button>
              )}
              
              {canDelete && !isEditing && (
                <button 
                  className="delete-chapter-btn" 
                  onClick={handleDeleteChapter}
                  title="Xóa chương này"
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span>Xóa chương</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChapterHeader; 