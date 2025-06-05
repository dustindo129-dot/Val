/**
 * Footer Component
 * 
 * Footer component with copyright information and SEO content
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import SEOContent from './SEOContent';
import { useSEO } from '../context/SEOContext';
import '../styles/Footer.css';

const Footer = () => {
  const location = useLocation();
  const { seoFooterHTML } = useSEO();

  // Determine SEO page type based on current route
  const getSEOPageType = () => {
    const path = location.pathname;
    
    if (path.includes('truyen-xu-huong')) {
      return 'trending';
    } else if (path === '/' || path.includes('trang/')) {
      return 'home';
    }
    
    return null; // Don't show SEO content on other pages
  };

  const seoPageType = getSEOPageType();

  return (
    <footer className="footer">
      {/* SEO Content in Footer - server-side only for bots */}
      {seoFooterHTML && location.pathname === '/' && typeof window === 'undefined' ? (
        <div dangerouslySetInnerHTML={{ __html: seoFooterHTML }} />
      ) : (
        seoPageType && seoPageType !== 'home' && <SEOContent page={seoPageType} />
      )}
      
      <div className="footer-content">
        <p>Copyright © 2025 Valvrareteam</p>
      </div>
    </footer>
  );
};

export default Footer; 