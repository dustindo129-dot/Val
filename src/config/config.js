const config = {
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  cloudinary: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPresets: {
      avatar: import.meta.env.VITE_CLOUDINARY_AVATAR_UPLOAD_PRESET,
      illustration: import.meta.env.VITE_CLOUDINARY_ILLUSTRATION_UPLOAD_PRESET,
      comment: import.meta.env.VITE_CLOUDINARY_COMMENT_UPLOAD_PRESET
    }
  },
  tinymceApiKey: '2xls70o8iwqefp6s06bpnm5efessylgsoqj93g48lwvyy6pj'
};

export default config; 