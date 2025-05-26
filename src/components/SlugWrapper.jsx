import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isValidObjectId, extractIdFromSlug } from '../utils/slugUtils';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';

/**
 * SlugWrapper Component
 * 
 * Handles the conversion between slug-based URLs and ID-based component props
 * Supports both legacy ID URLs and new slug URLs for backward compatibility
 */
const SlugWrapper = ({ component: Component, type }) => {
  const params = useParams();
  const navigate = useNavigate();
  const [resolvedParams, setResolvedParams] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const resolveParams = async () => {
      try {
        setLoading(true);
        setError(null);

        const newParams = { ...params };

        // Handle novel ID/slug resolution
        if (params.novelId) {
          if (isValidObjectId(params.novelId)) {
            // Already a valid MongoDB ID, use as-is
            newParams.novelId = params.novelId;
          } else {
            // It's a slug, resolve to ID
            try {
              const novelId = await api.lookupNovelId(params.novelId);
              newParams.novelId = novelId;
            } catch (err) {
              console.error('Failed to resolve novel slug:', err);
              setError('Không tìm thấy truyện');
              return;
            }
          }
        }

        // Handle chapter ID/slug resolution
        if (params.chapterId) {
          if (isValidObjectId(params.chapterId)) {
            // Already a valid MongoDB ID, use as-is
            newParams.chapterId = params.chapterId;
          } else {
            // It's a slug, resolve to ID
            try {
              const chapterId = await api.lookupChapterId(params.chapterId);
              newParams.chapterId = chapterId;
            } catch (err) {
              console.error('Failed to resolve chapter slug:', err);
              setError('Không tìm thấy chương');
              return;
            }
          }
        }

        setResolvedParams(newParams);
      } catch (err) {
        console.error('Error resolving params:', err);
        setError('Không thể tải nội dung');
      } finally {
        setLoading(false);
      }
    };

    resolveParams();
  }, [params.novelId, params.chapterId]);

  // Show loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Show error state
  if (error) {
    return (
      <div className="error-container" style={{ 
        padding: '2rem', 
        textAlign: 'center',
        minHeight: '50vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h2>Không tìm thấy nội dung</h2>
        <p>{error}</p>
        <button 
          onClick={() => navigate('/')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  // Render the component with resolved params
  return <Component {...resolvedParams} />;
};

export default SlugWrapper; 