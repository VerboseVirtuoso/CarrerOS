import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * A wrapper for routes that require authentication.
 * Checks for 'careeros-token' in localStorage.
 * Redirects to /login if missing, preserving the attempted location.
 */
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('careeros-token');
  const location = useLocation();

  if (!token) {
    // Redirect to login but save the path they were trying to visit
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
