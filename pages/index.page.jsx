import React from 'react';
import NovelList from '../src/components/NovelList';

export const Page = () => <NovelList />;

// Optional route metadata for vite-plugin-ssr
export const documentProps = {
  title: 'Valvrareteam - Đọc Light Novel Vietsub Miễn Phí | Light Novel Tiếng Việt Hay Nhất',
  description: 'Thư viện Light Novel vietsub lớn nhất Việt Nam. Đọc Light Novel tiếng Việt miễn phí, cập nhật nhanh, dịch chất lượng cao. Hàng nghìn bộ Light Novel hay như Sword Art Online, Re:Zero, Overlord đang chờ bạn khám phá!'
};