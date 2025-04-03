import React from 'react';
import '../styles/components/LoadingSpinner.css';

/**
 * A loading spinner component that can be displayed while content is loading
 * @param {Object} props - Component props
 * @param {string} [props.size='medium'] - Size of the spinner (small, medium, large)
 * @param {string} [props.color] - Custom color for the spinner
 * @param {string} [props.text] - Optional text to display under the spinner
 * @returns {JSX.Element} LoadingSpinner component
 */
const LoadingSpinner = ({ size = 'medium', color, text }) => {
  // Determine spinner size classes
  const sizeClasses = {
    small: 'w-5 h-5 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4'
  };
  
  const spinnerClass = sizeClasses[size] || sizeClasses.medium;
  const spinnerStyle = color ? { borderTopColor: color } : {};
  
  return (
    <div className="loading-spinner-container">
      <div 
        className={`loading-spinner ${spinnerClass}`}
        style={spinnerStyle}
      ></div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner; 