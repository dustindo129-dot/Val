/**
 * Utility functions for handling URL slugs
 * Converts titles to URL-friendly slugs and provides lookup functionality
 */

/**
 * Converts a title to a URL-friendly slug
 * @param {string} title - The title to convert
 * @returns {string} URL-friendly slug
 */
export const createSlug = (title) => {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .trim()
    // Replace Vietnamese characters with ASCII equivalents
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'a')
    .replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'e')
    .replace(/[ÌÍỊỈĨ]/g, 'i')
    .replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'o')
    .replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'u')
    .replace(/[ỲÝỴỶỸ]/g, 'y')
    .replace(/Đ/g, 'd')
    // Replace special characters and spaces with hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Creates a unique slug by appending the ID
 * @param {string} title - The title to convert
 * @param {string} id - The MongoDB ID
 * @returns {string} Unique slug with ID
 */
export const createUniqueSlug = (title, id) => {
  const baseSlug = createSlug(title);
  const shortId = id.slice(-8); // Use last 8 characters of ID for uniqueness
  return baseSlug ? `${baseSlug}-${shortId}` : shortId;
};

/**
 * Extracts the ID from a slug
 * @param {string} slug - The slug containing the ID
 * @returns {string|null} The extracted ID or null if not found
 */
export const extractIdFromSlug = (slug) => {
  if (!slug) return null;
  
  // If it's already a MongoDB ID (24 characters, hex), return as is
  if (/^[0-9a-fA-F]{24}$/.test(slug)) {
    return slug;
  }
  
  // Extract the last part after the final hyphen (should be 8 characters)
  const parts = slug.split('-');
  const lastPart = parts[parts.length - 1];
  
  // If the last part looks like a short ID (8 hex characters), it's likely our ID suffix
  if (/^[0-9a-fA-F]{8}$/.test(lastPart)) {
    return lastPart;
  }
  
  return null;
};

/**
 * Validates if a string is a MongoDB ObjectId
 * @param {string} id - The string to validate
 * @returns {boolean} True if valid MongoDB ObjectId
 */
export const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Generates a novel URL with Vietnamese slug (Primary)
 * @param {Object} novel - Novel object with _id and title
 * @returns {string} Novel URL with Vietnamese slug
 */
export const generateNovelUrl = (novel) => {
  if (!novel || !novel._id) return '/';
  const slug = createUniqueSlug(novel.title, novel._id);
  return `/truyen/${slug}`;
};

/**
 * Generates a chapter URL with Vietnamese slug (Primary)
 * @param {Object} novel - Novel object with _id and title
 * @param {Object} chapter - Chapter object with _id and title
 * @returns {string} Chapter URL with Vietnamese slug
 */
export const generateChapterUrl = (novel, chapter) => {
  if (!novel || !novel._id || !chapter || !chapter._id) return '/';
  const novelSlug = createUniqueSlug(novel.title, novel._id);
  const chapterSlug = createUniqueSlug(chapter.title, chapter._id);
  return `/truyen/${novelSlug}/chuong/${chapterSlug}`;
};

/**
 * @deprecated Use generateNovelUrl instead (now uses Vietnamese paths by default)
 * Generates a localized novel URL with Vietnamese path segments
 * @param {Object} novel - Novel object with _id and title
 * @returns {string} Localized novel URL with slug
 */
export const generateLocalizedNovelUrl = (novel) => {
  return generateNovelUrl(novel);
};

/**
 * @deprecated Use generateChapterUrl instead (now uses Vietnamese paths by default)
 * Generates a localized chapter URL with Vietnamese path segments
 * @param {Object} novel - Novel object with _id and title
 * @param {Object} chapter - Chapter object with _id and title
 * @returns {string} Localized chapter URL with slug
 */
export const generateLocalizedChapterUrl = (novel, chapter) => {
  return generateChapterUrl(novel, chapter);
};

/**
 * Generates a user profile URL (Primary)
 * @param {Object} user - User object with displayName and username
 * @returns {string} User profile URL
 */
export const generateUserProfileUrl = (user) => {
  if (!user) return '/';
  
  // Use displayName, fallback to username
  const displayName = user.displayName || user.username;
  if (!displayName) return '/';
  
  // Convert displayName to URL-safe slug
  const urlSafeIdentifier = createSlug(displayName) || displayName;
  return `/nguoi-dung/${urlSafeIdentifier}/trang-ca-nhan`;
};

/**
 * Generates a user settings URL (Primary)
 * @param {Object} user - User object with displayName and username
 * @returns {string} User settings URL
 */
export const generateUserSettingsUrl = (user) => {
  if (!user) return '/';
  
  // Use displayName, fallback to username
  const displayName = user.displayName || user.username;
  if (!displayName) return '/';
  
  // Convert displayName to URL-safe slug
  const urlSafeIdentifier = createSlug(displayName) || displayName;
  return `/nguoi-dung/${urlSafeIdentifier}/cai-dat`;
};

/**
 * Generates a user bookmarks URL (Primary)
 * @param {Object} user - User object with displayName and username
 * @returns {string} User bookmarks URL
 */
export const generateUserBookmarksUrl = (user) => {
  if (!user) return '/';
  
  // Use displayName, fallback to username
  const displayName = user.displayName || user.username;
  if (!displayName) return '/';
  
  // Convert displayName to URL-safe slug
  const urlSafeIdentifier = createSlug(displayName) || displayName;
  return `/nguoi-dung/${urlSafeIdentifier}/truyen-danh-dau`;
};

