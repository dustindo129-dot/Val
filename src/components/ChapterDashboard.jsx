/**
 * ChapterDashboard Component
 *
 * Admin interface for managing novel chapters including:
 * - Chapter listing and management
 * - Chapter creation and editing
 * - Chapter deletion
 * - Chapter reordering
 * - Chapter status management
 * - Staff assignment
 * - Footnote management
 *
 * Features:
 * - Status selection (published, draft, protected, paid)
 * - Staff assignment from novel's active staff
 * - Footnote creation and management
 * - Responsive design
 */

import React, {useState, useEffect, useRef, useCallback, startTransition} from 'react';
import {useParams, useNavigate, Link, useSearchParams} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import axios from 'axios';
import '../styles/components/ChapterDashboard.css';
import './chapter/ChapterFootnotes.css';
import config from '../config/config';
import {Editor} from '@tinymce/tinymce-react';
import {useQueryClient} from '@tanstack/react-query';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faSave, faTimes, faPlus, faTrash,
    faExclamationTriangle, faSpinner, faEdit
} from '@fortawesome/free-solid-svg-icons';
import bunnyUploadService from '../services/bunnyUploadService';
import LoadingSpinner from './LoadingSpinner';
import {createUniqueSlug, generateNovelUrl} from '../utils/slugUtils';
import {translateChapterModuleStatus} from '../utils/statusTranslation';
import DOMPurify from 'dompurify';

/**
 * ChapterDashboard Component
 *
 * Main component that provides administrative interface for managing
 * chapters of a novel with enhanced features
 */
