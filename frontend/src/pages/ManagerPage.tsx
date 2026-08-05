import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { currentCase, getSection, type SectionEntry } from '../api/cases';
import {
  getJourney,
  recordStage,
  type JourneyStageView,
  type RecordStageInput,
} from '../api/procedure';
import { stageLabel } from '../api/labels';
import { sortCorrespondence } from './sortCorrespondence';
import StageEditor from './StageEditor';

/**
 * «Поиск финансового управляющего» — the stage on a screen of its own.
 *
 * The screen is about ONE action: naming the organisation (СРО) the court will appoint the
 * manager from. It explains why a manager is needed and then offers a single button; how to
 * choose the organisation is explained on the step itself, next to the fields it is about. Money
 * is not repeated here either — the amounts belong to «Пошлина и депозит», and asking for the
 * deposit twice made this screen read like a list of errands.
 *
 * Below the action, out of its way, sit the two things that stay useful for months afterwards:
 * marking that the court has appointed the manager, and the correspondence journal.
 *
 * Nothing about the manager is stored here: the СРО lives in its own data step, the appointment is
 * the journey stage itself. This screen only gathers them.
 */

/** 'YYYY-MM-DD' → 'DD.MM.YYYY', the date format used everywhere else in the app. */
function formatRuDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

export default function ManagerPage() {
  const navigate = useNavigate();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [stage, setStage] = useState<JourneyStageView | null>(null);
  const [correspondence, setCorrespondence] = useState<SectionEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  /** Confirms the last recording of the stage — the form stays put, so it says so itself. */
  const [recorded, setRecorded] = useState(false);

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
      // The journal is a side note on this screen — losing it must not take the screen down with
      // it, the way the stage itself would.
      const [journey, correspondenceSection] = await Promise.all([
        getJourney(existing.id),
        getSection(existing.id, 'MANAGER_CORRESPONDENCE').catch(() => null),
      ]);
      setStage(journey.stages.find((s) => s.stage === 'MANAGER_SELECTION') ?? null);
      // No correspondence recorded yet is the common case — guard for it.
      setCorrespondence(
        Array.isArray(correspondenceSection?.data) ? correspondenceSection.data : null,
      );
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

  const save = async (input: RecordStageInput) => {
    if (!caseId) return;
    const updated = await recordStage(caseId, 'MANAGER_SELECTION', input);
    setStage(updated.stages.find((s) => s.stage === 'MANAGER_SELECTION') ?? null);
    // The form stays open on this screen, so nothing else would tell the user it worked.
    setRecorded(true);
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

  // No case at all sends the user to «Ваше дело»; that redirect is already under way, so render
  // nothing rather than flashing a failure that did not happen.
  if (!stage) {
    return null;
  }

  const label = stageLabel('MANAGER_SELECTION');
  const latest = sortCorrespondence(correspondence)[0];

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

      {/* The one action of this screen: a single button. How to choose the organisation is
          explained on the step itself, next to the fields it is about — repeating it here only
          made the user read the same instructions twice before they could act.
          `back` brings them home to this screen once the step is saved — the data steps otherwise
          walk on through the questionnaire, which is a different screen's flow. */}
      <Link
        className="landing-cta journey-continue"
        to="/journey/MANAGER_SRO"
        state={{ back: '/manager' }}
      >
        Указать организацию
      </Link>

      {/* Weeks later, and only while the backend says the stage is the user's to record. */}
      {stage.editable && (
        <section className="journey-part">
          <h2 className="journey-part-title">Когда управляющего утвердят</h2>
          <p className="check-hint">
            Суд примет заявление, организация назовёт кандидатуру, а суд утвердит управляющего.
            Как только это произойдёт — отметьте здесь.
          </p>
          {recorded && (
            <p className="section-saved-note" role="status">
              Отметили. Это видно и на «Весь путь».
            </p>
          )}
          <StageEditor view={stage} onSave={save} submitLabel="Сохранить" />
        </section>
      )}

      <section className="journey-part">
        <h2 className="journey-part-title">Переписка с управляющим</h2>
        <p className="check-hint">
          Ваш личный журнал: что прислал управляющий, когда и по какому поводу. Ничего не блокирует
          — но за месяцы дела письма легко теряются.
        </p>
        {latest && typeof latest.date === 'string' && (
          <p className="procedure-correspondence-latest">
            Последняя запись: {formatRuDate(latest.date)}
            {latest.type ? ` — ${latest.type}` : ''}
          </p>
        )}
        <Link
          to="/journey/MANAGER_CORRESPONDENCE"
          className="journey-part-link"
          state={{ back: '/manager' }}
        >
          {latest ? 'Открыть журнал →' : 'Добавить первую запись →'}
        </Link>
      </section>
    </main>
  );
}