/**
 * Generates a user change password URL (Primary)
 * @param {Object} user - User object with displayName and username
 * @returns {string} User change password URL
 */
export const generateUserChangePasswordUrl = (user) => {
  if (!user) return '/';
  
  // Use displayName, fallback to username
  const displayName = user.displayName || user.username;
  if (!displayName) return '/';
  
  // Convert displayName to URL-safe slug
  const urlSafeIdentifier = createSlug(displayName) || displayName;
  return `/nguoi-dung/${urlSafeIdentifier}/thay-doi-mat-khau`;
};

/**
 * @deprecated Use generateUserProfileUrl instead (now uses Vietnamese paths by default)
 * Generates a localized user profile URL
 * @param {string} username - The username
 * @returns {string} Localized user profile URL
 */
export const generateLocalizedUserProfileUrl = (username) => {
  return generateUserProfileUrl(username);
};

/**
 * @deprecated Use generateUserBookmarksUrl instead (now uses Vietnamese paths by default)
 * Generates a localized user bookmarks URL
 * @param {string} username - The username
 * @returns {string} Localized user bookmarks URL
 */
export const generateLocalizedUserBookmarksUrl = (username) => {
  return generateUserBookmarksUrl(username);
};

/**
 * @deprecated Use generateUserChangePasswordUrl instead (now uses Vietnamese paths by default)
 * Generates a localized change password URL
 * @param {string} username - The username
 * @returns {string} Localized change password URL
 */
export const generateLocalizedChangePasswordUrl = (username) => {
  return generateUserChangePasswordUrl(username);
};

/**
 * Generates a localized add chapter URL
 * @param {Object} novel - Novel object with _id and title
 * @param {Object} module - Module object with _id and title
 * @returns {string} Localized add chapter URL
 */
export const generateLocalizedAddChapterUrl = (novel, module) => {
  if (!novel || !novel._id || !module || !module._id) return '/';
  const novelSlug = createUniqueSlug(novel.title, novel._id);
  const moduleSlug = createUniqueSlug(module.title, module._id);
  return `/truyen/${novelSlug}/tap/${moduleSlug}/them-chuong`;
};

/**
 * Generates a localized admin dashboard URL
 * @returns {string} Localized admin dashboard URL
 */
export const generateLocalizedAdminDashboardUrl = () => {
  return '/bang-quan-tri';
};



/**
 * Generates a localized market URL
 * @returns {string} Localized market URL
 */
export const generateLocalizedMarketUrl = () => {
  return '/bang-yeu-cau';
};

/**
 * Generates a localized top-up URL
 * @returns {string} Localized top-up URL
 */
export const generateLocalizedTopUpUrl = () => {
  return '/nap-tien';
};

/**
 * Generates a localized top-up management URL
 * @returns {string} Localized top-up management URL
 */
export const generateLocalizedTopUpManagementUrl = () => {
  return '/quan-ly-giao-dich';
};

/**
 * Generates a localized novel directory URL
 * @param {number} page - Optional page number
 * @returns {string} Localized novel directory URL
 */
export const generateLocalizedNovelDirectoryUrl = (page) => {
  const pageNum = page || 1;
  return `/danh-sach-truyen/trang/${pageNum}`;
};

/**
 * Generates a localized trending novels URL
 * @returns {string} Localized trending novels URL
 */
export const generateLocalizedTrendingNovelsUrl = () => {
  return '/truyen-xu-huong';
};

/**
 * Generates a localized novel list URL with pagination
 * @param {number} page - Page number
 * @returns {string} Localized novel list URL
 */
export const generateLocalizedNovelListUrl = (page) => {
  if (page && page > 1) {
    return `/trang/${page}`;
  }
  return '/';
};

/**
 * Generates a localized reset password URL
 * @param {string} token - Reset password token
 * @returns {string} Localized reset password URL
 */
export const generateLocalizedResetPasswordUrl = (token) => {
  if (!token) return '/';
  return `/phuc-hoi-mat-khau/${token}`;
};

/**
 * Generates a localized OLN URL with pagination
 * @param {number} page - Optional page number
 * @returns {string} Localized OLN URL
 */
export const generateLocalizedOLNUrl = (page) => {
  const pageNum = page || 1;
  return `/oln/trang/${pageNum}`;
};

/**
 * Parses a novel slug to extract the ID
 * @param {string} novelSlug - The novel slug from URL
 * @returns {string|null} The novel ID or null if invalid
 */
export const parseNovelSlug = (novelSlug) => {
  const shortId = extractIdFromSlug(novelSlug);
  if (!shortId) return null;
  
  // For now, we'll need to look up the full ID from the backend
  // This will be handled in the API layer
  return shortId;
};

/**
 * Parses a chapter slug to extract the ID
 * @param {string} chapterSlug - The chapter slug from URL
 * @returns {string|null} The chapter ID or null if invalid
 */
export const parseChapterSlug = (chapterSlug) => {
  const shortId = extractIdFromSlug(chapterSlug);
  if (!shortId) return null;
  
  // For now, we'll need to look up the full ID from the backend
  // This will be handled in the API layer
  return shortId;
}; 