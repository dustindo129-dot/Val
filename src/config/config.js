const config = {
  // Use environment variables with sensible defaults for all environments
  backendUrl: import.meta.env.DEV || (import.meta.env.MODE === 'development')
    ? (import.meta.env.VITE_DEV_BACKEND_URL || '') // Empty string makes it use relative URLs via proxy
    : (import.meta.env.VITE_BACKEND_URL || ''),
  bunny: {
    folders: {
      avatar: 'avatars',
      illustration: 'illustrations',
      comments: 'comments',
      forum: 'forum',
      request: 'requests'
    }
  },
  tinymce: {
    scriptPath: '/tinymce/js/tinymce/tinymce.min.js' // Path to self-hosted TinyMCE script in public folder
  }
};

export default config; 