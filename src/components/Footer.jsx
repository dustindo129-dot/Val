/**
 * Footer Component
 * 
 * Footer component with copyright information and SEO content
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import SEOContent from './SEOContent';
import '../styles/Footer.css';

const Footer = () => {
  const location = useLocation();

  // Determine SEO page type based on current route
  const getSEOPageType = () => {
    const path = location.pathname;
    
    if (path.includes('light-novel-vietsub')) {
      return 'trending';
    } else if (path === '/' || path.includes('page/')) {
      return 'home';
    }
    
    return null; // Don't show SEO content on other pages
  };

  const seoPageType = getSEOPageType();

  return (
    <footer className="footer">
      {/* SEO Content in Footer */}
      {seoPageType && <SEOContent page={seoPageType} />}
      
      <div className="footer-content">
        <p>Copyright © 2025 Valvrareteam</p>
      </div>
    </footer>
  );
};

export default Footer; 