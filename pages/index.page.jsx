import React from 'react';
import NovelList from '../src/components/NovelList';

export const Page = () => <NovelList />;

// Optional route metadata for vite-plugin-ssr
export const documentProps = {
  title: 'Valvrareteam - Homepage',
  description: 'Valvrare Team tạo ra nhằm mục đích mang đến cho độc giả những bản dịch tiếng việt chất lượng. Rất mong được các bạn độc giả ủng hộ.'
}; 