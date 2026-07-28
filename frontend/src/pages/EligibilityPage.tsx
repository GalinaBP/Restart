import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  checkEligibility,
  type EligibilityAnswers,
  type EligibilityResult,
} from '../api/eligibility';

/**
 * The 2-minute eligibility check. It opens with a plain-language "what bankruptcy means"
 * checklist (the consequences screen), then walks five grouped screens of questions.
 * All decision logic lives in the backend; this screen only collects answers.
 *
 * PLACEHOLDER: the consequences and the questions are pending lawyer review.
 */

/** Boolean answer fields a question option can switch on. */
type BoolField =
  | 'hasCar'
  | 'hasExtraRealEstate'
  | 'hasBusiness'
  | 'marriedOrDivorcing'
  | 'soldOrGiftedAssetsRecently'
  | 'onlyConsumerDebts'
  | 'hasForeignAssetsOrLawsuits'
  | 'movedMoneyBeforeFiling'
  | 'hasAlimonyDebt'
  | 'hasLifeHealthHarmDebt'
  | 'hasEconomicCriminalCase'
  | 'guaranteedOthersDebt'
  | 'incomeUnofficial'
  | 'largeThirdPartyDeposits';

type Patch = Partial<EligibilityAnswers>;

interface SingleOption {
  key: string;
  label: string;
  patch: Patch;
}

/** An option with no field is the exclusive "nothing of the sort" choice. */
interface MultiOption {
  key: string;
  label: string;
  field?: BoolField;
}

interface SingleQuestion {
  kind: 'single';
  id: string;
  emoji: string;
  text: string;
  note?: string;
  options: SingleOption[];
}

interface MultiQuestion {
  kind: 'multi';
  id: string;
  emoji: string;
  text: string;
  note?: string;
  /** Every field this question owns — all reset to false before the picks are applied. */
  fields: BoolField[];
  options: MultiOption[];
}

type Question = SingleQuestion | MultiQuestion;

interface Group {
  emoji: string;
  title: string;
  questions: Question[];
}

