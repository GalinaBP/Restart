import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/auth';
import { ApiError } from '../api/client';

/**
 * One card, two modes. Backend error messages are already plain Russian, so they are shown
 * as-is; only network failures get a local message.
 */
export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === 'register') {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate('/journey');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Нет связи — проверь интернет и попробуй ещё раз');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="auth">
      <h1 className="auth-title">
        {mode === 'register' ? 'Создадим твой аккаунт' : 'С возвращением!'}
      </h1>
      <p className="check-hint">
        {mode === 'register'
          ? 'Всё, что ты заполнишь, будет ждать тебя здесь — начни на телефоне, продолжи с ноутбука.'
          : 'Твоё дело на месте. Войди и продолжай с того шага, где остановился.'}
      </p>
      <form className="auth-form" onSubmit={(e) => void submit(e)}>
        <label className="auth-label">
          Электронная почта
          <input
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="auth-label">
          Пароль{mode === 'register' ? ' — не короче 8 символов' : ''}
          <input
            className="auth-input"
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={mode === 'register' ? 8 : undefined}
            required
          />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="landing-cta" disabled={pending}>
          {pending ? 'Секунду…' : mode === 'register' ? 'Создать аккаунт' : 'Войти'}
        </button>
      </form>
      <button
        type="button"
        className="check-back"
        onClick={() => {
          setError(null);
          setMode(mode === 'register' ? 'login' : 'register');
        }}
      >
        {mode === 'register' ? 'У меня уже есть аккаунт' : 'У меня ещё нет аккаунта'}
      </button>
    </main>
  );
}
