// This file redirects or renders the homepage at /homepage URL
import React from 'react';
import NovelList from '../src/components/NovelList';

export const Page = () => <NovelList />;

// Optional: Export an onBeforeRender() hook if you need to fetch data before rendering
export async function onBeforeRender(pageContext) {
  // Here you can fetch data for this page
  return {
    pageContext: {
      pageProps: {
        // Any props you want to pass to the page
      }
    }
  };
}

// Metadata for SEO
export const documentProps = {
  title: 'Val-JS - Light Novels',
  description: 'Valvrare Team tạo ra nhằm mục đích mang đến cho độc giả những bản dịch tiếng việt chất lượng. Rất mong được các bạn độc giả ủng hộ.'
}; 