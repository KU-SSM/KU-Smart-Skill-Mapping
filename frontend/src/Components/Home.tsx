import React from 'react';
import './Home.css';
import './InstructionHelpBubble.css';
import { useAppRole } from '../context/AppRoleContext';
import { useNavigate } from 'react-router-dom';

type HomeStep = {
  icon?: JSX.Element;
  title: string;
  text: string;
  path: string;
};

const Home: React.FC = () => {
  const { isStudent } = useAppRole();
  const navigate = useNavigate();

  const studentSteps: HomeStep[] = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 20V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      title: 'View Rubric Score',
      text: 'View rubric scores for different careers, their criteria and date time of updates.',
      path: '/rubric_score_student',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="5" y="8" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M12 4v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9.5" cy="13" r="1" fill="currentColor" />
          <circle cx="14.5" cy="13" r="1" fill="currentColor" />
          <path d="M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      title: 'Perform Evaluation by AI',
      text: 'Upload your portfolio and run AI evaluation to generate draft scores.',
      path: '/profile2',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" stroke="currentColor" strokeWidth="2" />
          <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      title: 'View Skill Map',
      text: 'Check your skill map to understand strengths and progress across skill areas.',
      path: '/skill_map',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M2 9l10-4 10 4-10 4L2 9z" stroke="currentColor" strokeWidth="2" />
          <path d="M6 11v4c0 1 3 3 6 3s6-2 6-3v-4" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      title: 'Export Certificate',
      text: 'Choose the approved evaluation results to make a certificate to export.',
      path: '/certificate',
    },
  ];

  const teacherSteps: HomeStep[] = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 5h16v14H4z" stroke="currentColor" strokeWidth="2" />
          <path d="M8 9h8M8 13h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      title: 'Create Rubric Score',
      text: 'Create, update or rename your rubric scores criteria.',
      path: '/rubric_score',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 7h16v12H4z" stroke="currentColor" strokeWidth="2" />
          <path d="M7 4h10v3H7z" stroke="currentColor" strokeWidth="2" />
          <path d="M8 12h8M8 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M17 17l2 2M16 18l3-3"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      ),
      title: 'View Request & Perform Evaluation',
      text: 'See every student request, then review portfolios and enter teacher scores.',
      path: '/profile3',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" stroke="currentColor" strokeWidth="2" />
          <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      title: 'View Skill Map',
      text: 'Inspect skill maps for any student by choosing their evaluation.',
      path: '/skill_map',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M2 9l10-4 10 4-10 4L2 9z" stroke="currentColor" strokeWidth="2" />
          <path d="M6 11v4c0 1 3 3 6 3s6-2 6-3v-4" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      title: 'Export Certificate',
      text: 'Choose the approved evaluation results to make a certificate to export.',
      path: '/certificate',
    },
  ];

  const steps = isStudent ? studentSteps : teacherSteps;

  return (
    <div className="home-wrapper">
      <div className="home-container">
        <div className="home-instruction-section">
            <h2 className="home-instruction-heading">How to Use This Application</h2>
          <div
            key={isStudent ? 'student-home-grid' : 'teacher-home-grid'}
            className={`home-instruction-grid ${!isStudent ? 'home-instruction-grid--teacher' : ''}`}
          >
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="home-instruction-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(step.path)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(step.path);
                  }
                }}
              >
                {step.icon && (
                  <div className="home-instruction-icon" aria-hidden>
                    {step.icon}
                  </div>
                )}
                <h3 className="home-instruction-title">{step.title}</h3>
                <p className="home-instruction-text">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
