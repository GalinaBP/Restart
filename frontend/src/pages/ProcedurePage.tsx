import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { currentCase } from '../api/cases';
import {
  getFees,
  getJourney,
  recordProcedureType,
  recordStage,
  type FeeScheduleView,
  type JourneyStageKey,
  type JourneyStageView,
  type JourneyView,
  type ProcedureBranch,
  type RecordStageInput,
  type StageStatusKey,
} from '../api/procedure';
import { BLOCKED_EXPLANATION, PROCEDURE_LABELS, STATUS_LABELS, stageLabel } from '../api/labels';

/**
 * The stage overview (backlog AI-019): every stage of the court procedure in order, with the
 * current one highlighted and a plain-language description of each. Some stages are derived from
 * the case data itself — screening, document preparation, since AI-021 the fees stage (follows
 * the payments step) and since AI-022 the filing stage (follows the submission step) — and
 * cannot be recorded by hand: the backend refuses that with a 409, and this screen never offers
 * the control in the first place.
 */

/**
 * Stages that already have a screen of their own. The later tickets of this epic
 * (AI-023…AI-029) add theirs here as they land; a stage missing from this map simply expands in
 * place instead of dead-ending on a click.
 */
const STAGE_DETAILS: Partial<Record<JourneyStageKey, { route: string; label: string }>> = {
  MANAGER_SELECTION: { route: '/journey/MANAGER_SRO', label: 'Указать организацию' },
  FEES_AND_DEPOSIT: { route: '/journey/PAYMENTS', label: 'Отметить оплату' },
  FILING: { route: '/journey/FILING_SUBMISSION', label: 'Отметить подачу' },
};

