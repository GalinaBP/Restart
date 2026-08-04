import { useState } from 'react';
import { STATUS_LABELS } from '../api/labels';
import type { JourneyStageView, RecordStageInput } from '../api/procedure';

/**
 * Records where one stage of the procedure stands: status, optional dates, optional note.
 *
 * Only ever rendered for a stage the backend marks `editable` — derived stages mirror the case
 * data and answer a hand-written update with a 409. Shared by «Весь путь» and the manager screen,
 * so the same stage is recorded the same way wherever the user meets it.
 */
export default function StageEditor({
  view,
  onSave,
  submitLabel = 'Записать',
}: {
  view: JourneyStageView;
  onSave: (input: RecordStageInput) => Promise<void>;
  submitLabel?: string;
}) {
  const [status, setStatus] = useState(view.status);
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
          onChange={(e) => setStatus(e.target.value as JourneyStageView['status'])}
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
        {pending ? 'Сохраняем…' : submitLabel}
      </button>
    </form>
  );
}
