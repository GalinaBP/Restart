import type { SectionPayload } from './types';

export const VALID_CASE: Record<string, SectionPayload> = {
  PERSONAL_DETAILS: {
    lastName: 'Иванова',
    firstName: 'Анна',
    middleName: 'Сергеевна',
    birthDate: '1999-05-20',
    birthPlace: 'г. Москва',
    inn: '500100732259',
    snils: '112-233-445 95',
  },
  PASSPORT: {
    series: '4519',
    number: '123456',
    issuedBy: 'ГУ МВД России по г. Москве',
    issueDate: '2019-06-14',
  },
  REGISTRATION_ADDRESS: {
    region: 'г. Москва',
    city: 'Москва',
    street: 'ул. Ленина',
    house: 'д. 1',
    apartment: '2',
    postalCode: '101000',
  },
  CONTACT_INFO: {
    phone: '+7 900 000-00-00',
    email: 'anna@example.com',
  },
  EMPLOYMENT: {
    status: 'работаю по найму',
    employerName: 'ООО «Ромашка»',
    position: 'менеджер',
  },
  MONTHLY_INCOME: {
    amount: 85000.5,
    source: 'заработная плата',
  },
  OTHER_INCOME: [
    { source: 'сдача комнаты в аренду', amount: 15000 },
  ],
  MARITAL_STATUS: {
    status: 'не замужем',
  },
  CREDITORS: [
    {
      name: 'ПАО «Банк Восход»',
      inn: '7707083893',
      address: 'г. Москва, ул. Банковская, д. 3',
      debtAmount: 1000000,
      debtType: 'потребительский кредит',
      overdueSinceDate: '2026-02-01',
    },
    {
      name: 'МФО «Деньги-Быстро»',
      address: 'г. Тверь, пр-т Займов, д. 7',
      debtAmount: 250000.5,
    },
  ],
  PAYMENTS: {
    stateDutyPaidOn: '2026-07-20',
    stateDutyReference: 'чек № 4417',
  },
  MANAGER_SRO: {
    name: 'Ассоциация «СРО арбитражных управляющих «Содействие»»',
    address: 'г. Москва, ул. Управляющая, д. 5',
    inn: '7707083893',
    ogrn: '1027700132195',
    registryNumber: '0012',
  },
};
