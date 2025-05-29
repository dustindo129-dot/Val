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
 * Counts words using TinyMCE's exact word counting algorithm
 * @param {string|object} content - HTML content string or TinyMCE editor instance
 * @returns {number} Word count
 */
export const countWords = (content) => {
  // If content is a TinyMCE editor instance, use its word count plugin
  if (content && typeof content === 'object' && content.plugins && content.plugins.wordcount) {
    return content.plugins.wordcount.getCount();
  }
  
  // If content is an HTML string, use TinyMCE's exact algorithm
  if (typeof content === 'string') {
    return countWordsWithTinyMCEAlgorithm(content);
  }
  
  return 0;
};

/**
 * Gets word count from TinyMCE editor instance
 * @param {object} editor - TinyMCE editor instance
 * @returns {number} Word count from TinyMCE
 */
export const getTinyMCEWordCount = (editor) => {
  if (!editor || !editor.plugins || !editor.plugins.wordcount) {
    return 0;
  }
  return editor.plugins.wordcount.getCount();
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

/**
 * Debug function to analyze word counting differences
 * @param {string} htmlContent - HTML content to analyze
 * @returns {object} Debug information about word counting
 */
export const debugWordCount = (htmlContent) => {
  if (!htmlContent) return { originalCount: 0, steps: [] };
  
  const steps = [];
  
  // Step 1: Create temp div
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  steps.push({ step: 'HTML parsed', preview: htmlContent.substring(0, 100) + '...' });
  
  // Step 2: Extract text using our algorithm
  const textNodes = [];
  
  function extractText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        textNodes.push(text);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      
      // Skip empty block elements
      if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        const textContent = node.textContent || '';
        const hasOnlyWhitespace = /^\s*$/.test(textContent.replace(/&nbsp;/g, ''));
        if (hasOnlyWhitespace) {
          return;
        }
      }
      
      // Process child nodes
      for (let child of node.childNodes) {
        extractText(child);
        
        // Add space between block elements
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childTag = child.tagName.toLowerCase();
          if (['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(childTag)) {
            textNodes.push(' ');
          }
        }
      }
    }
  }
  
  extractText(tempDiv);
  let text = textNodes.join('');
  steps.push({ step: 'Text extracted', preview: text.substring(0, 100) + '...', length: text.length });
  
  // Step 3: Decode HTML entities
  const originalText = text;
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'")
             .replace(/&thinsp;/g, ' ')
             .replace(/&ensp;/g, ' ')
             .replace(/&emsp;/g, ' ');
  
  if (text !== originalText) {
    steps.push({ step: 'HTML entities decoded', preview: text.substring(0, 100) + '...', length: text.length });
  }
  
  // Step 4: Apply word boundaries
  const beforeBoundaries = text;
  const wordBoundaryChars = [
    '\\s', '\\u00A0', '\\u1680', '\\u2000-\\u200A', '\\u2028', '\\u2029', '\\u202F', '\\u205F', '\\u3000', '\\uFEFF',
    '—', '–', '\\?', '!', ',', ';', '/', '\\^', '№', '~', '\\+', '\\|', '\\$', '`'
  ];
  
  const wordBoundaryRegex = new RegExp(`[${wordBoundaryChars.join('')}]+`, 'g');
  text = text.replace(wordBoundaryRegex, ' ');
  
  if (text !== beforeBoundaries) {
    steps.push({ step: 'Word boundaries applied', preview: text.substring(0, 100) + '...', length: text.length });
  }
  
  // Step 5: Handle periods and colons
  const beforePeriodColon = text;
  text = text.replace(/\s+\.\s+/g, ' ');
  text = text.replace(/\s+:\s+/g, ' ');
  
  if (text !== beforePeriodColon) {
    steps.push({ step: 'Periods and colons handled', preview: text.substring(0, 100) + '...', length: text.length });
  }
  
  // Step 6: Normalize whitespace
  const beforeNormalize = text;
  text = text.replace(/\s+/g, ' ').trim();
  
  if (text !== beforeNormalize) {
    steps.push({ step: 'Whitespace normalized', preview: text.substring(0, 100) + '...', length: text.length });
  }
  
  // Step 7: Count words
  const words = text.split(' ').filter(word => word.length > 0);
  steps.push({ step: 'Words counted', wordCount: words.length, sampleWords: words.slice(0, 10) });
  
  return {
    originalCount: words.length,
    steps,
    finalText: text,
    wordSample: words.slice(0, 20)
  };
}; 