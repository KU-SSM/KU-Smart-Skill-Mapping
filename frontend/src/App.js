import logo from './logo.svg';
import './App.css';
import SideBar from './Components/Sidebar';
import { Route, Routes } from 'react-router-dom';

function App() {
  return (
    <div className="App">
        <SideBar/>
    </div>
  );
}

function Content () {
  return (
    <div>
      <Routes>
        <Route path="/"></Route>
        <Route path="/courses_and_skills"></Route>
        <Route path="/jobs_and_skills"></Route>
        <Route path="/recommend_course"></Route>
        <Route path="/export_chart"></Route>
        <Route path="/profile"></Route>
        <Route path="/skill_map"></Route>
      </Routes>
    </div>
  )
}

export default App;
