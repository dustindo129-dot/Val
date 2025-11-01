import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/components/AnnouncementStrip.css';

const AnnouncementStrip = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Only show on homepage
    const isHomepage = location.pathname === '/';
    
    if (!isHomepage) {
      setIsVisible(false);
      return;
    }

    // Check if we should show the announcement
    const lastShown = localStorage.getItem('avatarAnnouncementLastShown');
    const today = new Date().toDateString();
    
    if (!lastShown || lastShown !== today) {
      setIsVisible(true);
      localStorage.setItem('avatarAnnouncementLastShown', today);
    }
  }, [location.pathname]);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="avatar-announcement-strip">
      <div className="announcement-content">
        <span>Từ giờ đã có thể up ảnh bìa + ảnh avatar tại trang cá nhân</span>
        <button onClick={handleClose} className="close-button" aria-label="Đóng thông báo">
          <i className="fa-solid fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default AnnouncementStrip;
