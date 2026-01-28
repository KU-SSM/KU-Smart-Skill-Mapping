import React from 'react';
import './Home.css';

const Home: React.FC = () => {
  return (
    <div className="home-wrapper">
      <div className="home-container">
        <div className="home-image-section">
          <img 
            src="/homepage.png" 
            alt="KU Smart Skill Mapping" 
            className="home-image"
          />
        </div>
        <div className="home-greeting-section">
          <h1 className="greeting-title">Welcome to KU Smart Skill Mapping</h1>
          <p className="greeting-message">
            Discover your skills, explore career paths, and map your professional journey with our intelligent skill mapping platform.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
