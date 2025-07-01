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
  editingModule,
  hasPaidContent = false, // New prop to indicate if module has paid chapters
  novel = null // Novel data for permission checks
}) => {
  const { user } = useAuth();
  
  // Enhanced permission check: admin, moderator, or authorized pj_user
  const canManageModuleModes = user && (
    user.role === 'admin' || 
    user.role === 'moderator' || 
    (user.role === 'pj_user' && novel?.active?.pj_user && (
      novel.active.pj_user.includes(user._id?.toString()) || 
      novel.active.pj_user.includes(user.id?.toString()) ||
      novel.active.pj_user.includes(user.username) ||
      novel.active.pj_user.includes(user.displayName)
    ))
  );
  const [mode, setMode] = useState(moduleForm.mode || 'published');
  const [moduleBalance, setModuleBalance] = useState(moduleForm.moduleBalance || 0);

  // Update form values when editingModule changes
  useEffect(() => {
    setMode(moduleForm.mode || 'published');
    setModuleBalance(moduleForm.moduleBalance || 0);
  }, [moduleForm.mode, moduleForm.moduleBalance]);

  // Handle invalid rent mode - if module is set to rent but has no paid content
  useEffect(() => {
    if (mode === 'rent' && !hasPaidContent && editingModule) {
      // Automatically switch to published mode and show warning
      setMode('published');
      setModuleForm(prev => ({ 
        ...prev, 
        error: 'Chế độ cho thuê đã được chuyển về "Hiển thị" vì tập này không còn chương trả phí.' 
      }));
    }
  }, [mode, hasPaidContent, editingModule, setModuleForm]);

  // Handler for mode change
  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setMode(newMode);
    // Reset moduleBalance when changing modes
    if (newMode === 'published' || newMode === 'rent') {
      setModuleBalance(0);
    }
  };

  // Handler for moduleBalance change
  const handleModuleBalanceChange = (e) => {
    setModuleBalance(e.target.value);
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
    
    // Validate rent mode - can only be set if module has paid content
    if (mode === 'rent' && !hasPaidContent) {
      setModuleForm(prev => ({ 
        ...prev, 
        error: 'Không thể đặt chế độ cho thuê. Tập này không có chương trả phí.' 
      }));
      return;
    }
    
    // Clear any previous errors
    setModuleForm(prev => ({ ...prev, error: '' }));
    
    // Create updated form data with current mode and moduleBalance
    // rentBalance is calculated automatically on the backend
    const updatedForm = {
      ...moduleForm,
      mode: mode,
      moduleBalance: mode === 'paid' ? parseInt(moduleBalance) || 0 : 0
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

        {canManageModuleModes && (
          <div className="module-form-group">
            <label className="module-form-label">Chế độ tập:</label>
            <select
              value={mode}
              onChange={handleModeChange}
              className="module-form-select"
            >
              <option value="published">{translateChapterModuleStatus('PUBLISHED')} (Hiển thị cho tất cả)</option>
              <option value="paid">{translateChapterModuleStatus('PAID')} (Cần mở khóa)</option>
              {/* Only show rent option if module has paid content */}
              {hasPaidContent && (
                <option value="rent">CHO THUÊ (Mở khóa có thời hạn)</option>
              )}
            </select>
            {/* Show helper text when rent option is not available */}
            {!hasPaidContent && (
              <small className="module-form-help-text">
                Chế độ cho thuê chỉ khả dụng khi tập có chương trả phí
              </small>
            )}
          </div>
        )}
        
        {/* Module Balance Input - Only shows when mode is paid and user can manage module modes */}
        {canManageModuleModes && mode === 'paid' && (
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

        {/* Rent Balance Display - Shows calculated value for authorized users */}
        {canManageModuleModes && mode === 'rent' && (
          <div className="module-form-group">
            <label className="module-form-label">
              Giá thuê (🌾/52h):
            </label>
            <div className="module-form-info-display">
              {moduleForm.rentBalance || 0} 🌾
            </div>
            <small className="module-form-help-text">
              Giá thuê được tính tự động: (Tổng lúa của tất cả chương trả phí trong tập) ÷ 10. 
              Giá sẽ được cập nhật khi có chương trả phí được thêm hoặc xóa khỏi tập.
            </small>
          </div>
        )}

        {/* Show module info for users who can't manage module modes when module is paid */}
        {!canManageModuleModes && user?.role === 'pj_user' && mode === 'paid' && (
          <div className="module-form-group">
            <label className="module-form-label">Chế độ tập hiện tại:</label>
            <div className="module-form-info-display">
              {translateChapterModuleStatus('PAID')} - {moduleBalance} 🌾 (Chỉ quản lý dự án mới có thể thay đổi)
            </div>
          </div>
        )}

        {/* Show module info for users who can't manage module modes when module is rent */}
        {!canManageModuleModes && user?.role === 'pj_user' && mode === 'rent' && (
          <div className="module-form-group">
            <label className="module-form-label">Chế độ tập hiện tại:</label>
            <div className="module-form-info-display">
              CHO THUÊ - {moduleForm.rentBalance || 0} 🌾/52h (Chỉ quản lý dự án mới có thể thay đổi)
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