import { Route, Routes } from 'react-router-dom';
import AboutYouPage from './pages/AboutYouPage';
import AuthPage from './pages/AuthPage';
import DocumentsPage from './pages/DocumentsPage';
import EligibilityPage from './pages/EligibilityPage';
import JourneyPage from './pages/JourneyPage';
import LandingPage from './pages/LandingPage';
import ProcedurePage from './pages/ProcedurePage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SectionPage from './pages/SectionPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/check" element={<EligibilityPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/reset" element={<ResetPasswordPage />} />
      <Route path="/journey" element={<JourneyPage />} />
      {/* Static segment, so it wins over the :sectionKey route below. */}
      <Route path="/journey/all" element={<AboutYouPage />} />
      <Route path="/journey/:sectionKey" element={<SectionPage />} />
      <Route path="/procedure" element={<ProcedurePage />} />
      <Route path="/documents" element={<DocumentsPage />} />
    </Routes>
  );
}
