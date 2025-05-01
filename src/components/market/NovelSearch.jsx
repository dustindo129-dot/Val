import React from 'react';

/**
 * Novel Search Component
 * 
 * Allows users to search for novels
 * 
 * @param {Object} props - Component props
 * @param {string} props.novelSearchQuery - The current search query
 * @param {Function} props.setNovelSearchQuery - Function to update search query
 * @param {boolean} props.isSearching - Whether a search is in progress
 * @param {Array} props.novelSearchResults - Array of novel search results
 * @param {boolean} props.showNovelResults - Whether to show search results
 * @param {Function} props.setShowNovelResults - Function to toggle search results visibility
 * @param {Function} props.handleNovelSelect - Function to handle novel selection
 * @param {boolean} props.disabled - Whether the search input is disabled
 * @returns {JSX.Element} Novel search component
 */
const NovelSearch = ({ 
  novelSearchQuery, 
  setNovelSearchQuery, 
  isSearching, 
  novelSearchResults, 
  showNovelResults,
  setShowNovelResults,
  handleNovelSelect,
  disabled 
}) => {
  return (
    <div className="novel-search short">
      <input
        type="text"
        placeholder="Tìm kiếm truyện..."
        value={novelSearchQuery}
        onChange={(e) => {
          setNovelSearchQuery(e.target.value);
          setShowNovelResults(true);
        }}
        onFocus={() => setShowNovelResults(true)}
        disabled={disabled}
        className="novel-search-input"
      />
      {isSearching && <div className="searching-indicator">Đang tìm...</div>}
      
      {showNovelResults && novelSearchResults.length > 0 && (
        <div className="novel-search-results">
          {novelSearchResults.map(novel => (
            <div 
              key={novel._id} 
              className="novel-result"
              onClick={() => handleNovelSelect(novel)}
            >
              <img 
                src={novel.illustration || 'https://placeholder.com/book'} 
                alt={novel.title} 
                className="novel-result-cover"
              />
              <div className="novel-result-info">
                <div className="novel-result-title">{novel.title}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showNovelResults && novelSearchQuery.length >= 3 && novelSearchResults.length === 0 && !isSearching && (
        <div className="no-results">Không tìm thấy truyện</div>
      )}
    </div>
  );
};

export default NovelSearch; 