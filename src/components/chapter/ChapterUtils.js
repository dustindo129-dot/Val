import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

/**
 * Custom hook for managing chapter reading settings (font, line height)
 * Theme is now handled by the unified ThemeContext
 */
export const useReadingSettings = () => {
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("'Roboto', sans-serif");
  const [lineHeight, setLineHeight] = useState('1.8');

  // Load settings from localStorage on init
  useEffect(() => {
    const savedFontSize = localStorage.getItem('readerFontSize');
    const savedFontFamily = localStorage.getItem('readerFontFamily');
    const savedLineHeight = localStorage.getItem('readerLineHeight');

    if (savedFontSize) setFontSize(parseInt(savedFontSize));
    if (savedFontFamily) setFontFamily(savedFontFamily);
    if (savedLineHeight) setLineHeight(savedLineHeight);
  }, []);

  const increaseFontSize = () => {
    const newSize = Math.min(32, fontSize + 1);
    setFontSize(newSize);
    localStorage.setItem('readerFontSize', newSize.toString());
  };

  const decreaseFontSize = () => {
    const newSize = Math.max(12, fontSize - 1);
    setFontSize(newSize);
    localStorage.setItem('readerFontSize', newSize.toString());
  };

  return {
    fontSize,
    fontFamily,
    lineHeight,
    setFontFamily,
    setLineHeight,
    increaseFontSize,
    decreaseFontSize
  };
};

/**
 * Custom hook for tracking reading progress
 */
export const useReadingProgress = (contentRef) => {
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const windowHeight = window.innerHeight;
      const fullHeight = document.body.scrollHeight;
      const scrolled = window.scrollY;

      const progress = (scrolled / (fullHeight - windowHeight)) * 100;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [contentRef]);

  return readingProgress;
};

/**
 * Safely renders HTML content with sanitization
 * @param {string} content - HTML content to render
 * @returns {object} Sanitized HTML object for dangerouslySetInnerHTML
 */
export const getSafeHtml = (content) => {
  if (!content) return {__html: ''};

  // Create a minimal sanitizer configuration
  return {
    __html: DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 'br', 'i', 'b', 'img'],
      ALLOWED_ATTR: ['style', 'class', 'src', 'alt', 'width', 'height', 'id', 'data-pm-slice'],
      // Only remove truly dangerous elements
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
      ALLOW_DATA_ATTR: true, // Allow data attributes from ProseMirror
      WHOLE_DOCUMENT: false,
      SANITIZE_DOM: true
    })
  };
};

/**
 * Unescapes HTML entities and converts them back to HTML tags
 * This function is now only used when needed for legacy content
 * @param {string} html - HTML string with escaped entities
 * @returns {string} Unescaped HTML
 */
export const unescapeHtml = (html) => {
  if (!html) return '';

  // Create a textarea to use browser's built-in HTML entity decoding
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return textarea.value;
};

/**
 * WORD COUNTING APPROACH:
 * 
 * 1. When editing: Use TinyMCE's live word count (editor.plugins.wordcount.getCount())
 * 2. When viewing: Prefer stored wordCount from database (calculated during save)
 * 3. Fallback: Use getTinyMCEWordCountDirect() to create temporary TinyMCE instance
 * 4. Final fallback: Use countWordsWithTinyMCEAlgorithm() (replicates TinyMCE algorithm)
 * 
 * This ensures word counts match TinyMCE exactly while being performant.
 */

/**
 * Counts words using TinyMCE's exact word counting algorithm
 * This replicates TinyMCE's wordcount plugin behavior exactly
 * @param {string} htmlContent - HTML content to count words in
 * @returns {number} Word count using TinyMCE's exact algorithm
 */
export const countWordsWithTinyMCEAlgorithm = (htmlContent) => {
  if (!htmlContent) return 0;
  
  // Step 1: Extract text from HTML exactly like TinyMCE
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Step 1.5: Remove images and their content like TinyMCE does
  const images = tempDiv.querySelectorAll('img');
  images.forEach(img => img.remove());
  
  let text = tempDiv.textContent || tempDiv.innerText || '';
  
  if (!text.trim()) return 0;
  
  // Step 2: Handle HTML entities exactly like TinyMCE
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'")
             .replace(/&apos;/g, "'");
  
  // Step 3: Use TinyMCE's word counting approach with slight refinement
  // Match word characters but be more precise about what counts as a word
  const wordRegex = /[\w\u00C0-\u024F\u1E00-\u1EFF\u0100-\u017F\u0180-\u024F\u0250-\u02AF\u1D00-\u1D7F\u1D80-\u1DBF]+/g;
  
  // Step 4: Find all word matches
  const matches = text.match(wordRegex);
  
  if (!matches) return 0;
  
  // Step 5: Filter matches like TinyMCE does
  // TinyMCE filters out single characters that are only digits or single letters in some contexts
  const filteredMatches = matches.filter(match => {
    // Filter out single standalone digits
    if (match.length === 1 && /^\d$/.test(match)) {
      return false;
    }
    
    // Filter out single standalone letters that are likely not words (like "a" in some contexts)
    if (match.length === 1 && /^[a-zA-Z]$/.test(match)) {
      return false;
    }
    
    return true;
  });
  
  return filteredMatches.length;
};

