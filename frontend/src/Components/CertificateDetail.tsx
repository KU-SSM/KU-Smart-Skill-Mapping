import React from 'react';
import './CertificateDetail.css';

const CertificateDetail: React.FC = () => {
  const certificate = {
    id: '1',
    title: 'Certificate',
    description: 'Recognizes your achievement and skills.'
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/certificate.png');
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `${certificate.title.replace(/\s+/g, '_')}_Certificate.png`;
      
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

  return (
    <div className="certificate-detail-wrapper">
      <div className="certificate-section">
        <div className="certificate-detail-image">
          <img 
            src="/certificate.png" 
            alt={certificate.title}
            className="certificate-detail-img"
          />
        </div>
      </div>
      <div className="message-section">
        <div className="certificate-detail-info">
          <h1>{certificate.title}</h1>
          <p className="certificate-description">{certificate.description}</p>
          <div className="certificate-details">
            <div className="detail-item">
              <strong>Issued Date:</strong> January 2024
            </div>
            <div className="detail-item">
              <strong>Status:</strong> Verified
            </div>
          </div>
        </div>
        <div className="certificate-detail-buttons">
          <button onClick={handleExport} className="export-button">
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificateDetail;
