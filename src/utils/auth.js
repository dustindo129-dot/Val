// Helper function to validate JWT token format
export const isValidJWT = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Each part should be base64 encoded (basic check)
  try {
    parts.forEach(part => {
      if (part.length === 0) throw new Error('Empty part');
      // Basic base64 character check
      if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error('Invalid characters');
    });
    return true;
  } catch {
    return false;
  }
};

// Helper function to decode JWT payload
export const decodeJWT = (token) => {
  if (!isValidJWT(token)) return null;
  
  try {
    const parts = token.split('.');
    const payload = parts[1];
    
    // Add padding if needed
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    const decoded = atob(paddedPayload);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

// Helper function to check if token is expired or will expire soon
export const isTokenExpired = (token, bufferMinutes = 5) => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const bufferSeconds = bufferMinutes * 60;
  
  // Consider token expired if it expires within the buffer time
  return payload.exp <= (now + bufferSeconds);
};

// Helper function to get token expiration time
export const getTokenExpiration = (token) => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return null;
  
  return new Date(payload.exp * 1000);
};

// Helper function to get validated token
export const getValidToken = () => {
  const token = localStorage.getItem('token');
  if (!isValidJWT(token)) {
    // Check if this is a recent login (within 5 minutes) to be less aggressive
    const loginTime = localStorage.getItem('loginTime');
    const isRecentLogin = loginTime && (Date.now() - parseInt(loginTime, 10)) < (5 * 60 * 1000);
    
    if (!isRecentLogin) {
      // Clear invalid token only if it's not a recent login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('loginTime');
    }
    return null;
  }
  
  // Check if token is expired, but be more lenient with recent logins
  if (isTokenExpired(token)) {
    const loginTime = localStorage.getItem('loginTime');
    const isRecentLogin = loginTime && (Date.now() - parseInt(loginTime, 10)) < (5 * 60 * 1000);
    
    if (!isRecentLogin) {
      return null;
    }
    // For recent logins, allow expired tokens temporarily
  }
  
  return token;
};

// Helper function to check if token needs refresh (expires within 10 minutes)
export const shouldRefreshToken = (token) => {
  if (!isValidJWT(token)) return false;
  return isTokenExpired(token, 10); // Refresh if expires within 10 minutes
};

// Helper function to create authorization headers
export const getAuthHeaders = () => {
  const token = getValidToken();
  if (!token) {
    return {};
  }
  return {
    'Authorization': `Bearer ${token}`
  };
};

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  return !!getValidToken();
};

// Helper function to store new token and update user data
export const updateAuthData = (tokenData, userData = null) => {
  if (tokenData.token) {
    localStorage.setItem('token', tokenData.token);
  }
  
  if (userData) {
    localStorage.setItem('user', JSON.stringify(userData));
  }
  
  // Dispatch event to notify components of token update
  window.dispatchEvent(new CustomEvent('auth-token-refreshed', { 
    detail: { token: tokenData.token, user: userData } 
  }));
}; 