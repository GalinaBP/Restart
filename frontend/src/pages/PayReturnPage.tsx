import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { ApiError } from '../api/client';
import { paymentStatus } from '../api/payment';

type View = 'checking' | 'succeeded' | 'canceled' | 'slow' | 'failed';

const MAX_CHECKS = 15;

export default function PayReturnPage({ pollMs = 2000 }: { pollMs?: number }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment');
  const [view, setView] = useState<View>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isSignedIn()) {
      navigate('/auth');
      return;
    }
    if (!paymentId) {
      return;
    }
    let live = true;
    let checks = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      try {
        const status = await paymentStatus(paymentId);
        if (!live) return;
        if (status === 'SUCCEEDED') {
          setView('succeeded');
        } else if (status === 'CANCELED') {
          setView('canceled');
        } else if (++checks >= MAX_CHECKS) {
          setView('slow');
        } else {
          timer = setTimeout(() => void check(), pollMs);
        }
      } catch (e) {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) {
          navigate('/auth');
        } else {
          setView('failed');
        }
      }
    };
    void check();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [navigate, paymentId, pollMs, attempt]);

  const checkAgain = () => {
    setView('checking');
    setAttempt((n) => n + 1);
  };

  if (!paymentId) {
    return (
      <main className="auth">
        <h1 className="auth-title">Ссылка открылась не целиком</h1>
        <p className="check-hint">Вернитесь к оплате — там видно, открыт ли уже доступ.</p>
        <button type="button" className="landing-cta" onClick={() => navigate('/pay')}>
          К оплате
        </button>
      </main>
    );
  }

  if (view === 'succeeded') {
    return (
      <main className="auth">
        <h1 className="auth-title">Оплата прошла — спасибо!</h1>
        <p className="check-hint">Весь путь открыт. Начнём?</p>
        <button type="button" className="landing-cta" onClick={() => navigate('/journey')}>
          Перейти к делу
        </button>
      </main>
    );
  }

  if (view === 'canceled') {
    return (
      <main className="auth">
        <h1 className="auth-title">Оплата не прошла</h1>
        <p className="check-hint">
          Так бывает, если отменить оплату или банк её отклонил. Если сумму успели заблокировать,
          она вернётся на карту. Можно попробовать ещё раз — другой картой или через СБП.
        </p>
        <button type="button" className="landing-cta" onClick={() => navigate('/pay')}>
          Попробовать ещё раз
        </button>
      </main>
    );
  }

  if (view === 'slow') {
    return (
      <main className="auth">
        <h1 className="auth-title">Банк ещё подтверждает оплату</h1>
        <p className="check-hint">
          Обычно это занимает до минуты. Как только оплата пройдёт, доступ откроется сам.
        </p>
        <button type="button" className="landing-cta" onClick={checkAgain}>
          Проверить ещё раз
        </button>
      </main>
    );
  }

  if (view === 'failed') {
    return (
      <main className="auth">
        <h1 className="auth-title">Не получилось проверить оплату</h1>
        <p className="check-hint">Проверьте интернет и попробуйте ещё раз.</p>
        <button type="button" className="landing-cta" onClick={checkAgain}>
          Проверить ещё раз
        </button>
      </main>
    );
  }

  return (
    <main className="auth">
      <h1 className="auth-title">Проверяем оплату…</h1>
      <p className="check-hint">Это займёт несколько секунд.</p>
    </main>
  );
}
