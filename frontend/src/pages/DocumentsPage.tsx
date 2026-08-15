import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { documentLabel, fieldLabel, sectionLabel } from '../api/labels';
import { currentCase } from '../local/case';
import {
  GenerationBlockedError,
  downloadDocument,
  exportPackage,
  generateDocuments,
  listDocuments,
  saveBlob,
  type DocumentMeta,
  type MissingItem,
} from '../local/documents';

export default function DocumentsPage() {
  const navigate = useNavigate();
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
      setDocuments(await listDocuments());
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
    setPending(true);
    setMissing([]);
    setFailed(false);
    try {
      setDocuments(await generateDocuments());
    } catch (error) {
      if (error instanceof GenerationBlockedError) {
        setMissing(error.missing);
      } else {
        setFailed(true);
      }
    } finally {
      setPending(false);
    }
  };

  const exportZip = async () => {
    setPending(true);
    setFailed(false);
    try {
      saveBlob(await exportPackage(), 'restart-filing-package.zip');
      setDocuments(await listDocuments());
      setMissing([]);
    } catch (error) {
      if (error instanceof GenerationBlockedError) {
        setMissing(error.missing);
      } else {
        setFailed(true);
      }
    } finally {
      setPending(false);
    }
  };

  const fetchFile = async (doc: DocumentMeta) => {
    try {
      saveBlob(await downloadDocument(doc.type), doc.filename);
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
                      Скачать PDF
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
      {documents.length > 0 && (
        <p className="section-caution" role="note">
          Документы собраны здесь, на вашем устройстве, и лежат только в этом браузере.
          Сейчас хороший момент{' '}
          <Link to="/backup" className="docs-missing-link">сохранить копию дела в файл</Link>
          {' '}— чтобы не собирать всё заново, если данные сайта очистятся.
        </p>
      )}
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
