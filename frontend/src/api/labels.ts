/**
 * Plain-Russian labels for the data-collection wizard. The backend's sections.yml owns WHICH
 * fields exist (the form is rendered from its metadata); this map only owns how they read on
 * screen — warm, short, zero legalese, per the product constitution. A field missing here still
 * renders (with its technical name), so a backend config change never breaks the wizard.
 */

export interface SectionLabel {
  title: string;
  hint?: string;
  /** What one entry is called in a repeatable section: «Добавить кредитора». */
  entryName?: string;
  /**
   * Honest heads-up on a step where some answers put the case outside what this app can handle
   * on its own (the ICP is an unmarried debtor with no property or business). Always visible —
   * the user should see it before answering, not after.
   */
  caution?: string;
  /**
   * Collapsed how-to, opened on tap: title, numbered steps, an optional official link and a
   * closing note. `link` opens in a new tab — the user is mid-form and must not lose it.
   */
  help?: {
    summary: string;
    steps: string[];
    link?: { href: string; text: string };
    note?: string;
  };
}

export const SECTION_LABELS: Record<string, SectionLabel> = {
  PERSONAL_DETAILS: { title: 'Немного о вас' },
  PASSPORT: { title: 'Паспорт' },
  REGISTRATION_ADDRESS: { title: 'Где вы прописаны' },
  CONTACT_INFO: { title: 'Как с вами связаться' },
  EMPLOYMENT: {
    title: 'Работа',
    help: {
      summary: 'Какие документы о работе стоит подготовить заранее?',
      steps: [
        'Трудовая книжка — бумажная или выписка из электронной. Выписку можно заказать на Госуслугах или в СФР.',
        'Справки о доходах и удержанных налогах (2-НДФЛ) за последние три года — их выдаёт работодатель или можно скачать в личном кабинете налоговой.',
        'Если сейчас вы не работаете — справка из центра занятости, если вы там на учёте.',
      ],
      note: 'Суд часто просит донести именно эти документы уже после того, как принял заявление, — и назначает срок. Если подготовить их заранее, заседание не придётся откладывать.',
    },
  },
  MONTHLY_INCOME: {
    title: 'Доход в месяц',
    hint: 'Ваш основной доход. Другие доходы — на следующем шаге.',
  },
  OTHER_INCOME: {
    title: 'Другие доходы',
    hint: 'Всё, что приходит помимо основного дохода: аренда, подработка, алименты, пособия. Если таких доходов нет — просто сохраните пустой список.',
    entryName: 'Добавить доход',
  },
  MARITAL_STATUS: {
    title: 'Семейное положение',
    caution: 'Сервис рассчитан на тех, кто не состоит в браке. Если вы замужем или женаты, часть имущества считается общей — такое дело почти всегда требует юриста, и мы честно об этом скажем.',
  },
  DEPENDENTS: {
    title: 'Кто на вашем обеспечении',
    hint: 'Дети или другие близкие, которых вы содержите. Если таких нет — просто сохраните пустой список.',
    entryName: 'Добавить человека',
    caution: 'Если у вас есть несовершеннолетние дети, суд обычно привлекает к делу орган опеки — он следит, чтобы права ребёнка не пострадали. Это обычный порядок, а не проверка вас: ребёнок здесь под защитой.',
  },
  CREDITORS: {
    title: 'Кому и сколько вы должны',
    hint: 'Каждый банк, МФО или человек, которому вы должны, — с суммой и датой, с которой платить не получается. Ничего не пропускайте: долг, о котором вы не сказали, не спишется.',
    entryName: 'Добавить долг',
    help: {
      summary: 'Как узнать, какие кредиты оформлены на ваше имя?',
      steps: [
        'Зайдите на Госуслуги и запросите перечень бюро кредитных историй (БКИ), где хранятся ваши данные.',
        'Откройте официальный сайт каждого указанного БКИ, войдите через Госуслуги и закажите кредитный отчёт.',
      ],
      note: 'В отчёте будут действующие кредиты, займы, кредитные карты, остатки задолженности и просрочки. Проверьте все БКИ из списка — данные могут храниться в разных бюро. В каждом БКИ отчёт бесплатный два раза в год, дальше может быть платно.',
    },
  },
  BANK_ACCOUNTS: {
    title: 'Счета и карты',
    hint: 'Все счета в банках, даже пустые.',
    entryName: 'Добавить счёт',
  },
  REAL_ESTATE: {
    title: 'Недвижимость',
    hint: 'Если недвижимости нет — просто сохраните пустой список.',
    entryName: 'Добавить объект',
    caution: 'Сервис рассчитан на тех, у кого нет недвижимости, кроме единственного жилья. Если объект здесь появится, дело, скорее всего, придётся вести с юристом.',
  },
  VEHICLES: {
    title: 'Транспорт',
    hint: 'Если транспорта нет — просто сохраните пустой список.',
    entryName: 'Добавить транспорт',
    caution: 'Сервис рассчитан на тех, у кого нет машины или другого транспорта: его почти всегда включают в конкурсную массу и продают. Если транспорт есть — лучше обсудить дело с юристом.',
  },
  COURT_PROCEEDINGS: {
    title: 'Суды',
    hint: 'Дела в судах, где вы участвуете. Нет таких — сохраните пустой список.',
    entryName: 'Добавить дело',
  },
  ENFORCEMENT_PROCEEDINGS: {
    title: 'Приставы',
    hint: 'Если приставы уже взыскивают с вас долги — укажите эти производства.',
    entryName: 'Добавить производство',
  },
  PAYMENTS: {
    title: 'Оплата пошлины и депозита',
    hint: 'Отметьте, что уже оплачено. Пока платежи не отмечены, шаг «Пошлина и депозит» на вашем пути остаётся незакрытым.',
    help: {
      summary: 'Почему платить нужно до подачи?',
      steps: [
        'Госпошлина оплачивается по реквизитам, которые суд публикует у себя на сайте.',
        'Депозит на работу управляющего вносится на депозитный счёт суда — тоже до подачи заявления.',
        'Обе квитанции прикладываются к заявлению: без них его могут не принять.',
      ],
      note: 'Суммы и реквизиты берите на сайте вашего суда: они меняются, и ошибка в реквизитах означает, что деньги уйдут не туда.',
    },
  },
  FILING_SUBMISSION: {
    title: 'Подача заявления в суд',
    hint: 'Когда вы отправите готовый комплект документов в суд, отметьте это здесь — дату, суд и номер или отметку о приёме, если она у вас уже есть. Это последний шаг перед тем, как суд возьмёт дело в работу.',
    help: {
      summary: 'Как подать документы в суд?',
      steps: [
        'Распечатайте заявление, список кредиторов и опись имущества.',
        'Проверьте каждую страницу: данные паспорта, суммы, адреса.',
        'Подпишите каждый документ там, где стоит линия для подписи.',
        'Соберите копии из перечня прилагаемых документов — по одному комплекту для суда и для каждого кредитора.',
        'Если ещё не сделали этого — оплатите госпошлину и внесите депозит на вознаграждение управляющего.',
        'Отправьте комплект в суд: лично через канцелярию, почтой с описью вложения или через «Мой арбитр».',
      ],
      note: 'Сохраните отметку о приёме — штамп на копии или уведомление о вручении. Впишите дату подачи ниже, и этот шаг отметится как пройденный.',
    },
  },
  COURT_CASE: {
    title: 'Дело в суде',
    hint: 'Когда суд примет заявление, у дела появится номер — впишите его сюда вместе с датой принятия. Решение суда добавьте, как только оно будет.',
  },
  COURT_HEARINGS: {
    title: 'Заседания суда',
    hint: 'Каждое заседание по вашему делу — дата, о чём оно и чем закончилось. Заседание могут перенести или назначить не одно — добавляйте их сюда по мере того, как узнаёте даты.',
    entryName: 'Добавить заседание',
  },
  EFRSB_PUBLICATION: {
    title: 'Публикация в реестре',
    hint: 'Когда сведения о вашем деле опубликуют в едином реестре сведений о банкротстве (ЕФРСБ), впишите дату публикации и номер сообщения сюда — от неё считается срок, за который кредиторы могут заявить свои требования.',
  },
  FILED_CLAIMS: {
    title: 'Требования кредиторов в деле',
    hint: 'Это не тот список, что вы составляли сами, — здесь фиксируются требования, которые кредиторы заявили суду в ходе вашего дела. По каждому требованию: кто заявил, сколько, когда, и оспариваете ли вы его.',
    entryName: 'Добавить требование',
  },
  MANAGER_SRO: {
    title: 'Кто будет вести ваше дело',
    hint: 'Вашим делом будет заниматься отдельный человек — финансовый управляющий. Его назначает суд, но выбирает не из воздуха: вы называете организацию, из числа участников которой его и утвердят. Её и нужно указать здесь.',
    help: {
      summary: 'Как выбрать эту организацию?',
      steps: [
        'Откройте реестр саморегулируемых организаций арбитражных управляющих — его ведёт Росреестр, он публичный и бесплатный.',
        'Выберите организацию и возьмите из реестра её точное название и адрес — их и впишите ниже.',
        'Если можете, заранее спросите в организации, готовы ли они вести ваше дело: управляющие берут не каждое.',
      ],
      link: {
        href: 'https://bankrot.fedresurs.ru',
        text: 'Открыть реестр арбитражных управляющих (ЕФРСБ)',
      },
      note: 'Это один из тех шагов, где стоит не торопиться: без указанной организации суд не сможет назначить управляющего, а без управляющего дело не пойдёт.',
    },
  },
  MANAGER_CORRESPONDENCE: {
    title: 'Переписка с управляющим',
    hint: 'Ваш личный журнал — что отправил вам управляющий, когда и по какому вопросу. Это только для ваших записей, ничего не блокирует.',
    entryName: 'Добавить запись',
  },
};

