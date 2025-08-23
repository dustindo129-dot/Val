import React, { useState, useEffect } from 'react';
import '../styles/components/AvatarAnnouncementStrip.css';

const AvatarAnnouncementStrip = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if we should show the announcement
    const lastShown = localStorage.getItem('avatarAnnouncementLastShown');
    const today = new Date().toDateString();
    
    console.log('Avatar announcement check:', { lastShown, today });
    
    // For testing: always show the announcement (remove this condition later)
    // if (!lastShown || lastShown !== today) {
      setIsVisible(true);
      localStorage.setItem('avatarAnnouncementLastShown', today);
    // }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="avatar-announcement-strip">
      <div className="announcement-content">
        <span>Đổi avatar bằng cách chọn hình đại diện góc trên bên phải {'->'} Cài đặt</span>
        <button onClick={handleClose} className="close-button" aria-label="Đóng thông báo">
          <i className="fa-solid fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default AvatarAnnouncementStrip;
