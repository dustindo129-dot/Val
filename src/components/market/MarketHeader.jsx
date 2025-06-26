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
        <p style={{ marginBottom: '1em' }}>Đây là nơi bạn có thể dùng 🌾 để yêu cầu truyện dịch mới hoặc ủng hộ cho đề xuất từ nhóm dịch.</p>
        
        <div className="overview-section">
          <h3>Quy tắc chung:</h3>
          <ul>
            <li>Số 🌾 cọc tối thiểu là 100.</li>
            <li>Yêu cầu có thể rút lại sau 24h (sau 24h nút rút lại sẽ hiện ra)</li>
            <li>Có thể góp 🌾 vào yêu cầu có sẵn, bằng nút "góp" ở mỗi yêu cầu.</li>
            <li>Nếu yêu cầu bị từ chối, số 🌾 cọc/đóng góp sẽ được trả lại cho người dùng.</li>
            <li>Nếu thanh đóng góp vượt quá 100%, nó sẽ đổi màu!!!</li>
          </ul>
        </div>

        <div className="overview-section">
          <h3>Yêu cầu truyện mới:</h3>
          <ul>
            <li>Điền tên bộ truyện bạn muốn yêu cầu + nhắn nhủ thêm nếu có</li>
            <li>Cọc một số 🌾 bất kì (tối thiểu 100). Dịch giả sẽ dựa vào con số này để quyết định sẽ làm bao nhiêu khi tiếp nhận bộ truyện. </li>
            <li>Đăng yêu cầu và chờ đợi. Bên nhóm dịch sẽ chỉ chấp nhận yêu cầu khi có thể đảm bảo tiến độ và chất lượng, nên sẽ mất chút thời gian để tìm được người dịch phù hợp nhất tùy theo yêu cầu.</li>
            <li>Dịch giả chỉ có thể chấp nhận yêu cầu sau khi project được tạo trên trang web (cơ chế bắt buộc), nếu chấp nhận sẽ nhận về toàn bộ số 🌾 từ yêu cầu bao gồm cả cọc lẫn đóng góp, tức là làm thì ăn cả hoặc không làm, không được nửa vời.</li>
            <li>Số 🌾 mục tiêu để mở truyện mới mặc định là 1000 (tương đương khoảng 100k), đây chỉ là con số mang tính minh họa, không phải yêu cầu bắt buộc.</li>

          </ul>
        </div>

        <div className="overview-section">
          <h3>Đề xuất từ nhóm dịch:</h3>
          <ul>
            <li>Đây là những bộ do nhóm đề xuất, thường là những bộ đã có đủ nhân sự muốn trưng cầu đóng góp từ độc giả.</li>
            <li>Tương tự như yêu cầu truyện mới, nhóm chỉ có thể nhận đóng góp khi đã tạo project trên trang web.</li>
            <li>Người dùng có thể đóng góp 🌾 cho các đề xuất, và chỉ khi đề xuất được chấp nhận, các đóng góp này mới được thêm vào truyện.</li>
            <li>Nếu đề xuất bị từ chối, tất cả các đóng góp sẽ được hoàn lại.</li>
          </ul>
        </div>

        <div className="overview-section">
          <p className="important-note"><strong><em>Không có giới hạn cho bất kì yêu cầu nào của bạn, dù là truyện tiếng Anh, Nhật hay Trung, bất cứ gì cũng có thể được dịch ra tiếng Việt.</em></strong></p>
          <p className="important-note"><strong><em>Giá sàn: 4đ/1 chữ với truyện tiếng Anh/Trung, 6đ/1 chữ với truyện tiếng Nhật.</em></strong></p>
        </div>

        <div className="overview-section">
          <h3>Những câu hỏi thường gặp:</h3>
          <div className="faq-item">
            <p className="faq-question"><strong>Hỏi:</strong> Nếu muốn ủng hộ một bộ truyện có sẵn trên web nhưng bộ đó hiện không có kho lúa thì phải làm thế nào?</p>
            <p className="faq-answer"><strong>Đáp:</strong> Hãy tạo yêu cầu ở mục đề xuất, khi yêu cầu được chấp nhận lúa sẽ tự động được thêm vào kho lúa của bộ đó (lưu ý "tên truyện bạn muốn yêu cầu" phải khớp hoàn toàn tên bộ truyện trên web)</p>
          </div>
          <div className="faq-item">
            <p className="faq-question"><strong>Hỏi:</strong> Số lúa góp có nhất thiết bằng số chữ sẽ được dịch cho mỗi yêu cầu không?</p>
            <p className="faq-answer"><strong>Đáp:</strong> Không, số chữ dịch có thể nhiều hơn (theo yêu cầu của web mỗi bộ phải đảm bảo số chữ nhất định mới được khóa lúa). Yêu cầu là nơi để đề xuất bộ truyện bạn yêu thích, không phải mục đích chính để thu lúa. Hãy thoải mái yêu cầu vì có thể cũng có người cùng chí hướng như bạn!</p>
          </div>
        </div>

        <div className="overview-section">
          <p className="note">Lưu ý: Đối với những yêu cầu liên quan đến truyện bản quyền hoặc 18+, vui lòng liên hệ <a href="https://www.facebook.com/profile.php?id=100064392503502" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>fanpage</a> để được tư vấn thêm.</p>
        </div>

        <div className="update-date">
          <em>Cập nhật ngày 26/06/2025</em>
        </div>
      </div>
    </section>
  );
};

export default MarketHeader; 