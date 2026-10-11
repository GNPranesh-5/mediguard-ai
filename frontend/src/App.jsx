import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import ScannerPage from './pages/ScannerPage';
import SearchPage from './pages/SearchPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import SavedPage from './pages/SavedPage';
import AboutPage from './pages/AboutPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProtectedRoute from './components/ProtectedRoute';

// Routing table: URL path -> page component. :id / :scanId are URL parameters read with useParams().
export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]); // new page starts at the top

  return (
    // reducedMotion="user" makes Framer Motion skip animations if the OS asks for reduced motion.
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/medicine/:id" element={<ResultPage source="medicine" />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          {/* Private pages: ProtectedRoute redirects to /login when logged out */}
          <Route element={<ProtectedRoute />}>
            <Route path="/scan" element={<ScannerPage />} />
            <Route path="/scan/:scanId" element={<ResultPage source="scan" />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </MotionConfig>
  );
}