/** Field labels keyed «SECTION.field»; look up via fieldLabel(). */
const FIELD_LABELS: Record<string, string> = {
  'PERSONAL_DETAILS.lastName': 'Фамилия',
  'PERSONAL_DETAILS.firstName': 'Имя',
  'PERSONAL_DETAILS.middleName': 'Отчество (если есть)',
  'PERSONAL_DETAILS.birthDate': 'Дата рождения',
  'PERSONAL_DETAILS.birthPlace': 'Место рождения — как в паспорте',
  'PERSONAL_DETAILS.inn': 'ИНН (если знаете)',
  'PERSONAL_DETAILS.snils': 'СНИЛС (если знаете)',
  'PASSPORT.series': 'Серия — 4 цифры',
  'PASSPORT.number': 'Номер — 6 цифр',
  'PASSPORT.issuedBy': 'Кем выдан — как в паспорте',
  'PASSPORT.issueDate': 'Дата выдачи',
  'PASSPORT.departmentCode': 'Код подразделения (если есть)',
  'REGISTRATION_ADDRESS.region': 'Регион',
  'REGISTRATION_ADDRESS.city': 'Город или посёлок',
  'REGISTRATION_ADDRESS.street': 'Улица',
  'REGISTRATION_ADDRESS.house': 'Дом',
  'REGISTRATION_ADDRESS.apartment': 'Квартира (если есть)',
  'REGISTRATION_ADDRESS.postalCode': 'Индекс (если знаете)',
  'CONTACT_INFO.phone': 'Телефон',
  'CONTACT_INFO.email': 'Электронная почта',
  'EMPLOYMENT.status': 'Чем вы сейчас занимаетесь — работаете, ищете работу…',
  'EMPLOYMENT.employerName': 'Где работаете (если работаете)',
  'EMPLOYMENT.position': 'Кем (если работаете)',
  'MONTHLY_INCOME.amount': 'Сколько получаете в месяц, ₽',
  'MONTHLY_INCOME.source': 'Откуда этот доход — зарплата, пособие…',
  'OTHER_INCOME.source': 'Откуда доход — аренда, подработка…',
  'OTHER_INCOME.amount': 'Сколько в месяц, ₽',
  'MARITAL_STATUS.status': 'Ваше семейное положение',
  'DEPENDENTS.fullName': 'ФИО',
  'DEPENDENTS.birthDate': 'Дата рождения',
  'DEPENDENTS.relation': 'Кем приходится — сын, дочь…',
  'CREDITORS.name': 'Название банка или МФО',
  'CREDITORS.inn': 'ИНН кредитора (есть в договоре)',
  'CREDITORS.address': 'Адрес кредитора (есть в договоре)',
  'CREDITORS.debtAmount': 'Сколько должны, ₽',
  'CREDITORS.debtType': 'Что это — кредит, карта, микрозаём…',
  'CREDITORS.overdueSinceDate': 'С какого числа не получается платить',
  'BANK_ACCOUNTS.bankName': 'Банк',
  'BANK_ACCOUNTS.accountNumber': 'Номер счёта',
  'BANK_ACCOUNTS.balance': 'Сколько на счёте, ₽',
  'REAL_ESTATE.type': 'Что это — квартира, дом, участок…',
  'REAL_ESTATE.address': 'Адрес',
  'REAL_ESTATE.area': 'Площадь, м²',
  'REAL_ESTATE.ownershipShare': 'Ваша доля — например, «1/2» или «вся»',
  'VEHICLES.type': 'Что это — машина, мотоцикл…',
  'VEHICLES.brand': 'Марка',
  'VEHICLES.model': 'Модель',
  'VEHICLES.year': 'Год выпуска',
  'VEHICLES.regNumber': 'Гос. номер',
  'COURT_PROCEEDINGS.courtName': 'Какой суд',
  'COURT_PROCEEDINGS.caseNumber': 'Номер дела',
  'COURT_PROCEEDINGS.subject': 'О чём дело',
  'COURT_PROCEEDINGS.status': 'Что сейчас происходит',
  'ENFORCEMENT_PROCEEDINGS.bailiffDepartment': 'Отдел приставов',
  'ENFORCEMENT_PROCEEDINGS.proceedingNumber': 'Номер производства',
  'ENFORCEMENT_PROCEEDINGS.subject': 'Из-за чего',
  'ENFORCEMENT_PROCEEDINGS.amount': 'Сумма, ₽',
  'PAYMENTS.stateDutyPaidOn': 'Когда оплатили пошлину',
  'PAYMENTS.stateDutyReference': 'Номер квитанции или чека',
  'PAYMENTS.depositPaidOn': 'Когда внесли депозит',
  'PAYMENTS.depositReference': 'Номер платёжного документа',
  'FILING_SUBMISSION.submissionDate': 'Когда подали документы',
  'FILING_SUBMISSION.courtName': 'В какой суд подали',
  'FILING_SUBMISSION.referenceNumber': 'Номер или отметка о приёме (если есть)',
  'COURT_CASE.caseNumber': 'Номер дела',
  'COURT_CASE.admissionDate': 'Когда суд принял заявление к производству',
  'COURT_CASE.decision': 'Что решил суд',
  'COURT_HEARINGS.date': 'Дата заседания',
  'COURT_HEARINGS.subject': 'О чём заседание',
  'COURT_HEARINGS.outcome': 'Чем закончилось (если уже прошло)',
  'EFRSB_PUBLICATION.publicationDate': 'Дата публикации',
  'EFRSB_PUBLICATION.messageNumber': 'Номер сообщения в ЕФРСБ (если знаете)',
  'FILED_CLAIMS.creditorName': 'Кто заявил требование',
  'FILED_CLAIMS.amount': 'Сумма требования, ₽',
  'FILED_CLAIMS.filedOn': 'Когда требование заявлено',
  'FILED_CLAIMS.disputed': 'Мы оспариваем это требование',
  'MANAGER_SRO.name': 'Название организации — как в реестре',
  'MANAGER_SRO.address': 'Адрес организации — как в реестре',
  'MANAGER_SRO.inn': 'ИНН организации (если знаете)',
  'MANAGER_SRO.ogrn': 'ОГРН организации (если знаете)',
  'MANAGER_SRO.registryNumber': 'Номер в реестре (если знаете)',
  'MANAGER_CORRESPONDENCE.date': 'Дата',
  'MANAGER_CORRESPONDENCE.type': 'Что это — отчёт, письмо, уведомление…',
  'MANAGER_CORRESPONDENCE.note': 'Короткая заметка',
};

