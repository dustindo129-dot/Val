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

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import '../styles/components/AdminDashboard.css';
import config from '../config/config';
import { Editor } from '@tinymce/tinymce-react';
import { Link } from 'react-router-dom';
import { useNovelStatus } from '../context/NovelStatusContext';
import { useNovel } from '../context/NovelContext';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import bunnyUploadService from '../services/bunnyUploadService';
import { generateNovelUrl } from '../utils/slugUtils';
import LoadingSpinner from './LoadingSpinner';

/**
 * AdminDashboardSEO Component
 * 
 * Provides SEO optimization for the AdminDashboard page including:
 * - Meta title and description
 * - Keywords
 * - Open Graph tags
 */
const AdminDashboardSEO = () => {
  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>Bảng Quản Trị - Dành cho Admin và Mod | Valvrareteam</title>
      <meta name="description" content="Trang quản trị dành cho admin và moderator Valvrareteam. Quản lý truyện, thêm/sửa/xóa Light Novel, quản lý thể loại và nội dung website." />
      <meta name="keywords" content="bảng quản trị, admin dashboard, quản lý truyện, light novel management, valvrareteam, admin panel" />
      <meta name="robots" content="noindex, nofollow" />
      
      {/* Language and charset */}
      <meta httpEquiv="Content-Language" content="vi-VN" />
      <meta name="language" content="Vietnamese" />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content="Bảng Quản Trị - Dành cho Admin và Mod | Valvrareteam" />
      <meta property="og:description" content="Trang quản trị dành cho admin và moderator Valvrareteam." />
      <meta property="og:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      <meta property="og:url" content="https://valvrareteam.net/bang-quan-tri" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="BBảng Quản Trị - Dành cho Admin và Mod| Valvrareteam" />
      <meta name="twitter:description" content="Trang quản trị dành cho admin và moderator Valvrareteam." />
      <meta name="twitter:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
    </Helmet>
  );
};

/**
 * DeleteConfirmationModal Component
 * 
 * Modal component that requires typing the novel title to confirm deletion.
 */
