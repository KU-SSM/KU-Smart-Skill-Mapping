import './App.css';
import SideBar from './Components/Sidebar';
import Navbar from './Components/Navbar';
import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './Components/Home';
import CertificateDetail from './Components/CertificateDetail';
import SkillMap from './Components/SkillMap';
import Portfolio from './Components/Portfolio';
import RubricScore from './Components/RubricScore';
import Login from './Components/Login';
import SignUp from './Components/SignUp';
import Profile from './Components/Profile';

const App: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="App">
      {!isAuthPage && <Navbar />}
      {!isAuthPage ? (
        <div className="App-body">
          <SideBar/>
          <main className="App-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/certificate" element={<CertificateDetail />} />
              <Route path="/skill_map" element={<SkillMap />} />
              <Route path="/rubric_score" element={<RubricScore />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </main>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      )}
    </div>
  );
}

export default App;

