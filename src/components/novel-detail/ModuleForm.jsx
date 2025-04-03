import React, { memo, useEffect } from 'react';

const ModuleForm = memo(({ 
  moduleForm, 
  setModuleForm, 
  handleModuleSubmit, 
  handleModuleCoverUpload, 
  handleModuleFormToggle, 
  editingModule 
}) => {
  // Log when component mounts or editingModule changes
  useEffect(() => {
    console.log('ModuleForm rendered with editingModule:', editingModule);
    console.log('moduleForm state:', moduleForm);
  }, [editingModule, moduleForm]);

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
        {editingModule ? '✏️ EDIT MODULE' : 'ADD NEW MODULE'}
      </h4>
      {moduleForm.error && <div className="form-error" style={{color: 'red'}}>{moduleForm.error}</div>}
      <form onSubmit={handleModuleSubmit}>
        <div className="form-group" style={{margin: '10px 0'}}>
          <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>Title:</label>
          <input
            type="text"
            value={moduleForm.title}
            onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter module title"
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>
        <div className="form-group" style={{margin: '10px 0'}}>
          <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>Cover Image:</label>
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
              {moduleForm.loading ? 'Uploading...' : 'Upload Cover'}
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
            {editingModule ? 'Update Module' : 'Create Module'}
          </button>
          <button type="button" onClick={handleModuleFormToggle} style={{
            padding: '10px 20px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
});

export default ModuleForm; 