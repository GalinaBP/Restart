import { useState } from 'react';
import { STATUS_LABELS } from '../api/labels';
import DateField from './DateField';
import type { JourneyStageView, RecordStageInput } from '../local/journey';

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
      <DateField
        label="Начали (не обязательно)"
        value={startedOn}
        onChange={setStartedOn}
      />
      <DateField
        label="Закончили (не обязательно)"
        value={completedOn}
        onChange={setCompletedOn}
      />
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
