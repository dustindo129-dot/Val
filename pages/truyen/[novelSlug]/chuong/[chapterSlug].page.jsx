import React from 'react';
import SlugWrapper from '../../../../src/components/SlugWrapper';
import Chapter from '../../../../src/components/Chapter';
import { parseNovelSlug, parseChapterSlug } from '../../../../src/utils/slugUtils';
import api from '../../../../src/services/api';

const ChapterPage = (props) => <Chapter {...props} />;

export const Page = (pageProps) => (
  <SlugWrapper 
    component={ChapterPage} 
    type="chapter"
    {...pageProps} 
  />
);

// Helper function to get text content from HTML without using DOM
const getTextFromHTML = (html) => {
  if (!html) return '';
  
  // Simple regex to strip HTML tags
  return html
    .replace(/<[^>]*>/g, ' ')  
    .replace(/\s+/g, ' ')      
    .trim();                   
};

// Pre-fetch the chapter data for search engines
export async function onBeforeRender(pageContext) {
  const { novelSlug, chapterSlug } = pageContext.routeParams;
  
  let chapter = null;
  let novel = null;
  let pageTitle = 'Chương - Valvrareteam';
  let pageDescription = 'Đọc light novel tiếng Việt chất lượng cao, cập nhật nhanh, trải nghiệm tốt nhất.';
  
  try {
    if (pageContext.isBot || process.env.NODE_ENV === 'production') {
      // Try to resolve slugs to IDs
      let novelId = null;
      let chapterId = null;
      
      try {
        novelId = await api.lookupNovelId(novelSlug);
      } catch (error) {
        const parsedNovelId = parseNovelSlug(novelSlug);
        if (parsedNovelId) {
          novelId = parsedNovelId;
        }
      }
      
      try {
        chapterId = await api.lookupChapterId(chapterSlug);
      } catch (error) {
        const parsedChapterId = parseChapterSlug(chapterSlug);
        if (parsedChapterId) {
          chapterId = parsedChapterId;
        }
      }
      
      // Get chapter data
      if (chapterId) {
        try {
          const chapterResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/chapters/${chapterId}?skipViewTracking=true`);
          const chapterData = await chapterResponse.json();
          chapter = chapterData.chapter;
        } catch (chapterError) {
          console.error(`Error pre-fetching chapter with slug: ${chapterSlug}`, chapterError);
        }
      }
      
      // Get novel data
      if (novelId) {
        try {
          const response = await api.fetchNovelWithModules(novelId);
          novel = response?.novel;
        } catch (novelError) {
          console.error(`Error pre-fetching novel with slug: ${novelSlug}`, novelError);
        }
      }
      
      if (chapter && novel) {
        pageTitle = `${chapter.title} - ${novel.title} Vietsub - Valvrareteam`;
        
        // Extract text from chapter content for description
        const text = getTextFromHTML(chapter.content || '');
        
        pageDescription = text.length > 160 
          ? text.substring(0, 157) + '...' 
          : text;
      }
    }
  } catch (error) {
    console.error(`Error in onBeforeRender for chapter ${chapterSlug}:`, error);
  }
  
  return {
    pageContext: {
      pageProps: {
        preloadedChapter: chapter,
        preloadedNovel: novel,
        preloadedNovelSlug: novelSlug,
        preloadedChapterSlug: chapterSlug
      },
      documentProps: {
        title: pageTitle,
        description: pageDescription
      }
    }
  };
}

export const passToClient = ['pageProps', 'routeParams']; 