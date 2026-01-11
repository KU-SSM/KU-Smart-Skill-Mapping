import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './CertificateDetail.css';

const CertificateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const certificates: { [key: string]: { title: string; description: string } } = {
    '1': { title: 'Web Development Certificate', description: 'This certificate demonstrates proficiency in web development technologies and frameworks.' },
    '2': { title: 'Data Science Certificate', description: 'This certificate demonstrates proficiency in data science methodologies and tools.' },
    '3': { title: 'Machine Learning Certificate', description: 'This certificate demonstrates proficiency in machine learning algorithms and applications.' },
    '4': { title: 'Cloud Computing Certificate', description: 'This certificate demonstrates proficiency in cloud computing platforms and services.' },
    '5': { title: 'Cybersecurity Certificate', description: 'This certificate demonstrates proficiency in cybersecurity principles and practices.' },
    '6': { title: 'Database Management Certificate', description: 'This certificate demonstrates proficiency in database design and management.' },
    '7': { title: 'Software Engineering Certificate', description: 'This certificate demonstrates proficiency in software engineering practices and methodologies.' },
  };

  const certificate = id ? certificates[id] : null;

  const handleExport = async () => {
    try {
      const response = await fetch('/certificate.png');
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      
      const filename = certificate 
        ? `${certificate.title.replace(/\s+/g, '_')}_Certificate.png`
        : `certificate_${id}.png`;
      
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Failed to download certificate.');
    }
  };

  if (!certificate) {
    return (
      <div className="certificate-detail-wrapper">
        <div className="certificate-detail-container">
          <h1>Certificate not found</h1>
          <div className="certificate-detail-buttons">
            <button onClick={() => navigate('/certificates')} className="back-button">
              Back to Certificates
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="certificate-detail-wrapper">
      <div className="certificate-detail-container">
        <div className="certificate-detail-content">
          <div className="certificate-detail-image">
            <img 
              src="/certificate.png" 
              alt={certificate.title}
              className="certificate-detail-img"
            />
          </div>
          <div className="certificate-detail-info">
            <h1>{certificate.title}</h1>
            <p className="certificate-description">{certificate.description}</p>
            <div className="certificate-details">
              <div className="detail-item">
                <strong>Certificate ID:</strong> {id}
              </div>
              <div className="detail-item">
                <strong>Issued Date:</strong> January 2024
              </div>
              <div className="detail-item">
                <strong>Status:</strong> Verified
              </div>
            </div>
          </div>
        </div>
        <div className="certificate-detail-buttons">
          <button onClick={handleExport} className="export-button">
            Export
          </button>
          <button onClick={() => navigate('/certificates')} className="back-button">
            ← Back to Certificates
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificateDetail;
