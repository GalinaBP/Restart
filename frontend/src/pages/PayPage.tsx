import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSignedIn } from '../api/auth';
import { ApiError } from '../api/client';
import { formatPrice, getAccess, startPayment, type PaymentAccess } from '../api/payment';

export default function PayPage() {
  const navigate = useNavigate();
  const [access, setAccess] = useState<PaymentAccess | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      navigate('/auth');
      return;
    }
    let live = true;
    getAccess()
      .then((loaded) => {
        if (!live) return;
        if (loaded.granted) {
          navigate('/journey', { replace: true });
        } else {
          setAccess(loaded);
        }
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) {
          navigate('/auth');
        } else {
          setFailed(true);
        }
      });
    return () => {
      live = false;
    };
  }, [navigate, attempt]);

  const pay = async () => {
    setPending(true);
    setError(null);
    try {
      const started = await startPayment();
      window.location.assign(started.confirmationUrl);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ACCESS_ALREADY_GRANTED') {
        navigate('/journey');
        return;
      }
      setError(e instanceof ApiError ? e.message : 'Нет связи — проверьте интернет и попробуйте ещё раз');
      setPending(false);
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
            setAttempt((n) => n + 1);
          }}
        >
          Повторить
        </button>
      </main>
    );
  }

  if (!access) {
    return (
      <main className="check">
        <p className="check-question">Секунду…</p>
      </main>
    );
  }

  const price = formatPrice(access.price, access.currency);

  return (
    <main className="auth">
      <h1 className="auth-title">Откройте весь путь</h1>
      <p className="check-hint">
        Проверка была бесплатной. Дальше — всё дело целиком: анкета по шагам, весь путь через
        суд, выбор управляющего и готовые документы для подачи.
      </p>
      <p className="pay-price">{price}</p>
      <p className="check-hint">Один раз, без подписки.</p>
      <p className="check-hint">
        Это оплата Рестарта. Расходы самой процедуры — госпошлина и вознаграждение управляющему —
        оплачиваются отдельно, мы подскажем, сколько и куда. Решение о списании долгов принимает
        только суд.
      </p>
      <p className="check-hint">
        Оплата привязана к аккаунту, а не к устройству. Платёж проходит на защищённой странице
        ЮKassa — картой российского банка или через СБП. Данные карты мы не видим.
      </p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button type="button" className="landing-cta" disabled={pending} onClick={() => void pay()}>
        {pending ? 'Секунду…' : `Оплатить ${price}`}
      </button>
    </main>
  );
}
