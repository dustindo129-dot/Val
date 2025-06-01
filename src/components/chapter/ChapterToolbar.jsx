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
  viewCount,
  wordCount,
  formatDate
}) => {
  return (
    <div className="action-toolbar">
      {/* Staff Info */}
      <div className="staff-info">
        <span className="staff-member translator">
          <FontAwesomeIcon icon={faLanguage}/> {chapter.translator || 'Không có dịch giả'}
        </span>
        <span className="staff-member editor">
          <FontAwesomeIcon icon={faEdit}/> {chapter.editor || 'Không có biên tập'}
        </span>
        <span className="staff-member proofreader">
          <FontAwesomeIcon icon={faCheckDouble}/> {chapter.proofreader || 'Không có kiểm tra chất lượng'}
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