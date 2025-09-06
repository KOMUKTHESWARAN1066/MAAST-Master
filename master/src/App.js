import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import LoginPage from './pages/LoginPage';
import AddUsers  from './components/AddUsers';
import HomePage from './pages/HomePage';
import StageMaster from './components/StageMaster';
import SkillMaster from './components/SkillMaster';
import UserSkills from './components/UserSkills';
import UserShiftUpload from './components/UserShiftUpload';
import UserShiftReport from './components/UserShiftReport';
import Attendance from './components/Attendance';
import UserSkillsUpload from './components/UserSkillsUpload';
import Summary from './components/Summary';
import ImageUpload from './components/ImageUpload';
import EmployeeHistory from './components/EmployeeHistory';
import NPunchReport from './components/NPunchReport';
import EmployeePunctuality from './components/EmployeePunctuality';
import EmployeeJobCardUpload from './components/EmployeeJobCardUpload';
import EmployeeJobCardDownload from './components/EmployeeJobCardDownload';


const darkDrawerTheme = createTheme({
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#333',
          color: '#fff',
        },
      },
    },
  },
});

const ProtectedRoute = ({ element }) => {
  const isAuthenticated = !!sessionStorage.getItem('authToken');
  return isAuthenticated ? element : <Navigate to="/login" />;
};

const AppContent = () => {
  const location = useLocation();
  const isAuthenticated = !!sessionStorage.getItem('authToken');
  const showNavbar = !(location.pathname === "/login" || location.pathname === "/home");

  return (
    <div>
      {showNavbar && isAuthenticated && <HomePage />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<ProtectedRoute element={<HomePage />} />} />
        <Route path="/stage-master" element={<ProtectedRoute element={<StageMaster />} />} />
        <Route path="/skill-master" element={<ProtectedRoute element={<SkillMaster />} />} />
        <Route path="/user-skills" element={<ProtectedRoute element={<UserSkills />} />} />
        <Route path="/User-Master" element={<ProtectedRoute element={<AddUsers />} />} />
        <Route path="/user-skills-upload" element={<ProtectedRoute element={<UserSkillsUpload />} />} />
        <Route path="/user-shift-upload" element={<ProtectedRoute element={<UserShiftUpload />} />} />
        <Route path="/user-shift-report" element={<ProtectedRoute element={<UserShiftReport />} />} />
        <Route path="/summary" element={<ProtectedRoute element={<Summary />} />} />
        <Route path="/attendance" element={<ProtectedRoute element={<Attendance />} />} />
        <Route path="/attendance" element={<ProtectedRoute element={<Attendance />} />} />
        <Route path="/attendance" element={<ProtectedRoute element={<Attendance />} />} />
        <Route path="/summary" element={<ProtectedRoute element={<Summary />} />}/>
        <Route path="/" element={<Navigate to="/login" />} />        
        <Route path="/image-upload" element={<ImageUpload />} />
        <Route path="/employee-history" element={<ProtectedRoute element={<EmployeeHistory />} />} />            
        <Route path="/employee-jobcardupload" element={<ProtectedRoute element={<EmployeeJobCardUpload/>} />} />    
        <Route path="/employee-jobcarddownload" element={<ProtectedRoute element={<EmployeeJobCardDownload />} />} />        
        <Route path="/NPunchReport" element={<ProtectedRoute element={<NPunchReport />} />} />
        <Route path="/employee-Punctuality" element={<ProtectedRoute element={< EmployeePunctuality/>} />} />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider theme={darkDrawerTheme}>
      <CssBaseline />
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
};

export default App;