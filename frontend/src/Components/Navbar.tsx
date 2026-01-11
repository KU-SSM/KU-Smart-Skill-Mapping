import React from 'react';
import './Navbar.css';

const Navbar: React.FC = () => {
  return (
    <nav className="Navbar">
      <div className="Navbar-content">
        <div className="Navbar-logo">
          <span>KU Smart Skill Mapping</span>
        </div>
        <div className="Navbar-auth">
          <button className="Navbar-button Navbar-button-login">Log In</button>
          <button className="Navbar-button Navbar-button-signup">Sign Up</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
