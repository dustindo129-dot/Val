import { Navigate } from 'react-router-dom';

export const Page = () => <Navigate to="/oln/trang/1" replace />;

export async function onBeforeRender(pageContext) {
  return {
    pageContext: {
      pageProps: {},
      documentProps: {
        title: 'OLN - Original Light Novel - Valvrareteam',
        description: 'Khám phá những tác phẩm Original Light Novel (OLN) độc đáo và sáng tạo. Thưởng thức câu chuyện gốc từ tác giả Việt Nam tại Valvrareteam.',
        link: [
          {
            rel: 'canonical',
            href: 'https://valvrareteam.net/oln'
          }
        ]
      }
    }
  };
}

export const passToClient = ['pageProps']; 