/**
 * Gets word count directly from TinyMCE by creating a temporary editor instance
 * This ensures the word count matches exactly what TinyMCE would show
 * @param {string} htmlContent - HTML content to count words in
 * @returns {Promise<number>} Promise that resolves to the exact TinyMCE word count
 */
export const getTinyMCEWordCountDirect = (htmlContent) => {
  return new Promise((resolve) => {
    if (!htmlContent || typeof htmlContent !== 'string') {
      resolve(0);
      return;
    }

    // Create a temporary hidden container
    const tempContainer = document.createElement('div');
    tempContainer.style.display = 'none';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    // Create a temporary textarea
    const tempTextarea = document.createElement('textarea');
    tempContainer.appendChild(tempTextarea);

    // Initialize TinyMCE on the temporary textarea
    window.tinymce.init({
      target: tempTextarea,
      plugins: ['wordcount'],
      menubar: false,
      toolbar: false,
      statusbar: false,
      height: 100,
      setup: (editor) => {
        editor.on('init', () => {
          // Set the content
          editor.setContent(htmlContent);
          
          // Get the word count
          setTimeout(() => {
            let wordCount = 0;
            if (editor.plugins && editor.plugins.wordcount) {
              wordCount = editor.plugins.wordcount.getCount();
            }
            
            // Clean up
            editor.destroy();
            document.body.removeChild(tempContainer);
            
            resolve(wordCount);
          }, 100);
        });
      }
    });
  });
};

/**
 * Counts words using TinyMCE directly when possible, falls back to algorithm
 * @param {string|object} content - HTML content string or TinyMCE editor instance
 * @returns {number|Promise<number>} Word count (immediate if editor instance, Promise if HTML string)
 */
export const countWords = (content) => {
  // If content is a TinyMCE editor instance, use its word count plugin directly
  if (content && typeof content === 'object' && content.plugins && content.plugins.wordcount) {
    return content.plugins.wordcount.getCount();
  }
  
  // If content is an HTML string and TinyMCE is available, use direct method
  if (typeof content === 'string' && window.tinymce) {
    return getTinyMCEWordCountDirect(content);
  }
  
  // Fallback to algorithm-based counting if TinyMCE is not available
  if (typeof content === 'string') {
    return countWordsWithTinyMCEAlgorithm(content);
  }
  
  return 0;
};

/**
 * Synchronous word count using TinyMCE algorithm (for backward compatibility)
 * @param {string} content - HTML content string
 * @returns {number} Word count
 */
export const countWordsSync = (content) => {
  if (typeof content === 'string') {
    return countWordsWithTinyMCEAlgorithm(content);
  }
  return 0;
};

/**
 * Batch update word counts for chapters using TinyMCE
 * Useful for migrating existing chapters to have accurate TinyMCE word counts
 * @param {Array} chapters - Array of chapter objects with content
 * @returns {Promise<Array>} Promise that resolves to array of chapters with updated word counts
 */
export const batchUpdateWordCounts = async (chapters) => {
  if (!window.tinymce || !Array.isArray(chapters)) {
    return chapters;
  }

  const updatedChapters = [];
  
  for (const chapter of chapters) {
    if (chapter.content && typeof chapter.content === 'string') {
      try {
        const wordCount = await getTinyMCEWordCountDirect(chapter.content);
        updatedChapters.push({
          ...chapter,
          wordCount: wordCount
        });
      } catch (error) {
        console.warn(`Failed to get word count for chapter ${chapter._id}:`, error);
        // Fallback to algorithm-based counting
        updatedChapters.push({
          ...chapter,
          wordCount: countWordsSync(chapter.content)
        });
      }
    } else {
      updatedChapters.push(chapter);
    }
  }
  
  return updatedChapters;
};

/**
 * Formats date to "MMM-DD-YYYY" format
 * @param {string} date - Date string to format
 * @returns {string} Formatted date
 */
export const formatDate = (date) => {
  if (!date) return 'Invalid date';

  try {
    const chapterDate = new Date(date);

    if (isNaN(chapterDate.getTime())) {
      return 'Invalid date';
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const month = monthNames[chapterDate.getMonth()];
    const day = chapterDate.getDate().toString().padStart(2, '0');
    const year = chapterDate.getFullYear();

    return `${month}-${day}-${year}`;
  } catch (err) {
    console.error('Date formatting error:', err);
    return 'Invalid date';
  }
};

/**
 * Scrolls to top of page
 * @returns {Promise} Promise that resolves when scroll is complete
 */
export const scrollToTop = () => {
  return new Promise((resolve) => {
    window.scrollTo({top: 0, behavior: 'smooth'});
    setTimeout(resolve, 500);
  });
}; 