/** The filing documents, in plain words. */
const DOCUMENT_LABELS: Record<string, { title: string }> = {
  BANKRUPTCY_APPLICATION: { title: 'Заявление в суд' },
  CREDITOR_LIST: { title: 'Список кредиторов' },
  PROPERTY_INFORMATION: { title: 'Опись имущества' },
  DEBT_SUMMARY: { title: 'Сводка долгов' },
  SRO_NOMINATION: { title: 'Ходатайство об управляющем' },
  PAYMENT_INSTRUCTIONS: { title: 'Что и сколько оплатить' },
  ATTACHMENTS_CHECKLIST: { title: 'Перечень приложений' },
  FILING_CHECKLIST: { title: 'Чек-лист подачи' },
};

export function documentLabel(type: string): { title: string } {
  return DOCUMENT_LABELS[type] ?? { title: type };
}

export function sectionLabel(key: string): SectionLabel {
  return SECTION_LABELS[key] ?? { title: key };
}

export function fieldLabel(sectionKey: string, fieldName: string): string {
  return FIELD_LABELS[`${sectionKey}.${fieldName}`] ?? fieldName;
}

/**
 * Plain-language stage info for the procedure stepper (backlog AI-019): what each stage is, in
 * one calm sentence — never the `statutoryBasis` the backend also carries, that string is for the
 * lawyer review only and must not reach the screen. Order and composition of stages themselves
 * come from the backend (`casefile/journey.yml`, placeholder pending lawyer review); this map
 * only owns how each one reads.
 */
