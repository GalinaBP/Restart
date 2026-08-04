import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { currentCase, getSection, type SectionEntry } from '../api/cases';
import {
  getFees,
  getJourney,
  recordStage,
  type FeeScheduleView,
  type JourneyStageView,
  type RecordStageInput,
} from '../api/procedure';
import { stageLabel, STATUS_LABELS } from '../api/labels';
import { managerSteps, type ManagerStep } from './managerSteps';
import { sortCorrespondence } from './sortCorrespondence';
import { amountsAreDraft, fillAmounts } from './stageAmounts';
import StageEditor from './StageEditor';

/**
 * «Поиск финансового управляющего» — the stage as a small application of its own, built like the
 * document-preparation screen: what the stage is about, how far along it is, one «Продолжить» to
 * the single next action, then the steps in order.
 *
 * The stage used to be an expandable card on «Весь путь», which meant three unrelated things —
 * choosing the organisation, paying the deposit, waiting for the appointment — hid behind one
 * toggle. They are separate actions, weeks apart, so they are separate steps here.
 *
 * Nothing about the manager is stored on this screen: the СРО and the payment live in their own
 * data steps, the appointment is the journey stage itself. This screen only gathers them.
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
  const [fees, setFees] = useState<FeeScheduleView | null>(null);
  const [sro, setSro] = useState<SectionEntry | null>(null);
  const [payments, setPayments] = useState<SectionEntry | null>(null);
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
      const [journey, feeSchedule, sroSection, paymentsSection, correspondenceSection] =
        await Promise.all([
          getJourney(existing.id),
          getFees(existing.id),
          getSection(existing.id, 'MANAGER_SRO'),
          getSection(existing.id, 'PAYMENTS'),
          getSection(existing.id, 'MANAGER_CORRESPONDENCE'),
        ]);
      setStage(journey.stages.find((s) => s.stage === 'MANAGER_SELECTION') ?? null);
      setFees(feeSchedule);
      // An unfilled section is the common case on every one of these — guard for it.
      setSro(sroSection.data && !Array.isArray(sroSection.data) ? sroSection.data : null);
      setPayments(
        paymentsSection.data && !Array.isArray(paymentsSection.data) ? paymentsSection.data : null,
      );
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
  const steps = managerSteps(sro, payments, stage.status);
  const done = steps.filter((step) => step.done).length;
  const total = steps.length;
  const next = steps.find((step) => !step.done);
  const latest = sortCorrespondence(correspondence)[0];

  return (
    <main className="journey">
      <header className="journey-header">
        <h1 className="journey-title">{label.title}</h1>
        <Link to="/procedure" className="check-back">← Весь путь</Link>
      </header>
      <p className="check-placeholder" role="note">Черновик — проверяется юристом</p>
      <p className="check-hint">{label.description}</p>

      <p className="check-hint">
        {done === total
          ? 'Все шаги этого этапа пройдены — управляющий у вашего дела есть.'
          : `Пройдено ${done} из ${total}. Шаги идут по порядку, спешить некуда.`}
      </p>
      <div className="journey-progress" aria-label={`Пройдено ${done} из ${total}`}>
        <div className="check-progress-fill" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      {next?.route && next.linkLabel && (
        // `back` brings the user home to this step list once the step is saved — the data steps
        // otherwise walk on through the questionnaire, which is a different screen's flow.
        <Link className="landing-cta journey-continue" to={next.route} state={{ back: '/manager' }}>
          {next.linkLabel}
        </Link>
      )}

      {label.points && (
        <section className="journey-part">
          <h2 className="journey-part-title">Что делает управляющий</h2>
          <ul className="procedure-stage-points">
            {label.points.map((point) => <li key={point}>{fillAmounts(point, fees)}</li>)}
          </ul>
          {amountsAreDraft(label.points, fees) && (
            <p className="procedure-fees-draft" role="note">
              Сумма черновая — её ещё проверяет юрист.
            </p>
          )}
          {label.timing && <p className="procedure-stage-timing">{label.timing}</p>}
        </section>
      )}

      <ol className="procedure-list manager-steps">
        {steps.map((step, index) => (
          <ManagerStepCard
            key={step.key}
            step={step}
            number={index + 1}
            current={step === next}
            fees={fees}
            stage={stage}
            onSave={save}
          />
        ))}
      </ol>

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

function ManagerStepCard({
  step,
  number,
  current,
  fees,
  stage,
  onSave,
}: {
  step: ManagerStep;
  number: number;
  current: boolean;
  fees: FeeScheduleView | null;
  stage: JourneyStageView;
  onSave: (input: RecordStageInput) => Promise<void>;
}) {
  const cardClass = [
    'procedure-stage',
    current ? 'procedure-stage-current' : '',
    step.done ? 'procedure-stage-done' : '',
  ].filter(Boolean).join(' ');

  return (
    <li className={cardClass}>
      <span className="procedure-stage-head">
        <span className="procedure-stage-title">
          <span className="manager-step-number">{number}</span>
          {step.title}
          {current && <span className="procedure-current-badge">Сейчас</span>}
        </span>
        <span
          className={`procedure-status procedure-status-${step.done ? 'done' : 'not-started'}`}
        >
          {step.done ? STATUS_LABELS.DONE.title : STATUS_LABELS.NOT_STARTED.title}
        </span>
      </span>
      <p className="check-hint procedure-stage-desc">{fillAmounts(step.description, fees)}</p>
      {step.route && step.linkLabel && (
        <Link to={step.route} className="procedure-detail-link" state={{ back: '/manager' }}>
          {step.linkLabel} →
        </Link>
      )}
      {/* The appointment step is the journey stage itself — recorded here, and only while the
          backend says the stage is the user's to record. */}
      {step.key === 'APPOINTMENT' && stage.editable && (
        <StageEditor view={stage} onSave={onSave} submitLabel="Сохранить" />
      )}
    </li>
  );
}
