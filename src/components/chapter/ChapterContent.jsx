import React, {useRef, useEffect, useState, useCallback, useMemo, startTransition} from 'react';
import {Editor} from '@tinymce/tinymce-react';
import DOMPurify from 'dompurify';
import config from '../../config/config';
import {formatDate} from '../../utils/helpers';
import PropTypes from 'prop-types';
import ChapterFootnotes from './ChapterFootnotes';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPlus, faTrash} from '@fortawesome/free-solid-svg-icons';
import './ChapterContent.css';
import bunnyUploadService from '../../services/bunnyUploadService';
import {translateChapterModuleStatus} from '../../utils/statusTranslation';
import cdnConfig from '../../config/bunny';

const ChapterContent = React.memo(({
                                       chapter,
                                       isEditing = false,
                                       editedContent,
                                       setEditedContent,
                                       editedTitle,
                                       setEditedTitle,
                                       fontSize = 16,
                                       fontFamily = 'Arial, sans-serif',
                                       lineHeight = '1.6',
                                       marginSpacing = '20',
                                       editorRef,
                                       onModeChange,
                                       canEdit = false,
                                       userRole = 'user',
                                       moduleData = null,
                                       onWordCountUpdate,
                                       // Staff props
                                       editedTranslator,
                                       setEditedTranslator,
                                       editedEditor,
                                       setEditedEditor,
                                       editedProofreader,
                                       setEditedProofreader,
                                       novelData = null,
                                       onNetworkError
                                   }) => {



    const contentRef = useRef(null);
    const [editedMode, setEditedMode] = useState(chapter.mode || 'published');
    const [localFootnotes, setLocalFootnotes] = useState([]);
    const [nextFootnoteId, setNextFootnoteId] = useState(1);
    const [editedChapterBalance, setEditedChapterBalance] = useState(chapter.chapterBalance || 0);
    const [originalMode] = useState(chapter.mode || 'published');
    const [originalChapterBalance] = useState(chapter.chapterBalance || 0);
    const [modeError, setModeError] = useState('');
    const [networkError, setNetworkError] = useState('');

    // Auto-save state management
    const [autoSaveStatus, setAutoSaveStatus] = useState('');
    const [lastSaved, setLastSaved] = useState(null);
    const autoSaveTimeoutRef = useRef(null);
    const restoredContentRef = useRef(null);
    const isLoadingRestoredContent = useRef(false);


    // throttledWordCountUpdate with timeout refs
    const wordCountTimeoutRef = useRef(null);
    const lastWordCount = useRef(0);
    const lastReactSyncContentRef = useRef('');
    const isComposingRef = useRef(false);

    // Check if the current module is in paid mode
    const isModulePaid = moduleData?.mode === 'paid';

    // Auto-save key for localStorage
    const autoSaveKey = `chapter_autosave_${chapter._id}`;
    const AUTO_SAVE_EXPIRY_HOURS = 24;



    // FOOTNOTE SYSTEM: Convert between formats (with backward compatibility)
    const convertFootnotesToHTML = useCallback((content) => {
        if (!content) return content;

        // Convert [valnote_X] to HTML footnote links with simple [X] display in viewer
        return content.replace(
            /\[valnote_(\w+)\]/g,
            '<sup><a href="#note-$1" id="ref-$1" class="footnote-ref" data-footnote="$1">[$1]</a></sup>'
        );
    }, []);

    const convertHTMLToFootnotes = useCallback((content) => {
        if (!content) return content;

        let processedContent = content;

        // Convert old format: <sup class="footnote-marker" data-footnote="1">[1]</sup> → [valnote_1]
        processedContent = processedContent.replace(
            /<sup class="footnote-marker" data-footnote="(\w+)">\[[\w\d]+\]<\/sup>/g,
            '[valnote_$1]'
        );

        // Convert standard HTML footnote links back to [valnote_X]
        processedContent = processedContent.replace(
            /<sup><a[^>]*href="#note-(\w+)"[^>]*>\[valnote_\w+\]<\/a><\/sup>/g,
            '[valnote_$1]'
        );

        // Convert any remaining <sup> footnote patterns to [valnote_X]
        processedContent = processedContent.replace(
            /<sup[^>]*data-footnote="(\w+)"[^>]*>\[[\w\d]+\]<\/sup>/g,
            '[valnote_$1]'
        );

        return processedContent;
    }, []);

    // Convert CSS classes back to inline styles for TinyMCE editing
    const convertClassesToInlineStyles = useCallback((content) => {
        if (!content) return content;

        let processedContent = content;

        // Convert text alignment classes back to inline styles for paragraphs
        processedContent = processedContent.replace(
            /<p([^>]*?)class="([^"]*)"([^>]*?)>/gi,
            (match, beforeClass, classContent, afterClass) => {
                const classes = classContent.split(' ').filter(c => c.trim());
                const nonAlignmentClasses = [];
                let alignmentStyle = '';

                classes.forEach(className => {
                    if (className === 'text-center') {
                        alignmentStyle = 'text-align: center;';
                    } else if (className === 'text-right') {
                        alignmentStyle = 'text-align: right;';
                    } else if (className === 'text-left') {
                        alignmentStyle = 'text-align: left;';
                    } else if (!className.startsWith('text-default-color') && !className.startsWith('text-color-')) {
                        nonAlignmentClasses.push(className);
                    }
                });

                // Extract existing style attribute
                const existingStyleMatch = (beforeClass + afterClass).match(/style="([^"]*)"/i);
                let existingStyle = existingStyleMatch ? existingStyleMatch[1] : '';

                // Remove any existing text-align styles
                existingStyle = existingStyle.replace(/text-align\s*:\s*[^;]+;?/gi, '').trim();

                // Combine styles
                let finalStyle = '';
                if (alignmentStyle) {
                    finalStyle = alignmentStyle;
                }
                if (existingStyle) {
                    finalStyle += (finalStyle ? ' ' : '') + existingStyle;
                }

                // Remove style attribute from before/after parts
                let cleanedBefore = beforeClass.replace(/style="[^"]*"/gi, '').trim();
                let cleanedAfter = afterClass.replace(/style="[^"]*"/gi, '').trim();

                // Build the final tag
                let result = '<p';
                if (cleanedBefore) result += ' ' + cleanedBefore;
                if (nonAlignmentClasses.length > 0) {
                    result += ` class="${nonAlignmentClasses.join(' ')}"`;
                }
                if (finalStyle) {
                    result += ` style="${finalStyle}"`;
                }
                if (cleanedAfter) result += ' ' + cleanedAfter;
                result += '>';

                return result;
            }
        );

        // Convert text alignment classes back to inline styles for divs
        processedContent = processedContent.replace(
            /<div([^>]*?)class="([^"]*)"([^>]*?)>/gi,
            (match, beforeClass, classContent, afterClass) => {
                const classes = classContent.split(' ').filter(c => c.trim());
                const nonAlignmentClasses = [];
                let alignmentStyle = '';

                classes.forEach(className => {
                    if (className === 'text-center') {
                        alignmentStyle = 'text-align: center;';
                    } else if (className === 'text-right') {
                        alignmentStyle = 'text-align: right;';
                    } else if (className === 'text-left') {
                        alignmentStyle = 'text-align: left;';
                    } else if (!className.startsWith('text-default-color') && !className.startsWith('text-color-')) {
                        nonAlignmentClasses.push(className);
                    }
                });

                if (!alignmentStyle) {
                    return match; // No alignment classes found, return original
                }

                // Extract existing style attribute
                const existingStyleMatch = (beforeClass + afterClass).match(/style="([^"]*)"/i);
                let existingStyle = existingStyleMatch ? existingStyleMatch[1] : '';

                // Remove any existing text-align styles
                existingStyle = existingStyle.replace(/text-align\s*:\s*[^;]+;?/gi, '').trim();

                // Combine styles
                let finalStyle = alignmentStyle;
                if (existingStyle) {
                    finalStyle += ' ' + existingStyle;
                }

                // Remove style attribute from before/after parts
                let cleanedBefore = beforeClass.replace(/style="[^"]*"/gi, '').trim();
                let cleanedAfter = afterClass.replace(/style="[^"]*"/gi, '').trim();

                // Build the final tag
                let result = '<div';
                if (cleanedBefore) result += ' ' + cleanedBefore;
                if (nonAlignmentClasses.length > 0) {
                    result += ` class="${nonAlignmentClasses.join(' ')}"`;
                }
                result += ` style="${finalStyle}"`;
                if (cleanedAfter) result += ' ' + cleanedAfter;
                result += '>';

                return result;
            }
        );

        return processedContent;
    }, []);

    // throttledWordCountUpdate with 3s debounce
    const throttledWordCountUpdate = useCallback((count) => {
        if (wordCountTimeoutRef.current) {
            clearTimeout(wordCountTimeoutRef.current);
        }

        wordCountTimeoutRef.current = setTimeout(() => {
            if (count !== lastWordCount.current && onWordCountUpdate) {
                lastWordCount.current = count;
                onWordCountUpdate(count);
            }
        }, 3000); // 3 second debounce
    }, [onWordCountUpdate]);

    // Load auto-saved content on component mount
    useEffect(() => {
        if (isEditing && chapter._id) {
            const savedContent = localStorage.getItem(autoSaveKey);
            if (savedContent) {
                try {
                    const parsedContent = JSON.parse(savedContent);
                    const savedTime = new Date(parsedContent.timestamp);
                    const chapterUpdatedTime = new Date(chapter.updatedAt || 0);

                    const ageHours = (Date.now() - savedTime.getTime()) / (1000 * 60 * 60);
                    const isTooOld = ageHours > AUTO_SAVE_EXPIRY_HOURS;

                    if (savedTime > chapterUpdatedTime && !isTooOld) {
                        setAutoSaveStatus('Nội dung đã lưu tự động được khôi phục');
                        setTimeout(() => setAutoSaveStatus(''), 3000);

                        restoredContentRef.current = parsedContent;

                        if (parsedContent.content && setEditedContent) {
                            // Convert HTML back to [valnote_X] format for editing
                            const convertedContent = convertHTMLToFootnotes(parsedContent.content);
                            setEditedContent(prev => ({
                                ...prev,
                                content: convertedContent,
                                footnotes: parsedContent.footnotes || []
                            }));
                        }

                        if (parsedContent.title && setEditedTitle) {
                            setEditedTitle(parsedContent.title);
                        }

                        if (parsedContent.mode) {
                            setEditedMode(parsedContent.mode);
                        }

                        if (parsedContent.chapterBalance !== undefined) {
                            setEditedChapterBalance(parsedContent.chapterBalance);
                        }
                    } else if (isTooOld) {
                        localStorage.removeItem(autoSaveKey);
                    } else {
                        localStorage.removeItem(autoSaveKey);
                    }
                } catch (error) {
                    localStorage.removeItem(autoSaveKey);
                }
            }
        }
    }, [isEditing, chapter._id, chapter.updatedAt, autoSaveKey, setEditedContent, setEditedTitle, convertHTMLToFootnotes]);

    // Auto-save function using refs
    const autoSaveRef = useRef();
    autoSaveRef.current = () => {
        if (!isEditing || !chapter._id) {
            return;
        }

        try {
            // Update word count during auto-save
            let currentWordCount = 0;
            if (editorRef.current && editorRef.current.plugins && editorRef.current.plugins.wordcount) {
                currentWordCount = editorRef.current.plugins.wordcount.getCount();
                if (currentWordCount !== lastWordCount.current && onWordCountUpdate) {
                    lastWordCount.current = currentWordCount;
                    onWordCountUpdate(currentWordCount);
                }
            }

            const currentData = autoSaveDataRef.current;
            const currentContent = currentData.getContent();

            // Convert [valnote_X] to HTML for storage
            const htmlContent = convertFootnotesToHTML(currentContent);

            const dataToSave = {
                content: htmlContent,
                title: currentData.title,
                footnotes: currentData.footnotes,
                mode: currentData.mode,
                chapterBalance: currentData.chapterBalance,
                wordCount: currentWordCount,
                timestamp: new Date().toISOString(),
                chapterId: chapter._id
            };

            localStorage.setItem(autoSaveKey, JSON.stringify(dataToSave));

            startTransition(() => {
                setLastSaved(new Date());
                setAutoSaveStatus('Đã tự động lưu');
            });

            setTimeout(() => {
                startTransition(() => {
                    setAutoSaveStatus('');
                });
            }, 2000);
        } catch (error) {
            console.error('Auto-save error:', error);
        }
    };

    const autoSave = useCallback(() => {
        if (autoSaveRef.current) {
            autoSaveRef.current();
        }
    }, []);

    // Store current values in refs for auto-save access
    const autoSaveDataRef = useRef();
    autoSaveDataRef.current = {
        getContent: () => {
            if (editorRef.current && editorRef.current.getContent) {
                return editorRef.current.getContent();
            }
            return editedContent?.content || '';
        },
        title: editedTitle || '',
        footnotes: localFootnotes || [],
        mode: editedMode,
        chapterBalance: editedChapterBalance
    };

    // Store chapter content for TinyMCE setup
    useEffect(() => {
        if (isEditing && chapter?.content) {
            // Convert any existing old footnote formats to [valnote_X] format for editing
            let convertedContent = chapter.content;

            // Convert CSS classes back to inline styles for TinyMCE editing
            convertedContent = convertClassesToInlineStyles(convertedContent);

            // Convert old format: <sup class="footnote-marker" data-footnote="1">[1]</sup> → [valnote_1]
            convertedContent = convertedContent.replace(
                /<sup class="footnote-marker" data-footnote="(\w+)">\[[\w\d]+\]<\/sup>/g,
                '[valnote_$1]'
            );

            // Convert any other old footnote formats
            convertedContent = convertedContent.replace(
                /<sup[^>]*data-footnote="(\w+)"[^>]*>\[[\w\d]+\]<\/sup>/g,
                '[valnote_$1]'
            );

            // Final conversion using our helper function
            convertedContent = convertHTMLToFootnotes(convertedContent);

            window.currentChapterContent = convertedContent;
            window.currentEditedContent = editedContent?.content || '';

            window.updateChapterWordCount = (count) => {
                throttledWordCountUpdate(count);
            };
        }

        return () => {
            delete window.currentChapterContent;
            delete window.currentEditedContent;
            delete window.updateChapterWordCount;
        };
    }, [isEditing, chapter?.content, editedContent?.content, convertHTMLToFootnotes, convertClassesToInlineStyles, throttledWordCountUpdate]);

    // Optimized auto-save with dynamic intervals
    const lastAutoSaveContentRef = useRef('');

    useEffect(() => {
        if (!isEditing) return;

        if (isLoadingRestoredContent.current) {
            return;
        }

        const checkInterval = setInterval(() => {
            const currentContent = autoSaveDataRef.current.getContent();

            // Lazy content comparison - length first
            if (currentContent.length !== lastAutoSaveContentRef.current.length ||
                currentContent !== lastAutoSaveContentRef.current) {

                lastAutoSaveContentRef.current = currentContent;

                if (autoSaveTimeoutRef.current) {
                    clearTimeout(autoSaveTimeoutRef.current);
                }

                const autoSaveDelay = 20000; // 20 seconds

                autoSaveTimeoutRef.current = setTimeout(() => {
                    autoSave();
                }, autoSaveDelay);
            }


            if (currentContent.length !== lastReactSyncContentRef.current.length ||
                currentContent !== lastReactSyncContentRef.current) {
                lastReactSyncContentRef.current = currentContent;

                if (setEditedContent) {
                    startTransition(() => {
                        setEditedContent(prev => ({
                            ...prev,
                            content: currentContent
                        }));
                    });
                }
            }
        }, 20000); // Reduced from 10s to 15s base interval

        return () => {
            clearInterval(checkInterval);
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [isEditing, autoSave, setEditedContent]);

    // Clear auto-save function
    const clearAutoSave = useCallback(() => {
        localStorage.removeItem(autoSaveKey);
        setAutoSaveStatus('');
        setLastSaved(null);
    }, [autoSaveKey]);

    // Expose clearAutoSave to parent component
    useEffect(() => {
        if (isEditing && chapter._id) {
            window[`clearAutoSave_${chapter._id}`] = clearAutoSave;
            return () => {
                delete window[`clearAutoSave_${chapter._id}`];
            };
        }
    }, [isEditing, chapter._id, clearAutoSave]);

    // Handle network errors
    const handleNetworkError = useCallback((error) => {
        let errorMessage = 'Network Error';

        if (error.message === 'Failed to fetch') {
            errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Kết nối bị timeout. Vui lòng thử lại.';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        setNetworkError(errorMessage);

        setTimeout(() => {
            setNetworkError('');
        }, 5000);

        if (onNetworkError) {
            onNetworkError(error);
        }
    }, [onNetworkError]);

    // Enhanced save operation with retry logic
    const handleSaveWithRetry = useCallback(async (saveFunction, maxRetries = 3) => {
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                }

                try {
                    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                    const tokenExp = tokenPayload.exp * 1000;
                    const now = Date.now();

                    if (tokenExp <= now) {
                        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                    }

                    if (tokenExp - now < 300000) {
                        setNetworkError('Phiên đăng nhập sắp hết hạn. Vui lòng lưu và đăng nhập lại.');
                    }
                } catch (tokenError) {
                    throw new Error('Token không hợp lệ. Vui lòng đăng nhập lại.');
                }

                if (!navigator.onLine) {
                    throw new Error('Không có kết nối internet. Vui lòng kiểm tra kết nối mạng.');
                }

                const result = await saveFunction();

                clearAutoSave();
                setNetworkError('');

                return result;

            } catch (error) {
                attempt++;

                const isRetryableError =
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('NetworkError') ||
                    error.message.includes('timeout') ||
                    error.status >= 500;

                if (isRetryableError && attempt < maxRetries) {
                    setNetworkError(`Lưu thất bại (lần thử ${attempt}/${maxRetries}). Đang thử lại...`);

                    const delay = Math.pow(2, attempt - 1) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));

                    continue;
                }

                const finalError = attempt >= maxRetries
                    ? `Lưu thất bại sau ${maxRetries} lần thử. Nội dung đã được tự động lưu. ${error.message}`
                    : error.message;

                handleNetworkError(new Error(finalError));
                throw error;
            }
        }
    }, [clearAutoSave, handleNetworkError]);

    // Expose enhanced save function
    useEffect(() => {
        if (isEditing && chapter._id) {
            window[`saveWithRetry_${chapter._id}`] = handleSaveWithRetry;
            return () => {
                delete window[`saveWithRetry_${chapter._id}`];
            };
        }
    }, [isEditing, chapter._id, handleSaveWithRetry]);

    // Manual auto-save trigger
    const triggerManualAutoSave = useCallback(() => {
        autoSave();
        setAutoSaveStatus('Đã lưu thủ công');
        setTimeout(() => setAutoSaveStatus(''), 2000);
    }, [autoSave]);

    // Check for unsaved changes
    const hasUnsavedChanges = useMemo(() => {
        const currentContent = editedContent?.content || '';
        const currentTitle = editedTitle || '';
        const originalContent = chapter.content || '';
        const originalTitle = chapter.title || '';

        return currentContent !== originalContent ||
            currentTitle !== originalTitle ||
            localFootnotes.length !== (chapter.footnotes || []).length ||
            editedMode !== (chapter.mode || 'published');
    }, [editedContent?.content, editedTitle, chapter.content, chapter.title, localFootnotes.length, chapter.footnotes?.length, editedMode, chapter.mode]);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        if (!isEditing) return;

        const handleBeforeUnload = (event) => {
            if (hasUnsavedChanges) {
                const message = 'Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời khỏi trang này?';
                event.preventDefault();
                event.returnValue = message;
                return message;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isEditing, hasUnsavedChanges]);

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            if (wordCountTimeoutRef.current) {
                clearTimeout(wordCountTimeoutRef.current);
            }
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, []);

    // Reset editor reference when exiting edit mode
    useEffect(() => {
        if (!isEditing && editorRef.current) {
            editorRef.current = null;
        }
    }, [isEditing]);

    // Expose utility methods to parent component
    useEffect(() => {
        if (isEditing && chapter._id) {
            window[`chapterUtils_${chapter._id}`] = {
                triggerManualAutoSave,
                hasUnsavedChanges,
                clearAutoSave,
                getAutoSaveStatus: () => autoSaveStatus,
                getLastSaved: () => lastSaved
            };

            return () => {
                delete window[`chapterUtils_${chapter._id}`];
            };
        }
    }, [isEditing, chapter._id, triggerManualAutoSave, hasUnsavedChanges, clearAutoSave, autoSaveStatus, lastSaved]);

    // Effect to handle when module becomes paid
    useEffect(() => {
        if (isModulePaid && editedMode === 'paid') {
            setEditedMode('published');
            setEditedChapterBalance(0);
            setModeError('Chương đã được chuyển về chế độ công khai vì tập hiện tại đã ở chế độ trả phí.');
        }
    }, [isModulePaid, editedMode]);

    // Initialize localFootnotes when entering edit mode
    useEffect(() => {
        if (isEditing) {
            const footnotes = (editedContent?.footnotes || chapter.footnotes || []);
            const currentIds = new Set(localFootnotes.map(f => f.id));
            const newIds = new Set(footnotes.map(f => f.id));

            if (localFootnotes.length > 0 && footnotes.length < localFootnotes.length) {
                return;
            }

            const hasChanged = footnotes.length !== localFootnotes.length ||
                footnotes.some(f => !currentIds.has(f.id)) ||
                localFootnotes.some(f => !newIds.has(f.id));

            if (hasChanged) {
                const existingIds = footnotes.map(f => {
                    const name = f.name || f.id.toString();
                    const match = name.match(/\d+/);
                    return match ? parseInt(match[0]) : f.id;
                });
                const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

                setLocalFootnotes(footnotes);
                setNextFootnoteId(nextId);
            }
        }
    }, [isEditing, chapter.footnotes, editedContent?.footnotes, localFootnotes]);

    // Update parent's editedContent when footnotes change
    useEffect(() => {
        if (isEditing && setEditedContent) {
            const currentFootnotes = editedContent?.footnotes || [];

            // Skip sync if localFootnotes is smaller (during deletion)
            if (localFootnotes.length < currentFootnotes.length) {
                return;
            }

            const hasChanged = localFootnotes.length !== currentFootnotes.length ||
                localFootnotes.some((f, i) =>
                    !currentFootnotes[i] ||
                    f.id !== currentFootnotes[i]?.id ||
                    f.content !== currentFootnotes[i]?.content
                );

            if (hasChanged) {
                setEditedContent(prev => ({
                    ...prev,
                    footnotes: localFootnotes
                }));
            }
        }
    }, [localFootnotes, isEditing, setEditedContent, editedContent?.footnotes]);

    // Initialize editedTitle when entering edit mode
    useEffect(() => {
        if (isEditing && chapter && editedTitle === '') {
            setEditedTitle(chapter.title || '');
        }

        if (isEditing && chapter) {
            setEditedChapterBalance(chapter.chapterBalance || 0);
        }
        
        // Set staff values when entering edit mode - prioritize existing chapter staff over novel defaults
        if (isEditing && novelData?.active) {
            const {active} = novelData;
            
            // Helper function to find matching staff value in novel's active staff
            const findMatchingStaffValue = (chapterStaff, activeStaffArray) => {
                if (!chapterStaff || !activeStaffArray?.length) return null;
                
                const chapterStaffId = typeof chapterStaff === 'object' ? 
                    (chapterStaff._id || chapterStaff.userNumber || chapterStaff) : 
                    chapterStaff;
                
                // Find matching staff member in active array
                const matchingStaff = activeStaffArray.find(staff => {
                    if (typeof staff === 'object') {
                        const staffId = staff._id;
                        const staffUserNumber = staff.userNumber;
                        const staffDisplayName = staff.displayName;
                        const staffUsername = staff.username;
                        
                        // Check all possible matching fields
                        return chapterStaffId === staffId || 
                               chapterStaffId === staffUserNumber || 
                               chapterStaffId === staffDisplayName ||
                               chapterStaffId === staffUsername ||
                               chapterStaffId.toString() === staffId?.toString() ||
                               chapterStaffId.toString() === staffUserNumber?.toString() ||
                               chapterStaffId.toString() === staffDisplayName?.toString() ||
                               chapterStaffId.toString() === staffUsername?.toString();
                    } else {
                        // Handle primitive values
                        return chapterStaffId === staff || chapterStaffId.toString() === staff?.toString();
                    }
                });
                
                if (matchingStaff) {
                    const value = typeof matchingStaff === 'object' ? 
                        (matchingStaff.userNumber || matchingStaff._id) : 
                        matchingStaff;
                    return value.toString();
                }
                
                return null;
            };
            
            // Set translator - first check chapter's existing value, then novel defaults
            if (!editedTranslator && setEditedTranslator) {
                if (chapter.translator) {
                    // Try to find matching value in active staff
                    const matchingValue = findMatchingStaffValue(chapter.translator, active.translator);
                    if (matchingValue) {
                        const stringValue = matchingValue.toString();
                        setEditedTranslator(stringValue);
                    } else {
                        // Use raw chapter value if no match found
                        const translatorValue = typeof chapter.translator === 'object' ? 
                            (chapter.translator.userNumber || chapter.translator._id) : 
                            chapter.translator;
                        setEditedTranslator(translatorValue);
                    }
                } else if (!active.translator?.length && novelData.author) {
                    // Vietnamese novel - use author as default
                    const authorValue = typeof novelData.author === 'object' ? 
                        (novelData.author.userNumber || novelData.author._id) : 
                        novelData.author;
                    setEditedTranslator(authorValue);
                } else if (active.translator?.length > 0) {
                    // Non-Vietnamese novel - use first translator as default
                    const firstTranslator = active.translator[0];
                    const translatorValue = typeof firstTranslator === 'object' ? 
                        (firstTranslator.userNumber || firstTranslator._id) : 
                        firstTranslator;
                    setEditedTranslator(translatorValue);
                }
            }
            
            // Set editor - first check chapter's existing value, then novel defaults
            if (!editedEditor && setEditedEditor) {
                if (chapter.editor) {
                    // Try to find matching value in active staff
                    const matchingValue = findMatchingStaffValue(chapter.editor, active.editor);
                    if (matchingValue) {
                        setEditedEditor(matchingValue);
                    } else {
                        // Use raw chapter value if no match found
                        const editorValue = typeof chapter.editor === 'object' ? 
                            (chapter.editor.userNumber || chapter.editor._id) : 
                            chapter.editor;
                        setEditedEditor(editorValue);
                    }
                } else if (active.editor?.length > 0) {
                    // Use novel's default editor
                    const firstEditor = active.editor[0];
                    const editorValue = typeof firstEditor === 'object' ? 
                        (firstEditor.userNumber || firstEditor._id) : 
                        firstEditor;
                    setEditedEditor(editorValue);
                }
            }
            
            // Set proofreader - first check chapter's existing value, then novel defaults
            if (!editedProofreader && setEditedProofreader) {
                if (chapter.proofreader) {
                    // Try to find matching value in active staff
                    const matchingValue = findMatchingStaffValue(chapter.proofreader, active.proofreader);
                    if (matchingValue) {
                        setEditedProofreader(matchingValue);
                    } else {
                        // Use raw chapter value if no match found
                        const proofreaderValue = typeof chapter.proofreader === 'object' ? 
                            (chapter.proofreader.userNumber || chapter.proofreader._id) : 
                            chapter.proofreader;
                        setEditedProofreader(proofreaderValue);
                    }
                } else if (active.proofreader?.length > 0) {
                    // Use novel's default proofreader
                    const firstProofreader = active.proofreader[0];
                    const proofreaderValue = typeof firstProofreader === 'object' ? 
                        (firstProofreader.userNumber || firstProofreader._id) : 
                        firstProofreader;
                    setEditedProofreader(proofreaderValue);
                }
            }
        }
    }, [isEditing, chapter, novelData]);

    // Update editedContent with mode and balance
    useEffect(() => {
        if (isEditing && setEditedContent) {
            setEditedContent(prev => ({
                ...prev,
                mode: editedMode,
                chapterBalance: editedMode === 'paid' ? (parseInt(editedChapterBalance) || 0) : 0
            }));
        }
    }, [isEditing, setEditedContent, editedMode, editedChapterBalance]);

    // Footnote click handler
    const handleFootnoteClick = (targetId) => {
        setTimeout(() => {
            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({behavior: 'smooth', block: 'center'});
                element.classList.add('highlight');
                setTimeout(() => {
                    element.classList.remove('highlight');
                }, 2000);
                if (window.location.hash !== `#${targetId}`) {
                    window.history.replaceState(null, null, `#${targetId}`);
                }
            }
        }, 50);
    };

    // Insert footnote marker at cursor position
    const insertFootnoteAtCursor = useCallback((footnoteName) => {
        if (!editorRef.current) return;
        const editor = editorRef.current;

        // Insert [valnote_X] at cursor position
        editor.insertContent(`[valnote_${footnoteName}]`);
        editor.focus(); // Keep focus on editor
    }, []);

    // Add footnote with smart numbering (fill gaps)
    const addFootnote = useCallback(() => {
        // Get all existing footnote numbers
        const existingNumbers = localFootnotes
            .map(f => {
                const name = f.name || f.id.toString();
                const match = name.match(/\d+/);
                return match ? parseInt(match[0]) : f.id;
            })
            .sort((a, b) => a - b);

        // Find the first gap or use next number
        let newNumber = 1;
        for (let i = 0; i < existingNumbers.length; i++) {
            if (existingNumbers[i] !== newNumber) {
                break; // Found a gap
            }
            newNumber++;
        }

        const newFootnoteId = Math.max(...localFootnotes.map(f => f.id).concat([0])) + 1;
        const newFootnoteName = newNumber.toString();

        // Add to footnotes list
        setLocalFootnotes(prev => [
            ...prev,
            {id: newFootnoteId, name: newFootnoteName, content: ''}
        ]);
        setNextFootnoteId(newFootnoteId + 1);

        // Auto-insert marker at cursor position
        insertFootnoteAtCursor(newFootnoteName);
    }, [localFootnotes, insertFootnoteAtCursor]);

    // Update footnote content with stability check
    const updateFootnote = useCallback((id, content) => {
        setLocalFootnotes(prev => {
            const existing = prev.find(f => f.id === id);
            if (existing && existing.content === content) {
                return prev; // No change needed
            }

            return prev.map(footnote =>
                footnote.id === id ? {...footnote, content} : footnote
            );
        });
    }, []);

    // Helper function to renumber footnotes
    const renumberFootnotes = useCallback((footnotes, content) => {
        // Sort footnotes by their current number
        const sortedFootnotes = [...footnotes].sort((a, b) => {
            const aNum = parseInt((a.name || a.id.toString()).match(/\d+/)?.[0] || a.id);
            const bNum = parseInt((b.name || b.id.toString()).match(/\d+/)?.[0] || b.id);
            return aNum - bNum;
        });

        // Create mapping and renumber
        let newContent = content;

        sortedFootnotes.forEach((footnote, index) => {
            const oldName = footnote.name || footnote.id.toString();
            const newName = (index + 1).toString();

            if (oldName !== newName) {
                // Update both [valnote_X] and HTML format markers
                const valnotePattern = new RegExp(`\\[valnote_${oldName}\\]`, 'g');
                const htmlPattern = new RegExp(`(<sup><a[^>]*href="#note-)${oldName}("[^>]*>\\[)${oldName}(\\]</a></sup>)`, 'g');

                // Replace both formats
                newContent = newContent.replace(valnotePattern, `[valnote_${newName}]`);
                newContent = newContent.replace(htmlPattern, `$1${newName}$2${newName}$3`);

                // Update footnote name
                footnote.name = newName;
            }
        });

        return {
            footnotes: sortedFootnotes,
            content: newContent
        };
    }, []);

    // Move footnote up/down - Proper bidirectional mapping
    const moveFootnote = useCallback((id, direction) => {
        if (!editorRef.current) return;

        const editor = editorRef.current;
        const currentIndex = localFootnotes.findIndex(f => f.id === id);

        if (currentIndex === -1) return;
        if (direction === 'up' && currentIndex === 0) return;
        if (direction === 'down' && currentIndex === localFootnotes.length - 1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const reorderedFootnotes = [...localFootnotes];

        // Get the two footnotes that will swap positions
        const footnote1 = reorderedFootnotes[currentIndex];
        const footnote2 = reorderedFootnotes[newIndex];

        const name1 = footnote1.name || footnote1.id.toString();
        const name2 = footnote2.name || footnote2.id.toString();

        // Swap footnotes in array
        [reorderedFootnotes[currentIndex], reorderedFootnotes[newIndex]] =
            [reorderedFootnotes[newIndex], reorderedFootnotes[currentIndex]];

        // Get current content
        let content = editor.getContent();

        // Use temporary placeholder to avoid conflicts during bidirectional swap
        const tempPlaceholder1 = `__TEMP_FOOTNOTE_${Date.now()}_1__`;
        const tempPlaceholder2 = `__TEMP_FOOTNOTE_${Date.now()}_2__`;

        // Step 1: Replace footnote1 markers with temp placeholder
        const pattern1 = new RegExp(`\\[valnote_${name1}\\]`, 'g');
        content = content.replace(pattern1, tempPlaceholder1);

        // Step 2: Replace footnote2 markers with temp placeholder
        const pattern2 = new RegExp(`\\[valnote_${name2}\\]`, 'g');
        content = content.replace(pattern2, tempPlaceholder2);

        // Step 3: Replace temp placeholders with swapped values
        content = content.replace(new RegExp(tempPlaceholder1, 'g'), `[valnote_${name2}]`);
        content = content.replace(new RegExp(tempPlaceholder2, 'g'), `[valnote_${name1}]`);

        // Update footnote names to match their new positions
        reorderedFootnotes[currentIndex].name = name1; // Keep original name for swapped position
        reorderedFootnotes[newIndex].name = name2;     // Keep original name for swapped position

        // Update editor and state
        editor.setContent(content);
        setLocalFootnotes(reorderedFootnotes);

        if (setEditedContent) {
            setEditedContent(current => ({
                ...current,
                content: content,
                footnotes: reorderedFootnotes
            }));
        }
    }, [localFootnotes, setEditedContent]);

    // Delete footnote with renumbering
    const deleteFootnote = useCallback((id) => {
        if (!editorRef.current) return;

        const editor = editorRef.current;
        const footnoteToDelete = localFootnotes.find(f => f.id === id);

        if (!footnoteToDelete) return;

        // Get current editor content
        let content = editor.getContent();

        // Remove footnote markers from content
        const footnoteName = footnoteToDelete.name || footnoteToDelete.id.toString();

        // Remove both [valnote_X] and HTML format markers
        const valnotePattern = new RegExp(`\\[valnote_${footnoteName}\\]`, 'g');
        const htmlPattern = new RegExp(`<sup><a[^>]*href="#note-${footnoteName}"[^>]*>\\[${footnoteName}\\]</a></sup>`, 'g');

        content = content.replace(valnotePattern, '');
        content = content.replace(htmlPattern, '');

        // Remove empty <sup></sup> tags that might be left behind
        content = content.replace(/<sup>\s*<\/sup>/g, '');

        // Remove footnote from list
        const updatedFootnotes = localFootnotes.filter(footnote => footnote.id !== id);

        // Renumber footnotes to maintain sequence
        const renumberedResult = renumberFootnotes(updatedFootnotes, content);
        const finalContent = renumberedResult.content;
        const finalFootnotes = renumberedResult.footnotes;

        // Update editor content
        editor.setContent(finalContent);

        // Update local state
        setLocalFootnotes(finalFootnotes);

        // Update parent state
        if (setEditedContent) {
            setEditedContent(current => ({
                ...current,
                content: finalContent,
                footnotes: finalFootnotes
            }));
        }
    }, [localFootnotes, setEditedContent, renumberFootnotes]);

    // Content click handler for footnote navigation and copy prevention
    useEffect(() => {
        const handleContentClick = (e) => {
            if (e.target.matches('.footnote-ref')) {
                e.preventDefault();
                const targetId = e.target.getAttribute('href').slice(1);
                handleFootnoteClick(targetId);
            }
        };

        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#note-') || hash.startsWith('#ref-')) {
                const targetId = hash.slice(1);
                handleFootnoteClick(targetId);
            }
        };

        // Prevent copy operations while keeping selection for accessibility
        const preventCopy = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };

        const preventContextMenu = (e) => {
            e.preventDefault();
            return false;
        };

        const preventKeyboardCopy = (e) => {
            // Prevent Ctrl+C, Ctrl+A, Ctrl+V, Ctrl+X
            if (e.ctrlKey && (e.key === 'c' || e.key === 'a' || e.key === 'v' || e.key === 'x')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            // Prevent F12 (developer tools)
            if (e.key === 'F12') {
                e.preventDefault();
                return false;
            }
        };

        if (contentRef.current && !isEditing) {
            const contentElement = contentRef.current;
            
            // Add event listeners to prevent copying
            contentElement.addEventListener('copy', preventCopy);
            contentElement.addEventListener('cut', preventCopy);
            contentElement.addEventListener('contextmenu', preventContextMenu);
            contentElement.addEventListener('keydown', preventKeyboardCopy);
            contentElement.addEventListener('click', handleContentClick);
        }

        window.addEventListener('hashchange', handleHashChange);
        
        // Also add global keyboard listener to prevent copy shortcuts
        if (!isEditing) {
            document.addEventListener('keydown', preventKeyboardCopy);
        }

        if (window.location.hash) {
            setTimeout(() => handleHashChange(), 100);
        }

        return () => {
            if (contentRef.current) {
                const contentElement = contentRef.current;
                contentElement.removeEventListener('copy', preventCopy);
                contentElement.removeEventListener('cut', preventCopy);
                contentElement.removeEventListener('contextmenu', preventContextMenu);
                contentElement.removeEventListener('keydown', preventKeyboardCopy);
                contentElement.removeEventListener('click', handleContentClick);
            }
            window.removeEventListener('hashchange', handleHashChange);
            if (!isEditing) {
                document.removeEventListener('keydown', preventKeyboardCopy);
            }
        };
    }, [isEditing]);

    // Handle hash navigation after re-renders
    useEffect(() => {
        if (!isEditing && window.location.hash) {
            const hash = window.location.hash;
            if (hash.startsWith('#note-') || hash.startsWith('#ref-')) {
                setTimeout(() => {
                    const targetId = hash.slice(1);
                    handleFootnoteClick(targetId);
                }, 200);
            }
        }
    }, [isEditing]);

    // Mode change handler
    const handleModeChange = useCallback((value) => {
        if (userRole === 'pj_user' && (originalMode === 'paid' || value === 'paid')) {
            setModeError('Bạn không có quyền thay đổi chế độ trả phí. Chỉ admin mới có thể thay đổi.');
            return;
        }

        if (value === 'paid' && isModulePaid) {
            setModeError('Không thể đặt chương thành trả phí trong tập đã trả phí. Tập trả phí đã bao gồm tất cả chương bên trong.');
            return;
        }

        setEditedMode(value);
        setModeError('');

        if (value !== 'paid') {
            setEditedChapterBalance(0);
        }
    }, [userRole, originalMode, isModulePaid]);

