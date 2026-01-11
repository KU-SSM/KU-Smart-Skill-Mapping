import './App.css';
import SideBar from './Components/Sidebar';
import Navbar from './Components/Navbar';
import { Routes, Route } from 'react-router-dom';
import Home from './Components/Home';
import Certificates from './Components/Certificates';
import CertificateDetail from './Components/CertificateDetail';

const App: React.FC = () => {
  return (
    <div className="App">
        <Navbar />
        <div className="App-body">
          <SideBar/>
          <main className="App-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/certificates/:id" element={<CertificateDetail />} />
            </Routes>
          </main>
        </div>
    </div>
  );
}

export default App;

