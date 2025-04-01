import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BookmarkProvider } from './context/BookmarkContext';
import { NovelStatusProvider } from './context/NovelStatusContext';
import { NovelProvider } from './context/NovelContext';
import Navbar from './components/Navbar';
import SecondaryNavbar from './components/SecondaryNavbar';
import Footer from './components/Footer';
import AppRoutes from './routes/AppRoutes';
import './styles/shared/App.css';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <NovelProvider>
          <NovelStatusProvider>
            <BookmarkProvider>
              <div className="app">
                <div 
                  className="background-container"
                  style={{
                    backgroundImage: `url('https://res.cloudinary.com/dvoytcc6b/image/upload/v1743447317/482259247_634103582665702_1134185038594170678_n_d1ip2v.jpg')` // Replace this with your actual image URL when you have it
                  }}
                />
                <Navbar />
                <SecondaryNavbar />
                <main className="main-content">
                  <AppRoutes />
                </main>
                <Footer />
              </div>
            </BookmarkProvider>
          </NovelStatusProvider>
        </NovelProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
