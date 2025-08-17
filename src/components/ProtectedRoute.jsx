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
import LoadingSpinner from './LoadingSpinner';

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
  // Add null check to prevent destructuring errors during hot reloads
  const authResult = useAuth();
  const { user, loading } = authResult || { 
    user: null, 
    loading: true 
  };
  // Get current location for redirect
  const location = useLocation();
  
  // Show loading spinner while authentication state is being restored
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Check if user is authenticated and has admin, moderator, or pj_user role
  if (!user || (user.role !== 'admin' && user.role !== 'moderator' && user.role !== 'pj_user')) {
    // Redirect to home page if not admin, moderator, or pj_user, preserving attempted location
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Render child components if user is authorized
  return children;
};

export default ProtectedRoute; 