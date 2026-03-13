import './App.css';
import SideBar from './Components/Sidebar';
import Navbar from './Components/Navbar';
import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './Components/Home';
import CertificateDetail from './Components/CertificateDetail';
import SkillMap from './Components/SkillMap';
import Portfolio from './Components/Portfolio';
import RubricScoreList from './Components/RubricScoreList';
import RubricScoreDetail from './Components/RubricScoreDetail';
import RubricScoreListStudent from './Components/RubricScoreListStudent';
import RubricScoreDetailStudent from './Components/RubricScoreDetailStudent';
import Login from './Components/Login';
import SignUp from './Components/SignUp';
import Profile from './Components/Profile';
import Profile2 from './Components/Profile2';
import Profile3 from './Components/Profile3';
import Profile3Detail from './Components/Profile3Detail';

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
              <Route path="/rubric_score" element={<RubricScoreList />} />
              <Route path="/rubric_score/:id" element={<RubricScoreDetail />} />
              <Route path="/rubric_score_student" element={<RubricScoreListStudent />} />
              <Route path="/rubric_score_student/:id" element={<RubricScoreDetailStudent />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile2" element={<Profile2 />} />
              <Route path="/profile3" element={<Profile3 />} />
              <Route path="/profile3/:requestId" element={<Profile3Detail />} />
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

