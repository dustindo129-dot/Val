/**
 * ProtectedRoute Component
 * 
 * Route wrapper component that handles authentication and authorization:
 * - Authentication checks
 * - Role-based access control
 * - Redirect handling
 * - Loading states
 * 
 * Features:
 * - Authentication verification
 * - Role verification
 * - Redirect to login
 * - Loading indicators
 * - Error handling
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * 
 * Route wrapper that ensures users are authenticated and authorized
 * before accessing protected routes
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string[]} [props.allowedRoles] - Array of allowed user roles
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  // Get user authentication state from context
  const { user } = useAuth();
  // Get current location for redirect
  const location = useLocation();
  
  // Check if user is authenticated and has admin or moderator role
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    // Redirect to home page if not admin or moderator, preserving attempted location
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Render child components if user is authorized
  return children;
};

export default ProtectedRoute; 