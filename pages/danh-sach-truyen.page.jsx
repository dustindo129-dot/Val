import { Navigate } from 'react-router-dom';

export const Page = () => <Navigate to="/danh-sach-truyen/trang/1" replace />;

export async function onBeforeRender(pageContext) {
  return {
    pageContext: {
      pageProps: {},
      documentProps: {
        title: 'Danh Sách Truyện - Valvrareteam',
        description: 'Khám phá kho tàng light novel tiếng Việt chất lượng cao tại Valvrareteam. Cập nhật nhanh, đọc dễ dàng, trải nghiệm tốt nhất.'
      }
    }
  };
}

export const passToClient = ['pageProps']; 