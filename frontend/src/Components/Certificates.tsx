import React from 'react';
import { Link } from 'react-router-dom';
import './Certificates.css';

const Certificates: React.FC = () => {
  const certificates = [
    { id: 1, title: 'Web Development Certificate' },
    { id: 2, title: 'Data Science Certificate' },
    { id: 3, title: 'Machine Learning Certificate' },
    { id: 4, title: 'Cloud Computing Certificate' },
    { id: 5, title: 'Cybersecurity Certificate' },
    { id: 6, title: 'Database Management Certificate' },
    { id: 7, title: 'Software Engineering Certificate' },
  ]; 

  return (
    <div className="certificates-wrapper">
      <div className="certificates-container">
        <div className="certificates-header">
          <h1>Certificates</h1>
          <input 
            type="text" 
            placeholder="Search certificates..." 
            className="certificates-search"
          />
        </div>
        <h2 className="certificates-subheader">All of your achievements is here!</h2>
        <div className="certificates-grid">
          {certificates.map((certificate) => (
            <Link 
              key={certificate.id} 
              to={`/certificates/${certificate.id}`}
              className="certificate-item-link"
            >
              <div className="certificate-item">
                <img 
                  src="/certificate.png" 
                  alt={certificate.title}
                  className="certificate-image"
                />
                <h3 className="certificate-title">{certificate.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Certificates;
