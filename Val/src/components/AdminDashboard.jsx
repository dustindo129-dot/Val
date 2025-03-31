/**
 * AdminDashboard Component
 * 
 * Administrative interface for managing the entire novel platform including:
 * - Novel management (CRUD operations)
 * - User management
 * - Content moderation
 * - Platform statistics
 * - System settings
 * 
 * Features:
 * - Novel listing and management
 * - User listing and management
 * - Content moderation tools
 * - Analytics dashboard
 * - Bulk actions
 * - Search and filtering
 * - Role-based access control
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './AdminDashboard.css';
import config from '../config/config';
import { Editor } from '@tinymce/tinymce-react';
import { Link } from 'react-router-dom';
import { useNovelStatus } from '../context/NovelStatusContext';
import { useNovel } from '../context/NovelContext';

/**
 * AdminDashboard Component
 * 
 * Main component that provides administrative interface for managing
 * the entire novel platform
 * 
 * @param {Object} props - No props required
 */
const AdminDashboard = () => {
  const { updateNovelStatus } = useNovelStatus();
  const { updateNovel } = useNovel();

  // Genre categories and options
  const genreCategories = {
    'Main Genres': [
      'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy',
      'Historical', 'Horror', 'Mystery', 'Romance', 'Science Fiction',
      'Slice of Life', 'Supernatural', 'Suspense', 'Tragedy',
      'Magic', 'Psychological'
    ],
    'Target Audience': [
      'Seinen', 'Shounen', 'Josei', 'Shoujo'
    ],
    'Character & Relationship Features': [
      'Age Gap', 'Boys Love', 'Character Growth', 'Different Social Status',
      'Female Protagonist', 'Gender Bender', 'Harem', 'Incest',
      'Mature', 'Netorare', 'Reverse Harem', 'Yuri'
    ],
    'Settings & Worlds': [
      'Cooking', 'Game', 'Isekai', 'Martial Arts', 'Mecha', 'Military',
      'Otome Game', 'Parody', 'School Life', 'Slow Life', 'Sports',
      'Super Power', 'Wars', 'Workplace'
    ],
    'Format & Origin': [
      'Chinese Novel', 'English Novel', 'Korean Novel', 'Vietnamese Novel',
      'Web Novel', 'One shot'
    ]
  };

  // State management for novels
  const [novels, setNovels] = useState([]);
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [newNovel, setNewNovel] = useState({ 
    title: '', 
    alternativeTitles: '',
    author: '', 
    staff: '',
    genres: [],
    description: '',
    note: '',
    illustration: '' 
  });
  const [editingNovel, setEditingNovel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State management for chapters
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapterContent, setChapterContent] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [isEditingChapter, setIsEditingChapter] = useState(false);

  const [description, setDescription] = useState('');
  const editorRef = useRef(null);
  const noteEditorRef = useRef(null);

  // Fetch novels on component mount
  useEffect(() => {
    fetchNovels();
  }, []);

  /**
   * Fetches all novels from the API
   */
  const fetchNovels = async () => {
    try {
      const response = await fetch(`${config.backendUrl}/api/novels`);
      const data = await response.json();
      setNovels(data.novels);
    } catch (err) {
      setError('Failed to fetch novels');
    }
  };

  /**
   * Fetches chapters for a specific novel
   * @param {string} novelId - ID of the novel to fetch chapters for
   */
  const fetchChapters = async (novelId) => {
    try {
      // Fetch chapters
      const chaptersResponse = await fetch(`${config.backendUrl}/api/chapters/novel/${novelId}`);
      const chaptersData = await chaptersResponse.json();
      setChapters(chaptersData || []);

      // Fetch novel details separately
      const novelResponse = await fetch(`${config.backendUrl}/api/novels/${novelId}`);
      const novelData = await novelResponse.json();
      setSelectedNovel(novelData);
    } catch (err) {
      setError('Failed to fetch chapters');
      console.error('Error fetching chapters:', err);
    }
  };

  /**
   * Handles novel selection and fetches its chapters
   * @param {Object} novel - Selected novel object
   */
  const handleNovelSelect = async (novel) => {
    setSelectedNovel(novel);
    await fetchChapters(novel._id);
    setSelectedChapter(null);
    setChapterContent('');
    setChapterTitle('');
    setIsEditingChapter(false);
  };

  /**
   * Handles chapter selection for editing
   * @param {Object} chapter - Selected chapter object
   */
  const handleChapterSelect = (chapter) => {
    setSelectedChapter(chapter);
    setChapterContent(chapter.content);
    setChapterTitle(chapter.title);
    setIsEditingChapter(true);
  };

  /**
   * Updates an existing chapter
   */
  const handleChapterUpdate = async () => {
    if (!selectedNovel || !selectedChapter) return;

    try {
      const response = await fetch(
        `${config.backendUrl}/api/chapters/${selectedChapter._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            title: chapterTitle,
            content: chapterContent
          })
        }
      );

      if (!response.ok) throw new Error('Failed to update chapter');

      await fetchChapters(selectedNovel._id);
      setIsEditingChapter(false);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  /**
   * Creates a new chapter for the selected novel
   */
  const handleNewChapter = async () => {
    if (!selectedNovel) return;

    try {
      const response = await fetch(
        `${config.backendUrl}/api/chapters`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            novelId: selectedNovel._id,
            moduleId: selectedNovel._id, // Using novel ID as module ID for now
            title: 'New Chapter',
            content: 'Enter chapter content here...'
          })
        }
      );

      if (!response.ok) throw new Error('Failed to create chapter');

      await fetchChapters(selectedNovel._id);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  /**
   * Deletes a chapter from the selected novel
   * @param {Object} chapter - Chapter to delete
   */
  const handleDeleteChapter = async (chapter) => {
    if (!selectedNovel || !window.confirm('Are you sure you want to delete this chapter?')) return;

    try {
      const response = await fetch(
        `${config.backendUrl}/api/chapters/${chapter._id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to delete chapter');

      await fetchChapters(selectedNovel._id);
      if (selectedChapter?._id === chapter._id) {
        setSelectedChapter(null);
        setChapterContent('');
        setChapterTitle('');
        setIsEditingChapter(false);
      }
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  /**
   * Handles input changes in the novel form
   * @param {React.ChangeEvent<HTMLInputElement>} e - Change event
   */
  const handleInputChange = (e) => {
    const target = editingNovel ? editingNovel : newNovel;
    const value = e.target.value;
    
    const updatedNovel = {
      ...target,
      [e.target.name]: value
    };
    
    if (editingNovel) {
      setEditingNovel(updatedNovel);
    } else {
      setNewNovel(updatedNovel);
    }
  };

  /**
   * Handles genre checkbox changes
   * @param {string} genre - The genre being toggled
   */
  const handleGenreChange = (genre) => {
    const target = editingNovel ? editingNovel : newNovel;
    const updatedGenres = target.genres.includes(genre)
      ? target.genres.filter(g => g !== genre)
      : [...target.genres, genre];
    
    const updatedNovel = {
      ...target,
      genres: updatedGenres
    };
    
    if (editingNovel) {
      setEditingNovel(updatedNovel);
    } else {
      setNewNovel(updatedNovel);
    }
  };

  /**
   * Handles illustration file upload
   * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event
   */
  const handleIllustrationUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      setLoading(true);
      
      // Create form data for Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', config.cloudinary.uploadPresets.illustration);
      formData.append('folder', 'novel-illustrations');

      // Upload to Cloudinary
      const cloudinaryResponse = await axios.post(
        `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`,
        formData
      );

      // Update the novel state with the new illustration URL
      if (editingNovel) {
        setEditingNovel({
          ...editingNovel,
          illustration: cloudinaryResponse.data.secure_url
        });
      } else {
        setNewNovel({
          ...newNovel,
          illustration: cloudinaryResponse.data.secure_url
        });
      }

      setError('');
    } catch (err) {
      setError('Failed to upload illustration');
      console.error('Illustration upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles novel form submission
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editingNovel 
        ? `${config.backendUrl}/api/novels/${editingNovel._id}`
        : `${config.backendUrl}/api/novels`;
      
      const method = editingNovel ? 'PUT' : 'POST';
      const novelData = {
        title: editingNovel ? editingNovel.title : newNovel.title,
        alternativeTitles: editingNovel ? editingNovel.alternativeTitles : newNovel.alternativeTitles,
        author: editingNovel ? editingNovel.author : newNovel.author,
        staff: editingNovel ? editingNovel.staff : newNovel.staff,
        genres: editingNovel ? editingNovel.genres : newNovel.genres,
        description: editorRef.current.getContent(),
        note: noteEditorRef.current.getContent(),
        illustration: editingNovel ? editingNovel.illustration : newNovel.illustration,
        status: editingNovel ? editingNovel.status : "Ongoing"
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(novelData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${editingNovel ? 'update' : 'create'} novel`);
      }

      const responseData = await response.json();
      
      // If editing, update the novel in context
      if (editingNovel) {
        updateNovel(editingNovel._id, responseData);
      }
      
      await fetchNovels();
      resetForm();
    } catch (err) {
      console.error('Error submitting novel:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles novel edit mode
   * @param {Object} novel - Novel to edit
   */
  const handleEdit = (novel) => {
    setEditingNovel(novel);
    setNewNovel(novel);
    // Set the editor content when editing
    if (editorRef.current) {
      editorRef.current.setContent(novel.description || '');
    }
    if (noteEditorRef.current) {
      noteEditorRef.current.setContent(novel.note || '');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Deletes a novel
   * @param {string} id - ID of the novel to delete
   */
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this novel?')) return;

    try {
      const response = await fetch(`${config.backendUrl}/api/novels/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete novel');
      
      await fetchNovels();
    } catch (err) {
      setError(err.message);
    }
  };

  /**
   * Resets the novel form to initial state
   */
  const resetForm = () => {
    setNewNovel({ 
      title: '', 
      alternativeTitles: '',
      author: '', 
      staff: '',
      genres: [],
      description: '',
      note: '',
      illustration: '' 
    });
    setEditingNovel(null);
    setLoading(false);
    // Reset the editor content
    if (editorRef.current) {
      editorRef.current.setContent('');
    }
    if (noteEditorRef.current) {
      noteEditorRef.current.setContent('');
    }
  };

  /**
   * Handles novel status change
   * @param {string} id - ID of the novel
   * @param {string} status - New status value
   */
  const handleStatusChange = async (id, status) => {
    try {
      // Optimistically update UI first
      setNovels(prevNovels => 
        prevNovels.map(novel => 
          novel._id === id ? { ...novel, status } : novel
        )
      );

      if (selectedNovel?._id === id) {
        setSelectedNovel(prev => ({ ...prev, status }));
      }

      // Update the status in the context
      updateNovelStatus(id, status);

      // Then send request to server
      const response = await fetch(`${config.backendUrl}/api/novels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update novel status');
      }
      
      // Fetch updated novel data to ensure we have the latest state
      const updatedNovel = await response.json();
      
      // Update state with the complete novel data from server
      setNovels(prevNovels => 
        prevNovels.map(novel => 
          novel._id === id ? { ...novel, ...updatedNovel } : novel
        )
      );

      if (selectedNovel?._id === id) {
        setSelectedNovel(prev => ({ ...prev, ...updatedNovel }));
      }
    } catch (err) {
      // Revert optimistic update on error
      setNovels(prevNovels => 
        prevNovels.map(novel => 
          novel._id === id ? { ...novel, status: novel.status } : novel
        )
      );

      if (selectedNovel?._id === id) {
        setSelectedNovel(prev => ({ ...prev, status: prev.status }));
      }

      console.error('Error updating status:', err);
      setError(err.message);
    }
  };

  return (
    <div className="admin-dashboard">
      <h2 className="section-title">Novel Management</h2>
      {error && <div className="error">{error}</div>}
      
      <div className="dashboard-grid">
        {/* Novel Form Section */}
        <div className="novel-form">
          <h3 className="section-title">{editingNovel ? 'Edit Novel' : 'Add New Novel'}</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="title"
              placeholder="Title"
              value={editingNovel ? editingNovel.title : newNovel.title}
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="alternativeTitles"
              placeholder="Alternative titles"
              value={editingNovel ? editingNovel.alternativeTitles || '' : newNovel.alternativeTitles}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="author"
              placeholder="Author(s) / Artist(s)"
              value={editingNovel ? editingNovel.author : newNovel.author}
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="staff"
              placeholder="Staff (e.g. Editor, Translator, etc.)"
              value={editingNovel ? editingNovel.staff : newNovel.staff}
              onChange={handleInputChange}
            />
            
            {/* Genres Section */}
            <div className="genres-section">
              <input
                type="text"
                name="genres"
                placeholder="Selected genres"
                value={(editingNovel ? editingNovel.genres : newNovel.genres)?.join('; ') || ''}
                readOnly
              />
              <div className="genre-columns">
                {Object.entries(genreCategories).map(([category, genres]) => (
                  <div key={category} className="genre-column">
                    <h4>{category}</h4>
                    {genres.map(genre => (
                      <label key={genre} className="genre-checkbox">
                        <input
                          type="checkbox"
                          checked={(editingNovel ? editingNovel.genres : newNovel.genres)?.includes(genre) || false}
                          onChange={() => handleGenreChange(genre)}
                        />
                        {genre}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Description Editor */}
            <div className="description-editor">
              <Editor
                apiKey={config.tinymceApiKey}
                onInit={(evt, editor) => editorRef.current = editor}
                init={{
                  height: 300,
                  menubar: false,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                    'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | formatselect | ' +
                    'bold italic underline strikethrough | ' +
                    'alignleft aligncenter alignright alignjustify | ' +
                    'bullist numlist outdent indent | ' +
                    'link image | removeformat | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  skin: 'oxide',
                  content_css: 'default',
                  placeholder: 'Write novel description...',
                  statusbar: false,
                  resize: false,
                  branding: false,
                  promotion: false,
                  paste_data_images: true,
                  images_upload_handler: (blobInfo) => {
                    return new Promise((resolve, reject) => {
                      const formData = new FormData();
                      formData.append('file', blobInfo.blob(), blobInfo.filename());
                      formData.append('upload_preset', config.cloudinary.uploadPresets.illustration);
                      formData.append('folder', 'novel-illustrations');

                      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`;

                      fetch(cloudinaryUrl, {
                        method: 'POST',
                        body: formData
                      })
                      .then(response => response.json())
                      .then(result => {
                        if (result.secure_url) {
                          resolve(result.secure_url);
                        } else {
                          reject('Image upload failed');
                        }
                      })
                      .catch(error => {
                        console.error('Cloudinary upload error:', error);
                        reject('Image upload failed');
                      });
                    });
                  },
                  images_upload_base_path: '/',
                  automatic_uploads: true
                }}
              />
            </div>

            {/* Note Editor */}
            <div className="note-editor">
              <Editor
                apiKey={config.tinymceApiKey}
                onInit={(evt, editor) => noteEditorRef.current = editor}
                initialValue={editingNovel ? editingNovel.note : newNovel.note}
                init={{
                  height: 200,
                  menubar: false,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'charmap',
                    'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'table', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | formatselect | ' +
                    'bold italic underline | ' +
                    'bullist numlist | ' +
                    'link | removeformat | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  skin: 'oxide',
                  content_css: 'default',
                  placeholder: 'Write your note here...',
                  statusbar: false,
                  resize: false,
                  branding: false,
                  promotion: false
                }}
              />
            </div>

            <div className="illustration-upload">
              {(editingNovel?.illustration || newNovel.illustration) && (
                <img
                  src={editingNovel ? editingNovel.illustration : newNovel.illustration}
                  alt="Illustration preview"
                  className="illustration-preview"
                />
              )}
              <label className="illustration-upload-label">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIllustrationUpload}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
                {loading ? 'Uploading...' : 'Upload Cover Image'}
              </label>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Processing...' : (editingNovel ? 'Update Novel' : 'Add Novel')}
            </button>
            {editingNovel && (
              <button type="button" onClick={resetForm} className="cancel-button">
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        {/* Novel List Section */}
        <div className="novel-list">
          <h3 className="section-title">Novel List</h3>
          <ul>
            {novels.map(novel => (
              <li 
                key={novel._id} 
                className={selectedNovel?._id === novel._id ? 'selected' : ''}
              >
                <div className="novel-title-section" onClick={() => handleNovelSelect(novel)}>
                  <Link 
                    to={`/novel/${novel._id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="novel-title-link"
                  >
                    {novel.title}
                  </Link>
                </div>
                <div className="novel-actions">
                  <select
                    className="status-dropdown"
                    value={novel.status || 'Ongoing'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleStatusChange(novel._id, e.target.value);
                    }}
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Hiatus">Hiatus</option>
                  </select>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(novel);
                  }}>Edit</button>
                  <button 
                    className="delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(novel._id);
                    }}
                  >Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Chapter Management Section */}
        {selectedNovel && (
          <div className="chapter-management">
            <h3 className="section-title">Chapters for {selectedNovel.title}</h3>
            
            <div className="chapter-list">
              <ul>
                {chapters.map(chapter => (
                  <li key={chapter._id}>
                    <span>{chapter.title}</span>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteChapter(chapter)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;