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
import hybridCdnService from '../services/bunnyUploadService';
import LoadingSpinner from './LoadingSpinner';
import { createUniqueSlug } from '../utils/slugUtils';

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

  // State for footnotes
  const [footnotes, setFootnotes] = useState([]);
  const [nextFootnoteId, setNextFootnoteId] = useState(1);

  // Reference to the editor
  const editorRef = useRef(null);

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
   * @param {number} footnoteNumber - The footnote number to insert
   */
  const insertFootnoteMarker = useCallback((footnoteNumber) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    // Insert superscript footnote marker at current cursor position
    editor.insertContent(`<sup class="footnote-marker" data-footnote="${footnoteNumber}">[${footnoteNumber}]</sup>`);
  }, []);

  /**
   * Adds a new footnote to the footnotes array
   */
  const addFootnote = useCallback(() => {
    const newFootnoteId = nextFootnoteId;

    setFootnotes(prev => [
      ...prev,
      { id: newFootnoteId, content: '' }
    ]);

    setNextFootnoteId(newFootnoteId + 1);

    // Insert the footnote marker in the editor
    insertFootnoteMarker(newFootnoteId);
  }, [nextFootnoteId, insertFootnoteMarker]);

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
    // Remove the footnote from the array
    setFootnotes(prev => prev.filter(footnote => footnote.id !== id));

    // If the editor instance exists, update the footnote markers in the content
    if (editorRef.current) {
      const editor = editorRef.current;
      const content = editor.getContent();

      // Create a temporary div to modify the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;

      // Find and remove the marker for the deleted footnote
      const markerToDelete = tempDiv.querySelector(`sup.footnote-marker[data-footnote="${id}"]`);
      if (markerToDelete) {
        markerToDelete.remove();
      }

      // Update the remaining footnote markers
      const remainingMarkers = tempDiv.querySelectorAll('sup.footnote-marker');
      let newNumber = 1;

      remainingMarkers.forEach(marker => {
        const oldNumber = marker.getAttribute('data-footnote');
        marker.setAttribute('data-footnote', newNumber);
        marker.textContent = `[${newNumber}]`;
        newNumber++;
      });

      // Update the editor content
      editor.setContent(tempDiv.innerHTML);

      // Renumber the footnotes array
      setFootnotes(prev => {
        const updatedFootnotes = prev.filter(footnote => footnote.id !== id)
            .sort((a, b) => a.id - b.id)
            .map((footnote, index) => ({
              ...footnote,
              id: index + 1
            }));
        return updatedFootnotes;
      });

      // Update the next footnote ID
      setNextFootnoteId(newNumber);
    }
  }, []);

  /**
   * Extracts footnotes from chapter content
   * @param {string} content - HTML content to extract footnotes from
   * @returns {Array} - Array of footnote objects
   */
  const extractFootnotes = useCallback((content) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    const footnoteMarkers = tempDiv.querySelectorAll('sup.footnote-marker');
    const extractedFootnotes = [];
    let maxId = 0;

    footnoteMarkers.forEach(marker => {
      const id = parseInt(marker.getAttribute('data-footnote'), 10);
      if (!isNaN(id)) {
        // The content is stored in the footnotes state, so we extract just the id here
        extractedFootnotes.push({ id, content: '' });
        if (id > maxId) maxId = id;
      }
    });

    // Sort by ID
    extractedFootnotes.sort((a, b) => a.id - b.id);

    // Update the next ID
    setNextFootnoteId(maxId + 1);

    return extractedFootnotes;
  }, []);

  /**
   * Loads chapter data when in edit mode
   */
  const fetchChapterData = useCallback(async () => {
    if (!chapterId) return;

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

      // Extract footnotes from content
      if (chapterData.content) {
        const extractedFootnoteIds = extractFootnotes(chapterData.content);

        // Merge with existing footnote content if available
        if (chapterData.footnotes && Array.isArray(chapterData.footnotes)) {
          const mergedFootnotes = extractedFootnoteIds.map(footnote => {
            const existingFootnote = chapterData.footnotes.find(f => f.id === footnote.id);
            return {
              id: footnote.id,
              content: existingFootnote ? existingFootnote.content : ''
            };
          });
          setFootnotes(mergedFootnotes);
        } else {
          setFootnotes(extractedFootnoteIds);
        }
      }
    } catch (err) {
      console.error('Lỗi lấy dữ liệu chương:', err);
      setError('Không thể tải dữ liệu chương. Vui lòng thử lại.');
    }
  }, [chapterId, extractFootnotes]);

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

        // Then fetch novel data with the resolved ID
        const novelResponse = await axios.get(`${config.backendUrl}/api/novels/${resolvedNovelId}`);
        const novelData = novelResponse.data;
        setNovel(novelData);

        // Set default staff from active staff if available
        if (novelData.novel?.active && !isEditMode) {
          const { active } = novelData.novel;
          // Set default translator
          if (active.translator?.length > 0) {
            setTranslator(active.translator[0]);
          }
          // Set default editor
          if (active.editor?.length > 0) {
            setEditor(active.editor[0]);
          }
          // Proofreader defaults to none
        }

        // Fetch module data if moduleSlugOrId exists
        if (moduleSlugOrId) {
          try {
            let actualModuleId = moduleSlugOrId;
            
            // If moduleSlugOrId looks like a slug (not a 24-char MongoDB ID), resolve it
            if (!/^[0-9a-fA-F]{24}$/.test(moduleSlugOrId)) {
              const moduleIdResponse = await axios.get(`${config.backendUrl}/api/modules/slug/${moduleSlugOrId}`);
              actualModuleId = moduleIdResponse.data.id;
            }
            
            // Store the resolved module ID
            setResolvedModuleId(actualModuleId);
            
            const moduleResponse = await axios.get(`${config.backendUrl}/api/modules/${resolvedNovelId}/modules/${actualModuleId}`);
            const moduleData = moduleResponse.data;
            setModule(moduleData);
          } catch (moduleErr) {
            console.error('Module fetch error:', moduleErr);
            setModuleError(true);
          }
        }

        // Fetch chapter data if in edit mode
        if (isEditMode) {
          await fetchChapterData();
        }
      } catch (err) {
        console.error('Data fetch error:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [novelId, moduleSlugOrId, isEditMode, fetchChapterData]);

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
    if (mode === 'paid' && parseInt(chapterBalance) < 50) {
      setError('Số lúa chương tối thiểu là 50 🌾 cho chương trả phí.');
      setSaving(false);
      return;
    }

    try {
      // Get content from TinyMCE editor and clean it
      const content = editorRef.current.getContent();

      // Basic HTML cleaning while preserving important formatting
      const cleanedContent = content
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .replace(/>\s+</g, '><') // Remove spaces between HTML tags
          .trim();

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

      const footnoteIdsInContent = Array.from(markersInContent).map(marker =>
          parseInt(marker.getAttribute('data-footnote'), 10)
      );

      const footnoteIdsInState = footnotes.map(footnote => footnote.id);

      // Check for markers without footnotes
      const missingFootnotes = footnoteIdsInContent.filter(id => !footnoteIdsInState.includes(id));
      if (missingFootnotes.length > 0) {
        setError(`Có chú thích trong chương không có nội dung (IDs: ${missingFootnotes.join(', ')}). Vui lòng thêm nội dung chú thích hoặc xóa các dấu chú thích.`);
        setSaving(false);
        return;
      }

      // Check for footnotes without markers
      const orphanedFootnotes = footnoteIdsInState.filter(id => !footnoteIdsInContent.includes(id));
      if (orphanedFootnotes.length > 0) {
        setError(`Có chú thích trong chương không có dấu chú thích (IDs: ${orphanedFootnotes.join(', ')}). Vui lòng thêm dấu chú thích hoặc xóa các chú thích.`);
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

      // Cancel any outgoing refetches for the novel
      await queryClient.cancelQueries({ queryKey: ['novel', novelId] });

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

      // More aggressively invalidate ALL related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['novel', novelId] }),
        queryClient.invalidateQueries({ queryKey: ['modules', novelId] }),
        queryClient.invalidateQueries({ queryKey: ['chapters'] }),
        // Remove any stale data
        queryClient.removeQueries({ queryKey: ['novel', novelId], exact: false, stale: true })
      ]);

      // Force complete cache reset for this novel
      queryClient.resetQueries({ queryKey: ['novel', novelId] });

      // For edit mode, clear success message after timeout and stay on page
      if (isEditMode) {
        setTimeout(() => setSuccess(''), 3000);
        setSaving(false);
      } else {
        // For new chapter, navigate back to novel page after delay
        const novelSlug = createUniqueSlug(novel?.title, novelId);
        setTimeout(() => {
          navigate(`/novel/${novelSlug}`, {
            replace: true,
            state: {
              from: 'addChapter',
              shouldRefetch: true,
              timestamp: Date.now()
            }
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
  if (user?.role !== 'admin' && user?.role !== 'moderator') {
    return <div className="error">Không có quyền truy cập. Chỉ dành cho admin và moderator.</div>;
  }

  // Show loading state
  if (loading) {
    return (
                <div className="loading">          <LoadingSpinner size="large" text="Đang tải..." />        </div>
    );
  }

  // Show error if module is not found AFTER loading is complete
  if (moduleError && moduleSlugOrId && !loading) {
    const novelSlug = createUniqueSlug(novel?.title, novelId);
    return (
        <div className="error-message">
          <FontAwesomeIcon icon={faExclamationTriangle} /> Module không tồn tại.
          <Link to={`/novel/${novelSlug}`} className="return-link"> Trở lại trang novel</Link>
        </div>
    );
  }

  const novelSlug = createUniqueSlug(novel?.title, novelId);

  return (
      <div className="chapter-dashboard">
        {/* Header section with novel title and back button */}
        <div className="chapter-dashboard-header">
          <div className="header-content">
            <h1>{isEditMode ? 'Chỉnh sửa chương' : 'Thêm chương mới'}</h1>
            <h2>{novel?.title}</h2>
            {module && <div className="module-title">Tập: {module.title}</div>}
          </div>
          <Link to={`/novel/${novelSlug}`} className="back-to-novel">
            <FontAwesomeIcon icon={faArrowLeft} /> Trở lại trang novel
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
          <div className="form-section">
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
                    className="mode-dropdown"
                >
                  <option value="published">Công khai (Hiển thị cho tất cả mọi người)</option>
                  <option value="draft">Bản nháp (Chỉ admin/mod)</option>
                  <option value="protected">Bảo vệ (Yêu cầu đăng nhập)</option>
                  {user?.role === 'admin' && (
                    <option value="paid" disabled={isModulePaid}>
                      {isModulePaid ? 'Nội dung trả phí (Không khả dụng - Tập đã trả phí)' : 'Nội dung trả phí'}
                    </option>
                  )}
                </select>
              </div>
              {user?.role === 'admin' && (
                <div className="chapter-balance-input" style={{ 
                  visibility: mode === 'paid' ? 'visible' : 'hidden',
                  opacity: mode === 'paid' ? 1 : 0
                }}>
                  <label>Số lúa chương (Tối thiểu 50 🌾):</label>
                  <input
                    type="number"
                    min="50"
                    value={chapterBalance}
                    onChange={(e) => setChapterBalance(e.target.value)}
                    placeholder="Nhập số lúa chương (tối thiểu 50)"
                    disabled={mode !== 'paid'}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Staff section */}
          <div className="form-section staff-section">
            <div className="form-row">
              {/* Translator dropdown */}
              <div className="form-group">
                <label className="form-label">Dịch giả:</label>
                <select
                    className="staff-dropdown mode-dropdown"
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
              <div className="form-group">
                <label className="form-label">Biên tập viên:</label>
                <select
                    className="staff-dropdown mode-dropdown"
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
              <div className="form-group">
                <label className="form-label">Người kiểm tra chất lượng:</label>
                <select
                    className="staff-dropdown mode-dropdown"
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
            </div>
          </div>

          {/* Chapter content editor */}
          <div className="form-section">
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
                      content_style: `
                    body { font-family:Helvetica,Arial,Georgia,sans-serif; font-size:16px; line-height:1.6; }
                    sup.footnote-marker { color: #e74c3c; font-weight: bold; cursor: pointer; }
                  `,
                      skin: 'oxide',
                      content_css: 'default',
                      placeholder: 'Nhập nội dung chương...',
                      statusbar: true,
                      resize: true,
                      branding: false,
                      promotion: false,
                      paste_data_images: true,
                      paste_as_text: false,
                      smart_paste: true,
                      paste_preprocess: function(plugin, args) {
                        const wrapper = document.createElement('div');
                        wrapper.innerHTML = args.content;

                        // First remove all Word-specific tags and junk
                        wrapper.querySelectorAll('table, td, tr, colgroup, col').forEach(el => el.remove());

                        // Remove empty and problematic spans
                        wrapper.querySelectorAll('span').forEach(span => {
                          if (!span.textContent.trim()) {
                            span.remove(); // Remove empty spans
                          } else {
                            // Replace nested spans with their content
                            const text = document.createTextNode(span.textContent);
                            span.replaceWith(text);
                          }
                        });

                        // Strip unnecessary div wrappers that might cause layout issues
                        wrapper.querySelectorAll('div:not(.WordSection1):not(.WordSection2):not(.WordSection3)').forEach(div => {
                          if (div.children.length === 0 || div.textContent.trim() === '') {
                            div.remove();
                          } else if (div.children.length === 1 && div.children[0].nodeName === 'P') {
                            // Unwrap divs that just contain a single paragraph
                            div.replaceWith(div.children[0]);
                          }
                        });

                        // Clean up section breaks and format as proper breaks
                        args.content = wrapper.innerHTML
                            .replace(/<!--Section Break-->/g, '<br clear="all">')
                            .replace(/<!--\s*Section\s*Break\s*\([^)]*\)\s*-->/g, '<br clear="all">')
                            // Replace multiple consecutive breaks with a single one
                            .replace(/<br\s*\/?>\s*<br\s*\/?>\s*<br\s*\/?>/g, '<br clear="all">');
                      },
                      paste_postprocess: function(plugin, args) {
                        // Additional cleanup after paste
                        args.node.querySelectorAll('span').forEach(span => {
                          span.style.display = 'inline';
                          span.style.wordBreak = 'normal';
                          span.style.whiteSpace = 'normal';
                        });
                      },
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
          <div className="form-section footnote-section">
            <h3 className="form-section-title">Chú thích</h3>

            {footnotes.length > 0 ? (
                <div className="footnote-list">
                  {footnotes.map((footnote) => (
                      <div key={`footnote-${footnote.id}`} className="footnote-item">
                        <div className="footnote-number">{footnote.id}</div>
                        <div className="footnote-content">
                    <textarea
                        value={footnote.content}
                        onChange={(e) => updateFootnote(footnote.id, e.target.value)}
                        placeholder={`Nhập nội dung footnote ${footnote.id}...`}
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
                 <br />1. Nhập toàn bộ nội dung chương vào trước.
                 <br />2. Bấm vào chỗ muốn thêm chú thích trong nội dung.
                 <br />3. + Thêm chú thích
                 <br />4. Lặp lại bước 2 và 3 đến khi đầy đủ chú thích.
                 <br />5. Nếu thêm nhầm có thể bấm xóa, tất cả nội dung và chú thích chỉ ấn định sau khi bấm Lưu chương.</p>
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
            <Link to={`/novel/${novelSlug}`} className="cancel-btn">
              <FontAwesomeIcon icon={faTimes} /> Hủy bỏ
            </Link>
          </div>
        </form>
      </div>
  );
};

export default ChapterDashboard;