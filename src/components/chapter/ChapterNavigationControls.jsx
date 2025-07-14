import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes, faEllipsisV, faList, faCog,
    faChevronLeft, faChevronRight, faBars, faLock
} from '@fortawesome/free-solid-svg-icons';
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
                                       user
                                   }) => {
    // Ref for the chapter list container to handle scrolling
    const chapterListRef = useRef(null);
    const activeChapterRef = useRef(null);

    // Show all chapters in dropdown - ChapterAccessGuard will handle access control
    const filteredChapters = moduleChapters;

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
            {/* Toggle Button */}
            <button
                className="toggle-btn"
                onClick={() => setShowNavControls(!showNavControls)}
                title="Bật/Tắt bảng điều khiển điều hướng"
            >
                <FontAwesomeIcon icon={showNavControls ? faTimes : faEllipsisV}/>
            </button>

            {/* Fixed Navigation Controls */}
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

            {/* Chapter List Dropdown */}
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
        </>
    );
};

export default ChapterNavigationControls;