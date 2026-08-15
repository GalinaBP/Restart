import { COURT_PLACEHOLDER, courtFor, feeLine, feeTotal, feesAllConfirmed } from './rules';
import type { SectionEntry, SectionPayload, SectionValue } from './types';

const ABSENT = '—';

export type TemplateModel = Record<string, unknown>;

export function assembleModel(
  sections: Record<string, SectionPayload>,
  today: Date,
): TemplateModel {
  const registration = single(sections.REGISTRATION_ADDRESS);
  const regionText = `${text(registration, 'region')} ${text(registration, 'city')}`.trim();

  const model: TemplateModel = {
    generatedDate: ruDateOf(today),
    court: { name: courtFor(regionText) ?? COURT_PLACEHOLDER },
    applicant: applicant(sections),
    realEstate: realEstate(list(sections.REAL_ESTATE)),
    vehicles: vehicles(list(sections.VEHICLES)),
    bankAccounts: bankAccounts(list(sections.BANK_ACCOUNTS)),
    sro: sro(single(sections.MANAGER_SRO)),
    fees: fees(),
    payments: payments(single(sections.PAYMENTS)),
  };
  creditors(list(sections.CREDITORS), model);
  income(single(sections.MONTHLY_INCOME), list(sections.OTHER_INCOME), model);
  return model;
}

function applicant(sections: Record<string, SectionPayload>): TemplateModel {
  const personal = single(sections.PERSONAL_DETAILS);
  const passport = single(sections.PASSPORT);
  const address = single(sections.REGISTRATION_ADDRESS);
  const contact = single(sections.CONTACT_INFO);

  const lastName = text(personal, 'lastName');
  const firstName = text(personal, 'firstName');
  const middleName = text(personal, 'middleName');

  return {
    fullName: joinNonBlank(' ', lastName, firstName, middleName),
    shortName: shortName(lastName, firstName, middleName),
    birthDate: ruDate(text(personal, 'birthDate')),
    birthPlace: text(personal, 'birthPlace'),
    inn: orAbsent(text(personal, 'inn')),
    snils: orAbsent(text(personal, 'snils')),
    passportSeries: text(passport, 'series'),
    passportNumber: text(passport, 'number'),
    passportIssuedBy: text(passport, 'issuedBy'),
    passportIssueDate: ruDate(text(passport, 'issueDate')),
    address: registrationAddress(address),
    phone: text(contact, 'phone'),
    email: orAbsent(text(contact, 'email')),
  };
}

function shortName(lastName: string, firstName: string, middleName: string): string {
  let initials = '';
  if (firstName.trim() !== '') {
    initials += `${firstName[0]}. `;
  }
  if (middleName.trim() !== '') {
    initials += `${middleName[0]}. `;
  }
  return `${initials}${lastName}`.trim();
}

function registrationAddress(address: SectionEntry | undefined): string {
  const apartment = text(address, 'apartment');
  return joinNonBlank(
    ', ',
    text(address, 'postalCode'),
    text(address, 'region'),
    text(address, 'city'),
    text(address, 'street'),
    text(address, 'house'),
    apartment.trim() === '' ? '' : `кв. ${apartment}`,
  );
}

function creditors(entries: SectionEntry[], model: TemplateModel): void {
  const items: TemplateModel[] = [];
  let total = 0;
  for (const entry of entries) {
    items.push({
      index: String(items.length + 1),
      name: text(entry, 'name'),
      inn: orAbsent(text(entry, 'inn')),
      address: text(entry, 'address'),
      debtAmount: money(entry.debtAmount),
      debtType: orAbsent(text(entry, 'debtType')),
      overdueSinceDate: ruDateOrAbsent(text(entry, 'overdueSinceDate')),
    });
    total += Number(entry.debtAmount);
  }
  model.creditors = items;
  model.creditorCount = String(items.length);
  model.totalDebt = formatMoney(total);
}

function realEstate(entries: SectionEntry[]): TemplateModel[] {
  return entries.map((entry, index) => ({
    index: String(index + 1),
    type: text(entry, 'type'),
    address: text(entry, 'address'),
    area: numberOrAbsent(entry.area),
    ownershipShare: orAbsent(text(entry, 'ownershipShare')),
  }));
}

