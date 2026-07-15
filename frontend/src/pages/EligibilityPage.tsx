import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  checkEligibility,
  type DebtRange,
  type EligibilityAnswers,
  type EligibilityResult,
} from '../api/eligibility';

/**
 * The 2-minute eligibility check: one question per screen (a product constitution rule),
 * big tap targets, progress on top. All decision logic lives in the backend — this screen
 * only collects answers and renders the verdict.
 */

interface BoolQuestion {
  kind: 'bool';
  field: keyof Omit<EligibilityAnswers, 'debtRange'>;
  emoji: string;
  text: string;
  /** Which answer means "fits": most questions expect "нет", the debts one expects "да". */
  yesLabel: string;
  noLabel: string;
}

interface DebtQuestion {
  kind: 'debt';
  emoji: string;
  text: string;
}

type Question = BoolQuestion | DebtQuestion;

const QUESTIONS: Question[] = [
  { kind: 'debt', emoji: '💸', text: 'Сколько ты всего должен?' },
  {
    kind: 'bool',
    field: 'onlyConsumerDebts',
    emoji: '🧾',
    text: 'Все долги — это кредиты, карты, микрозаймы или рассрочки?',
    yesLabel: 'Да, только это',
    noLabel: 'Есть и другие',
  },
  { kind: 'bool', field: 'hasCar', emoji: '🚗', text: 'У тебя есть машина?', yesLabel: 'Да', noLabel: 'Нет' },
  {
    kind: 'bool',
    field: 'hasExtraRealEstate',
    emoji: '🏠',
    text: 'Есть недвижимость, кроме единственного жилья?',
    yesLabel: 'Да',
    noLabel: 'Нет',
  },
  {
    kind: 'bool',
    field: 'hasBusiness',
    emoji: '💼',
    text: 'Есть свой бизнес или доля в компании?',
    yesLabel: 'Да',
    noLabel: 'Нет',
  },
  {
    kind: 'bool',
    field: 'marriedOrDivorcing',
    emoji: '💍',
    text: 'Состоишь в браке или сейчас идёт развод?',
    yesLabel: 'Да',
    noLabel: 'Нет',
  },
  {
    kind: 'bool',
    field: 'soldOrGiftedAssetsRecently',
    emoji: '🎁',
    text: 'Продавал или дарил что-то ценное за последние три года?',
    yesLabel: 'Да',
    noLabel: 'Нет',
  },
  {
    kind: 'bool',
    field: 'hasForeignAssetsOrLawsuits',
    emoji: '🌍',
    text: 'Есть счета или имущество за границей, или судебные споры?',
    yesLabel: 'Да',
    noLabel: 'Нет',
  },
];

const DEBT_OPTIONS: { value: DebtRange; label: string }[] = [
  { value: 'UNDER_500K', label: 'До 500 тысяч' },
  { value: 'FROM_500K_TO_3M', label: 'От 500 тысяч до 3 миллионов' },
  { value: 'OVER_3M', label: 'Больше 3 миллионов' },
];

export default function EligibilityPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<EligibilityAnswers>>({});
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (complete: EligibilityAnswers) => {
    setPending(true);
    setError(false);
    try {
      setResult(await checkEligibility(complete));
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };

  const answer = (partial: Partial<EligibilityAnswers>) => {
    const next = { ...answers, ...partial };
    setAnswers(next);
    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1);
    } else {
      void submit(next as EligibilityAnswers);
    }
  };

  if (result) {
    return <ResultScreen result={result} />;
  }

  if (pending || error) {
    return (
      <main className="check">
        {pending ? (
          <p className="check-question">Секунду, смотрим…</p>
        ) : (
          <>
            <p className="check-question">Что-то пошло не так 😔</p>
            <p className="check-hint">Проверь интернет и попробуй ещё раз.</p>
            <button type="button" className="landing-cta" onClick={() => void submit(answers as EligibilityAnswers)}>
              Повторить
            </button>
          </>
        )}
      </main>
    );
  }

  const question = QUESTIONS[step];
  return (
    <main className="check">
      <div className="check-progress" aria-label={`Вопрос ${step + 1} из ${QUESTIONS.length}`}>
        <div className="check-progress-fill" style={{ width: `${(step / QUESTIONS.length) * 100}%` }} />
      </div>
      <p className="check-emoji" aria-hidden="true">{question.emoji}</p>
      <h1 className="check-question">{question.text}</h1>
      {question.kind === 'debt' ? (
        <div className="check-options">
          {DEBT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="check-option"
              onClick={() => answer({ debtRange: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="check-options">
          <button type="button" className="check-option" onClick={() => answer({ [question.field]: true })}>
            {question.yesLabel}
          </button>
          <button type="button" className="check-option" onClick={() => answer({ [question.field]: false })}>
            {question.noLabel}
          </button>
        </div>
      )}
      {step > 0 && (
        <button type="button" className="check-back" onClick={() => setStep(step - 1)}>
          ← Назад
        </button>
      )}
    </main>
  );
}

function ResultScreen({ result }: { result: EligibilityResult }) {
  if (result.decision === 'SELF_SERVICE_OK') {
    return (
      <main className="check">
        <p className="check-emoji" aria-hidden="true">🎉</p>
        <h1 className="check-question">Отлично! Твой случай подходит</h1>
        <p className="check-hint">
          Мы будем сопровождать каждый этап процедуры. Двигаемся по одному шагу за раз.
        </p>
        <button type="button" className="landing-cta">Продолжить</button>
      </main>
    );
  }
  return (
    <main className="check">
      <p className="check-emoji" aria-hidden="true">🤝</p>
      <h1 className="check-question">Скажем честно: тебе лучше с юристом</h1>
      <p className="check-hint">В твоей ситуации есть моменты, где самостоятельно легко ошибиться:</p>
      <ul className="check-reasons">
        {result.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className="check-hint">
        Это не приговор — просто такие дела надёжнее вести с профессиональной поддержкой.
      </p>
      <Link to="/" className="check-back">На главную</Link>
    </main>
  );
}