const ChapterDashboard = () => {
    // Get novel ID from URL parameters and module ID from route params or query parameters
    const {novelId, moduleSlug: urlModuleSlug, chapterId} = useParams();
    const [searchParams] = useSearchParams();
    const queryModuleId = searchParams.get('moduleId');
    // Use moduleSlug from URL params first, then fall back to query params for backward compatibility
    const moduleSlugOrId = urlModuleSlug || queryModuleId;

    const {user} = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditMode = !!chapterId;

    // State management for novel data and form inputs
    const [novel, setNovel] = useState(null);
    const [module, setModule] = useState(null);
    const [resolvedNovelId, setResolvedNovelId] = useState(null);
    const [resolvedModuleId, setResolvedModuleId] = useState(null);
    const [chapterTitle, setChapterTitle] = useState('');
    const [chapterContent, setChapterContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [moduleError, setModuleError] = useState(false);

    // State for mode selection
    const [mode, setMode] = useState('published'); // Default to published
    const [chapterBalance, setChapterBalance] = useState(0);

    // State for staff selection
    const [translator, setTranslator] = useState('');
    const [editor, setEditor] = useState('');
    const [proofreader, setProofreader] = useState('');

    // Check if this is a Vietnamese novel (no active translators)
    const isVietnameseNovel = !novel?.novel?.active?.translator?.length;

    // State for footnotes
    const [footnotes, setFootnotes] = useState([]);
    const [nextFootnoteId, setNextFootnoteId] = useState(1);

    // Reference to the editor
    const editorRef = useRef(null);

    // Flag to track if component has finished initializing
    const isInitializedRef = useRef(false);

    // In-memory cache for pending module resolution promises to prevent duplicate API calls
    const pendingModuleResolutions = useRef(new Map());

    // Check if the current module is in paid mode
    const isModulePaid = module?.mode === 'paid';

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
            /<sup><a[^>]*href="#note-(\w+)"[^>]*>\[[\w\d]+\]<\/a><\/sup>/g,
            '[valnote_$1]'
        );

        // Convert any remaining <sup> footnote patterns to [valnote_X]
        processedContent = processedContent.replace(
            /<sup[^>]*data-footnote="(\w+)"[^>]*>\[[\w\d]+\]<\/sup>/g,
            '[valnote_$1]'
        );

        return processedContent;
    }, []);

    // Handle mode change with validation
    const handleModeChange = (e) => {
        const newMode = e.target.value;

        if (newMode === 'paid' && isModulePaid) {
            startTransition(() => {
                setError('Không thể đặt chương thành trả phí trong tập đã trả phí. Tập trả phí đã bao gồm tất cả chương bên trong.');
            });
            return;
        }

        startTransition(() => {
            setMode(newMode);
            setError(''); // Clear any previous errors
        });
    };

    // Effect to handle when module becomes paid - automatically change chapter mode
    useEffect(() => {
        if (isModulePaid && mode === 'paid') {
            startTransition(() => {
                setMode('published');
                setChapterBalance(0);
                setError('Chương đã được chuyển về chế độ công khai vì tập hiện tại đã ở chế độ trả phí.');
            });
        }
    }, [isModulePaid, mode]);

    // Insert footnote marker at cursor position using new valnote format
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
        const existingNumbers = footnotes
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

        const newFootnoteId = Math.max(...footnotes.map(f => f.id).concat([0])) + 1;
        const newFootnoteName = newNumber.toString();

        // Add to footnotes list
        setFootnotes(prev => [
            ...prev,
            {id: newFootnoteId, name: newFootnoteName, content: ''}
        ]);
        setNextFootnoteId(newFootnoteId + 1);

        // Auto-insert marker at cursor position
        insertFootnoteAtCursor(newFootnoteName);
    }, [footnotes, insertFootnoteAtCursor]);

    // Update footnote content with stability check
    const updateFootnote = useCallback((id, content) => {
        setFootnotes(prev => {
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
                const valnotePattern = new RegExp(`\\[valnote_${oldName}\\]`, 'g');
                newContent = newContent.replace(valnotePattern, `[valnote_${newName}]`);

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
        const currentIndex = footnotes.findIndex(f => f.id === id);

        if (currentIndex === -1) return;
        if (direction === 'up' && currentIndex === 0) return;
        if (direction === 'down' && currentIndex === footnotes.length - 1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const reorderedFootnotes = [...footnotes];

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
        setFootnotes(reorderedFootnotes);
    }, [footnotes]);

    // Delete footnote with renumbering
    const deleteFootnote = useCallback((id) => {
        if (!editorRef.current) return;

        const editor = editorRef.current;
        const footnoteToDelete = footnotes.find(f => f.id === id);

        if (!footnoteToDelete) return;

        // Get current editor content
        let content = editor.getContent();

        // Remove footnote markers from content
        const footnoteName = footnoteToDelete.name || footnoteToDelete.id.toString();

        // Remove both [valnote_X] and HTML format markers
        const valnotePattern = new RegExp(`\\[valnote_${footnoteName}\\]`, 'g');

        content = content.replace(valnotePattern, '');

        // Remove footnote from list
        const updatedFootnotes = footnotes.filter(footnote => footnote.id !== id);

        // Renumber footnotes to maintain sequence
        const renumberedResult = renumberFootnotes(updatedFootnotes, content);
        const finalContent = renumberedResult.content;
        const finalFootnotes = renumberedResult.footnotes;

        // Update editor content
        editor.setContent(finalContent);

        // Update local state
        setFootnotes(finalFootnotes);
    }, [footnotes, renumberFootnotes]);

    /**
     * Fetches novel and module data when component mounts
     */
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError('');
                setModuleError(false);

                // First resolve the novel ID from the slug
                const idResponse = await axios.get(`${config.backendUrl}/api/novels/slug/${novelId}`);
                const resolvedNovelId = idResponse.data.id;

                // Store the resolved novel ID in state
                setResolvedNovelId(resolvedNovelId);

                // Resolve module ID if needed (with enhanced deduplication to prevent duplicates)
                let actualModuleId = moduleSlugOrId;
                const moduleResolutionKey = `module_${moduleSlugOrId}`;

                if (moduleSlugOrId && !/^[0-9a-fA-F]{24}$/.test(moduleSlugOrId)) {
                    // Check if we've already resolved this module slug in this session
                    const cachedModuleId = sessionStorage.getItem(moduleResolutionKey);

                    if (cachedModuleId && /^[0-9a-fA-F]{24}$/.test(cachedModuleId)) {
                        // Use cached module ID to avoid duplicate API call
                        actualModuleId = cachedModuleId;
                        setResolvedModuleId(actualModuleId);
                    } else {
                        // Check if there's already a pending resolution for this module slug
                        let moduleResolutionPromise = pendingModuleResolutions.current.get(moduleSlugOrId);

                        if (!moduleResolutionPromise) {
                            // Create new resolution promise and cache it
                            moduleResolutionPromise = axios.get(`${config.backendUrl}/api/modules/slug/${moduleSlugOrId}`)
                                .then(response => {
                                    const resolvedId = response.data.id;
                                    // Cache the resolved module ID for this session
                                    sessionStorage.setItem(moduleResolutionKey, resolvedId);
                                    return resolvedId;
                                })
                                .catch(moduleErr => {
                                    console.error('Module resolution error:', moduleErr);
                                    throw moduleErr;
                                })
                                .finally(() => {
                                    // Clean up the pending promise after completion
                                    pendingModuleResolutions.current.delete(moduleSlugOrId);
                                });

                            // Store the promise to prevent duplicate requests
                            pendingModuleResolutions.current.set(moduleSlugOrId, moduleResolutionPromise);
                        }

                        try {
                            actualModuleId = await moduleResolutionPromise;
                            setResolvedModuleId(actualModuleId);
                        } catch (moduleErr) {
                            console.error('Module resolution error:', moduleErr);
                            setModuleError(true);
                            actualModuleId = null;
                        }
                    }
                } else if (moduleSlugOrId) {
                    // If it's already a valid MongoDB ID, store it
                    setResolvedModuleId(moduleSlugOrId);
                    actualModuleId = moduleSlugOrId;
                }

                // Use the new optimized dashboard endpoint that fetches all data in one request
                const dashboardUrl = `${config.backendUrl}/api/novels/${resolvedNovelId}/dashboard${actualModuleId ? `?moduleId=${actualModuleId}` : ''}`;
                const dashboardResponse = await axios.get(dashboardUrl);
                const dashboardData = dashboardResponse.data;

                // Set novel data
                setNovel(dashboardData);

                // Set default staff from active staff if available
                if (dashboardData.novel?.active && !isEditMode) {
                    const {active} = dashboardData.novel;

                    // For Vietnamese novels, set author as default translator
                    if (!active.translator?.length && dashboardData.novel.author) {
                        const authorValue = typeof dashboardData.novel.author === 'object' ? 
                            (dashboardData.novel.author.userNumber || dashboardData.novel.author._id) : 
                            dashboardData.novel.author;
                        setTranslator(authorValue);
                    } else {
                        // Set first translator as default for non-Vietnamese novels
                        if (active.translator?.length > 0) {
                            const firstTranslator = active.translator[0];
                            const translatorValue = typeof firstTranslator === 'object' ? 
                                (firstTranslator.userNumber || firstTranslator._id) : 
                                firstTranslator;
                            setTranslator(translatorValue);
                        }
                    }
                    
                    // Set first editor as default
                    if (active.editor?.length > 0) {
                        const firstEditor = active.editor[0];
                        const editorValue = typeof firstEditor === 'object' ? 
                            (firstEditor.userNumber || firstEditor._id) : 
                            firstEditor;
                        setEditor(editorValue);
                    }
                    
                    // Set first proofreader as default
                    if (active.proofreader?.length > 0) {
                        const firstProofreader = active.proofreader[0];
                        const proofreaderValue = typeof firstProofreader === 'object' ? 
                            (firstProofreader.userNumber || firstProofreader._id) : 
                            firstProofreader;
                        setProofreader(proofreaderValue);
                    }
                }

                // Set module data if available
                if (dashboardData.selectedModule) {
                    setModule(dashboardData.selectedModule);
                } else if (actualModuleId) {
                    // Find module from the modules list if selectedModule wasn't populated
                    const targetModule = dashboardData.modules?.find(m => m._id === actualModuleId);
                    if (targetModule) {
                        setModule(targetModule);
                    } else {
                        setModuleError(true);
                    }
                }

                // Initialize footnotes for new chapter creation
                if (!isEditMode) {
                    startTransition(() => {
                        setFootnotes([]);
                        setNextFootnoteId(1);
                        isInitializedRef.current = true;
                    });
                }

                // Fetch chapter data if in edit mode (call directly instead of via function reference)
                if (isEditMode && chapterId) {
                    try {
                        const response = await axios.get(`${config.backendUrl}/api/chapters/${chapterId}`);
                        const chapterData = response.data.chapter;

                        setChapterTitle(chapterData.title || '');
                        setChapterContent(chapterData.content || '');
                        setMode(chapterData.mode || 'published');
                        
                        // Set staff with defaults if not already assigned
                        const {active} = dashboardData.novel;
                        
                        // Set translator with default
                        if (chapterData.translator) {
                            setTranslator(chapterData.translator);
                        } else if (!active?.translator?.length && dashboardData.novel.author) {
                            // Vietnamese novel - use author as default
                            const authorValue = typeof dashboardData.novel.author === 'object' ? 
                                (dashboardData.novel.author.userNumber || dashboardData.novel.author._id) : 
                                dashboardData.novel.author;
                            setTranslator(authorValue);
                        } else if (active?.translator?.length > 0) {
                            // Non-Vietnamese novel - use first translator as default
                            const firstTranslator = active.translator[0];
                            const translatorValue = typeof firstTranslator === 'object' ? 
                                (firstTranslator.userNumber || firstTranslator._id) : 
                                firstTranslator;
                            setTranslator(translatorValue);
                        }
                        
                        // Set editor with default
                        if (chapterData.editor) {
                            setEditor(chapterData.editor);
                        } else if (active?.editor?.length > 0) {
                            const firstEditor = active.editor[0];
                            const editorValue = typeof firstEditor === 'object' ? 
                                (firstEditor.userNumber || firstEditor._id) : 
                                firstEditor;
                            setEditor(editorValue);
                        }
                        
                        // Set proofreader with default
                        if (chapterData.proofreader) {
                            setProofreader(chapterData.proofreader);
                        } else if (active?.proofreader?.length > 0) {
                            const firstProofreader = active.proofreader[0];
                            const proofreaderValue = typeof firstProofreader === 'object' ? 
                                (firstProofreader.userNumber || firstProofreader._id) : 
                                firstProofreader;
                            setProofreader(proofreaderValue);
                        }
                        
                        setChapterBalance(chapterData.chapterBalance || 0);

                        // Use existing footnotes from chapter data if available
                        if (chapterData.footnotes && Array.isArray(chapterData.footnotes)) {
                            startTransition(() => {
                                setFootnotes(chapterData.footnotes);

                                // Find the highest ID to set next footnote ID
                                const maxId = Math.max(...chapterData.footnotes.map(f => f.id), 0);
                                setNextFootnoteId(maxId + 1);

                                // Mark as initialized after footnote loading
                                isInitializedRef.current = true;
                            });
                        } else {
                            // If no footnotes in chapter data, start fresh
                            startTransition(() => {
                                setFootnotes([]);
                                setNextFootnoteId(1);

                                // Mark as initialized after footnote initialization
                                isInitializedRef.current = true;
                            });
                        }
                    } catch (err) {
                        console.error('Error loading chapter data:', err);
                        setError('Không thể tải dữ liệu chương. Vui lòng thử lại.');
                    }
                }
            } catch (err) {
                console.error('Data fetch error:', err);
                setError(err.message || 'Failed to fetch data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [novelId, moduleSlugOrId, isEditMode, chapterId]);

    // Reset initialization flag when leaving edit mode or changing chapters
    useEffect(() => {
        if (!isEditMode) {
            isInitializedRef.current = false;
        }
    }, [isEditMode, chapterId]);

    // Cleanup effect to clear pending promises on unmount
    useEffect(() => {
        return () => {
            // Clear any pending module resolution promises on unmount
            pendingModuleResolutions.current.clear();
        };
    }, []);

    // Provide access to current footnotes for TinyMCE editor
    useEffect(() => {
        window.getChapterDashboardFootnotes = () => footnotes;
        return () => {
            delete window.getChapterDashboardFootnotes;
        };
    }, [footnotes]);

    /**
     * Handles chapter form submission
     * Creates a new chapter or updates an existing one
     *
     * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        // Validate moduleSlugOrId
        if (!moduleSlugOrId) {
            startTransition(() => {
                setError('Không có module được chọn. Vui lòng chọn module trước.');
                setSaving(false);
            });
            return;
        }

        // Validate that we have a resolved module ID
        if (!resolvedModuleId) {
            startTransition(() => {
                setError('Không thể xác định ID của module. Vui lòng thử lại.');
                setSaving(false);
            });
            return;
        }

        // Validate that paid chapters cannot be created in paid modules
        if (mode === 'paid' && isModulePaid) {
            startTransition(() => {
                setError('Không thể tạo chương trả phí trong tập đã trả phí. Tập trả phí đã bao gồm tất cả chương bên trong.');
                setSaving(false);
            });
            return;
        }

        // Validate minimum chapter balance for paid chapters
        if (mode === 'paid' && parseInt(chapterBalance) < 1) {
            startTransition(() => {
                setError('Số lúa chương tối thiểu là 1 🌾 cho chương trả phí.');
                setSaving(false);
            });
            return;
        }

        try {
            // Get content from TinyMCE editor and process it
            const content = editorRef.current.getContent();

            // Process content - Convert [valnote_X] to HTML footnote links for storage
            let processedContent = convertFootnotesToHTML(content);

            // Also handle any remaining old format markers for backward compatibility
            processedContent = processedContent.replace(
                /<sup class="footnote-marker" data-footnote="(\w+)">\[[\w\d]+\]<\/sup>/g,
                '<sup><a href="#note-$1" id="ref-$1" class="footnote-ref" data-footnote="$1">[$1]</a></sup>'
            );

            // Clean up br tags
            processedContent = processedContent.replace(/<br\s*\/?>/gi, '<br>');

            // COLOR DETECTION - Preserve intentional colors, remove default colors
            processedContent = processedContent.replace(
                /<span[^>]*style="([^"]*)"[^>]*>/gi,
                (match, styleContent) => {
                    const classes = [];
                    let preservedStyles = styleContent;

                    // Preserve font-weight (bold)
                    if (/font-weight:\s*bold/i.test(styleContent)) {
                        classes.push('text-bold');
                    }

                    // Preserve font-style (italic)
                    if (/font-style:\s*italic/i.test(styleContent)) {
                        classes.push('text-italic');
                    }

                    // Preserve text-decoration (underline)
                    if (/text-decoration:\s*underline/i.test(styleContent)) {
                        classes.push('text-underline');
                    }

                    // COLOR HANDLING
                    const colorMatch = styleContent.match(/color:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-zA-Z]+)/i);
                    if (colorMatch) {
                        const colorValue = colorMatch[1].toLowerCase();

                        // Check if it's a default black color (these should follow theme)
                        const isDefaultBlack = colorValue === '#000000' ||
                            colorValue === '#000' ||
                            colorValue === 'black' ||
                            colorValue === 'rgb(0, 0, 0)' ||
                            colorValue === 'rgb(0,0,0)';

                        if (isDefaultBlack) {
                            // Remove default black color - let theme handle it
                            preservedStyles = preservedStyles.replace(/color:\s*[^;]+[;]?/gi, '');
                            classes.push('text-default-color');
                        } else {
                            // Keep intentional colors
                            const hexColor = convertToHex(colorValue);
                            if (hexColor) {
                                classes.push(`text-color-${hexColor.replace('#', '')}`);
                            }
                        }
                    } else {
                        // No color specified - should follow theme
                        classes.push('text-default-color');
                    }

                    // Preserve background colors (always keep)
                    const bgColorMatch = styleContent.match(/background-color:\s*#([0-9a-fA-F]{3,6})/i);
                    if (bgColorMatch) {
                        classes.push(`bg-color-${bgColorMatch[1]}`);
                    }

                    // Remove conflicting typography but keep everything else
                    preservedStyles = preservedStyles.replace(
                        /(?:font-family[^;]*|font-size:\s*[\d.]+p[tx]|line-height:\s*[\d.]+)[;]?/gi,
                        ''
                    );

                    // Remove color if it was default black
                    if (colorMatch) {
                        const colorValue = colorMatch[1].toLowerCase();
                        const isDefaultBlack = colorValue === '#000000' ||
                            colorValue === '#000' ||
                            colorValue === 'black' ||
                            colorValue === 'rgb(0, 0, 0)' ||
                            colorValue === 'rgb(0,0,0)';
                        if (isDefaultBlack) {
                            preservedStyles = preservedStyles.replace(/color:\s*[^;]+[;]?/gi, '');
                        }
                    }

                    preservedStyles = preservedStyles.trim().replace(/;$/, '');

                    const classStr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
                    const styleStr = preservedStyles ? ` style="${preservedStyles}"` : '';

                    return `<span${classStr}${styleStr}>`;
                }
            );

            // Handle paragraph-level styles
            processedContent = processedContent.replace(
                /<p[^>]*style="([^"]*)"[^>]*>/gi,
                (match, styleContent) => {
                    const classes = [];
                    let preservedStyles = styleContent;

                    // Preserve text alignment
                    if (/text-align:\s*center/i.test(styleContent)) {
                        classes.push('text-center');
                    } else if (/text-align:\s*right/i.test(styleContent)) {
                        classes.push('text-right');
                    } else if (/text-align:\s*left/i.test(styleContent)) {
                        classes.push('text-left');
                    }

                    // Handle paragraph colors the same way
                    const colorMatch = styleContent.match(/color:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-zA-Z]+)/i);
                    if (colorMatch) {
                        const colorValue = colorMatch[1].toLowerCase();
                        const isDefaultBlack = colorValue === '#000000' ||
                            colorValue === '#000' ||
                            colorValue === 'black' ||
                            colorValue === 'rgb(0, 0, 0)' ||
                            colorValue === 'rgb(0,0,0)';

                        if (isDefaultBlack) {
                            preservedStyles = preservedStyles.replace(/color:\s*[^;]+[;]?/gi, '');
                            classes.push('text-default-color');
                        } else {
                            const hexColor = convertToHex(colorValue);
                            if (hexColor) {
                                classes.push(`text-color-${hexColor.replace('#', '')}`);
                            }
                        }
                    } else {
                        classes.push('text-default-color');
                    }

                    // Remove conflicting styles
                    preservedStyles = preservedStyles.replace(
                        /(?:font-family[^;]*|font-size:\s*[\d.]+p[tx]|line-height:\s*[\d.]+)[;]?/gi,
                        ''
                    );

                    preservedStyles = preservedStyles.trim().replace(/;$/, '');

                    const classStr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
                    const styleStr = preservedStyles ? ` style="${preservedStyles}"` : '';

                    return `<p${classStr}${styleStr}>`;
                }
            );

            // Convert decorated containers to themed classes
            processedContent = processedContent.replace(
                /<div\s+style="[^"]*(?:background[^"]*gradient|border[^"]*solid|box-shadow)[^"]*"[^>]*>/gi,
                '<div class="content-frame themed-container">'
            );

            // Process paragraph blocks
            let paragraphBlocks = processedContent
                .split(/(<br>\s*){2,}/gi)
                .filter(block => block && block.trim() && !block.match(/^(<br>\s*)+$/i));

            if (paragraphBlocks.length <= 1) {
                paragraphBlocks = processedContent
                    .split(/<br>/gi)
                    .filter(block => block && block.trim());
            }

            paragraphBlocks = paragraphBlocks
                .map(block => {
                    let trimmedBlock = block.trim();
                    trimmedBlock = trimmedBlock.replace(/^(<br>\s*)+|(<br>\s*)+$/gi, '');

                    if (trimmedBlock) {
                        if (!trimmedBlock.match(/^<(p|div|h[1-6]|blockquote|pre|ul|ol|li)/i)) {
                            return `<p class="text-default-color">${trimmedBlock}</p>`;
                        }
                        return trimmedBlock;
                    }
                    return '';
                })
                .filter(block => block);

            let finalContent = paragraphBlocks.join('');

            if (paragraphBlocks.length === 0 && processedContent.trim()) {
                const cleanContent = processedContent.replace(/<br>/gi, ' ');
                finalContent = `<p class="text-default-color">${cleanContent}</p>`;
            }

            // Final cleaning while preserving important formatting
            let cleanedContent = finalContent
                .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
                .replace(/>\s+</g, '><') // Remove spaces between HTML tags
                .trim();

            // Sanitize the processed content
            cleanedContent = DOMPurify.sanitize(cleanedContent, {
                ADD_TAGS: ['sup', 'a', 'p', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'strong', 'em', 'u', 'i', 'b'],
                ADD_ATTR: ['href', 'id', 'class', 'data-footnote', 'dir', 'style'],
                KEEP_CONTENT: false,
                ALLOW_EMPTY_TAGS: ['p'],
            });

            // Helper function to convert colors to hex
            function convertToHex(color) {
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

                // Named colors to hex conversion
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
            }

            // Check content size
            const contentSizeMB = (cleanedContent.length / (1024 * 1024)).toFixed(2);
            if (cleanedContent.length > 40 * 1024 * 1024) {
                startTransition(() => {
                    setError('Nội dung quá lớn. Vui lòng giảm độ định dạng hoặc chia thành nhiều chương.');
                    setSaving(false);
                });
                return;
            }

            // Validate that all footnote markers in the content have corresponding footnotes
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cleanedContent;
            const markersInContent = tempDiv.querySelectorAll('sup a.footnote-ref');

            const footnoteMarkersInContent = Array.from(markersInContent).map(marker =>
                marker.getAttribute('data-footnote')
            );

            const footnoteNamesInState = footnotes.map(footnote => footnote.name || footnote.id.toString());

            // Check for markers without footnotes
            const missingFootnotes = footnoteMarkersInContent.filter(marker => !footnoteNamesInState.includes(marker));
            if (missingFootnotes.length > 0) {
                startTransition(() => {
                    setError(`Có chú thích trong chương không có nội dung ([${missingFootnotes.join('], [')}]). Vui lòng thêm nội dung chú thích hoặc xóa các dấu chú thích.`);
                    setSaving(false);
                });
                return;
            }

            // Check for footnotes without markers
            const orphanedFootnotes = footnoteNamesInState.filter(name => !footnoteMarkersInContent.includes(name));
            if (orphanedFootnotes.length > 0) {
                startTransition(() => {
                    setError(`Có chú thích trong chương không có dấu chú thích ([${orphanedFootnotes.join('], [')}]). Vui lòng thêm dấu chú thích hoặc xóa các chú thích.`);
                    setSaving(false);
                });
                return;
            }

            // Create the chapter data object
            const chapterData = {
                novelId: resolvedNovelId || novelId, // Use resolved ID if available, fallback to original
                moduleId: resolvedModuleId || moduleSlugOrId, // Use resolved module ID if available
                title: chapterTitle,
                content: cleanedContent,
                mode: mode,
                translator: translator,
                editor: editor,
                proofreader: proofreader,
                footnotes: footnotes,
                chapterBalance: mode === 'paid' ? parseInt(chapterBalance) || 0 : 0
            };

            // Simplified cache invalidation - avoid overlapping operations
            if (isEditMode) {
                // For edit mode, just invalidate the specific novel query
                queryClient.invalidateQueries({queryKey: ['novel', novelId]});
            } else {
                // For new chapter, invalidate multiple cache keys to ensure fresh data
                await Promise.all([
                    queryClient.invalidateQueries({queryKey: ['novel', novelId]}),
                    queryClient.invalidateQueries({queryKey: ['novel', resolvedNovelId || novelId]}),
                    queryClient.invalidateQueries({queryKey: ['modules', novelId]}),
                    queryClient.invalidateQueries({queryKey: ['modules', resolvedNovelId || novelId]})
                ]);
            }

            // Get current novel data for optimistic update
            const currentNovelData = queryClient.getQueryData(['novel', novelId]);

            if (isEditMode) {
                // Update existing chapter
                await axios.put(
                    `${config.backendUrl}/api/chapters/${chapterId}`,
                    chapterData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                );

                startTransition(() => {
                    setSuccess('Chương đã được cập nhật thành công!');
                });
            } else {
                // Optimistically update the UI before the API call completes
                if (currentNovelData) {
                    // Add a temporary optimistic chapter to the novel's chapters list
                    const optimisticNovel = {...currentNovelData};
                    const timestamp = new Date().toISOString();

                    // Find the target module and add chapter to it
                    if (optimisticNovel.modules) {
                        const targetModule = optimisticNovel.modules.find(m => m._id === (resolvedModuleId || moduleSlugOrId));
                        if (targetModule) {
                            // Create optimistic chapter with temporary ID
                            const optimisticChapter = {
                                _id: `temp-${Date.now()}`,
                                title: chapterTitle,
                                content: cleanedContent,
                                novelId: resolvedNovelId || novelId,
                                moduleId: resolvedModuleId || moduleSlugOrId,
                                mode,
                                translator,
                                editor,
                                proofreader,
                                footnotes,
                                chapterBalance: mode === 'paid' ? parseInt(chapterBalance) || 0 : 0,
                                createdAt: timestamp,
                                updatedAt: timestamp
                            };

                            // Add to module's chapters if it exists
                            if (!targetModule.chapters) {
                                targetModule.chapters = [];
                            }
                            targetModule.chapters.push(optimisticChapter);

                            // Update the novel's update timestamp
                            optimisticNovel.updatedAt = timestamp;

                            // Set the optimistic data in cache
                            queryClient.setQueryData(['novel', novelId], optimisticNovel);
                        }
                    }
                }

                // Make the actual API call to create new chapter
                await axios.post(
                    `${config.backendUrl}/api/chapters`,
                    chapterData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                );

                startTransition(() => {
                    setSuccess('Chương đã được tạo thành công!');
                });
            }

            // For edit mode, clear success message after timeout and stay on page
            if (isEditMode) {
                setTimeout(() => {
                    startTransition(() => {
                        setSuccess('');
                    });
                }, 3000);
                startTransition(() => {
                    setSaving(false);
                });
            } else {
                // For new chapter, navigate back without aggressive refetch state
                setTimeout(() => {
                    navigate(generateNovelUrl({_id: novelId, title: novel?.novel?.title || ''}), {
                        replace: true
                    });
                }, 1500);
            }
        } catch (err) {
            console.error('Error details:', err);
            startTransition(() => {
                setError(err.response?.data?.message || err.message || 'Không thể lưu chương. Vui lòng thử lại.');
                setSaving(false);
            });

            // On error, refetch to ensure data consistency
            queryClient.refetchQueries({queryKey: ['novel', novelId]});
        }
    };

    // Helper function to check if user has pj_user access
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

    // Check if user has admin privileges
    if (user?.role !== 'admin' && user?.role !== 'moderator' && user?.role !== 'pj_user') {
        return <div className="error">Không có quyền truy cập. Chỉ dành cho admin, moderator và project user.</div>;
    }

    // For pj_user, check if they manage this novel - but only after data has loaded
    if (user?.role === 'pj_user' && !loading && novel && !checkPjUserAccess(novel?.novel?.active?.pj_user, user)) {
        return <div className="error">Bạn không có quyền quản lý truyện này.</div>;
    }

    // Show loading state
    if (loading) {
        return (
            <div className="loading"><LoadingSpinner size="large" text="Đang tải..."/></div>
        );
    }

    // Show error if module is not found AFTER loading is complete
    if (moduleError && moduleSlugOrId && !loading) {
        const novelSlug = createUniqueSlug(novel?.novel?.title, novelId);
        return (
            <div className="error-message">
                <FontAwesomeIcon icon={faExclamationTriangle}/> Tập không tồn tại.
                <Link to={generateNovelUrl({_id: novelId, title: novel?.novel?.title || ''})}
                      className="return-link"> Trở lại trang truyện</Link>
            </div>
        );
    }

    const novelSlug = createUniqueSlug(novel?.novel?.title, novelId);

    return (
        <div className="chapter-dashboard">
            {/* Header section with novel title and back button */}
            <div className="chapter-dashboard-header">
                <div className="header-content">
                    <h1>{isEditMode ? 'Chỉnh sửa chương' : 'Thêm chương mới'}</h1>
                    <h2>{novel?.novel?.title}</h2>
                    {module && <div className="module-title">Tập: {module.title}</div>}
                </div>
                <Link to={generateNovelUrl({_id: novelId, title: novel?.novel?.title || ''})} className="back-to-novel">
                    <FontAwesomeIcon icon={faArrowLeft}/> Trở lại trang truyện
                </Link>
            </div>

            {/* Success message */}
            {success && <div className="success-message">{success}</div>}

            {/* Error message */}
            {error && (
                <div className="error-message">
                    <FontAwesomeIcon icon={faExclamationTriangle}/> {error}
                </div>
            )}

            {/* Chapter creation form */}
            <form onSubmit={handleSubmit} className="chapter-form">
                {/* Main details section */}

                {/* Status section */}
                <div className="chapter-form-section">
                    <div className="chapter-title-status-group">
                        <div className="chapter-title-input">
                            <label>Tiêu đề chương:</label>
                            <input
                                type="text"
                                value={chapterTitle}
                                onChange={(e) => setChapterTitle(e.target.value)}
                                placeholder="Nhập tiêu đề chương"
                                required
                            />
                        </div>
                        <div className="chapter-mode-input">
                            <label>Chế độ chương:</label>
                            <select
                                value={mode}
                                onChange={handleModeChange}
                                className="chapter-dashboard-mode-dropdown"
                            >
                                <option value="published">{translateChapterModuleStatus('Published')} (Hiển thị cho tất
                                    cả)
                                </option>
                                <option value="draft">{translateChapterModuleStatus('Draft')} (Chỉ admin/mod)</option>
                                <option value="protected">{translateChapterModuleStatus('Protected')} (Yêu cầu đăng
                                    nhập)
                                </option>
                                {user?.role === 'admin' && (
                                    <option value="paid" disabled={isModulePaid}>
                                        {isModulePaid ? `${translateChapterModuleStatus('Paid')} (Không khả dụng - Tập đã trả phí)` : translateChapterModuleStatus('Paid')}
                                    </option>
                                )}
                            </select>
                        </div>
                        {user?.role === 'admin' && (
                            <div className="chapter-balance-input" style={{
                                visibility: mode === 'paid' ? 'visible' : 'hidden',
                                opacity: mode === 'paid' ? 1 : 0
                            }}>
                                <label>Số lúa chương (Tối thiểu 1 🌾):</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={chapterBalance}
                                    onChange={(e) => setChapterBalance(e.target.value)}
                                    placeholder="Nhập số lúa chương (tối thiểu 1)"
                                    disabled={mode !== 'paid'}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Staff section */}
                <div className="chapter-form-section chapter-staff-section">
                    <div className="chapter-form-row">
                        {isVietnameseNovel ? (
                            /* Vietnamese novel - author, editor, proofreader */
                            <>
                                {/* Author dropdown (using translator field) */}
                                <div className="chapter-form-group">
                                    <label className="chapter-form-label">Tác giả:</label>
                                    <select
                                        className="chapter-staff-dropdown mode-dropdown"
                                        value={translator}
                                        onChange={(e) => setTranslator(e.target.value)}
                                    >
                                        <option value="">Không có</option>
                                        {novel?.novel?.author && (
                                            <option value={typeof novel.novel.author === 'object' ? (novel.novel.author.userNumber || novel.novel.author._id) : novel.novel.author}>
                                                {typeof novel.novel.author === 'object' ? (novel.novel.author.displayName || novel.novel.author.userNumber || novel.novel.author.username) : novel.novel.author}
                                            </option>
                                        )}
                                    </select>
                                </div>

                                {/* Editor dropdown */}
                                <div className="chapter-form-group">
                                    <label className="chapter-form-label">Biên tập viên:</label>
                                    <select
                                        className="chapter-staff-dropdown mode-dropdown"
                                        value={editor}
                                        onChange={(e) => setEditor(e.target.value)}
                                    >
                                        <option value="">Không có</option>
                                        {novel?.novel?.active?.editor?.map((staff, index) => {
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

                                {/* Proofreader dropdown */}
                                <div className="chapter-form-group">
                                    <label className="chapter-form-label">Hiệu đính:</label>
                                    <select
                                        className="chapter-staff-dropdown mode-dropdown"
                                        value={proofreader}
                                        onChange={(e) => setProofreader(e.target.value)}
                                    >
                                        <option value="">Không có</option>
                                        {novel?.novel?.active?.proofreader?.map((staff, index) => {
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
                            /* Non-Vietnamese novel - translator, editor, proofreader */
                            <>
                                {/* Translator dropdown */}
                                <div className="chapter-form-group">
                                    <label className="chapter-form-label">Dịch giả:</label>
                                    <select
                                        className="chapter-staff-dropdown mode-dropdown"
                                        value={translator}
                                        onChange={(e) => setTranslator(e.target.value)}
                                    >
                                        <option value="">Không có</option>
                                        {novel?.novel?.active?.translator?.map((staff, index) => {
                                            const staffValue = typeof staff === 'object' ? (staff.userNumber || staff._id) : staff;
                                            const staffDisplay = typeof staff === 'object' ? (staff.displayName || staff.userNumber || staff.username) : staff;
                                            return (
                                                <option key={`translator-${index}`} value={staffValue}>
                                                    {staffDisplay}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Editor dropdown */}
                                <div className="chapter-form-group">
                                    <label className="chapter-form-label">Biên tập viên:</label>
                                    <select
                                        className="chapter-staff-dropdown mode-dropdown"
                                        value={editor}
                                        onChange={(e) => setEditor(e.target.value)}
                                    >
                                        <option value="">Không có</option>
                                        {novel?.novel?.active?.editor?.map((staff, index) => {
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

                                {/* Proofreader dropdown */}
                                <div className="chapter-form-group">
                                    <label className="chapter-form-label">Hiệu đính:</label>
                                    <select
                                        className="chapter-staff-dropdown mode-dropdown"
                                        value={proofreader}
                                        onChange={(e) => setProofreader(e.target.value)}
                                    >
                                        <option value="">Không có</option>
                                        {novel?.novel?.active?.proofreader?.map((staff, index) => {
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

                {/* Chapter content editor */}
                <div className="chapter-form-section">
                    <h3 className="form-section-title">Nội dung chương</h3>

                    <div className="chapter-content-group">
                        <div className="chapter-content-editor">
                            <Editor
                                onInit={(evt, editor) => {
                                    editorRef.current = editor;
                                    // Set content if in edit mode - convert HTML footnotes back to [valnote_X] format for editing
                                    if (isEditMode && chapterContent) {
                                        let editableContent = chapterContent;

                                        // Convert HTML footnote links back to [valnote_X] format for editing
                                        editableContent = editableContent.replace(
                                            /<sup><a[^>]*href="#note-(\w+)"[^>]*>\[\w+\]<\/a><\/sup>/g,
                                            '[valnote_$1]'
                                        );

                                        // Handle old format for backward compatibility
                                        editableContent = editableContent.replace(
                                            /<sup class="footnote-marker" data-footnote="(\w+)">\[[\w\d]+\]<\/sup>/g,
                                            '[valnote_$1]'
                                        );

                                        editor.setContent(editableContent);
                                    }
                                }}
                                scriptLoading={{async: true, load: "domainBased"}}
                                init={{
                                    script_src: config.tinymce.scriptPath,
                                    license_key: 'gpl',
                                    height: 600,
                                    menubar: false,
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
                                        'link image | code preview | removeformat | help',
                                    contextmenu: 'cut copy paste | link image | removeformat',
                                    content_style: `
                    body { font-family:Helvetica,Arial,Georgia,sans-serif; font-size:16px; line-height:1.6; }
                    .footnote-ref { color: #0066cc; text-decoration: none; cursor: pointer; }
                    .footnote-ref:hover { text-decoration: underline; }
                    em, i { font-style: italic; }
                    strong, b { font-weight: bold; }
                  `,
                                    skin: 'oxide',
                                    content_css: 'default',
                                    placeholder: 'Nhập nội dung chương...',
                                    statusbar: true,
                                    resize: true,
                                    branding: false,
                                    promotion: false,
                                    // Completely disable TinyMCE's paste processing - preserve HTML exactly as-is
                                    paste_data_images: true,
                                    paste_as_text: false,
                                    paste_auto_cleanup_on_paste: false,
                                    paste_remove_styles: false,
                                    paste_remove_spans: false,
                                    paste_strip_class_attributes: 'none',
                                    paste_merge_formats: false,
                                    paste_webkit_styles: 'all',
                                    // Allow all HTML elements and attributes without restriction
                                    valid_elements: '*[*]',
                                    valid_children: '*[*]',
                                    extended_valid_elements: '*[*]',
                                    setup: function (editor) {
                                        // Load content when editor is ready
                                        editor.on('init', () => {
                                            // Set content if in edit mode - convert HTML footnotes back to [valnote_X] format for editing
                                            if (isEditMode && chapterContent) {
                                                let editableContent = convertHTMLToFootnotes(chapterContent);
                                                editor.setContent(editableContent);
                                            }
                                        });

                                        // Add custom button for inserting footnotes
                                        editor.ui.registry.addButton('footnote', {
                                            text: 'Add Footnote',
                                            tooltip: 'Insert a footnote',
                                            onAction: function () {
                                                addFootnote();
                                            }
                                        });

                                        // Add the custom button to the toolbar
                                        editor.ui.registry.addMenuButton('insert', {
                                            text: 'Insert',
                                            tooltip: 'Insert content',
                                            fetch: function (callback) {
                                                const items = [
                                                    {
                                                        type: 'menuitem',
                                                        text: 'Footnote',
                                                        onAction: function () {
                                                            addFootnote();
                                                        }
                                                    }
                                                ];
                                                callback(items);
                                            }
                                        });


                                        // Handle paste to convert old footnote formats
                                        editor.on('paste', (e) => {
                                            setTimeout(() => {
                                                let content = editor.getContent();
                                                const originalContent = content;

                                                content = content.replace(
                                                    /<sup class="footnote-marker" data-footnote="(\w+)">\[[\w\d]+\]<\/sup>/g,
                                                    '[valnote_$1]'
                                                );

                                                content = content.replace(
                                                    /<sup[^>]*data-footnote="(\w+)"[^>]*>\[[\w\d]+\]<\/sup>/g,
                                                    '[valnote_$1]'
                                                );

                                                content = content.replace(
                                                    /<sup><a[^>]*href="#note-(\w+)"[^>]*>\[[\w\d]+\]<\/a><\/sup>/g,
                                                    '[valnote_$1]'
                                                );

                                                if (content !== originalContent) {
                                                    editor.setContent(content);
                                                }
                                            }, 100);
                                        });
                                    },
                                    images_upload_handler: (blobInfo) => {
                                        return new Promise((resolve, reject) => {
                                            const file = blobInfo.blob();

                                            // Use bunny CDN service
                                            bunnyUploadService.uploadFile(file, 'illustrations')
                                                .then(url => {
                                                    resolve(url);
                                                })
                                                .catch(error => {
                                                    console.error('Image upload error:', error);
                                                    reject('Image upload failed');
                                                });
                                        });
                                    },
                                    images_upload_base_path: '/',
                                    automatic_uploads: true
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Footnotes section */}
                <div className="footnote-section">
                    <h3>Chú thích</h3>
                    {footnotes.length > 0 ? (
                        <div className="footnote-list">
                            {footnotes.map((footnote) => (
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
                                                disabled={footnotes.findIndex(f => f.id === footnote.id) === 0}
                                                title="Di chuyển lên"
                                            >
                                                ▲
                                            </button>
                                            <button
                                                type="button"
                                                className="footnote-move-btn down"
                                                onClick={() => moveFootnote(footnote.id, 'down')}
                                                disabled={footnotes.findIndex(f => f.id === footnote.id) === footnotes.length - 1}
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
                                <li><strong>Thêm chú thích mới:</strong> Nhấn nút "Thêm chú thích" sẽ tự động tạo chú
                                    thích tại vị trí con trỏ trong editor; Hoặc gõ trực
                                    tiếp <code>[valnote_1]</code>, <code>[valnote_2]</code>... trong nội dung chương.
                                </li>
                                <li><strong>Thay đổi thứ tự:</strong> Sử dụng nút <strong>▲</strong> (lên)
                                    và <strong>▼</strong> (xuống) để thay đổi số thứ tự các chú thích.
                                </li>
                                <li><strong>Xóa chú thích:</strong> Nhấn nút xóa sẽ loại bỏ chú thích và tất cả marker
                                    liên quan trong nội dung.
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

                {/* Form action buttons */}
                <div className="form-actions">
                    <button type="submit" disabled={saving} className="submit-btn">
                        {saving ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner}
                                                 spin/> {isEditMode ? 'Đang cập nhật...' : 'Đang lưu...'}
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSave}/> {isEditMode ? 'Cập nhật chương' : 'Lưu chương'}
                            </>
                        )}
                    </button>
                    <Link to={generateNovelUrl({_id: novelId, title: novel?.novel?.title || ''})}
                          className="cancel-btn">
                        <FontAwesomeIcon icon={faTimes}/> Hủy bỏ
                    </Link>
                </div>
            </form>
        </div>
    );
};

export default ChapterDashboard;