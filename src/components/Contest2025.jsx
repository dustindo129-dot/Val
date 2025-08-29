/**
 * Contest2025 Component
 * 
 * Component for the Val Light Novel Contest 2025 page
 * Shows full contest information to all users:
 * - Contest details (prizes, jury messages, submission)
 * - Contest works display with round filtering (vòng 1, vòng 2, vòng 3)
 * 
 * Features:
 * - Complete contest information for all users
 * - Round-based filtering for contest works
 * - Responsive design
 * - Dark theme support
 */

import React, { useState } from 'react';
import './Contest2025.css';

/**
 * Contest2025 Component
 * 
 * Main component for the Val LN Contest 2025 page
 * 
 * @param {Object} props - No props required
 */
const Contest2025 = () => {
  // State for managing selected round in contest works section
  const [selectedRound, setSelectedRound] = useState('vòng 1');

  return (
    <div className="contest-2025-container">
      <div className="contest-content">
        {/* Page Header */}
        <div className="contest-header">
          <h1 className="contest-title">Val Light Novel Contest 2025</h1>
          <div className="contest-subtitle">
            Cuộc thi sáng tác Light Novel 'cây nhà lá vườn' đến từ Valvrareteam 
          </div>
        </div>

                 {/* Prize Section */}
         <div className="prize-section">
           <h2 className="section-title">🏆 Giải thưởng</h2>
           <div className="prizes-container">
             <div className="main-prizes">
               <div className="prize-card first-place">
                 <div className="prize-rank">01 GIẢI NHẤT</div>
                 <div className="prize-amount">1.000.000 VND</div>
               </div>
               <div className="prize-card second-place">
                 <div className="prize-rank">01 GIẢI NHÌ</div>
                 <div className="prize-amount">500.000 VND</div>
               </div>
               <div className="prize-card peoples-choice">
                 <div className="prize-rank">01 GIẢI NGHỆ SĨ NHÂN DÂN</div>
                 <div className="prize-amount">100.000 VND</div>
               </div>
             </div>
             
             <div className="bonus-prizes">
               <h3>Phần thưởng riêng đến từ các ban giám khảo</h3>
               <div className="bonus-summary">
                 <p>
                   <em>Chỉ áp dụng cho tác phẩm đạt giải nhất (đây là thưởng thêm, không liên quan đến giải thưởng tiền mặt, phần thưởng áp dụng cho 3 chương dự thi).</em>
                 </p>
                 <p>
                   <strong>Nekko</strong>: Tài trợ full minh họa • <strong>Koru</strong>: Audiobook • <strong>Mr.Tuân</strong>: Biên tập viên hỗ trợ hoàn thành tác phẩm. 
                   <span className="bonus-disclaimer">Lưu ý: Ban giám khảo có quyền rút lại phần thưởng riêng nếu tác phẩm chưa đạt chất lượng như mong muốn.</span>
                 </p>
               </div>
             </div>
           </div>
         </div>

         {/* Jury Messages Section */}
         <div className="jury-section">
           <h2 className="section-title">💬 Thông điệp từ ban giám khảo</h2>
           <div className="jury-cards">
             <div className="jury-card">
                               <div className="jury-avatar">
                  <img src="https://valvrareteam.b-cdn.net/avatars/1751515293094-Guyc3zxW4AAup4-.jfif" alt="Nekko" />
                </div>
                <div className="jury-info">
                  <h3 className="jury-name">Nekko</h3>
                  <div className="jury-message">
                    <div className="jury-message-title">Hãy viết một câu truyện mà chỉ mình bạn có thể viết được!</div>
                    
                    Mình là một người đã đồng hành cùng các tác phẩm Light Novel suốt hơn 10 năm, đọc cũng nhiều, dịch cũng nhiều, viết thì chưa, nhưng mình biết thế nào là một cuốn Light Novel hay.<br/><br/>
                    
                    Một cuốn Light Novel hay thường có một nhân vật mạnh mẽ để lại ấn tượng sâu sắc cho người đọc. Một nhân vật buồn cười đến mức làm người ta quên hết đi muộn phiền cuộc sống. Một nhân vật không có gì nổi bật nhưng lại tỏa sáng vào những lúc quan trọng. Một nhân vật siêu mạnh những lại có những điểm yếu rất 'đời thường'. Một nhân vật đi lên từ con số 0. Một nhân vật khổ đến mức khiến người đọc cảm thấy chắc bản thân mình không thể khổ hơn được nữa cũng phải tặc lưỡi rằng 'Trời thằng này khổ vl'. Một nhân vật siêu thông minh nhưng không thể quán xuyến và kiểm soát hết được mọi thứ. Một nhân vật kiên trì suốt nhiều năm vì một lí tưởng duy nhất. Một nhân vật luôn nở nụ cười dù trong bất kì hoàn cảnh nào. Một nhân vật vẻ ngoài thì không thể xấu xa hơn, nhưng bên trong thực ra lại tốt bụng. Một nhân vật được đền đáp bởi những việc tốt họ đã làm trong quá khứ. Một nhân vật đã từ bỏ cuộc sống cũ để làm lại một cuộc sống mới tốt hơn ở thế giới khác, nhưng chưa bao giờ thực sự có thể quên đi được quá khứ. Một nhân vật sống chỉ vì tình yêu và vì một người duy nhất. Một nhân vật bằng bất kì giá nào cũng phải cứu được tất cả mọi người. Một nhân vật vô cùng xấu xa và cuối cùng phải chịu một cái kết thích đáng. Một nhân vật hoàn lương. Một nhân vật chiến đấu bằng cách của riêng mình. Một nhân vật bị phản bội rồi trả thù. Một nhân vật bị phản bội nhưng không trả thù. Một nhân vật dù bản thân không làm được gì nhiều nhưng vì họ mà những người khác mới hợp sức lại để tạo nên một điều to lớn. Một nhân vật có sức mạnh nội tâm to lớn truyền cảm hứng khiến người đọc tin rằng chính bản thân họ cũng có thể gượng dậy trong cuộc sống của chính mình... Có rất nhiều nhân vật hay và ý nghĩa, và ngay cả bản thân mình cũng đã từng được 'cứu rỗi' bởi một nhân vật nào đó như vậy, và bạn cũng có thể tạo ra một nhân vật để cứu rỗi cuộc đời của một người khác.<br/><br/>
                    
                    Light Novel bắt nguồn từ Nhật Bản, nhưng ở thời hiện đại, ngay cả Trung Quốc và Hàn Quốc cũng đã có cho mình những câu truyện độc đáo và để lại dấu ấn mạnh mẽ, và mình tin rằng Việt Nam cũng có thể làm được điều tương tự, cũng có thể tạo ra một thứ dù chưa nhất thiết phải là hay, nhưng đủ để tự tin khẳng định rằng đây chính là Light Novel Việt Nam.<br/><br/>
                    
                    Hãy đừng lăn tăn quá nhiều về một cốt truyện xa vời hay một ý tưởng viễn vông nào đó, mà hãy viết về thứ gần gũi nhất với chính bản thân bạn , thứ thân thuộc nhất, một nhân vật do chính bạn tưởng tượng ra và đồng hành với bạn mỗi ngày. Một ý tưởng đau đáu đến nhói lòng, một hình mẫu bạn muốn hiện thực hóa, một câu truyện gào thét mỗi đêm rằng nó cần phải được viết ra, và chỉ mình bạn mới có thể làm được điều đó. Hãy đừng để bản thân bị ngăn cản bởi những sự tự ti vô cớ, chẳng hạn như ngại dùng tên tiếng Việt, ngại dùng từ tiếng Việt hay thậm chí là ngại lấy bối cảnh Việt Nam. Cuộc thi không cấm nhân vật chửi bậy, và hãy nhớ rằng những yếu tố cốt truyện như isekai, quay ngược thời gian các thứ xét cho cùng cũng chỉ là phương tiện, chỉ là plot device, đừng để bản thân bị lệ thuộc vào đó và coi đó là thể loại và bắt đầu từ đó. Không! Hãy bắt đầu từ câu hỏi mình muốn tạo ra một nhân vật như thế nào mà muốn viết về một câu truyện như thế nào xung quanh họ. Đó mới là cốt lõi và là thứ mà mình cảm thấy rằng văn học Việt Nam vẫn còn rất nhiều đất để khai thác.<br/><br/>
                    
                    Mình mở cuộc thi này, vì muốn tìm ra những nhân vật như vậy, những câu truyện như vậy. Điều kiện đã có, thời điểm cũng ổn, và mình muốn thử xem mình sẽ tìm được những câu truyện như thế nào và nếu được thì đi đến cùng với nó. Đây không phải là một cuộc thi mở ra cho vui, không có tài trợ, và chắc chắn không hề có cái gì dễ dàng trong quá trình này cả.<br/><br/>
                    
                    Valvreteam sẽ cố gắng hết mình vì tác phẩm của bạn,<br/>
                    Nên là, hãy viết bằng tất cả những gì bạn có nhé!
                  </div>
                </div>
             </div>
             
             <div className="jury-card">
                               <div className="jury-avatar">
                  <img src="https://valvrareteam.b-cdn.net/avatars/1748621369860-MV5BNjcwMDlhYTQtNmY3MS00ZDJlLWI1NTEtMmNkNzIxNjlkNmZmXkEyXkFqcGc-.-V1-.jpg" alt="Rabi" />
                </div>
                <div className="jury-info">
                  <h3 className="jury-name">Rabi</h3>
                  <div className="jury-message">
                    <div className="jury-message-title">Con đường ngắn nhất để đến trái tim xuất phát từ chính trái tim!</div>
                    Mình là moderator của Truyện Việt trên website Valvrare Team. Với kinh nghiệm làm nerd 23 năm và đã tiếp xúc với rất nhiều các câu chuyện được trình bày theo nhiều hình thức khác nhau từ phim ảnh, truyện tranh, truyện viết… tôi có tự tin về mắt nhìn và lựa chọn cốt truyện hay của mình.<br/><br/>

                    Đến với cuộc thi này, tôi muốn tìm kiếm một số tác phẩm tốt có tiềm năng phát triển để đăng tải trên website cũng như tìm ra các tác giả tiềm năng có thể gắn bó lâu dài với website của chúng tôi.<br/><br/>

                    Đối với bản thân tôi, một câu chuyện hay là một câu chuyện mà tác giả biết được mình viết nó ra vì mục đích gì. Để kết nối với người đọc thông qua những trải nghiệm cá nhân, để cảnh báo về một vấn đề xã hội, để tạo ra một thế giới nơi trí tưởng tượng được bay nhảy trong một không gian không giới hạn…. Dù bạn viết vì bất kỳ lý do gì, tôi chỉ hy vọng bạn thật sự thích những gì bạn đã viết ra. Hãy để cuộc thi này là bước đệm tạo ra sự tự tin đối với tác phẩm của bạn.<br/><br/>

                    Mong rằng chúng ta sẽ đồng hành cùng nhau.
                  </div>
                </div>
             </div>
             
             <div className="jury-card">
                               <div className="jury-avatar">
                  <img src="https://valvrareteam.b-cdn.net/avatars/1755388276818-IMG-5430.jpeg" alt="Tuân" />
                </div>
                <div className="jury-info">
                  <h3 className="jury-name">Tuân</h3>
                  <div className="jury-message">
                    <div className="jury-message-title">Sáng tác sẽ trở nên đơn giản hơn rất nhiều nếu bạn thực sự hiểu mình muốn gì!</div>
                    Đây là lời khuyên đầu tiên và quan trọng nhất tôi luôn dành cho những tay viết mới, những người đang loay hoay tìm một chỗ đứng trong cộng đồng nghệ thuật này. Khi nói đến việc hiểu bản thân mình muốn gì khi sáng tác, điều tôi muốn nhấn mạnh chính là khả năng hình dung một cách rõ ràng và cụ thể về những gì bạn mong muốn.<br/><br/>

                    Văn chương, về cơ bản cũng giống như hội họa. Khi bạn vẽ ra một bức tranh, bạn phải tưởng tượng được những bố cục, đường nét và màu sắc cảm xúc của nó sẽ như thế nào. Tương tự như vậy, những gì bên trong tâm trí bạn trở thành bản phác thảo đầu tiên. Vì thế đừng vội vàng, hãy dành một khoảng lặng để kết nối với suy nghĩ của bản thân. Bạn hãy tự hỏi rằng vì sao mình bắt đầu câu chuyện này? Mình mong đợi gì ở sự kết thúc của nó? Và hơn hết, hãy thực tế về mục tiêu của mình, tránh sa đà vào những điều mông lung. Chỉ khi đó bạn sẽ biết được mình cần làm gì và làm nó thế nào.<br/><br/>

                    Với tư cách một giám khảo, tôi sẽ đồng hành cùng các bạn trong con đường sáng tác. Chúc các bạn thành công.
                  </div>
                </div>
             </div>
           </div>
         </div>

         {/* Submission and Rules Section */}
         <div className="submission-section">
           <div className="submission-panels">
             <div className="panel submission-panel">
               <div className="panel-icon">📧</div>
               <h3>Gửi bài dự thi</h3>
               <p>Thí sinh gửi bài dự thi qua email:</p>
               <div className="email-display">
               truyenvietcuavalvrareteam@gmail.com 
               </div>
               <p className="panel-note">Vui lòng đọc kỹ luật thi trước khi gửi bài</p>
               <p>Tiêu đề email dự thi cần ghi rõ:</p>
               <p>Bài dự thi ValOLN2025_[tên tác phẩm]_[tên tác giả]</p>
             </div>
             
             <div className="panel rules-panel">
               <div className="panel-icon">📋</div>
               <h3>Luật và chi tiết đầy đủ</h3>
               <p>Tài liệu chính thức về quy định cuộc thi:</p>
               <a 
                 href="https://docs.google.com/document/d/15CLdlCD2g0iYoIexOtzF-T78MW7tagJr2bVkHj19c3g/edit?fbclid=IwZXh0bgNhZW0CMTAAYnJpZBExVUgyRXdsbXlmNjlBeE5VbQEelK_n4jzPEmjLXtFV4IjAR3DrSUXDfjGyZhR-VEsz89DTUvcWXtSEuzTaAQ4_aem_GyVJSNe4kg8L88ARV7cTFg&tab=t.0"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="rules-button"
               >
                 Xem luật thi đầy đủ
               </a>
               <p className="panel-note">Mở trong tab mới</p>
             </div>
           </div>
         </div>

         {/* Contest Works Section - Visible to all users */}
         <div className="contest-works-content">
           <div className="contest-works-section">
             <h2>Các tác phẩm dự thi</h2>
             
             {/* Round Filter Buttons */}
             <div className="round-filters">
               {['vòng 1', 'vòng 2', 'vòng 3'].map((round) => (
                 <button
                   key={round}
                   className={`round-filter-btn ${selectedRound === round ? 'active' : ''}`}
                   onClick={() => setSelectedRound(round)}
                 >
                   {round.charAt(0).toUpperCase() + round.slice(1)}
                 </button>
               ))}
             </div>

             {/* Works Display Area */}
             <div className="works-container">
               <div className="works-header">
                 <h3>Tác phẩm {selectedRound}</h3>
                 <span className="works-count">(0 tác phẩm)</span>
               </div>
               
               <div className="works-list">
                 {/* Placeholder for empty state */}
                 <div className="empty-state">
                   <div className="empty-icon">📚</div>
                   <p>Chưa có tác phẩm nào trong {selectedRound}</p>
                   <span className="empty-note">Các tác phẩm sẽ được hiển thị ở đây khi có dữ liệu</span>
                 </div>
               </div>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
};

export default Contest2025;
