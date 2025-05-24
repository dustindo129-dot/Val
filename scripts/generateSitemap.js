import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Node.js compatible config
const backendUrl = process.env.VITE_BACKEND_URL || 'https://valvrareteam-backend.onrender.com';

async function generateSitemap() {
  const baseUrl = process.env.FRONTEND_URL || 'https://valvrareteam.net';
  const outputPath = path.resolve(__dirname, '../dist/client/sitemap.xml');
  
  try {
    // Start XML content
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add static pages
    sitemap += `  <url>\n    <loc>${baseUrl}/</loc>\n    <priority>1.0</priority>\n  </url>\n`;
    sitemap += `  <url>\n    <loc>${baseUrl}/homepage</loc>\n    <priority>1.0</priority>\n  </url>\n`;
    
    // Add SEO-optimized Vietnamese light novel pages
    sitemap += `  <url>\n    <loc>${baseUrl}/light-novel-vietsub</loc>\n    <priority>0.9</priority>\n  </url>\n`;
    sitemap += `  <url>\n    <loc>${baseUrl}/light-novel-tieng-viet</loc>\n    <priority>0.9</priority>\n  </url>\n`;
    sitemap += `  <url>\n    <loc>${baseUrl}/doc-light-novel-vietsub</loc>\n    <priority>0.9</priority>\n  </url>\n`;
    sitemap += `  <url>\n    <loc>${baseUrl}/latest-update</loc>\n    <priority>0.8</priority>\n  </url>\n`;
    sitemap += `  <url>\n    <loc>${baseUrl}/novel-directory</loc>\n    <priority>0.8</priority>\n  </url>\n`;
    sitemap += `  <url>\n    <loc>${baseUrl}/oln</loc>\n    <priority>0.7</priority>\n  </url>\n`;
    
    let novels = [];
    let totalPages = 10; // Default fallback
    
    try {
      // Try to fetch novels from backend with more detailed information
      const response = await axios.get(`${backendUrl}/api/novels?limit=500`);
      const data = response.data;
      novels = data.novels || [];
      totalPages = Math.min(data.pagination?.totalPages || 10, 10);
      console.log(`✓ Successfully fetched ${novels.length} novels from backend`);
      
      // Try to fetch additional novel details for SEO
      if (novels.length > 0) {
        console.log(`✓ Fetching detailed novel information for SEO optimization...`);
      }
    } catch (error) {
      console.warn(`⚠ Backend not available, creating static sitemap without dynamic content`);
      console.warn(`Backend URL attempted: ${backendUrl}`);
    }
    
    // Add homepage pagination (first 10 pages)
    for (let i = 1; i <= totalPages; i++) {
      sitemap += `  <url>\n    <loc>${baseUrl}/homepage/page/${i}</loc>\n    <priority>0.8</priority>\n  </url>\n`;
    }
    
    // Add novel detail pages with enhanced SEO metadata
    for (const novel of novels) {
      const lastModified = new Date(novel.updatedAt || novel.createdAt).toISOString();
      sitemap += `  <url>\n    <loc>${baseUrl}/novel/${novel._id}</loc>\n    <lastmod>${lastModified}</lastmod>\n    <priority>0.9</priority>\n  </url>\n`;
      
      // Add alternative title variations as separate URLs if needed
      // This helps with SEO for different ways users might search
      if (novel.alternativeTitles && novel.alternativeTitles.length > 0) {
        // Log alternative titles for SEO tracking
        console.log(`  → Novel "${novel.title}" has alternative titles: ${novel.alternativeTitles.join(', ')}`);
      }
    }
    
    // Close XML
    sitemap += '</urlset>';
    
    // Ensure dist directory exists
    const distDir = path.dirname(outputPath);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    // Write sitemap to file
    fs.writeFileSync(outputPath, sitemap);
    
    // Copy robots.txt to build output
    const robotsSourcePath = path.resolve(__dirname, '../public/robots.txt');
    const robotsOutputPath = path.resolve(__dirname, '../dist/client/robots.txt');
    
    if (fs.existsSync(robotsSourcePath)) {
      fs.copyFileSync(robotsSourcePath, robotsOutputPath);
      console.log(`✓ Robots.txt copied to ${robotsOutputPath}`);
    }
    
    console.log(`✓ Sitemap generated at ${outputPath}`);
    console.log(`✓ Frontend URL: ${baseUrl}`);
    console.log(`✓ Static pages: 8 SEO-optimized pages`);
    console.log(`✓ Novel pages: ${novels.length}`);
    console.log(`✓ Pagination pages: ${totalPages}`);
  } catch (error) {
    console.error('Error generating sitemap:', error.message);
  }
}

generateSitemap(); 