import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  checkEligibility,
  type DebtRange,
  type EligibilityAnswers,
  type EligibilityResult,
} from '../api/eligibility';

/**
 * The 2-minute eligibility check. It opens with a plain-language "what bankruptcy means" checklist
 * (the consequences screen), then asks one question per screen — a product constitution rule.
 * All decision logic lives in the backend; this screen only shows consequences, collects answers,
 * and renders the verdict.
 *
 * PLACEHOLDER: the consequences list and the forward-looking questions are pending lawyer review.
 */

interface BoolQuestion {
  kind: 'bool';
  field: keyof Omit<EligibilityAnswers, 'debtRange'>;
  text: string;
  /** Which answer means "fits": most questions expect "нет", the debts one expects "да". */
  yesLabel: string;
  noLabel: string;
}

interface DebtQuestion {
  kind: 'debt';
  text: string;
}

type Question = BoolQuestion | DebtQuestion;

/** Consequences of court bankruptcy, in plain language. PLACEHOLDER — pending lawyer review. */
const CONSEQUENCES: string[] = [
  'Имущество, кроме единственного жилья, могут продать на торгах.',
  'Пять лет придётся сообщать о банкротстве, когда берёте кредит или заём.',
  'Три года нельзя руководить компанией или быть её учредителем.',
  'Повторно пройти банкротство можно только через пять лет.',
  'Пока идёт процедура, вашими счетами и сделками распоряжается финансовый управляющий.',
];

const QUESTIONS: Question[] = [
  { kind: 'debt', text: 'Сколько вы всего должны?' },
  {
    kind: 'bool',
    field: 'onlyConsumerDebts',
    text: 'Все долги — это кредиты, карты, микрозаймы или рассрочки?',
    yesLabel: 'Да, только это',
    noLabel: 'Есть и другие',
  },
  { kind: 'bool', field: 'hasCar', text: 'У вас есть машина?', yesLabel: 'Да', noLabel: 'Нет' },
  {
    kind: 'bool',
    field: 'hasExtraRealEstate',
    text: 'Есть недвижимость, кроме единственного жилья?',
    yesLabel: 'Да',
    noLabel: 'Нет',
  },
  {
    kind: 'bool',
    field: 'hasBusiness',
    text: 'Есть свой бизнес или доля в компании?',
    yesLabel: 'Да',
    noLabel: 'Нет',
  },
  {
    kind: 'bool',
    field: 'marriedOrDivorcing',
    text: 'Состоите в браке или сейчас идёт развод?',
    yesLabel: 'Да',
    noLabel: 'Нет',
  },
  {
    kind: 'bool',
    field: 'soldOrGiftedAssetsRecently',
    text: 'Продавали или дарили что-то ценное за последние три года?',
    yesLabel: 'Да',
    noLabel: 'Нет',
  },
  {
    kind: 'bool',
    field: 'hasForeignAssetsOrLawsuits',
    text: 'Есть счета или имущество за границей, или судебные споры?',
    yesLabel: 'Да',
    noLabel: 'Нет',
  },
  {
    kind: 'bool',
    field: 'plansToStartBusiness',
    text: 'Планируете открыть свой бизнес или руководить компанией в ближайшие три года?',
    yesLabel: 'Да',
    noLabel: 'Нет',
  },
  {
    kind: 'bool',
    field: 'plansMajorBorrowingSoon',
    text: 'Планируете в ближайшие пять лет брать крупные кредиты или ипотеку?',
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
  const [started, setStarted] = useState(false);
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
            <p className="check-question">Что-то пошло не так</p>
            <p className="check-hint">Проверьте интернет и попробуйте ещё раз.</p>
            <button type="button" className="landing-cta" onClick={() => void submit(answers as EligibilityAnswers)}>
              Повторить
            </button>
          </>
        )}
      </main>
    );
  }

  if (!started) {
    return <ConsequencesScreen onContinue={() => setStarted(true)} />;
  }

  const question = QUESTIONS[step];
  return (
    <main className="check">
      <div className="check-progress" aria-label={`Вопрос ${step + 1} из ${QUESTIONS.length}`}>
        <div className="check-progress-fill" style={{ width: `${(step / QUESTIONS.length) * 100}%` }} />
      </div>
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

function ConsequencesScreen({ onContinue }: { onContinue: () => void }) {
  const navigate = useNavigate();
  return (
    <main className="check check-intro">
      <p className="check-placeholder" role="note">
        Черновик — проверяется юристом
      </p>
      <h1 className="check-question">Сначала — что важно знать</h1>
      <p className="check-hint">
        Банкротство спишет долги, но у него есть последствия. Коротко о главном:
      </p>
      <ul className="check-checklist">
        {CONSEQUENCES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <button type="button" className="landing-cta" onClick={onContinue}>
        Понятно, продолжить
      </button>
      <button type="button" className="check-back" onClick={() => navigate('/')}>
        Нет, это не для меня
      </button>
    </main>
  );
}

function ResultScreen({ result }: { result: EligibilityResult }) {
  const navigate = useNavigate();
  if (result.decision === 'SELF_SERVICE_OK') {
    return (
      <main className="check">
        <h1 className="check-question">Отлично! Ваш случай подходит</h1>
        <p className="check-hint">
          Мы будем сопровождать каждый этап процедуры. Двигаемся по одному шагу за раз.
        </p>
        <button type="button" className="landing-cta" onClick={() => navigate('/auth')}>
          Продолжить
        </button>
      </main>
    );
  }
  return (
    <main className="check">
      <h1 className="check-question">Скажем честно: вам лучше с юристом</h1>
      <p className="check-hint">В вашей ситуации есть моменты, где самостоятельно легко ошибиться:</p>
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
