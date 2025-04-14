import React, { useEffect } from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BookmarkProvider } from './context/BookmarkContext';
import { NovelStatusProvider } from './context/NovelStatusContext';
import { NovelProvider } from './context/NovelContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initGA, trackPageView } from './utils/analytics';
import Navbar from './components/Navbar';
import SecondaryNavbar from './components/SecondaryNavbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import AppRoutes from './routes/AppRoutes';
import './styles/shared/App.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      cacheTime: 1000 * 60 * 30, // Cache is kept for 30 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Only retry failed requests once
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <NovelProvider>
            <NovelStatusProvider>
              <BookmarkProvider>
                <div className="app">
                  <div 
                    className="background-container"
                    style={{
                      backgroundImage: `url('https://res.cloudinary.com/dvoytcc6b/image/upload/v1743985759/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif')` // Replace this with your actual image URL when you have it
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
      </Router>
    </QueryClientProvider>
  );
};

export default App;
