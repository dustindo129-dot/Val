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
  
  // Generate comprehensive meta data for SEO
  const currentUrl = `https://valvrareteam.net/truyen/${novelSlug}`;
  const siteName = 'Valvrareteam';
  
  // Generate keywords for SEO
  const generateKeywords = (novel) => {
    if (!novel?.title) return 'light novel, tiếng việt, valvrareteam, vietsub';
    
    // Helper function to detect Japanese characters
    const hasJapanese = (text) => {
      // Check for Hiragana, Katakana, and Kanji characters
      const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
      return japaneseRegex.test(text);
    };
    
    const titles = [novel.title];
    
    // Add alternative titles if they exist
    if (novel.alternativeTitles && Array.isArray(novel.alternativeTitles)) {
      titles.push(...novel.alternativeTitles);
    }
    
    // Also check for other possible alternative title fields
    if (novel.altTitles && Array.isArray(novel.altTitles)) {
      titles.push(...novel.altTitles);
    }
    
    if (novel.otherTitles && Array.isArray(novel.otherTitles)) {
      titles.push(...novel.otherTitles);
    }
    
    // If alternative titles is a string (comma separated), split it
    if (novel.alternativeTitles && typeof novel.alternativeTitles === 'string') {
      titles.push(...novel.alternativeTitles.split(',').map(t => t.trim()));
    }
    
    // Filter out Japanese titles
    const filteredTitles = titles.filter(title => {
      if (!title || !title.trim()) return false;
      return !hasJapanese(title.trim());
    });
    
    const baseKeywords = [];
    
    // Generate keywords for each title (main + alternatives, excluding Japanese)
    filteredTitles.forEach(title => {
      if (title && title.trim()) {
        const cleanTitle = title.toLowerCase().trim();
        baseKeywords.push(
          cleanTitle,
          `${cleanTitle} vietsub`,
          `${cleanTitle} valvrareteam`,
          `${cleanTitle} light novel`,
          `${cleanTitle} tiếng việt`,
          `đọc ${cleanTitle}`,
          `truyện ${cleanTitle}`
        );
      }
    });
    
    // Add general keywords
    baseKeywords.push(
      'light novel tiếng việt',
      'light novel vietsub',
      'valvrareteam',
      'truyện dịch',
      'novel dịch'
    );
    
    // Remove duplicates and return
    return [...new Set(baseKeywords)].join(', ');
  };
  
  // Generate structured data (JSON-LD)
  const generateStructuredData = (novel, url) => {
    if (!novel) return null;
    
    return {
      "@context": "https://schema.org",
      "@type": "Book",
      "name": novel.title,
      "description": pageDescription,
      "url": url,
      "publisher": {
        "@type": "Organization",
        "name": siteName,
        "url": "https://valvrareteam.net"
      },
      "inLanguage": "vi-VN",
      "genre": "Light Novel",
      "bookFormat": "EBook",
      "isAccessibleForFree": true
    };
  };
  
  return {
    pageContext: {
      pageProps: {
        novel,
        preloadedNovelSlug: novelSlug
      },
      documentProps: {
        title: pageTitle,
        description: pageDescription,
        // Additional meta tags for SEO
        meta: [
          // Keywords
          {
            name: 'keywords',
            content: generateKeywords(novel)
          },
          // Robots
          {
            name: 'robots',
            content: 'index, follow, max-image-preview:large'
          },
          // Author
          {
            name: 'author',
            content: siteName
          },
          // Open Graph tags
          {
            property: 'og:title',
            content: pageTitle
          },
          {
            property: 'og:description',
            content: pageDescription
          },
          {
            property: 'og:type',
            content: 'book'
          },
          {
            property: 'og:url',
            content: currentUrl
          },
          {
            property: 'og:site_name',
            content: siteName
          },
          {
            property: 'og:locale',
            content: 'vi_VN'
          },
          // Twitter Card tags
          {
            name: 'twitter:card',
            content: 'summary_large_image'
          },
          {
            name: 'twitter:title',
            content: pageTitle
          },
          {
            name: 'twitter:description',
            content: pageDescription
          },
          // Additional SEO meta
          {
            name: 'language',
            content: 'Vietnamese'
          },
          {
            name: 'coverage',
            content: 'Worldwide'
          },
          {
            name: 'distribution',
            content: 'Global'
          },
          {
            name: 'rating',
            content: 'General'
          }
        ],
        // Canonical URL
        link: [
          {
            rel: 'canonical',
            href: currentUrl
          }
        ],
        // Structured data
        structuredData: generateStructuredData(novel, currentUrl)
      }
    }
  };
}

export const passToClient = ['pageProps', 'routeParams']; 