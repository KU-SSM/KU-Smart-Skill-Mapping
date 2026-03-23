import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from "react-router-dom";
import { AppRoleProvider } from './context/AppRoleContext';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoleProvider>
        <App />
      </AppRoleProvider>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();

