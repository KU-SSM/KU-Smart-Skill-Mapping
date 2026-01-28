import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import './SkillMap.css';

const PolarAngleAxisComponent = PolarAngleAxis as any;
const PolarRadiusAxisComponent = PolarRadiusAxis as any;

const SkillMap: React.FC = () => {
  const [data] = useState([
    { skill: 'Skill 1', user: 18, senior: 20 },
    { skill: 'Skill 2', user: 15, senior: 18 },
    { skill: 'Skill 3', user: 12, senior: 16 },
    { skill: 'Skill 4', user: 16, senior: 19 },
    { skill: 'Skill 5', user: 14, senior: 17 },
    { skill: 'Skill 6', user: 17, senior: 20 },
  ]);

  const selectedJob = 'Backend Developer';

  return (
    <div className="skill-map-wrapper">
      <div className="skill-map-container">
        <div className="skill-map-chart-container">
          <h1 className="skill-map-title">Skill Map</h1>
          <div className="radar-chart-wrapper">
            <ResponsiveContainer width="100%" height={500}>
              <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid stroke="#ccc" />
                <PolarAngleAxisComponent 
                  dataKey="skill" 
                  tick={{ fill: '#333', fontSize: 12 }}
                  tickLine={{ stroke: '#ccc' }}
                />
                <PolarRadiusAxisComponent 
                  angle={90} 
                  domain={[0, 20]} 
                  tick={{ fill: '#666', fontSize: 10 }}
                  tickCount={6}
                />
                <Radar
                  name="User's #1 Skills"
                  dataKey="user"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
                <Radar
                  name="Senior's Skills"
                  dataKey="senior"
                  stroke="#ec4899"
                  fill="#ec4899"
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="skill-map-sidebar">
          <div className="job-selector-box">
            <div className="label-bar">
              <span className="label-text">Select Job</span>
            </div>
            <div className="label-bar-container">
              <div className="job-label-bar">
                <span className="job-display">{selectedJob}</span>
              </div>
              <button className="change-button">Change</button>
            </div>
          </div>
          <div className="compare-section-box">
            <div className="label-bar">
              <span className="label-text">Compare Skills</span>
            </div>
            <div className="compare-buttons">
              <div className="label-bar-container">
                <div className="compare-button">
                  <span>User's #1</span>
                </div>
                <button className="change-button">Change</button>
              </div>
              <div className="label-bar-container">
                <div className="compare-button">
                  <span>Senior's</span>
                </div>
                <button className="change-button">Change</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillMap;
