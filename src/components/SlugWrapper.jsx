import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { isValidObjectId, extractIdFromSlug, generateNovelUrl, generateChapterUrl } from '../utils/slugUtils';
import api from '../services/api';
import axios from 'axios';
import config from '../config/config';
import LoadingSpinner from './LoadingSpinner';

/**
 * SlugWrapper Component
 * 
 * Handles the conversion between slug-based URLs and ID-based component props
 * Redirects MongoDB ID URLs to slug URLs for better SEO
 */
const SlugWrapper = ({ component: Component, type }) => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [resolvedParams, setResolvedParams] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const resolveParams = async () => {
      try {
        setLoading(true);
        setError(null);

        const newParams = { ...params };
        let shouldRedirect = false;
        let novelData = null;
        let chapterData = null;

        // Handle novel ID/slug resolution
        if (params.novelId) {
          if (isValidObjectId(params.novelId)) {
            // It's a MongoDB ID - we should redirect to slug URL
            try {
              novelData = await api.fetchNovelWithModules(params.novelId, false, false);
              shouldRedirect = true;
              newParams.novelId = params.novelId;
            } catch (err) {
              console.error('Failed to fetch novel data for redirect:', err);
              setError('Không tìm thấy truyện');
              return;
            }
          } else {
            // It's a slug, resolve to ID
            try {
              const novelId = await api.lookupNovelId(params.novelId);
              newParams.novelId = novelId;
              // Fetch novel data for potential chapter redirect
              if (params.chapterId) {
                novelData = await api.fetchNovelWithModules(novelId, false, false);
              }
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
            // It's a MongoDB ID - we should redirect to slug URL
            try {
              const response = await axios.get(`${config.backendUrl}/api/chapters/${params.chapterId}`);
              chapterData = response.data.chapter;
              shouldRedirect = true;
              newParams.chapterId = params.chapterId;
            } catch (err) {
              console.error('Failed to fetch chapter data for redirect:', err);
              setError('Không tìm thấy chương');
              return;
            }
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

        // Redirect MongoDB ID URLs to slug URLs for SEO
        if (shouldRedirect) {
          let redirectUrl;
          
          if (type === 'chapter' && novelData && chapterData) {
            // Redirect chapter ID URL to slug URL
            redirectUrl = generateChapterUrl(novelData, chapterData);
          } else if (type === 'novel' && novelData) {
            // Redirect novel ID URL to slug URL
            redirectUrl = generateNovelUrl(novelData);
          }
          
          if (redirectUrl && redirectUrl !== location.pathname) {
            // Use replace: true for SEO-friendly redirect
            navigate(redirectUrl + location.search + location.hash, { replace: true });
            return;
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
  }, [params.novelId, params.chapterId, navigate, location.pathname, location.search, location.hash, type]);

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