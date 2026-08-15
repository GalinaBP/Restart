import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn, logout } from '../api/auth';
import {
  createCase,
  currentCase,
  sectionsOverview,
  type CaseInfo,
  type SectionStatus,
} from '../local/case';
import { CASE_DATA_SECTIONS, OWN_DOCUMENTS, WORK_DOCUMENTS, type WorkStatus } from '../api/labels';

export default function JourneyPage() {
  const navigate = useNavigate();
  const [bankruptcyCase, setCase] = useState<CaseInfo | null>(null);
  const [steps, setSteps] = useState<SectionStatus[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [work, setWork] = useState<WorkStatus | null>(null);

  const load = useCallback(async () => {
    try {
      const existing = await currentCase();
      setCase(existing);
      if (existing) {
        setSteps(await sectionsOverview());
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
      setCase(await createCase());
      setSteps(await sectionsOverview());
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
        <p className="check-question">Что-то пошло не так</p>
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
        <h1 className="check-question">Начнём ваше дело</h1>
        <p className="check-hint">
          Мы соберём всё по шагам: немного о вас, долги, доходы. Каждый шаг — один экран.
          Всё сохраняется сразу, бросить и вернуться можно в любой момент.
        </p>
        <button type="button" className="landing-cta" onClick={() => void start()}>
          Поехали
        </button>
      </main>
    );
  }

  const dataSteps = CASE_DATA_SECTIONS
    .map((key) => steps?.find((s) => s.key === key))
    .filter((s): s is SectionStatus => s !== undefined);
  const filled = dataSteps.filter((s) => s.filled).length;
  const total = dataSteps.length;
  const next = dataSteps.find((s) => !s.filled);

  return (
    <main className="journey">
      <header className="journey-header">
        <h1 className="journey-title">Ваше дело</h1>
        <span>
          <Link to="/procedure" className="check-back">Весь путь</Link>
          {' · '}
          <Link to="/documents" className="check-back">Документы</Link>
          {' · '}
          <Link to="/calm" className="check-back">Спокойно</Link>
          {' · '}
          <button type="button" className="check-back" onClick={() => { logout(); navigate('/'); }}>
            Выйти
          </button>
        </span>
      </header>
      <p className="check-hint">
        {filled === total
          ? 'Все шаги заполнены! Пора собирать документы.'
          : `Заполнено ${filled} из ${total}. Продолжайте — всё сохраняется сразу.`}
      </p>
      <div className="journey-progress" aria-label={`Заполнено ${filled} из ${total}`}>
        <div className="check-progress-fill" style={{ width: `${total ? (filled / total) * 100 : 0}%` }} />
      </div>
      {next ? (
        <Link className="landing-cta journey-continue" to="/journey/all">
          Продолжить
        </Link>
      ) : (
        <Link className="landing-cta journey-continue" to="/documents">
          Собрать документы
        </Link>
      )}
      <section className="journey-part">
        <h2 className="journey-part-title">Информация о вас</h2>
        <p className="check-hint">
          Вопросы о вас, долгах и доходах — на основании них мы подготовим документы для суда.
          Все они собраны на одной странице.
        </p>
        <Link to="/journey/all" className="journey-part-link">
          {filled === total ? 'Проверить ответы →' : 'Заполнить →'}
        </Link>
      </section>

      <section className="journey-part">
        <h2 className="journey-part-title">Документы, которые подготовил «Рестарт»</h2>
        <p className="check-hint">
          Заявление, списки и описи мы соберём сами — из ваших ответов выше.
        </p>
        <Link to="/documents" className="journey-part-link">Открыть документы →</Link>
      </section>

      <section className="journey-part">
        <h2 className="journey-part-title">Документы, которые нужно подготовить самостоятельно</h2>
        <p className="check-hint">
          Эти бумаги выдают банки, работодатель и государство — закажите их заранее, суд попросит
          их к заседанию.
        </p>
        <ul className="journey-own-docs">
          {OWN_DOCUMENTS.map((doc) => (
            <li key={doc.title}>
              <span className="journey-own-doc-title">{doc.title}</span>
              <span className="journey-own-doc-where">{doc.where}</span>
            </li>
          ))}
        </ul>

        <div className="journey-work-choice">
          <p className="journey-work-question">Вы сейчас работаете?</p>
          <div className="journey-work-options" role="group" aria-label="Вы сейчас работаете?">
            <button
              type="button"
              className={`check-option${work === 'WORKING' ? ' check-option-selected' : ''}`}
              aria-pressed={work === 'WORKING'}
              onClick={() => setWork('WORKING')}
            >
              Работаю
            </button>
            <button
              type="button"
              className={`check-option${work === 'NOT_WORKING' ? ' check-option-selected' : ''}`}
              aria-pressed={work === 'NOT_WORKING'}
              onClick={() => setWork('NOT_WORKING')}
            >
              Не работаю
            </button>
          </div>
          {work === null ? (
            <p className="check-hint">
              Ответьте — и мы допишем сюда бумаги о доходах именно для вашего случая.
            </p>
          ) : (
            <ul className="journey-own-docs">
              {WORK_DOCUMENTS[work].map((doc) => (
                <li key={doc.title}>
                  <span className="journey-own-doc-title">{doc.title}</span>
                  <span className="journey-own-doc-where">{doc.where}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
