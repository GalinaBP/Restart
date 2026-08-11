import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { currentCase, getSection, type SectionEntry } from '../api/cases';
import { stageLabel, STATUS_LABELS } from '../api/labels';

const SRO_STEP = {
  title: 'Выбрать организацию',
  description: 'Организацию (СРО) вы называете в заявлении сами — из её участников суд '
    + 'утвердит вашего управляющего. Название и адрес нужны точно как в реестре.',
  route: '/journey/MANAGER_SRO',
  linkLabel: 'Указать организацию',
};

export default function ManagerPage() {
  const navigate = useNavigate();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [sro, setSro] = useState<SectionEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const existing = await currentCase();
      if (!existing) {
        navigate('/journey');
        return;
      }
      setCaseId(existing.id);
      const sroSection = await getSection(existing.id, 'MANAGER_SRO');
      setSro(sroSection.data && !Array.isArray(sroSection.data) ? sroSection.data : null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!isSignedIn()) {
      navigate('/auth');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: state changes only after await
    void load();
  }, [navigate, load]);

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

  if (!caseId) {
    return null;
  }

  const label = stageLabel('MANAGER_SELECTION');
  const stepDone = typeof sro?.name === 'string' && sro.name.trim() !== '';

  return (
    <main className="journey">
      <header className="journey-header">
        <h1 className="journey-title">{label.title}</h1>
        <Link to="/procedure" className="check-back">← Весь путь</Link>
      </header>
      <p className="check-placeholder" role="note">Черновик — проверяется юристом</p>

      {label.about && (
        <section className="journey-part">
          <h2 className="journey-part-title">{label.about.title}</h2>
          <p className="journey-part-text">{label.about.text}</p>
          {label.about.timing && (
            <p className="procedure-stage-timing">{label.about.timing}</p>
          )}
        </section>
      )}

      <ul className="procedure-list manager-steps">
        <li className={`procedure-stage ${stepDone ? 'procedure-stage-done' : 'procedure-stage-current'}`}>
          <span className="procedure-stage-head">
            <span className="procedure-stage-title">{SRO_STEP.title}</span>
            <span className={`procedure-status procedure-status-${stepDone ? 'done' : 'not-started'}`}>
              {stepDone ? STATUS_LABELS.DONE.title : STATUS_LABELS.NOT_STARTED.title}
            </span>
          </span>
          <p className="check-hint procedure-stage-desc">{SRO_STEP.description}</p>
          <Link
            to={SRO_STEP.route}
            className="procedure-detail-link"
            state={{ back: '/manager' }}
          >
            {SRO_STEP.linkLabel} →
          </Link>
        </li>
      </ul>
    </main>
  );
}
