// This script runs as part of the vite-plugin-ssr prerender process
// to fetch and prerender dynamic novel pages and chapter pages
import api from './src/services/api';
import { createUniqueSlug } from './src/utils/slugUtils.js';

export default async function generateDynamicPaths() {
  try {
    console.log('Fetching all novels and chapters to prerender...');
    
    // Fetch all novels (using a large limit to get everything)
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/novels?limit=1000`);
    const data = await response.json();
    const novels = data.novels || [];
    
    // Generate novel detail page URLs
    const novelUrls = novels.map(novel => {
      const novelSlug = createUniqueSlug(novel.title, novel._id);
      return `/novel/${novelSlug}`;
    });
    
    // Generate chapter page URLs
    const chapterUrls = [];
    
    // For each novel, get its modules and chapters
    await Promise.all(novels.map(async (novel) => {
      try {
        const novelWithModules = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/novels/${novel._id}`);
        const novelData = await novelWithModules.json();
        
        if (novelData.modules && novelData.modules.length > 0) {
          // Process each module and its chapters
          novelData.modules.forEach(module => {
            if (module.chapters && module.chapters.length > 0) {
              // Add URL for each chapter
              module.chapters.forEach(chapter => {
                if (chapter._id) {
                  // Skip draft/private chapters
                  if (chapter.mode === 'published' || !chapter.mode) {
                    const novelSlug = createUniqueSlug(novel.title, novel._id);
                    const chapterSlug = createUniqueSlug(chapter.title, chapter._id);
                    chapterUrls.push(`/novel/${novelSlug}/chapter/${chapterSlug}`);
                  }
                }
              });
            }
          });
        }
      } catch (error) {
        console.error(`Error fetching chapters for novel ${novel._id}:`, error);
      }
    }));
    
    console.log(`Will prerender ${novelUrls.length} novel detail pages and ${chapterUrls.length} chapter pages`);
    
    // Return all URLs to be prerendered
    return [...novelUrls, ...chapterUrls];
  } catch (error) {
    console.error('Error fetching novels for prerendering:', error);
    return []; // Return empty array if fetching fails
  }
} 