import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { BookmarkProvider } from './context/BookmarkContext';
import { NovelStatusProvider } from './context/NovelStatusContext';
import { NovelProvider } from './context/NovelContext';
import { ThemeProvider } from './context/ThemeContext';
import { FullscreenProvider } from './context/FullscreenContext';
import { SEOProvider } from './context/SEOContext';
import { initGA, trackPageView } from './utils/analytics';
import Navbar from './components/Navbar';
import SecondaryNavbar from './components/SecondaryNavbar';
import AnnouncementStrip from './components/AnnouncementStrip';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import StructuredData from './components/StructuredData';
import AppRoutes from './routes/AppRoutes';
import './styles/shared/App.css';

// Route tracking component
const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);

  return null;
};

const App = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Replace 'G-XXXXXXXXXX' with your actual GA4 measurement ID
    initGA('G-4L5EBS6ZQT');
  }, []);

  // Check if we're on a chapter page to hide navigation elements for clean reading experience
  const isChapterPage = location.pathname.includes('/truyen/') && location.pathname.includes('/chuong/');

  return (
    <HelmetProvider>
      <ThemeProvider>
        <FullscreenProvider>
          <SEOProvider>
            <AuthProvider>
              <NovelProvider>
                <NovelStatusProvider>
                  <BookmarkProvider>
                <div className="app">
                  <StructuredData type="website" />
                  <div 
                    className="background-container"
                    style={{
                      backgroundImage: `var(--app-background)`
                    }}
                  />
                  <Navbar />
                  <SecondaryNavbar />
                  <AnnouncementStrip />
                  <main className={`main-content ${isChapterPage ? 'chapter-page' : ''}`}>
                    <RouteTracker />
                    <AppRoutes />
                  </main>
                  {!isChapterPage && <Footer />}
                  {/* Global ScrollToTop button - hidden on chapter pages for clean reading experience */}
                  {!isChapterPage && <ScrollToTop threshold={300} />}
                </div>
                  </BookmarkProvider>
                </NovelStatusProvider>
              </NovelProvider>
            </AuthProvider>
          </SEOProvider>
        </FullscreenProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
};

export default App;
