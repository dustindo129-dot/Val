import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/components/SessionInvalidationNotification.css';

/**
 * SessionInvalidationNotification Component
 * 
 * Displays a notification when the user's session has been invalidated
 * due to login from another device (single-device authentication)
 */
const SessionInvalidationNotification = () => {
  const { sessionInvalidationMessage } = useAuth();

  if (!sessionInvalidationMessage) {
    return null;
  }

  return (
    <div className="session-invalidation-notification">
      <div className="session-invalidation-content">
        <div className="session-invalidation-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="session-invalidation-message">
          <h4>Phiên đăng nhập đã hết hạn</h4>
          <p>{sessionInvalidationMessage}</p>
          <p className="session-invalidation-subtext">Bạn sẽ bị đăng xuất trong vài giây...</p>
        </div>
      </div>
    </div>
  );
};

export default SessionInvalidationNotification; 