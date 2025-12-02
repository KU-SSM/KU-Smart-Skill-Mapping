import React from "react";
import { SideBarData } from "./SidebarData";

const SideBar: React.FC = () => {
    return <div className="Sidebar">
            <ul className="List">
                {SideBarData.map((val, key) => {
                  const IconComponent = val.icon as React.ComponentType;
                  return <li key={key} onClick={() => {window.location.pathname = val.link}} className="row">
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

