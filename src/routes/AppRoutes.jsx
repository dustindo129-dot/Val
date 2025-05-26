import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import ProtectedRoute from '../components/ProtectedRoute';

// Lazy load components for better code splitting
const NovelList = lazy(() => import('../components/NovelList'));
const NovelDirectory = lazy(() => import('../components/NovelDirectory'));
const NovelDetail = lazy(() => import('../components/NovelDetail'));
const ChapterDashboard = lazy(() => import('../components/ChapterDashboard'));
const AdminDashboard = lazy(() => import('../components/AdminDashboard.jsx'));
const UserProfile = lazy(() => import('../pages/UserProfile'));
const UserBookmarks = lazy(() => import('../pages/UserBookmarks'));
const ChangePassword = lazy(() => import('../pages/ChangePassword'));
const Chapter = lazy(() => import('../components/Chapter'));
const ResetPassword = lazy(() => import('../components/auth/ResetPassword'));
const Feedback = lazy(() => import('../pages/Feedback'));
const Donate = lazy(() => import('../pages/Donate'));
const OLN = lazy(() => import('../pages/OLN'));
const Market = lazy(() => import('../pages/Market'));
const TopUp = lazy(() => import('../pages/TopUp'));
const TopUpManagement = lazy(() => import('../pages/TopUpManagement'));
const SlugWrapper = lazy(() => import('../components/SlugWrapper'));

// Wrapper component for lazy-loaded routes with Suspense
const LazyRoute = ({ children }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LazyRoute><NovelList /></LazyRoute>} />
      <Route path="/page/:page" element={<LazyRoute><NovelList /></LazyRoute>} />
      <Route path="/light-novel-vietsub" element={<LazyRoute><NovelList filter="trending" /></LazyRoute>} />
      <Route path="/novel-directory" element={<LazyRoute><NovelDirectory /></LazyRoute>} />
      <Route path="/novel-directory/page/:page" element={<LazyRoute><NovelDirectory /></LazyRoute>} />
      <Route path="/oln" element={<LazyRoute><OLN /></LazyRoute>} />
      <Route path="/oln/page/:page" element={<LazyRoute><OLN /></LazyRoute>} />
      <Route path="/novel/:novelId" element={<LazyRoute><SlugWrapper component={NovelDetail} type="novel" /></LazyRoute>} />
      <Route path="/novel/:novelId/chapter/:chapterId" element={<LazyRoute><SlugWrapper component={Chapter} type="chapter" /></LazyRoute>} />
      <Route path="/reset-password/:token" element={<LazyRoute><ResetPassword /></LazyRoute>} />
      <Route path="/feedback" element={<LazyRoute><Feedback /></LazyRoute>} />
      <Route path="/donate" element={<LazyRoute><Donate /></LazyRoute>} />
      <Route path="/market" element={<LazyRoute><Market /></LazyRoute>} />
      
      {/* User Routes */}
      <Route path="/user/:username/profile" element={<LazyRoute><UserProfile /></LazyRoute>} />
      <Route path="/user/:username/bookmarks" element={<LazyRoute><UserBookmarks /></LazyRoute>} />
      <Route path="/user/:username/change-password" element={<LazyRoute><ChangePassword /></LazyRoute>} />
      
      {/* Admin Routes */}
      <Route 
        path="/admin-dashboard" 
        element={
          <LazyRoute>
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          </LazyRoute>
        } 
      />
      <Route 
        path="/top-up" 
        element={
          <LazyRoute>
            <TopUp />
          </LazyRoute>
        } 
      />
      <Route 
        path="/topup-management" 
        element={
          <LazyRoute>
            <ProtectedRoute>
              <TopUpManagement />
            </ProtectedRoute>
          </LazyRoute>
        } 
      />
      <Route 
        path="/novel/:novelId/chapter/add" 
        element={
          <LazyRoute>
            <ProtectedRoute>
              <ChapterDashboard />
            </ProtectedRoute>
          </LazyRoute>
        } 
      />
      {/* New route for adding chapter to specific module */}
      <Route 
        path="/novel/:novelId/module/:moduleSlug/add-chapter" 
        element={
          <LazyRoute>
            <ProtectedRoute>
              <ChapterDashboard />
            </ProtectedRoute>
          </LazyRoute>
        } 
      />
    </Routes>
  );
}

export default AppRoutes; 