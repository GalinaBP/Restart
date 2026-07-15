/**
 * Landing screen per the product constitution: one message, one action, a calm promise of
 * step-by-step guidance. No legal terminology anywhere on this screen.
 */
export default function LandingPage() {
  return (
    <main className="landing">
      <h1 className="landing-brand">Restart</h1>
      <p className="landing-lead">Начни новую финансовую главу.</p>
      <p className="landing-sub">
        Мы проведём тебя через процедуру банкротства шаг за шагом.
        <br />
        Никаких сложных инструкций. Никакой юридической терминологии.
      </p>
      <button type="button" className="landing-cta">
        Начать
      </button>
      <p className="landing-note">≈ 30 минут на подготовку документов</p>
    </main>
  );
}
