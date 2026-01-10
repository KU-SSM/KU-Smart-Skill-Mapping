import './App.css';
import SideBar from './Components/Sidebar';
import Navbar from './Components/Navbar';

const App: React.FC = () => {
  return (
    <div className="App">
        <Navbar />
        <SideBar/>
    </div>
  );
}

export default App;

