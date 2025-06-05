import React from 'react';
import Feedback from '../src/pages/Feedback';

export const Page = (pageProps) => <Feedback {...pageProps} />;

export async function onBeforeRender(pageContext) {
  return {
    pageContext: {
      pageProps: {},
      documentProps: {
        title: 'Phản Hồi - Valvrareteam',
        description: 'Gửi phản hồi, góp ý và báo lỗi cho Valvrareteam. Chúng tôi luôn lắng nghe ý kiến của bạn để cải thiện dịch vụ tốt hơn.'
      }
    }
  };
}

export const passToClient = ['pageProps']; 