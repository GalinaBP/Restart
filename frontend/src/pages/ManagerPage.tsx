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
import { sectionLabel, stageLabel } from '../api/labels';
import SectionHelp from './SectionHelp';
import { sortCorrespondence } from './sortCorrespondence';
import StageEditor from './StageEditor';

/**
 * «Поиск финансового управляющего» — the stage on a screen of its own.
 *
 * The screen is about ONE action: naming the organisation (СРО) the court will appoint the
 * manager from. Everything else here only supports it — why a manager is needed at all, and how
 * to choose the organisation. Money is not repeated here: the amounts belong to «Пошлина и
 * депозит», and asking for the deposit twice made this screen read like a list of errands.
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
  const [sro, setSro] = useState<SectionEntry | null>(null);
  const [correspondence, setCorrespondence] = useState<SectionEntry[] | null>(null);
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
      const [journey, sroSection, correspondenceSection] = await Promise.all([
        getJourney(existing.id),
        getSection(existing.id, 'MANAGER_SRO'),
        getSection(existing.id, 'MANAGER_CORRESPONDENCE'),
      ]);
      setStage(journey.stages.find((s) => s.stage === 'MANAGER_SELECTION') ?? null);
      // An unfilled section is the common case on both of these — guard for it.
      setSro(sroSection.data && !Array.isArray(sroSection.data) ? sroSection.data : null);
      setCorrespondence(
        Array.isArray(correspondenceSection.data) ? correspondenceSection.data : null,
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
  };

  if (loading) {
    return (
      <main className="check">
        <p className="check-question">Секунду…</p>
      </main>
    );
  }

  if (failed || !stage) {
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

  const label = stageLabel('MANAGER_SELECTION');
  const sroLabel = sectionLabel('MANAGER_SRO');
  const chosen = typeof sro?.name === 'string' && sro.name.trim() !== '' ? sro.name : null;
  const latest = sortCorrespondence(correspondence)[0];

  return (
    <main className="journey">
      <header className="journey-header">
        <h1 className="journey-title">{label.title}</h1>
        <Link to="/procedure" className="check-back">← Весь путь</Link>
      </header>
      <p className="check-placeholder" role="note">Черновик — проверяется юристом</p>
      <p className="check-hint">{label.description}</p>

      {label.about && (
        <section className="journey-part">
          <h2 className="journey-part-title">{label.about.title}</h2>
          <p className="check-hint">{label.about.text}</p>
          {label.timing && <p className="procedure-stage-timing">{label.timing}</p>}
        </section>
      )}

      {/* The one action of this screen. Its instructions come from the step's own labels, so the
          how-to reads the same here and on the form itself. */}
      <section className="journey-part">
        <h2 className="journey-part-title">{sroLabel.title}</h2>
        {sroLabel.hint && <p className="check-hint">{sroLabel.hint}</p>}
        <SectionHelp blocks={sroLabel.help} />
        {chosen && <p className="manager-chosen">Вы указали: {chosen}</p>}
        {/* `back` brings the user home to this screen once the step is saved — the data steps
            otherwise walk on through the questionnaire, which is a different screen's flow. */}
        <Link
          className="landing-cta journey-continue"
          to="/journey/MANAGER_SRO"
          state={{ back: '/manager' }}
        >
          {chosen ? 'Проверить организацию' : 'Указать организацию'}
        </Link>
      </section>

      {/* Weeks later, and only while the backend says the stage is the user's to record. */}
      {stage.editable && (
        <section className="journey-part">
          <h2 className="journey-part-title">Когда управляющего утвердят</h2>
          <p className="check-hint">
            Суд примет заявление, организация назовёт кандидатуру, а суд утвердит управляющего.
            Как только это произойдёт — отметьте здесь.
          </p>
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
