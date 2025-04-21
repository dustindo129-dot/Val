// This script runs as part of the vite-plugin-ssr prerender process
// to fetch and prerender dynamic novel pages
import api from './src/services/api';

export default async function generateDynamicPaths() {
  try {
    console.log('Fetching novels to prerender...');
    
    // Get the most popular/important novels to prerender (limited to avoid excessive build times)
    const { novels } = await api.fetchNovels(1, 20); // First page, 20 per page
    
    // Generate novel detail page URLs
    const novelUrls = novels.map(novel => `/novel/${novel._id}`);
    
    console.log(`Will prerender ${novelUrls.length} novel detail pages`);
    
    return novelUrls;
  } catch (error) {
    console.error('Error fetching novels for prerendering:', error);
    return []; // Return empty array if fetching fails
  }
} 