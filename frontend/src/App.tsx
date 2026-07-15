import { Route, Routes } from 'react-router-dom';
import EligibilityPage from './pages/EligibilityPage';
import LandingPage from './pages/LandingPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/check" element={<EligibilityPage />} />
    </Routes>
  );
}
