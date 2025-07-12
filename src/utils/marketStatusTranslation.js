/**
 * Market Status Translation Utility
 * 
 * Provides translation functions for market request and contribution status values
 * from English to Vietnamese
 */

/**
 * Translates request status from English to Vietnamese
 * @param {string} status - The status in English
 * @returns {string} The translated status in Vietnamese
 */
export const translateRequestStatus = (status) => {
  const statusMap = {
    'pending': 'Đang chờ xử lý',
    'approved': 'Đã phê duyệt',
    'declined': 'Đã từ chối',
    'withdrawn': 'Đã rút lại'
  };
  
  return statusMap[status] || status;
};

/**
 * Translates contribution status from English to Vietnamese
 * @param {string} status - The status in English
 * @returns {string} The translated status in Vietnamese
 */
export const translateContributionStatus = (status) => {
  const statusMap = {
    'pending': 'Đang chờ xử lý',
    'approved': 'Đã phê duyệt',
    'declined': 'Đã từ chối'
  };
  
  return statusMap[status] || status;
};

/**
 * Translates request type from English to Vietnamese
 * @param {string} type - The request type in English
 * @returns {string} The translated type in Vietnamese
 */
export const translateRequestType = (type) => {
  const typeMap = {
    'new': 'Truyện mới',
    'web': 'Đề xuất từ nhóm dịch'
  };
  
  return typeMap[type] || type;
};

/**
 * Gets the CSS class name for a given status
 * @param {string} status - The status value
 * @returns {string} The CSS class name
 */
export const getStatusCssClass = (status) => {
  return `status-${status}`;
};

/**
 * Gets status color information for UI styling
 * @param {string} status - The status value
 * @returns {Object} Object containing color information
 */
export const getStatusColor = (status) => {
  const colorMap = {
    'pending': { 
      bg: '#fff3cd', 
      text: '#856404',
      border: '#ffeaa7'
    },
    'approved': { 
      bg: '#d1e7dd', 
      text: '#0f5132',
      border: '#badbcc'
    },
    'declined': { 
      bg: '#f8d7da', 
      text: '#721c24',
      border: '#f5c2c7'
    },
    'withdrawn': { 
      bg: '#e2e3e5', 
      text: '#41464b',
      border: '#c4c8cb'
    }
  };
  
  return colorMap[status] || colorMap['pending'];
}; 