function vehicles(entries: SectionEntry[]): TemplateModel[] {
  return entries.map((entry, index) => ({
    index: String(index + 1),
    type: text(entry, 'type'),
    brand: orAbsent(text(entry, 'brand')),
    model: orAbsent(text(entry, 'model')),
    year: numberOrAbsent(entry.year),
    regNumber: orAbsent(text(entry, 'regNumber')),
  }));
}

function bankAccounts(entries: SectionEntry[]): TemplateModel[] {
  return entries.map((entry, index) => ({
    index: String(index + 1),
    bankName: text(entry, 'bankName'),
    accountNumber: text(entry, 'accountNumber'),
    balance: moneyOrAbsent(entry.balance),
  }));
}

function income(
  monthly: SectionEntry | undefined,
  other: SectionEntry[],
  model: TemplateModel,
): void {
  let total = Number(monthly?.amount ?? 0);
  const items: TemplateModel[] = [];
  for (const entry of other) {
    items.push({
      index: String(items.length + 1),
      source: text(entry, 'source'),
      amount: money(entry.amount),
    });
    total += Number(entry.amount);
  }
  model.monthlyIncome = {
    amount: money(monthly?.amount),
    source: text(monthly, 'source'),
  };
  model.otherIncome = items;
  model.totalIncome = formatMoney(total);
}

function sro(node: SectionEntry | undefined): TemplateModel {
  return {
    name: text(node, 'name'),
    address: text(node, 'address'),
    inn: orAbsent(text(node, 'inn')),
    ogrn: orAbsent(text(node, 'ogrn')),
    registryNumber: orAbsent(text(node, 'registryNumber')),
  };
}

function payments(node: SectionEntry | undefined): TemplateModel {
  return {
    stateDutyPaidOn: ruDateOrAbsent(text(node, 'stateDutyPaidOn')),
    stateDutyReference: orAbsent(text(node, 'stateDutyReference')),
    depositPaidOn: ruDateOrAbsent(text(node, 'depositPaidOn')),
    depositReference: orAbsent(text(node, 'depositReference')),
  };
}

function fees(): TemplateModel {
  return {
    stateDuty: formatMoney(Number(feeLine('STATE_DUTY').amount)),
    managerDeposit: formatMoney(Number(feeLine('MANAGER_DEPOSIT').amount)),
    total: formatMoney(feeTotal()),
    unconfirmed: !feesAllConfirmed(),
  };
}

function single(payload: SectionPayload | undefined): SectionEntry | undefined {
  return payload === undefined || Array.isArray(payload) ? undefined : payload;
}

function list(payload: SectionPayload | undefined): SectionEntry[] {
  return Array.isArray(payload) ? payload : [];
}

function text(node: SectionEntry | undefined, field: string): string {
  const value = node?.[field];
  if (value === undefined || value === null) {
    return '';
  }
  return (typeof value === 'string' ? value : String(value)).trim();
}

function orAbsent(value: string): string {
  return value.trim() === '' ? ABSENT : value;
}

function numberOrAbsent(value: SectionValue | undefined): string {
  return value === undefined || value === null ? ABSENT : String(value);
}

function money(value: SectionValue | undefined): string {
  return formatMoney(Number(value));
}

function moneyOrAbsent(value: SectionValue | undefined): string {
  return value === undefined || value === null ? ABSENT : money(value);
}

export function ruDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

function ruDateOrAbsent(isoDate: string): string {
  return isoDate.trim() === '' ? ABSENT : ruDate(isoDate);
}

export function ruDateOf(date: Date): string {
  return ruDate(isoDateOf(date));
}

export function isoDateOf(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function formatMoney(amount: number): string {
  const cents = roundHalfUp(amount * 100);
  const digits = String(Math.abs(cents)).padStart(3, '0');
  const whole = digits.slice(0, -2);
  const fraction = digits.slice(-2);
  let grouped = '';
  for (let i = 0; i < whole.length; i += 1) {
    if (i > 0 && (whole.length - i) % 3 === 0) {
      grouped += ' ';
    }
    grouped += whole[i];
  }
  return `${cents < 0 ? '-' : ''}${grouped},${fraction}`;
}

function roundHalfUp(value: number): number {
  const corrected = Number(value.toPrecision(15));
  return corrected < 0 ? -Math.round(-corrected) : Math.round(corrected);
}

function joinNonBlank(separator: string, ...values: string[]): string {
  return values.filter((value) => value !== undefined && value.trim() !== '').join(separator);
}
