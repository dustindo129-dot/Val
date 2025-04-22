import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { escapeInject, dangerouslySkipEscape } from 'vite-plugin-ssr/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StaticRouter } from 'react-router-dom/server';
import App from '../src/App';

export { render };
export { passToClient };

// Variables to pass to client
const passToClient = ['pageProps', 'isBot', 'urlOriginal', 'routeParams'];

async function render(pageContext) {
  const { urlOriginal, isBot, forceClient } = pageContext;
  
  // If not a bot and not forcing SSR, use client-side rendering
  if (!isBot && forceClient !== true) {
    return {
      documentHtml: escapeInject`<!DOCTYPE html>
        <html lang="vi">
          <head>
            <!-- Facebook Open Graph Meta Tags -->
            <meta property="og:title" content="Valvrare Team Library - Kho Tàng Light Novel. Mang đến cho độc giả những bản dịch tiếng Việt chất lượng nhất" />
            <meta property="og:description" content="Cập nhật nhanh, đọc dễ dàng, trải nghiệm tốt nhất cho fan light novel!" />
            <meta property="og:image" content="https://res.cloudinary.com/dvoytcc6b/image/upload/v1743985759/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
            <meta property="og:url" content="https://valvrareteam.net" />
            <meta property="og:type" content="website" />
            <meta property="og:locale" content="vi_VN" />
            <!-- Tags -->
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta http-equiv="X-UA-Compatible" content="ie=edge" />
            <meta name="description" content="Valvrare Team Library - Kho Tàng Light Novel. Mang đến cho độc giả những bản dịch tiếng Việt chất lượng nhất" />
            <link rel="icon" type="image/svg+xml" href="/images/valvrare-logo.svg" />
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Oxygen+Mono&family=Oxygen:wght@300;400;700&display=swap" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" rel="stylesheet" />
            <!-- Preload TinyMCE -->
            <script src="/tinymce/js/tinymce/tinymce.min.js"></script>
            <title>Valvrareteam</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/@vite/client"></script>
            <script type="module" src="/src/main.jsx"></script>
          </body>
        </html>`,
      pageContext: {
        // We can add anything to pageContext and it will be available in client
        pageProps: {}
      }
    };
  }
  
  // Create React Query client for SSR
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // For SSR, don't retry queries
        retry: false,
        // For bots, want immediate success/failure
        staleTime: 0
      }
    }
  });
  
  // Prefetch any necessary data here based on URL
  // For example, if url includes '/novel/' then prefetch novel data
  try {
    if (urlOriginal.includes('/novel/') && !urlOriginal.includes('/chapter/')) {
      // Extract novel ID from URL
      const novelId = urlOriginal.split('/novel/')[1].split('/')[0];
      // Prefetch novel data if ID exists
      if (novelId) {
        // TODO: Add your API fetch logic for novels
        // await queryClient.prefetchQuery(['novel', novelId], () => fetchNovel(novelId));
      }
    } else if (urlOriginal === '/' || urlOriginal.includes('/homepage')) {
      // Prefetch homepage data
      // TODO: Add your API fetch logic for homepage
      // await queryClient.prefetchQuery(['novels'], () => fetchNovels());
    }
  } catch (error) {
    console.error('Error prefetching data for SSR:', error);
  }
  
  // Render your app
  const appHtml = ReactDOMServer.renderToString(
    <QueryClientProvider client={queryClient}>
      <StaticRouter location={urlOriginal}>
        <App />
      </StaticRouter>
    </QueryClientProvider>
  );
  
  // Extract dehydrated state from React Query
  const dehydratedState = JSON.stringify(
    queryClient.getQueryCache().getAll().map(query => ({
      queryHash: query.queryHash,
      queryKey: query.queryKey,
      state: query.state
    }))
  );
  
  // Create full HTML document with the same meta tags as index.html
  const documentHtml = escapeInject`<!DOCTYPE html>
    <html lang="vi">
      <head>
        <!-- Facebook Open Graph Meta Tags -->
        <meta property="og:title" content="Valvrare Team Library - Kho Tàng Light Novel.Mang đến cho độc giả những bản dịch tiếng Việt chất lượng nhất." />
        <meta property="og:description" content="Cập nhật nhanh, đọc dễ dàng, trải nghiệm tốt nhất cho fan light novel!" />
        <meta property="og:image" content="https://res.cloudinary.com/dvoytcc6b/image/upload/v1743985759/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
        <meta property="og:url" content="https://valvrareteam.net" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="vi_VN" />
        <!-- Tags -->
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <meta name="description" content="Valvrare Team Library - Kho Tàng Light Novel. Mang đến cho độc giả những bản dịch tiếng Việt chất lượng nhất." />
        <link rel="icon" type="image/svg+xml" href="/images/valvrare-logo.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Oxygen+Mono&family=Oxygen:wght@300;400;700&display=swap" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <!-- Preload TinyMCE -->
        <script src="/tinymce/js/tinymce/tinymce.min.js"></script>
        <title>Valvrareteam</title>
      </head>
      <body>
        <div id="root">${dangerouslySkipEscape(appHtml)}</div>
        <script>
          window.__REACT_QUERY_STATE__ = ${dangerouslySkipEscape(dehydratedState)};
        </script>
      </body>
    </html>`;
  
  return {
    documentHtml,
    pageContext: {
      pageProps: {
        // You can add any props here that you want to pass to the client
      }
    }
  };
} 