import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { ApiError, tokenStore } from '../api/client';
import { getAccess, hasRememberedAccess, rememberAccess } from '../api/payment';

type View = 'checking' | 'granted' | 'failed';

export default function RequireAccess() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>(
    () => (hasRememberedAccess(tokenStore.get()) ? 'granted' : 'checking'),
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isSignedIn()) {
      navigate('/auth');
      return;
    }
    if (hasRememberedAccess(tokenStore.get())) {
      return;
    }
    let live = true;
    getAccess()
      .then((access) => {
        if (!live) return;
        if (access.granted) {
          rememberAccess(tokenStore.get());
          setView('granted');
        } else {
          navigate('/pay', { replace: true });
        }
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) {
          navigate('/auth');
        } else {
          setView('failed');
        }
      });
    return () => {
      live = false;
    };
  }, [navigate, attempt]);

  if (view === 'granted') {
    return <Outlet />;
  }

  if (view === 'failed') {
    return (
      <main className="check">
        <p className="check-question">Что-то пошло не так</p>
        <button
          type="button"
          className="landing-cta"
          onClick={() => {
            setView('checking');
            setAttempt((n) => n + 1);
          }}
        >
          Повторить
        </button>
      </main>
    );
  }

  return (
    <main className="check">
      <p className="check-question">Секунду…</p>
    </main>
  );
}
