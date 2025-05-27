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
 * Generates a novel URL with slug
 * @param {Object} novel - Novel object with _id and title
 * @returns {string} Novel URL with slug
 */
export const generateNovelUrl = (novel) => {
  if (!novel || !novel._id) return '/';
  const slug = createUniqueSlug(novel.title, novel._id);
  return `/novel/${slug}`;
};

/**
 * Generates a chapter URL with slug
 * @param {Object} novel - Novel object with _id and title
 * @param {Object} chapter - Chapter object with _id and title
 * @returns {string} Chapter URL with slug
 */
export const generateChapterUrl = (novel, chapter) => {
  if (!novel || !novel._id || !chapter || !chapter._id) return '/';
  const novelSlug = createUniqueSlug(novel.title, novel._id);
  const chapterSlug = createUniqueSlug(chapter.title, chapter._id);
  return `/novel/${novelSlug}/chapter/${chapterSlug}`;
};

/**
 * Generates a localized novel URL with Vietnamese path segments
 * @param {Object} novel - Novel object with _id and title
 * @returns {string} Localized novel URL with slug
 */
export const generateLocalizedNovelUrl = (novel) => {
  if (!novel || !novel._id) return '/';
  const slug = createUniqueSlug(novel.title, novel._id);
  return `/truyen/${slug}`;
};

/**
 * Generates a localized chapter URL with Vietnamese path segments
 * @param {Object} novel - Novel object with _id and title
 * @param {Object} chapter - Chapter object with _id and title
 * @returns {string} Localized chapter URL with slug
 */
export const generateLocalizedChapterUrl = (novel, chapter) => {
  if (!novel || !novel._id || !chapter || !chapter._id) return '/';
  const novelSlug = createUniqueSlug(novel.title, novel._id);
  const chapterSlug = createUniqueSlug(chapter.title, chapter._id);
  return `/truyen/${novelSlug}/chuong/${chapterSlug}`;
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