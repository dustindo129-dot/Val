/**
 * Route Localization Utility
 * 
 * Provides mapping between English and Vietnamese URL path segments
 * and helper functions for URL generation and parsing
 */

// Path segment mappings from English to Vietnamese
export const PATH_MAPPINGS = {
  // Main content types
  'novel': 'truyen',
  'chapter': 'chuong',
  'module': 'tap',
  
  // Actions
  'add-chapter': 'them-chuong',
  
  // Pages and directories
  'novel-directory': 'danh-sach-truyen',
  'page': 'trang',
  
  // User-related paths
  'user': 'nguoi-dung',
  'profile': 'trang-ca-nhan',
  'bookmarks': 'truyen-danh-dau',
  'change-password': 'thay-doi-mat-khau',
  'reset-password': 'phuc-hoi-mat-khau',
  
  // Other features
  'feedback': 'phan-hoi',
  'market': 'bang-yeu-cau',
  'top-up': 'nap-tien',
  'topup-management': 'quan-ly-giao-dich',
  'admin-dashboard': 'bang-quan-tri'
};

// Reverse mapping from Vietnamese to English
export const REVERSE_PATH_MAPPINGS = Object.fromEntries(
  Object.entries(PATH_MAPPINGS).map(([english, vietnamese]) => [vietnamese, english])
);

/**
 * Converts an English path to Vietnamese
 * @param {string} englishPath - The English path to convert
 * @returns {string} The Vietnamese path
 */
export const localizeUrl = (englishPath) => {
  if (!englishPath) return '';
  
  // Split the path into segments
  const segments = englishPath.split('/').filter(segment => segment.length > 0);
  
  // Convert each segment if it has a mapping
  const localizedSegments = segments.map(segment => {
    return PATH_MAPPINGS[segment] || segment;
  });
  
  // Reconstruct the path
  return '/' + localizedSegments.join('/');
};

/**
 * Converts a Vietnamese path back to English for internal routing
 * @param {string} vietnamesePath - The Vietnamese path to convert
 * @returns {string} The English path
 */
export const delocalizeUrl = (vietnamesePath) => {
  if (!vietnamesePath) return '';
  
  // Split the path into segments
  const segments = vietnamesePath.split('/').filter(segment => segment.length > 0);
  
  // Convert each segment if it has a reverse mapping
  const englishSegments = segments.map(segment => {
    return REVERSE_PATH_MAPPINGS[segment] || segment;
  });
  
  // Reconstruct the path
  return '/' + englishSegments.join('/');
};

/**
 * Generates a localized novel URL
 * @param {Object} novel - Novel object with _id and title
 * @param {Function} createUniqueSlug - The slug creation function
 * @returns {string} Localized novel URL
 */
export const generateLocalizedNovelUrl = (novel, createUniqueSlug) => {
  if (!novel || !novel._id || !createUniqueSlug) return '/';
  
  const slug = createUniqueSlug(novel.title, novel._id);
  return `/truyen/${slug}`;
};

/**
 * Generates a localized chapter URL
 * @param {Object} novel - Novel object with _id and title
 * @param {Object} chapter - Chapter object with _id and title
 * @param {Function} createUniqueSlug - The slug creation function
 * @returns {string} Localized chapter URL
 */
export const generateLocalizedChapterUrl = (novel, chapter, createUniqueSlug) => {
  if (!novel || !novel._id || !chapter || !chapter._id || !createUniqueSlug) return '/';
  
  const novelSlug = createUniqueSlug(novel.title, novel._id);
  const chapterSlug = createUniqueSlug(chapter.title, chapter._id);
  return `/truyen/${novelSlug}/chuong/${chapterSlug}`;
};

/**
 * Generates a localized module add-chapter URL
 * @param {Object} novel - Novel object with _id and title
 * @param {Object} module - Module object with _id and title
 * @param {Function} createUniqueSlug - The slug creation function
 * @returns {string} Localized add-chapter URL
 */
export const generateLocalizedAddChapterUrl = (novel, module, createUniqueSlug) => {
  if (!novel || !novel._id || !module || !module._id || !createUniqueSlug) return '/';
  
  const novelSlug = createUniqueSlug(novel.title, novel._id);
  const moduleSlug = createUniqueSlug(module.title, module._id);
  return `/truyen/${novelSlug}/tap/${moduleSlug}/them-chuong`;
};

/**
 * Generates a localized user profile URL
 * @param {string} username - The username
 * @returns {string} Localized user profile URL
 */
export const generateLocalizedUserProfileUrl = (username) => {
  if (!username) return '/';
  return `/nguoi-dung/${username}/trang-ca-nhan`;
};

/**
 * Generates a localized user bookmarks URL
 * @param {string} username - The username
 * @returns {string} Localized user bookmarks URL
 */
export const generateLocalizedUserBookmarksUrl = (username) => {
  if (!username) return '/';
  return `/nguoi-dung/${username}/truyen-danh-dau`;
};

/**
 * Generates a localized change password URL
 * @param {string} username - The username
 * @returns {string} Localized change password URL
 */
export const generateLocalizedChangePasswordUrl = (username) => {
  if (!username) return '/';
  return `/nguoi-dung/${username}/thay-doi-mat-khau`;
};

/**
 * Generates a localized reset password URL
 * @param {string} token - The reset token
 * @returns {string} Localized reset password URL
 */
export const generateLocalizedResetPasswordUrl = (token) => {
  if (!token) return '/';
  return `/phuc-hoi-mat-khau/${token}`;
};

/**
 * Checks if a path segment is a localized Vietnamese segment
 * @param {string} segment - The path segment to check
 * @returns {boolean} True if the segment is Vietnamese
 */
export const isLocalizedSegment = (segment) => {
  return Object.values(PATH_MAPPINGS).includes(segment);
};

/**
 * Checks if a path segment is an English segment that should be localized
 * @param {string} segment - The path segment to check
 * @returns {boolean} True if the segment should be localized
 */
export const shouldLocalizeSegment = (segment) => {
  return Object.keys(PATH_MAPPINGS).includes(segment);
};

/**
 * Checks if a path segment is an English segment that should be localized
 * @param {string} segment - The path segment to check
 * @returns {boolean} True if the segment is English and should be localized
 */
export const isEnglishSegment = (segment) => {
  return Object.keys(PATH_MAPPINGS).includes(segment);
}; 