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
  staffUsersData = {},
  viewCount,
  wordCount,
  formatDate
}) => {
  // Helper function to resolve staff member display name
  const resolveStaffDisplayName = (staffValue) => {
    if (!staffValue) return null;
    
    // First try to find in staffUsersData lookup
    const staffUser = staffUsersData[staffValue];
    if (staffUser) {
      return staffUser.displayName || staffUser.userNumber || staffUser.username;
    }
    
    // Fallback to the original value if not found in lookup
    return staffValue;
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
        <span className="staff-member author">
          <em>Đăng bởi: {chapter.createdByUser ? (chapter.createdByUser.displayName || chapter.createdByUser.username) : 'Không xác định'}</em>
        </span>
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