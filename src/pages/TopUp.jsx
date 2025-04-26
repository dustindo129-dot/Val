import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/TopUp.css';

/**
 * TopUp Page Component
 * 
 * Page for users to top-up their account balance
 * 
 * @returns {JSX.Element} TopUp page component
 */
const TopUp = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Placeholder - Will be implemented later
  return (
    <div className="top-up-container">
      <h1>Top-up Your Account</h1>
      <div className="top-up-content">
        <section className="top-up-section">
          <h2>Coming Soon</h2>
          <p>The top-up functionality for users will be implemented soon. Please check back later.</p>
        </section>
      </div>
    </div>
  );
};

export default TopUp; 