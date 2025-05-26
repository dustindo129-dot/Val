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