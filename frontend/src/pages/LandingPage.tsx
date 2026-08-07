import { Link, useNavigate } from 'react-router-dom';
import { CALM_CARDS, CALM_INTRO } from './calmContent';

/**
 * Landing screen per the product constitution: one message, one primary action, a calm promise of
 * step-by-step guidance. No legal terminology in the reassurance copy.
 *
 * It sells the outcome, not the procedure: the visitor is not shopping for «банкротство», they
 * want the calls to stop and the next step to be obvious. So the page opens on their situation,
 * says what happens here in three steps, and only then names what the service technically is.
 *
 * The trust block is deliberately made of things that are TRUE of this build and checkable in the
 * code — the check is anonymous and stateless, a case is visible only to its owner, the documents
 * are filed by the user, and the app never promises a discharge. No counts, no testimonials, no
 * expert names until there are real ones: invented social proof is exactly what the visitor is
 * afraid of here.
 *
 * Returning users reach their case through «Войти»; new visitors start the screening with the
 * primary call to action.
 */

/** What happens after the button, in the order it happens. */
const STEPS: { title: string; text: string }[] = [
  {
    title: 'Ответьте на несколько вопросов',
    text: 'Короткая проверка: можно ли пройти процедуру без юриста. Анонимно, без регистрации.',
  },
  {
    title: 'Получите план',
    text: 'Увидите всю процедуру целиком и то, на каком шаге вы сейчас.',
  },
  {
    title: 'Пойдёте по шагам',
    text: 'По одному действию за раз. Документы для суда соберём из ваших ответов.',
  },
];

/**
 * The bank script from «Спокойно», shown as-is. Taken from the section rather than retyped: a
 * visitor who copies it here and one who opens the section must get the same words, and the
 * section is where the lawyer review will land.
 */
const BANK_SCRIPT = CALM_CARDS.find((card) => card.script)?.script ?? '';

/** Only claims that hold for this build — see the file comment. */
const TRUST: string[] = [
  'Проверка анонимная: пока вы не заведёте дело, мы не спрашиваем ни имени, ни телефона.',
  'Ваше дело видите только вы. Мы ничего не отправляем в суд за вас — документы вы подаёте сами.',
  'Мы не обещаем, что долги спишут: это решает суд. Говорим об этом честно на каждом шаге.',
  'Юридические тексты пока черновые — их проверяет юрист, и мы помечаем это прямо в интерфейсе.',
];

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <main className="landing">
      <div className="landing-sky" aria-hidden="true" />
      <button
        type="button"
        className="landing-login"
        onClick={() => navigate('/auth')}
      >
        Войти
      </button>
      <h1 className="landing-brand">Рестарт</h1>
      <p className="landing-lead">Начните путь к списанию долгов&nbsp;🚀</p>
      <p className="landing-sub">
        Долги растут, звонят банки, а что делать дальше — непонятно? Пошагово пройдите процедуру
        банкротства без сложного юридического языка.
      </p>
      <button type="button" className="landing-cta" onClick={() => navigate('/check')}>
        Проверить мою ситуацию
      </button>
      <p className="landing-note">2 минуты, без регистрации</p>

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

      {/* The one piece of help a visitor can use before they decide anything — «Спокойно» is open
          without an account, so the landing hands over a real script instead of describing it.
          The copy comes from calmContent.ts, so the page and the section cannot drift apart. */}
      <section className="landing-block">
        <h2 className="landing-block-title">Звонят банки и коллекторы?</h2>
        <p className="landing-block-text">{CALM_INTRO}</p>
        <p className="landing-script-lead">Например, что ответить банку:</p>
        <blockquote className="landing-script">{BANK_SCRIPT}</blockquote>
        <Link to="/calm" className="landing-block-link">Больше готовых ответов →</Link>
      </section>

      <section className="landing-block">
        <h2 className="landing-block-title">Честно о главном</h2>
        <ul className="landing-trust">
          {TRUST.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>

      <p className="landing-tagline">Сервис для самостоятельного судебного банкротства</p>
      <p className="landing-starry">
        <span className="landing-star" aria-hidden="true">✦</span>
        Дальше — не бюрократия, а маршрут. Мы подсветим каждый шаг, чтобы вы не шли наугад.
        <span className="landing-star" aria-hidden="true">✦</span>
      </p>
    </main>
  );
}
