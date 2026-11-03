import { Route, Routes } from 'react-router-dom';
import AboutYouPage from './pages/AboutYouPage';
import AuthPage from './pages/AuthPage';
import BackupPage from './pages/BackupPage';
import CalmPage from './pages/CalmPage';
import DocumentsPage from './pages/DocumentsPage';
import EligibilityPage from './pages/EligibilityPage';
import JourneyPage from './pages/JourneyPage';
import LandingPage from './pages/LandingPage';
import ManagerPage from './pages/ManagerPage';
import PayPage from './pages/PayPage';
import PayReturnPage from './pages/PayReturnPage';
import ProcedurePage from './pages/ProcedurePage';
import RequireAccess from './pages/RequireAccess';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SectionPage from './pages/SectionPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/check" element={<EligibilityPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/reset" element={<ResetPasswordPage />} />
      <Route path="/pay" element={<PayPage />} />
      <Route path="/pay/return" element={<PayReturnPage />} />
      <Route path="/calm" element={<CalmPage />} />
      <Route element={<RequireAccess />}>
        <Route path="/journey" element={<JourneyPage />} />
        <Route path="/journey/all" element={<AboutYouPage />} />
        <Route path="/journey/:sectionKey" element={<SectionPage />} />
        <Route path="/procedure" element={<ProcedurePage />} />
        <Route path="/manager" element={<ManagerPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/backup" element={<BackupPage />} />
      </Route>
    </Routes>
  );
}
