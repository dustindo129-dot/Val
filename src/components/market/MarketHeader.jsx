import React from 'react';

/**
 * Market Header Component
 * 
 * Displays the market header and introduction
 * 
 * @returns {JSX.Element} Market header component
 */
const MarketHeader = () => {
  return (
    <section className="market-section">
      <h2>Hướng dẫn chung</h2>
      <div className="market-overview">
        <p style={{ marginBottom: '1em' }}>Đây là nơi bạn có thể dùng 🌾 để yêu cầu truyện dịch mới hoặc yêu cầu mở chương/tập mới/sẵn có.</p>
        
        <div className="overview-section">
          <h3>Quy tắc chung:</h3>
          <ul>
            <li>Số 🌾 cọc tối thiểu là 100.</li>
            <li>Yêu cầu có thể rút lại sau 24h (sau 24h nút rút lại sẽ hiện ra), trừ trường hợp chọn Mở ngay!</li>
            <li>Có thể góp 🌾 vào yêu cầu có sẵn, bằng nút "góp" ở mỗi yêu cầu.</li>
            <li>Nếu yêu cầu bị từ chối, số 🌾 cọc/đóng góp sẽ được trả lại cho người dùng.</li>
            <li>Nếu thanh đóng góp vượt quá 100%, nó sẽ đổi màu.</li>
          </ul>
        </div>

        <div className="overview-section">
          <h3>Yêu cầu truyện mới:</h3>
          <ul>
            <li>Điền tên bộ truyện bạn muốn yêu cầu + nhắn nhủ thêm nếu có</li>
            <li>Cọc một số 🌾 bất kì (tối thiểu 100). Nếu dịch giả quyết định chạy bộ truyện yêu cầu, sẽ dựa vào con số này để quyết định làm bao nhiêu khi mới bắt đầu chạy, ví dụ 100 🌾 thì chắc vừa đủ mở project hoặc cùng lắm làm cái mở đầu hoặc đăng minh họa, nên cách tốt nhất hãy kêu gọi mọi người góp 🌾 cùng.</li>
            <li>Đăng yêu cầu và chờ đợi. Bên team dịch sẽ chỉ chấp nhận yêu cầu khi có thể đảm bảo tiến độ và chất lượng, nên sẽ mất chút thời gian để tìm được người dịch phù hợp nhất tùy theo yêu cầu.</li>
            <li>Dịch giả chỉ có thể chấp nhận yêu cầu sau khi project được tạo trên trang web (cơ chế bắt buộc), nếu chấp nhận sẽ nhận về toàn bộ số 🌾 từ yêu cầu bao gồm cả cọc lẫn đóng góp, tức là làm thì ăn cả hoặc không làm, không được nửa vời.</li>
            <li>Số 🌾 mục tiêu để mở truyện mới mặc định là 1000 (tương đương khoảng 100k), đây chỉ là con số mang tính minh họa, không phải yêu cầu bắt buộc.</li>

          </ul>
        </div>

        <div className="overview-section">
          <h3>Mở ngay chương/tập có sẵn:</h3>
          <ul>
            <li>Chọn bộ truyện trong thanh tìm kiếm.</li>
            <li>Chọn chương/tập bạn muốn mở.</li>
            <li>Điền số 🌾 cọc.</li>
            <li>Sau khi xác nhận, số cọc sẽ lập tức được trừ vào số 🌾 cần để mở chương/tập, tự động mở nếu con số giảm xuống 0.</li>
            <li>Nếu số 🌾 cọc vượt quá số 🌾 cần để mở chương/tập, số dư sẽ được trả lại cho người dùng.</li>
          </ul>
        </div>

        <div className="overview-section">
          <h3>Đề xuất từ nhóm dịch:</h3>
          <ul>
            <li>Đây là những bộ do nhóm đề xuất từ những bộ truyện có sẵn trên web, mang tính chất kiếm phí duy trì web hoặc kiếm thêm thu nhập cho dịch giả.</li>
            <li>Xin nhắc lại là chỉ đề xuất được những bộ đã có sẵn trên web, việc này khuyến khích dịch giả chạy các bộ truyện mới và mở công khai những chương đầu để thu hút người đọc.</li>
          </ul>
        </div>

        <div className="overview-section">
          <p className="important-note"><strong><em>Không có giới hạn cho bất kì yêu cầu nào của bạn, dù là truyện tiếng Anh, Nhật hay Trung, bất cứ gì cũng có thể được dịch ra tiếng Việt.</em></strong></p>
          <p className="important-note"><strong><em>Giá niêm yết: 4đ/1 chữ với truyện tiếng Anh/Trung, 6đ/1 chữ với truyện tiếng Nhật.</em></strong></p>
        </div>

        <div className="overview-section">
          <p className="note">Lưu ý: Đối với những yêu cầu liên quan đến truyện bản quyền hoặc 18+, vui lòng liên hệ <a href="https://www.facebook.com/profile.php?id=100064392503502" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>fanpage</a> để được tư vấn thêm.</p>
        </div>

        <div className="update-date">
          <em>Cập nhật ngày 30/04/2025</em>
        </div>
      </div>
    </section>
  );
};

export default MarketHeader; 