const DeleteConfirmationModal = ({ novel, onConfirm, onCancel }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isMatch, setIsMatch] = useState(false);
  
  useEffect(() => {
    setIsMatch(confirmText === novel.title);
  }, [confirmText, novel.title]);
  
  return (
    <div className="delete-confirmation-modal-overlay">
      <div className="delete-confirmation-modal">
        <h3>Xác nhận xóa truyện</h3>
        <p>Hành động này không thể hoàn tác. Để xác nhận, hãy nhập chính xác tiêu đề truyện: <strong className="non-selectable-text">{novel.title}</strong></p>
        
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Nhập tiêu đề truyện"
          className="confirmation-input"
        />
        
        <div className="confirmation-actions">
          <button 
            onClick={onConfirm} 
            disabled={!isMatch}
            className={`confirm-delete-btn ${isMatch ? 'enabled' : 'disabled'}`}
          >
            Xóa truyện
          </button>
          <button onClick={onCancel} className="cancel-delete-btn">
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  );
};

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

  // Clear cache when user changes (logout/login with different user)
  const previousUserRef = useRef(null);
  useEffect(() => {
    // Only clear cache if user actually changed (not on initial load)
    const currentUserKey = user ? `${user.id}_${user.role}` : null;
    const previousUserKey = previousUserRef.current ? `${previousUserRef.current.id}_${previousUserRef.current.role}` : null;
    
    if (previousUserRef.current !== null && currentUserKey !== previousUserKey) {
      // Clear all novels cache when user actually changes
      console.log('User changed, clearing novels cache');
      queryClient.removeQueries({ queryKey: ['novels'] });
    }
    
    previousUserRef.current = user;
  }, [user?.id, user?.role, queryClient]);

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
      pj_user: [],
      translator: [],
      editor: [],
      proofreader: []
    },
    inactive: {
      pj_user: [],
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
  
  // User search state for active staff
  const [userSearchResults, setUserSearchResults] = useState({});
  const [searchingUsers, setSearchingUsers] = useState({});
  
  const [description, setDescription] = useState('');
  const editorRef = useRef(null);
  const noteEditorRef = useRef(null);

  // State for editing novel balance
  const [editingBalanceId, setEditingBalanceId] = useState(null);
  const [balanceValue, setBalanceValue] = useState(0);

  // Add state for delete confirmation modal
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState({
    isOpen: false,
    novelToDelete: null
  });

  // Add debounce timeout ref for user search
  const searchTimeoutRef = useRef(null);

  // Add refs for search containers to handle outside clicks
  const searchContainerRefs = useRef({});

  // Add effect to handle clicking outside search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check each search container
      Object.entries(searchContainerRefs.current).forEach(([itemId, ref]) => {
        if (ref && !ref.contains(event.target)) {
          // Click was outside this search container, clear its results
          setUserSearchResults(prev => {
            const newResults = { ...prev };
            if (newResults[itemId] && newResults[itemId].length > 0) {
              newResults[itemId] = [];
            }
            return newResults;
          });
        }
      });
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch novels using React Query
  const { data: novels = [], isLoading: novelsLoading } = useQuery({
    queryKey: ['novels', user?.id, user?.role], // Include user info in cache key
    queryFn: async () => {
      const response = await fetch(`${config.backendUrl}/api/novels?limit=1000&bypass=true&skipPopulation=true&t=${Date.now()}`, {
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
    enabled: !!user, // Only fetch when user is available
    staleTime: 60000, // Consider data fresh for 1 minute
    cacheTime: 300000, // Cache for 5 minutes
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false // Don't refetch on reconnect
  });

  // Sort novels by updatedAt timestamp (most recent first)
  const sortedNovels = useMemo(() => {
    if (!novels || novels.length === 0) return [];
    
    // No need for client-side filtering anymore - server handles role-based filtering
    return novels.sort((a, b) => {
      // Get the timestamp for each novel
      const timestampA = new Date(a.updatedAt || a.createdAt).getTime();
      const timestampB = new Date(b.updatedAt || b.createdAt).getTime();
      
      // Sort descending (newest first)
      return timestampB - timestampA;
    });
  }, [novels]);

  // Check if user can perform admin operations
  const canEditNovels = user && (user.role === 'admin' || user.role === 'moderator' || user.role === 'pj_user');
  const canDeleteNovels = user && (user.role === 'admin');
  const canEditBalances = user && (user.role === 'admin');
  const canCreateNovels = user && (user.role === 'admin' || user.role === 'moderator');
  const canEditStaff = user && (user.role === 'admin' || user.role === 'moderator');

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
    // Prevent pj_user from adding staff
    if (user?.role === 'pj_user') return;
    
    if (status === 'active') {
      // Active staff items have user search functionality
      const newItem = { 
        id: Date.now(), 
        selectedUser: null, 
        searchQuery: '',
        role: 'pj_user' 
      };
      setActiveStaffItems([...activeStaffItems, newItem]);
    } else {
      // Inactive staff items are simple name strings
      const newItem = { 
        id: Date.now(), 
        name: '', 
        role: 'pj_user' 
      };
      setInactiveStaffItems([...inactiveStaffItems, newItem]);
    }
  };

  /**
   * Removes a staff item by id
   * @param {string} status - 'active' or 'inactive'
   * @param {number} id - id of the staff item to remove
   */
  const removeStaffItem = (status, id) => {
    // Prevent pj_user from removing staff
    if (user?.role === 'pj_user') return;
    
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
   * @param {string} field - field name to update
   * @param {string} value - new value
   */
  const handleStaffItemChange = (status, id, field, value) => {
    // Prevent pj_user from modifying staff
    if (user?.role === 'pj_user') return;
    
    if (status === 'active') {
      if (field === 'searchQuery') {
        // Handle user search for active staff
        setActiveStaffItems(activeStaffItems.map(item => 
          item.id === id ? { ...item, searchQuery: value, selectedUser: null } : item
        ));
        // Clear previous timeout
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        // Debounce the search call
        searchTimeoutRef.current = setTimeout(() => {
          searchUsers(value, id);
        }, 300); // 300ms debounce delay
      } else if (field === 'role') {
        // Handle role change for active staff
        setActiveStaffItems(activeStaffItems.map(item => 
          item.id === id ? { ...item, [field]: value } : item
        ));
      }
    } else {
      // Handle inactive staff (simple name/role fields)
      setInactiveStaffItems(inactiveStaffItems.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    }
  };

  /**
   * Clears search results for a specific staff item
   * @param {number} itemId - Staff item ID
   */
  const clearSearchResults = (itemId) => {
    setUserSearchResults(prev => ({ ...prev, [itemId]: [] }));
  };

  /**
   * Fetches user data by ID for active staff initialization
   * @param {string} userId - User ID to fetch
   * @returns {Object|null} User object or null if not found
   */
  const fetchUserById = async (userId) => {
    try {
      const response = await fetch(`${config.backendUrl}/api/users/id/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        return userData;
      }
    } catch (error) {
      console.error('❌ Error fetching user:', error);
    }
    return null;
  };

  // Initialize staff items from novel data when editing
  useEffect(() => {
    if (editingNovel) {
      // Reset current staff items
      const activeItems = [];
      const inactiveItems = [];
      
      // Helper function to check if a value looks like a MongoDB ObjectId
      const isObjectId = (str) => {
        return typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);
      };
      
      // Helper function to fetch user data and create active staff item
      const createActiveStaffItem = async (item, role) => {
        if (isObjectId(item)) {
          // This is a User ObjectId - fetch the user data
          try {
            const userData = await fetchUserById(item);
            if (userData) {
              return { 
                id: Date.now() + Math.random(), 
                selectedUser: userData, // Set the actual user data
                searchQuery: userData.displayName || userData.username, // Show the user's name
                userId: item, // Store the actual user ID
                role 
              };
            } else {
              // User not found, show placeholder
              return { 
                id: Date.now() + Math.random(), 
                selectedUser: null,
                searchQuery: `[User Not Found: ${item}]`,
                userId: item,
                role 
              };
            }
          } catch (error) {
            // On error, show placeholder
            return { 
              id: Date.now() + Math.random(), 
              selectedUser: null,
              searchQuery: `[Error Loading User: ${item}]`,
              userId: item,
              role 
            };
          }
        } else {
          // This is a text string - treat as regular text input
          return { 
            id: Date.now() + Math.random(), 
            selectedUser: null, // No selected user
            searchQuery: item, // Use the text as search query
            role 
          };
        }
      };
      
      // Process active staff asynchronously
      const processActiveStaff = async () => {
        const activeItemsPromises = [];
        
        ['pj_user', 'translator', 'editor', 'proofreader'].forEach(role => {
          if (editingNovel.active && Array.isArray(editingNovel.active[role])) {
            editingNovel.active[role].forEach((item) => {
              activeItemsPromises.push(createActiveStaffItem(item, role));
            });
          }
        });
        
        // Wait for all user data to be fetched
        const resolvedActiveItems = await Promise.all(activeItemsPromises);
        setActiveStaffItems(resolvedActiveItems);
      };
      
      // Process inactive staff (these are always text strings)
      ['pj_user', 'translator', 'editor', 'proofreader'].forEach(role => {
        if (editingNovel.inactive && Array.isArray(editingNovel.inactive[role])) {
          editingNovel.inactive[role].forEach(name => {
            inactiveItems.push({ id: Date.now() + Math.random(), name, role });
          });
        }
      });
      
      // Set inactive items immediately
      setInactiveStaffItems(inactiveItems);
      
      // Process active staff asynchronously
      processActiveStaff().catch(error => {
        // On error, fall back to the old behavior
        const fallbackActiveItems = [];
        ['pj_user', 'translator', 'editor', 'proofreader'].forEach(role => {
          if (editingNovel.active && Array.isArray(editingNovel.active[role])) {
            editingNovel.active[role].forEach((item) => {
              if (isObjectId(item)) {
                fallbackActiveItems.push({ 
                  id: Date.now() + Math.random(), 
                  selectedUser: null,
                  searchQuery: `[Linked User: ${item}]`,
                  userId: item,
                  role 
                });
              } else {
                fallbackActiveItems.push({ 
                  id: Date.now() + Math.random(), 
                  selectedUser: null,
                  searchQuery: item,
                  role 
                });
              }
            });
          }
        });
        setActiveStaffItems(fallbackActiveItems);
      });
    } else {
      // Clear staff items when not editing
      setActiveStaffItems([]);
      setInactiveStaffItems([]);
    }
  }, [editingNovel?._id]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handles illustration file upload
   * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event
   */
  const handleIllustrationUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng tải lên tệp ảnh');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước ảnh phải nhỏ hơn 5MB');
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
      setError('Không thể tải lên ảnh');
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
          pj_user: staffData.active.pj_user || [],
          translator: staffData.active.translator || [],
          editor: staffData.active.editor || [],
          proofreader: staffData.active.proofreader || []
        },
        inactive: {
          pj_user: staffData.inactive.pj_user || [],
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

      // If editing, preserve timestamp for all changes except status changes
      if (editingNovel) {
        const hasStatusChange = novelData.status !== editingNovel.status;

        if (!hasStatusChange) {
          // Preserve the original updatedAt timestamp for all non-status changes
          // This includes title, note, illustration, and staff changes
          novelData.updatedAt = editingNovel.updatedAt;
          novelData.preserveTimestamp = true; // Flag for backend
        }
      }

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
      queryClient.removeQueries(['novels', user?.id, user?.role]);
      
      // Manually fetch fresh data to update the UI immediately
      try {
        const fetchResponse = await fetch(`${config.backendUrl}/api/novels?limit=1000&skipPopulation=true&t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (fetchResponse.ok) {
          const data = await fetchResponse.json();
          const novelsList = Array.isArray(data.novels) ? data.novels : (Array.isArray(data) ? data : []);
          
          // Update cache with fresh data that includes the new novel
          queryClient.setQueryData(['novels', user?.id, user?.role], novelsList);
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
        pj_user: novel.active?.pj_user || [],
        translator: novel.active?.translator || [],
        editor: novel.active?.editor || [],
        proofreader: novel.active?.proofreader || []
      },
      inactive: {
        pj_user: novel.inactive?.pj_user || [],
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
   * Opens the delete confirmation modal
   * @param {Object} novel - Novel to be deleted
   */
  const openDeleteConfirmation = (novel) => {
    setDeleteConfirmationModal({
      isOpen: true,
      novelToDelete: novel
    });
  };

  /**
   * Closes the delete confirmation modal
   */
  const closeDeleteConfirmation = () => {
    setDeleteConfirmationModal({
      isOpen: false,
      novelToDelete: null
    });
  };

  /**
   * Initiates the novel deletion process
   * @param {string} id - ID of the novel to delete
   */
  const handleDelete = (novel) => {
    openDeleteConfirmation(novel);
  };

  /**
   * Performs the actual novel deletion after confirmation
   */
  const confirmDelete = async () => {
    const id = deleteConfirmationModal.novelToDelete._id;
    
    // Reset form first to discard any unsaved work
    resetForm();
    
    try {
      // Get current cache data
      const previousData = queryClient.getQueryData(['novels', user?.id, user?.role]) || [];
      
      // Create updated list without the deleted novel
      const updatedNovels = Array.isArray(previousData) 
        ? previousData.filter(novel => novel._id !== id) 
        : [];
      
      // Immediately update the cache
      queryClient.setQueryData(['novels', user?.id, user?.role], updatedNovels);
      
      // Perform the actual deletion
      const response = await fetch(`${config.backendUrl}/api/novels/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        // Revert cache if deletion failed
        queryClient.setQueryData(['novels', user?.id, user?.role], previousData);
        throw new Error('Failed to delete novel');
      }

      // Remove all cached data related to this novel
      queryClient.removeQueries(['novel', id]);
      
      // Lock in our updated novels list - this is the key to making the deletion stick
      queryClient.setQueryData(['novels', user?.id, user?.role], updatedNovels);
      
      setError('');
      // Close the modal
      closeDeleteConfirmation();
    } catch (err) {
      console.error('Error deleting novel:', err);
      setError(err.message);
      // Close the modal
      closeDeleteConfirmation();
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
        pj_user: [],
        translator: [],
        editor: [],
        proofreader: []
      },
      inactive: {
        pj_user: [],
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
    // Clear user search states
    setUserSearchResults({});
    setSearchingUsers({});
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
      const previousData = queryClient.getQueryData(['novels', user?.id, user?.role]);
      
      // Create a timestamp for the status update (this should update updatedAt)
      const updatedAt = new Date().toISOString();
      
      // Find the novel in the current data
      const currentNovel = previousData.find(novel => novel._id === id);
      if (!currentNovel) {
        throw new Error('Novel not found');
      }
      
      // Optimistically update the cache
      queryClient.setQueryData(['novels', user?.id, user?.role], old => 
        Array.isArray(old) 
          ? old.map(novel => novel._id === id ? { ...novel, status, updatedAt } : novel)
          : []
      );

      // Update the status in the context
      updateNovelStatus(id, status);

      // Send request to server - status changes should update timestamp
      const response = await fetch(`${config.backendUrl}/api/novels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          ...currentNovel, // Include all existing novel data
          status,
          updatedAt,
          // Don't preserve timestamp for status changes - we want it to update
          preserveTimestamp: false
        })
      });

      if (!response.ok) {
        // If update failed, revert the cache to previous state
        queryClient.setQueryData(['novels', user?.id, user?.role], previousData);
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể cập nhật trạng thái truyện');
      }
      
      // Get updated novel data
      const updatedNovel = await response.json();
      
      // Update cache with complete novel data
      queryClient.setQueryData(['novels', user?.id, user?.role], old => 
        Array.isArray(old) 
          ? old.map(novel => novel._id === id ? { ...novel, ...updatedNovel } : novel)
          : []
      );

      // Also invalidate novel list and hot novels queries to ensure they're updated
      queryClient.invalidateQueries({ queryKey: ['novels', user?.id, user?.role] });
      queryClient.invalidateQueries({ queryKey: ['hotNovels'] });

    } catch (err) {
      // Revert cache on error
      queryClient.setQueryData(['novels', user?.id, user?.role], previousData);

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

      // Immediately fetch fresh data
      const freshDataResponse = await fetch(`${config.backendUrl}/api/novels?limit=1000&bypass=true&skipPopulation=true&t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (freshDataResponse.ok) {
        const freshData = await freshDataResponse.json();
        const freshNovels = Array.isArray(freshData.novels) ? freshData.novels : (Array.isArray(freshData) ? freshData : []);
        queryClient.setQueryData(['novels', user?.id, user?.role], freshNovels);
      }
      
      // Force invalidation of the queries to ensure fresh data on next render
      queryClient.invalidateQueries(['novels', user?.id, user?.role]);

      // Exit edit mode
      setEditingBalanceId(null);
      setError('');
    } catch (err) {
      console.error('Lỗi cập nhật số dư:', err);
      setError(err.message);
    }
  };

  /**
   * Searches for users by username/displayName for active staff assignment
   * @param {string} query - Search query
   * @param {number} itemId - Staff item ID for tracking search results
   */
  const searchUsers = async (query, itemId) => {
    if (!query || query.length < 2) {
      setUserSearchResults(prev => ({ ...prev, [itemId]: [] }));
      return;
    }

    setSearchingUsers(prev => ({ ...prev, [itemId]: true }));

    try {
      const response = await fetch(`${config.backendUrl}/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const users = await response.json();
        setUserSearchResults(prev => ({ ...prev, [itemId]: users }));
      } else {
        setUserSearchResults(prev => ({ ...prev, [itemId]: [] }));
      }
    } catch (error) {
      console.error('User search error:', error);
      setUserSearchResults(prev => ({ ...prev, [itemId]: [] }));
    } finally {
      setSearchingUsers(prev => ({ ...prev, [itemId]: false }));
    }
  };

  /**
   * Selects a user for active staff assignment
   * @param {number} itemId - Staff item ID
   * @param {Object} user - Selected user object
   */
  const selectUserForActiveStaff = (itemId, user) => {
    setActiveStaffItems(activeStaffItems.map(item => 
      item.id === itemId ? { 
        ...item, 
        selectedUser: user,
        searchQuery: user.displayName || user.username
      } : item
    ));
    // Clear search results for this item
    setUserSearchResults(prev => ({ ...prev, [itemId]: [] }));
  };

  // Convert staff items arrays to the novel staff structure
  const compileStaffToNovel = () => {
    const active = {
      pj_user: [
        // User IDs for selected users
        ...activeStaffItems
          .filter(item => item.role === 'pj_user' && item.selectedUser)
          .map(item => item.selectedUser._id),
        // User IDs for previously linked users (backward compatibility)
        ...activeStaffItems
          .filter(item => item.role === 'pj_user' && !item.selectedUser && item.userId)
          .map(item => item.userId),
        // Text names for non-selected entries (backward compatibility)
        ...activeStaffItems
          .filter(item => item.role === 'pj_user' && !item.selectedUser && !item.userId && item.searchQuery?.trim())
          .map(item => item.searchQuery.trim())
      ],
      translator: [
        // User IDs for selected users
        ...activeStaffItems
          .filter(item => item.role === 'translator' && item.selectedUser)
          .map(item => item.selectedUser._id),
        // User IDs for previously linked users (backward compatibility)
        ...activeStaffItems
          .filter(item => item.role === 'translator' && !item.selectedUser && item.userId)
          .map(item => item.userId),
        // Text names for non-selected entries (backward compatibility)
        ...activeStaffItems
          .filter(item => item.role === 'translator' && !item.selectedUser && !item.userId && item.searchQuery?.trim())
          .map(item => item.searchQuery.trim())
      ],
      editor: [
        // User IDs for selected users
        ...activeStaffItems
          .filter(item => item.role === 'editor' && item.selectedUser)
          .map(item => item.selectedUser._id),
        // User IDs for previously linked users (backward compatibility)
        ...activeStaffItems
          .filter(item => item.role === 'editor' && !item.selectedUser && item.userId)
          .map(item => item.userId),
        // Text names for non-selected entries (backward compatibility)
        ...activeStaffItems
          .filter(item => item.role === 'editor' && !item.selectedUser && !item.userId && item.searchQuery?.trim())
          .map(item => item.searchQuery.trim())
      ],
      proofreader: [
        // User IDs for selected users
        ...activeStaffItems
          .filter(item => item.role === 'proofreader' && item.selectedUser)
          .map(item => item.selectedUser._id),
        // User IDs for previously linked users (backward compatibility)
        ...activeStaffItems
          .filter(item => item.role === 'proofreader' && !item.selectedUser && item.userId)
          .map(item => item.userId),
        // Text names for non-selected entries (backward compatibility)
        ...activeStaffItems
          .filter(item => item.role === 'proofreader' && !item.selectedUser && !item.userId && item.searchQuery?.trim())
          .map(item => item.searchQuery.trim())
      ]
    };
    
    const inactive = {
      pj_user: inactiveStaffItems
        .filter(item => item.role === 'pj_user' && item.name.trim())
        .map(item => item.name.trim()),
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

  return (
    <div className="admin-dashboard">
      <AdminDashboardSEO />
      <h2 className="section-title">Quản lý truyện</h2>
      {error && <div className="error">{error}</div>}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmationModal.isOpen && (
        <DeleteConfirmationModal 
          novel={deleteConfirmationModal.novelToDelete}
          onConfirm={confirmDelete}
          onCancel={closeDeleteConfirmation}
        />
      )}
      
      <div className="dashboard-grid">
        {/* Novel Form Section */}
        <div className="novel-form">
          <h3 className="section-title">
            {editingNovel ? 'Chỉnh sửa truyện' : (canCreateNovels ? 'Thêm truyện mới' : 'Quản lý truyện')}
          </h3>
          {(editingNovel || canCreateNovels) && (
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
                  {canEditStaff && (
                    <button 
                      type="button" 
                      className="add-staff-btn" 
                      onClick={() => addStaffItem('active')}
                    >
                      +
                    </button>
                  )}
                </div>
                
                {!canEditStaff && (
                  <div className="staff-edit-note">
                    <em>Liên hệ admin/mod hoặc fanpage để chỉnh sửa mục nhân sự</em>
                  </div>
                )}
                
                <div className="staff-items-grid">
                  {activeStaffItems.map((item, index) => (
                    <div key={item.id} className="staff-item" data-role={item.role}>
                      <div 
                        className="user-search-container"
                        ref={(ref) => {
                          if (ref) {
                            searchContainerRefs.current[item.id] = ref;
                          } else {
                            delete searchContainerRefs.current[item.id];
                          }
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Tìm người dùng..."
                          value={item.searchQuery || ''}
                          onChange={(e) => handleStaffItemChange('active', item.id, 'searchQuery', e.target.value)}
                          disabled={!canEditStaff}
                        />
                        {item.selectedUser && (
                          <div className="user-selected-indicator">
                            ✓
                          </div>
                        )}
                        {searchingUsers[item.id] && (
                          <div className="search-loading">Đang tìm...</div>
                        )}
                        {userSearchResults[item.id] && userSearchResults[item.id].length > 0 && canEditStaff && (
                          <div className="user-search-results">
                            {userSearchResults[item.id].map(user => (
                              <div 
                                key={user._id} 
                                className="user-search-result"
                                onClick={() => selectUserForActiveStaff(item.id, user)}
                              >
                                <div className="user-info">
                                  <span className="admin-user-display-name">{user.displayName || user.username}</span>
                                  <span className="user-username">@{user.username}</span>
                                </div>
                              </div>
                            ))}
                            <div className="search-help-text">
                              Nhấp bên ngoài để đóng hoặc nhập tên trực tiếp nếu người này chưa có tài khoản
                            </div>
                          </div>
                        )}
                      </div>
                      <select
                        value={item.role}
                        onChange={(e) => handleStaffItemChange('active', item.id, 'role', e.target.value)}
                        disabled={!canEditStaff}
                      >
                        <option value="pj_user">Quản lý dự án</option>
                        <option value="translator">Dịch giả</option>
                        <option value="editor">Biên tập</option>
                        <option value="proofreader">Kiểm tra chất lượng</option>
                      </select>
                      {canEditStaff && (
                        <button 
                          type="button" 
                          className="remove-staff-btn" 
                          onClick={() => removeStaffItem('active', item.id)}
                          aria-label="Remove staff member"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Staff Section - Inactive */}
                <div className="staff-header">
                  <h4>Nhân sự không hoạt động</h4>
                  {canEditStaff && (
                    <button 
                      type="button" 
                      className="add-staff-btn" 
                      onClick={() => addStaffItem('inactive')}
                    >
                      +
                    </button>
                  )}
                </div>
                
                <div className="staff-items-grid">
                  {inactiveStaffItems.map((item, index) => (
                    <div key={item.id} className="staff-item" data-role={item.role}>
                      <input
                        type="text"
                        placeholder="Name"
                        value={item.name}
                        onChange={(e) => handleStaffItemChange('inactive', item.id, 'name', e.target.value)}
                        disabled={!canEditStaff}
                      />
                      <select
                        value={item.role}
                        onChange={(e) => handleStaffItemChange('inactive', item.id, 'role', e.target.value)}
                        disabled={!canEditStaff}
                      >
                        <option value="pj_user">Quản lý dự án</option>
                        <option value="translator">Dịch giả</option>
                        <option value="editor">Biên tập viên</option>
                        <option value="proofreader">Người kiểm tra chất lượng</option>
                      </select>
                      {canEditStaff && (
                        <button 
                          type="button" 
                          className="remove-staff-btn" 
                          onClick={() => removeStaffItem('inactive', item.id)}
                          aria-label="Remove staff member"
                        >
                          ×
                        </button>
                      )}
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
          )}
        </div>

        {/* Novel List Section */}
        <div className="novel-list">
          <h3 className="section-title">Danh sách truyện</h3>
          {novelsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <LoadingSpinner size="medium" text="Đang tải danh sách truyện..." />
            </div>
          ) : (
            <ul>
              {sortedNovels.map(novel => (
                <li key={novel._id}>
                  <div className="novel-title-section">
                    <div className="novel-info">
                      <Link 
                        to={generateNovelUrl(novel)}
                        className="novel-title-link"
                      >
                        {novel.title}
                      </Link>
                      <div className="novel-balance">
                        <div className="balance-info">
                          <div className="budget-display">
                            Kho lúa: {novel.novelBudget || 0} 🌾
                          </div>
                          <div className="balance-display">
                            {editingBalanceId === novel._id ? (
                              <div className="balance-edit-container">
                                <span>Số dư truyện: </span>
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
                                    Lưu
                                  </button>
                                  <button 
                                    onClick={cancelEditBalance}
                                    className="cancel-balance-btn"
                                  >
                                    Hủy bỏ
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                Số dư truyện: {novel.novelBalance || 0} 🌾
                                {canEditBalances && (
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
                      <option value="Hiatus">Tạm ngưng</option>
                    </select>
                    {canEditNovels && (
                      <button onClick={() => handleEdit(novel)}>Chỉnh sửa</button>
                    )}
                    {canDeleteNovels && (
                      <button 
                        className="delete"
                        onClick={() => handleDelete(novel)}
                      >Xóa</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;