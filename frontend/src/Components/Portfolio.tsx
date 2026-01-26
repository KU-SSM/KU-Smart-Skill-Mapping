import React, { useRef, useState } from 'react';
import './Portfolio.css';
import { FaBriefcase } from 'react-icons/fa';

const Portfolio: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(fileArray);
      console.log('Selected files:', fileArray);
    }
  };

  return (
    <div className="portfolio-wrapper">
      <div className="portfolio-container">
        <h1 className="portfolio-title">Portfolio</h1>
        <div className="portfolio-upload-area">
          <div className="portfolio-item-icon">
            {React.createElement(FaBriefcase as React.ComponentType)}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept=".jpg,.jpeg"
          />
          <button 
            className="upload-portfolio-button"
            onClick={handleUploadClick}
          >
            Upload Portfolio
          </button>
          {selectedFiles.length > 0 && (
            <div className="selected-files">
              <p className="files-count">{selectedFiles.length} file(s) selected</p>
              <ul className="files-list">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="file-item">
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button className="apply-button">
          Apply
        </button>
      </div>
    </div>
  );
};

export default Portfolio;
