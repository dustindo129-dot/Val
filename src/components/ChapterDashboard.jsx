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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/components/ChapterDashboard.css';
import config from '../config/config';
import { Editor } from '@tinymce/tinymce-react';
import { useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faSave, faTimes, faPlus, faTrash,
  faExclamationTriangle, faSpinner, faEdit
} from '@fortawesome/free-solid-svg-icons';
import bunnyUploadService from '../services/bunnyUploadService';
import LoadingSpinner from './LoadingSpinner';
import { createUniqueSlug, generateNovelUrl } from '../utils/slugUtils';
import { translateChapterModuleStatus } from '../utils/statusTranslation';
import DOMPurify from 'dompurify';

/**
 * ChapterDashboard Component
 *
 * Main component that provides administrative interface for managing
 * chapters of a novel with enhanced features
 */
const ChapterDashboard = () => {
  // Get novel ID from URL parameters and module ID from route params or query parameters
  const { novelId, moduleSlug: urlModuleSlug, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const queryModuleId = searchParams.get('moduleId');
  // Use moduleSlug from URL params first, then fall back to query params for backward compatibility
  const moduleSlugOrId = urlModuleSlug || queryModuleId;

  const { user } = useAuth();
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
  const [nextFootnoteName, setNextFootnoteName] = useState('note1');

  // Reference to the editor
  const editorRef = useRef(null);

  // In-memory cache for pending module resolution promises to prevent duplicate API calls
  const pendingModuleResolutions = useRef(new Map());

  // Check if the current module is in paid mode
  const isModulePaid = module?.mode === 'paid';

  // Handle mode change with validation
  const handleModeChange = (e) => {
    const newMode = e.target.value;
    
    if (newMode === 'paid' && isModulePaid) {
      setError('Không thể đặt chương thành trả phí trong tập đã trả phí. Tập trả phí đã bao gồm tất cả chương bên trong.');
      return;
    }
    
    setMode(newMode);
    setError(''); // Clear any previous errors
  };

  // Effect to handle when module becomes paid - automatically change chapter mode
  useEffect(() => {
    if (isModulePaid && mode === 'paid') {
      setMode('published');
      setChapterBalance(0);
      setError('Chương đã được chuyển về chế độ công khai vì tập hiện tại đã ở chế độ trả phí.');
    }
  }, [isModulePaid, mode]);

  /**
   * Adds a footnote marker to the editor content at the current cursor position
   * @param {string} footnoteName - The footnote name to insert
   */
  const insertFootnoteMarker = useCallback((footnoteName) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    // Insert superscript footnote marker at current cursor position
    editor.insertContent(`<sup class="footnote-marker" data-footnote="${footnoteName}">[${footnoteName}]</sup>`);
  }, []);

  /**
   * Adds a new footnote to the footnotes array
   */
  const addFootnote = useCallback(() => {
    const newFootnoteId = nextFootnoteId;
    const newFootnoteName = nextFootnoteName;

    setFootnotes(prev => [
      ...prev,
      { id: newFootnoteId, name: newFootnoteName, content: '' }
    ]);

    setNextFootnoteId(newFootnoteId + 1);
    setNextFootnoteName(`note${newFootnoteId + 1}`);
  }, [nextFootnoteId, nextFootnoteName]);

  /**
   * Updates a footnote's content
   * @param {number} id - ID of the footnote to update
   * @param {string} content - New content for the footnote
   */
  const updateFootnote = useCallback((id, content) => {
    setFootnotes(prev =>
        prev.map(footnote =>
            footnote.id === id ? { ...footnote, content } : footnote
        )
    );
  }, []);

  /**
   * Deletes a footnote and updates the remaining footnotes' numbering
   * @param {number} id - ID of the footnote to delete
   */
  const deleteFootnote = useCallback((id) => {
    // Find the footnote to be deleted to get its name
    const footnoteToDelete = footnotes.find(f => f.id === id);
    if (!footnoteToDelete) return;

    // Remove the footnote from the array
    setFootnotes(prev => prev.filter(footnote => footnote.id !== id));

    // If the editor instance exists, update the footnote markers in the content
    if (editorRef.current) {
      const editor = editorRef.current;
      const content = editor.getContent();

      // Create a temporary div to modify the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;

      // Find and remove the marker for the deleted footnote using both name and id for compatibility
      const markerToDelete = tempDiv.querySelector(`sup.footnote-marker[data-footnote="${footnoteToDelete.name || footnoteToDelete.id}"]`);
      if (markerToDelete) {
        markerToDelete.remove();
      }

      // Update the editor content (no renumbering needed for named footnotes)
      editor.setContent(tempDiv.innerHTML);
    }
  }, [footnotes]);

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
          const { active } = dashboardData.novel;
          
          // For Vietnamese novels, set author as default translator
          if (!active.translator?.length && dashboardData.novel.author) {
            setTranslator(dashboardData.novel.author);
          } else {
            // Set default translator for non-Vietnamese novels
            if (active.translator?.length > 0) {
              setTranslator(active.translator[0]);
            }
            // Set default editor
            if (active.editor?.length > 0) {
              setEditor(active.editor[0]);
            }
            // Proofreader defaults to none
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

        // Fetch chapter data if in edit mode (call directly instead of via function reference)
        if (isEditMode && chapterId) {
          try {
            const response = await axios.get(`${config.backendUrl}/api/chapters/${chapterId}`);
            const chapterData = response.data.chapter;

            setChapterTitle(chapterData.title || '');
            setChapterContent(chapterData.content || '');
            setMode(chapterData.mode || 'published');
            setTranslator(chapterData.translator || '');
            setEditor(chapterData.editor || '');
            setProofreader(chapterData.proofreader || '');
            setChapterBalance(chapterData.chapterBalance || 0);

            // Use existing footnotes from chapter data if available
            if (chapterData.footnotes && Array.isArray(chapterData.footnotes)) {
              setFootnotes(chapterData.footnotes);
              
              // Find the highest ID to set next footnote ID
              const maxId = Math.max(...chapterData.footnotes.map(f => f.id), 0);
              setNextFootnoteId(maxId + 1);
              setNextFootnoteName(`note${maxId + 1}`);
            } else {
              // If no footnotes in chapter data, start fresh
              setFootnotes([]);
              setNextFootnoteId(1);
              setNextFootnoteName('note1');
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
      setError('Không có module được chọn. Vui lòng chọn module trước.');
      setSaving(false);
      return;
    }

    // Validate that we have a resolved module ID
    if (!resolvedModuleId) {
      setError('Không thể xác định ID của module. Vui lòng thử lại.');
      setSaving(false);
      return;
    }

    // Validate that paid chapters cannot be created in paid modules
    if (mode === 'paid' && isModulePaid) {
      setError('Không thể tạo chương trả phí trong tập đã trả phí. Tập trả phí đã bao gồm tất cả chương bên trong.');
      setSaving(false);
      return;
    }

    // Validate minimum chapter balance for paid chapters
    if (mode === 'paid' && parseInt(chapterBalance) < 1) {
      setError('Số lúa chương tối thiểu là 1 🌾 cho chương trả phí.');
      setSaving(false);
      return;
    }

    try {
      // Get content from TinyMCE editor and process it
      const content = editorRef.current.getContent();

      // Process content with consistent formatting preservation (matching ChapterContent)
      let processedContent = content;

      // Replace footnote markers - handle both numbered and named footnotes
      // This handles plain text markers like [note1] and existing sup markers
      processedContent = processedContent.replace(
          /\[(note\d+|note[a-zA-Z0-9_-]+|\d+)\]/g,
          (match, marker) => {
            return `<sup class="footnote-marker" data-footnote="${marker}">[${marker}]</sup>`;
          }
      );
      
      // Also handle already formatted sup markers (in case of mixed content)
      processedContent = processedContent.replace(
          /\<sup class="footnote-marker" data-footnote="([^"]+)"\>\[([^\]]+)\]\<\/sup\>/g,
          (match, dataMarker, displayMarker) => {
            return `<sup class="footnote-marker" data-footnote="${dataMarker}">[${dataMarker}]</sup>`;
          }
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
        setError('Nội dung quá lớn. Vui lòng giảm độ định dạng hoặc chia thành nhiều chương.');
        setSaving(false);
        return;
      }

      // Validate that all footnote markers in the content have corresponding footnotes
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanedContent;
      const markersInContent = tempDiv.querySelectorAll('sup.footnote-marker');

      const footnoteMarkersInContent = Array.from(markersInContent).map(marker =>
          marker.getAttribute('data-footnote')
      );

      const footnoteNamesInState = footnotes.map(footnote => footnote.name || `note${footnote.id}`);

      // Check for markers without footnotes
      const missingFootnotes = footnoteMarkersInContent.filter(marker => !footnoteNamesInState.includes(marker));
      if (missingFootnotes.length > 0) {
        setError(`Có chú thích trong chương không có nội dung (Names: ${missingFootnotes.join(', ')}). Vui lòng thêm nội dung chú thích hoặc xóa các dấu chú thích.`);
        setSaving(false);
        return;
      }

      // Check for footnotes without markers
      const orphanedFootnotes = footnoteNamesInState.filter(name => !footnoteMarkersInContent.includes(name));
      if (orphanedFootnotes.length > 0) {
        setError(`Có chú thích trong chương không có dấu chú thích (Names: ${orphanedFootnotes.join(', ')}). Vui lòng thêm dấu chú thích hoặc xóa các chú thích.`);
        setSaving(false);
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
        queryClient.invalidateQueries({ queryKey: ['novel', novelId] });
      } else {
        // For new chapter, invalidate multiple cache keys to ensure fresh data
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['novel', novelId] }),
          queryClient.invalidateQueries({ queryKey: ['novel', resolvedNovelId || novelId] }),
          queryClient.invalidateQueries({ queryKey: ['modules', novelId] }),
          queryClient.invalidateQueries({ queryKey: ['modules', resolvedNovelId || novelId] })
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

        setSuccess('Chương đã được cập nhật thành công!');
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

        setSuccess('Chương đã được tạo thành công!');
      }

      // For edit mode, clear success message after timeout and stay on page
      if (isEditMode) {
        setTimeout(() => setSuccess(''), 3000);
        setSaving(false);
      } else {
        // For new chapter, navigate back without aggressive refetch state
        setTimeout(() => {
          navigate(generateNovelUrl({ _id: novelId, title: novel?.novel?.title || '' }), {
            replace: true
          });
        }, 1500);
      }
    } catch (err) {
      console.error('Error details:', err);
      setError(err.response?.data?.message || err.message || 'Không thể lưu chương. Vui lòng thử lại.');

      // On error, refetch to ensure data consistency
      queryClient.refetchQueries({ queryKey: ['novel', novelId] });
      setSaving(false);
    }
  };

  // Check if user has admin privileges
  if (user?.role !== 'admin' && user?.role !== 'moderator' && user?.role !== 'pj_user') {
    return <div className="error">Không có quyền truy cập. Chỉ dành cho admin, moderator và project user.</div>;
  }

  // For pj_user, check if they manage this novel - but only after data has loaded
  if (user?.role === 'pj_user' && !loading && novel && !(
    novel?.novel?.active?.pj_user?.includes(user.id) || 
    novel?.novel?.active?.pj_user?.includes(user._id) ||
    novel?.novel?.active?.pj_user?.includes(user.username) ||
    novel?.novel?.active?.pj_user?.includes(user.displayName)
  )) {
    return <div className="error">Bạn không có quyền quản lý truyện này.</div>;
  }

  // Show loading state
  if (loading) {
    return (
                <div className="loading">          <LoadingSpinner size="large" text="Đang tải..." />        </div>
    );
  }

  // Show error if module is not found AFTER loading is complete
  if (moduleError && moduleSlugOrId && !loading) {
    const novelSlug = createUniqueSlug(novel?.novel?.title, novelId);
    return (
        <div className="error-message">
          <FontAwesomeIcon icon={faExclamationTriangle} /> Tập không tồn tại.
          <Link to={generateNovelUrl({ _id: novelId, title: novel?.novel?.title || '' })} className="return-link"> Trở lại trang truyện</Link>
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
          <Link to={generateNovelUrl({ _id: novelId, title: novel?.novel?.title || '' })} className="back-to-novel">
            <FontAwesomeIcon icon={faArrowLeft} /> Trở lại trang truyện
          </Link>
        </div>

        {/* Success message */}
        {success && <div className="success-message">{success}</div>}

        {/* Error message */}
        {error && (
            <div className="error-message">
              <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
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
                  <option value="published">{translateChapterModuleStatus('Published')} (Hiển thị cho tất cả)</option>
                  <option value="draft">{translateChapterModuleStatus('Draft')} (Chỉ admin/mod)</option>
                  <option value="protected">{translateChapterModuleStatus('Protected')} (Yêu cầu đăng nhập)</option>
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
                        <option value={novel.novel.author}>
                          {novel.novel.author}
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
                      {novel?.novel?.active?.editor?.map((staff, index) => (
                          <option key={`editor-${index}`} value={staff}>
                            {staff}
                          </option>
                      ))}
                    </select>
                  </div>

                  {/* Proofreader dropdown */}
                  <div className="chapter-form-group">
                    <label className="chapter-form-label">Người kiểm tra chất lượng:</label>
                    <select
                        className="chapter-staff-dropdown mode-dropdown"
                        value={proofreader}
                        onChange={(e) => setProofreader(e.target.value)}
                    >
                      <option value="">Không có</option>
                      {novel?.novel?.active?.proofreader?.map((staff, index) => (
                          <option key={`proofreader-${index}`} value={staff}>
                            {staff}
                          </option>
                      ))}
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
                      {novel?.novel?.active?.translator?.map((staff, index) => (
                          <option key={`translator-${index}`} value={staff}>
                            {staff}
                          </option>
                      ))}
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
                      {novel?.novel?.active?.editor?.map((staff, index) => (
                          <option key={`editor-${index}`} value={staff}>
                            {staff}
                          </option>
                      ))}
                    </select>
                  </div>

                  {/* Proofreader dropdown */}
                  <div className="chapter-form-group">
                    <label className="chapter-form-label">Người kiểm tra chất lượng:</label>
                    <select
                        className="chapter-staff-dropdown mode-dropdown"
                        value={proofreader}
                        onChange={(e) => setProofreader(e.target.value)}
                    >
                      <option value="">Không có</option>
                      {novel?.novel?.active?.proofreader?.map((staff, index) => (
                          <option key={`proofreader-${index}`} value={staff}>
                            {staff}
                          </option>
                      ))}
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
                      // Set content if in edit mode
                      if (isEditMode && chapterContent) {
                        editor.setContent(chapterContent);
                      }
                    }}
                    scriptLoading={{ async: true, load: "domainBased" }}
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
                    sup.footnote-marker { color: #e74c3c; font-weight: bold; cursor: pointer; }
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
                      // Handle footnote markers only - don't touch anything else
                      paste_preprocess: (plugin, args) => {
                        // Handle both numbered and named footnote markers
                        args.content = args.content.replace(
                          /\[(note\d+|note[a-zA-Z0-9_-]+|\d+)\]/g,
                          '<sup class="footnote-marker" data-footnote="$1">[$1]</sup>'
                        );
                        // Don't modify the content at all otherwise
                      },
                      // Allow all HTML elements and attributes without restriction
                      valid_elements: '*[*]',
                      valid_children: '*[*]',
                      extended_valid_elements: '*[*]',
                      setup: function(editor) {
                        // Add custom button for inserting footnotes
                        editor.ui.registry.addButton('footnote', {
                          text: 'Add Footnote',
                          tooltip: 'Insert a footnote',
                          onAction: function() {
                            addFootnote();
                          }
                        });

                        // Add the custom button to the toolbar
                        editor.ui.registry.addMenuButton('insert', {
                          text: 'Insert',
                          tooltip: 'Insert content',
                          fetch: function(callback) {
                            const items = [
                              {
                                type: 'menuitem',
                                text: 'Footnote',
                                onAction: function() {
                                  addFootnote();
                                }
                              }
                            ];
                            callback(items);
                          }
                        });

                        // Auto-convert typed footnote markers in real-time (only if footnote exists)
                        editor.on('keyup', function() {
                          // Get the current footnotes directly from the state
                          const currentFootnotes = window.getChapterDashboardFootnotes ? window.getChapterDashboardFootnotes() : [];
                          
                          if (currentFootnotes.length === 0) {
                            return; // No footnotes exist, don't convert anything
                          }
                          
                          const content = editor.getContent();
                          const existingFootnoteNames = currentFootnotes.map(f => f.name || `note${f.id}`);
                          
                          const updatedContent = content.replace(
                            /\[(note\d+|note[a-zA-Z0-9_-]+|\d+)\](?![^<]*<\/sup>)/g,
                            (match, marker) => {
                              // Only convert if there's a corresponding footnote
                              if (existingFootnoteNames.includes(marker)) {
                                return `<sup class="footnote-marker" data-footnote="${marker}">[${marker}]</sup>`;
                              }
                              return match; // Keep as plain text if no footnote exists
                            }
                          );
                          
                          if (updatedContent !== content) {
                            const bookmark = editor.selection.getBookmark();
                            editor.setContent(updatedContent);
                            editor.selection.moveToBookmark(bookmark);
                          }
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
          <div className="chapter-form-section footnote-section">
            <h3 className="form-section-title">Chú thích</h3>

            {footnotes.length > 0 ? (
                <div className="footnote-list">
                  {footnotes.map((footnote) => (
                      <div key={`footnote-${footnote.id}`} className="footnote-item">
                        <div className="footnote-number">
                          <input 
                            type="text" 
                            value={`[${footnote.name || `note${footnote.id}`}]`}
                            readOnly
                            style={{
                              width: '80px',
                              padding: '2px 4px',
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              border: '1px solid #ccc',
                              borderRadius: '3px',
                              backgroundColor: '#f9f9f9'
                            }}
                            onClick={(e) => e.target.select()}
                            title="Click để chọn tất cả, sau đó copy"
                          />
                        </div>
                        <div className="footnote-content">
                    <textarea
                        value={footnote.content}
                        onChange={(e) => updateFootnote(footnote.id, e.target.value)}
                        placeholder={`Nhập chú thích [${footnote.name || `note${footnote.id}`}]...`}
                    />
                        </div>
                        <div className="footnote-controls">
                          <button
                              type="button"
                              className="footnote-delete-btn"
                              onClick={() => deleteFootnote(footnote.id)}
                              title="Delete footnote"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>
                  ))}
                </div>
            ) : (
              <p>Hướng dẫn sử dụng chú thích:
                 <br />1. Bấm "+ Thêm chú thích" để tạo chú thích trước.
                 <br />2. Sau đó có thể nhập trực tiếp [note1], [note2], v.v. vào nội dung chương (hoặc sao chép chỗ bên trái chú thích) và chúng sẽ tự động liên kết với chú thích tương ứng.
                 <br />3. Nếu chú thích không được tạo trước khi nhập [note1], [note2], v.v. thì [note1] sẽ hiển thị như văn bản thông thường.
                 <br />4. Các thay đổi chỉ được lưu sau khi bấm "Lưu chương".</p>
            )}

            <button
                type="button"
                className="add-footnote-btn"
                onClick={addFootnote}
            >
              <FontAwesomeIcon icon={faPlus} /> Thêm chú thích
            </button>
          </div>

          {/* Form action buttons */}
          <div className="form-actions">
            <button type="submit" disabled={saving} className="submit-btn">
              {saving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> {isEditMode ? 'Đang cập nhật...' : 'Đang lưu...'}
                  </>
              ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} /> {isEditMode ? 'Cập nhật chương' : 'Lưu chương'}
                  </>
              )}
            </button>
            <Link to={generateNovelUrl({ _id: novelId, title: novel?.novel?.title || '' })} className="cancel-btn">
              <FontAwesomeIcon icon={faTimes} /> Hủy bỏ
            </Link>
          </div>
        </form>
      </div>
  );
};

export default ChapterDashboard;