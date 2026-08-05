import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { currentCase, getSection, type SectionEntry } from '../api/cases';
import {
  getClaimDeadline,
  getFees,
  getJourney,
  recordProcedureType,
  recordStage,
  type ClaimDeadlineView,
  type FeeScheduleView,
  type JourneyStageKey,
  type JourneyStageView,
  type JourneyView,
  type ProcedureBranch,
  type RecordStageInput,
} from '../api/procedure';
import { BLOCKED_EXPLANATION, PROCEDURE_LABELS, STATUS_LABELS, stageLabel } from '../api/labels';
import { nextUpcomingHearing, type UpcomingHearing } from './nextUpcomingHearing';
import { flagClaims, type FlaggedClaim } from './flagClaims';
import { sortCorrespondence } from './sortCorrespondence';
import StageEditor from './StageEditor';

/**
 * The stage overview (backlog AI-019): every stage of the court procedure in order, with the
 * current one highlighted and a plain-language description of each. Some stages are derived from
 * the case data itself — screening, document preparation, since AI-021 the fees stage (follows
 * the payments step) and since AI-022 the filing stage (follows the submission step) — and
 * cannot be recorded by hand: the backend refuses that with a 409, and this screen never offers
 * the control in the first place.
 */

/**
 * Stages big enough to be a screen of their own: the card links straight there instead of
 * expanding, because the stage is a whole flow rather than one toggle. «Подготовка документов» is
 * the questionnaire. «Поиск финансового управляющего» has a screen too, but only for its one
 * action — the rest of that stage (its status, the correspondence journal) is recorded here, so
 * its card stays an ordinary expandable one with a link inside.
 */
const STAGE_SCREENS: Partial<Record<JourneyStageKey, string>> = {
  DOCUMENT_PREPARATION: '/journey',
};

/**
 * Stages that already have a screen of their own. The later tickets of this epic
 * (AI-025…AI-029) add theirs here as they land; a stage missing from this map simply expands in
 * place instead of dead-ending on a click. A stage may link to more than one screen (AI-023:
 * COURT_DECISION links both to the case's court details and to its hearings).
 */
/**
 * Stages this screen does not ask the user to record by hand: their card only points at the
 * screen that owns the stage, and offering a status form next to that link asked the same person
 * for the same thing twice. The backend still marks them editable — this is a UI decision.
 */
const STAGES_WITHOUT_RECORDING: JourneyStageKey[] = ['MANAGER_SELECTION'];

const STAGE_DETAILS: Partial<Record<JourneyStageKey, { route: string; label: string }[]>> = {
  MANAGER_SELECTION: [{ route: '/manager', label: 'Начать' }],
  FEES_AND_DEPOSIT: [{ route: '/journey/PAYMENTS', label: 'Отметить оплату' }],
  FILING: [{ route: '/journey/FILING_SUBMISSION', label: 'Отметить подачу' }],
  COURT_DECISION: [
    { route: '/journey/COURT_CASE', label: 'Дело в суде' },
    { route: '/journey/COURT_HEARINGS', label: 'Заседания' },
  ],
  CREDITOR_CLAIMS: [
    { route: '/journey/EFRSB_PUBLICATION', label: 'Публикация в реестре' },
    { route: '/journey/FILED_CLAIMS', label: 'Требования кредиторов' },
  ],
};

/** «1 позднее срока, 1 оспаривается» — calm, count-based, never alarming (backlog AI-025). */
function flaggedClaimsSummary(flagged: FlaggedClaim[]): string | null {
  const lateCount = flagged.filter((claim) => claim.late).length;
  const disputedCount = flagged.filter((claim) => claim.disputed).length;
  if (lateCount === 0 && disputedCount === 0) return null;
  const parts: string[] = [];
  if (lateCount > 0) parts.push(`${lateCount} позднее срока`);
  if (disputedCount > 0) parts.push(`${disputedCount} оспаривается`);
  return `Есть требования с пометками: ${parts.join(', ')}`;
}

/** Today as a local 'YYYY-MM-DD' string — matches the plain ISO dates the backend stores, and
 *  sidesteps the timezone traps of comparing `Date` objects. */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** 'YYYY-MM-DD' → 'DD.MM.YYYY', the date format used everywhere else in the app. */
function formatRuDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

