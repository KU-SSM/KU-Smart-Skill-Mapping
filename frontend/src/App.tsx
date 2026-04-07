import './App.css';
import SideBar from './Components/Sidebar';
import Navbar from './Components/Navbar';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Home from './Components/Home';
import CertificateDetail from './Components/CertificateDetail';
import CertificateList from './Components/CertificateList';
import SkillMap from './Components/SkillMap';
import RubricScoreList from './Components/RubricScoreList';
import RubricScoreDetail from './Components/RubricScoreDetail';
import RubricScoreListStudent from './Components/RubricScoreListStudent';
import RubricScoreDetailStudent from './Components/RubricScoreDetailStudent';
import Login from './Components/Login';
import SignUp from './Components/SignUp';
import Profile from './Components/Profile';
import Profile2 from './Components/Profile2';
import Profile2List from './Components/Profile2List';
import Profile3 from './Components/Profile3';
import Profile3Detail from './Components/Profile3Detail';
import RubricVersionEvaluationDetail from './Components/RubricVersionEvaluationDetail';
import { getMockSession } from './utils/mockAuth';

const App: React.FC = () => {
  const location = useLocation();
  const session = getMockSession();
  const isAuthenticated = session != null;
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="App">
      {!isAuthPage && isAuthenticated && <Navbar />}
      {!isAuthPage && isAuthenticated ? (
        <div className="App-body">
          <SideBar/>
          <main className="App-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/certificate" element={<CertificateList />} />
              <Route path="/certificate/:evaluationId" element={<CertificateDetail />} />
              <Route path="/skill_map" element={<SkillMap />} />
              <Route path="/rubric_score" element={<RubricScoreList />} />
              <Route path="/rubric_score/:id" element={<RubricScoreDetail />} />
              <Route path="/rubric_score_student" element={<RubricScoreListStudent />} />
              <Route path="/rubric_score_student/:id" element={<RubricScoreDetailStudent />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile2" element={<Profile2List />} />
              <Route path="/profile2/:evaluationId" element={<Profile2 />} />
              <Route path="/profile3" element={<Profile3 />} />
              <Route path="/profile3/:requestId" element={<Profile3Detail />} />
              <Route path="/rubric_version_detail" element={<RubricVersionEvaluationDetail />} />
              <Route path="/courses_and_skills" element={<Navigate to="/" replace />} />
              <Route path="/jobs_and_skills" element={<Navigate to="/" replace />} />
              <Route path="/recommend_course" element={<Navigate to="/" replace />} />
              <Route path="/export_chart" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      ) : !isAuthPage ? (
        <Navigate to="/login" replace />
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

