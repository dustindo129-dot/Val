import React from 'react';
import Chapter from '../../../../src/components/Chapter';
import api from '../../../../src/services/api';

export const Page = (pageProps) => <Chapter {...pageProps} />;

// Helper function to get text content from HTML without using DOM
const getTextFromHTML = (html) => {
  if (!html) return '';
  
  // Simple regex to strip HTML tags - not perfect but works for basic cases
  return html
    .replace(/<[^>]*>/g, ' ')  
    .replace(/\s+/g, ' ')      
    .trim();                   
};

// Pre-fetch the chapter data for search engines
export async function onBeforeRender(pageContext) {
  const { novelId, chapterId } = pageContext.routeParams;
  
  let chapter = null;
  let novel = null;
  let pageTitle = 'Chapter - Valvrareteam';
  let pageDescription = 'Đọc light novel tiếng Việt chất lượng cao, cập nhật nhanh, trải nghiệm tốt nhất.';
  
  try {
    if (pageContext.isBot || process.env.NODE_ENV === 'production') {
      // First get the chapter data
      try {
        const chapterResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/chapters/${chapterId}?skipViewTracking=true`);
        chapter = await chapterResponse.json();
      } catch (chapterError) {
        console.error(`Error pre-fetching chapter with ID: ${chapterId}`, chapterError);
      }
      
      // Then get novel data for title
      try {
        novel = await api.fetchNovelWithModules(novelId);
      } catch (novelError) {
        console.error(`Error pre-fetching novel with ID: ${novelId}`, novelError);
      }
      
      if (chapter && novel) {
        pageTitle = `${chapter.title} - ${novel.title} - Valvrareteam`;
        
        // Extract text from chapter content for description
        const text = getTextFromHTML(chapter.content || '');
        
        pageDescription = text.length > 160 
          ? text.substring(0, 157) + '...' 
          : text;
      }
    }
  } catch (error) {
    console.error(`Error in onBeforeRender for chapter ${chapterId}:`, error);
  }
  
  return {
    pageContext: {
      pageProps: {
        preloadedChapter: chapter,
        preloadedNovel: novel,
        preloadedNovelId: novelId,
        preloadedChapterId: chapterId
      },
      documentProps: {
        title: pageTitle,
        description: pageDescription
      }
    }
  };
}

export const passToClient = ['pageProps', 'routeParams']; 