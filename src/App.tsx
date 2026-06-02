import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import StudentLoginPage from './pages/StudentLoginPage';
import QuizInstructionsPage from './pages/QuizInstructionsPage';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import CheckCertificatePage from './pages/CheckCertificatePage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import RegistrationPage from './pages/RegistrationPage';
import RegistrationStatusPage from './pages/RegistrationStatusPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<StudentLoginPage />} />
          <Route path="/instructions" element={<QuizInstructionsPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/certificate" element={<CheckCertificatePage />} />
          <Route path="/registration" element={<RegistrationPage />} />
          <Route path="/registration/status" element={<RegistrationStatusPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        </Routes>
      </div>
    </Router>
  );
}
