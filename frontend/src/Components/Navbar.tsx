import React from 'react';
import './Navbar.css';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleSignUpClick = () => {
    navigate('/signup');
  };

  return (
    <nav className="Navbar">
      <div className="Navbar-content">
        <div className="Navbar-logo">
          <span>KU Smart Skill Mapping</span>
        </div>
        <div className="Navbar-auth">
          <button className="Navbar-button Navbar-button-login" onClick={handleLoginClick}>Log In</button>
          <button className="Navbar-button Navbar-button-signup" onClick={handleSignUpClick}>Sign Up</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
