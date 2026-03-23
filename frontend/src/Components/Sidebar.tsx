import React, { useMemo } from "react";
import { SideBarData } from "./SidebarData";
import "./Sidebar.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppRole } from "../context/AppRoleContext";

const SideBar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { role } = useAppRole();

    const visibleItems = useMemo(
        () =>
            SideBarData.filter((item) => {
                const a = item.audience ?? "all";
                if (a === "none") return false;
                if (a === "all") return true;
                return a === role;
            }),
        [role]
    );
    
    return <div className="Sidebar">
            <ul className="List">
                {visibleItems.map((val, key) => {
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

