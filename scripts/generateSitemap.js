const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../src/config/config');

async function generateSitemap() {
  const baseUrl = process.env.FRONTEND_URL || 'https://valvrareteam.net';
  const outputPath = path.resolve(__dirname, '../dist/client/sitemap.xml');
  
  try {
    // Fetch novels
    const response = await axios.get(`${config.backendUrl}/api/novels?limit=100`);
    const { novels, pagination } = response.data;
    
    // Start XML content
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add static pages
    sitemap += `  <url>\n    <loc>${baseUrl}/</loc>\n    <priority>1.0</priority>\n  </url>\n`;
    sitemap += `  <url>\n    <loc>${baseUrl}/homepage</loc>\n    <priority>1.0</priority>\n  </url>\n`;
    
    // Add homepage pagination (first 10 pages)
    const totalPages = Math.min(pagination.totalPages, 10);
    for (let i = 1; i <= totalPages; i++) {
      sitemap += `  <url>\n    <loc>${baseUrl}/homepage/page/${i}</loc>\n    <priority>0.8</priority>\n  </url>\n`;
    }
    
    // Add novel detail pages
    for (const novel of novels) {
      sitemap += `  <url>\n    <loc>${baseUrl}/novel/${novel._id}</loc>\n    <lastmod>${new Date(novel.updatedAt).toISOString()}</lastmod>\n    <priority>0.9</priority>\n  </url>\n`;
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
    
    console.log(`Sitemap generated at ${outputPath}`);
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }
}

generateSitemap(); 