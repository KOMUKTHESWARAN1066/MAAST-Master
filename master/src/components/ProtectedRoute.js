import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ element, ...rest }) => {
  const isAuthenticated = !!localStorage.getItem('authToken'); // or your auth logic here

  return isAuthenticated ? element : <Navigate to="/login" />;
};

export default ProtectedRoute;
