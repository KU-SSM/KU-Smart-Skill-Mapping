import React, { useState } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import { useAppRole } from '../context/AppRoleContext';
import { setCurrentUserId } from '../utils/currentUser';
import { authenticateMockUser, setMockSession } from '../utils/mockAuth';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { setRole } = useAppRole();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const session = authenticateMockUser(username, password);
    if (!session) {
      alert('Invalid username or password');
      return;
    }

    setMockSession(session);
    setRole(session.role);
    setCurrentUserId(session.userId);
    navigate('/');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="auth-logo">
          <img
            src={`${process.env.PUBLIC_URL}/ku-logo.png`}
            alt="Kasetsart University"
            className="auth-logo-image"
          />
          <span>KU Smart Skill Mapping</span>
        </div>
        <h1 className="auth-title">Log In</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              type="text"
              id="username"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="auth-button">
            Log In
          </button>
          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <a href="/signup" className="auth-link">Sign Up</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