const GROUPS: Group[] = [
  {
    emoji: '💸',
    title: 'Долги',
    questions: [
      {
        kind: 'single',
        id: 'debt',
        emoji: '💰',
        text: 'Сколько у вас долгов примерно?',
        options: [
          { key: 'under', label: 'До 350 тыс ₽', patch: { debtRange: 'UNDER_350K' } },
          {
            key: 'mid',
            label: '350 тыс – 3 млн ₽',
            patch: { debtRange: 'FROM_350K_TO_3M' },
          },
          { key: 'over', label: 'Больше 3 млн ₽', patch: { debtRange: 'OVER_3M' } },
        ],
      },
      {
        kind: 'single',
        id: 'debtKind',
        emoji: '🧾',
        text: 'Из чего состоят ваши долги?',
        options: [
          {
            key: 'consumer',
            label: 'Кредиты, карты, микрозаймы, рассрочки',
            patch: { onlyConsumerDebts: true },
          },
          {
            key: 'other',
            label: 'Есть ещё другие долги (налоги, долги людям, штрафы и т.д.)',
            patch: { onlyConsumerDebts: false },
          },
        ],
      },
      {
        kind: 'single',
        id: 'creditors',
        emoji: '👥',
        text: 'Скольким банкам, компаниям или людям вы должны?',
        options: [
          { key: 'few', label: '5 или меньше', patch: { manyCreditors: false } },
          { key: 'many', label: 'Больше 5', patch: { manyCreditors: true } },
        ],
      },
    ],
  },
  {
    emoji: '🏠',
    title: 'Имущество и бизнес',
    questions: [
      {
        kind: 'multi',
        id: 'property',
        emoji: '🚗',
        text: 'Есть ли у вас что-то ценное в собственности?',
        note: 'Можно выбрать несколько вариантов',
        fields: ['hasCar', 'hasExtraRealEstate'],
        options: [
          { key: 'car', label: 'Машина или мотоцикл', field: 'hasCar' },
          {
            key: 'realEstate',
            label: 'Недвижимость (кроме единственного жилья)',
            field: 'hasExtraRealEstate',
          },
          { key: 'none', label: 'Ничего такого нет' },
        ],
      },
      {
        kind: 'single',
        id: 'business',
        emoji: '💼',
        text: 'Есть ли у вас бизнес?',
        options: [
          { key: 'no', label: 'Нет', patch: { hasBusiness: false } },
          {
            key: 'yes',
            label: 'Да, я ИП или владею компанией',
            patch: { hasBusiness: true },
          },
        ],
      },
    ],
  },
  {
    emoji: '📋',
    title: 'Ваша ситуация',
    questions: [
      {
        kind: 'single',
        id: 'deals',
        emoji: '🎁',
        text: 'Были ли за последние 3 года крупные сделки?',
        note: 'Например: продажа квартиры, машины, дарение имущества.',
        options: [
          { key: 'no', label: 'Нет', patch: { soldOrGiftedAssetsRecently: false } },
          { key: 'yes', label: 'Да', patch: { soldOrGiftedAssetsRecently: true } },
        ],
      },
      {
        kind: 'single',
        id: 'marriage',
        emoji: '💍',
        text: 'Вы состоите в браке или развелись в последние 3 года?',
        options: [
          { key: 'no', label: 'Нет', patch: { marriedOrDivorcing: false } },
          { key: 'married', label: 'Да, состою в браке', patch: { marriedOrDivorcing: true } },
          {
            key: 'divorced',
            label: 'Да, развёлся(лась) менее 3 лет назад',
            patch: { marriedOrDivorcing: true },
          },
        ],
      },
      {
        kind: 'multi',
        id: 'foreign',
        emoji: '🌍',
        text: 'Есть ли что-то из этого?',
        note: 'Можно выбрать несколько вариантов',
        fields: ['hasForeignAssetsOrLawsuits'],
        options: [
          {
            key: 'abroad',
            label: 'Имущество или счета за границей',
            field: 'hasForeignAssetsOrLawsuits',
          },
          {
            key: 'lawsuits',
            label: 'Судебные споры по имуществу или долгам',
            field: 'hasForeignAssetsOrLawsuits',
          },
          { key: 'none', label: 'Ничего из этого' },
        ],
      },
    ],
  },
  {
    emoji: '🔎',
    title: 'Важные детали',
    questions: [
      {
        kind: 'multi',
        id: 'risks',
        emoji: '🔎',
        text: 'Было ли у вас что-то из этого?',
        note: 'Отметьте всё, что подходит. Если ничего — выберите последний вариант.',
        fields: [
          'movedMoneyBeforeFiling',
          'hasAlimonyDebt',
          'hasLifeHealthHarmDebt',
          'hasEconomicCriminalCase',
          'guaranteedOthersDebt',
          'incomeUnofficial',
          'largeThirdPartyDeposits',
        ],
        options: [
          {
            key: 'movedMoney',
            label: 'Снимали или переводили крупные суммы со счетов в последнее время',
            field: 'movedMoneyBeforeFiling',
          },
          { key: 'alimony', label: 'Есть долги по алиментам', field: 'hasAlimonyDebt' },
          {
            key: 'harm',
            label: 'Есть долги за вред здоровью или жизни человека',
            field: 'hasLifeHealthHarmDebt',
          },
          {
            key: 'criminal',
            label: 'Есть уголовное дело, связанное с деньгами или бизнесом',
            field: 'hasEconomicCriminalCase',
          },
          {
            key: 'guarantee',
            label: 'Поручались по чужому кредиту',
            field: 'guaranteedOthersDebt',
          },
          {
            key: 'income',
            label: 'Доход неофициальный или его сложно подтвердить',
            field: 'incomeUnofficial',
          },
          {
            key: 'deposits',
            label: 'На счёт приходили крупные суммы от других людей',
            field: 'largeThirdPartyDeposits',
          },
          { key: 'none', label: 'Ничего из этого нет' },
        ],
      },
    ],
  },
  {
    emoji: '🚀',
    title: 'Как продолжить',
    questions: [
      {
        kind: 'single',
        id: 'path',
        emoji: '🚀',
        text: 'Как хотите пройти процедуру?',
        options: [
          {
            key: 'self',
            label: 'Хочу всё сделать сам через приложение',
            patch: { preferredPath: 'SELF_SERVICE' },
          },
          {
            key: 'lawyer',
            label: 'Хочу помощь юриста',
            patch: { preferredPath: 'LAWYER' },
          },
          {
            key: 'exploring',
            label: 'Пока просто хочу разобраться',
            patch: { preferredPath: 'EXPLORING' },
          },
        ],
      },
    ],
  },
];