export default function ProcedurePage() {
  const navigate = useNavigate();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [journey, setJourney] = useState<JourneyView | null>(null);
  const [fees, setFees] = useState<FeeScheduleView | null>(null);
  const [expanded, setExpanded] = useState<JourneyStageKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Deliberately no synchronous setState here: the effect calls this directly, and the initial
  // state already is "loading". Retry handlers reset the flags themselves before calling.
  const load = useCallback(async () => {
    try {
      const existing = await currentCase();
      if (!existing) {
        navigate('/journey');
        return;
      }
      setCaseId(existing.id);
      const [view, feeSchedule] = await Promise.all([
        getJourney(existing.id),
        getFees(existing.id),
      ]);
      setJourney(view);
      setFees(feeSchedule);
      // Open the one stage that needs attention right now, when it has something to fill in.
      const current = view.stages.find((s) => s.current && s.editable);
      if (current) setExpanded(current.stage);
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

  const save = async (stage: JourneyStageKey, input: RecordStageInput) => {
    if (!caseId) return;
    const updated = await recordStage(caseId, stage, input);
    setJourney(updated);
    setExpanded(null);
  };

  /** Records (or corrects, or clears) the court's decision and reveals that branch. */
  const chooseProcedure = async (procedureType: ProcedureBranch | null) => {
    if (!caseId) return;
    setJourney(await recordProcedureType(caseId, procedureType));
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

  if (!journey) {
    return null;
  }

  const currentTitle = journey.currentStage ? stageLabel(journey.currentStage).title : null;

  return (
    <main className="journey">
      <header className="journey-header">
        <h1 className="journey-title">Весь путь</h1>
        <Link to="/journey" className="check-back">← К шагам</Link>
      </header>
      <p className="check-placeholder" role="note">Черновик — проверяется юристом</p>
      <p className="check-hint">
        {currentTitle
          ? `Сейчас вы здесь: «${currentTitle}». Остальные этапы идут дальше по порядку.`
          : 'Все этапы пройдены.'}
      </p>
      {journey.procedureType && (
        <p className="procedure-branch-note">
          Ваша процедура: {PROCEDURE_LABELS[journey.procedureType].title}
        </p>
      )}
      <ul className="procedure-list">
        {journey.stages.map((view) => (
          <StageCard
            key={view.stage}
            view={view}
            expanded={expanded === view.stage}
            onToggle={() => setExpanded(expanded === view.stage ? null : view.stage)}
            onSave={(input) => save(view.stage, input)}
            fees={fees}
            procedureType={journey.procedureType}
            onChooseProcedure={chooseProcedure}
          />
        ))}
      </ul>
    </main>
  );
}

function StageCard({
  view,
  expanded,
  onToggle,
  onSave,
  fees,
  procedureType,
  onChooseProcedure,
}: {
  view: JourneyStageView;
  expanded: boolean;
  onToggle: () => void;
  onSave: (input: RecordStageInput) => Promise<void>;
  fees: FeeScheduleView | null;
  procedureType: ProcedureBranch | null;
  onChooseProcedure: (procedureType: ProcedureBranch | null) => Promise<void>;
}) {
  const label = stageLabel(view.stage);
  const status = STATUS_LABELS[view.status];
  const detail = STAGE_DETAILS[view.stage];
  const cardClass = [
    'procedure-stage',
    view.current ? 'procedure-stage-current' : '',
    view.status === 'DONE' ? 'procedure-stage-done' : '',
  ].filter(Boolean).join(' ');
  const statusClass = `procedure-status procedure-status-${view.status.toLowerCase().replace(/_/g, '-')}`;

  const head = (
    <span className="procedure-stage-head">
      <span className="procedure-stage-title">
        {label.title}
        {view.current && <span className="procedure-current-badge">Сейчас</span>}
      </span>
      <span className={statusClass}>{status.title}</span>
    </span>
  );

  // DOCUMENT_PREPARATION already has a screen of its own — send the user straight there rather
  // than offering a dead-end expansion.
  if (view.stage === 'DOCUMENT_PREPARATION') {
    return (
      <li>
        <Link to="/journey" className={cardClass}>
          {head}
          <p className="check-hint procedure-stage-desc">{label.description}</p>
        </Link>
      </li>
    );
  }

  // Derived stages mirror the case data — nothing here to set by hand — but some still have a
  // screen that feeds them: «Пошлина и депозит» follows the payments step, «Подача в суд»
  // follows the submission step.
  if (!view.editable) {
    return (
      <li className={cardClass}>
        {head}
        <p className="check-hint procedure-stage-desc">{label.description}</p>
        {view.stage === 'FEES_AND_DEPOSIT' && fees && <FeeBreakdown fees={fees} />}
        {detail && (
          <Link to={detail.route} className="procedure-detail-link">{detail.label} →</Link>
        )}
      </li>
    );
  }

  return (
    <li className={cardClass}>
      <button type="button" className="procedure-stage-toggle" aria-expanded={expanded} onClick={onToggle}>
        {head}
      </button>
      {expanded && (
        <div className="procedure-stage-body">
          <p className="check-hint procedure-stage-desc">{label.description}</p>
          {view.status === 'BLOCKED' && <p className="procedure-blocked-note">{BLOCKED_EXPLANATION}</p>}
          {detail && (
            <Link to={detail.route} className="procedure-detail-link">{detail.label} →</Link>
          )}
          {view.stage === 'COURT_DECISION' && (
            <ProcedurePicker chosen={procedureType} onChoose={onChooseProcedure} />
          )}
          <StageEditor view={view} onSave={onSave} />
        </div>
      )}
    </li>
  );
}

/**
 * Records which procedure the court applied (backlog AI-024), revealing that branch of the
 * journey and hiding the other two. Correctable, and clearable back to «ещё не решено»: the app
 * never guesses the outcome, and a user who recorded the wrong one must be able to fix it.
 */
function ProcedurePicker({
  chosen,
  onChoose,
}: {
  chosen: ProcedureBranch | null;
  onChoose: (procedureType: ProcedureBranch | null) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const choose = async (value: ProcedureBranch | null) => {
    setPending(true);
    setFailed(false);
    try {
      await onChoose(value);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  const options: ProcedureBranch[] = ['RESTRUCTURING', 'REALIZATION', 'SETTLEMENT'];

  return (
    <div className="procedure-picker">
      <p className="procedure-picker-lead">
        {chosen
          ? 'Суд назначил эту процедуру. Если здесь ошибка — выберите другую.'
          : 'Когда суд решит, какая процедура будет по вашему делу, отметьте её — дальше покажем шаги именно этой процедуры.'}
      </p>
      <ul className="procedure-picker-options">
        {options.map((option) => (
          <li key={option}>
            <button
              type="button"
              className={`check-option${chosen === option ? ' check-option-selected' : ''}`}
              disabled={pending}
              onClick={() => void choose(option)}
            >
              <span className="procedure-picker-title">{PROCEDURE_LABELS[option].title}</span>
              <span className="procedure-picker-hint">{PROCEDURE_LABELS[option].hint}</span>
            </button>
          </li>
        ))}
      </ul>
      {chosen && (
        <button
          type="button"
          className="check-back"
          disabled={pending}
          onClick={() => void choose(null)}
        >
          Ещё не решено — убрать отметку
        </button>
      )}
      {failed && (
        <p className="auth-error" role="alert">
          Не получилось сохранить — проверьте интернет и попробуйте ещё раз.
        </p>
      )}
    </div>
  );
}

/**
 * What the filing costs (backlog AI-021). While any amount is still an unreviewed placeholder the
 * figures are labelled a draft and the user is sent to the court's own site — this is the one
 * screen where a wrong number costs real money.
 */
function FeeBreakdown({ fees }: { fees: FeeScheduleView }) {
  const money = (value: number) =>
    value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const line = (item: 'STATE_DUTY' | 'MANAGER_DEPOSIT') =>
    fees.lines.find((l) => l.item === item);
  const duty = line('STATE_DUTY');
  const deposit = line('MANAGER_DEPOSIT');

  return (
    <div className="procedure-fees">
      <dl className="procedure-fees-list">
        {duty && (
          <>
            <dt>Пошлина</dt>
            <dd>{money(duty.amount)} ₽</dd>
          </>
        )}
        {deposit && (
          <>
            <dt>Депозит на управляющего</dt>
            <dd>{money(deposit.amount)} ₽</dd>
          </>
        )}
        <dt className="procedure-fees-total">Всего</dt>
        <dd className="procedure-fees-total">{money(fees.total)} ₽</dd>
      </dl>
      {!fees.allConfirmed && (
        <p className="procedure-fees-draft" role="note">
          Суммы черновые — их ещё проверяет юрист. Перед оплатой сверьте суммы и реквизиты
          на сайте вашего суда.
        </p>
      )}
    </div>
  );
}

function StageEditor({
  view,
  onSave,
}: {
  view: JourneyStageView;
  onSave: (input: RecordStageInput) => Promise<void>;
}) {
  const [status, setStatus] = useState<StageStatusKey>(view.status);
  const [startedOn, setStartedOn] = useState(view.startedOn ?? '');
  const [completedOn, setCompletedOn] = useState(view.completedOn ?? '');
  const [note, setNote] = useState(view.note ?? '');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setFailed(false);
    try {
      await onSave({
        status,
        startedOn: startedOn || null,
        completedOn: completedOn || null,
        note: note.trim() === '' ? null : note.trim(),
      });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="procedure-form" onSubmit={(e) => void submit(e)}>
      <label className="auth-label">
        Статус
        <select
          className="auth-input"
          value={status}
          onChange={(e) => setStatus(e.target.value as StageStatusKey)}
        >
          <option value="NOT_STARTED">{STATUS_LABELS.NOT_STARTED.title}</option>
          <option value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS.title}</option>
          <option value="DONE">{STATUS_LABELS.DONE.title}</option>
          <option value="BLOCKED">{STATUS_LABELS.BLOCKED.title}</option>
        </select>
      </label>
      <label className="auth-label">
        Начали (не обязательно)
        <input
          className="auth-input"
          type="date"
          value={startedOn}
          onChange={(e) => setStartedOn(e.target.value)}
        />
      </label>
      <label className="auth-label">
        Закончили (не обязательно)
        <input
          className="auth-input"
          type="date"
          value={completedOn}
          onChange={(e) => setCompletedOn(e.target.value)}
        />
      </label>
      <label className="auth-label">
        Заметка (не обязательно)
        <textarea
          className="auth-input procedure-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {failed && (
        <p className="auth-error" role="alert">
          Не получилось сохранить — проверьте интернет и попробуйте ещё раз.
        </p>
      )}
      <button type="submit" className="landing-cta procedure-save" disabled={pending}>
        {pending ? 'Сохраняем…' : 'Записать'}
      </button>
    </form>
  );
}
