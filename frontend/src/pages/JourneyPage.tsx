import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn, logout } from '../api/auth';
import {
  createCase,
  currentCase,
  sectionsOverview,
  type CaseInfo,
  type SectionStatus,
} from '../api/cases';
import { sectionLabel } from '../api/labels';

/**
 * The case home screen: the journey map. One list, sixteen steps, each a screen of its own;
 * «Продолжить» always jumps to the first unfilled step, per the one-next-action rule.
 */
export default function JourneyPage() {
  const navigate = useNavigate();
  const [bankruptcyCase, setCase] = useState<CaseInfo | null>(null);
  const [steps, setSteps] = useState<SectionStatus[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Deliberately no synchronous setState here: the effect calls this directly, and the initial
  // state already is "loading". Retry handlers reset the flags themselves before calling.
  const load = useCallback(async () => {
    try {
      const existing = await currentCase();
      setCase(existing);
      if (existing) {
        setSteps(await sectionsOverview(existing.id));
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn()) {
      navigate('/auth');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: state changes only after await
    void load();
  }, [navigate, load]);

  const start = async () => {
    setLoading(true);
    try {
      const created = await createCase();
      setCase(created);
      setSteps(await sectionsOverview(created.id));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="check">
        <p className="check-question">Секунду…</p>
      </main>
    );
  }

  if (failed) {
    return (
      <main className="check">
        <p className="check-question">Что-то пошло не так 😔</p>
        <button
          type="button"
          className="landing-cta"
          onClick={() => {
            setFailed(false);
            setLoading(true);
            void load();
          }}
        >
          Повторить
        </button>
      </main>
    );
  }

  if (!bankruptcyCase) {
    return (
      <main className="check">
        <p className="check-emoji" aria-hidden="true">🚀</p>
        <h1 className="check-question">Начнём твоё дело</h1>
        <p className="check-hint">
          Мы соберём всё по шагам: немного о тебе, долги, доходы. Каждый шаг — один экран.
          Всё сохраняется сразу, бросить и вернуться можно в любой момент.
        </p>
        <button type="button" className="landing-cta" onClick={() => void start()}>
          Поехали
        </button>
      </main>
    );
  }

  const filled = steps?.filter((s) => s.filled).length ?? 0;
  const total = steps?.length ?? 0;
  const next = steps?.find((s) => !s.filled);

  return (
    <main className="journey">
      <header className="journey-header">
        <h1 className="journey-title">Твоё дело</h1>
        <span>
          <Link to="/documents" className="check-back">Документы</Link>
          {' · '}
          <button type="button" className="check-back" onClick={() => { logout(); navigate('/'); }}>
            Выйти
          </button>
        </span>
      </header>
      <p className="check-hint">
        {filled === total
          ? 'Все шаги заполнены! Пора собирать документы 🎉'
          : `Заполнено ${filled} из ${total}. Продолжай — всё сохраняется сразу.`}
      </p>
      <div className="journey-progress" aria-label={`Заполнено ${filled} из ${total}`}>
        <div className="check-progress-fill" style={{ width: `${total ? (filled / total) * 100 : 0}%` }} />
      </div>
      {next ? (
        <Link className="landing-cta journey-continue" to={`/journey/${next.key}`}>
          Продолжить
        </Link>
      ) : (
        <Link className="landing-cta journey-continue" to="/documents">
          Собрать документы
        </Link>
      )}
      <ul className="journey-steps">
        {steps?.map((step) => {
          const label = sectionLabel(step.key);
          return (
            <li key={step.key}>
              <Link className={`journey-step${step.filled ? ' journey-step-done' : ''}`}
                    to={`/journey/${step.key}`}>
                <span aria-hidden="true">{label.emoji}</span>
                <span className="journey-step-title">{label.title}</span>
                <span className="journey-step-state" aria-label={step.filled ? 'заполнено' : 'не заполнено'}>
                  {step.filled ? '✓' : '›'}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
