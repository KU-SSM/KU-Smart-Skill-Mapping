import React from "react";
import { SideBarData } from "./SidebarData";
import "./Sidebar.css";
import { useNavigate } from "react-router-dom";

const SideBar: React.FC = () => {
    const navigate = useNavigate();
    
    return <div className="Sidebar">
            <ul className="List">
                {SideBarData.map((val, key) => {
                  const IconComponent = val.icon as React.ComponentType;
                  return <li key={key} onClick={() => navigate(val.link)} className="row">
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

