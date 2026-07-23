import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from '../api/auth';
import { ApiError } from '../api/client';

/**
 * Landing page of the mailed reset link (/auth/reset?token=…). One action: choose a new password.
 * A bad or expired token surfaces the backend's own message; a missing token gets a local hint.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setPending(true);
    setError(null);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Нет связи — проверьте интернет и попробуйте ещё раз');
    } finally {
      setPending(false);
    }
  };

  if (!token) {
    return (
      <main className="auth">
        <h1 className="auth-title">Ссылка открылась не целиком</h1>
        <p className="check-hint">
          Скопируйте ссылку из письма полностью — или запросите новую на экране входа.
        </p>
        <button
          type="button"
          className="landing-cta"
          onClick={() => navigate('/auth', { state: { mode: 'login' } })}
        >
          К экрану входа
        </button>
      </main>
    );
  }

  if (done) {
    return (
      <main className="auth">
        <h1 className="auth-title">Пароль изменён</h1>
        <p className="check-hint">Теперь войдите с новым паролем — и продолжим.</p>
        <button
          type="button"
          className="landing-cta"
          onClick={() => navigate('/auth', { state: { mode: 'login' } })}
        >
          Войти
        </button>
      </main>
    );
  }

  return (
    <main className="auth">
      <h1 className="auth-title">Придумайте новый пароль</h1>
      <p className="check-hint">Старый пароль перестанет действовать сразу после сохранения.</p>
      <form className="auth-form" onSubmit={(e) => void submit(e)}>
        <label className="auth-label">
          Новый пароль — не короче 8 символов
          <input
            className="auth-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="landing-cta" disabled={pending}>
          {pending ? 'Секунду…' : 'Сохранить новый пароль'}
        </button>
      </form>
    </main>
  );
}
