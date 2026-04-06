import React from 'react';
import './Navbar.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppRole } from '../context/AppRoleContext';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, setRole } = useAppRole();

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleSignUpClick = () => {
    navigate('/signup');
  };

  const handleRoleSwitch = (nextRole: 'student' | 'teacher') => {
    if (nextRole === role) return;
    setRole(nextRole);

    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);

    if (segments[0] === 'profile2' && nextRole === 'teacher') {
      navigate(segments[1] && segments[1] !== 'new' ? `/profile3/${segments[1]}` : '/profile3');
      return;
    }
    if (segments[0] === 'profile3' && nextRole === 'student') {
      navigate(segments[1] ? `/profile2/${segments[1]}` : '/profile2');
      return;
    }
    if (segments[0] === 'rubric_score_student' && nextRole === 'teacher') {
      navigate(segments[1] ? `/rubric_score/${segments[1]}` : '/rubric_score');
      return;
    }
    if (segments[0] === 'rubric_score' && nextRole === 'student') {
      navigate(segments[1] ? `/rubric_score_student/${segments[1]}` : '/rubric_score_student');
    }
  };

  return (
    <nav className="Navbar">
      <div className="Navbar-content">
        <div className="Navbar-logo">
          <img
            src={`${process.env.PUBLIC_URL}/ku-logo.png`}
            alt="Kasetsart University"
            className="Navbar-logo-image"
          />
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
              onClick={() => handleRoleSwitch('student')}
            >
              Student
            </button>
            <button
              type="button"
              className={`Navbar-role-pill ${role === 'teacher' ? 'Navbar-role-pill--active' : ''}`}
              onClick={() => handleRoleSwitch('teacher')}
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
