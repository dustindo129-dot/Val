import React, { createContext, useContext, useState } from 'react';

const SEOContext = createContext();

export const useSEO = () => {
  const context = useContext(SEOContext);
  if (!context) {
    return { seoFooterHTML: null, setSEOFooterHTML: () => {} };
  }
  return context;
};

export const SEOProvider = ({ children }) => {
  const [seoFooterHTML, setSEOFooterHTML] = useState(null);

  return (
    <SEOContext.Provider value={{ seoFooterHTML, setSEOFooterHTML }}>
      {children}
    </SEOContext.Provider>
  );
}; 