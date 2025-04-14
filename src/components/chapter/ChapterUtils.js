import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

/**
 * Custom hook for managing chapter reading settings
 */
export const useReadingSettings = () => {
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("'Roboto', sans-serif");
  const [lineHeight, setLineHeight] = useState('1.8');
  const [theme, setTheme] = useState('light');

  // Load settings from localStorage on init
  useEffect(() => {
    const savedFontSize = localStorage.getItem('readerFontSize');
    const savedFontFamily = localStorage.getItem('readerFontFamily');
    const savedLineHeight = localStorage.getItem('readerLineHeight');
    const savedTheme = localStorage.getItem('readerTheme');

    if (savedFontSize) setFontSize(parseInt(savedFontSize));
    if (savedFontFamily) setFontFamily(savedFontFamily);
    if (savedLineHeight) setLineHeight(savedLineHeight);
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
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

  const applyTheme = (selectedTheme) => {
    document.documentElement.classList.remove('dark-mode', 'sepia-mode');

    if (selectedTheme === 'dark') {
      document.documentElement.classList.add('dark-mode');
    } else if (selectedTheme === 'sepia') {
      document.documentElement.classList.add('sepia-mode');
    }

    setTheme(selectedTheme);
    localStorage.setItem('readerTheme', selectedTheme);
  };

  return {
    fontSize,
    fontFamily,
    lineHeight,
    theme,
    setFontFamily,
    setLineHeight,
    increaseFontSize,
    decreaseFontSize,
    applyTheme
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
 * Counts words in HTML content
 * @param {string} htmlContent - HTML content to count words in
 * @returns {number} Word count
 */
export const countWords = (htmlContent) => {
  // Create a temporary div to extract text
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  const text = tempDiv.textContent || tempDiv.innerText || '';
  const words = text.trim().split(/\s+/);
  return words.filter(word => word.length > 0).length;
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