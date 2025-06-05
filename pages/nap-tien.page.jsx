import React from 'react';
import TopUp from '../src/pages/TopUp';

export const Page = (pageProps) => <TopUp {...pageProps} />;

export async function onBeforeRender(pageContext) {
  return {
    pageContext: {
      pageProps: {},
      documentProps: {
        title: 'Nạp Tiền - Valvrareteam',
        description: 'Nạp tiền vào tài khoản Valvrareteam để hỗ trợ dự án dịch thuật và truy cập các tính năng premium. Dễ dàng và bảo mật.'
      }
    }
  };
}

export const passToClient = ['pageProps']; 