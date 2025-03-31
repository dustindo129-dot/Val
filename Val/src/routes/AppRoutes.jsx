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
import GenrePage from '../pages/GenrePage';

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<NovelList />} />
      <Route path="/homepage/page/:page" element={<NovelList />} />
      <Route path="/latest-update" element={<NovelList filter="latest" />} />
      <Route path="/novel-directory" element={<NovelDirectory />} />
      <Route path="/novel-directory/page/:page" element={<NovelDirectory />} />
      <Route path="/novel/:novelId" element={<NovelDetail />} />
      <Route path="/novel/:novelId/chapter/:chapterId" element={<Chapter />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/genres/:genre" element={<GenrePage />} />
      
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
        path="/novel/:novelId/chapter/add" 
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