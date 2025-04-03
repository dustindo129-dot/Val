/**
 * Utility helper functions for the application
 */

/**
 * Format a date string into a readable format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return 'Invalid date';
  
  try {
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const month = monthNames[dateObj.getMonth()];
    const day = dateObj.getDate().toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${month}-${day}-${year}`;
  } catch (err) {
    console.error('Date formatting error:', err);
    return 'Invalid date';
  }
};

/**
 * Process HTML description and optionally truncate it
 * @param {string} description - HTML content to process
 * @param {number|null} maxLength - Maximum length to truncate to, null for no truncation
 * @returns {string} Processed HTML
 */
export const processDescription = (description, maxLength = null) => {
  if (!description) return '';
  
  // If no maxLength specified, return the original description
  if (maxLength === null) {
    return description;
  }
  
  const div = document.createElement('div');
  div.innerHTML = description;
  const text = div.textContent || div.innerText || '';
  
  if (text.length <= maxLength) {
    return description;
  }

  let truncated = '';
  let currentLength = 0;
  const words = description.split(/(<[^>]*>|\s+)/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordLength = word.replace(/<[^>]*>/g, '').length;

    if (currentLength + wordLength > maxLength) {
      break;
    }

    truncated += word;
    if (!word.match(/<[^>]*>/)) {
      currentLength += wordLength;
    }
  }

  return truncated + '...';
};

/**
 * Calculate approximate reading time for a given text
 * @param {string} text - The text to calculate reading time for
 * @param {number} wordsPerMinute - Average reading speed (words per minute)
 * @returns {number} Reading time in minutes
 */
export const calculateReadingTime = (text, wordsPerMinute = 200) => {
  if (!text) return 0;
  
  // Strip HTML tags if present
  const plainText = text.replace(/<[^>]*>/g, '');
  
  // Count words (split by whitespace)
  const wordCount = plainText.split(/\s+/).length;
  
  // Calculate reading time in minutes
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  
  return readingTime > 0 ? readingTime : 1; // Minimum 1 minute
}; 