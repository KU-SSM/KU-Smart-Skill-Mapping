import React from 'react';
import './Home.css';
import { useAppRole } from '../context/AppRoleContext';
import { useNavigate } from 'react-router-dom';
import { FaFileUpload, FaCheckCircle } from 'react-icons/fa';
import { AiOutlineRobot, AiOutlineSend } from 'react-icons/ai';
import { FiFolder, FiBookOpen } from 'react-icons/fi';

const Home: React.FC = () => {
  const { isStudent } = useAppRole();
  const navigate = useNavigate();

  const studentSteps = [
    { icon: FaFileUpload, title: 'Upload Portfolio', text: 'Go to Evaluation and upload your PDF portfolio file.' },
    { icon: FiBookOpen, title: 'Choose Rubric', text: 'Select and confirm rubric before entering scores.' },
    { icon: AiOutlineRobot, title: 'Run AI + Save', text: 'Evaluate with AI, review result, then save evaluation.' },
    { icon: AiOutlineSend, title: 'Request Teacher', text: 'Send evaluation to teacher when your data is ready.' },
  ];

  const teacherSteps = [
    { icon: FiFolder, title: 'Open Requests', text: 'Go to Evaluation and open pending/completed requests.' },
    { icon: FiBookOpen, title: 'Review Evidence', text: 'Check student portfolio and rubric criteria first.' },
    { icon: FaCheckCircle, title: 'Fill Scores', text: 'Give teacher scores for each required skill.' },
    { icon: AiOutlineSend, title: 'Submit Result', text: 'Submit to mark evaluation as completed.' },
  ];

  const steps = isStudent ? studentSteps : teacherSteps;

  return (
    <div className="home-wrapper">
      <div className="home-container">
        <div className="home-top-row">
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
        <div className="home-instruction-section">
            <h2 className="home-instruction-heading">How to Use This Application</h2>
          <div className="home-instruction-grid">
            {steps.map((step) => (
              <article
                key={step.title}
                className={`home-instruction-card ${
                  step.title === 'Upload Portfolio' ? 'home-instruction-card--with-action' : ''
                }`}
              >
                  <div className="home-instruction-icon" aria-hidden>
                    {React.createElement(step.icon as React.ComponentType)}
                </div>
                <h3 className="home-instruction-title">{step.title}</h3>
                <p className="home-instruction-text">{step.text}</p>
                  {step.title === 'Upload Portfolio' && (
                    <button
                      type="button"
                      className="home-start-now-button"
                      onClick={() => navigate('/profile2')}
                    >
                      Start Now
                    </button>
                  )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
