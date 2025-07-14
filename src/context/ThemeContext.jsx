import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    // Check both possible localStorage keys for backward compatibility
    const globalTheme = localStorage.getItem('theme');
    const readerTheme = localStorage.getItem('readerTheme');
    
    // Prioritize the global theme, fallback to reader theme, then default to light
    let savedTheme = globalTheme || readerTheme || 'light';
    
    // Normalize theme values (handle 'dark' vs other values)
    if (savedTheme === 'dark') {
      savedTheme = 'dark';
    } else if (savedTheme === 'sepia') {
      savedTheme = 'sepia';
    } else {
      savedTheme = 'light';
    }
    
    setTheme(savedTheme);
    applyThemeToDOM(savedTheme);
    
    // Sync both localStorage keys to ensure consistency
    localStorage.setItem('theme', savedTheme);
    localStorage.setItem('readerTheme', savedTheme);
    
    // Mark theme as loaded immediately since theme is now applied in HTML
    setThemeLoaded(true);
  }, []);

  // Apply theme to DOM
  const applyThemeToDOM = (selectedTheme) => {
    // Remove all theme classes
    document.documentElement.classList.remove('dark-mode', 'sepia-mode');
    
    // Apply the selected theme class
    if (selectedTheme === 'dark') {
      document.documentElement.classList.add('dark-mode');
    } else if (selectedTheme === 'sepia') {
      document.documentElement.classList.add('sepia-mode');
    }
    // 'light' theme doesn't need a class
  };

  // Change theme function
  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    applyThemeToDOM(newTheme);
    
    // Update both localStorage keys for backward compatibility
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('readerTheme', newTheme);
  };

  // Toggle between light and dark (for the main theme toggle button)
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    changeTheme(newTheme);
  };

  const value = {
    theme,
    setTheme: changeTheme,
    toggleTheme,
    applyTheme: changeTheme, // Alias for backward compatibility with ChapterUtils
    isDarkMode: theme === 'dark',
    themeLoaded
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 