<div className="form-group">
  <label>Cover Image:</label>
  <div className="cover-upload">
    {moduleForm.illustration && (
      <img
        src={moduleForm.illustration}
        alt="Cover preview"
        className="cover-preview"
      />
    )}
    <input
      type="file"
      accept="image/*"
      onChange={handleModuleCoverUpload}
      id="cover-upload"
      style={{ display: 'none' }}
    />
    <label htmlFor="cover-upload" className="upload-btn">
      {moduleForm.loading ? 'Uploading...' : 'Upload Cover'}
    </label>
  </div>
</div> 