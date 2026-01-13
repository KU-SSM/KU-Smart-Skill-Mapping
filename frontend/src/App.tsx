import './App.css';
import SideBar from './Components/Sidebar';
import Navbar from './Components/Navbar';
import { Routes, Route } from 'react-router-dom';
import Home from './Components/Home';
import Certificates from './Components/Certificates';
import CertificateDetail from './Components/CertificateDetail';
import SkillMap from './Components/SkillMap';
import Portfolio from './Components/Portfolio';

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
              <Route path="/skill_map" element={<SkillMap />} />
              <Route path="/portfolio" element={<Portfolio />} />
            </Routes>
          </main>
        </div>
    </div>
  );
}

export default App;

