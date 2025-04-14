import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faSave } from '@fortawesome/free-solid-svg-icons';
import '../styles/Donation.css';
import config from '../config/config';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Donation = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const editorRef = useRef(null);
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchDonationContent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getDonationContent();
        setContent(data.content || '');
      } catch (err) {
        console.error('Failed to fetch donation content:', err);
        setError('Failed to load donation content. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDonationContent();
  }, []);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleImageUpload = async (blobInfo) => {
    try {
      const formData = new FormData();
      formData.append('file', blobInfo.blob(), blobInfo.filename());
      formData.append('upload_preset', config.cloudinary.uploadPresets.illustration);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  };

  const handleSaveChanges = async () => {
    if (!editorRef.current) return;

    setIsSaving(true);
    try {
      const newContent = editorRef.current.getContent();
      await api.updateDonationContent(newContent);
      setContent(newContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save changes:', error);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="donation-container">
        <div className="loading-spinner">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <p>Loading donation content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="donation-container">
        <div className="error-message">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="donation-container">
      <div className="donation-panel">
        <div className="donation-title">
          <h1>Donation</h1>
        </div>
        <div className="donation-header">
          {isAdmin && !isEditing && (
            <button className="edit-button" onClick={handleEditClick}>
              Edit
            </button>
          )}
          {isAdmin && isEditing && (
            <div className="edit-controls">
              <button 
                className="save-changes-btn" 
                onClick={handleSaveChanges}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} /> Save Changes
                  </>
                )}
              </button>
              <button 
                className="cancel-edit-btn" 
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancel Edit
              </button>
            </div>
          )}
        </div>
        <div className="donation-content">
          {isAdmin && isEditing ? (
            <Editor
              onInit={(evt, editor) => editorRef.current = editor}
              initialValue={content}
              scriptLoading={{ async: true, load: "domainBased" }}
              init={{
                script_src: config.tinymce.scriptPath,
                license_key: 'gpl',
                height: 500,
                menubar: true,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                  'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                  'indent'
                ],
                toolbar: 'undo redo | blocks | ' +
                  'bold italic forecolor | alignleft aligncenter ' +
                  'alignright alignjustify | bullist numlist outdent indent | ' +
                  'image | removeformat | help',
                images_upload_handler: handleImageUpload,
                automatic_uploads: true,
                file_picker_types: 'image',
                images_reuse_filename: true,
                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
              }}
            />
          ) : (
            <div className="content-display" dangerouslySetInnerHTML={{ __html: content }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Donation; 