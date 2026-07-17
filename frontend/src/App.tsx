import { Route, Routes } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import EligibilityPage from './pages/EligibilityPage';
import JourneyPage from './pages/JourneyPage';
import LandingPage from './pages/LandingPage';
import SectionPage from './pages/SectionPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/check" element={<EligibilityPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/journey" element={<JourneyPage />} />
      <Route path="/journey/:sectionKey" element={<SectionPage />} />
    </Routes>
  );
}