// Process content for display (with backward compatibility and spacing fixes)
    const processContent = (content) => {
        if (!content) return '';

        // OPTIMIZATION: Handle very long content more efficiently
        const isVeryLongContent = content.length > 300000; // 300KB+
        if (isVeryLongContent) {
            // For very long content, add a small delay to prevent UI blocking
            requestAnimationFrame(() => {
                // Content processing will continue normally
            });
        }

        try {
            const contentString = typeof content === 'object' ? JSON.stringify(content) : String(content);

            // BACKWARD COMPATIBILITY: Convert all footnote formats to new format
            let processedContent = contentString;

            // Convert old format first: <sup class="footnote-marker" data-footnote="1">[1]</sup> → [valnote_1]
            processedContent = processedContent.replace(
                /<sup class="footnote-marker" data-footnote="(\w+)">\[[\w\d]+\]<\/sup>/g,
                '[valnote_$1]'
            );

            // Convert any remaining old-style footnote markers
            processedContent = processedContent.replace(
                /<sup[^>]*data-footnote="(\w+)"[^>]*>\[[\w\d]+\]<\/sup>/g,
                '[valnote_$1]'
            );

            // Convert [valnote_X] to HTML footnote links with simple [X] display
            processedContent = processedContent.replace(
                /\[valnote_(\w+)\]/g,
                '<sup><a href="#note-$1" id="ref-$1" class="footnote-ref" data-footnote="$1">[$1]</a></sup>'
            );

            // Fix inconsistent HTML footnotes - ensure all footnote references have proper id attributes
            // Pattern 1: Standard format without id attribute
            processedContent = processedContent.replace(
                /<sup><a href="#note-(\w+)" class="footnote-ref" data-footnote="\1">\[(\w+)\]<\/a><\/sup>/g,
                '<sup><a href="#note-$1" id="ref-$1" class="footnote-ref" data-footnote="$1">[$2]</a></sup>'
            );

            // Pattern 2: Format with attributes in different order
            processedContent = processedContent.replace(
                /<sup><a href="#note-(\w+)" data-footnote="\1" class="footnote-ref">\[(\w+)\]<\/a><\/sup>/g,
                '<sup><a href="#note-$1" id="ref-$1" class="footnote-ref" data-footnote="$1">[$2]</a></sup>'
            );

            // Pattern 3: Format with only href and data-footnote
            processedContent = processedContent.replace(
                /<sup><a href="#note-(\w+)" data-footnote="\1">\[(\w+)\]<\/a><\/sup>/g,
                '<sup><a href="#note-$1" id="ref-$1" class="footnote-ref" data-footnote="$1">[$2]</a></sup>'
            );

            // Process <pre> tags and convert them to styled div containers
            processedContent = processedContent.replace(
                /<pre([^>]*)>([\s\S]*?)<\/pre>/gi,
                (match, attributes, content) => {
                    // Clean and process the content inside pre tag
                    let preContent = content;

                    // Remove excessive whitespace but preserve line breaks
                    preContent = preContent.replace(/\n\s*\n/g, '\n');

                    // Escape any remaining HTML entities properly
                    preContent = preContent
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'");

                    // Convert line breaks to <br> tags for proper display in div
                    preContent = preContent.replace(/\n/g, '<br>');

                    // Create styled div with blue border and background
                    const divStyle = `
                    border: 3px solid #2196f3;
                    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                    padding: 15px;
                    margin: 15px 0;
                    border-radius: 8px;
                    font-family: 'Courier New', Consolas, monospace;
                    font-size: 14px;
                    line-height: 1.6;
                    color: #1565c0;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    box-shadow: 0 2px 4px rgba(33, 150, 243, 0.2);
                `.replace(/\s+/g, ' ').trim();

                    // Return as a styled div instead of pre tag
                    return `<div style="${divStyle}" class="chapter-pre-content">${preContent}</div>`;
                }
            );

            // Clean up paragraphs with meaningless styled content (SPACING FIX)
            processedContent = processedContent.replace(
                /<p[^>]*>\s*<span[^>]*>\s*<\/span>\s*<\/p>/gi,
                ''
            );

            // Remove paragraphs containing only styled elements with whitespace/empty content
            processedContent = processedContent.replace(
                /<p[^>]*>\s*<b[^>]*style="[^"]*font-weight:\s*normal[^"]*"[^>]*>\s*<\/b>\s*<\/p>/gi,
                ''
            );

            // Remove paragraphs containing other meaningless styled elements
            processedContent = processedContent.replace(
                /<p[^>]*>\s*<[^>]+[^>]*>\s*<\/[^>]+>\s*<\/p>/gi,
                (match) => {
                    // Only remove if the inner content is just whitespace
                    const innerContent = match.replace(/<[^>]*>/g, '').trim();
                    return innerContent === '' ? '' : match;
                }
            );

            // Remove paragraphs that only contain &nbsp; or whitespace, but keep truly empty <p></p>
            processedContent = processedContent.replace(
                /<p[^>]*>\s*(&nbsp;|\u00A0)+\s*<\/p>/gi,
                ''
            );

            // Convert br tags to paragraph breaks
            processedContent = processedContent.replace(/<br\s*\/?>/gi, '<br>');

            if (processedContent.includes('<br>')) {
                let parts = processedContent.split(/<br>/gi);
                parts = parts.map(part => {
                    let trimmed = part.trim();
                    if (trimmed && !trimmed.match(/^<\/?p/i)) {
                        return `<p>${trimmed}</p>`;
                    }
                    return trimmed;
                }).filter(part => part.length > 0);

                processedContent = parts.join('');
            }

            // Handle span styles and colors - Completely remove problematic styles
            processedContent = processedContent.replace(
                /<span[^>]*style="([^"]*)"[^>]*>/gi,
                (match, styleContent) => {
                    const classes = [];
                    let preservedStyles = '';

                    if (/font-weight:\s*bold/i.test(styleContent)) {
                        classes.push('text-bold');
                    }

                    if (/font-style:\s*italic/i.test(styleContent)) {
                        classes.push('text-italic');
                    }

                    if (/text-decoration:\s*underline/i.test(styleContent)) {
                        classes.push('text-underline');
                    }

                    // Only keep essential colors, remove all problematic styles
                    const colorMatch = styleContent.match(/color:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-zA-Z]+)/i);
                    if (colorMatch) {
                        const colorValue = colorMatch[1].toLowerCase();

                        const isIntentionalColor = !['#000000', '#000', 'black', 'rgb(0, 0, 0)', 'rgb(0,0,0)',
                            '#333333', '#333', '#666666', '#666', '#999999', '#999'].includes(colorValue);

                        if (isIntentionalColor) {
                            const hexColor = convertToHex(colorValue);
                            if (hexColor && !hexColor.match(/#[0-3]{6}/)) {
                                classes.push(`text-color-${hexColor.replace('#', '')}`);
                                preservedStyles += `color: ${colorValue};`;
                            } else {
                                classes.push('text-default-color');
                            }
                        } else {
                            classes.push('text-default-color');
                        }
                    } else {
                        classes.push('text-default-color');
                    }

                    // Handle background-color for spans
                    const backgroundColorMatch = styleContent.match(/background-color:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-zA-Z]+)/i);
                    if (backgroundColorMatch) {
                        const backgroundColorValue = backgroundColorMatch[1];
                        preservedStyles += `background-color: ${backgroundColorValue};`;
                    }

                    // Remove ALL problematic auto-generated styles
                    const problematicStyles = [
                        'font-style', 'font-variant-caps', 'font-weight', 'letter-spacing',
                        'orphans', 'text-align', 'text-indent', 'text-transform', 'white-space',
                        'widows', 'word-spacing', '-webkit-tap-highlight-color', '-webkit-text-size-adjust',
                        '-webkit-text-stroke-width', 'text-decoration', 'caret-color', 'font-family',
                        'font-size', 'line-height', 'margin', 'padding', 'margin-top', 'margin-bottom'
                    ];

                    problematicStyles.forEach(prop => {
                        const regex = new RegExp(`${prop}[^;]*;?`, 'gi');
                        preservedStyles = preservedStyles.replace(regex, '');
                    });

                    preservedStyles = preservedStyles.trim().replace(/;+$/, '');

                    const classStr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
                    const styleStr = preservedStyles ? ` style="${preservedStyles}"` : '';

                    return `<span${classStr}${styleStr}>`;
                }
            );

            // Handle paragraph styles
            processedContent = processedContent.replace(
                /<p[^>]*style="([^"]*)"[^>]*>/gi,
                (match, styleContent) => {
                    const classes = [];
                    let preservedStyles = '';

                    // Only keep text alignment
                    if (/text-align:\s*center/i.test(styleContent)) {
                        classes.push('text-center');
                        preservedStyles += 'text-align: center;';
                    } else if (/text-align:\s*right/i.test(styleContent)) {
                        classes.push('text-right');
                        preservedStyles += 'text-align: right;';
                    } else if (/text-align:\s*left/i.test(styleContent)) {
                        classes.push('text-left');
                        preservedStyles += 'text-align: left;';
                    }

                    // Handle color the same way as spans
                    const colorMatch = styleContent.match(/color:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-zA-Z]+)/i);
                    if (colorMatch) {
                        const colorValue = colorMatch[1].toLowerCase();

                        const isIntentionalColor = !['#000000', '#000', 'black', 'rgb(0, 0, 0)', 'rgb(0,0,0)',
                            '#333333', '#333', '#666666', '#666', '#999999', '#999'].includes(colorValue);

                        if (isIntentionalColor) {
                            const hexColor = convertToHex(colorValue);
                            if (hexColor && !hexColor.match(/#[0-3]{6}/)) {
                                classes.push(`text-color-${hexColor.replace('#', '')}`);
                                preservedStyles += `color: ${colorValue};`;
                            } else {
                                classes.push('text-default-color');
                            }
                        } else {
                            classes.push('text-default-color');
                        }
                    } else {
                        classes.push('text-default-color');
                    }

                    // Handle background-color
                    const backgroundColorMatch = styleContent.match(/background-color:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-zA-Z]+)/i);
                    if (backgroundColorMatch) {
                        const backgroundColorValue = backgroundColorMatch[1];
                        preservedStyles += `background-color: ${backgroundColorValue};`;
                    }

                    // Remove ALL other problematic styles (ENHANCED FOR SPACING)
                    const problematicStyles = [
                        'font-style', 'font-variant-caps', 'font-weight', 'letter-spacing',
                        'orphans', 'text-indent', 'text-transform', 'white-space',
                        'widows', 'word-spacing', '-webkit-tap-highlight-color', '-webkit-text-size-adjust',
                        '-webkit-text-stroke-width', 'text-decoration', 'caret-color', 'font-family',
                        'font-size', 'line-height', 'margin', 'padding', 'margin-top', 'margin-bottom'
                    ];

                    problematicStyles.forEach(prop => {
                        const regex = new RegExp(`${prop}[^;]*;?`, 'gi');
                        preservedStyles = preservedStyles.replace(regex, '');
                    });

                    preservedStyles = preservedStyles.trim().replace(/;+$/, '');

                    const classStr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
                    const styleStr = preservedStyles ? ` style="${preservedStyles}"` : '';

                    return `<p${classStr}${styleStr}>`;
                }
            );

            // Convert decorated containers
            processedContent = processedContent.replace(
                /<div\s+style="[^"]*(?:background[^"]*gradient|border[^"]*solid|box-shadow)[^"]*"[^>]*>/gi,
                '<div class="content-frame themed-container">'
            );

            // Convert fixed-width tables to responsive ones
            processedContent = processedContent.replace(
                /<table([^>]*?)width="(\d+)"([^>]*?)style="([^"]*?)width:\s*[\d.]+pt;?([^"]*?)"([^>]*?)>/gi,
                (match, beforeWidth, widthValue, afterWidth, beforeStyle, afterStyle, afterStyle2) => {
                    // Convert fixed pixel/point width to responsive percentage
                    let responsiveWidth = '90%';

                    const originalWidth = parseInt(widthValue);
                    if (originalWidth <= 400) {
                        responsiveWidth = '80%';
                    } else if (originalWidth <= 500) {
                        responsiveWidth = '85%';
                    } else if (originalWidth <= 600) {
                        responsiveWidth = '90%';
                    } else {
                        responsiveWidth = '95%';
                    }

                    let newStyle = beforeStyle + afterStyle;
                    newStyle = newStyle.replace(/width:\s*[\d.]+pt;?/gi, '');
                    newStyle = newStyle.replace(/width:\s*[\d.]+px;?/gi, '');
                    newStyle = newStyle.trim();

                    if (newStyle && !newStyle.endsWith(';')) {
                        newStyle += ';';
                    }
                    newStyle += ` width: ${responsiveWidth}; max-width: 100%;`;

                    return `<table${beforeWidth}${afterWidth} style="${newStyle}"${afterStyle2}>`;
                }
            );

            // Also handle tables with only style width (no width attribute)
            processedContent = processedContent.replace(
                /<table([^>]*?)style="([^"]*?)width:\s*[\d.]+pt;?([^"]*?)"([^>]*?)>/gi,
                (match, beforeStyle, styleStart, styleEnd, afterStyle) => {
                    let newStyle = styleStart + styleEnd;
                    newStyle = newStyle.replace(/width:\s*[\d.]+pt;?/gi, '');
                    newStyle = newStyle.replace(/width:\s*[\d.]+px;?/gi, '');
                    newStyle = newStyle.trim();

                    if (newStyle && !newStyle.endsWith(';')) {
                        newStyle += ';';
                    }
                    newStyle += ' width: 90%; max-width: 100%;';

                    return `<table${beforeStyle} style="${newStyle}"${afterStyle}>`;
                }
            );

            // Handle existing paragraphs
            if (processedContent.includes('<p')) {
                let finalContent = processedContent;

                // ENHANCED: Better empty paragraph cleanup (SPACING FIX)
                finalContent = finalContent.replace(
                    /<p(\s[^>]*)?>\s*<span[^>]*>\s*<\/span>\s*<\/p>/gi,
                    ''
                );
                finalContent = finalContent.replace(
                    /<p(\s[^>]*)?>\s*<span[^>]*>[\s\u00A0]*<\/span>\s*<\/p>/gi,
                    ''
                );

                // Remove paragraphs with meaningless styled content but keep truly empty <p></p>
                finalContent = finalContent.replace(
                    /<p(\s[^>]*)?>\s*<b[^>]*style="[^"]*font-weight:\s*normal[^"]*"[^>]*>[\s\u00A0]*<\/b>\s*<\/p>/gi,
                    ''
                );

                // Remove paragraphs that only contain &nbsp; but keep truly empty paragraphs
                finalContent = finalContent.replace(/<p(\s[^>]*)?>\s*(&nbsp;|\u00A0)+\s*<\/p>/gi, '');

                // ENHANCED: Handle Word document margin issues (SPACING FIX)
                finalContent = finalContent.replace(
                    /<p(\s[^>]*)?style="[^"]*margin-top:\s*0pt[^"]*margin-bottom:\s*0pt[^"]*"([^>]*)>/gi,
                    (match, beforeStyle, afterStyle) => {
                        // Remove the problematic margin styles
                        const cleanMatch = match.replace(/margin-top:\s*0pt;?/gi, '')
                            .replace(/margin-bottom:\s*0pt;?/gi, '');
                        return cleanMatch;
                    }
                );

                return DOMPurify.sanitize(finalContent, {
                    ADD_TAGS: ['sup', 'a', 'p', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'strong', 'em', 'u', 'i', 'b', 'table', 'tbody', 'tr', 'td', 'pre'],
                    ADD_ATTR: ['href', 'id', 'class', 'data-footnote', 'dir', 'style', 'width', 'valign', 'colspan', 'cellspacing', 'cellpadding', 'border', 'align'],
                    KEEP_CONTENT: false,
                    ALLOW_EMPTY_TAGS: ['p'], // Allow empty <p> tags for manual spacing
                });
            }

            // Fallback paragraph processing (ENHANCED FOR SPACING)
            let paragraphBlocks = processedContent
                .split(/(<br>\s*){2,}/gi)
                .filter(block => block !== undefined && !block.match(/^(<br>\s*)+$/i));

            if (paragraphBlocks.length <= 1) {
                paragraphBlocks = processedContent.split(/<br>/gi);
            }

            paragraphBlocks = paragraphBlocks
                .map(block => {
                    let trimmedBlock = block.trim();
                    trimmedBlock = trimmedBlock.replace(/^(<br>\s*)+|(<br>\s*)+$/gi, '');

                    // ENHANCED: Skip truly empty blocks (SPACING FIX)
                    if (!trimmedBlock || trimmedBlock.match(/^\s*(&nbsp;)?\s*$/)) {
                        return '';
                    }

                    if (!trimmedBlock.match(/^<(p|div|h[1-6]|blockquote|pre|ul|ol|li)/i)) {
                        return `<p class="text-default-color">${trimmedBlock}</p>`;
                    }
                    return trimmedBlock;
                })
                .filter(block => {
                    // Keep blocks that have content or are truly empty <p></p> tags
                    return block.length > 0 || block === '<p class="text-default-color"></p>';
                });

            let finalContent = paragraphBlocks.join('');

            if (paragraphBlocks.length === 0 && processedContent.trim()) {
                const cleanContent = processedContent.replace(/<br>/gi, ' ');
                finalContent = `<p class="text-default-color">${cleanContent}</p>`;
            }

            // ENHANCED: Final cleanup for spacing issues - remove paragraphs with only &nbsp; but keep truly empty <p></p>
            finalContent = finalContent.replace(/<p[^>]*>\s*(&nbsp;|\u00A0)+\s*<\/p>/gi, '');

            return DOMPurify.sanitize(finalContent, {
                ADD_TAGS: ['sup', 'a', 'p', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'strong', 'em', 'u', 'i', 'b', 'table', 'tbody', 'tr', 'td', 'pre'],
                ADD_ATTR: ['href', 'id', 'class', 'data-footnote', 'dir', 'style', 'width', 'valign', 'colspan', 'cellspacing', 'cellpadding', 'border', 'align'],
                KEEP_CONTENT: false,
                ALLOW_EMPTY_TAGS: ['p'], // Allow empty <p> tags for manual spacing
            });
        } catch (error) {
            console.error('Content processing error:', error);
            return 'Lỗi tải chương nội dung';
        }
    };

