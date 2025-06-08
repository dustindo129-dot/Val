import React from 'react';
import Market from '../src/pages/Market';

export const Page = (pageProps) => <Market {...pageProps} />;

export async function onBeforeRender(pageContext) {
  return {
    pageContext: {
      pageProps: {},
      documentProps: {
        title: 'Bảng Yêu Cầu - Valvrareteam',
        description: 'Đặt yêu cầu dịch light novel tại Valvrareteam. Gửi tác phẩm yêu thích và để cộng đồng quyết định những tác phẩm sẽ được dịch tiếp theo.',
        link: [
          {
            rel: 'canonical',
            href: 'https://valvrareteam.net/bang-yeu-cau'
          }
        ]
      }
    }
  };
}

export const passToClient = ['pageProps']; 