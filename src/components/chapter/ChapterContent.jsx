import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import DOMPurify from 'dompurify';
import config from '../../config/config';
import { formatDate } from '../../utils/helpers';
import PropTypes from 'prop-types';
import ChapterFootnotes from './ChapterFootnotes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import './ChapterContent.css';
import hybridCdnService from '../../services/bunnyUploadService';
import { translateChapterModuleStatus } from '../../utils/statusTranslation';

const ChapterContent = ({
  chapter,
  isEditing = false,
  editedContent,
  setEditedContent,
  editedTitle,
  setEditedTitle,
  fontSize = 16,
  fontFamily = 'Arial, sans-serif',
  lineHeight = '1.6',
  editorRef,
  onModeChange,
  canEdit = false,
  userRole = 'user',
  moduleData = null
}) => {
  const contentRef = useRef(null);
  const [editedMode, setEditedMode] = useState(chapter.mode || 'published');
  const [localFootnotes, setLocalFootnotes] = useState([]);
  const [nextFootnoteId, setNextFootnoteId] = useState(1);
  const [editedChapterBalance, setEditedChapterBalance] = useState(chapter.chapterBalance || 0);
  const [originalMode] = useState(chapter.mode || 'published');
  const [originalChapterBalance] = useState(chapter.chapterBalance || 0);
  const [modeError, setModeError] = useState('');

  // Check if the current module is in paid mode
  const isModulePaid = moduleData?.mode === 'paid';

  // Effect to handle when module becomes paid - automatically change chapter mode
  useEffect(() => {
    if (isModulePaid && editedMode === 'paid') {
      setEditedMode('published');
      setEditedChapterBalance(0);
      setModeError('Chương đã được chuyển về chế độ công khai vì tập hiện tại đã ở chế độ trả phí.');
    }
  }, [isModulePaid, editedMode]);
  
  // Initialize localFootnotes and nextFootnoteId when entering edit mode
  useEffect(() => {
    if (isEditing) {
      // Only update if the footnotes have actually changed
      const footnotes = (editedContent?.footnotes || chapter.footnotes || []);
      const currentIds = new Set(localFootnotes.map(f => f.id));
      const newIds = new Set(footnotes.map(f => f.id));
      
      // Skip during deletion operations - detected by fewer footnotes
      if (localFootnotes.length > 0 && footnotes.length < localFootnotes.length) {
        return;
      }
      
      // Check if the footnotes are different before updating
      const hasChanged = footnotes.length !== localFootnotes.length ||
        footnotes.some(f => !currentIds.has(f.id)) ||
        localFootnotes.some(f => !newIds.has(f.id));
      
      if (hasChanged) {
        // Use a single batch update
        const nextId = Math.max(...footnotes.map(f => f.id).concat([0])) + 1;
        setLocalFootnotes(footnotes);
        setNextFootnoteId(nextId);
      }
    }
  }, [isEditing, chapter.footnotes, editedContent?.footnotes, localFootnotes]);

  // Update parent's editedContent whenever footnotes change in edit mode
  useEffect(() => {
    if (isEditing && setEditedContent) {
      // Only update if we're not already setting the content from parent
      const currentFootnotes = editedContent?.footnotes || [];
      
      // Skip this effect when it's triggered by our own deleteFootnote function
      // We can detect this by checking if the count has decreased
      if (localFootnotes.length < currentFootnotes.length) {
        return; // Skip the effect during deletion - we already updated in deleteFootnote
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

  // Initialize editedTitle from parent component when entering edit mode
  useEffect(() => {
    if (isEditing && chapter && editedTitle === '') {
      setEditedTitle(chapter.title || '');
    }
    
    if (isEditing && chapter) {
      setEditedChapterBalance(chapter.chapterBalance || 0);
    }
  }, [isEditing, chapter, editedTitle, setEditedTitle]);

  // Only prepare edited content when saving instead of on every change
  useEffect(() => {
    if (isEditing && setEditedContent) {
      // Store mode and balance info in the editedContent object 
      // but don't trigger immediate API calls
      setEditedContent(prev => ({
        ...prev,
        mode: editedMode,
        chapterBalance: editedMode === 'paid' ? (parseInt(editedChapterBalance) || 0) : 0
      }));
    }
  }, [isEditing, setEditedContent]);

  const handleFootnoteClick = (targetId) => {
    const element = document.getElementById(targetId);
    if (element) {
      // Smooth scroll to the target
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add highlight effect
      element.classList.add('highlight');
      setTimeout(() => {
        element.classList.remove('highlight');
      }, 2000);
    }
  };

  const insertFootnoteMarker = useCallback((footnoteNumber) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.insertContent(`<sup class="footnote-marker" data-footnote="${footnoteNumber}">[${footnoteNumber}]</sup>`);
  }, []);

  const addFootnote = useCallback(() => {
    const newFootnoteId = nextFootnoteId;
    setLocalFootnotes(prev => [...prev, { id: newFootnoteId, content: '' }]);
    setNextFootnoteId(newFootnoteId + 1);
    insertFootnoteMarker(newFootnoteId);
  }, [nextFootnoteId, insertFootnoteMarker]);

  const updateFootnote = useCallback((id, content) => {
    setLocalFootnotes(prev =>
      prev.map(footnote =>
        footnote.id === id ? { ...footnote, content } : footnote
      )
    );
  }, []);

  const deleteFootnote = useCallback((id) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const content = editor.getContent();

      // Create a temporary div to modify the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;

      // Remove the marker for the deleted footnote
      const markerToDelete = tempDiv.querySelector(`sup[data-footnote="${id}"]`);
      if (markerToDelete) {
        markerToDelete.remove();
      }

      // Update remaining footnote markers
      const remainingMarkers = Array.from(tempDiv.querySelectorAll('sup[data-footnote]'))
        .sort((a, b) => {
          return parseInt(a.getAttribute('data-footnote')) - parseInt(b.getAttribute('data-footnote'));
        });

      // Renumber the remaining markers
      remainingMarkers.forEach((marker, index) => {
        const newNumber = index + 1;
        marker.setAttribute('data-footnote', newNumber);
        marker.textContent = `[${newNumber}]`;
      });

      // Update the editor content
      editor.setContent(tempDiv.innerHTML);
      
      // Prepare updated footnotes without triggering the useEffect that updates editedContent
      const updatedFootnotes = localFootnotes
        .filter(footnote => footnote.id !== id)
        .sort((a, b) => a.id - b.id)
        .map((footnote, index) => ({
          ...footnote,
          id: index + 1
        }));
      
      // Batch our state updates to prevent cascading renders
      const newNextId = remainingMarkers.length + 1;
      
      // Update both the local state and parent's state in one operation
      if (setEditedContent) {
        setEditedContent(prev => ({
          ...prev,
          content: tempDiv.innerHTML,
          footnotes: updatedFootnotes
        }));
      }
      
      // Update local state separately from the parent state
      setLocalFootnotes(updatedFootnotes);
      setNextFootnoteId(newNextId);
    }
  }, [localFootnotes, setEditedContent]);

  useEffect(() => {
    // Add click handler for footnote references in the content
    const handleContentClick = (e) => {
      if (e.target.matches('.footnote-ref')) {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').slice(1);
        handleFootnoteClick(targetId);
      }
    };

    if (contentRef.current) {
      contentRef.current.addEventListener('click', handleContentClick);
    }

    return () => {
      if (contentRef.current) {
        contentRef.current.removeEventListener('click', handleContentClick);
      }
    };
  }, []);

  const handleModeChange = (value) => {
    // Validate that paid chapters cannot be set in paid modules
    if (value === 'paid' && isModulePaid) {
      setModeError('Không thể đặt chương thành trả phí trong tập đã trả phí. Tập trả phí đã bao gồm tất cả chương bên trong.');
      return;
    }
    
    setEditedMode(value);
    setModeError(''); // Clear any previous errors
    
    // If mode changes from paid to something else, reset chapter balance locally
    if (value !== 'paid') {
      setEditedChapterBalance(0);
    }
    
    // We don't call onModeChange or setEditedContent here anymore
    // Changes will be saved when the user clicks the Save Changes button
  };

  // Process content to wrap footnote references and sanitize HTML
  const processContent = (content) => {
    if (!content) return '';
    
    try {
      // First ensure content is a string
      const contentString = typeof content === 'object' ? JSON.stringify(content) : String(content);
      
      // Replace footnote markers with proper bi-directional links
      let processedContent = contentString.replace(
        /\[(\d+)\]|\<sup class="footnote-marker" data-footnote="(\d+)"\>\[(\d+)\]\<\/sup\>/g,
        (match, simpleNum, dataNum, supNum) => {
          const footnoteNum = simpleNum || dataNum || supNum;
          return `<sup><a href="#note-${footnoteNum}" id="ref-${footnoteNum}" class="footnote-ref" data-footnote="${footnoteNum}">[${footnoteNum}]</a></sup>`;
        }
      );

      // Clean up and normalize br tags
      processedContent = processedContent.replace(/<br\s*\/?>/gi, '<br>');
      
      // Try to split by double <br> tags first
      let paragraphBlocks = processedContent
        .split(/(<br>\s*){2,}/gi)
        .filter(block => block && block.trim() && !block.match(/^(<br>\s*)+$/i));

      // If no double <br> splits found, try splitting by single <br> tags
      if (paragraphBlocks.length <= 1) {
        paragraphBlocks = processedContent
          .split(/<br>/gi)
          .filter(block => block && block.trim());
      }

      // Process each block
      paragraphBlocks = paragraphBlocks
        .map(block => {
          let trimmedBlock = block.trim();
          
          // Remove any remaining <br> tags at the beginning or end
          trimmedBlock = trimmedBlock.replace(/^(<br>\s*)+|(<br>\s*)+$/gi, '');
          
          if (trimmedBlock) {
            // Only wrap in <p> if not already wrapped in block elements
            if (!trimmedBlock.match(/^<(p|div|h[1-6]|blockquote|pre|ul|ol|li)/i)) {
              return `<p>${trimmedBlock}</p>`;
            }
            return trimmedBlock;
          }
          return '';
        })
        .filter(block => block);

      let finalContent = paragraphBlocks.join('');

      // If still no paragraphs were created, wrap the entire content
      if (paragraphBlocks.length === 0 && processedContent.trim()) {
        const cleanContent = processedContent.replace(/<br>/gi, ' ');
        finalContent = `<p>${cleanContent}</p>`;
      }

      // Sanitize HTML but allow our footnote structure and paragraph tags
      return DOMPurify.sanitize(finalContent, {
        ADD_TAGS: ['sup', 'a', 'p', 'br'],
        ADD_ATTR: ['href', 'id', 'class', 'data-footnote']
      });
    } catch (error) {
      console.error('Lỗi xử lý nội dung:', error);
      return 'Lỗi tải chương nội dung';
    }
  };

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
            <label>Chế độ chương:</label>
            <select
              value={editedMode}
              onChange={(e) => handleModeChange(e.target.value)}
              className="mode-dropdown"
            >
              <option value="published">{translateChapterModuleStatus('Published')} (Hiển thị cho tất cả)</option>
              <option value="draft">{translateChapterModuleStatus('Draft')} (Chỉ admin/mod)</option>
              <option value="protected">{translateChapterModuleStatus('Protected')} (Yêu cầu đăng nhập)</option>
              {userRole === 'admin' && (
                <option value="paid" disabled={isModulePaid}>
                  {isModulePaid ? `${translateChapterModuleStatus('Paid')} (Không khả dụng - Tập đã trả phí)` : translateChapterModuleStatus('Paid')}
                </option>
              )}
            </select>
            
            {modeError && (
              <div className="mode-error" style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>
                {modeError}
              </div>
            )}
            
            {editedMode === 'paid' && userRole === 'admin' && (
              <div className="chapter-balance-input">
                <label>Số lúa chương (Tối thiểu 50 🌾):</label>
                <input
                  type="number"
                  min="50"
                  value={editedChapterBalance}
                  onChange={(e) => setEditedChapterBalance(e.target.value)}
                  placeholder="Nhập số lúa chương (tối thiểu 50)"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <>
          <div className="chapter-content editor-container">
            <Editor
              onInit={(evt, editor) => {
                editorRef.current = editor;
                if (editedContent?.content || chapter?.content) {
                  editor.setContent(editedContent?.content || chapter.content);
                }
              }}
              value={editedContent?.content || ''}
              onEditorChange={(content) => {
                if (setEditedContent) {
                  setEditedContent(prev => ({
                    ...prev,
                    content: content
                  }));
                }
              }}
              scriptLoading={{ async: true, load: "domainBased" }}
              init={{
                script_src: config.tinymce.scriptPath,
                license_key: 'gpl',
                height: 500,
                menubar: false,
                entity_encoding: 'raw',
                encoding: 'html',
                convert_urls: false,
                verify_html: false,
                cleanup: false,
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
                  'link image footnote | code preview | wordcount | removeformat | help',
                content_style: `
                  body { font-family:Helvetica,Arial,sans-serif; font-size:14px }
                  .footnote-marker { color: #0066cc; cursor: pointer; }
                  .footnote-marker:hover { text-decoration: underline; }
                `,
                // Preserve footnote markers during paste
                paste_preprocess: (plugin, args) => {
                  args.content = args.content.replace(
                    /\[(\d+)\]/g,
                    '<sup class="footnote-marker" data-footnote="$1">[$1]</sup>'
                  );
                },
                // Add custom CSS for footnote styling
                content_css: [
                  'default',
                  'https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap'
                ],
                extended_valid_elements: 'sup[class|data-footnote]',
                custom_elements: 'sup',
                valid_children: '+body[sup]',
                statusbar: true,
                resize: false,
                branding: false,
                promotion: false,
                paste_data_images: true,
                smart_paste: true,
                paste_as_text: false,
                images_upload_handler: (blobInfo) => {
                  return new Promise((resolve, reject) => {
                    const file = blobInfo.blob();
                    
                    // Use bunny CDN service
                    hybridCdnService.uploadFile(file, 'illustrations')
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
            {/* Add function to expose edited mode to parent component */}
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

          {/* Add Footnotes Section in Edit Mode */}
          <div className="footnote-section">
            <h3>Footnotes</h3>
            {localFootnotes.length > 0 ? (
              <div className="footnote-list">
                {localFootnotes.map((footnote) => (
                  <div key={`footnote-${footnote.id}`} className="footnote-item">
                    <div className="footnote-number">{footnote.id}</div>
                    <div className="footnote-content">
                      <textarea
                        value={footnote.content}
                        onChange={(e) => updateFootnote(footnote.id, e.target.value)}
                        placeholder={`Nhập chú thích ${footnote.id}...`}
                      />
                    </div>
                    <div className="footnote-controls">
                      <button
                        type="button"
                        className="footnote-delete-btn"
                        onClick={() => deleteFootnote(footnote.id)}
                        title="Xóa chú thích"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Hướng dẫn chỉnh sửa chú thích:
                 <br />1. Nếu muốn xóa hoặc chỉnh sửa chú thích hãy thao tác ở khu vực bên dưới,
                  không nên xóa chú thích bằng tay ở khu vực chữ bên trên,
                   có thể gây ra mâu thuẫn dữ liệu và làm hỏng nội dung.
                   <br />2. Tương tự như mục thêm chương, các thay đổi chỉ ấn định sau khi bấm Lưu chương,
                    nên nếu lỡ tay hãy Hủy bỏ thay đổi và làm lại.</p>
            )}

            <button
              type="button"
              className="add-footnote-btn"
              onClick={addFootnote}
            >
              <FontAwesomeIcon icon={faPlus} /> Thêm chú thích
            </button>
          </div>
        </>
      ) : (
        <div className="chapter-content-container">
          <div 
            ref={contentRef}
            className="chapter-content"
            style={{
              fontSize: `${fontSize}px`,
              fontFamily: fontFamily,
              lineHeight: lineHeight,
              padding: '15px 10px'
            }}
            dangerouslySetInnerHTML={{ __html: processContent(chapter.content) }}
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
};

ChapterContent.propTypes = {
  chapter: PropTypes.shape({
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    mode: PropTypes.string,
    chapterBalance: PropTypes.number,
    footnotes: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
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
  editorRef: PropTypes.object,
  onModeChange: PropTypes.func,
  canEdit: PropTypes.bool,
  userRole: PropTypes.string,
  moduleData: PropTypes.shape({
    mode: PropTypes.string
  })
};

export default ChapterContent; 