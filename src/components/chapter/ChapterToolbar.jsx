import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLanguage, faEdit, faCheckDouble, faEye, faFont
} from '@fortawesome/free-solid-svg-icons';

/**
 * ChapterToolbar Component
 * 
 * Displays staff information and chapter statistics
 */
const ChapterToolbar = ({
  chapter,
  novel,
  viewCount,
  wordCount,
  formatDate,
  user
}) => {
  // Helper function to resolve staff member display name
  // Staff names are now pre-populated by populateStaffNames in the backend
  const resolveStaffDisplayName = (staffValue) => {
    if (!staffValue) return null;
    
    // Staff value is already the display name thanks to populateStaffNames
    return staffValue;
  };

  // Helper function to check if user has management access to this novel
  const canViewModeratorInfo = () => {
    if (!user || !novel) return false;
    
    // Admin and moderator can always see
    if (user.role === 'admin' || user.role === 'moderator') {
      return true;
    }
    
    // Check if user is pj_user for this novel
    if (user.role === 'pj_user' && novel.active?.pj_user) {
      const isProjectUser = novel.active.pj_user.some(pjUser => {
        if (typeof pjUser === 'object' && pjUser !== null) {
          return (
            pjUser._id === user.id ||
            pjUser._id === user._id ||
            pjUser.username === user.username ||
            pjUser.displayName === user.displayName ||
            pjUser.userNumber === user.userNumber
          );
        }
        return (
          pjUser === user.id ||
          pjUser === user._id ||
          pjUser === user.username ||
          pjUser === user.displayName ||
          pjUser === user.userNumber
        );
      });
      if (isProjectUser) return true;
    }
    
    // Check if user is translator for this novel
    if (novel.active?.translator) {
      const isTranslator = novel.active.translator.some(staff => {
        if (typeof staff === 'object' && staff !== null) {
          return (
            staff._id === user.id ||
            staff._id === user._id ||
            staff.username === user.username ||
            staff.displayName === user.displayName ||
            staff.userNumber === user.userNumber
          );
        }
        return (
          staff === user.id ||
          staff === user._id ||
          staff === user.username ||
          staff === user.displayName ||
          staff === user.userNumber
        );
      });
      if (isTranslator) return true;
    }
    
    // Check if user is editor for this novel
    if (novel.active?.editor) {
      const isEditor = novel.active.editor.some(staff => {
        if (typeof staff === 'object' && staff !== null) {
          return (
            staff._id === user.id ||
            staff._id === user._id ||
            staff.username === user.username ||
            staff.displayName === user.displayName ||
            staff.userNumber === user.userNumber
          );
        }
        return (
          staff === user.id ||
          staff === user._id ||
          staff === user.username ||
          staff === user.displayName ||
          staff === user.userNumber
        );
      });
      if (isEditor) return true;
    }
    
    // Check if user is proofreader for this novel
    if (novel.active?.proofreader) {
      const isProofreader = novel.active.proofreader.some(staff => {
        if (typeof staff === 'object' && staff !== null) {
          return (
            staff._id === user.id ||
            staff._id === user._id ||
            staff.username === user.username ||
            staff.displayName === user.displayName ||
            staff.userNumber === user.userNumber
          );
        }
        return (
          staff === user.id ||
          staff === user._id ||
          staff === user.username ||
          staff === user.displayName ||
          staff === user.userNumber
        );
      });
      if (isProofreader) return true;
    }
    
    return false;
  };

  return (
    <div className="action-toolbar">
      {/* Staff Info */}
      <div className="staff-info">
        {chapter.translator && (
          <span className="staff-member translator">
            <FontAwesomeIcon icon={faLanguage}/> {resolveStaffDisplayName(chapter.translator)}
          </span>
        )}
        {chapter.editor && (
          <span className="staff-member editor">
            <FontAwesomeIcon icon={faEdit}/> {resolveStaffDisplayName(chapter.editor)}
          </span>
        )}
        {chapter.proofreader && (
          <span className="staff-member proofreader">
            <FontAwesomeIcon icon={faCheckDouble}/> {resolveStaffDisplayName(chapter.proofreader)}
          </span>
        )}
        {canViewModeratorInfo() && (
          <span className="staff-member author">
            <em>Đăng bởi: {chapter.createdByUser ? (chapter.createdByUser.displayName || chapter.createdByUser.username) : 'Không xác định'}</em>
          </span>
        )}
      </div>

      <div className="action-toolbar-right">
        {/* Stats - Word count matches TinyMCE's exact counting algorithm */}
        <div className="chapter-stats">
          <span className="chapter-stat-item">
            <FontAwesomeIcon icon={faEye}/> {viewCount} lượt xem
          </span>
          <span className="chapter-stat-item" title="Word count calculated using TinyMCE's algorithm">
            <FontAwesomeIcon icon={faFont}/> {wordCount} từ
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChapterToolbar; 