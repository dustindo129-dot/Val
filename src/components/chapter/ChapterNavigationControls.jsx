import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes, faEllipsisV, faList, faCog,
    faChevronLeft, faChevronRight, faBars, faLock, faBookmark, faHouse
} from '@fortawesome/free-solid-svg-icons';
import { faBookmark as farBookmark } from '@fortawesome/free-regular-svg-icons';
import '../../styles/components/ChapterNavigationControls.css';
import { createUniqueSlug, generateChapterUrl } from '../../utils/slugUtils';
import LoadingSpinner from '../LoadingSpinner';

/**
 * ChapterNavigationControls Component
 *
 * Provides fixed navigation controls, chapter list dropdown, and floating buttons
 */
const ChapterNavigationControls = ({
                                       novelId,
                                       novelTitle,
                                       chapter,
                                       chapterId,
                                       showNavControls,
                                       setShowNavControls,
                                       showChapterList,
                                       setShowChapterList,
                                       setShowSettingsModal,
                                       handlePrevChapter,
                                       handleNextChapter,
                                       isNavigating,
                                       isEditing,
                                       moduleChapters,
                                       isModuleChaptersLoading,
                                       user,
                                       buttonsVisible = true,
                                       isBookmarked,
                                       handleBookmark
                                   }) => {
    // Ref for the chapter list container to handle scrolling
    const chapterListRef = useRef(null);
    const activeChapterRef = useRef(null);

    // Helper function to check if user has pj_user access (same logic as in Chapter.jsx)
    const checkPjUserAccess = (pjUserArray, user) => {
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
    };

    // Function to determine if a chapter should be visible based on its mode and user permissions
    const isChapterVisible = (chapterItem) => {
        // Admin and moderators see all chapters, pj_user sees all chapters for their novels
        if (user?.role === 'admin' || user?.role === 'moderator' || 
            (user?.role === 'pj_user' && chapter?.novel && checkPjUserAccess(chapter.novel.active?.pj_user, user))) {
            return true;
        }
        
        if (!chapterItem.mode || chapterItem.mode === 'published') {
            return true; // Free content is visible to everyone
        }
        
        if (chapterItem.mode === 'protected' || chapterItem.mode === 'paid') {
            // Protected and paid content is visible but locked for regular users
            return true;
        }
        
        if (chapterItem.mode === 'draft') {
            return false; // Draft is only visible to admin/moderator/assigned pj_user (handled above)
        }
        
        return false; // Not visible for other modes
    };

    // Filter chapters based on user permissions - hide draft chapters from unauthorized users
    const filteredChapters = moduleChapters ? moduleChapters.filter(isChapterVisible) : [];

    // Auto-scroll to current chapter when dropdown opens
    useEffect(() => {
        if (showChapterList && activeChapterRef.current && chapterListRef.current) {
            // Small delay to ensure DOM is rendered
            const scrollTimer = setTimeout(() => {
                const activeElement = activeChapterRef.current;
                const container = chapterListRef.current;

                if (activeElement && container) {
                    // Calculate the position to scroll to center the active chapter
                    const containerHeight = container.clientHeight;
                    const elementTop = activeElement.offsetTop;
                    const elementHeight = activeElement.clientHeight;

                    // Center the active chapter in the dropdown
                    const scrollPosition = elementTop - (containerHeight / 2) + (elementHeight / 2);

                    // Smooth scroll to the calculated position
                    container.scrollTo({
                        top: Math.max(0, scrollPosition), // Ensure we don't scroll to negative position
                        behavior: 'smooth'
                    });

                    // Add a subtle highlight animation to the active chapter
                    activeElement.style.animation = 'highlightChapter 1.5s ease-out';

                    // Remove animation after it completes
                    setTimeout(() => {
                        if (activeElement.style) {
                            activeElement.style.animation = '';
                        }
                    }, 1500);
                }
            }, 100); // 100ms delay to ensure rendering is complete

            return () => clearTimeout(scrollTimer);
        }
    }, [showChapterList, chapterId, filteredChapters.length]);

    const novelSlug = createUniqueSlug(novelTitle, novelId);


    return (
        <>
            {/* Toggle Button - only show when buttonsVisible is true */}
            {buttonsVisible && (
                <button
                    className="toggle-btn"
                    onClick={() => setShowNavControls(!showNavControls)}
                    title="Bật/Tắt bảng điều khiển điều hướng"
                >
                    <FontAwesomeIcon icon={showNavControls ? faTimes : faEllipsisV}/>
                </button>
            )}

            {/* Vertical Navigation Controls */}
            {buttonsVisible && (
                <div className={`vertical-nav-controls-container ${showNavControls ? 'visible' : ''}`}>
                    <button
                        className={`control-btn bookmark-btn ${isBookmarked ? 'active' : ''}`}
                        onClick={handleBookmark}
                        title={isBookmarked ? "Bỏ đánh dấu chương" : "Đánh dấu chương"}
                    >
                        <FontAwesomeIcon icon={isBookmarked ? faBookmark : farBookmark}/>
                    </button>

                    <Link to="/" className="control-btn home-btn" title="Trang chủ">
                        <FontAwesomeIcon icon={faHouse}/>
                    </Link>
                </div>
            )}

            {/* Fixed Navigation Controls */}
            {buttonsVisible && (
                <div className={`nav-controls-container ${showNavControls ? 'visible' : ''}`}>
                <button
                    className="control-btn"
                    onClick={() => setShowChapterList(!showChapterList)}
                    title="Danh sách chương"
                    id="chapterListBtn"
                >
                    <FontAwesomeIcon icon={faList}/>
                </button>

                <button
                    className="control-btn"
                    onClick={() => setShowSettingsModal(true)}
                    title="Cài đặt đọc truyện"
                >
                    <FontAwesomeIcon icon={faCog}/>
                </button>
            </div>
            )}

            {/* Chapter List Dropdown */}
            {buttonsVisible && (
            <div className={`chapter-dropdown ${showChapterList ? 'active' : ''}`} id="chapterDropdown">
                <div className="chapter-dropdown-header">
                    <h3>Danh sách chương</h3>
                    <button
                        onClick={() => setShowChapterList(false)}
                        className="close-dropdown"
                    >
                        <FontAwesomeIcon icon={faTimes}/>
                    </button>
                </div>

                {isModuleChaptersLoading ? (
                    <div className="dropdown-loading">
                        <LoadingSpinner size="small" text="Đang tải chương..." />
                    </div>
                ) : filteredChapters.length > 0 ? (
                    <ul className="chapter-dropdown-list" ref={chapterListRef}>
                        {filteredChapters.map((chapterItem, index) => {
                            const isCurrentChapter = chapterItem._id === chapterId;
                            const isPaidChapter = chapterItem.mode === 'paid';

                            return (
                                <li
                                    key={chapterItem._id}
                                    className={`${isCurrentChapter ? 'active' : ''}`}
                                    ref={isCurrentChapter ? activeChapterRef : null}
                                >
                                    <Link
                                        to={generateChapterUrl(
                                            { _id: novelId, title: novelTitle },
                                            chapterItem
                                        )}
                                        onClick={() => setShowChapterList(false)} // Close dropdown when chapter is selected
                                    >
                                        <span className="chapter-number">
                                            {index}
                                        </span>
                                        <span className="chapter-title">
                                            {chapterItem.title}
                                        </span>
                                        {isPaidChapter && (
                                            <FontAwesomeIcon
                                                icon={faLock}
                                                className="paid-icon"
                                                title="Chương trả phí"
                                            />
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="no-chapters">
                        <p>Không có chương nào trong tập này</p>
                    </div>
                )}
            </div>
            )}
        </>
    );
};

export default ChapterNavigationControls;