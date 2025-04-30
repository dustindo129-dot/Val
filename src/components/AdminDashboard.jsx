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
import bunnyUploadService from '../services/bunnyUploadService';

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
  const { user } = useAuth();

  // Genre categories and options
  const genreCategories = {
    'Thể Loại Chính': [
      'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy',
      'Historical', 'Horror', 'Mystery', 'Romance', 'Science Fiction',
      'Slice of Life', 'Supernatural', 'Suspense', 'Tragedy',
      'Magic', 'Psychological'
    ],
    'Đối Tượng': [
      'Seinen', 'Shounen', 'Josei', 'Shoujo'
    ],
    'Đặc Trưng Quan Hệ và Nhân Vật': [
      'Age Gap', 'Boys Love', 'Character Growth', 'Different Social Status',
      'Female Protagonist', 'Gender Bender', 'Harem', 'Incest',
      'Mature', 'Netorare', 'Reverse Harem', 'Yuri'
    ],
    'Thiết lập và Thế Giới': [
      'Cooking', 'Game', 'Isekai', 'Martial Arts', 'Mecha', 'Military',
      'Otome Game', 'Parody', 'School Life', 'Slow Life', 'Sports',
      'Super Power', 'Wars', 'Workplace'
    ],
    'Định Dạng và Nguồn gốc': [
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

  // State for editing novel balance
  const [editingBalanceId, setEditingBalanceId] = useState(null);
  const [balanceValue, setBalanceValue] = useState(0);

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
      
      // Upload using bunny CDN service
      const imageUrl = await bunnyUploadService.uploadFile(
        file, 
        'illustrations'
      );

      // Update the novel state with the new illustration URL
      if (editingNovel) {
        setEditingNovel({
          ...editingNovel,
          illustration: imageUrl
        });
      } else {
        setNewNovel({
          ...newNovel,
          illustration: imageUrl
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
      
      // Create novel data with all required fields
      const novelData = {
        title: editingNovel ? editingNovel.title : newNovel.title,
        alternativeTitles: editingNovel ? editingNovel.alternativeTitles : newNovel.alternativeTitles,
        author: editingNovel ? editingNovel.author : newNovel.author,
        illustrator: editingNovel ? editingNovel.illustrator : newNovel.illustrator,
        active: {
          translator: staffData.active.translator || [],
          editor: staffData.active.editor || [],
          proofreader: staffData.active.proofreader || []
        },
        inactive: {
          translator: staffData.inactive.translator || [],
          editor: staffData.inactive.editor || [],
          proofreader: staffData.inactive.proofreader || []
        },
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
    // Reset form first to discard any unsaved work
    resetForm();
    
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
    if (!window.confirm('Bạn có chắc chắn muốn xóa truyện này không?')) return;

    // Reset form first to discard any unsaved work
    resetForm();

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
    // Reset staff items
    setActiveStaffItems([]);
    setInactiveStaffItems([]);
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
    // Reset form first to discard any unsaved work
    resetForm();
    
    try {
      // Get current cache data
      const previousData = queryClient.getQueryData(['novels']);
      
      // Create a timestamp for consistent optimistic updates
      const updatedAt = new Date().toISOString();
      
      // Find the novel in the current data
      const currentNovel = previousData.find(novel => novel._id === id);
      if (!currentNovel) {
        throw new Error('Novel not found');
      }
      
      // Optimistically update the cache
      queryClient.setQueryData(['novels'], old => 
        Array.isArray(old) 
          ? old.map(novel => novel._id === id ? { ...novel, status, updatedAt } : novel)
          : []
      );

      // Update the status in the context
      updateNovelStatus(id, status);

      // Send request to server with all required fields
      const response = await fetch(`${config.backendUrl}/api/novels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          ...currentNovel, // Include all existing novel data
          status,
          updatedAt 
        })
      });

      if (!response.ok) {
        // If update failed, revert the cache to previous state
        queryClient.setQueryData(['novels'], previousData);
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể cập nhật trạng thái truyện');
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

  /**
   * Handles edit mode for novel balance
   * @param {string} id - Novel ID
   * @param {number} currentBalance - Current balance value
   */
  const handleEditBalance = (id, currentBalance) => {
    setEditingBalanceId(id);
    setBalanceValue(currentBalance || 0);
  };

  /**
   * Cancels balance editing mode
   */
  const cancelEditBalance = () => {
    setEditingBalanceId(null);
    setBalanceValue(0);
  };

  /**
   * Saves updated novel balance
   * @param {string} id - Novel ID
   */
  const saveBalanceChange = async (id) => {
    try {
      // Find the novel in the current data
      const novel = sortedNovels.find(novel => novel._id === id);
      if (!novel) {
        throw new Error('Novel not found');
      }

      // Send request to update only the balance without affecting updatedAt
      const response = await fetch(`${config.backendUrl}/api/novels/${id}/balance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          novelBalance: parseFloat(balanceValue) 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể cập nhật số dư truyện');
      }

      // Update the novel in cache
      queryClient.setQueryData(['novels'], old => 
        Array.isArray(old) 
          ? old.map(novel => novel._id === id ? { ...novel, novelBalance: parseFloat(balanceValue) } : novel)
          : []
      );

      // Exit edit mode
      setEditingBalanceId(null);
      setError('');
    } catch (err) {
      console.error('Lỗi cập nhật số dư:', err);
      setError(err.message);
    }
  };

  return (
    <div className="admin-dashboard">
      <h2 className="section-title">Quản lý truyện</h2>
      {error && <div className="error">{error}</div>}
      
      <div className="dashboard-grid">
        {/* Novel Form Section */}
        <div className="novel-form">
          <h3 className="section-title">{editingNovel ? 'Chỉnh sửa truyện' : 'Thêm truyện mới'}</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="title"
              placeholder="Tiêu đề"
              value={editingNovel ? editingNovel.title : newNovel.title}
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="alternativeTitles"
              placeholder="Tiêu đề khác"
              value={editingNovel ? editingNovel.alternativeTitles || '' : newNovel.alternativeTitles}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="author"
              placeholder="Tác giả"
              value={editingNovel ? editingNovel.author : newNovel.author}
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="illustrator"
              placeholder="Họa sĩ"
              value={editingNovel ? editingNovel.illustrator : newNovel.illustrator}
              onChange={handleInputChange}
            />
            
            {/* Staff Section - Active */}
            <div className="staff-section">
              <div className="staff-header">
                <h4>Nhân sự hoạt động</h4>
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
                      <option value="translator">Dịch giả</option>
                      <option value="editor">Biên tập viên</option>
                      <option value="proofreader">Người kiểm tra chất lượng</option>
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
                <h4>Nhân sự không hoạt động</h4>
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
                      <option value="translator">Dịch giả</option>
                      <option value="editor">Biên tập viên</option>
                      <option value="proofreader">Người kiểm tra chất lượng</option>
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
                placeholder="Thể loại đã chọn"
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
                onInit={(evt, editor) => editorRef.current = editor}
                initialValue={editingNovel ? editingNovel.description : newNovel.description}
                scriptLoading={{ async: true, load: "domainBased" }}
                init={{
                  script_src: config.tinymce.scriptPath, // Path to self-hosted TinyMCE
                  license_key: 'gpl',
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
                    'link | code preview | removeformat | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  skin: 'oxide',
                  content_css: 'default',
                  placeholder: 'Viết mô tả truyện... (tối đa 1000 từ)',
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

            {/* Note Editor */}
            <div className="note-editor">
              <Editor
                onInit={(evt, editor) => noteEditorRef.current = editor}
                initialValue={editingNovel ? editingNovel.note : newNovel.note}
                scriptLoading={{ async: true, load: "domainBased" }}
                init={{
                  script_src: config.tinymce.scriptPath, // Path to self-hosted TinyMCE
                  license_key: 'gpl',
                  height: 200,
                  menubar: false,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'charmap',
                    'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | formatselect | ' +
                    'bold italic underline | ' +
                    'bullist numlist | ' +
                    'link | code preview | removeformat | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  skin: 'oxide',
                  content_css: 'default',
                  placeholder: 'Viết ghi chú của bạn ở đây...',
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
                {loading ? 'Đang tải...' : 'Tải ảnh bìa'}
              </label>
            </div>
            <div className="form-buttons">
              <button type="submit" disabled={loading}>
                {loading ? 'Đang xử lý...' : (editingNovel ? 'Cập nhật truyện' : 'Thêm truyện')}
              </button>
              {editingNovel ? (
                <button type="button" onClick={resetForm} className="cancel-button">
                  Hủy bỏ
                </button>
              ) : (
                <button type="button" onClick={resetForm} className="discard-button">
                  Hủy bỏ bản nháp
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Novel List Section */}
        <div className="novel-list">
          <h3 className="section-title">Danh sách truyện</h3>
          <ul>
            {sortedNovels.map(novel => (
              <li key={novel._id}>
                <div className="novel-title-section">
                  <div className="novel-info">
                    <Link 
                      to={`/novel/${novel._id}`}
                      className="novel-title-link"
                    >
                      {novel.title}
                    </Link>
                    <div className="novel-balance">
                      {editingBalanceId === novel._id ? (
                        <div className="balance-edit-container">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={balanceValue}
                            onChange={(e) => setBalanceValue(e.target.value)}
                            className="balance-edit-input"
                          />
                          <div className="balance-edit-actions">
                            <button 
                              onClick={() => saveBalanceChange(novel._id)}
                              className="save-balance-btn"
                            >
                              Save
                            </button>
                            <button 
                              onClick={cancelEditBalance}
                              className="cancel-balance-btn"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          Số dư truyện: {novel.novelBalance || 0}
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleEditBalance(novel._id, novel.novelBalance || 0)}
                              className="edit-balance-btn"
                            >
                              Chỉnh sửa
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="novel-actions">
                  <select
                    className="status-dropdown"
                    value={novel.status || 'Ongoing'}
                    onChange={(e) => handleStatusChange(novel._id, e.target.value)}
                  >
                    <option value="Ongoing">Đang tiến hành</option>
                    <option value="Completed">Đã hoàn thành</option>
                    <option value="Hiatus">Tạm dừng</option>
                  </select>
                  {(user?.role === 'admin' || user?.role === 'moderator') && (
                    <button onClick={() => handleEdit(novel)}>Chỉnh sửa</button>
                  )}
                  {user?.role === 'admin' && (
                    <button 
                      className="delete"
                      onClick={() => handleDelete(novel._id)}
                    >Xóa</button>
                  )}
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