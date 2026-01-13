import React from 'react';
import './Portfolio.css';
import { FaBriefcase } from 'react-icons/fa';

const Portfolio: React.FC = () => {
  return (
    <div className="portfolio-wrapper">
      <div className="portfolio-container">
        <h1 className="portfolio-title">Portfolio</h1>
        <div className="portfolio-upload-area">
          <div className="portfolio-item-icon">
            {React.createElement(FaBriefcase as React.ComponentType)}
          </div>
          <button className="upload-portfolio-button">
            Upload Portfolio
          </button>
        </div>
        <button className="apply-button">
          Apply
        </button>
      </div>
    </div>
  );
};

export default Portfolio;
