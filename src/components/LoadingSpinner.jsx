import React from 'react';
import '../styles/components/LoadingSpinner.css';

/**
 * A loading spinner component that displays a cherry blossom animation
 * @param {Object} props - Component props
 * @param {string} [props.size='medium'] - Size of the spinner (small, medium, large, inline)
 * @param {string} [props.text] - Optional text to display under the spinner
 * @param {boolean} [props.inline=false] - Whether to display as inline spinner
 * @returns {JSX.Element} LoadingSpinner component
 */
const LoadingSpinner = ({ size = 'medium', text, inline = false }) => {
  // For inline spinners, use CSS animation instead of GIF
  if (inline || size === 'inline') {
    return (
      <div className="loading-spinner-inline">
        <div className="loading-spinner-css"></div>
        {text && <span className="loading-text-inline">{text}</span>}
      </div>
    );
  }

  // Determine spinner size for the gif
  const sizeStyles = {
    small: { width: '60px', height: '60px' },
    medium: { width: '120px', height: '120px' },
    large: { width: '180px', height: '180px' }
  };
  
  const spinnerStyle = sizeStyles[size] || sizeStyles.medium;
  
  return (
    <div className="loading-spinner-container">
      <img 
        src="/Animation - 1748045662838.gif"
        alt="Loading..."
        className="loading-spinner-gif"
        style={spinnerStyle}
      />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner; 