export default function ProcedurePage() {
  const navigate = useNavigate();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [journey, setJourney] = useState<JourneyView | null>(null);
  const [fees, setFees] = useState<FeeScheduleView | null>(null);
  const [hearings, setHearings] = useState<SectionEntry[] | null>(null);
  const [claimDeadline, setClaimDeadline] = useState<ClaimDeadlineView | null>(null);
  const [filedClaims, setFiledClaims] = useState<SectionEntry[] | null>(null);
  const [correspondence, setCorrespondence] = useState<SectionEntry[] | null>(null);
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
      const [view, feeSchedule, hearingsSection, deadline, claimsSection, correspondenceSection] = await Promise.all([
        getJourney(existing.id),
        getFees(existing.id),
        getSection(existing.id, 'COURT_HEARINGS'),
        getClaimDeadline(existing.id),
        getSection(existing.id, 'FILED_CLAIMS'),
        getSection(existing.id, 'MANAGER_CORRESPONDENCE'),
      ]);
      setJourney(view);
      setFees(feeSchedule);
      // No hearing recorded yet is the common case for months of the process — guard for it.
      setHearings(Array.isArray(hearingsSection.data) ? hearingsSection.data : null);
      setClaimDeadline(deadline);
      // No claim filed yet is the common case early in the procedure — guard for it.
      setFiledClaims(Array.isArray(claimsSection.data) ? claimsSection.data : null);
      // No correspondence recorded yet is the common case — guard for it.
      setCorrespondence(Array.isArray(correspondenceSection.data) ? correspondenceSection.data : null);
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
  const upcomingHearing = nextUpcomingHearing(hearings, todayIso());
  const flaggedClaims = flagClaims(filedClaims, claimDeadline?.deadlineDate ?? null);
  const sortedCorrespondence = sortCorrespondence(correspondence);

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
            upcomingHearing={upcomingHearing}
            claimDeadline={claimDeadline}
            flaggedClaims={flaggedClaims}
            correspondence={sortedCorrespondence}
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
  upcomingHearing,
  claimDeadline,
  flaggedClaims,
  correspondence,
  procedureType,
  onChooseProcedure,
}: {
  view: JourneyStageView;
  expanded: boolean;
  onToggle: () => void;
  onSave: (input: RecordStageInput) => Promise<void>;
  fees: FeeScheduleView | null;
  upcomingHearing: UpcomingHearing | null;
  claimDeadline: ClaimDeadlineView | null;
  flaggedClaims: FlaggedClaim[];
  correspondence: SectionEntry[];
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
  const claimsSummary = view.stage === 'CREDITOR_CLAIMS' ? flaggedClaimsSummary(flaggedClaims) : null;

  const head = (
    <span className="procedure-stage-head">
      <span className="procedure-stage-title">
        {label.title}
        {view.current && <span className="procedure-current-badge">Сейчас</span>}
      </span>
      <span className={statusClass}>{status.title}</span>
    </span>
  );

  // A stage whose whole flow is a screen of its own — send the user straight there rather than
  // offering a dead-end expansion.
  const screen = STAGE_SCREENS[view.stage];
  if (screen) {
    return (
      <li>
        <Link to={screen} className={cardClass}>
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
        {label.timing && <p className="procedure-stage-timing">{label.timing}</p>}
        {view.stage === 'FEES_AND_DEPOSIT' && fees && <FeeBreakdown fees={fees} />}
        {detail?.map((d) => (
          <Link key={d.route} to={d.route} className="procedure-detail-link">{d.label} →</Link>
        ))}
      </li>
    );
  }

  return (
    <li className={cardClass}>
      <button type="button" className="procedure-stage-toggle" aria-expanded={expanded} onClick={onToggle}>
        {head}
      </button>
      {/* Prominent even collapsed (backlog AI-023): a months-long court process must not let an
          upcoming hearing date get lost. */}
      {view.stage === 'COURT_DECISION' && upcomingHearing && (
        <p className="procedure-hearing-upcoming">
          Ближайшее заседание: {formatRuDate(upcomingHearing.date)}
          {upcomingHearing.subject ? ` — ${upcomingHearing.subject}` : ''}
        </p>
      )}
      {/* Prominent even collapsed, mirroring the hearing line above (backlog AI-026): the most
          recent manager correspondence must not get lost over the months a procedure takes.
          Shown only when at least one entry has been recorded. */}
      {view.stage === 'MANAGER_SELECTION' && typeof correspondence[0]?.date === 'string' && (
        <p className="procedure-correspondence-latest">
          Последняя запись: {formatRuDate(correspondence[0].date)}
          {correspondence[0].type ? ` — ${correspondence[0].type}` : ''}
        </p>
      )}
      {/* Prominent even collapsed, mirroring the hearing line above (backlog AI-025): the
          deadline for creditors to file their claims must not get lost over the months a
          procedure takes. Shown only once a publication date makes it computable. */}
      {view.stage === 'CREDITOR_CLAIMS' && claimDeadline?.deadlineDate && (
        <p className="procedure-claim-deadline">
          Срок предъявления требований: {formatRuDate(claimDeadline.deadlineDate)}
        </p>
      )}
      {view.stage === 'CREDITOR_CLAIMS' && claimDeadline?.deadlineDate && !claimDeadline.confirmed && (
        <p className="procedure-claim-deadline-draft" role="note">
          Срок черновой, уточните на сайте суда/в реестре.
        </p>
      )}
      {view.stage === 'CREDITOR_CLAIMS' && claimsSummary && (
        <p className="procedure-claims-flagged">{claimsSummary}</p>
      )}
      {expanded && (
        <div className="procedure-stage-body">
          <p className="check-hint procedure-stage-desc">{label.description}</p>
          {label.timing && <p className="procedure-stage-timing">{label.timing}</p>}
          {view.status === 'BLOCKED' && <p className="procedure-blocked-note">{BLOCKED_EXPLANATION}</p>}
          {detail?.map((d) => (
            <Link key={d.route} to={d.route} className="procedure-detail-link">{d.label} →</Link>
          ))}
          {view.stage === 'COURT_DECISION' && (
            <ProcedurePicker chosen={procedureType} onChoose={onChooseProcedure} />
          )}
          {!STAGES_WITHOUT_RECORDING.includes(view.stage) && (
            <StageEditor view={view} onSave={onSave} />
          )}
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
