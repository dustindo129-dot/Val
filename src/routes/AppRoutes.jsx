import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import ProtectedRoute from '../components/ProtectedRoute';
import LocalizedRoute from '../components/LocalizedRoute';

// Lazy load components for better code splitting
const NovelList = lazy(() => import('../components/NovelList'));
const NovelDirectory = lazy(() => import('../components/NovelDirectory'));
const NovelDetail = lazy(() => import('../components/NovelDetail'));
const ChapterDashboard = lazy(() => import('../components/ChapterDashboard'));
const AdminDashboard = lazy(() => import('../components/AdminDashboard.jsx'));
const UserProfile = lazy(() => import('../pages/UserProfile'));
const UserSettings = lazy(() => import('../pages/UserSettings'));
const UserBookmarks = lazy(() => import('../pages/UserBookmarks'));
const ChangePassword = lazy(() => import('../pages/ChangePassword'));
const Chapter = lazy(() => import('../components/Chapter'));
const ResetPassword = lazy(() => import('../components/auth/ResetPassword'));
const EmailConfirmation = lazy(() => import('../pages/EmailConfirmation'));

const OLN = lazy(() => import('../pages/OLN'));
const Market = lazy(() => import('../pages/Market'));
const TopUp = lazy(() => import('../pages/TopUp'));
const TopUpManagement = lazy(() => import('../pages/TopUpManagement'));
const Forum = lazy(() => import('../pages/Forum'));
const ForumPostDetail = lazy(() => import('../pages/ForumPostDetail'));
const Contest2025 = lazy(() => import('../components/Contest2025'));
const SlugWrapper = lazy(() => import('../components/SlugWrapper'));

// Wrapper component for lazy-loaded routes with Suspense
const LazyRoute = ({ children }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);

function AppRoutes() {
  return (
    <LocalizedRoute>
      <Routes>
        {/* Vietnamese-Only Routes */}
        <Route path="/" element={<LazyRoute><NovelList /></LazyRoute>} />
        <Route path="/trang/:page" element={<LazyRoute><NovelList /></LazyRoute>} />
        <Route path="/danh-sach-truyen" element={<Navigate to="/danh-sach-truyen/trang/1" replace />} />
        <Route path="/danh-sach-truyen/trang/:page" element={<LazyRoute><NovelDirectory /></LazyRoute>} />
        <Route path="/truyen/:novelId" element={<LazyRoute><SlugWrapper component={NovelDetail} type="novel" /></LazyRoute>} />
        <Route path="/truyen/:novelId/chuong/:chapterId" element={<LazyRoute><SlugWrapper component={Chapter} type="chapter" /></LazyRoute>} />
        <Route path="/truyen/:novelId/tap/:moduleSlug/them-chuong" element={<LazyRoute><ProtectedRoute><ChapterDashboard /></ProtectedRoute></LazyRoute>} />
        
        {/* Vietnamese Pages */}
        <Route path="/bang-yeu-cau" element={<LazyRoute><Market /></LazyRoute>} />
        <Route path="/nap-tien" element={<LazyRoute><TopUp /></LazyRoute>} />
        <Route path="/quan-ly-giao-dich" element={<LazyRoute><ProtectedRoute><TopUpManagement /></ProtectedRoute></LazyRoute>} />
        <Route path="/bang-quan-tri" element={<LazyRoute><ProtectedRoute><AdminDashboard /></ProtectedRoute></LazyRoute>} />
        <Route path="/thao-luan" element={<LazyRoute><Forum /></LazyRoute>} />
        <Route path="/thao-luan/:slug" element={<LazyRoute><ForumPostDetail /></LazyRoute>} />
        <Route path="/val-light-novel-contest-2025" element={<LazyRoute><Contest2025 /></LazyRoute>} />
        <Route path="/truyen-xu-huong" element={<LazyRoute><NovelList filter="trending" /></LazyRoute>} />
        <Route path="/phuc-hoi-mat-khau/:token" element={<LazyRoute><ResetPassword /></LazyRoute>} />
        <Route path="/xac-nhan-email/:token" element={<LazyRoute><EmailConfirmation /></LazyRoute>} />
        
        {/* Vietnamese User Routes */}
        <Route path="/nguoi-dung/:userNumber/trang-ca-nhan" element={<LazyRoute><UserProfile /></LazyRoute>} />
        <Route path="/nguoi-dung/:userNumber/cai-dat" element={<LazyRoute><UserSettings /></LazyRoute>} />
        <Route path="/nguoi-dung/:userNumber/truyen-danh-dau" element={<LazyRoute><UserBookmarks /></LazyRoute>} />
        <Route path="/nguoi-dung/:userNumber/thay-doi-mat-khau" element={<LazyRoute><ProtectedRoute><ChangePassword /></ProtectedRoute></LazyRoute>} />
        
        {/* OLN (Original Light Novel) Routes */}
        <Route path="/oln" element={<Navigate to="/oln/trang/1" replace />} />
        <Route path="/oln/trang/:page" element={<LazyRoute><OLN /></LazyRoute>} />
      </Routes>
    </LocalizedRoute>
  );
}

export default AppRoutes; 