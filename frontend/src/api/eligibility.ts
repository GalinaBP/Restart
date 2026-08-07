import { request } from './client';

/**
 * The screening's answer shape. Every option the user can tap maps to one of these values, and
 * the backend owns every decision made from them — this file only carries them across.
 */

/** Never decisive on its own: the size of a debt says nothing about who can carry the procedure. */
export type DebtRange =
  | 'UNDER_500K' | 'FROM_500K_TO_1M' | 'FROM_1M_TO_3M' | 'OVER_3M' | 'UNKNOWN';

export type DebtType =
  | 'CREDITS' | 'MICROLOANS' | 'INSTALMENTS' | 'TAXES' | 'PRIVATE_PERSONS'
  | 'ALIMONY' | 'LIFE_HEALTH_HARM' | 'OTHER' | 'UNKNOWN';

export type PaymentStatus =
  | 'ON_TIME' | 'SOME_OVERDUE' | 'CANNOT_PAY_MOST' | 'NOT_PAYING_FOR_MONTHS' | 'NEW_LOANS_FOR_OLD';

export type LoanAge = 'OVER_YEAR_AGO' | 'WITHIN_LAST_YEAR' | 'LAST_3_MONTHS' | 'DONT_REMEMBER';

/** "Not sure" is a real answer: on these questions, not knowing is itself worth a lawyer's look. */
export type YesNoUnsure = 'NO' | 'YES' | 'UNSURE';

export type PropertyItem =
  | 'NOTHING' | 'VEHICLE' | 'HOME' | 'LAND' | 'PROPERTY_SHARE' | 'OTHER' | 'UNKNOWN';

export type BusinessStatus =
  | 'NONE' | 'SELF_EMPLOYED' | 'CURRENT_ENTREPRENEUR' | 'RECENTLY_CLOSED_ENTREPRENEUR'
  | 'COMPANY_OWNER';

export type DealAsset =
  | 'REAL_ESTATE' | 'LAND' | 'VEHICLE' | 'OTHER_PROPERTY' | 'MONEY' | 'DONT_REMEMBER';

export type MaritalStatus = 'NO' | 'MARRIED' | 'DIVORCED_WITHIN_3_YEARS';

export type MoneyOperation =
  | 'LARGE_CASH_WITHDRAWALS' | 'TRANSFERS_TO_OTHERS' | 'RECEIPTS_FROM_OTHERS'
  | 'BETWEEN_OWN_ACCOUNTS' | 'OTHER';

export type SpecialCircumstance =
  | 'NONE' | 'ALIMONY_DEBT' | 'LIFE_HEALTH_HARM_DEBT' | 'ECONOMIC_CRIMINAL_CASE'
  | 'GUARANTOR' | 'OTHER_UNUSUAL';

export type CostsReadiness = 'READY' | 'UNSURE' | 'NO_MONEY';

/** How the person wants to go through it — asking for a lawyer routes there directly. */
export type PreferredPath = 'SELF_SERVICE' | 'LAWYER' | 'EXPLORING';

export interface EligibilityAnswers {
  debtRange: DebtRange;
  debtTypes: DebtType[];
  paymentStatus: PaymentStatus;
  loanAge: LoanAge;
  /** Only asked when the loans are three months old or less. */
  knewCouldNotRepay?: YesNoUnsure;
  newLoansAfterTrouble: YesNoUnsure;
  property: PropertyItem[];
  businessStatus: BusinessStatus;
  soldOrGiftedAssets: YesNoUnsure;
  /** Only asked after «Да» to deals. */
  dealAssets?: DealAsset[];
  maritalStatus: MaritalStatus;
  hasForeignAssets: boolean;
  hasLawsuits: YesNoUnsure;
  /** Collected, never decisive: bailiffs are the everyday situation of a person with debts. */
  hasEnforcementProceedings: YesNoUnsure;
  unusualMoneyOperations: YesNoUnsure;
  /** Only asked after «Да» to unusual operations. */
  moneyOperations?: MoneyOperation[];
  specialCircumstances: SpecialCircumstance[];
  costsReadiness: CostsReadiness;
  preferredPath: PreferredPath;
}

export interface EligibilityResult {
  decision: 'SELF_SERVICE_OK' | 'NEEDS_LAWYER' | 'NOT_RECOMMENDED' | 'NOT_READY_FOR_COSTS';
  reasons: string[];
}

/** Runs the 2-minute eligibility check. Anonymous — no account exists yet at this point. */
export function checkEligibility(answers: EligibilityAnswers): Promise<EligibilityResult> {
  return request<EligibilityResult>('/eligibility/check', {
    method: 'POST',
    body: answers,
    auth: false,
  });
}
