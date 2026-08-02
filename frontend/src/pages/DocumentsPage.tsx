import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { currentCase } from '../api/cases';
import { ApiError } from '../api/client';
import {
  downloadDocument,
  exportPackage,
  generateDocuments,
  listDocuments,
  saveBlob,
  type DocumentMeta,
} from '../api/documents';
import { documentLabel, fieldLabel, sectionLabel } from '../api/labels';
import type { MissingItem } from '../api/types';

/**
 * The finish line: build the filing package and download it. Generation may refuse (the backend's
 * hard gate) — then the missing items are shown as links straight to the step that fixes each one.
 * Stale documents (data changed while invalid) get one honest banner and one button.
 */
export default function DocumentsPage() {
  const navigate = useNavigate();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [missing, setMissing] = useState<MissingItem[]>([]);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const existing = await currentCase();
      if (!existing) {
        navigate('/journey');
        return;
      }
      setCaseId(existing.id);
      setDocuments(await listDocuments(existing.id));
      setLoaded(true);
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

  const generate = async () => {
    if (!caseId) return;
    setPending(true);
    setMissing([]);
    setFailed(false);
    try {
      setDocuments(await generateDocuments(caseId));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'GENERATION_BLOCKED') {
        setMissing(error.body?.missing ?? []);
      } else {
        setFailed(true);
      }
    } finally {
      setPending(false);
    }
  };

  const exportZip = async () => {
    if (!caseId) return;
    setPending(true);
    setFailed(false);
    try {
      saveBlob(await exportPackage(caseId), 'restart-filing-package.zip');
      // Export regenerates on the backend — refresh the list so stale flags clear here too.
      setDocuments(await listDocuments(caseId));
      setMissing([]);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'GENERATION_BLOCKED') {
        setMissing(error.body?.missing ?? []);
      } else {
        setFailed(true);
      }
    } finally {
      setPending(false);
    }
  };

  const fetchFile = async (doc: DocumentMeta) => {
    if (!caseId) return;
    try {
      saveBlob(await downloadDocument(caseId, doc.id), doc.filename);
    } catch {
      setFailed(true);
    }
  };

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

  if (!loaded) {
    return (
      <main className="check">
        <p className="check-question">Секунду…</p>
      </main>
    );
  }

  const types = [...new Set(documents.map((d) => d.type))];
  const anyStale = documents.some((d) => d.stale);

  return (
    <main className="journey">
      <header className="journey-header">
        <h1 className="journey-title">Документы, которые подготовил «Рестарт»</h1>
        <Link to="/journey" className="check-back">← К шагам</Link>
      </header>

      {missing.length > 0 && (
        <section className="docs-missing" aria-label="Чего не хватает">
          <p className="docs-missing-title">Почти готово! Осталось дозаполнить:</p>
          <ul className="check-reasons">
            {missing.map((item, index) => (
              <li key={index}>
                <Link to={`/journey/${item.step}`} className="docs-missing-link">
                  {sectionLabel(item.step).title}
                  {item.field ? ` — ${fieldLabel(item.step, item.field)}` : ''}
                  {item.entryIndex !== null && item.entryIndex !== undefined
                    ? ` (запись № ${item.entryIndex + 1})`
                    : ''}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {anyStale && (
        <p className="section-saved-note" role="status">
          Вы меняли данные — эти файлы устарели. Соберите документы заново.
        </p>
      )}

      {documents.length === 0 ? (
        <>
          <p className="check-hint">
            Когда все шаги заполнены, мы соберём весь пакет для суда: заявление, списки,
            опись — всё по форме.
          </p>
        </>
      ) : (
        <ul className="docs-list">
          {types.map((type) => {
            const label = documentLabel(type);
            const files = documents.filter((d) => d.type === type);
            const stale = files.some((f) => f.stale);
            return (
              <li key={type} className={`docs-card${stale ? ' docs-card-stale' : ''}`}>
                <span className="docs-card-title">
                  {label.title}
                  {label.note && <span className="docs-card-note">{label.note}</span>}
                  {stale && <span className="docs-stale-badge">устарел</span>}
                </span>
                <span className="docs-card-actions">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      className="docs-download"
                      onClick={() => void fetchFile(file)}
                    >
                      {file.format === 'DOCX' ? 'Word' : file.format === 'PDF' ? 'PDF' : 'Текст'}
                    </button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" className="landing-cta" disabled={pending} onClick={() => void generate()}>
        {pending
          ? 'Собираем…'
          : documents.length === 0
            ? 'Собрать документы'
            : 'Собрать заново'}
      </button>
      {documents.length > 0 && (
        <button type="button" className="check-option" disabled={pending} onClick={() => void exportZip()}>
          Скачать всё одним архивом
        </button>
      )}
      {/* Documents in hand, the obvious next question is «и что теперь?» — answer it right here
          instead of leaving the user to find the filing step on their own. */}
      {documents.length > 0 && (
        <Link to="/journey/FILING_SUBMISSION" className="docs-next-step">
          Что дальше: как подать документы в суд →
        </Link>
      )}
      <p className="docs-note">
        Документы собраны по шаблонам, которые ещё проверяет юрист, — на каждом файле есть
        пометка. Подавать их в суд пока рано.
      </p>
    </main>
  );
}
