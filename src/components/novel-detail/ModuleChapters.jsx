import React, { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faSeedling } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { createUniqueSlug, generateChapterUrl } from '../../utils/slugUtils';
import '../../styles/components/ModuleChapters.css';
import { translateChapterModuleStatus } from '../../utils/statusTranslation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import config from '../../config/config';

// Helper function for date formatting in Vietnamese format (DD/MM/YYYY)
const formatDateUtil = (date) => {
  if (!date) return 'Invalid date';
  
  try {
    const chapterDate = new Date(date);
    
    if (isNaN(chapterDate.getTime())) {
      return 'Invalid date';
    }
    
    const day = chapterDate.getDate().toString().padStart(2, '0');
    const month = (chapterDate.getMonth() + 1).toString().padStart(2, '0');
    const year = chapterDate.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (err) {
    console.error('Date formatting error:', err);
    return 'Invalid date';
  }
};

// Helper function to get the appropriate display date for a chapter
// Use updatedAt if it's meaningfully different from createdAt (indicating the chapter was published later)
// Otherwise use createdAt for chapters that were created and published immediately
const getChapterDisplayDate = (chapter) => {
  if (!chapter) return null;
  
  const createdAt = new Date(chapter.createdAt);
  const updatedAt = new Date(chapter.updatedAt);
  
  // If either date is invalid, fall back to the valid one or null
  if (isNaN(createdAt.getTime()) && isNaN(updatedAt.getTime())) return null;
  if (isNaN(createdAt.getTime())) return chapter.updatedAt;
  if (isNaN(updatedAt.getTime())) return chapter.createdAt;
  
  // If updatedAt is more than 1 minute after createdAt, it's likely a meaningful update
  // This handles cases where chapters are switched from draft to published
  const timeDifference = updatedAt.getTime() - createdAt.getTime();
  const oneMinute = 60 * 1000;
  
  return timeDifference > oneMinute ? chapter.updatedAt : chapter.createdAt;
};

// Helper function to check if chapter is new with real-time checking
const isChapterNew = (chapter, currentTime = Date.now()) => {
  // Use the appropriate display date for the "new" calculation
  const date = getChapterDisplayDate(chapter);
  if (!date) return false;
  
  try {
    const chapterDate = new Date(date);
    if (isNaN(chapterDate.getTime())) {
      return false;
    }
    
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
    const timeSinceCreation = currentTime - chapterDate.getTime();
    
    return timeSinceCreation < threeDaysInMs;
  } catch (err) {
    console.error('Date comparison error:', err);
    return false;
  }
};

const ModuleChapters = memo(({ 
  chapters, 
  novelId, 
  novelTitle,
  moduleId, 
  user, 
  canEdit,
  canDelete,
  handleChapterReorder, 
  handleChapterDelete,
  isPaidModule,
  canAccessPaidContent,
  novel
}) => {
  const [isReordering, setIsReordering] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const { isAuthenticated } = useAuth();

  // Update current time every minute for real-time "new" tag updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Memoize chapter new status to prevent unnecessary re-calculations and maintain consistency
  const chaptersWithNewStatus = useMemo(() => {
    if (!chapters || !Array.isArray(chapters)) return [];
    
    return chapters.map(chapter => ({
      ...chapter,
      isNew: isChapterNew(chapter, currentTime)
    }));
  }, [chapters, currentTime]);
  
  // Helper function to check if user has pj_user access
  const checkPjUserAccess = useCallback((pjUserArray, user) => {
    if (!pjUserArray || !Array.isArray(pjUserArray) || !user) return false;
    
    return pjUserArray.some(pjUser => {
      // Handle case where pjUser is an object (new format)
      if (typeof pjUser === 'object' && pjUser !== null) {
        return (
          pjUser._id === user.id ||
          pjUser._id === user._id ||
          pjUser.username === user.username ||
          pjUser.displayName === user.displayName ||
          pjUser.userNumber === user.userNumber
        );
      }
      // Handle case where pjUser is a primitive value (old format)
      return (
        pjUser === user.id ||
        pjUser === user._id ||
        pjUser === user.username ||
        pjUser === user.displayName ||
        pjUser === user.userNumber
      );
    });
  }, []);

  const handleReorderClick = useCallback(async (chapterId, direction) => {
    if (isReordering) return; // Prevent concurrent reordering
    
    try {
      setIsReordering(true);
      await handleChapterReorder(moduleId, chapterId, direction);
    } finally {
      // Add a small delay before allowing next reorder
      setTimeout(() => {
        setIsReordering(false);
      }, 500);
    }
  }, [moduleId, handleChapterReorder, isReordering]);

  // Check if user has active rental for this module - MOVED UP for availability in canAccessChapter
  const { data: rentalStatus } = useQuery({
    queryKey: ['module-rental-status', moduleId, user?.id],
    queryFn: async () => {
      if (!user || !moduleId) return { hasActiveRental: false };
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${config.backendUrl}/api/modules/${moduleId}/rental-status`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error checking rental status:', error);
        return { hasActiveRental: false };
      }
    },
    enabled: !!user && !!moduleId && isPaidModule, // Only check if user exists, moduleId exists, and module is paid
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const hasActiveRental = rentalStatus?.hasActiveRental || false;

  // Function to determine if a chapter should be visible based on its mode
  const isChapterVisible = (chapter) => {
    // Admin and moderators see all chapters, pj_user sees all chapters for their novels
    if (user?.role === 'admin' || user?.role === 'moderator' || 
        (user?.role === 'pj_user' && checkPjUserAccess(novel?.active?.pj_user, user))) {
      return true;
    }
    
    if (!chapter.mode || chapter.mode === 'published') {
      return true; // Free content is visible to everyone
    }
    
    if (chapter.mode === 'protected' || chapter.mode === 'paid') {
      // Protected and paid content is visible but locked for regular users
      return true;
    }
    
    if (chapter.mode === 'draft') {
      // Check if user has chapter-specific roles or novel-level translator/editor/proofreader roles
      if (user && novel?.active) {
        const checkUserInStaffList = (staffList) => {
          if (!staffList || !Array.isArray(staffList)) return false;
          return staffList.some(staffValue => {
            if (typeof staffValue === 'object' && staffValue !== null) {
              return staffValue._id?.toString() === user._id?.toString() ||
                     staffValue.username === user.username ||
                     staffValue.displayName === user.displayName ||
                     staffValue.userNumber?.toString() === user.userNumber?.toString();
            }
            return staffValue?.toString() === user._id?.toString() ||
                   staffValue === user.username ||
                   staffValue === user.displayName ||
                   staffValue?.toString() === user.userNumber?.toString();
          });
        };
        
        // Check novel-level translator/editor/proofreader roles
        if (checkUserInStaffList(novel.active.translator) ||
            checkUserInStaffList(novel.active.editor) ||
            checkUserInStaffList(novel.active.proofreader)) {
          return true;
        }
        
        // Check chapter-specific roles
        const userIdentifiers = [
          user._id?.toString(),
          user.id?.toString(), 
          user.username,
          user.displayName,
          user.userNumber?.toString()
        ].filter(Boolean);
        
        const staffFields = ['translator', 'editor', 'proofreader'];
        const hasChapterRole = staffFields.some(field => {
          const staffValue = chapter[field];
          if (!staffValue) return false;
          
          if (typeof staffValue === 'object' && staffValue !== null) {
            const staffIdentifiers = [
              staffValue._id?.toString(),
              staffValue.id?.toString(),
              staffValue.username,
              staffValue.displayName,
              staffValue.userNumber?.toString()
            ].filter(Boolean);
            
            return userIdentifiers.some(userId => staffIdentifiers.includes(userId));
          }
          
          return userIdentifiers.includes(staffValue?.toString());
        });
        
        if (hasChapterRole) {
          return true;
        }
      }
      
      return false; // Draft is only visible to admin/moderator/assigned pj_user/chapter staff
    }
    
    return false; // Not visible for other modes
  };

  // Check if a chapter is accessible (not just visible)
  const canAccessChapter = (chapter) => {
    // Admin and moderators can access all chapters, pj_user can access chapters for their novels
    if (user?.role === 'admin' || user?.role === 'moderator' ||
        (user?.role === 'pj_user' && checkPjUserAccess(novel?.active?.pj_user, user))) {
      return true;
    }
    
    // RENTAL ACCESS: If user has active rental for this module, treat all chapters as accessible
    if (hasActiveRental) {
      return true;
    }
    
    // Regular users can access published chapters
    if (!chapter.mode || chapter.mode === 'published') {
      return true;
    }
    
    // If chapter is protected, logged-in users can access it
    if (chapter.mode === 'protected' && isAuthenticated) {
      return true;
    }
    
    // Other modes (paid, draft, etc.) are not accessible to regular users
    return false;
  };

  // Check if user can edit content for this novel
  const canEditContent = user && (
    user.role === 'admin' || 
    user.role === 'moderator' || 
    (user?.role === 'pj_user' && checkPjUserAccess(novel?.active?.pj_user, user)) ||
    // Check if user has novel-level translator, editor, or proofreader roles
    (novel?.active && (
      checkPjUserAccess(novel.active.translator, user) ||
      checkPjUserAccess(novel.active.editor, user) ||
      checkPjUserAccess(novel.active.proofreader, user)
    ))
  );


  
  // Check if user can delete content for this novel
  const canDeleteContent = user && (
    user.role === 'admin' || 
    user.role === 'moderator'
    // pj_user should NOT be able to delete chapters
  );




  return (
    <div className="module-chapters">
      {chaptersWithNewStatus && chaptersWithNewStatus.length > 0 ? (
        <div className="module-chapters-list">
          {chaptersWithNewStatus.map((chapter, index) => {
            const chapterId = chapter._id || `index-${index}`;
            
            // Skip rendering if chapter should not be visible to current user
            if (!isChapterVisible(chapter)) {
              return null;
            }
            
            // Determine CSS classes based on chapter mode
            const chapterModeClass = chapter.mode === 'draft' ? 'chapter-mode-draft' : '';
            const isPaidChapter = chapter.mode === 'paid';
            const chapterIsAccessible = canAccessChapter(chapter);
            // For paid modules, only lock chapters that are individually paid or inaccessible
            // Published chapters in paid modules should remain accessible
            const shouldLockChapter = !chapterIsAccessible;
            
            return (
              <div 
                key={`chapter-item-${chapterId}`}
                className={`module-chapter-item chapter-item-animated ${isReordering ? 'reordering' : ''} ${chapter.mode ? `chapter-mode-${chapter.mode}` : ''} ${shouldLockChapter ? 'locked-chapter' : ''}`}
              >
                <div className="chapter-list-content" key={`chapter-content-${chapterId}`}>
                  <div className="chapter-number" key={`chapter-number-${chapterId}`}>
                    {typeof chapter.order === 'number' ? chapter.order : chapter.order || 0}
                  </div>
                  
                  {chapterIsAccessible ? (
                    <Link 
                      to={generateChapterUrl(
                { _id: novelId, title: novelTitle },
                { _id: chapterId, title: chapter.title }
              )} 
                      className={`chapter-title-link ${chapterModeClass}`}
                      key={`chapter-link-${chapterId}`}
                    >
                      {chapter.title}
                      {chapter.isNew && (
                        <span className="new-tag" key={`new-tag-${chapterId}`}>MỚI</span>
                      )}
                    </Link>
                  ) : (
                    <div className={`chapter-title-link locked ${isPaidChapter ? 'paid-chapter' : ''}`}>
                      {!chapterIsAccessible && (
                        <FontAwesomeIcon icon={faLock} className="chapter-lock-icon" />
                      )}
                      {chapter.title}
                      {chapter.isNew && (
                        <span className="new-tag" key={`new-tag-locked-${chapterId}`}>MỚI</span>
                      )}
                      {chapter.mode === 'protected' && !chapterIsAccessible && (
                        <span className="login-required-text">(Yêu cầu đăng nhập)</span>
                      )}
                    </div>
                  )}

                  {/* Balance required for paid chapters */}
                  {isPaidChapter && chapter.chapterBalance > 0 && (
                    <div className="balance-required">
                      <FontAwesomeIcon icon={faSeedling} className="balance-icon" />
                      <span>{chapter.chapterBalance} lúa</span>
                    </div>
                  )}
                </div>
                
                {canEditContent && (
                  <div className="chapter-actions" key={`chapter-actions-${chapterId}`}>
                    <button
                      className={`reorder-btn ${index === 0 ? 'disabled' : ''}`}
                      onClick={() => handleReorderClick(chapterId, 'up')}
                      disabled={index === 0 || isReordering}
                      title="Move chapter up"
                    >
                      <svg 
                        key={`up-${chapterId}`}
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        width="16" 
                        height="16"
                      >
                        <path key={`path-up-${chapterId}`} d="M18 15l-6-6-6 6"/>
                      </svg>
                    </button>
                    <button
                      className={`reorder-btn ${index === chapters.length - 1 ? 'disabled' : ''}`}
                      onClick={() => handleReorderClick(chapterId, 'down')}
                      disabled={index === chapters.length - 1 || isReordering}
                      title="Move chapter down"
                    >
                      <svg 
                        key={`down-${chapterId}`}
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        width="16" 
                        height="16"
                      >
                        <path key={`path-down-${chapterId}`} d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                    {canDeleteContent && (
                      <button
                        className="module-chapter-btn module-chapter-btn--delete"
                        onClick={() => handleChapterDelete(chapterId)}
                        title="Xóa chương này khỏi tập"
                      >
                        Xóa
                      </button>
                    )}
                    <span className="chapter-mode-indicator">
                      <span className={`mode-tag mode-${chapter.mode || 'published'}`}>
                        {translateChapterModuleStatus((chapter.mode || 'published').toUpperCase())}
                      </span>
                    </span>
                  </div>
                )}
                <span className="novel-detail-chapter-date">
                  {formatDateUtil(getChapterDisplayDate(chapter))}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="module-no-chapters">Không có chương trong tập này.</div>
      )}
    </div>
  );
});

ModuleChapters.displayName = 'ModuleChapters';

export default ModuleChapters; 