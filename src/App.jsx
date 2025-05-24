import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { BookmarkProvider } from './context/BookmarkContext';
import { NovelStatusProvider } from './context/NovelStatusContext';
import { NovelProvider } from './context/NovelContext';
import { initGA, trackPageView } from './utils/analytics';
import Navbar from './components/Navbar';
import SecondaryNavbar from './components/SecondaryNavbar';
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
  useEffect(() => {
    // Replace 'G-XXXXXXXXXX' with your actual GA4 measurement ID
    initGA('G-4L5EBS6ZQT');
  }, []);

  return (
    <HelmetProvider>
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
                <main className="main-content">
                  <RouteTracker />
                  <AppRoutes />
                </main>
                <Footer />
                {/* Global ScrollToTop button that appears on all pages */}
                <ScrollToTop threshold={300} />
              </div>
            </BookmarkProvider>
          </NovelStatusProvider>
        </NovelProvider>
      </AuthProvider>
    </HelmetProvider>
  );
};

export default App;
