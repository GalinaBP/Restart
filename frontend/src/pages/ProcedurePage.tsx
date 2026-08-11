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

const STAGE_SCREENS: Partial<Record<JourneyStageKey, string>> = {
  DOCUMENT_PREPARATION: '/journey',
};

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

function flaggedClaimsSummary(flagged: FlaggedClaim[]): string | null {
  const lateCount = flagged.filter((claim) => claim.late).length;
  const disputedCount = flagged.filter((claim) => claim.disputed).length;
  if (lateCount === 0 && disputedCount === 0) return null;
  const parts: string[] = [];
  if (lateCount > 0) parts.push(`${lateCount} позднее срока`);
  if (disputedCount > 0) parts.push(`${disputedCount} оспаривается`);
  return `Есть требования с пометками: ${parts.join(', ')}`;
}

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

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
      setHearings(Array.isArray(hearingsSection.data) ? hearingsSection.data : null);
      setClaimDeadline(deadline);
      setFiledClaims(Array.isArray(claimsSection.data) ? claimsSection.data : null);
      setCorrespondence(Array.isArray(correspondenceSection.data) ? correspondenceSection.data : null);
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
      {view.stage === 'COURT_DECISION' && upcomingHearing && (
        <p className="procedure-hearing-upcoming">
          Ближайшее заседание: {formatRuDate(upcomingHearing.date)}
          {upcomingHearing.subject ? ` — ${upcomingHearing.subject}` : ''}
        </p>
      )}
      {view.stage === 'MANAGER_SELECTION' && typeof correspondence[0]?.date === 'string' && (
        <p className="procedure-correspondence-latest">
          Последняя запись: {formatRuDate(correspondence[0].date)}
          {correspondence[0].type ? ` — ${correspondence[0].type}` : ''}
        </p>
      )}
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