/**
 * Consequences of court bankruptcy — each with a plain-language explanation revealed on tap.
 * PLACEHOLDER — wording and the exact legal periods are pending lawyer review.
 */
const CONSEQUENCES: { title: string; detail: string }[] = [
  {
    title: 'Имущество могут продать на торгах.',
    detail: 'За исключением имущества, которое защищено законом (например, единственного жилья, '
      + 'если оно не находится в ипотеке). Вырученные средства направляются на погашение долгов '
      + 'перед кредиторами.',
  },
  {
    title: 'В течение 5 лет нужно сообщать о банкротстве при получении кредита или займа.',
    detail: 'Если вы обращаетесь за кредитом или займом, вы обязаны уведомить кредитора о том, '
      + 'что проходили процедуру банкротства.',
  },
  {
    title: 'Действуют ограничения на руководящие должности.',
    detail: 'В течение 3 лет нельзя руководить юридическим лицом, в течение 5 лет — страховой '
      + 'компанией, микрофинансовой организацией, НПФ или инвестиционным фондом, а в течение '
      + '10 лет — банком.',
  },
  {
    title: 'Повторное банкротство возможно только через 5 лет.',
    detail: 'В течение этого срока нельзя повторно обратиться в суд с заявлением о собственном '
      + 'банкротстве.',
  },
  {
    title: 'Во время процедуры финансами распоряжается финансовый управляющий.',
    detail: 'Он контролирует счета, имущество и сделки должника, а также проводит расчёты с '
      + 'кредиторами в порядке, установленном законом.',
  },
  {
    title: 'Не все долги списываются.',
    detail: 'Не подлежат списанию, например, алименты, требования о возмещении вреда жизни или '
      + 'здоровью и некоторые другие обязательства, перечисленные в законе.',
  },
  {
    title: 'Если вы были ИП, статус предпринимателя прекращается.',
    detail: 'После признания банкротом регистрация в качестве ИП прекращается, а повторно '
      + 'зарегистрироваться в качестве ИП можно только через 5 лет.',
  },
];

/** questionId → chosen option keys (a single-choice question keeps exactly one). */
type Picked = Record<string, string[]>;

function buildAnswers(picked: Picked): EligibilityAnswers {
  let answers: Patch = {};
  for (const group of GROUPS) {
    for (const question of group.questions) {
      const chosen = picked[question.id] ?? [];
      if (question.kind === 'single') {
        const option = question.options.find((o) => o.key === chosen[0]);
        if (option) {
          answers = { ...answers, ...option.patch };
        }
      } else {
        for (const field of question.fields) {
          answers = { ...answers, [field]: false };
        }
        for (const key of chosen) {
          const option = question.options.find((o) => o.key === key);
          if (option?.field) {
            answers = { ...answers, [option.field]: true };
          }
        }
      }
    }
  }
  return answers as EligibilityAnswers;
}