export interface StageLabel {
  title: string;
  description: string;
  /**
   * Roughly how long this stage takes, so the wait is expected rather than alarming. Always
   * hedged («обычно», «примерно») — courts differ and these are observations from real cases,
   * not statutory periods. PLACEHOLDER pending lawyer review, like everything rule-like here.
   */
  timing?: string;
}

const STAGE_LABELS: Record<string, StageLabel> = {
  SCREENING: {
    title: 'Проверка перед стартом',
    description: 'Короткий опрос показал, что этот путь вам подходит.',
  },
  DOCUMENT_PREPARATION: {
    title: 'Сбор документов',
    description: 'Вопросы о вас, долгах и доходах — из них мы соберём документы для суда.',
  },
  MANAGER_SELECTION: {
    title: 'Выбор управляющего',
    description: 'Нужно выбрать организацию, которая назначит человека для ведения вашего дела.',
    timing: 'Организация должна сообщить суду кандидатуру в течение пяти дней после получения определения. На практике это занимает до нескольких недель.',
  },
  FEES_AND_DEPOSIT: {
    title: 'Пошлина и депозит',
    description: 'Перед подачей нужно оплатить пошлину и внести депозит на работу управляющего.',
  },
  FILING: {
    title: 'Подача в суд',
    description: 'Документы подаются в суд, и начинается официальное рассмотрение дела.',
    timing: 'Обычно суд принимает заявление примерно за одну–две недели. После этого он может попросить донести документы — чаще всего трудовую книжку и справки о доходах.',
  },
  COURT_DECISION: {
    title: 'Решение суда',
    description: 'Суд рассматривает дело и определяет, каким будет дальнейший путь.',
    timing: 'Первое заседание обычно назначают примерно через шесть–восемь недель после того, как суд принял заявление. Решение можно обжаловать в течение месяца.',
  },
  RESTRUCTURING_PLAN: {
    title: 'План выплат',
    description: 'Готовится график, по которому вы будете постепенно рассчитываться с долгами.',
  },
  RESTRUCTURING_PLAN_APPROVAL: {
    title: 'Утверждение плана',
    description: 'Суд рассматривает график и решает, утвердить его или нет.',
  },
  RESTRUCTURING_EXECUTION: {
    title: 'Выплаты по плану',
    description: 'Вы платите по утверждённому графику. Если всё выполнено — дело завершается.',
  },
  PROPERTY_INVENTORY: {
    title: 'Опись имущества',
    description: 'Управляющий описывает и оценивает то, что у вас есть.',
  },
  PROPERTY_REALIZATION: {
    title: 'Продажа имущества',
    description: 'То, что можно продать, выставляется на торги.',
    timing: 'Эту часть процедуры обычно вводят примерно на шесть месяцев. Если управляющий не попросит суд её завершить, она продлевается ещё на такой же срок — это нормально и не значит, что что-то пошло не так.',
  },
  CREDITOR_PAYOUTS: {
    title: 'Расчёты с кредиторами',
    description: 'Вырученные деньги распределяются между кредиторами в установленном порядке.',
  },
  SETTLEMENT_TERMS: {
    title: 'Условия соглашения',
    description: 'Вы и кредиторы договариваетесь, на каких условиях закрыть долги.',
  },
  SETTLEMENT_AGREEMENT: {
    title: 'Утверждение соглашения',
    description: 'Суд утверждает договорённость, и дело прекращается.',
  },
  CREDITOR_CLAIMS: {
    title: 'Требования кредиторов',
    description: 'Кредиторы сообщают суду, сколько вы им должны, — суммы попадают в общий список дела.',
  },
  COMPLETION: {
    title: 'Завершение',
    description: 'Суд подводит итоги процедуры и решает судьбу оставшихся долгов.',
  },
};

