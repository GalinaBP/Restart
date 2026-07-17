import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { currentCase, getSection, saveSection } from '../api/cases';
import type { FieldMeta, SectionContent, SectionEntry, SectionIssue } from '../api/cases';
import { fieldLabel, sectionLabel } from '../api/labels';

/**
 * One data-collection step. The form is rendered entirely from the backend's field metadata
 * (names, types, required flags) — sections.yml is the single source of truth; this screen adds
 * only labels and input widgets. Saving never blocks: value problems come back as issues and are
 * shown next to the exact field (and entry) they belong to.
 */

/** Form-side value: text inputs keep strings, booleans keep booleans. */
type FormEntry = Record<string, string | boolean>;

function toForm(entry: SectionEntry | undefined): FormEntry {
  const form: FormEntry = {};
  if (entry) {
    for (const [key, value] of Object.entries(entry)) {
      form[key] = typeof value === 'boolean' ? value : String(value);
    }
  }
  return form;
}

/** Converts one form entry back to API values per field type; blank optional fields are omitted. */
function toApi(fields: FieldMeta[], form: FormEntry): SectionEntry {
  const entry: SectionEntry = {};
  for (const field of fields) {
    const raw = form[field.name];
    if (field.type === 'BOOLEAN') {
      if (raw === true) entry[field.name] = true;
      else if (raw === false) entry[field.name] = false;
      continue;
    }
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (text === '') continue;
    if (field.type === 'MONEY' || field.type === 'INTEGER') {
      const parsed = Number(text.replace(/\s/g, '').replace(',', '.'));
      entry[field.name] = Number.isNaN(parsed) ? text : parsed;
    } else {
      entry[field.name] = text;
    }
  }
  return entry;
}

function inputType(field: FieldMeta): { type: string; inputMode?: 'numeric' | 'decimal' } {
  switch (field.type) {
    case 'DATE':
      return { type: 'date' };
    case 'MONEY':
      return { type: 'text', inputMode: 'decimal' };
    case 'INTEGER':
    case 'PASSPORT_SERIES':
    case 'PASSPORT_NUMBER':
    case 'INN':
      return { type: 'text', inputMode: 'numeric' };
    default:
      return { type: 'text' };
  }
}

export default function SectionPage() {
  const { sectionKey = '' } = useParams();
  const navigate = useNavigate();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [section, setSection] = useState<SectionContent | null>(null);
  const [entries, setEntries] = useState<FormEntry[]>([{}]);
  const [issues, setIssues] = useState<SectionIssue[]>([]);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

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
      const content = await getSection(existing.id, sectionKey);
      setSection(content);
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
        <p className="check-question">Что-то пошло не так 😔</p>
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

  if (!section || !caseId) {
    return (
      <main className="check">
        <p className="check-question">Секунду…</p>
      </main>
    );
  }

  const label = sectionLabel(section.key);

  const issueFor = (entryIndex: number | null, field: string): string | undefined =>
    issues.find((i) => i.field === field
      && (section.repeatable ? i.entryIndex === entryIndex : true))?.message;

  const setValue = (entryIndex: number, field: string, value: string | boolean) => {
    setSaved(false);
    setEntries((current) =>
      current.map((entry, i) => (i === entryIndex ? { ...entry, [field]: value } : entry)));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setFailed(false);
    try {
      const payload = section.repeatable
        ? entries.map((entry) => toApi(section.fields, entry))
        : toApi(section.fields, entries[0]);
      const result = await saveSection(caseId, section.key, payload);
      setIssues(result.issues);
      setSaved(true);
      if (result.issues.length === 0) {
        navigate('/journey');
      }
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  const renderField = (field: FieldMeta, entryIndex: number) => {
    const value = entries[entryIndex]?.[field.name];
    const issue = issueFor(section.repeatable ? entryIndex : null, field.name);
    if (field.type === 'BOOLEAN') {
      return (
        <label key={field.name} className="section-bool">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => setValue(entryIndex, field.name, e.target.checked)}
          />
          {fieldLabel(section.key, field.name)}
        </label>
      );
    }
    const widget = inputType(field);
    return (
      <label key={field.name} className="auth-label">
        {fieldLabel(section.key, field.name)}
        <input
          className={`auth-input${issue ? ' section-input-invalid' : ''}`}
          type={widget.type}
          inputMode={widget.inputMode}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setValue(entryIndex, field.name, e.target.value)}
        />
        {issue && <span className="auth-error" role="alert">{issue}</span>}
      </label>
    );
  };

  return (
    <main className="section">
      <Link to="/journey" className="check-back">← К списку шагов</Link>
      <p className="check-emoji" aria-hidden="true">{label.emoji}</p>
      <h1 className="check-question">{label.title}</h1>
      {label.hint && <p className="check-hint">{label.hint}</p>}
      {saved && issues.length > 0 && (
        <p className="section-saved-note" role="status">
          Сохранили! Осталось поправить пару мест — они подсвечены ниже.
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
