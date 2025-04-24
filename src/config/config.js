const config = {
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  bunny: {
    folders: {
      avatar: 'avatars',
      illustration: 'illustrations',
      comment: 'comment-images'
    }
  },
  tinymce: {
    scriptPath: '/tinymce/js/tinymce/tinymce.min.js' // Path to self-hosted TinyMCE script in public folder
  }
};

export default config; 