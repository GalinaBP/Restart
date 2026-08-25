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

const WORK_KEY = 'restart.journey.workStatus';

function storedWork(): WorkStatus | null {
  const saved = localStorage.getItem(WORK_KEY);
  return saved === 'WORKING' || saved === 'NOT_WORKING' ? saved : null;
}

export default function JourneyPage() {
  const navigate = useNavigate();
  const [bankruptcyCase, setCase] = useState<CaseInfo | null>(null);
  const [steps, setSteps] = useState<SectionStatus[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [work, setWork] = useState<WorkStatus | null>(storedWork);

  const chooseWork = (status: WorkStatus) => {
    setWork(status);
    localStorage.setItem(WORK_KEY, status);
  };

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
        <p className="section-caution" role="note">
          Ваши ответы остаются на этом устройстве и никуда не отправляются. Обратная сторона:
          если очистить данные сайта или пересесть за другой компьютер, дело придётся начинать
          заново. Поэтому по ходу дела сохраняйте копию в файл — мы будем напоминать.
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
  const allFilled = total > 0 && filled === total;

  return (
    <main className="journey">
      <header className="journey-header">
        <h1 className="journey-title">Давайте разберёмся с долгами</h1>
        <nav className="journey-nav" aria-label="Разделы дела">
          <Link to="/procedure" className="journey-nav-link">Весь путь</Link>
          <Link to="/calm" className="journey-nav-link">Кредиторы</Link>
          <Link to="/backup" className="journey-nav-link">Копия дела</Link>
          <button
            type="button"
            className="journey-nav-link"
            onClick={() => { logout(); navigate('/'); }}
          >
            Выйти
          </button>
        </nav>
      </header>

      <div className="journey-status">
        <p className="journey-status-line">
          <span className="journey-status-count">{filled} из {total} шагов</span>
          <span className="journey-status-text">
            {allFilled
              ? 'Все шаги заполнены. Пора собирать документы.'
              : 'Мы будем идти по порядку. Ответы сохраняются автоматически.'}
          </span>
        </p>
        <div
          className="journey-progress"
          role="progressbar"
          aria-valuenow={filled}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Заполнено шагов"
        >
          <div
            className="check-progress-fill"
            style={{ width: `${total ? (filled / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {allFilled ? (
        <Link className="landing-cta journey-continue" to="/documents">
          Собрать документы
        </Link>
      ) : (
        <Link className="landing-cta journey-continue" to="/journey/all">
          Продолжить
        </Link>
      )}

      <section className="journey-part">
        <h2 className="journey-part-title">Сначала — несколько вопросов</h2>
        <p className="check-hint">
          Расскажите о себе, доходах и долгах. Мы используем ваши ответы, чтобы подготовить
          документы и показать, что делать дальше.
        </p>
        <Link to="/journey/all" className="journey-part-link">
          {allFilled ? 'Проверить ответы →' : 'Заполнить →'}
        </Link>
      </section>

      <section className="journey-part">
        <h2 className="journey-part-title">Что подготовит «Рестарт»</h2>
        <p className="check-hint">
          Вам не придётся составлять заявление и списки самостоятельно. Мы соберём их из
          ваших ответов.
        </p>
        <Link to="/documents" className="journey-part-link">Посмотреть документы →</Link>
      </section>

      <section className="journey-part">
        <h2 className="journey-part-title">А что нужно найти вам</h2>
        <p className="check-hint">
          Часть документов уже есть у вас или их можно получить онлайн. Начните собирать их
          заранее.
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
              onClick={() => chooseWork('WORKING')}
            >
              Работаю
            </button>
            <button
              type="button"
              className={`check-option${work === 'NOT_WORKING' ? ' check-option-selected' : ''}`}
              aria-pressed={work === 'NOT_WORKING'}
              onClick={() => chooseWork('NOT_WORKING')}
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
