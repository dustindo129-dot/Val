import React, { useState, useEffect } from 'react';
import '../styles/components/ScrollToTop.css';

/**
 * ScrollToTop Component
 * 
 * A reusable button that appears when the user scrolls down
 * and scrolls back to the top of the page when clicked.
 */
const ScrollToTop = ({ threshold = 300, forceVisible = null, navigationVisible = false, bottomPosition = 20 }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when user scrolls down
  useEffect(() => {
    const toggleVisibility = () => {
      const scrolled = document.documentElement.scrollTop;
      if (scrolled > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    toggleVisibility(); // Check initial scroll position

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [threshold]);

  // Scroll to top of the page
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Determine if button should be shown
  // If forceVisible is provided (not null), use it along with scroll position
  // If forceVisible is null, use original behavior (only scroll position)
  const shouldShow = forceVisible !== null 
    ? (forceVisible && isVisible) // Show only if both forceVisible is true AND scrolled past threshold
    : isVisible; // Original behavior - show based on scroll position only


  // Calculate adjusted bottom position for mobile when navigation is visible
  const getBottomPosition = () => {
    if (navigationVisible) {
      // Add extra spacing when navigation controls are visible
      // On mobile: add 100px, on desktop: add 115px (190 - 75 = 115)
      const extraSpacing = window.innerWidth <= 768 ? 100 : 115;
      return bottomPosition + extraSpacing;
    }
    return bottomPosition;
  };

  return (
    <>
      {shouldShow && (
        <button 
          className={`scroll-top-btn ${navigationVisible ? 'navigation-visible' : ''}`}
          onClick={scrollToTop} 
          aria-label="Scroll to top of page"
          style={{ bottom: `${getBottomPosition()}px` }}
        >
          <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="arrow-up" className="svg-inline--fa fa-arrow-up" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
            <path fill="currentColor" d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2 160 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-306.7 105.4 105.3c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"></path>
          </svg>
        </button>
      )}
    </>
  );
};

export default ScrollToTop; 