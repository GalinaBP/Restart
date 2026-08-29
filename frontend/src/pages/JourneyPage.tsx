import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn, logout } from '../api/auth';
import {
  createCase,
  currentCase,
  getSection,
  sectionsOverview,
  type CaseInfo,
  type SectionContent,
  type SectionStatus,
} from '../local/case';
import {
  CASE_DATA_SECTIONS,
  CASE_DOCUMENTS,
  INCOME_DOCUMENTS,
  WORK_DOCUMENTS,
  type DocumentGuide,
  type IncomeKind,
  type WorkStatus,
} from '../api/labels';
import DocumentGuideList from './DocumentGuideList';

function answer(content: SectionContent, field: string): string | null {
  const data = content.data;
  if (data === null || Array.isArray(data)) {
    return null;
  }
  const value = data[field];
  return typeof value === 'string' ? value : null;
}

function workPapers(content: SectionContent): DocumentGuide[] | null {
  const status = answer(content, 'status');
  if (status === null || !(status in WORK_DOCUMENTS)) {
    return null;
  }
  const income = answer(content, 'otherIncome');
  const extra = income === null ? undefined : INCOME_DOCUMENTS[income as IncomeKind];
  return [...WORK_DOCUMENTS[status as WorkStatus], ...(extra ?? [])];
}

export default function JourneyPage() {
  const navigate = useNavigate();
  const [bankruptcyCase, setCase] = useState<CaseInfo | null>(null);
  const [steps, setSteps] = useState<SectionStatus[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [papers, setPapers] = useState<DocumentGuide[] | null>(null);

  const load = useCallback(async () => {
    try {
      const existing = await currentCase();
      setCase(existing);
      if (existing) {
        const [overview, employment] = await Promise.all([
          sectionsOverview(),
          getSection('EMPLOYMENT'),
        ]);
        setSteps(overview);
        setPapers(workPapers(employment));
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
      setPapers(null);
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
      <p className="check-placeholder" role="note">Черновик — проверяется юристом</p>

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
        <h2 className="journey-part-title">Какие документы нужно собрать</h2>
        <p className="check-hint">
          Часть документов уже есть у вас, а некоторые можно получить онлайн. Скачивайте их в PDF,
          если сервис даёт выбрать формат; если PDF недоступен — сохраните как JPG или PNG.
        </p>
        <p className="check-hint">
          Перед загрузкой проверьте, что документ читается целиком, все страницы на месте, а текст
          и реквизиты не обрезаны.
        </p>
        <DocumentGuideList guides={CASE_DOCUMENTS} />

        <div className="journey-work-choice">
          {papers === null ? (
            <p className="check-hint">
              Ответьте в шаге «Работа», есть ли у вас работа и другие доходы, — и мы допишем сюда
              бумаги именно для вашего случая.
            </p>
          ) : (
            <DocumentGuideList guides={papers} />
          )}
        </div>
      </section>
    </main>
  );
}
