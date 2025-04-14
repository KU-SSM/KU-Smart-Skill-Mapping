import React from "react";
import { SideBarData } from "./SidebarData";

function SideBar () {
    return <div className="Sidebar">
            <ul className="List">
                {SideBarData.map((val, key) => {
                  return <li key={key} className="row">
                     <div id="icon"> 
                        {val.icon} 
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