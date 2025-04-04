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

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/components/AdminDashboard.css';
import config from '../config/config';
import { Editor } from '@tinymce/tinymce-react';
import { Link } from 'react-router-dom';
import { useNovelStatus } from '../context/NovelStatusContext';
import { useNovel } from '../context/NovelContext';
import { useQueryClient, useQuery } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

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
      'Chinese Novel', 'English Novel', 'Japanese Novel', 'Korean Novel', 'Vietnamese Novel',
      'Web Novel', 'One shot'
    ]
  };

  // State management for novels
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [newNovel, setNewNovel] = useState({ 
    title: '', 
    alternativeTitles: '',
    author: '', 
    illustrator: '',
    active: {
      translator: [],
      editor: [],
      proofreader: []
    },
    inactive: {
      translator: [],
      editor: [],
      proofreader: []
    },
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

  // Fetch novels using React Query
  const { data: novels = [] } = useQuery({
    queryKey: ['novels'],
    queryFn: async () => {
      const response = await fetch(`${config.backendUrl}/api/novels?limit=1000&t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch novels');
      }
      
      const data = await response.json();
      return Array.isArray(data.novels) ? data.novels : (Array.isArray(data) ? data : []);
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 60000, // Cache for 1 minute
    refetchOnMount: true, // Only refetch on mount if data is stale
    refetchOnWindowFocus: false // Don't refetch on window focus
  });

  // Sort novels by updatedAt timestamp (most recent first)
  const sortedNovels = useMemo(() => {
    if (!novels || novels.length === 0) return [];
    
    return [...novels].sort((a, b) => {
      // Get the timestamp for each novel
      const timestampA = new Date(a.updatedAt || a.createdAt).getTime();
      const timestampB = new Date(b.updatedAt || b.createdAt).getTime();
      
      // Sort descending (newest first)
      return timestampB - timestampA;
    });
  }, [novels]);

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
   * Handles staff input change for translator, editor, proofreader arrays
   * @param {string} status - 'active' or 'inactive'
   * @param {string} role - 'translator', 'editor', or 'proofreader'
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handleStaffInputChange = (status, role, e) => {
    const target = editingNovel ? editingNovel : newNovel;
    // Convert comma-separated names into an array
    const names = e.target.value.split(',').map(name => name.trim()).filter(name => name);
    
    const updatedNovel = {
      ...target,
      [status]: {
        ...target[status],
        [role]: names
      }
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
        illustrator: editingNovel ? editingNovel.illustrator : newNovel.illustrator,
        active: editingNovel ? editingNovel.active : newNovel.active,
        inactive: editingNovel ? editingNovel.inactive : newNovel.inactive,
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
      
      // Reset form first
      resetForm();
      
      // Force clear and refetch to ensure UI is in sync
      // We use remove and refetch instead of invalidate to ensure fresh data
      queryClient.removeQueries(['novels']);
      
      // Manually fetch fresh data to update the UI immediately
      try {
        const fetchResponse = await fetch(`${config.backendUrl}/api/novels?limit=1000&t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (fetchResponse.ok) {
          const data = await fetchResponse.json();
          const novelsList = Array.isArray(data.novels) ? data.novels : (Array.isArray(data) ? data : []);
          
          // Update cache with fresh data that includes the new novel
          queryClient.setQueryData(['novels'], novelsList);
        }
      } catch (fetchError) {
        console.error('Error fetching latest novels:', fetchError);
      }
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
    // Ensure staff arrays are properly initialized with empty arrays if undefined
    const novelWithDefaults = {
      ...novel,
      title: novel.title || '',
      alternativeTitles: novel.alternativeTitles || [],
      author: novel.author || '',
      illustrator: novel.illustrator || '',
      active: {
        translator: novel.active?.translator || [],
        editor: novel.active?.editor || [],
        proofreader: novel.active?.proofreader || []
      },
      inactive: {
        translator: novel.inactive?.translator || [],
        editor: novel.inactive?.editor || [],
        proofreader: novel.inactive?.proofreader || []
      },
      genres: novel.genres || [],
      description: novel.description || '',
      note: novel.note || '',
      illustration: novel.illustration || ''
    };
    
    setEditingNovel(novelWithDefaults);
    setNewNovel(novelWithDefaults);
    
    if (editorRef.current) {
      editorRef.current.setContent(novelWithDefaults.description);
    }
    if (noteEditorRef.current) {
      noteEditorRef.current.setContent(novelWithDefaults.note);
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
      // Get current cache data
      const previousData = queryClient.getQueryData(['novels']) || [];
      
      // Create updated list without the deleted novel
      const updatedNovels = Array.isArray(previousData) 
        ? previousData.filter(novel => novel._id !== id) 
        : [];
      
      // Immediately update the cache
      queryClient.setQueryData(['novels'], updatedNovels);
      
      // Perform the actual deletion
      const response = await fetch(`${config.backendUrl}/api/novels/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        // Revert cache if deletion failed
        queryClient.setQueryData(['novels'], previousData);
        throw new Error('Failed to delete novel');
      }

      // If the deleted novel was selected, clear the selection
      if (selectedNovel?._id === id) {
        setSelectedNovel(null);
        setChapters([]);
      }

      // Remove all cached data related to this novel
      queryClient.removeQueries(['novel', id]);
      
      // Lock in our updated novels list - this is the key to making the deletion stick
      queryClient.setQueryData(['novels'], updatedNovels);
      
      setError('');
    } catch (err) {
      console.error('Error deleting novel:', err);
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
      illustrator: '',
      active: {
        translator: [],
        editor: [],
        proofreader: []
      },
      inactive: {
        translator: [],
        editor: [],
        proofreader: []
      },
      genres: [],
      description: '',
      note: '',
      illustration: '' 
    });
    setEditingNovel(null);
    setLoading(false);
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
      // Get current cache data
      const previousData = queryClient.getQueryData(['novels']);
      
      // Create a timestamp for consistent optimistic updates
      const updatedAt = new Date().toISOString();
      
      // Optimistically update the cache
      queryClient.setQueryData(['novels'], old => 
        Array.isArray(old) 
          ? old.map(novel => novel._id === id ? { ...novel, status, updatedAt } : novel)
          : []
      );

      if (selectedNovel?._id === id) {
        setSelectedNovel(prev => ({ ...prev, status, updatedAt }));
      }

      // Update the status in the context
      updateNovelStatus(id, status);

      // Send request to server
      const response = await fetch(`${config.backendUrl}/api/novels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          status,
          // Explicitly request to update the timestamp
          updatedAt 
        })
      });

      if (!response.ok) {
        // If update failed, revert the cache to previous state
        queryClient.setQueryData(['novels'], previousData);
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update novel status');
      }
      
      // Get updated novel data
      const updatedNovel = await response.json();
      
      // Update cache with complete novel data
      queryClient.setQueryData(['novels'], old => 
        Array.isArray(old) 
          ? old.map(novel => novel._id === id ? { ...novel, ...updatedNovel } : novel)
          : []
      );

      // Also invalidate novel list and hot novels queries to ensure they're updated
      queryClient.invalidateQueries({ queryKey: ['novels'] });
      queryClient.invalidateQueries({ queryKey: ['hotNovels'] });

      if (selectedNovel?._id === id) {
        setSelectedNovel(prev => ({ ...prev, ...updatedNovel }));
      }
    } catch (err) {
      // Revert cache on error
      queryClient.setQueryData(['novels'], previousData);

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
              name="illustrator"
              placeholder="Illustrator(s)"
              value={editingNovel ? editingNovel.illustrator : newNovel.illustrator}
              onChange={handleInputChange}
            />
            
            {/* Staff Section */}
            <div className="staff-section">
              <h4>Active Staff</h4>
              <input
                type="text"
                placeholder="Translators (comma-separated)"
                value={editingNovel ? editingNovel.active?.translator?.join(', ') || '' : newNovel.active?.translator?.join(', ') || ''}
                onChange={(e) => handleStaffInputChange('active', 'translator', e)}
              />
              <input
                type="text"
                placeholder="Editors (comma-separated)"
                value={editingNovel ? editingNovel.active?.editor?.join(', ') || '' : newNovel.active?.editor?.join(', ') || ''}
                onChange={(e) => handleStaffInputChange('active', 'editor', e)}
              />
              <input
                type="text"
                placeholder="Proofreaders (comma-separated)"
                value={editingNovel ? editingNovel.active?.proofreader?.join(', ') || '' : newNovel.active?.proofreader?.join(', ') || ''}
                onChange={(e) => handleStaffInputChange('active', 'proofreader', e)}
              />
              
              <h4>Inactive Staff</h4>
              <input
                type="text"
                placeholder="Translators (comma-separated)"
                value={editingNovel ? editingNovel.inactive?.translator?.join(', ') || '' : newNovel.inactive?.translator?.join(', ') || ''}
                onChange={(e) => handleStaffInputChange('inactive', 'translator', e)}
              />
              <input
                type="text"
                placeholder="Editors (comma-separated)"
                value={editingNovel ? editingNovel.inactive?.editor?.join(', ') || '' : newNovel.inactive?.editor?.join(', ') || ''}
                onChange={(e) => handleStaffInputChange('inactive', 'editor', e)}
              />
              <input
                type="text"
                placeholder="Proofreaders (comma-separated)"
                value={editingNovel ? editingNovel.inactive?.proofreader?.join(', ') || '' : newNovel.inactive?.proofreader?.join(', ') || ''}
                onChange={(e) => handleStaffInputChange('inactive', 'proofreader', e)}
              />
            </div>
            
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
                    'insertdatetime', 'media', 'table', 'help', 'wordcount',
                    'preview'
                  ],
                  toolbar: 'undo redo | formatselect | ' +
                    'bold italic underline strikethrough | ' +
                    'alignleft aligncenter alignright alignjustify | ' +
                    'bullist numlist outdent indent | ' +
                    'link image | code preview | removeformat | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  skin: 'oxide',
                  content_css: 'default',
                  placeholder: 'Write novel description...',
                  statusbar: false,
                  resize: false,
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
                    'insertdatetime', 'table', 'help', 'wordcount',
                    'preview'
                  ],
                  toolbar: 'undo redo | formatselect | ' +
                    'bold italic underline | ' +
                    'bullist numlist | ' +
                    'link | code preview | removeformat | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  skin: 'oxide',
                  content_css: 'default',
                  placeholder: 'Write your note here...',
                  statusbar: false,
                  resize: false,
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
                  }
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
            {sortedNovels.map(novel => (
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