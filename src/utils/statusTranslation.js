/**
 * Status Translation Utility
 * 
 * Provides localization for novel, chapter, and module status values
 * Maps backend status values to localized display text
 */

/**
 * Novel status translation mapping
 * Maps backend status values to Vietnamese display text
 */
const novelStatusTranslations = {
  // Uppercase variants
  'ONGOING': 'ĐANG TIẾN HÀNH',
  'COMPLETED': 'HOÀN THÀNH',
  'HIATUS': 'TẠM NGƯNG',
  
  // Capitalized variants
  'Ongoing': 'Đang tiến hành',
  'Completed': 'Hoàn thành',
  'Hiatus': 'Tạm ngưng',
  
  // Lowercase variants (just in case)
  'ongoing': 'đang tiến hành',
  'completed': 'hoàn thành',
  'hiatus': 'tạm ngưng'
};

/**
 * Chapter and Module status translation mapping
 * Maps backend status values to Vietnamese display text
 */
const chapterModuleStatusTranslations = {
  // Uppercase variants
  'PUBLISHED': 'CÔNG KHAI',
  'DRAFT': 'NHÁP',
  'PROTECTED': 'BẢO MẬT',
  'PAID': 'TRẢ PHÍ',
  
  // Capitalized variants
  'Published': 'Công khai',
  'Draft': 'Nháp',
  'Protected': 'Bảo mật',
  'Paid': 'Trả phí',
  
  // Lowercase variants (just in case)
  'published': 'công khai',
  'draft': 'nháp',
  'protected': 'bảo mật',
  'paid': 'trả phí'
};

/**
 * Translates a novel status value to Vietnamese
 * @param {string} status - The novel status value from backend
 * @returns {string} The translated status text
 */
export const translateStatus = (status) => {
  if (!status) return 'Đang tiến hành'; // Default fallback
  
  return novelStatusTranslations[status] || status; // Return original if no translation found
};

/**
 * Translates a chapter or module status value to Vietnamese
 * @param {string} status - The chapter/module status value from backend
 * @returns {string} The translated status text
 */
export const translateChapterModuleStatus = (status) => {
  if (!status) return 'Công khai'; // Default fallback
  
  return chapterModuleStatusTranslations[status] || status; // Return original if no translation found
};

/**
 * Gets the appropriate CSS class for a novel status
 * This maintains the original status value for CSS styling
 * @param {string} status - The novel status value from backend
 * @returns {string} The status value for CSS data-status attribute
 */
export const getStatusForCSS = (status) => {
  return status || 'Ongoing'; // Return original status for CSS
};

/**
 * Gets the appropriate CSS class for a chapter/module status
 * This maintains the original status value for CSS styling
 * @param {string} status - The chapter/module status value from backend
 * @returns {string} The status value for CSS data-status attribute
 */
export const getChapterModuleStatusForCSS = (status) => {
  return status || 'Published'; // Return original status for CSS
};

export default {
  translateStatus,
  translateChapterModuleStatus,
  getStatusForCSS,
  getChapterModuleStatusForCSS
}; 