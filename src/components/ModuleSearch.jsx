/**
 * ModuleSearch Component
 * 
 * Provides search functionality for modules with dropdown results.
 * Shows up to 5 results with format "{novel title} - {module title}".
 */

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import config from '../config/config';
import './ModuleSearch.css';

const ModuleSearch = ({ onModuleSelect, placeholder = "Tìm kiếm tập..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchModules(searchTerm);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const searchModules = async (query) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${config.backendUrl}/api/modules/search`,
        {
          params: { query, limit: 5 },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSearchResults(response.data);
      setShowDropdown(response.data.length > 0);
    } catch (error) {
      console.error('Error searching modules:', error);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleModuleSelect = (module) => {
    onModuleSelect(module);
    setSearchTerm('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleInputFocus = () => {
    if (searchResults.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div className="module-search-container">
      <div className="module-search-input-wrapper" ref={searchRef}>
        <input
          type="text"
          className="module-search-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
        />
        {isLoading && (
          <div className="module-search-loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
          </div>
        )}
      </div>

      {showDropdown && (
        <div 
          className="module-search-dropdown" 
          ref={dropdownRef}
        >
          {searchResults.length > 0 ? (
            <ul className="module-search-results">
              {searchResults.map((module) => (
                <li
                  key={module._id}
                  className="module-search-result-item"
                  onClick={() => handleModuleSelect(module)}
                >
                  <div className="module-result-content">
                    <img
                      src={module.illustration || module.novelIllustration}
                      alt={module.title}
                      className="module-result-image"
                      onError={(e) => {
                        e.target.src = 'https://Valvrareteam.b-cdn.net/defaults/missing-image.png';
                      }}
                    />
                    <div className="module-result-info">
                      <div className="module-result-title">
                        {module.novel?.title ? `${module.novel.title} - ${module.title}` : module.title}
                      </div>
                      <div className="module-result-meta">
                        {module.mode === 'paid' && (
                          <span className="module-paid-badge">
                            🌾 {module.moduleBalance}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="module-search-no-results">
              Không tìm thấy tập nào
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModuleSearch; 