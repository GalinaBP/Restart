import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { currentCase, getSection, saveSection, sectionsOverview } from '../api/cases';
import type {
  FieldMeta, SectionContent, SectionEntry, SectionIssue, SectionStatus,
} from '../api/cases';
import { CASE_DATA_SECTIONS, sectionLabel } from '../api/labels';
import { issueFor as findIssue, toApi, toForm, type FormEntry } from './sectionForm';
import { SectionField } from './SectionField';

/**
 * One data-collection step. The form is rendered entirely from the backend's field metadata
 * (names, types, required flags) — sections.yml is the single source of truth; this screen adds
 * only labels and input widgets. Saving never blocks: value problems come back as issues and are
 * shown next to the exact field (and entry) they belong to.
 *
 * A clean save moves straight on to the next step in sections.yml order, so the wizard can be
 * filled in one run; the last step (or an unknown order) falls back to the map of steps.
 */

export default function SectionPage() {
  const { sectionKey = '' } = useParams();
  const navigate = useNavigate();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [section, setSection] = useState<SectionContent | null>(null);
  /** Every step of the case, used only to find what comes after this one. */
  const [steps, setSteps] = useState<SectionStatus[]>([]);
  const [entries, setEntries] = useState<FormEntry[]>([{}]);
  const [issues, setIssues] = useState<SectionIssue[]>([]);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  /** A failed SAVE keeps the form and the typed data (AI-004: never silently dropped). */
  const [saveFailed, setSaveFailed] = useState(false);

  // No synchronous setState: the effect calls this directly (lint react-hooks/set-state-in-effect);
  // the retry handler resets the failed flag itself.
  const load = useCallback(async () => {
    try {
      const existing = await currentCase();
      if (!existing) {
        navigate('/journey');
        return;
      }
      setCaseId(existing.id);
      // The overview only drives the «what's next» jump — a failure there must not stop the form.
      const [content, overview] = await Promise.all([
        getSection(existing.id, sectionKey),
        sectionsOverview(existing.id).catch(() => []),
      ]);
      setSection(content);
      setSteps(Array.isArray(overview) ? overview : []);
      // Moving between steps reuses this component: start the new one with a clean slate.
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

  // section.key lags the URL for one render while the next step loads — show the wait, not the
  // step just left behind (its filled fields would read as if the save had not happened).
  if (!section || !caseId || section.key !== sectionKey) {
    return (
      <main className="check">
        <p className="check-question">Секунду…</p>
      </main>
    );
  }

  const label = sectionLabel(section.key);

  // «Дальше» walks the same list the case screen shows, so it can never hand the user a step
  // that screen hides — the later steps are reached from their stage on «Весь путь» instead.
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
      const result = await saveSection(caseId, section.key, payload);
      setIssues(result.issues);
      setSaved(true);
      if (result.issues.length === 0) {
        navigate(nextKey ? `/journey/${nextKey}` : '/journey');
      }
    } catch {
      // Keep the form and everything typed; only tell the user and let them retry the save.
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
      <Link to="/journey" className="check-back">← К списку шагов</Link>
      <h1 className="check-question">{label.title}</h1>
      {label.hint && <p className="check-hint">{label.hint}</p>}
      {label.caution && <p className="section-caution" role="note">{label.caution}</p>}
      {label.help?.map((block) => (
        <details key={block.summary} className="check-fact section-help">
          <summary>{block.summary}</summary>
          <ol className="section-help-steps">
            {block.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          {block.link && (
            <p>
              <a
                className="section-help-link"
                href={block.link.href}
                target="_blank"
                rel="noreferrer"
              >
                {block.link.text}
              </a>
            </p>
          )}
          {block.note && <p>{block.note}</p>}
        </details>
      ))}
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
              className="check-option"
              onClick={() => setEntries((current) => [...current, {}])}
            >
              + {label.entryName ?? 'Добавить'}
            </button>
          </>
        ) : (
          section.fields.map((field) => renderField(field, 0))
        )}
        <button type="submit" className="landing-cta" disabled={pending}>
          {pending ? 'Сохраняем…' : 'Сохранить и дальше'}
        </button>
      </form>
    </main>
  );
}
