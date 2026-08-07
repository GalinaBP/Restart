import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  checkEligibility,
  type EligibilityAnswers,
  type EligibilityResult,
} from '../api/eligibility';

/**
 * The 2-minute eligibility check. It opens with a plain-language "what bankruptcy means"
 * checklist (the consequences screen), then walks grouped screens of questions.
 * All decision logic lives in the backend; this screen only collects answers.
 *
 * The order of the questions is the story of the debts: how much and of what kind → whether the
 * person can pay → when the debts arose and whether more was borrowed after the trouble started →
 * what they own → business → deals → family → courts and money → special obligations → costs →
 * what they want to do. Two follow-ups appear only when the answer before them calls for it.
 *
 * PLACEHOLDER: the consequences and the questions are pending lawyer review.
 */

/** One tappable answer. Options carry no emoji — only questions and group headings do. */
interface Option {
  value: string;
  label: string;
}

interface BaseQuestion {
  id: string;
  /** Which answer field this question fills in. */
  field: keyof EligibilityAnswers;
  emoji: string;
  text: string;
  note?: string;
  options: Option[];
  /** Shown only when the answers so far call for it. */
  when?: (picked: Picked) => boolean;
}

interface SingleQuestion extends BaseQuestion {
  kind: 'single';
}

interface MultiQuestion extends BaseQuestion {
  kind: 'multi';
  /** The "nothing of the sort" answer — exclusive with every other option, both ways. */
  exclusive: string;
}

type Question = SingleQuestion | MultiQuestion;

interface Group {
  emoji: string;
  title: string;
  questions: Question[];
}

/** questionId → chosen option values (a single-choice question keeps exactly one). */
type Picked = Record<string, string[]>;

const chose = (picked: Picked, id: string, value: string) => (picked[id] ?? []).includes(value);

