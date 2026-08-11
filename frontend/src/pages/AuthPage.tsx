import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { login, register, requestPasswordReset } from '../api/auth';
import { ApiError } from '../api/client';

type Mode = 'register' | 'login' | 'forgot' | 'sent';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialMode = (location.state as { mode?: Mode } | null)?.mode ?? 'register';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const switchTo = (next: Mode) => {
    setError(null);
    setMode(next);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === 'register') {
        await register(email, password);
        navigate('/journey');
      } else if (mode === 'login') {
        await login(email, password);
        navigate('/journey');
      } else {
        await requestPasswordReset(email);
        setMode('sent');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Нет связи — проверьте интернет и попробуйте ещё раз');
    } finally {
      setPending(false);
    }
  };

  const title = {
    register: 'Создадим ваш аккаунт',
    login: 'С возвращением!',
    forgot: 'Сменим пароль',
    sent: 'Проверьте почту',
  }[mode];

  const hint = {
    register: 'Всё, что вы заполните, будет ждать вас здесь — начните на телефоне, продолжите с ноутбука.',
    login: 'Ваше дело на месте. Войдите и продолжайте с того шага, где остановились.',
    forgot: 'Укажите почту, с которой вы регистрировались, — мы отправим на неё ссылку для смены пароля.',
    sent: 'Если такая почта у нас есть, письмо со ссылкой уже в пути. Ссылка работает один час. Не пришло за пару минут — загляните в папку «Спам».',
  }[mode];

  return (
    <main className="auth">
      <h1 className="auth-title">{title}</h1>
      <p className="check-hint">{hint}</p>
      {mode !== 'sent' && (
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
          {mode !== 'forgot' && (
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
          )}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="landing-cta" disabled={pending}>
            {pending
              ? 'Секунду…'
              : mode === 'register'
                ? 'Создать аккаунт'
                : mode === 'login'
                  ? 'Войти'
                  : 'Отправить ссылку'}
          </button>
        </form>
      )}
      {mode === 'register' && (
        <button type="button" className="check-back" onClick={() => switchTo('login')}>
          У меня уже есть аккаунт
        </button>
      )}
      {mode === 'login' && (
        <>
          <button type="button" className="check-back" onClick={() => switchTo('register')}>
            У меня ещё нет аккаунта
          </button>
          <button type="button" className="check-back" onClick={() => switchTo('forgot')}>
            Забыли пароль?
          </button>
        </>
      )}
      {(mode === 'forgot' || mode === 'sent') && (
        <button type="button" className="check-back" onClick={() => switchTo('login')}>
          ← Назад ко входу
        </button>
      )}
    </main>
  );
}
