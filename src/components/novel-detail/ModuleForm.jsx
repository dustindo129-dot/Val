import React, { memo, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

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

  // Update form values when editingModule changes
  useEffect(() => {
    setMode(moduleForm.mode || 'published');
    setModuleBalance(moduleForm.moduleBalance || 0);
  }, [moduleForm.mode, moduleForm.moduleBalance]);

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

  // Handle form submission with updated values
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    
    // Validate paid module balance
    if (mode === 'paid') {
      const balance = parseInt(moduleBalance) || 0;
      if (balance < 100) {
        setModuleForm(prev => ({ 
          ...prev, 
          error: 'Số lượng lúa cần phải tối thiểu là 100 🌾' 
        }));
        return;
      }
    }
    
    // Clear any previous errors
    setModuleForm(prev => ({ ...prev, error: '' }));
    
    // Create updated form data with current mode and moduleBalance
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
    <div className="module-form" style={{ 
      border: '4px solid red', 
      padding: '20px', 
      margin: '20px 0', 
      background: '#ffffcc',
      position: 'relative',
      zIndex: 1000,
      boxShadow: '0 0 10px rgba(0,0,0,0.5)',
      maxWidth: '100%'
    }}>
      <h4 style={{ color: 'black', fontSize: '18px', fontWeight: 'bold' }}>
        {editingModule ? '✏️ SỬA TẬP' : 'THÊM TẬP MỚI'}
      </h4>
      {moduleForm.error && <div className="form-error" style={{color: 'red'}}>{moduleForm.error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{margin: '10px 0'}}>
          <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>Tên tập:</label>
          <input
            type="text"
            value={moduleForm.title}
            onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Nhập tên tập"
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>
        
        {/* Module Mode Selection */}
        {isAdmin && (
          <div className="form-group" style={{margin: '10px 0'}}>
            <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>Chế độ tập:</label>
            <select
              value={mode}
              onChange={handleModeChange}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              <option value="published">CÔNG KHAI (Hiển thị cho mọi người)</option>
              <option value="paid">TRẢ PHÍ (Cần mở khóa)</option>
            </select>
          </div>
        )}
        
        {/* Module Balance Input - Only shows when mode is paid */}
        {isAdmin && mode === 'paid' && (
          <div className="form-group" style={{margin: '10px 0'}}>
            <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>
              Số lượng 🌾 cần (tối thiểu 100):
            </label>
            <input
              type="number"
              min="100"
              value={moduleBalance}
              onChange={handleModuleBalanceChange}
              placeholder="Nhập giá 🌾 (tối thiểu 100)"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
        )}
        
        <div className="form-group" style={{margin: '10px 0'}}>
          <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>Ảnh bìa:</label>
          <div className="cover-upload">
            {moduleForm.illustration && (
              <img
                src={moduleForm.illustration}
                alt="Cover preview"
                className="cover-preview"
                style={{
                  maxWidth: '200px',
                  maxHeight: '200px',
                  display: 'block',
                  marginBottom: '10px'
                }}
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleModuleCoverUpload}
              id="cover-upload"
              style={{ display: 'none' }}
            />
            <label htmlFor="cover-upload" className="upload-btn" style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: '#4285f4',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              {moduleForm.loading ? 'Đang tải lên...' : 'Tải lên ảnh bìa'}
            </label>
          </div>
        </div>
        <div className="form-actions" style={{
          marginTop: '20px',
          display: 'flex',
          gap: '10px'
        }}>
          <button type="submit" disabled={moduleForm.loading} style={{
            padding: '10px 20px',
            background: editingModule ? 'orange' : 'green',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            {editingModule ? 'Cập nhật tập' : 'Tạo tập mới'}
          </button>
          <button type="button" onClick={handleModuleFormToggle} style={{
            padding: '10px 20px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
});

export default ModuleForm; 