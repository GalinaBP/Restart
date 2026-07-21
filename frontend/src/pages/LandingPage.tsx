import { useNavigate } from 'react-router-dom';

/**
 * Landing screen per the product constitution: one message, one primary action, a calm promise of
 * step-by-step guidance. No legal terminology in the reassurance copy. A short tagline states the
 * positioning up front — this is a self-guided court-bankruptcy service. Returning users reach their
 * case through the «Войти» link; new visitors start the screening with «Начать».
 */
export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <main className="landing">
      <button
        type="button"
        className="landing-login"
        onClick={() => navigate('/auth')}
      >
        Войти
      </button>
      <h1 className="landing-brand">Рестарт</h1>
      <p className="landing-lead">Начните новую финансовую главу&nbsp;🚀</p>
      <p className="landing-tagline">Сервис для самостоятельного судебного банкротства</p>
      <p className="landing-sub">
        Проведём вас через процедуру банкротства шаг за шагом. Никаких сложных инструкций.
      </p>
      <button type="button" className="landing-cta" onClick={() => navigate('/check')}>
        Начать
      </button>
      <p className="landing-note">≈ 30 минут на подготовку документов</p>
    </main>
  );
}
