import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { currentCase, getSection, type SectionEntry } from '../api/cases';
import { stageLabel, STATUS_LABELS } from '../api/labels';

/**
 * «Поиск финансового управляющего» — the stage on a screen of its own.
 *
 * The screen is about ONE action: naming the organisation (СРО) the court will appoint the
 * manager from. It explains why a manager is needed and then shows that single step. How to
 * choose the organisation is explained on the step itself, next to the fields it is about; money
 * is not repeated here either — the amounts belong to «Пошлина и депозит».
 *
 * Everything about the stage that is not this one action stays on «Весь путь»: recording that the
 * court has appointed the manager, and the correspondence journal. This screen stores nothing of
 * its own — the СРО lives in its own data step, and this only reads it to say whether the step is
 * behind the user.
 */

/**
 * The one step this stage asks for. It is a step card rather than a bare button so the screen can
 * say whether it is behind the user — the organisation is named once, months before anything else
 * happens, and «уже указал или нет?» is the question people come back with.
 */
const SRO_STEP = {
  title: 'Выбрать организацию',
  description: 'Организацию (СРО) вы называете в заявлении сами — из её участников суд '
    + 'утвердит вашего управляющего. Название и адрес нужны точно как в реестре.',
  route: '/journey/MANAGER_SRO',
  linkLabel: 'Указать организацию',
};

export default function ManagerPage() {
  const navigate = useNavigate();
  /** null until the case is known — until then the redirect to «Ваше дело» may be under way. */
  const [caseId, setCaseId] = useState<string | null>(null);
  const [sro, setSro] = useState<SectionEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Deliberately no synchronous setState here: the effect calls this directly, and the initial
  // state already is "loading". The retry handler resets the flags itself before calling.
  const load = useCallback(async () => {
    try {
      const existing = await currentCase();
      if (!existing) {
        navigate('/journey');
        return;
      }
      setCaseId(existing.id);
      const sroSection = await getSection(existing.id, 'MANAGER_SRO');
      // An unfilled section is the common case here — guard for it.
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

  // No case at all sends the user to «Ваше дело»; that redirect is already under way, so render
  // nothing rather than flashing a failure that did not happen.
  if (!caseId) {
    return null;
  }

  const label = stageLabel('MANAGER_SELECTION');
  // A blank name closes nothing — the step is done only once an organisation is actually named.
  const stepDone = typeof sro?.name === 'string' && sro.name.trim() !== '';

  return (
    <main className="journey">
      <header className="journey-header">
        <h1 className="journey-title">{label.title}</h1>
        <Link to="/procedure" className="check-back">← Весь путь</Link>
      </header>
      <p className="check-placeholder" role="note">Черновик — проверяется юристом</p>

      {/* The stage's one-line description is not repeated here: it introduces the stage on «Весь
          путь», and the section below says the same thing at length. */}
      {label.about && (
        <section className="journey-part">
          <h2 className="journey-part-title">{label.about.title}</h2>
          <p className="journey-part-text">{label.about.text}</p>
          {label.timing && <p className="procedure-stage-timing">{label.timing}</p>}
        </section>
      )}

      {/* The one action of this screen. How to choose the organisation is explained on the step
          itself, next to the fields it is about — repeating it here only made the user read the
          same instructions twice before they could act. `back` brings them home to this screen
          once the step is saved: the data steps otherwise walk on through the questionnaire,
          which is a different screen's flow. */}
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
