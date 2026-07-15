import { useNavigate } from 'react-router-dom';

/**
 * Landing screen per the product constitution: one message, one action, a calm promise of
 * step-by-step guidance. No legal terminology anywhere on this screen. The three value pills
 * are the constitution's brand values (Понятно / Спокойно / Честно).
 */
export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <main className="landing">
      <h1 className="landing-brand">Рестарт</h1>
      <p className="landing-lead">Начни новую финансовую главу&nbsp;🚀</p>
      <p className="landing-sub">
        Проведём тебя через процедуру банкротства шаг за шагом. Никаких сложных инструкций.
        Никакой юридической терминологии. Только следующий шаг — и он всегда понятен.
      </p>
      <ul className="landing-values">
        <li>💬 Понятно</li>
        <li>🧘 Спокойно</li>
        <li>🤝 Честно</li>
      </ul>
      <button type="button" className="landing-cta" onClick={() => navigate('/check')}>
        Начать
      </button>
      <p className="landing-note">⏱ ≈ 30 минут на подготовку документов</p>
    </main>
  );
}
