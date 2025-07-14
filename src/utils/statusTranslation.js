/**
 * Status Translation Utility
 * 
 * Provides translation functions for request, contribution, and novel status values
 * from English to Vietnamese
 */

/**
 * Translates novel status from English to Vietnamese
 * @param {string} status - The status in English
 * @returns {string} The translated status in Vietnamese
 */
export const translateStatus = (status) => {
  const statusMap = {
    // Lowercase versions
    'ongoing': 'Đang tiến hành',
    'completed': 'Hoàn thành',
    'dropped': 'Tạm dừng',
    'hiatus': 'Tạm ngưng',
    'licensed': 'Đã mua bản quyền',
    'axed': 'Đã hủy bỏ',
    // Capitalized versions (as stored in database)
    'Ongoing': 'Đang tiến hành',
    'Completed': 'Hoàn thành',
    'Dropped': 'Tạm dừng',
    'Hiatus': 'Tạm ngưng',
    'Licensed': 'Đã mua bản quyền',
    'Axed': 'Đã hủy bỏ',
    // Uppercase versions
    'ONGOING': 'Đang tiến hành',
    'COMPLETED': 'Hoàn thành',
    'DROPPED': 'Tạm dừng',
    'HIATUS': 'Tạm ngưng',
    'LICENSED': 'Đã mua bản quyền',
    'AXED': 'Đã hủy bỏ'
  };
  
  return statusMap[status] || status;
};

/**
 * Gets the CSS class name for a given novel status
 * @param {string} status - The status value
 * @returns {string} The CSS class name
 */
export const getStatusForCSS = (status) => {
  // Convert to lowercase for consistent CSS class naming
  return `rd-status-${status?.toLowerCase()}`;
};

/**
 * Gets the status value for data attributes (without rd- prefix)
 * @param {string} status - The status value
 * @returns {string} The status value for data attributes
 */
export const getStatusForDataAttr = (status) => {
  // Keep original capitalization for data attributes
  return status;
};

/**
 * Translates chapter/module status from English to Vietnamese
 * @param {string} status - The status in English
 * @returns {string} The translated status in Vietnamese
 */
export const translateChapterModuleStatus = (status) => {
  const statusMap = {
    'PUBLISHED': 'Công khai',
    'PAID': 'Trả phí',
    'DRAFT': 'Bản nháp',
    'PROTECTED': 'Bảo mật',
    // Also handle lowercase versions
    'published': 'Công khai',
    'paid': 'Trả phí',
    'draft': 'Bản nháp',
    'protected': 'Bảo mật',
    // Also handle capitalized versions
    'Published': 'Công khai',
    'Paid': 'Trả phí',
    'Draft': 'Bản nháp',
    'Protected': 'Bảo mật'
  };
  
  return statusMap[status] || status;
};

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