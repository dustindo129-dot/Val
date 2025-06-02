/**
 * Novel Permission Utilities
 * 
 * Utilities for checking user permissions on specific novels
 * based on the novel staff structure with User ObjectId references
 */

/**
 * Check if a user has any role on a novel (active staff only)
 * @param {Object} novel - Novel object with active staff
 * @param {string} userId - User ID to check
 * @returns {boolean} - True if user has any active role
 */
export const hasNovelAccess = (novel, userId) => {
  if (!novel?.active || !userId) return false;
  
  const { pj_user, translator, editor, proofreader } = novel.active;
  
  return [
    ...(pj_user || []),
    ...(translator || []),
    ...(editor || []),
    ...(proofreader || [])
  ].some(staffUserId => staffUserId.toString() === userId.toString());
};

/**
 * Check if a user has a specific role on a novel (active staff only)
 * @param {Object} novel - Novel object with active staff
 * @param {string} userId - User ID to check
 * @param {string} role - Role to check ('pj_user', 'translator', 'editor', 'proofreader')
 * @returns {boolean} - True if user has the specified active role
 */
export const hasNovelRole = (novel, userId, role) => {
  if (!novel?.active?.[role] || !userId) return false;
  
  return novel.active[role].some(staffUserId => 
    staffUserId.toString() === userId.toString()
  );
};

/**
 * Check if a user is a project manager (pj_user) for a novel
 * @param {Object} novel - Novel object with active staff
 * @param {string} userId - User ID to check
 * @returns {boolean} - True if user is an active project manager
 */
export const isProjectManager = (novel, userId) => {
  return hasNovelRole(novel, userId, 'pj_user');
};

/**
 * Check if a user is a translator for a novel
 * @param {Object} novel - Novel object with active staff
 * @param {string} userId - User ID to check
 * @returns {boolean} - True if user is an active translator
 */
export const isTranslator = (novel, userId) => {
  return hasNovelRole(novel, userId, 'translator');
};

/**
 * Check if a user is an editor for a novel
 * @param {Object} novel - Novel object with active staff
 * @param {string} userId - User ID to check
 * @returns {boolean} - True if user is an active editor
 */
export const isEditor = (novel, userId) => {
  return hasNovelRole(novel, userId, 'editor');
};

/**
 * Check if a user is a proofreader for a novel
 * @param {Object} novel - Novel object with active staff
 * @param {string} userId - User ID to check
 * @returns {boolean} - True if user is an active proofreader
 */
export const isProofreader = (novel, userId) => {
  return hasNovelRole(novel, userId, 'proofreader');
};

/**
 * Get all roles a user has on a novel (active staff only)
 * @param {Object} novel - Novel object with active staff
 * @param {string} userId - User ID to check
 * @returns {string[]} - Array of roles the user has
 */
export const getUserNovelRoles = (novel, userId) => {
  if (!novel?.active || !userId) return [];
  
  const roles = [];
  
  if (hasNovelRole(novel, userId, 'pj_user')) roles.push('pj_user');
  if (hasNovelRole(novel, userId, 'translator')) roles.push('translator');
  if (hasNovelRole(novel, userId, 'editor')) roles.push('editor');
  if (hasNovelRole(novel, userId, 'proofreader')) roles.push('proofreader');
  
  return roles;
};

/**
 * Check if a user can edit/manage a novel
 * Project managers and admins can manage novels
 * @param {Object} novel - Novel object with active staff
 * @param {Object} user - User object with role and _id
 * @returns {boolean} - True if user can manage the novel
 */
export const canManageNovel = (novel, user) => {
  if (!user) return false;
  
  // Admins can manage any novel
  if (user.role === 'admin') return true;
  
  // Project managers can manage their novels
  return isProjectManager(novel, user._id);
};

/**
 * Check if a user can contribute to a novel (create/edit chapters)
 * Project managers, translators, editors, and proofreaders can contribute
 * @param {Object} novel - Novel object with active staff
 * @param {Object} user - User object with role and _id
 * @returns {boolean} - True if user can contribute to the novel
 */
export const canContributeToNovel = (novel, user) => {
  if (!user) return false;
  
  // Admins can contribute to any novel
  if (user.role === 'admin') return true;
  
  // Any active staff member can contribute
  return hasNovelAccess(novel, user._id);
}; 