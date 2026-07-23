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
  /** Collapsed how-to, opened on tap: title, numbered steps, and a closing note. */
  help?: { summary: string; steps: string[]; note?: string };
}

export const SECTION_LABELS: Record<string, SectionLabel> = {
  PERSONAL_DETAILS: { title: 'Немного о вас' },
  PASSPORT: { title: 'Паспорт' },
  REGISTRATION_ADDRESS: { title: 'Где вы прописаны' },
  CONTACT_INFO: { title: 'Как с вами связаться' },
  EMPLOYMENT: { title: 'Работа' },
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
      note: 'Это один из тех шагов, где стоит не торопиться: без указанной организации суд не сможет назначить управляющего, а без управляющего дело не пойдёт.',
    },
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
  'MANAGER_SRO.name': 'Название организации — как в реестре',
  'MANAGER_SRO.address': 'Адрес организации — как в реестре',
  'MANAGER_SRO.inn': 'ИНН организации (если знаете)',
  'MANAGER_SRO.ogrn': 'ОГРН организации (если знаете)',
  'MANAGER_SRO.registryNumber': 'Номер в реестре (если знаете)',
};

/** The filing documents, in plain words. */
const DOCUMENT_LABELS: Record<string, { title: string }> = {
  BANKRUPTCY_APPLICATION: { title: 'Заявление в суд' },
  CREDITOR_LIST: { title: 'Список кредиторов' },
  PROPERTY_INFORMATION: { title: 'Опись имущества' },
  DEBT_SUMMARY: { title: 'Сводка долгов' },
  SRO_NOMINATION: { title: 'Ходатайство об управляющем' },
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
  },
  FEES_AND_DEPOSIT: {
    title: 'Пошлина и депозит',
    description: 'Перед подачей нужно оплатить пошлину и внести депозит на работу управляющего.',
  },
  FILING: {
    title: 'Подача в суд',
    description: 'Документы подаются в суд, и начинается официальное рассмотрение дела.',
  },
  COURT_DECISION: {
    title: 'Решение суда',
    description: 'Суд рассматривает дело и определяет, каким будет дальнейший путь.',
  },
  RESTRUCTURING_PLAN: {
    title: 'План выплат',
    description: 'Вы платите по долгам по графику, который утвердил суд.',
  },
  PROPERTY_REALIZATION: {
    title: 'Продажа имущества',
    description: 'То, что можно продать, продают, а вырученные деньги идут кредиторам.',
  },
  SETTLEMENT_AGREEMENT: {
    title: 'Договорённость с кредиторами',
    description: 'Вы и кредиторы сами согласовали условия — дело завершается на своих условиях.',
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
