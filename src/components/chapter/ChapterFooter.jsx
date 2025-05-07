import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faFlag, faBookmark } from '@fortawesome/free-solid-svg-icons';
import { faBookmark as farBookmark } from '@fortawesome/free-regular-svg-icons';

const ChapterFooter = ({
  novelId,
  novel,
  chapter,
  moduleData,
  isBookmarked,
  handleBookmark,
  setShowReportModal
}) => {
  return (
    <div className="footer-nav-container">
      <div className="breadcrumb-nav">
        <Link to="/"><FontAwesomeIcon icon={faHome}/> Trang chủ</Link>
        <span className="breadcrumb-separator">&gt;</span>
        <Link to={`/novel/${novelId}`}>{novel.title}</Link>
        <span className="breadcrumb-separator">&gt;</span>
        {moduleData && (
          <>
            <span className="breadcrumb-current">{moduleData.title}</span>
            <span className="breadcrumb-separator">&gt;</span>
          </>
        )}
        <span className="breadcrumb-current">{chapter.title}</span>
      </div>

      <div className="footer-actions">
        <button
          className="btn-report"
          onClick={() => setShowReportModal(true)}
        >
          <FontAwesomeIcon icon={faFlag}/> Báo cáo
        </button>
        <button
          className={`btn-bookmark ${isBookmarked ? 'active' : ''}`}
          onClick={handleBookmark}
        >
          <FontAwesomeIcon icon={isBookmarked ? faBookmark : farBookmark}/>
          {isBookmarked ? 'Đã đánh dấu' : 'Đánh dấu chương'}
        </button>
      </div>
    </div>
  );
};

export default ChapterFooter; 