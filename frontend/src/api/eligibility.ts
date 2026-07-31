import { request } from './client';

export type DebtRange = 'UNDER_350K' | 'FROM_350K_TO_3M' | 'OVER_3M';

/** How the person wants to go through it — asking for a lawyer routes there directly. */
export type PreferredPath = 'SELF_SERVICE' | 'LAWYER' | 'EXPLORING';

export interface EligibilityAnswers {
  debtRange: DebtRange;
  hasCar: boolean;
  hasExtraRealEstate: boolean;
  hasBusiness: boolean;
  marriedOrDivorcing: boolean;
  soldOrGiftedAssetsRecently: boolean;
  onlyConsumerDebts: boolean;
  hasForeignAssets: boolean;
  hasLawsuits: boolean;
  hasEnforcementProceedings: boolean;
  /** "Clean case" markers — each true when the complication is present, false in a simple case. */
  movedMoneyBeforeFiling: boolean;
  hasAlimonyDebt: boolean;
  hasLifeHealthHarmDebt: boolean;
  hasEconomicCriminalCase: boolean;
  guaranteedOthersDebt: boolean;
  incomeUnofficial: boolean;
  largeThirdPartyDeposits: boolean;
  manyCreditors: boolean;
  /** True when the person cannot cover the mandatory procedure costs — stops the check. */
  notReadyForCosts: boolean;
  preferredPath: PreferredPath;
}

export interface EligibilityResult {
  decision: 'SELF_SERVICE_OK' | 'NEEDS_LAWYER' | 'DEBT_TOO_SMALL' | 'NOT_READY_FOR_COSTS';
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
