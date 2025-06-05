import React from 'react';
import SlugWrapper from '../../src/components/SlugWrapper';
import NovelDetail from '../../src/components/NovelDetail';
import { parseNovelSlug } from '../../src/utils/slugUtils';
import api from '../../src/services/api';

const NovelPage = (props) => <NovelDetail {...props} />;

export const Page = (pageProps) => (
  <SlugWrapper 
    component={NovelPage} 
    type="novel"
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

// Pre-fetch the novel data for search engines
export async function onBeforeRender(pageContext) {
  const { novelSlug } = pageContext.routeParams;
  
  let novel = null;
  let pageTitle = 'Truyện - Valvrareteam';
  let pageDescription = 'Cập nhật nhanh, đọc dễ dàng, trải nghiệm tốt nhất cho fan light novel!';
  
  try {
    if (pageContext.isBot || process.env.NODE_ENV === 'production') {
      // Try to resolve the slug to an ID first
      let novelId = null;
      
      try {
        novelId = await api.lookupNovelId(novelSlug);
      } catch (error) {
        // If slug lookup fails, try parsing it as a potential short ID
        const parsedId = parseNovelSlug(novelSlug);
        if (parsedId) {
          novelId = parsedId;
        }
      }
      
      if (novelId) {
        const response = await api.fetchNovelWithModules(novelId);
        novel = response?.novel;
        
        if (novel) {
          pageTitle = `${novel.title} Vietsub - Valvrareteam`;
          
          const text = getTextFromHTML(novel.description || '');
          
          pageDescription = text.length > 160 
            ? text.substring(0, 157) + '...' 
            : text;
        }
      }
    }
  } catch (error) {
    console.error(`Error pre-fetching novel with slug: ${novelSlug}`, error);
  }
  
  return {
    pageContext: {
      pageProps: {
        novel,
        preloadedNovelSlug: novelSlug
      },
      documentProps: {
        title: pageTitle,
        description: pageDescription
      }
    }
  };
}

export const passToClient = ['pageProps', 'routeParams']; 