export default function EligibilityPage() {
  const [started, setStarted] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);
  const [picked, setPicked] = useState<Picked>({});
  const [incomplete, setIncomplete] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (answers: EligibilityAnswers) => {
    setPending(true);
    setError(false);
    try {
      setResult(await checkEligibility(answers));
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };

  const choose = (question: Question, key: string) => {
    setIncomplete(false);
    setPicked((current) => {
      if (question.kind === 'single') {
        return { ...current, [question.id]: [key] };
      }
      const chosen = current[question.id] ?? [];
      const option = question.options.find((o) => o.key === key);
      // The "nothing of the sort" option is exclusive both ways.
      if (!option?.field) {
        return { ...current, [question.id]: [key] };
      }
      const withoutNone = chosen.filter((k) => question.options.find((o) => o.key === k)?.field);
      const next = withoutNone.includes(key)
        ? withoutNone.filter((k) => k !== key)
        : [...withoutNone, key];
      return { ...current, [question.id]: next };
    });
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
            <button type="button" className="landing-cta" onClick={() => void submit(buildAnswers(picked))}>
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

  const group = GROUPS[groupIndex];
  const isLast = groupIndex === GROUPS.length - 1;
  const groupAnswered = group.questions.every((q) => (picked[q.id] ?? []).length > 0);

  const goNext = () => {
    if (!groupAnswered) {
      setIncomplete(true);
      return;
    }
    setIncomplete(false);
    if (isLast) {
      void submit(buildAnswers(picked));
    } else {
      setGroupIndex(groupIndex + 1);
    }
  };

  const goBack = () => {
    setIncomplete(false);
    if (groupIndex === 0) {
      setStarted(false);
    } else {
      setGroupIndex(groupIndex - 1);
    }
  };

  return (
    <main className="check check-intro">
      <div className="check-progress" aria-label={`Шаг ${groupIndex + 1} из ${GROUPS.length}`}>
        <div
          className="check-progress-fill"
          style={{ width: `${(groupIndex / GROUPS.length) * 100}%` }}
        />
      </div>
      <p className="check-group">
        {group.emoji} {group.title} · шаг {groupIndex + 1} из {GROUPS.length}
      </p>

      {group.questions.map((question) => {
        const chosen = picked[question.id] ?? [];
        return (
          <fieldset key={question.id} className="q">
            <legend className="q-text">
              {question.emoji} {question.text}
            </legend>
            {question.note && <p className="q-note">{question.note}</p>}
            <div className="check-options">
              {question.options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={chosen.includes(option.key)}
                  className={`check-option${chosen.includes(option.key) ? ' check-option-selected' : ''}`}
                  onClick={() => choose(question, option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        );
      })}

      {incomplete && (
        <p className="auth-error" role="alert">
          Ответьте на все вопросы на этом экране.
        </p>
      )}

      <button type="button" className="landing-cta" onClick={goNext}>
        {isLast ? 'Показать результат' : 'Далее'}
      </button>
      <button type="button" className="check-back" onClick={goBack}>
        ← Назад
      </button>
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
        Банкротство спишет долги, но у него есть последствия. Нажмите на пункт, чтобы узнать
        подробнее:
      </p>
      <ul className="check-checklist">
        {CONSEQUENCES.map((item) => (
          <li key={item.title}>
            <details className="check-fact">
              <summary>{item.title}</summary>
              <p>{item.detail}</p>
            </details>
          </li>
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
  if (result.decision === 'DEBT_TOO_SMALL') {
    return (
      <main className="check">
        <h1 className="check-question">Для такого долга банкротство обычно не нужно</h1>
        <p className="check-hint">
          При долге меньше 350 тысяч ₽ проходить банкротство чаще всего невыгодно: процедура
          долгая и с последствиями, а с такой суммой обычно можно справиться проще.
        </p>
        <p className="check-hint">
          Поэтому «Рестарт» здесь не поможет. Если долг вырастет или ситуация изменится —
          возвращайтесь.
        </p>
        <Link to="/" className="check-back">На главную</Link>
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
