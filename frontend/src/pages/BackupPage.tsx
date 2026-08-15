import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { BackupError, backupFilename, exportBackup, importBackup } from '../local/backup';
import { saveBlob } from '../local/documents';

export default function BackupPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [savePassphrase, setSavePassphrase] = useState('');
  const [openPassphrase, setOpenPassphrase] = useState('');
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn()) {
      navigate('/auth');
    }
  }, [navigate]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setProblem(null);
    setSaved(false);
    try {
      const now = new Date();
      saveBlob(await exportBackup(savePassphrase, now), backupFilename(now));
      setSavePassphrase('');
      setSaved(true);
    } catch (error) {
      setProblem(error instanceof BackupError
        ? error.message
        : 'Не получилось сохранить файл — попробуйте ещё раз');
    } finally {
      setPending(false);
    }
  };

  const open = async (event: React.FormEvent) => {
    event.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setProblem('Выберите файл с копией дела');
      return;
    }
    setPending(true);
    setProblem(null);
    setSaved(false);
    try {
      await importBackup(file, openPassphrase);
      navigate('/journey');
    } catch (error) {
      setProblem(error instanceof BackupError
        ? error.message
        : 'Не получилось открыть файл — попробуйте ещё раз');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="section">
      <Link to="/journey" className="check-back">← К делу</Link>
      <h1 className="check-question">Копия дела</h1>
      <p className="check-hint">
        Всё, что вы вводите, хранится только на этом устройстве, в этом браузере. Мы никуда это
        не отправляем — и поэтому не можем восстановить это за вас.
      </p>

      <section className="section-caution" role="note">
        <p>Дело пропадёт, если очистить данные сайта, открыть «Рестарт» в режиме инкогнито
          или пересесть за другое устройство. Сохраните файл с копией сейчас и обновляйте его,
          когда заполните что-то важное.</p>
      </section>

      {problem && <p className="auth-error" role="alert">{problem}</p>}
      {saved && (
        <p className="section-saved-note" role="status">
          Файл сохранён. Положите его туда, где не потеряется, и запомните пароль — без пароля
          файл не открыть, в том числе нам.
        </p>
      )}

      <form className="auth-form section-form" onSubmit={(e) => void save(e)}>
        <h2 className="about-you-block-title">Сохранить копию в файл</h2>
        <label className="auth-label">
          Пароль для файла — не короче 8 символов
          <input
            className="auth-input"
            type="password"
            autoComplete="new-password"
            value={savePassphrase}
            onChange={(e) => setSavePassphrase(e.target.value)}
          />
        </label>
        <p className="check-hint">
          Файл зашифрован этим паролем. Забытый пароль восстановить нельзя — тогда останется
          только то, что лежит в браузере.
        </p>
        <button type="submit" className="landing-cta" disabled={pending}>
          {pending ? 'Готовим…' : 'Сохранить файл'}
        </button>
      </form>

      <form className="auth-form section-form" onSubmit={(e) => void open(e)}>
        <h2 className="about-you-block-title">Открыть копию из файла</h2>
        <label className="auth-label">
          Файл с копией
          <input className="auth-input" type="file" accept=".restart,application/json" ref={fileInput} />
        </label>
        <label className="auth-label">
          Пароль от файла
          <input
            className="auth-input"
            type="password"
            autoComplete="current-password"
            value={openPassphrase}
            onChange={(e) => setOpenPassphrase(e.target.value)}
          />
        </label>
        <p className="check-hint">
          То, что сейчас заполнено в браузере, заменится содержимым файла. Документы после этого
          нужно собрать заново — это одна кнопка.
        </p>
        <button type="submit" className="check-option" disabled={pending}>
          {pending ? 'Открываем…' : 'Открыть файл'}
        </button>
      </form>
    </main>
  );
}