const GROUPS: Group[] = [
  {
    emoji: '💸',
    title: 'Долги',
    questions: [
      {
        kind: 'single',
        id: 'debtRange',
        field: 'debtRange',
        emoji: '💰',
        text: 'Сколько у вас долгов примерно?',
        options: [
          { value: 'UNDER_500K', label: 'До 500 тыс. ₽' },
          { value: 'FROM_500K_TO_1M', label: '500 тыс. – 1 млн ₽' },
          { value: 'FROM_1M_TO_3M', label: '1–3 млн ₽' },
          { value: 'OVER_3M', label: 'Больше 3 млн ₽' },
          { value: 'UNKNOWN', label: 'Не знаю' },
        ],
      },
      {
        kind: 'multi',
        id: 'debtTypes',
        field: 'debtTypes',
        emoji: '🧾',
        text: 'Какие у вас долги?',
        note: 'Можно выбрать несколько вариантов.',
        exclusive: 'UNKNOWN',
        options: [
          { value: 'CREDITS', label: 'Кредиты и кредитные карты' },
          { value: 'MICROLOANS', label: 'Микрозаймы' },
          { value: 'INSTALMENTS', label: 'Рассрочки' },
          { value: 'TAXES', label: 'Налоги' },
          { value: 'PRIVATE_PERSONS', label: 'Долги людям' },
          { value: 'ALIMONY', label: 'Алименты' },
          { value: 'LIFE_HEALTH_HARM', label: 'Возмещение вреда жизни или здоровью' },
          { value: 'OTHER', label: 'Другое' },
          { value: 'UNKNOWN', label: 'Не знаю' },
        ],
      },
    ],
  },
  {
    emoji: '📉',
    title: 'Платежи',
    questions: [
      {
        kind: 'single',
        id: 'paymentStatus',
        field: 'paymentStatus',
        emoji: '📆',
        text: 'Что сейчас происходит с платежами по долгам?',
        options: [
          { value: 'ON_TIME', label: 'Плачу всё вовремя' },
          { value: 'SOME_OVERDUE', label: 'Есть отдельные просрочки' },
          { value: 'CANNOT_PAY_MOST', label: 'Не могу платить по большинству долгов' },
          { value: 'NOT_PAYING_FOR_MONTHS', label: 'Не плачу уже несколько месяцев' },
          { value: 'NEW_LOANS_FOR_OLD', label: 'Беру новые займы, чтобы платить старые' },
        ],
      },
      {
        kind: 'single',
        id: 'loanAge',
        field: 'loanAge',
        emoji: '🕰️',
        text: 'Когда вы брали основные кредиты?',
        options: [
          { value: 'OVER_YEAR_AGO', label: 'Больше года назад' },
          { value: 'WITHIN_LAST_YEAR', label: 'В течение последнего года' },
          { value: 'LAST_3_MONTHS', label: 'В последние 3 месяца' },
          { value: 'DONT_REMEMBER', label: 'Не помню' },
        ],
      },
      {
        kind: 'single',
        id: 'knewCouldNotRepay',
        field: 'knewCouldNotRepay',
        emoji: '🤔',
        text: 'Вы брали новые кредиты или займы, уже понимая, что не сможете их погашать?',
        when: (picked) => chose(picked, 'loanAge', 'LAST_3_MONTHS'),
        options: [
          { value: 'NO', label: 'Нет' },
          { value: 'YES', label: 'Да' },
          { value: 'UNSURE', label: 'Не уверен(а)' },
        ],
      },
      {
        kind: 'single',
        id: 'newLoansAfterTrouble',
        field: 'newLoansAfterTrouble',
        emoji: '🔁',
        text: 'После того как начались серьёзные проблемы с платежами, '
          + 'вы брали новые кредиты или займы?',
        options: [
          { value: 'NO', label: 'Нет' },
          { value: 'YES', label: 'Да' },
          { value: 'UNSURE', label: 'Не помню' },
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
        field: 'property',
        emoji: '🔑',
        text: 'Есть ли у вас имущество?',
        note: 'Можно выбрать несколько вариантов.',
        exclusive: 'NOTHING',
        options: [
          { value: 'NOTHING', label: 'Ничего, кроме обычных личных вещей' },
          { value: 'VEHICLE', label: 'Автомобиль или мотоцикл' },
          { value: 'HOME', label: 'Квартира или дом' },
          { value: 'LAND', label: 'Земельный участок' },
          { value: 'PROPERTY_SHARE', label: 'Доля в недвижимости' },
          { value: 'OTHER', label: 'Другое имущество' },
          { value: 'UNKNOWN', label: 'Не знаю' },
        ],
      },
      {
        kind: 'single',
        id: 'businessStatus',
        field: 'businessStatus',
        emoji: '💼',
        text: 'Есть ли у вас или был недавно статус ИП или бизнес?',
        options: [
          { value: 'NONE', label: 'Нет' },
          { value: 'SELF_EMPLOYED', label: 'Я самозанятый, но ИП не оформлял(а)' },
          { value: 'CURRENT_ENTREPRENEUR', label: 'Я сейчас ИП' },
          { value: 'RECENTLY_CLOSED_ENTREPRENEUR', label: 'Я недавно закрыл(а) ИП' },
          { value: 'COMPANY_OWNER', label: 'Владею компанией или долей в компании' },
        ],
      },
    ],
  },
  {
    emoji: '📋',
    title: 'Сделки и семья',
    questions: [
      {
        kind: 'single',
        id: 'soldOrGiftedAssets',
        field: 'soldOrGiftedAssets',
        emoji: '🤝',
        text: 'За последние 3 года вы продавали или дарили имущество?',
        options: [
          { value: 'NO', label: 'Нет' },
          { value: 'YES', label: 'Да' },
          { value: 'UNSURE', label: 'Не уверен(а)' },
        ],
      },
      {
        kind: 'multi',
        id: 'dealAssets',
        field: 'dealAssets',
        emoji: '📦',
        text: 'Что именно вы продавали или дарили?',
        note: 'Можно выбрать несколько вариантов.',
        when: (picked) => chose(picked, 'soldOrGiftedAssets', 'YES'),
        exclusive: 'DONT_REMEMBER',
        options: [
          { value: 'REAL_ESTATE', label: 'Квартиру или дом' },
          { value: 'LAND', label: 'Землю' },
          { value: 'VEHICLE', label: 'Автомобиль' },
          { value: 'OTHER_PROPERTY', label: 'Другое имущество' },
          { value: 'MONEY', label: 'Деньги или другое' },
          { value: 'DONT_REMEMBER', label: 'Не помню' },
        ],
      },
      {
        kind: 'single',
        id: 'maritalStatus',
        field: 'maritalStatus',
        emoji: '💍',
        text: 'Состоите ли вы сейчас в браке или были в браке в последние 3 года?',
        options: [
          { value: 'NO', label: 'Нет' },
          { value: 'MARRIED', label: 'Да, сейчас в браке' },
          { value: 'DIVORCED_WITHIN_3_YEARS', label: 'Да, развёлся(лась) менее 3 лет назад' },
        ],
      },
    ],
  },
  {
    emoji: '🔎',
    title: 'Суды и счета',
    questions: [
      {
        kind: 'single',
        id: 'hasForeignAssets',
        field: 'hasForeignAssets',
        emoji: '🌍',
        text: 'Есть ли у вас имущество или банковские счета за пределами России?',
        options: [
          { value: 'false', label: 'Нет' },
          { value: 'true', label: 'Да' },
        ],
      },
      {
        kind: 'single',
        id: 'hasLawsuits',
        field: 'hasLawsuits',
        emoji: '⚖️',
        text: 'Есть ли сейчас судебные дела, связанные с вашими долгами или имуществом?',
        options: [
          { value: 'NO', label: 'Нет' },
          { value: 'YES', label: 'Да' },
          { value: 'UNSURE', label: 'Не знаю' },
        ],
      },
      {
        kind: 'single',
        id: 'hasEnforcementProceedings',
        field: 'hasEnforcementProceedings',
        emoji: '📬',
        text: 'Есть ли сейчас исполнительные производства у приставов?',
        note: 'Это обычная ситуация при долгах — ответ ни на что не повлияет, '
          + 'но помогает понять картину.',
        options: [
          { value: 'NO', label: 'Нет' },
          { value: 'YES', label: 'Да' },
          { value: 'UNSURE', label: 'Не знаю' },
        ],
      },
    ],
  },
  {
    emoji: '💳',
    title: 'Деньги и обязательства',
    questions: [
      {
        kind: 'single',
        id: 'unusualMoneyOperations',
        field: 'unusualMoneyOperations',
        emoji: '💸',
        text: 'За последний год были крупные или необычные операции по вашим счетам?',
        options: [
          { value: 'NO', label: 'Нет' },
          { value: 'YES', label: 'Да' },
          { value: 'UNSURE', label: 'Не уверен(а)' },
        ],
      },
      {
        kind: 'multi',
        id: 'moneyOperations',
        field: 'moneyOperations',
        emoji: '🧮',
        text: 'Что происходило?',
        note: 'Можно выбрать несколько вариантов.',
        when: (picked) => chose(picked, 'unusualMoneyOperations', 'YES'),
        exclusive: 'OTHER',
        options: [
          { value: 'LARGE_CASH_WITHDRAWALS', label: 'Снимал(а) крупные суммы наличными' },
          { value: 'TRANSFERS_TO_OTHERS', label: 'Переводил(а) деньги другим людям' },
          { value: 'RECEIPTS_FROM_OTHERS', label: 'Получал(а) крупные суммы от других людей' },
          { value: 'BETWEEN_OWN_ACCOUNTS', label: 'Переводил(а) деньги между своими счетами' },
          { value: 'OTHER', label: 'Другое' },
        ],
      },
      {
        kind: 'multi',
        id: 'specialCircumstances',
        field: 'specialCircumstances',
        emoji: '⚠️',
        text: 'Есть ли у вас что-то из этого?',
        note: 'Можно выбрать несколько вариантов.',
        exclusive: 'NONE',
        options: [
          { value: 'ALIMONY_DEBT', label: 'Есть долги по алиментам' },
          { value: 'LIFE_HEALTH_HARM_DEBT', label: 'Есть долг за вред жизни или здоровью' },
          {
            value: 'ECONOMIC_CRIMINAL_CASE',
            label: 'Есть уголовное дело, связанное с деньгами или бизнесом',
          },
          { value: 'GUARANTOR', label: 'Я поручитель по чужому кредиту' },
          { value: 'OTHER_UNUSUAL', label: 'Есть другое необычное обязательство' },
          { value: 'NONE', label: 'Ничего из этого' },
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
        id: 'costsReadiness',
        field: 'costsReadiness',
        emoji: '🧾',
        text: 'Готовы ли вы оплатить обязательные расходы процедуры?',
        note: 'Даже при самостоятельной подаче есть обязательные расходы: работа управляющего, '
          + 'публикации, почта. Точная сумма зависит от ситуации.',
        options: [
          { value: 'READY', label: 'Да' },
          { value: 'UNSURE', label: 'Пока не уверен(а)' },
          { value: 'NO_MONEY', label: 'Сейчас денег на это нет' },
        ],
      },
      {
        kind: 'single',
        id: 'preferredPath',
        field: 'preferredPath',
        emoji: '🧭',
        text: 'Что вы хотите сделать сейчас?',
        options: [
          { value: 'SELF_SERVICE', label: 'Хочу пройти всё самостоятельно' },
          { value: 'LAWYER', label: 'Хочу помощь юриста' },
          { value: 'EXPLORING', label: 'Пока просто хочу разобраться' },
        ],
      },
    ],
  },
];

const CONSEQUENCES: { title: string; detail: string }[] = [
  {
    title: 'Имущество могут продать на торгах.',
    detail: 'Единственное жильё обычно остаётся с вами. Всё остальное ценное — машина, вторая '
      + 'квартира, дорогая техника — может уйти на торги, чтобы рассчитаться с долгами.',
  },
  {
    title: 'В течение 5 лет нужно сообщать о банкротстве при получении кредита или займа.',
    detail: 'Отказать вам не обязаны, но знать об этом банк должен. Проще говоря: новые кредиты '
      + 'какое-то время будут даваться тяжелее.',
  },
  {
    title: 'Действуют ограничения на руководящие должности.',
    detail: 'Три года нельзя руководить компанией. Работать по найму, в том числе на хорошей '
      + 'должности, это не мешает.',
  },
  {
    title: 'Повторное банкротство возможно только через 5 лет.',
    detail: 'Если долги появятся снова, пройти процедуру ещё раз получится не сразу.',
  },
  {
    title: 'Во время процедуры финансами распоряжается финансовый управляющий.',
    detail: 'Он контролирует счета и крупные операции, пока идёт дело. Это временно и касается '
      + 'только периода процедуры.',
  },
  {
    title: 'Не все долги списываются.',
    detail: 'Алименты и возмещение вреда жизни или здоровью остаются с вами в любом случае.',
  },
  {
    title: 'Если вы были ИП, статус предпринимателя прекращается.',
    detail: 'И год после этого зарегистрировать ИП снова не получится.',
  },
];

/** Every question that is actually on screen right now — the follow-ups appear as answers land. */
function visibleQuestions(group: Group, picked: Picked): Question[] {
  return group.questions.filter((question) => !question.when || question.when(picked));
}

/** Turns the taps into the payload the backend expects. */
function buildAnswers(picked: Picked): EligibilityAnswers {
  const answers: Record<string, unknown> = {};
  for (const group of GROUPS) {
    for (const question of visibleQuestions(group, picked)) {
      const chosen = picked[question.id] ?? [];
      if (question.kind === 'multi') {
        answers[question.field] = chosen;
      } else if (question.field === 'hasForeignAssets') {
        answers[question.field] = chosen[0] === 'true';
      } else {
        answers[question.field] = chosen[0];
      }
    }
  }
  return answers as unknown as EligibilityAnswers;
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

  const choose = (question: Question, value: string) => {
    setIncomplete(false);
    setPicked((current) => {
      if (question.kind === 'single') {
        return { ...current, [question.id]: [value] };
      }
      const chosen = current[question.id] ?? [];
      // The "nothing of the sort" option is exclusive both ways.
      if (value === question.exclusive) {
        return { ...current, [question.id]: [value] };
      }
      const withoutExclusive = chosen.filter((v) => v !== question.exclusive);
      const next = withoutExclusive.includes(value)
        ? withoutExclusive.filter((v) => v !== value)
        : [...withoutExclusive, value];
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
  const questions = visibleQuestions(group, picked);
  const isLast = groupIndex === GROUPS.length - 1;
  const groupAnswered = questions.every((q) => (picked[q.id] ?? []).length > 0);

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

      {questions.map((question) => {
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
                  key={option.value}
                  type="button"
                  aria-pressed={chosen.includes(option.value)}
                  className={`check-option${chosen.includes(option.value) ? ' check-option-selected' : ''}`}
                  onClick={() => choose(question, option.value)}
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
  if (result.decision === 'NOT_READY_FOR_COSTS') {
    return (
      <main className="check">
        <h1 className="check-question">Пока лучше подождать: будут обязательные расходы</h1>
        <p className="check-hint">
          Суд не начнёт процедуру без обязательных платежей — это работа управляющего, публикации
          и письма.
        </p>
        <p className="check-hint">
          Вернитесь, когда получится отложить эту сумму, — со всем остальным мы поможем.
        </p>
        <Link to="/" className="check-back">На главную</Link>
      </main>
    );
  }
  if (result.decision === 'NOT_RECOMMENDED') {
    return (
      <main className="check">
        <h1 className="check-question">Похоже, банкротство вам сейчас не поможет</h1>
        <p className="check-hint">Вот почему:</p>
        <ul className="check-reasons">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <p className="check-hint">
          Мы могли бы провести вас по шагам, но это было бы нечестно: процедура не даст того,
          ради чего вы её начинаете. Если ситуация изменится — возвращайтесь.
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
