import { Link, useNavigate } from 'react-router-dom';
import { CALM_CARDS, CALM_INTRO } from './calmContent';

const STEPS: { title: string; text: string }[] = [
  {
    title: 'Ответьте на несколько вопросов',
    text: 'Короткая проверка: можно ли пройти процедуру без юриста. Анонимно, без регистрации.',
  },
  {
    title: 'Получите план',
    text: 'Увидите всю процедуру целиком и то, на каком этапе вы сейчас.',
  },
  {
    title: 'Пройдёте процедуру по шагам',
    text: 'Подскажем, как подготовить и подать документы в суд. Заявление, списки и описи '
      + 'соберём сами — из ваших ответов.',
  },
];

const BANK_SCRIPT = CALM_CARDS.find((card) => card.script)?.script ?? '';

const TRUST: string[] = [
  'Проверка анонимная: пока вы не заведёте дело, мы не спрашиваем ни имени, ни телефона.',
  'Ваше дело полностью анонимно: доступ к нему есть только у вас. Мы не подаём документы в суд '
    + 'за вас — это вы делаете сами.',
  'Решение о списании долгов принимает только суд. Мы не обещаем результат и честно говорим об этом.',
  'Некоторые юридические материалы находятся на проверке юриста. Мы помечаем их прямо в интерфейсе.',
];

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <main className="landing">
      <div className="landing-sky" aria-hidden="true" />
      <Link to="/auth" className="landing-login">Войти</Link>
      <h1 className="landing-brand">Рестарт</h1>
      <p className="landing-lead">Начните путь к списанию долгов&nbsp;🚀</p>
      <p className="landing-sub">
        Долги растут, звонят банки, а что делать дальше — непонятно? Пошагово пройдите процедуру
        банкротства без сложного юридического языка.
      </p>
      <button type="button" className="landing-cta" onClick={() => navigate('/check')}>
        Проверить, подходит ли мне самостоятельное банкротство
      </button>
      <p className="landing-note">2 минуты • анонимно • без регистрации</p>

      <section className="landing-block">
        <h2 className="landing-block-title">Как это работает</h2>
        <ol className="landing-steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="landing-step-number">{index + 1}</span>
              <span className="landing-step-body">
                <span className="landing-step-title">{step.title}</span>
                <span className="landing-step-text">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-block">
        <h2 className="landing-block-title">Звонят банки и коллекторы?</h2>
        <p className="landing-block-text">{CALM_INTRO}</p>
        <p className="landing-script-lead">Например, что ответить банку:</p>
        <blockquote className="landing-script">{BANK_SCRIPT}</blockquote>
        <Link to="/calm" className="landing-block-link">Больше готовых ответов →</Link>
      </section>

      <section className="landing-block landing-block-starry">
        <h2 className="landing-block-title">Честно о главном</h2>
        <ul className="landing-trust">
          {TRUST.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>

    </main>
  );
}
