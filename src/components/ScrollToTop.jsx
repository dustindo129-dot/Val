import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';
import '../styles/components/ScrollToTop.css';

/**
 * ScrollToTop Component
 * 
 * A reusable button that appears when the user scrolls down
 * and scrolls back to the top of the page when clicked.
 */
const ScrollToTop = ({ threshold = 300 }) => {
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

  return (
    <>
      {isVisible && (
        <button 
          className="scroll-top-btn"
          onClick={scrollToTop} 
          aria-label="Scroll to top of page"
        >
          <FontAwesomeIcon icon={faArrowUp} />
        </button>
      )}
    </>
  );
};

export default ScrollToTop; 