// Helper function to convert colors to hex
    const convertToHex = (color) => {
        if (color.startsWith('#')) {
            return color;
        }

        if (color.startsWith('rgb')) {
            const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
                const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
                const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
                return `#${r}${g}${b}`;
            }
        }

        const namedColors = {
            'red': '#ff0000',
            'blue': '#0000ff',
            'green': '#008000',
            'yellow': '#ffff00',
            'purple': '#800080',
            'orange': '#ffa500',
            'pink': '#ffc0cb',
            'brown': '#a52a2a',
            'gray': '#808080',
            'grey': '#808080'
        };

        return namedColors[color.toLowerCase()] || null;
    };

    // Track editor content for auto-save
    const lastEditorContentRef = useRef('');

    // TinyMCE callbacks
    const tinymceOnInit = useCallback((evt, editor) => {
        if (editorRef.current && editorRef.current !== editor) {
            return;
        }

        editorRef.current = editor;
    }, []);

    // Detect large content và switch mode
    const [isLargeContent, setIsLargeContent] = useState(false);
    const LARGE_CONTENT_THRESHOLD = 50000; // 50KB characters

    useEffect(() => {
        const contentLength = (editedContent?.content || chapter.content || '').length;
        setIsLargeContent(contentLength > LARGE_CONTENT_THRESHOLD);
    }, [editedContent?.content, chapter.content]);

    // Conditional onEditorChange
    const tinymceOnEditorChange = useCallback((content, editor) => {
        if (isLoadingRestoredContent.current || isLargeContent) {
            return; // Skip completely for large content
        }
        lastEditorContentRef.current = content;
    }, [isLargeContent]);

    // TinyMCE configuration
    const tinymceInitConfig = useMemo(() => ({
        script_src: config.tinymce.scriptPath,
        license_key: 'gpl',
        height: 500,
        menubar: false,
        entity_encoding: 'raw',
        encoding: 'html',
        convert_urls: false,
        verify_html: false,
        cleanup: false,
        remove_empty_elements: false,
        forced_root_block: 'p',
        plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount',
            'preview'
        ],
        toolbar: 'undo redo | formatselect | ' +
            'bold italic underline strikethrough | ' +
            'alignleft aligncenter alignright alignjustify | ' +
            'bullist numlist outdent indent | ' +
            'link image | code preview | wordcount | removeformat | help',
        contextmenu: 'cut copy paste | link image | inserttable | cell row column deletetable',
        content_style: `
      body { font-family:Helvetica,Arial,sans-serif; font-size:14px }
      .footnote-marker { color: #0066cc; cursor: pointer; }
      .footnote-marker:hover { text-decoration: underline; }
      em, i { font-style: italic; }
      strong, b { font-weight: bold; }
    `,
        setup: (editor) => {
            // Load content when editor is ready
            editor.on('init', () => {
                const restoredContent = restoredContentRef.current;
                let contentToLoad = '';

                if (restoredContent?.content) {
                    // Convert CSS classes back to inline styles for TinyMCE editing
                    contentToLoad = convertClassesToInlineStyles(restoredContent.content);
                    // Convert HTML back to [valnote_X] format for editing (with backward compatibility)
                    contentToLoad = convertHTMLToFootnotes(contentToLoad);
                } else if (window.currentEditedContent && window.currentEditedContent.trim()) {
                    contentToLoad = window.currentEditedContent;
                } else if (window.currentChapterContent) {
                    // Convert any existing content to [valnote_X] format for editing
                    contentToLoad = convertHTMLToFootnotes(window.currentChapterContent);
                }

                if (contentToLoad) {
                    isLoadingRestoredContent.current = true;

                    editor.setContent(contentToLoad);

                    setTimeout(() => {
                        const immediateCheck = editor.getContent();
                        if (immediateCheck.length === 0 && contentToLoad.length > 0) {
                            editor.setContent(contentToLoad);
                        }
                    }, 10);

                    lastEditorContentRef.current = contentToLoad;

                    setTimeout(() => {
                        isLoadingRestoredContent.current = false;
                        if (restoredContent) {
                            restoredContentRef.current = null;
                        }
                    }, 100);
                }

                // Initialize word count
                if (editor.plugins && editor.plugins.wordcount) {
                    setTimeout(() => {
                        const wordCount = editor.plugins.wordcount.getCount();
                        if (window.updateChapterWordCount) {
                            window.updateChapterWordCount(wordCount);
                        }
                    }, 300);
                }
            });
            if (!isLargeContent) {
                // Only enable heavy features for small content
                editor.on('compositionstart', () => {
                    isComposingRef.current = true;
                });
                editor.on('compositionend', () => {
                    isComposingRef.current = false;
                });
                // Handle paste to convert old footnote formats
                editor.on('paste', (e) => {
                    setTimeout(() => {
                        let content = editor.getContent();

                        // Convert any pasted old footnote formats to [valnote_X]
                        const originalContent = content;

                        // Convert old format markers
                        content = content.replace(
                            /<sup class="footnote-marker" data-footnote="(\w+)">\[[\w\d]+\]<\/sup>/g,
                            '[valnote_$1]'
                        );

                        content = content.replace(
                            /<sup[^>]*data-footnote="(\w+)"[^>]*>\[[\w\d]+\]<\/sup>/g,
                            '[valnote_$1]'
                        );

                        // Update editor if content changed
                        if (content !== originalContent) {
                            editor.setContent(content);
                        }
                    }, 100);
                });
            }
        },
        paste_data_images: true,
        paste_as_text: false,
        paste_auto_cleanup_on_paste: false,
        paste_remove_styles: false,
        paste_remove_spans: false,
        paste_strip_class_attributes: 'none',
        paste_merge_formats: false,
        paste_webkit_styles: 'all',
        content_css: [
            'default',
            'https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap'
        ],
        valid_elements: '*[*]',
        valid_children: '*[*]',
        extended_valid_elements: '*[*]',
        statusbar: true,
        resize: false,
        branding: false,
        promotion: false,
        images_upload_handler: (blobInfo) => {
            return new Promise((resolve, reject) => {
                const file = blobInfo.blob();
                
                // Check if this might be an existing image being reprocessed
                const filename = blobInfo.filename();
                const base64 = blobInfo.base64();
                
                // If no filename and no base64, this might be an existing image
                // Skip upload and return the blob URL for existing images
                if (!filename && !base64) {
                    resolve(blobInfo.blobUri());
                    return;
                }
                
                // Check if file has proper properties for upload
                if (!file || (file.size === 0 && !file.name && !file.type)) {
                    console.warn('Skipping upload for invalid file:', file);
                    resolve(blobInfo.blobUri());
                    return;
                }

                bunnyUploadService.uploadFile(file, 'illustrations')
                    .then(url => {
                        // Apply illustration class to uploaded images
                        const optimizedUrl = cdnConfig.getIllustrationUrl(url);
                        resolve(optimizedUrl);
                    })
                    .catch(error => {
                        console.error('Image upload error:', error);
                        handleNetworkError(error);
                        reject('Image upload failed');
                    });
            });
        },
        images_upload_base_path: '/',
        automatic_uploads: true
    }), [config.tinymce.scriptPath, convertHTMLToFootnotes, handleNetworkError]);

    return (
        <div className="chapter-card">
            <div className="chapter-header">
                <h2 className="chapter-title-banner">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            placeholder="Chapter Title"
                            className="chapter-title-banner-input"
                        />
                    ) : (
                        chapter.title
                    )}
                </h2>
                {canEdit && isEditing && (
                    <div className="chapter-controls">
                        <div className="chapter-controls-grid">
                            {/* Column 1: Mode Controls */}
                            <div className="control-column mode-column">
                                <label className="control-label">Chế độ chương:</label>
                                <div className="mode-dropdown-container">
                                    <select
                                        value={editedMode}
                                        onChange={(e) => handleModeChange(e.target.value)}
                                        className="mode-dropdown"
                                        disabled={userRole === 'pj_user' && (originalMode === 'paid' || editedMode === 'paid')}
                                        title={userRole === 'pj_user' && (originalMode === 'paid' || editedMode === 'paid') ? 
                                            'Bạn không thể thay đổi chế độ trả phí. Chỉ admin mới có thể thay đổi.' : ''}
                                    >
                                        <option value="published">{translateChapterModuleStatus('Published')} (Hiển thị cho tất
                                            cả)
                                        </option>
                                        <option value="draft">{translateChapterModuleStatus('Draft')} (Chỉ admin/mod)</option>
                                        <option value="protected">{translateChapterModuleStatus('Protected')} (Yêu cầu đăng nhập)
                                        </option>
                                        {(userRole === 'admin' || (userRole === 'pj_user' && (originalMode === 'paid' || editedMode === 'paid'))) && (
                                            <option value="paid" disabled={isModulePaid || (userRole === 'pj_user')}>
                                                {isModulePaid ? `${translateChapterModuleStatus('Paid')} (Không khả dụng - Tập đã trả phí)` : translateChapterModuleStatus('Paid')}
                                            </option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            {/* Column 2: Auto-save Status */}
                            <div className="control-column autosave-column">
                                {isEditing && (autoSaveStatus || lastSaved) && (
                                    <div className="auto-save-status">
                                        {autoSaveStatus && (
                                            <span className="auto-save-message">{autoSaveStatus}</span>
                                        )}
                                        {lastSaved && !autoSaveStatus && (
                                            <span className="last-saved">
                                                Lần cuối tự động lưu: {lastSaved.toLocaleTimeString('vi-VN')}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Column 3: Balance Info */}
                            <div className="control-column balance-column">
                                {editedMode === 'paid' && (
                                    <>
                                        <label className="control-label">Số lúa chương hiện tại:</label>
                                        {userRole === 'admin' ? (
                                            <div className="chapter-balance-input">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={editedChapterBalance}
                                                    onChange={(e) => setEditedChapterBalance(e.target.value)}
                                                    placeholder="Nhập số lúa chương (tối thiểu 1)"
                                                />
                                                <span className="balance-unit">🌾</span>
                                            </div>
                                        ) : (
                                            <div className="chapter-balance-display">
                                                {originalChapterBalance} 🌾 (Chỉ admin mới có thể thay đổi)
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Error Messages - Full Width */}
                        {modeError && (
                            <div className="mode-error">
                                {modeError}
                            </div>
                        )}

                        {networkError && (
                            <div className="network-error">
                                <span>{networkError}</span>
                                <button
                                    className="network-error-close-btn"
                                    onClick={() => setNetworkError('')}
                                    title="Đóng thông báo"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Staff Section */}
                {canEdit && isEditing && novelData && (
                    <div className="chapter-staff-section">
                        <h4>Nhân sự:</h4>
                        <div className="chapter-staff-controls">
                            {!novelData?.active?.translator?.length ? (
                                <>
                                    <div className="chapter-staff-group">
                                        <label>Tác giả:</label>
                                        <select
                                            className="chapter-staff-dropdown"
                                            value={editedTranslator || ''}
                                            onChange={(e) => setEditedTranslator && setEditedTranslator(e.target.value)}
                                        >
                                            <option value="">Không có</option>
                                            {novelData?.author && (
                                                <option value={typeof novelData.author === 'object' ? (novelData.author.userNumber || novelData.author._id) : novelData.author}>
                                                    {typeof novelData.author === 'object' ? (novelData.author.displayName || novelData.author.userNumber || novelData.author.username) : novelData.author}
                                                </option>
                                            )}
                                        </select>
                                    </div>

                                    <div className="chapter-staff-group">
                                        <label>Biên tập viên:</label>
                                        <select
                                            className="chapter-staff-dropdown"
                                            value={editedEditor || ''}
                                            onChange={(e) => setEditedEditor && setEditedEditor(e.target.value)}
                                        >
                                            <option value="">Không có</option>
                                            {novelData?.active?.editor?.map((staff, index) => {
                                                const staffValue = typeof staff === 'object' ? (staff.userNumber || staff._id) : staff;
                                                const staffDisplay = typeof staff === 'object' ? (staff.displayName || staff.userNumber || staff.username) : staff;
                                                return (
                                                    <option key={`editor-${index}`} value={staffValue}>
                                                        {staffDisplay}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div className="chapter-staff-group">
                                        <label>Hiệu đính:</label>
                                        <select
                                            className="chapter-staff-dropdown"
                                            value={editedProofreader || ''}
                                            onChange={(e) => setEditedProofreader && setEditedProofreader(e.target.value)}
                                        >
                                            <option value="">Không có</option>
                                            {novelData?.active?.proofreader?.map((staff, index) => {
                                                const staffValue = typeof staff === 'object' ? (staff.userNumber || staff._id) : staff;
                                                const staffDisplay = typeof staff === 'object' ? (staff.displayName || staff.userNumber || staff.username) : staff;
                                                return (
                                                    <option key={`proofreader-${index}`} value={staffValue}>
                                                        {staffDisplay}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="chapter-staff-group">
                                        <label>Dịch giả:</label>
                                        <select
                                            className="chapter-staff-dropdown"
                                            value={editedTranslator || ''}
                                            onChange={(e) => setEditedTranslator && setEditedTranslator(e.target.value)}
                                        >
                                            <option value="">Không có</option>
                                            {novelData?.active?.translator?.map((staff, index) => {
                                                const staffValue = (typeof staff === 'object' ? (staff.userNumber || staff._id) : staff).toString();
                                                const staffDisplay = typeof staff === 'object' ? (staff.displayName || staff.userNumber || staff.username) : staff;
                                                return (
                                                    <option key={`translator-${index}`} value={staffValue}>
                                                        {staffDisplay}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div className="chapter-staff-group">
                                        <label>Biên tập viên:</label>
                                        <select
                                            className="chapter-staff-dropdown"
                                            value={editedEditor || ''}
                                            onChange={(e) => setEditedEditor && setEditedEditor(e.target.value)}
                                        >
                                            <option value="">Không có</option>
                                            {novelData?.active?.editor?.map((staff, index) => {
                                                const staffValue = typeof staff === 'object' ? (staff.userNumber || staff._id) : staff;
                                                const staffDisplay = typeof staff === 'object' ? (staff.displayName || staff.userNumber || staff.username) : staff;
                                                return (
                                                    <option key={`editor-${index}`} value={staffValue}>
                                                        {staffDisplay}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div className="chapter-staff-group">
                                        <label>Hiệu đính:</label>
                                        <select
                                            className="chapter-staff-dropdown"
                                            value={editedProofreader || ''}
                                            onChange={(e) => setEditedProofreader && setEditedProofreader(e.target.value)}
                                        >
                                            <option value="">Không có</option>
                                            {novelData?.active?.proofreader?.map((staff, index) => {
                                                const staffValue = typeof staff === 'object' ? (staff.userNumber || staff._id) : staff;
                                                const staffDisplay = typeof staff === 'object' ? (staff.displayName || staff.userNumber || staff.username) : staff;
                                                return (
                                                    <option key={`proofreader-${index}`} value={staffValue}>
                                                        {staffDisplay}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isEditing ? (
                <>
                    <div className="chapter-content editor-container">
                        <Editor
                            onInit={tinymceOnInit}
                            value={undefined}
                            onEditorChange={tinymceOnEditorChange}
                            scriptLoading={{async: true, load: "domainBased"}}
                            onLoadError={(error) => {
                                console.error('TinyMCE failed to load:', error);
                            }}
                            init={tinymceInitConfig}
                        />
                        {canEdit && <input
                            type="hidden"
                            value={editedMode}
                            ref={(input) => {
                                if (input) {
                                    input.getMode = () => editedMode;
                                    input.getChapterBalance = () => editedMode === 'paid' ? (parseInt(editedChapterBalance) || 0) : 0;
                                }
                            }}
                        />}
                    </div>

                    {/* IMPROVED: Footnotes Section with Float Labels */}
                    <div className="footnote-section">
                        <h3>Chú thích</h3>
                        {localFootnotes.length > 0 ? (
                            <div className="footnote-list">
                                {localFootnotes.map((footnote) => (
                                    <div key={`footnote-${footnote.id}`} className="footnote-item-improved">
                                        <div className="footnote-input-container">
                      <textarea
                          value={footnote.content}
                          onChange={(e) => updateFootnote(footnote.id, e.target.value)}
                          className="footnote-textarea"
                          placeholder=" "
                          id={`footnote-${footnote.id}`}
                      />
                                            <label
                                                htmlFor={`footnote-${footnote.id}`}
                                                className="footnote-float-label"
                                            >
                                                [{footnote.name || footnote.id}]
                                            </label>
                                        </div>
                                        <div className="footnote-controls">
                                            <div className="footnote-move-controls">
                                                <button
                                                    type="button"
                                                    className="footnote-move-btn up"
                                                    onClick={() => moveFootnote(footnote.id, 'up')}
                                                    disabled={localFootnotes.findIndex(f => f.id === footnote.id) === 0}
                                                    title="Di chuyển lên"
                                                >
                                                    ▲
                                                </button>
                                                <button
                                                    type="button"
                                                    className="footnote-move-btn down"
                                                    onClick={() => moveFootnote(footnote.id, 'down')}
                                                    disabled={localFootnotes.findIndex(f => f.id === footnote.id) === localFootnotes.length - 1}
                                                    title="Di chuyển xuống"
                                                >
                                                    ▼
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                className="footnote-delete-btn"
                                                onClick={() => deleteFootnote(footnote.id)}
                                                title="Xóa chú thích"
                                            >
                                                <FontAwesomeIcon icon={faTrash}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="footnote-instructions">
                                <h4>Hướng dẫn sử dụng chú thích:</h4>
                                <ol>
                                    <li><strong>Thêm chú thích mới:</strong> Nhấn nút "Thêm chú thích" sẽ tự động tạo
                                        chú thích tại vị trí con trỏ trong editor; Hoặc gõ trực
                                        tiếp <code>[valnote_1]</code>, <code>[valnote_2]</code>... trong nội dung
                                        chương.
                                    </li>
                                    <li><strong>Thay đổi thứ tự:</strong> Sử dụng nút <strong>▲</strong> (lên)
                                        và <strong>▼</strong> (xuống) để thay đổi số thứ tự các chú thích.
                                    </li>
                                    <li><strong>Xóa chú thích:</strong> Nhấn nút xóa sẽ loại bỏ chú thích và tất cả
                                        marker liên quan trong nội dung.
                                    </li>
                                </ol>
                            </div>
                        )}

                        <button
                            type="button"
                            className="add-footnote-btn"
                            onClick={addFootnote}
                        >
                            <FontAwesomeIcon icon={faPlus}/> Thêm chú thích
                        </button>
                    </div>
                </>
            ) : (
                <div className="chapter-content-container">
                    <div
                        ref={contentRef}
                        className="chapter-content"
                        style={{
                            '--content-font-size': `${fontSize}px`,
                            '--content-font-family': fontFamily,
                            '--content-line-height': lineHeight,
                            '--content-margin-spacing': `${marginSpacing}px`,
                            fontSize: `${fontSize}px`,
                            fontFamily: fontFamily,
                            lineHeight: lineHeight,
                            padding: `15px ${marginSpacing}px`
                        }}
                        dangerouslySetInnerHTML={{__html: processContent(chapter.content || '')}}
                    />

                    {chapter.footnotes && chapter.footnotes.length > 0 && (
                        <ChapterFootnotes
                            footnotes={chapter.footnotes}
                            onFootnoteClick={handleFootnoteClick}
                        />
                    )}
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Fast comparison for most common changes
    if (prevProps.isEditing !== nextProps.isEditing ||
        prevProps.canEdit !== nextProps.canEdit ||
        prevProps.userRole !== nextProps.userRole ||
        prevProps.fontSize !== nextProps.fontSize ||
        prevProps.fontFamily !== nextProps.fontFamily ||
        prevProps.lineHeight !== nextProps.lineHeight ||
        prevProps.marginSpacing !== nextProps.marginSpacing) {
        return false;
    }

    if (prevProps.chapter._id !== nextProps.chapter._id ||
        prevProps.chapter.title !== nextProps.chapter.title ||
        prevProps.chapter.content !== nextProps.chapter.content ||
        prevProps.chapter.mode !== nextProps.chapter.mode) {
        return false;
    }

    if (nextProps.isEditing) {
        if (prevProps.editedContent?.content !== nextProps.editedContent?.content ||
            prevProps.editedTitle !== nextProps.editedTitle) {
            return false;
        }

        if (nextProps.canEdit &&
            (prevProps.editedTranslator !== nextProps.editedTranslator ||
                prevProps.editedEditor !== nextProps.editedEditor ||
                prevProps.editedProofreader !== nextProps.editedProofreader)) {
            return false;
        }
    }

    if (prevProps.moduleData?.mode !== nextProps.moduleData?.mode) {
        return false;
    }

    return true;
});

ChapterContent.propTypes = {
    chapter: PropTypes.shape({
        title: PropTypes.string.isRequired,
        content: PropTypes.string,
        mode: PropTypes.string,
        chapterBalance: PropTypes.number,
        footnotes: PropTypes.arrayOf(
            PropTypes.shape({
                id: PropTypes.number.isRequired,
                name: PropTypes.string,
                content: PropTypes.string.isRequired
            })
        )
    }).isRequired,
    isEditing: PropTypes.bool,
    editedContent: PropTypes.shape({
        title: PropTypes.string,
        content: PropTypes.string,
        chapterBalance: PropTypes.number,
        footnotes: PropTypes.arrayOf(
            PropTypes.shape({
                id: PropTypes.number.isRequired,
                name: PropTypes.string,
                content: PropTypes.string.isRequired
            })
        )
    }),
    setEditedContent: PropTypes.func,
    editedTitle: PropTypes.string,
    setEditedTitle: PropTypes.func,
    fontSize: PropTypes.number,
    fontFamily: PropTypes.string,
    lineHeight: PropTypes.string,
    marginSpacing: PropTypes.string,
    editorRef: PropTypes.object,
    onModeChange: PropTypes.func,
    canEdit: PropTypes.bool,
    userRole: PropTypes.string,
    moduleData: PropTypes.shape({
        mode: PropTypes.string
    }),
    onWordCountUpdate: PropTypes.func,
    editedTranslator: PropTypes.string,
    setEditedTranslator: PropTypes.func,
    editedEditor: PropTypes.string,
    setEditedEditor: PropTypes.func,
    editedProofreader: PropTypes.string,
    setEditedProofreader: PropTypes.func,
    novelData: PropTypes.shape({}),
    onNetworkError: PropTypes.func
};

export default ChapterContent;