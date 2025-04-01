/**
 * ChapterDashboard Component
 * 
 * Admin interface for managing novel chapters including:
 * - Chapter listing and management
 * - Chapter creation and editing
 * - Chapter deletion
 * - Chapter reordering
 * - Chapter status management
 * 
 * Features:
 * - Drag-and-drop chapter reordering
 * - Chapter preview
 * - Bulk actions
 * - Status indicators
 * - Pagination
 * - Search and filtering
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/components/ChapterDashboard.css';
import config from '../config/config';
import { Editor } from '@tinymce/tinymce-react';

/**
 * ChapterDashboard Component
 * 
 * Main component that provides administrative interface for managing
 * chapters of a novel
 * 
 * @param {Object} props - No props required, uses URL parameters
 */
const ChapterDashboard = () => {
  // Get novel ID from URL parameters and module ID from query parameters
  const { novelId } = useParams();
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get('moduleId');
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management for novel data and form inputs
  const [novel, setNovel] = useState(null);
  const [module, setModule] = useState(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [loading, setLoading] = useState(true);  // Set initial loading state to true
  const [error, setError] = useState('');
  const editorRef = useRef(null);

  /**
   * Fetches novel and module data when component mounts
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);  // Set loading state when fetching starts
        setError('');      // Clear any existing errors

        // Fetch novel data
        const novelResponse = await fetch(`${config.backendUrl}/api/novels/${novelId}`);
        const novelData = await novelResponse.json();
        setNovel(novelData);

        // Fetch module data if moduleId exists
        if (moduleId) {
          const moduleResponse = await fetch(`${config.backendUrl}/api/novels/${novelId}/modules/${moduleId}`);
          if (!moduleResponse.ok) {
            throw new Error('Module not found');
          }
          const moduleData = await moduleResponse.json();
          setModule(moduleData);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);  // Set loading to false when done, regardless of outcome
      }
    };

    fetchData();
  }, [novelId, moduleId]);

  /**
   * Handles chapter form submission
   * Creates a new chapter for the selected novel and module
   * 
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate moduleId
    if (!moduleId) {
      setError('No module selected. Please select a module first.');
      setLoading(false);
      return;
    }

    try {
      // Get content from TinyMCE editor and clean it
      const content = editorRef.current.getContent();
      console.log('Got content from editor, length:', content.length);
      console.log('Module ID:', moduleId);
      
      // Basic HTML cleaning while preserving important formatting
      const cleanedContent = content
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/>\s+</g, '><') // Remove spaces between HTML tags
        .trim();
      
      // Log sizes for debugging
      const contentSizeMB = (cleanedContent.length / (1024 * 1024)).toFixed(2);
      console.log('Content size:', contentSizeMB, 'MB');
      console.log('Chapter title:', chapterTitle);

      if (cleanedContent.length > 40 * 1024 * 1024) {
        setError('Content is too large. Please reduce formatting or split into multiple chapters.');
        setLoading(false);
        return;
      }
      
      // Create the chapter with moduleId
      console.log('Sending request to create chapter...');
      const chapterResponse = await axios.post(
        `${config.backendUrl}/api/chapters`,
        {
          novelId: novelId,
          moduleId: moduleId,
          title: chapterTitle,
          content: cleanedContent
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      console.log('Chapter created successfully:', chapterResponse.data);

      // Navigate back to the novel detail page
      navigate(`/novel/${novelId}`);
    } catch (err) {
      console.error('Error details:', err);
      console.error('Response data:', err.response?.data);
      console.error('Status code:', err.response?.status);
      setError(err.response?.data?.message || err.message || 'Failed to create chapter. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if user has admin privileges
  if (user?.role !== 'admin') {
    return <div className="error">Access denied. Admin only.</div>;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="loading">
        <div>Loading...</div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Show error if module is not found AFTER loading is complete
  if (!module && moduleId && !loading) {
    return (
      <div className="error">
        Module not found. <Link to={`/novel/${novelId}`}>Return to novel</Link>
      </div>
    );
  }

  return (
    <div className="chapter-dashboard">
      {/* Header section with novel title and back button */}
      <div className="chapter-dashboard-header">
        <div className="header-content">
          <h1>Add New Chapter</h1>
          <h2>{novel?.title}</h2>
          {module && <div className="module-title">Module: {module.title}</div>}
        </div>
        <Link to={`/novel/${novelId}`} className="back-to-novel">
          Back to Novel
        </Link>
      </div>

      {/* Chapter creation form */}
      <form onSubmit={handleSubmit} className="chapter-form">
        {/* Chapter title input */}
        <div className="chapter-title-group">
          <label>Chapter Title:</label>
          <input
            type="text"
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            placeholder="Enter chapter title"
            required
          />
        </div>

        {/* Chapter content editor */}
        <div className="chapter-content-group">
          <label>Chapter Content:</label>
          <div className="chapter-content-editor">
            <Editor
              apiKey={config.tinymceApiKey}
              onInit={(evt, editor) => editorRef.current = editor}
              init={{
                height: 500,
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
                placeholder: 'Enter chapter content...',
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
        </div>

        {/* Error message display */}
        {error && <div className="error-message">{error}</div>}

        {/* Form action buttons */}
        <div className="form-actions">
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Saving...' : 'Save Chapter'}
          </button>
          <Link to={`/novel/${novelId}`} className="cancel-btn">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ChapterDashboard;