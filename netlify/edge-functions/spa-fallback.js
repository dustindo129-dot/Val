export default async (request, context) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip processing for API routes
  if (pathname.startsWith('/api/')) {
    return;
  }

  // Skip processing for static files
  if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf|zip|xml|txt)$/)) {
    return;
  }

  // Skip processing for sitemap and robots
  if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
    return;
  }

  // For all other routes, try to fetch the resource first
  const response = await context.next();
  
  // If the resource doesn't exist (404), serve index.html for SPA routing
  if (response.status === 404) {
    const indexResponse = await context.rewrite('/index.html');
    return indexResponse;
  }

  return response;
};

export const config = {
  path: "/*",
}; 