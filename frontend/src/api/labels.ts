/**
 * Plain-Russian labels for the data-collection wizard. The backend's sections.yml owns WHICH
 * fields exist (the form is rendered from its metadata); this map only owns how they read on
 * screen — warm, short, zero legalese, per the product constitution. A field missing here still
 * renders (with its technical name), so a backend config change never breaks the wizard.
 */

export interface SectionLabel {
  emoji: string;
  title: string;
  hint?: string;
  /** What one entry is called in a repeatable section: «Добавить кредитора». */
  entryName?: string;
}

export const SECTION_LABELS: Record<string, SectionLabel> = {
  PERSONAL_DETAILS: { emoji: '🙋', title: 'Немного о тебе' },
  PASSPORT: { emoji: '🪪', title: 'Паспорт' },
  REGISTRATION_ADDRESS: { emoji: '🏠', title: 'Где ты прописан(а)' },
  CONTACT_INFO: { emoji: '📱', title: 'Как с тобой связаться' },
  EMPLOYMENT: { emoji: '💼', title: 'Работа' },
  MONTHLY_INCOME: { emoji: '💰', title: 'Доход в месяц' },
  MARITAL_STATUS: { emoji: '💍', title: 'Семейное положение' },
  DEPENDENTS: {
    emoji: '👶',
    title: 'Кто на твоём обеспечении',
    hint: 'Дети или другие близкие, которых ты содержишь. Если таких нет — просто сохрани пустой список.',
    entryName: 'Добавить человека',
  },
  CREDITORS: {
    emoji: '🏦',
    title: 'Кому ты должен',
    hint: 'Каждый банк, МФО или человек, которому ты должен. Ничего не пропускай — это важно.',
    entryName: 'Добавить кредитора',
  },
  DEBTS: {
    emoji: '🧾',
    title: 'Твои долги',
    hint: 'По каждому долгу — сумма и с какого момента не получается платить.',
    entryName: 'Добавить долг',
  },
  BANK_ACCOUNTS: {
    emoji: '💳',
    title: 'Счета и карты',
    hint: 'Все счета в банках, даже пустые.',
    entryName: 'Добавить счёт',
  },
  PROPERTY: {
    emoji: '📦',
    title: 'Ценные вещи',
    hint: 'Техника, украшения и другое ценное. Обычные личные вещи указывать не нужно.',
    entryName: 'Добавить вещь',
  },
  REAL_ESTATE: {
    emoji: '🏢',
    title: 'Недвижимость',
    hint: 'Если недвижимости нет — просто сохрани пустой список.',
    entryName: 'Добавить объект',
  },
  VEHICLES: {
    emoji: '🚗',
    title: 'Транспорт',
    hint: 'Если транспорта нет — просто сохрани пустой список.',
    entryName: 'Добавить транспорт',
  },
  COURT_PROCEEDINGS: {
    emoji: '⚖️',
    title: 'Суды',
    hint: 'Дела в судах, где ты участвуешь. Нет таких — сохрани пустой список.',
    entryName: 'Добавить дело',
  },
  ENFORCEMENT_PROCEEDINGS: {
    emoji: '📮',
    title: 'Приставы',
    hint: 'Если приставы уже взыскивают с тебя долги — укажи эти производства.',
    entryName: 'Добавить производство',
  },
};

/** Field labels keyed «SECTION.field»; look up via fieldLabel(). */
const FIELD_LABELS: Record<string, string> = {
  'PERSONAL_DETAILS.lastName': 'Фамилия',
  'PERSONAL_DETAILS.firstName': 'Имя',
  'PERSONAL_DETAILS.middleName': 'Отчество (если есть)',
  'PERSONAL_DETAILS.birthDate': 'Дата рождения',
  'PERSONAL_DETAILS.birthPlace': 'Место рождения — как в паспорте',
  'PERSONAL_DETAILS.inn': 'ИНН (если знаешь)',
  'PERSONAL_DETAILS.snils': 'СНИЛС (если знаешь)',
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
  'REGISTRATION_ADDRESS.postalCode': 'Индекс (если знаешь)',
  'CONTACT_INFO.phone': 'Телефон',
  'CONTACT_INFO.email': 'Электронная почта',
  'EMPLOYMENT.status': 'Чем ты сейчас занимаешься — работаешь, ищешь работу…',
  'EMPLOYMENT.employerName': 'Где работаешь (если работаешь)',
  'EMPLOYMENT.position': 'Кем (если работаешь)',
  'MONTHLY_INCOME.amount': 'Сколько получаешь в месяц, ₽',
  'MONTHLY_INCOME.source': 'Откуда этот доход — зарплата, пособие…',
  'MARITAL_STATUS.status': 'Твоё семейное положение',
  'MARITAL_STATUS.hasMarriageContract': 'Есть брачный договор',
  'DEPENDENTS.fullName': 'ФИО',
  'DEPENDENTS.birthDate': 'Дата рождения',
  'DEPENDENTS.relation': 'Кем приходится — сын, дочь…',
  'CREDITORS.name': 'Название банка или МФО',
  'CREDITORS.inn': 'ИНН кредитора (есть в договоре)',
  'CREDITORS.address': 'Адрес кредитора (есть в договоре)',
  'CREDITORS.debtAmount': 'Сколько должен, ₽',
  'CREDITORS.debtType': 'Что это — кредит, карта, микрозаём…',
  'DEBTS.creditorName': 'Кому должен',
  'DEBTS.amount': 'Сумма, ₽',
  'DEBTS.overdueSinceDate': 'С какого числа не получается платить',
  'DEBTS.type': 'Что это за долг',
  'BANK_ACCOUNTS.bankName': 'Банк',
  'BANK_ACCOUNTS.accountNumber': 'Номер счёта',
  'BANK_ACCOUNTS.balance': 'Сколько на счёте, ₽',
  'PROPERTY.description': 'Что это',
  'PROPERTY.estimatedValue': 'Сколько примерно стоит, ₽',
  'REAL_ESTATE.type': 'Что это — квартира, дом, участок…',
  'REAL_ESTATE.address': 'Адрес',
  'REAL_ESTATE.area': 'Площадь, м²',
  'REAL_ESTATE.ownershipShare': 'Твоя доля — например, «1/2» или «вся»',
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
};

export function sectionLabel(key: string): SectionLabel {
  return SECTION_LABELS[key] ?? { emoji: '📄', title: key };
}

export function fieldLabel(sectionKey: string, fieldName: string): string {
  return FIELD_LABELS[`${sectionKey}.${fieldName}`] ?? fieldName;
}
