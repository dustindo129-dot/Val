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
          <FontAwesomeIcon icon={faLanguage}/> {chapter.translator || 'No Translator'}
        </span>
        <span className="staff-member editor">
          <FontAwesomeIcon icon={faEdit}/> {chapter.editor || 'No Editor'}
        </span>
        <span className="staff-member proofreader">
          <FontAwesomeIcon icon={faCheckDouble}/> {chapter.proofreader || 'No Proofreader'}
        </span>
      </div>

      <div className="action-toolbar-right">
        <span className="chapter-view-date">
          {chapter?.updatedAt ? formatDate(chapter.updatedAt) : 'Unknown date'}
        </span>
        {/* Stats */}
        <div className="chapter-stats">
          <span className="chapter-stat-item">
            <FontAwesomeIcon icon={faEye}/> {viewCount} views
          </span>
          <span className="chapter-stat-item">
            <FontAwesomeIcon icon={faFont}/> {wordCount} words
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChapterToolbar; 