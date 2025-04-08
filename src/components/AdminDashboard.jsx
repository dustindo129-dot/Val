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
  
  // Staff management state
  const [activeStaffItems, setActiveStaffItems] = useState([]);
  const [inactiveStaffItems, setInactiveStaffItems] = useState([]);
  
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
   * Adds a new staff item to either active or inactive staff
   * @param {string} status - 'active' or 'inactive'
   */
  const addStaffItem = (status) => {
    const newItem = { id: Date.now(), name: '', role: 'translator' };
    
    if (status === 'active') {
      setActiveStaffItems([...activeStaffItems, newItem]);
    } else {
      setInactiveStaffItems([...inactiveStaffItems, newItem]);
    }
  };

  /**
   * Removes a staff item by id
   * @param {string} status - 'active' or 'inactive'
   * @param {number} id - id of the staff item to remove
   */
  const removeStaffItem = (status, id) => {
    if (status === 'active') {
      setActiveStaffItems(activeStaffItems.filter(item => item.id !== id));
    } else {
      setInactiveStaffItems(inactiveStaffItems.filter(item => item.id !== id));
    }
  };

  /**
   * Handles changes to a staff item
   * @param {string} status - 'active' or 'inactive'
   * @param {number} id - id of the staff item
   * @param {string} field - 'name' or 'role'
   * @param {string} value - new value
   */
  const handleStaffItemChange = (status, id, field, value) => {
    if (status === 'active') {
      setActiveStaffItems(activeStaffItems.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    } else {
      setInactiveStaffItems(inactiveStaffItems.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    }
  };

  // Convert staff items arrays to the novel staff structure
  const compileStaffToNovel = () => {
    const active = {
      translator: activeStaffItems
        .filter(item => item.role === 'translator' && item.name.trim())
        .map(item => item.name.trim()),
      editor: activeStaffItems
        .filter(item => item.role === 'editor' && item.name.trim())
        .map(item => item.name.trim()),
      proofreader: activeStaffItems
        .filter(item => item.role === 'proofreader' && item.name.trim())
        .map(item => item.name.trim())
    };
    
    const inactive = {
      translator: inactiveStaffItems
        .filter(item => item.role === 'translator' && item.name.trim())
        .map(item => item.name.trim()),
      editor: inactiveStaffItems
        .filter(item => item.role === 'editor' && item.name.trim())
        .map(item => item.name.trim()),
      proofreader: inactiveStaffItems
        .filter(item => item.role === 'proofreader' && item.name.trim())
        .map(item => item.name.trim())
    };
    
    return { active, inactive };
  };

  // Initialize staff items from novel data when editing
  useEffect(() => {
    if (editingNovel) {
      // Reset current staff items
      const activeItems = [];
      const inactiveItems = [];
      
      // Process active staff
      ['translator', 'editor', 'proofreader'].forEach(role => {
        if (editingNovel.active && Array.isArray(editingNovel.active[role])) {
          editingNovel.active[role].forEach(name => {
            activeItems.push({ id: Date.now() + Math.random(), name, role });
          });
        }
      });
      
      // Process inactive staff
      ['translator', 'editor', 'proofreader'].forEach(role => {
        if (editingNovel.inactive && Array.isArray(editingNovel.inactive[role])) {
          editingNovel.inactive[role].forEach(name => {
            inactiveItems.push({ id: Date.now() + Math.random(), name, role });
          });
        }
      });
      
      setActiveStaffItems(activeItems);
      setInactiveStaffItems(inactiveItems);
    } else {
      // Clear staff items when not editing
      setActiveStaffItems([]);
      setInactiveStaffItems([]);
    }
  }, [editingNovel?._id]);

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
      
      // Compile staff data from staff items
      const staffData = compileStaffToNovel();
      
      const novelData = {
        title: editingNovel ? editingNovel.title : newNovel.title,
        alternativeTitles: editingNovel ? editingNovel.alternativeTitles : newNovel.alternativeTitles,
        author: editingNovel ? editingNovel.author : newNovel.author,
        illustrator: editingNovel ? editingNovel.illustrator : newNovel.illustrator,
        active: staffData.active,
        inactive: staffData.inactive,
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
            
            {/* Staff Section - Active */}
            <div className="staff-section">
              <div className="staff-header">
                <h4>Active Staff</h4>
                <button 
                  type="button" 
                  className="add-staff-btn" 
                  onClick={() => addStaffItem('active')}
                >
                  +
                </button>
              </div>
              
              <div className="staff-items-grid">
                {activeStaffItems.map((item, index) => (
                  <div key={item.id} className="staff-item">
                    <input
                      type="text"
                      placeholder="Name"
                      value={item.name}
                      onChange={(e) => handleStaffItemChange('active', item.id, 'name', e.target.value)}
                    />
                    <select
                      value={item.role}
                      onChange={(e) => handleStaffItemChange('active', item.id, 'role', e.target.value)}
                    >
                      <option value="translator">Translator</option>
                      <option value="editor">Editor</option>
                      <option value="proofreader">Proofreader</option>
                    </select>
                    <button 
                      type="button" 
                      className="remove-staff-btn" 
                      onClick={() => removeStaffItem('active', item.id)}
                      aria-label="Remove staff member"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Staff Section - Inactive */}
              <div className="staff-header">
                <h4>Inactive Staff</h4>
                <button 
                  type="button" 
                  className="add-staff-btn" 
                  onClick={() => addStaffItem('inactive')}
                >
                  +
                </button>
              </div>
              
              <div className="staff-items-grid">
                {inactiveStaffItems.map((item, index) => (
                  <div key={item.id} className="staff-item">
                    <input
                      type="text"
                      placeholder="Name"
                      value={item.name}
                      onChange={(e) => handleStaffItemChange('inactive', item.id, 'name', e.target.value)}
                    />
                    <select
                      value={item.role}
                      onChange={(e) => handleStaffItemChange('inactive', item.id, 'role', e.target.value)}
                    >
                      <option value="translator">Translator</option>
                      <option value="editor">Editor</option>
                      <option value="proofreader">Proofreader</option>
                    </select>
                    <button 
                      type="button" 
                      className="remove-staff-btn" 
                      onClick={() => removeStaffItem('inactive', item.id)}
                      aria-label="Remove staff member"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
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
                    'advlist', 'autolink', 'lists', 'link', 'charmap',
                    'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'help', 'wordcount',
                    'preview'
                  ],
                  toolbar: 'undo redo | formatselect | ' +
                    'bold italic underline strikethrough | ' +
                    'alignleft aligncenter alignright alignjustify | ' +
                    'bullist numlist outdent indent | ' +
                    'link | code preview | removeformat | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  skin: 'oxide',
                  content_css: 'default',
                  placeholder: 'Write novel description... (max 1000 words)',
                  statusbar: false,
                  resize: false,
                  branding: false,
                  promotion: false,
                  wordcount_countcharacters: true,
                  wordcount_countwords: true,
                  wordcount_countspaces: false,
                  wordcount_alwaysshown: true,
                  max_words: 1000,
                  setup: function(editor) {
                    editor.on('KeyUp', function(e) {
                      const wordCount = editor.plugins.wordcount.getCount();
                      if (wordCount > 1000) {
                        const content = editor.getContent();
                        const words = content.split(/\s+/);
                        editor.setContent(words.slice(0, 1000).join(' '));
                      }
                    });
                  },
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
                  statusbar: true,
                  resize: false,
                  branding: false,
                  promotion: false,
                  wordcount_countcharacters: true,
                  wordcount_countwords: true,
                  wordcount_countspaces: false,
                  wordcount_alwaysshown: true,
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
              <li key={novel._id}>
                <div className="novel-title-section">
                  <Link 
                    to={`/novel/${novel._id}`}
                    className="novel-title-link"
                  >
                    {novel.title}
                  </Link>
                </div>
                <div className="novel-actions">
                  <select
                    className="status-dropdown"
                    value={novel.status || 'Ongoing'}
                    onChange={(e) => handleStatusChange(novel._id, e.target.value)}
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Hiatus">Hiatus</option>
                  </select>
                  <button onClick={() => handleEdit(novel)}>Edit</button>
                  <button 
                    className="delete"
                    onClick={() => handleDelete(novel._id)}
                  >Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;