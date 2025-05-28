import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env files
config({ path: path.resolve(__dirname, '../.env.local') });
config({ path: path.resolve(__dirname, '../.env') });

// Import slug utility
import { createUniqueSlug } from '../src/utils/slugUtils.js';

// Function to escape XML entities
function escapeXml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Function to create safe URLs for XML
function createSafeUrl(baseUrl, path) {
  // First encode any special characters in the path
  const encodedPath = encodeURI(path);
  const fullUrl = `${baseUrl}${encodedPath}`;
  return escapeXml(fullUrl);
}

// Node.js compatible config
// Priority: SITEMAP_BACKEND_URL > VITE_DEV_BACKEND_URL > VITE_BACKEND_URL > fallback
const backendUrl = process.env.SITEMAP_BACKEND_URL || 
                   process.env.VITE_DEV_BACKEND_URL || 
                   process.env.VITE_BACKEND_URL || 
                   'https://valvrareteam-backend.onrender.com';

async function generateSitemap() {
  const baseUrl = process.env.FRONTEND_URL || 'https://valvrareteam.net';
  const outputPath = path.resolve(__dirname, '../public/sitemap.xml');
  
  
  try {
    // Start XML content
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add static pages with Vietnamese URLs
    sitemap += `  <url>\n    <loc>${createSafeUrl(baseUrl, '/')}</loc>\n    <priority>1.0</priority>\n  </url>\n`;
    
    // Add localized Vietnamese pages
    sitemap += `  <url>\n    <loc>${createSafeUrl(baseUrl, '/danh-sach-truyen')}</loc>\n    <priority>0.9</priority>\n  </url>\n`;
    sitemap += `  <url>\n    <loc>${createSafeUrl(baseUrl, '/oln')}</loc>\n    <priority>0.7</priority>\n  </url>\n`;
    sitemap += `  <url>\n    <loc>${createSafeUrl(baseUrl, '/phan-hoi')}</loc>\n    <priority>0.6</priority>\n  </url>\n`;
    sitemap += `  <url>\n    <loc>${createSafeUrl(baseUrl, '/bang-yeu-cau')}</loc>\n    <priority>0.6</priority>\n  </url>\n`;
    sitemap += `  <url>\n    <loc>${createSafeUrl(baseUrl, '/nap-them')}</loc>\n    <priority>0.5</priority>\n  </url>\n`;
    
    let novels = [];
    let totalPages = 20; // Default fallback
    
    try {
      // Try to fetch novels from backend with more detailed information
      const response = await axios.get(`${backendUrl}/api/novels?limit=500`);
      const data = response.data;
      novels = data.novels || [];
      totalPages = Math.min(data.pagination?.totalPages || 20, 20);
      console.log(`✓ Successfully fetched ${novels.length} novels from backend`);
      
      // Try to fetch additional novel details for SEO
      if (novels.length > 0) {
        console.log(`✓ Fetching detailed novel information for SEO optimization...`);
      }
    } catch (error) {
      console.warn(`⚠ Backend not available, creating static sitemap without dynamic content`);
      console.warn(`Backend URL attempted: ${backendUrl}`);
    }
    
    // Add homepage pagination with Vietnamese URLs (first 20 pages)
    for (let i = 1; i <= totalPages; i++) {
      const safePageUrl = createSafeUrl(baseUrl, `/trang/${i}`);
      sitemap += `  <url>\n    <loc>${safePageUrl}</loc>\n    <priority>0.8</priority>\n  </url>\n`;
    }
    
    // Add novel directory pagination with Vietnamese URLs
    for (let i = 1; i <= Math.min(totalPages, 10); i++) {
      const safePageUrl = createSafeUrl(baseUrl, `/danh-sach-truyen/trang/${i}`);
      sitemap += `  <url>\n    <loc>${safePageUrl}</loc>\n    <priority>0.7</priority>\n  </url>\n`;
    }
    
    // Add novel detail pages with Vietnamese URLs and enhanced SEO metadata
    for (const novel of novels) {
      const lastModified = new Date(novel.updatedAt || novel.createdAt).toISOString();
      const novelSlug = createUniqueSlug(novel.title, novel._id);
      const safeNovelUrl = createSafeUrl(baseUrl, `/truyen/${novelSlug}`);
      sitemap += `  <url>\n    <loc>${safeNovelUrl}</loc>\n    <lastmod>${lastModified}</lastmod>\n    <priority>0.9</priority>\n  </url>\n`;
      
      // Add alternative title variations as separate URLs if needed
      // This helps with SEO for different ways users might search
      if (novel.alternativeTitles && novel.alternativeTitles.length > 0) {
        // Log alternative titles for SEO tracking
        console.log(`  → Novel "${novel.title}" has alternative titles: ${novel.alternativeTitles.join(', ')}`);
      }
      
      // Add chapters for this novel with Vietnamese URLs (limit to first 50 chapters per novel for sitemap size)
      try {
        const chaptersResponse = await axios.get(`${backendUrl}/api/chapters/novel/${novel._id}?limit=50`);
        const chapters = chaptersResponse.data || [];
        
        for (const chapter of chapters) {
          const chapterLastModified = new Date(chapter.updatedAt || chapter.createdAt).toISOString();
          const chapterSlug = createUniqueSlug(chapter.title, chapter._id);
          const safeChapterUrl = createSafeUrl(baseUrl, `/truyen/${novelSlug}/chuong/${chapterSlug}`);
          sitemap += `  <url>\n    <loc>${safeChapterUrl}</loc>\n    <lastmod>${chapterLastModified}</lastmod>\n    <priority>0.7</priority>\n  </url>\n`;
        }
        
        if (chapters.length > 0) {
          console.log(`  → Added ${chapters.length} chapters for "${novel.title}"`);
        }
      } catch (chapterError) {
        // Silently continue if chapters can't be fetched
        console.log(`  → Could not fetch chapters for "${novel.title}"`);
      }
    }
    
    // Close XML
    sitemap += '</urlset>';
    
    // Ensure public directory exists
    const publicDir = path.dirname(outputPath);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Write sitemap to file
    fs.writeFileSync(outputPath, sitemap);
    
    // Copy robots.txt to build output (at dist root for Netlify)
    const robotsSourcePath = path.resolve(__dirname, '../public/robots.txt');
    const robotsOutputPath = path.resolve(__dirname, '../dist/robots.txt');
    
    if (fs.existsSync(robotsSourcePath)) {
      try {
        // Ensure dist directory exists
        const distDir = path.dirname(robotsOutputPath);
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }
        
        fs.copyFileSync(robotsSourcePath, robotsOutputPath);
        console.log(`✓ Robots.txt copied to ${robotsOutputPath}`);
      } catch (robotsError) {
        console.log(`⚠ Could not copy robots.txt: ${robotsError.message}`);
      }
    } else {
      console.log(`⚠ Robots.txt not found at ${robotsSourcePath}`);
    }
    
    console.log(`✓ Sitemap generated at ${outputPath}`);
    console.log(`✓ Frontend URL: ${baseUrl}`);
    console.log(`✓ Novel pages: ${novels.length}`);
    console.log(`✓ Pagination pages: ${totalPages}`);
    
    // Note about sitemap URL
    console.log(`Sitemap URL: ${baseUrl}/sitemap.xml`);
    
  } catch (error) {
    console.error('❌ Error generating sitemap:', error.message);
  }
}

generateSitemap(); 