export function stageLabel(key: string): StageLabel {
  return STAGE_LABELS[key] ?? { title: key, description: '' };
}

/**
 * The three procedures a court can apply (backlog AI-024), in plain words. `hint` is what the
 * user reads when choosing which one the court actually decided on — it describes the procedure,
 * never advises which to want: that is the court's decision, not ours.
 */
export const PROCEDURE_LABELS: Record<'RESTRUCTURING' | 'REALIZATION' | 'SETTLEMENT',
  { title: string; hint: string }> = {
  RESTRUCTURING: {
    title: 'Реструктуризация долгов',
    hint: 'Суд утверждает график, и вы постепенно рассчитываетесь с долгами.',
  },
  REALIZATION: {
    title: 'Реализация имущества',
    hint: 'Имущество продают, деньги идут кредиторам, остаток долгов может быть списан.',
  },
  SETTLEMENT: {
    title: 'Мировое соглашение',
    hint: 'Вы договорились с кредиторами сами, и суд эту договорённость утвердил.',
  },
};

/** Plain-language names for the four stage statuses (backlog AI-019). */
export const STATUS_LABELS: Record<'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED', { title: string }> = {
  NOT_STARTED: { title: 'Не начато' },
  IN_PROGRESS: { title: 'В процессе' },
  DONE: { title: 'Готово' },
  BLOCKED: { title: 'Ждём' },
};

/**
 * Shown next to a BLOCKED stage: being stuck here is normal — it depends on someone else (the
 * court, the manager, a payment clearing), never on the user, and must never read like an error.
 */
export const BLOCKED_EXPLANATION =
  'Пока не зависит от вас — ждём суд, управляющего или поступление денег.';
