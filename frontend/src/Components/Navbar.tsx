import React from 'react';
import './Navbar.css';
import { useNavigate } from 'react-router-dom';
import { useAppRole } from '../context/AppRoleContext';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { role, setRole } = useAppRole();

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
        <div className="Navbar-right">
          <div
            className="Navbar-role-switch"
            role="group"
            aria-label="Feature flag: act as student or teacher until login exists"
            title="Until login/sign-up, pick which menus and evaluation columns you see"
          >
            <span className="Navbar-role-label">View as</span>
            <button
              type="button"
              className={`Navbar-role-pill ${role === 'student' ? 'Navbar-role-pill--active' : ''}`}
              onClick={() => setRole('student')}
            >
              Student
            </button>
            <button
              type="button"
              className={`Navbar-role-pill ${role === 'teacher' ? 'Navbar-role-pill--active' : ''}`}
              onClick={() => setRole('teacher')}
            >
              Teacher
            </button>
          </div>
          <div className="Navbar-auth">
            <button className="Navbar-button Navbar-button-login" onClick={handleLoginClick}>Log In</button>
            <button className="Navbar-button Navbar-button-signup" onClick={handleSignUpClick}>Sign Up</button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
