import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { currentCase, getSection, saveSection, sectionsOverview } from '../local/case';
import type {
  FieldMeta, SectionContent, SectionEntry, SectionIssue, SectionStatus,
} from '../local/case';
import { CASE_DATA_SECTIONS, sectionLabel } from '../api/labels';
import { issueFor as findIssue, toApi, toForm, type FormEntry } from './sectionForm';
import { SectionField } from './SectionField';
import SectionHelp from './SectionHelp';
import FilingChecklist from './FilingChecklist';
import FilingRoutes from './FilingRoutes';

export default function SectionPage() {
  const { sectionKey = '' } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const back = (state as { back?: string } | null)?.back ?? null;
  const [caseId, setCaseId] = useState<string | null>(null);
  const [section, setSection] = useState<SectionContent | null>(null);
  const [steps, setSteps] = useState<SectionStatus[]>([]);
  const [entries, setEntries] = useState<FormEntry[]>([{}]);
  const [issues, setIssues] = useState<SectionIssue[]>([]);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const existing = await currentCase();
      if (!existing) {
        navigate('/journey');
        return;
      }
      setCaseId(existing.id);
      const [content, overview] = await Promise.all([
        getSection(sectionKey),
        sectionsOverview().catch(() => []),
      ]);
      setSection(content);
      setSteps(Array.isArray(overview) ? overview : []);
      setIssues([]);
      setSaved(false);
      setSaveFailed(false);
      if (content.repeatable) {
        const list = (content.data as SectionEntry[] | null) ?? [];
        setEntries(list.map(toForm));
      } else {
        setEntries([toForm((content.data as SectionEntry | null) ?? undefined)]);
      }
    } catch {
      setFailed(true);
    }
  }, [navigate, sectionKey]);

  useEffect(() => {
    if (!isSignedIn()) {
      navigate('/auth');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: state changes only after await
    void load();
  }, [navigate, load]);

  if (failed) {
    return (
      <main className="check">
        <p className="check-question">Что-то пошло не так</p>
        <button
          type="button"
          className="landing-cta"
          onClick={() => {
            setFailed(false);
            void load();
          }}
        >
          Повторить
        </button>
      </main>
    );
  }

  if (!section || !caseId || section.key !== sectionKey) {
    return (
      <main className="check">
        <p className="check-question">Секунду…</p>
      </main>
    );
  }

  const label = sectionLabel(section.key);

  const ordered = CASE_DATA_SECTIONS.filter((key) => steps.some((s) => s.key === key));
  const position = ordered.indexOf(section.key);
  const nextKey = position >= 0 && position + 1 < ordered.length
    ? ordered[position + 1]
    : null;

  const issueFor = (entryIndex: number | null, field: string): string | undefined =>
    findIssue(issues, section.repeatable, entryIndex, field);

  const setValue = (entryIndex: number, field: string, value: string | boolean) => {
    setSaved(false);
    setEntries((current) =>
      current.map((entry, i) => (i === entryIndex ? { ...entry, [field]: value } : entry)));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setSaveFailed(false);
    try {
      const payload = section.repeatable
        ? entries.map((entry) => toApi(section.fields, entry))
        : toApi(section.fields, entries[0]);
      const result = await saveSection(section.key, payload);
      setIssues(result.issues);
      setSaved(true);
      if (result.issues.length === 0) {
        navigate(back ?? (nextKey ? `/journey/${nextKey}` : '/journey'));
      }
    } catch {
      setSaveFailed(true);
    } finally {
      setPending(false);
    }
  };

  const renderField = (field: FieldMeta, entryIndex: number) => (
    <SectionField
      key={field.name}
      sectionKey={section.key}
      field={field}
      value={entries[entryIndex]?.[field.name]}
      issue={issueFor(section.repeatable ? entryIndex : null, field.name)}
      onChange={(value) => setValue(entryIndex, field.name, value)}
    />
  );

  return (
    <main className="section">
      <header className="journey-header">
        <h1 className="journey-title">{label.title}</h1>
        <Link to={back ?? '/journey'} className="check-back">
          {back ? '← Назад' : '← К делу'}
        </Link>
      </header>
      <p className="check-placeholder" role="note">Черновик — проверяется юристом</p>
      {label.hint && <p className="check-hint">{label.hint}</p>}
      {label.caution && <p className="section-caution" role="note">{label.caution}</p>}
      {section.key === 'FILING_SUBMISSION' && (
        <>
          <FilingChecklist />
          <FilingRoutes />
        </>
      )}
      <SectionHelp blocks={label.help} />
      {saved && issues.length > 0 && (
        <p className="section-saved-note" role="status">
          Сохранили! Осталось поправить пару мест — они подсвечены ниже.
        </p>
      )}
      {saveFailed && (
        <p className="auth-error" role="alert">
          Не получилось сохранить — проверьте интернет и нажмите «Сохранить» ещё раз.
          Всё, что вы ввели, на месте.
        </p>
      )}
      <form className="auth-form section-form" onSubmit={(e) => void submit(e)}>
        {section.repeatable ? (
          <>
            {entries.map((_, index) => (
              <fieldset key={index} className="section-entry">
                <div className="section-entry-head">
                  <span>№ {index + 1}</span>
                  <button
                    type="button"
                    className="check-back"
                    onClick={() => {
                      setSaved(false);
                      setIssues([]);
                      setEntries((current) => current.filter((_, i) => i !== index));
                    }}
                  >
                    Убрать
                  </button>
                </div>
                {section.fields.map((field) => renderField(field, index))}
              </fieldset>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEntries((current) => [...current, {}])}
            >
              + {label.entryName ?? 'Добавить'}
            </button>
          </>
        ) : (
          section.fields.map((field) => renderField(field, 0))
        )}
        <button type="submit" className="landing-cta" disabled={pending}>
          {pending
            ? 'Сохраняем…'
            : (label.submitLabel ?? (back ? 'Сохранить' : 'Сохранить и дальше'))}
        </button>
      </form>
    </main>
  );
}
