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
      
      // Get chapter data with better error handling
      if (chapterId) {
        try {
          const chapterResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/chapters/${chapterId}?skipViewTracking=true`);
          if (chapterResponse.ok) {
            const chapterData = await chapterResponse.json();
            chapter = chapterData.chapter;
          } else {
            console.error(`Chapter API returned ${chapterResponse.status} for ${chapterSlug}`);
            // Return 404 if chapter not found instead of showing empty content
            return {
              pageContext: {
                pageProps: { error: 'Chapter not found' },
                documentProps: {
                  title: 'Chương không tồn tại - Valvrareteam',
                  description: 'Chương bạn tìm kiếm không tồn tại hoặc đã bị xóa.',
                  meta: [
                    { name: 'robots', content: 'noindex, nofollow' }
                  ]
                }
              }
            };
          }
        } catch (chapterError) {
          console.error(`Error pre-fetching chapter with slug: ${chapterSlug}`, chapterError);
          // Return 404 for network errors too
          return {
            pageContext: {
              pageProps: { error: 'Chapter unavailable' },
              documentProps: {
                title: 'Chương không khả dụng - Valvrareteam',
                description: 'Chương hiện tại không khả dụng, vui lòng thử lại sau.',
                meta: [
                  { name: 'robots', content: 'noindex, nofollow' }
                ]
              }
            }
          };
        }
      } else {
        // If we can't determine chapter ID, return 404
        return {
          pageContext: {
            pageProps: { error: 'Invalid chapter URL' },
            documentProps: {
              title: 'URL không hợp lệ - Valvrareteam',
              description: 'URL chương không hợp lệ.',
              meta: [
                { name: 'robots', content: 'noindex, nofollow' }
              ]
            }
          }
        };
      }
      
      // Get novel data with better error handling
      if (novelId) {
        try {
          const response = await api.fetchNovelWithModules(novelId);
          novel = response?.novel;
        } catch (novelError) {
          console.error(`Error pre-fetching novel with slug: ${novelSlug}`, novelError);
          // Continue without novel data but log the error
        }
      }
      
      // Only proceed if we have chapter data
      if (chapter) {
        // Create unique titles and descriptions
        const novelTitle = novel?.title || 'Truyện';
        pageTitle = `${chapter.title} - ${novelTitle} Vietsub - Valvrareteam`;
        
        // Extract text from chapter content for description
        const text = getTextFromHTML(chapter.content || '');
        
        if (text.length > 0) {
          pageDescription = text.length > 160 
            ? text.substring(0, 157) + '...' 
            : text;
        } else {
          // Fallback description with chapter-specific info
          pageDescription = `Đọc ${chapter.title} - ${novelTitle} vietsub chất lượng cao tại Valvrareteam. Light novel tiếng Việt cập nhật nhanh.`;
        }
      } else {
        // This shouldn't happen due to early returns above, but just in case
        return {
          pageContext: {
            pageProps: { error: 'Chapter data not available' },
            documentProps: {
              title: 'Nội dung không khả dụng - Valvrareteam',
              description: 'Nội dung chương hiện không khả dụng.',
              meta: [
                { name: 'robots', content: 'noindex, nofollow' }
              ]
            }
          }
        };
      }
    }
  } catch (error) {
    console.error(`Error in onBeforeRender for chapter ${chapterSlug}:`, error);
    // Return error page instead of empty content
    return {
      pageContext: {
        pageProps: { error: 'Server error' },
        documentProps: {
          title: 'Lỗi server - Valvrareteam',
          description: 'Đã xảy ra lỗi khi tải trang.',
          meta: [
            { name: 'robots', content: 'noindex, nofollow' }
          ]
        }
      }
    };
  }
  
  // Generate comprehensive meta data for SEO
  const currentUrl = `https://valvrareteam.net/truyen/${novelSlug}/chuong/${chapterSlug}`;
  const siteName = 'Valvrareteam';
  
  // Generate keywords for SEO
  const generateKeywords = (novelTitle, chapterTitle) => {
    const baseKeywords = ['light novel', 'tiếng việt', 'valvrareteam', 'vietsub', 'truyện dịch'];
    
    if (novelTitle) {
      baseKeywords.push(
        novelTitle.toLowerCase(),
        `${novelTitle.toLowerCase()} vietsub`,
        `${novelTitle.toLowerCase()} valvrareteam`,
        `đọc ${novelTitle.toLowerCase()}`,
        `truyện ${novelTitle.toLowerCase()}`
      );
    }
    
    if (chapterTitle) {
      baseKeywords.push(
        chapterTitle.toLowerCase(),
        `${chapterTitle.toLowerCase()} ${novelTitle?.toLowerCase() || ''}`.trim()
      );
    }
    
    return baseKeywords.join(', ');
  };
  
  // Generate structured data (JSON-LD)
  const generateStructuredData = (novel, chapter, url) => {
    if (!novel || !chapter) return null;
    
    return {
      "@context": "https://schema.org",
      "@type": "Chapter",
      "name": chapter.title,
      "description": pageDescription,
      "url": url,
      "isPartOf": {
        "@type": "Book",
        "name": novel.title,
        "url": `https://valvrareteam.net/truyen/${novelSlug}`
      },
      "publisher": {
        "@type": "Organization",
        "name": siteName,
        "url": "https://valvrareteam.net"
      },
      "inLanguage": "vi-VN",
      "genre": "Light Novel"
    };
  };
  
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
        description: pageDescription,
        // Additional meta tags for SEO
        meta: [
          // Keywords
          {
            name: 'keywords',
            content: generateKeywords(novel?.title, chapter?.title)
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
            content: 'article'
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
          // Article specific Open Graph
          {
            property: 'article:section',
            content: 'Light Novel'
          },
          {
            property: 'article:tag',
            content: 'light novel, vietsub, tiếng việt'
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
        structuredData: generateStructuredData(novel, chapter, currentUrl)
      }
    }
  };
}

export const passToClient = ['pageProps', 'routeParams']; 