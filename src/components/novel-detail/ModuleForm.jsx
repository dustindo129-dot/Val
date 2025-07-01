import React, { memo, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { translateChapterModuleStatus } from '../../utils/statusTranslation';
import '../../styles/components/ModuleForm.css';

const ModuleForm = memo(({ 
  moduleForm, 
  setModuleForm, 
  handleModuleSubmit, 
  handleModuleCoverUpload, 
  handleModuleFormToggle, 
  editingModule 
}) => {
  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';
  const [mode, setMode] = useState(moduleForm.mode || 'published');
  const [moduleBalance, setModuleBalance] = useState(moduleForm.moduleBalance || 0);
  const [rentBalance, setRentBalance] = useState(moduleForm.rentBalance || 0);

  // Update form values when editingModule changes
  useEffect(() => {
    setMode(moduleForm.mode || 'published');
    setModuleBalance(moduleForm.moduleBalance || 0);
    setRentBalance(moduleForm.rentBalance || 0);
  }, [moduleForm.mode, moduleForm.moduleBalance, moduleForm.rentBalance]);

  // Handler for mode change
  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setMode(newMode);
    // If changing from paid to published, reset moduleBalance
    if (newMode !== 'paid') {
      setModuleBalance(0);
    }
  };

  // Handler for moduleBalance change
  const handleModuleBalanceChange = (e) => {
    setModuleBalance(e.target.value);
  };

  // Handler for rentBalance change
  const handleRentBalanceChange = (e) => {
    setRentBalance(e.target.value);
  };

  // Handle form submission with updated values
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    
    // Validate paid module balance
    if (mode === 'paid') {
      const balance = parseInt(moduleBalance) || 0;
      if (balance < 1) {
        setModuleForm(prev => ({ 
          ...prev, 
          error: 'Số lượng lúa cần phải tối thiểu là 1 🌾' 
        }));
        return;
      }
    }
    
    // Clear any previous errors
    setModuleForm(prev => ({ ...prev, error: '' }));
    
    // Create updated form data with current mode, moduleBalance, and rentBalance
    const updatedForm = {
      ...moduleForm,
      mode: mode,
      moduleBalance: mode === 'paid' ? parseInt(moduleBalance) || 0 : 0,
      rentBalance: parseInt(rentBalance) || 0
    };
    
    // Update the form state
    setModuleForm(updatedForm);
    
    // Call the parent's submit handler with the updated form data
    handleModuleSubmit(e, updatedForm);
  };

  return (
    <div className="module-form-modal">
      <div className="module-form-content">
        <div className="module-form-header">
          <h3>{editingModule ? 'Sửa tập' : 'Tạo tập mới'}</h3>
          <button
            onClick={handleModuleFormToggle}
            className="module-form-close-btn"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {moduleForm.error && (
            <div className="module-form-error">
              {moduleForm.error}
            </div>
          )}

          <div className="module-form-group">
            <label className="module-form-label">Tên tập:</label>
            <input
              type="text"
              value={moduleForm.title}
              onChange={(e) => setModuleForm(prev => ({...prev, title: e.target.value}))}
              placeholder="Nhập tên tập"
              className="module-form-input"
              required
            />
          </div>

        {isAdmin && (
          <div className="module-form-group">
            <label className="module-form-label">Chế độ tập:</label>
            <select
              value={mode}
              onChange={handleModeChange}
              className="module-form-select"
            >
              <option value="published">{translateChapterModuleStatus('PUBLISHED')} (Hiển thị cho tất cả)</option>
              <option value="paid">{translateChapterModuleStatus('PAID')} (Cần mở khóa)</option>
            </select>
          </div>
        )}
        
        {/* Module Balance Input - Only shows when mode is paid and user is admin */}
        {isAdmin && mode === 'paid' && (
          <div className="module-form-group">
            <label className="module-form-label">
              Số lượng 🌾 cần (tối thiểu 1):
            </label>
            <input
              type="number"
              min="1"
              value={moduleBalance}
              onChange={handleModuleBalanceChange}
              placeholder="Nhập giá 🌾 (tối thiểu 1)"
              className="module-form-input"
            />
          </div>
        )}

        {/* Rent Balance Input - Only shows for admin users */}
        {isAdmin && (
          <div className="module-form-group">
            <label className="module-form-label">
              Giá thuê (🌾/24h):
            </label>
            <input
              type="number"
              min="0"
              value={rentBalance}
              onChange={handleRentBalanceChange}
              placeholder="Nhập giá thuê (0 = không cho thuê)"
              className="module-form-input"
            />
            <small className="module-form-help-text">
              Để 0 nếu không muốn cho phép thuê tập này. Giá thuê sẽ áp dụng cho toàn bộ nội dung trả phí trong tập.
            </small>
          </div>
        )}
        
        {/* Show module info for pj_user when module is paid */}
        {!isAdmin && user?.role === 'pj_user' && mode === 'paid' && (
          <div className="module-form-group">
            <label className="module-form-label">Chế độ tập hiện tại:</label>
            <div className="module-form-info-display">
              {translateChapterModuleStatus('PAID')} - {moduleBalance} 🌾 (Chỉ admin mới có thể thay đổi)
            </div>
          </div>
        )}
        
        <div className="module-form-group">
          <label className="module-form-label">Ảnh bìa:</label>
          <div className="cover-upload">
            {moduleForm.illustration && (
              <img
                src={moduleForm.illustration}
                alt="Cover preview"
                className="module-form-cover-preview"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleModuleCoverUpload}
              id="cover-upload"
              className="module-form-file-input"
            />
            <label htmlFor="cover-upload" className="module-form-upload-btn">
              {moduleForm.loading ? 'Đang tải lên...' : 'Tải lên ảnh bìa'}
            </label>
          </div>
        </div>

          <div className="module-form-actions">
            <button
              type="button"
              onClick={handleModuleFormToggle}
              className="module-form-cancel-btn"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={moduleForm.loading}
              className="module-form-submit-btn"
            >
              {moduleForm.loading ? 'Đang lưu...' : (editingModule ? 'Cập nhật' : 'Tạo tập')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default ModuleForm; 