import { Routes, Route } from 'react-router-dom';
import NovelList from '../components/NovelList';
import NovelDirectory from '../components/NovelDirectory';
import NovelDetail from '../components/NovelDetail';
import ChapterDashboard from '../components/ChapterDashboard';
import AdminDashboard from '../components/AdminDashboard.jsx';
import UserProfile from '../pages/UserProfile';
import UserBookmarks from '../pages/UserBookmarks';
import ChangePassword from '../pages/ChangePassword';
import ProtectedRoute from '../components/ProtectedRoute';
import Chapter from '../components/Chapter';
import ResetPassword from '../components/auth/ResetPassword';
import Feedback from '../pages/Feedback';
import OLN from '../pages/OLN';
import Market from '../pages/Market';
import TopUp from '../pages/TopUp';
import TopUpManagement from '../pages/TopUpManagement';

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<NovelList />} />
      <Route path="/homepage/page/:page" element={<NovelList />} />
      <Route path="/latest-update" element={<NovelList filter="latest" />} />
      <Route path="/novel-directory" element={<NovelDirectory />} />
      <Route path="/novel-directory/page/:page" element={<NovelDirectory />} />
      <Route path="/oln" element={<OLN />} />
      <Route path="/oln/page/:page" element={<OLN />} />
      <Route path="/novel/:novelId" element={<NovelDetail />} />
      <Route path="/novel/:novelId/chapter/:chapterId" element={<Chapter />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/market" element={<Market />} />
      
      {/* User Routes */}
      <Route path="/user/:username/profile" element={<UserProfile />} />
      <Route path="/user/:username/bookmarks" element={<UserBookmarks />} />
      <Route path="/user/:username/change-password" element={<ChangePassword />} />
      
      {/* Admin Routes */}
      <Route 
        path="/admin-dashboard" 
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/top-up" 
        element={
          <TopUp />
        } 
      />
      <Route 
        path="/topup-management" 
        element={
          <ProtectedRoute>
            <TopUpManagement />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/novel/:novelId/chapter/add" 
        element={
          <ProtectedRoute>
            <ChapterDashboard />
          </ProtectedRoute>
        } 
      />
      {/* New route for adding chapter to specific module */}
      <Route 
        path="/novel/:novelId/module/:moduleId/add-chapter" 
        element={
          <ProtectedRoute>
            <ChapterDashboard />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default AppRoutes; 