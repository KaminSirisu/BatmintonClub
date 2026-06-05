import LogIn from './pages/LogIn'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PrivateRoutes from './utils/PrivateRoutes';
import { AuthProvider } from './utils/AuthContext';
import SignUp from './pages/SignUp'
import Home from './pages/Home';
import Setting from './pages/Setting';
import { Toaster } from 'react-hot-toast';
import './App.css';
import CourtPlayer from './pages/CourtPlayer';
import Summary from './pages/Summary';
import Dashboard from './pages/Dashboard';
import MatchHistory from './pages/MatchHistory';
import LiffCheckIn from './pages/LiffCheckIn';
import { LanguageProvider } from './utils/LanguageProvider';


const App = () => {
  return (
    <LanguageProvider>
      <Router>
        <AuthProvider>
          <Toaster position="top-center" />
          <Routes>
            <Route path="/sign-in" element={<LogIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/liff/checkin" element={<LiffCheckIn />} />

            {/* Public LINE link */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/:id" element={<Dashboard />} />

            {/* User:true then can access Home page */}
            <Route element={<PrivateRoutes />}>
              <Route path="/" element={<Home />} />
              <Route path="/setting" element={<Setting />} />
              <Route path="/matchmaking/:id" element={<CourtPlayer />} />
              <Route path="/history/:id" element={<MatchHistory />} />
              <Route path="/summary/:id" element={<Summary />} />
            </Route>
          
          </Routes>
        </AuthProvider>
        
      </Router>
    </LanguageProvider>
    
    

  )
}

export default App
