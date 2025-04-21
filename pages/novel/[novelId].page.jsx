import React from 'react';
import NovelDetail from '../../src/components/NovelDetail';
import api from '../../src/services/api';

export const Page = (pageProps) => <NovelDetail {...pageProps} />;

// Helper function to get text content from HTML without using DOM
const getTextFromHTML = (html) => {
  if (!html) return '';
  
  // Simple regex to strip HTML tags - not perfect but works for basic cases
  // For production, consider a more robust HTML parser that works in Node.js
  return html
    .replace(/<[^>]*>/g, ' ')  
    .replace(/\s+/g, ' ')      
    .trim();                   
};

// Pre-fetch the novel data for search engines
export async function onBeforeRender(pageContext) {
  const { novelId } = pageContext.routeParams;
  
  let novel = null;
  let pageTitle = 'Novel Detail - Valvrareteam';
  let pageDescription = 'Cập nhật nhanh, đọc dễ dàng, trải nghiệm tốt nhất cho fan light novel!';
  
  try {
    if (pageContext.isBot || process.env.NODE_ENV === 'production') {
      novel = await api.fetchNovelWithModules(novelId);
      
      if (novel) {
        pageTitle = `${novel.title} - Valvrareteam`;
        
        const text = getTextFromHTML(novel.description || '');
        
        pageDescription = text.length > 160 
          ? text.substring(0, 157) + '...' 
          : text;
      }
    }
  } catch (error) {
    console.error(`Error pre-fetching novel with ID: ${novelId}`, error);
  }
  
  return {
    pageContext: {
      pageProps: {
        novel,
        preloadedNovelId: novelId
      },
      documentProps: {
        title: pageTitle,
        description: pageDescription
      }
    }
  };
}

export const passToClient = ['pageProps', 'routeParams']; 