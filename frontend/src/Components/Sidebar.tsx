import React from "react";
import { SideBarData } from "./SidebarData";
import "./Sidebar.css";
import { useNavigate, useLocation } from "react-router-dom";

const SideBar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    return <div className="Sidebar">
            <ul className="List">
                {SideBarData.map((val, key) => {
                  const IconComponent = val.icon as React.ComponentType;
                  const isActive = location.pathname === val.link;
                  return <li 
                    key={key} 
                    onClick={() => navigate(val.link)} 
                    className={`row ${isActive ? 'active' : ''}`}
                  >
                    <div id="icon"> 
                      {React.createElement(IconComponent)} 
                    </div> 
                    <div id="title"> 
                      {val.title} 
                    </div>
                  </li>;
                })}
            </ul>
           </div>;
}

export default SideBar;

