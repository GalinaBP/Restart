import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { currentCase, getSection, saveSection } from '../api/cases';
import type { SectionContent, SectionEntry, SectionIssue } from '../api/cases';
import { CASE_DATA_SECTIONS, sectionLabel } from '../api/labels';
import { issueFor, toApi, toForm, type FormEntry } from './sectionForm';
import { SectionField } from './SectionField';

/**
 * «Информация о вас» as one page: every data section on a single screen, a progress bar counting
 * the filled ones, and one save at the bottom. The step-by-step wizard stays for anyone arriving
 * at a single section — this screen is for filling the whole thing in one sitting.
 *
 * Only sections whose values actually changed are sent, one after another: each save regenerates
 * the documents on the backend, so firing all thirteen at once would be wasteful and racy.
 */

/** Everything loaded for one section, plus the form state edited on top of it. */
interface Block {
  content: SectionContent;
  entries: FormEntry[];
  /** Serialised payload as loaded, to tell a real edit from an untouched section on save. */
  pristine: string;
}

function payloadOf(block: Block): SectionEntry | SectionEntry[] {
  return block.content.repeatable
    ? block.entries.map((entry) => toApi(block.content.fields, entry))
    : toApi(block.content.fields, block.entries[0] ?? {});
}

function blockOf(content: SectionContent): Block {
  const entries = content.repeatable
    ? ((content.data as SectionEntry[] | null) ?? []).map(toForm)
    : [toForm((content.data as SectionEntry | null) ?? undefined)];
  const block: Block = { content, entries, pristine: '' };
  block.pristine = JSON.stringify(payloadOf(block));
  return block;
}

/** A section counts as filled once it holds any value at all — same rule as the case screen. */
function isFilled(block: Block): boolean {
  const payload = payloadOf(block);
  return Array.isArray(payload)
    ? payload.length > 0
    : Object.keys(payload).length > 0;
}

export default function AboutYouPage() {
  const navigate = useNavigate();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [issues, setIssues] = useState<Record<string, SectionIssue[]>>({});
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const existing = await currentCase();
      if (!existing) {
        navigate('/journey');
        return;
      }
      const loaded = await Promise.all(
        CASE_DATA_SECTIONS.map((key) => getSection(existing.id, key)),
      );
      setCaseId(existing.id);
      setBlocks(loaded.map(blockOf));
      setIssues({});
      setSaved(false);
      setSaveFailed(false);
    } catch {
      setFailed(true);
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

  if (!blocks || !caseId) {
    return (
      <main className="check">
        <p className="check-question">Секунду…</p>
      </main>
    );
  }

  const filled = blocks.filter(isFilled).length;
  const total = blocks.length;

  const edit = (sectionKey: string, entryIndex: number, field: string, value: string | boolean) => {
    setSaved(false);
    setBlocks((current) => current?.map((block) => (block.content.key === sectionKey
      ? {
        ...block,
        entries: block.entries.map((entry, i) => (i === entryIndex ? { ...entry, [field]: value } : entry)),
      }
      : block)) ?? null);
  };

  const changeEntries = (sectionKey: string, next: (entries: FormEntry[]) => FormEntry[]) => {
    setSaved(false);
    setBlocks((current) => current?.map((block) => (block.content.key === sectionKey
      ? { ...block, entries: next(block.entries) }
      : block)) ?? null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setSaveFailed(false);
    try {
      const collected: Record<string, SectionIssue[]> = {};
      const updated: Block[] = [];
      // Sequential on purpose: every save regenerates the документы on the backend.
      for (const block of blocks) {
        const payload = payloadOf(block);
        if (JSON.stringify(payload) === block.pristine) {
          updated.push(block);
          continue;
        }
        const result = await saveSection(caseId, block.content.key, payload);
        if (result.issues.length > 0) collected[block.content.key] = result.issues;
        updated.push({ ...block, content: result, pristine: JSON.stringify(payload) });
      }
      setBlocks(updated);
      setIssues(collected);
      setSaved(true);
      if (Object.keys(collected).length === 0) {
        navigate('/journey');
      }
    } catch {
      // Keep the form and everything typed; only tell the user and let them retry the save.
      setSaveFailed(true);
    } finally {
      setPending(false);
    }
  };

  const problemCount = Object.values(issues).reduce((sum, list) => sum + list.length, 0);

  return (
    <main className="section about-you">
      <Link to="/journey" className="check-back">← К делу</Link>
      <h1 className="check-question">Информация о вас</h1>
      <p className="check-hint">
        Вопросы о вас, долгах и доходах — на основании них мы подготовим документы для суда.
        Заполняйте в любом порядке, всё сохранится разом.
      </p>

      <p className="about-you-progress-label" role="status">Заполнено {filled} из {total}</p>
      <div className="journey-progress" aria-label={`Заполнено ${filled} из ${total}`}>
        <div className="check-progress-fill" style={{ width: `${total ? (filled / total) * 100 : 0}%` }} />
      </div>

      {saved && problemCount > 0 && (
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
        {blocks.map((block) => {
          const key = block.content.key;
          const label = sectionLabel(key);
          const sectionIssues = issues[key] ?? [];
          return (
            <section key={key} className="about-you-block">
              <h2 className="about-you-block-title">{label.title}</h2>
              {label.hint && <p className="check-hint">{label.hint}</p>}
              {label.caution && <p className="section-caution" role="note">{label.caution}</p>}
              {label.help?.map((help) => (
                <details key={help.summary} className="check-fact section-help">
                  <summary>{help.summary}</summary>
                  <ol className="section-help-steps">
                    {help.steps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                  {help.link && (
                    <p>
                      <a
                        className="section-help-link"
                        href={help.link.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {help.link.text}
                      </a>
                    </p>
                  )}
                  {help.note && <p>{help.note}</p>}
                </details>
              ))}

              {block.content.repeatable ? (
                <>
                  {block.entries.map((_, index) => (
                    <fieldset key={index} className="section-entry">
                      <div className="section-entry-head">
                        <span>№ {index + 1}</span>
                        <button
                          type="button"
                          className="check-back"
                          onClick={() => changeEntries(key, (entries) => entries.filter((_, i) => i !== index))}
                        >
                          Убрать
                        </button>
                      </div>
                      {block.content.fields.map((field) => (
                        <SectionField
                          key={field.name}
                          sectionKey={key}
                          field={field}
                          value={block.entries[index]?.[field.name]}
                          issue={issueFor(sectionIssues, true, index, field.name)}
                          onChange={(value) => edit(key, index, field.name, value)}
                        />
                      ))}
                    </fieldset>
                  ))}
                  <button
                    type="button"
                    className="check-option"
                    onClick={() => changeEntries(key, (entries) => [...entries, {}])}
                  >
                    + {label.entryName ?? 'Добавить'}
                  </button>
                </>
              ) : (
                block.content.fields.map((field) => (
                  <SectionField
                    key={field.name}
                    sectionKey={key}
                    field={field}
                    value={block.entries[0]?.[field.name]}
                    issue={issueFor(sectionIssues, false, null, field.name)}
                    onChange={(value) => edit(key, 0, field.name, value)}
                  />
                ))
              )}
            </section>
          );
        })}

        <button type="submit" className="landing-cta" disabled={pending}>
          {pending ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>
    </main>
  );
}
