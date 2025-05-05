import React from 'react';
import '../styles/Donate.css';

const Donate = () => {
  return (
    <div className="donate-container">
      <div className="donate-content">
        <h1>Thông Tin Donate</h1>
        <p>Đây là thông tin nhận Donate của Team. Và các bộ đang chạy nhận Donate nha. Bà con xài tạm trong quá trình phát triển hệ thống nạp tiền mới.</p>
                
        <div className="donate-image-container">
          <img 
            src="https://Valvrareteam.b-cdn.net/Screenshot%202025-04-28%20192829.png" 
            alt="Thông tin Donate" 
            className="donate-image" 
          />
        </div>
        
        <h2>Danh sách Light Novel nhận donate:</h2>
        <ul className="donate-list">
          <li>High School DxD</li>
          <li>Accel World</li>
          <li>Rebuild World</li>
        </ul>
        
        <div className="donate-note">
          <p><strong>Lưu ý:</strong> Bà con khi donate thì thêm cú pháp là [TÊN TRUYỆN] + [SỐ CHƯƠNG] + [TÊN BẠN] giúp mình nha. Để mình tổng kết cho dễ á, còn phần tên của bạn thì để mình gắn vào mục những người donate cho truyện nha</p>
        </div>
        
        <h2>Tình trạng bộ truyện:</h2>
        <ul className="novel-status-list">
          <li>High School DxD Tập 25 – Đã hoàn thành</li>
          <li>Rebuild World từ Tập 4~5 sẽ là 30k/chương. Nếu donate thì sẽ up chương sớm, còn lại thì 1 tuần 1 chap nha.</li>
        </ul>
        
        <p className="donate-link">
          <strong>Link xem Donate:</strong> <a href="https://docs.google.com/spreadsheets/d/1d2ZN-zD5xU1AuSrPfYR6pXxTIa0Wr2AR1XxrUrjtKhc/edit?usp=sharing" target="_blank" rel="noopener noreferrer">https://docs.google.com/spreadsheets/d/1d2ZN-zD5xU1AuSrPfYR6pXxTIa0Wr2AR1XxrUrjtKhc/edit?usp=sharing</a>
        </p>

      </div>
    </div>
  );
};

export default Donate; 