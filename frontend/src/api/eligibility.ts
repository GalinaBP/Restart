import { request } from './client';

export type DebtRange = 'UNDER_500K' | 'FROM_500K_TO_3M' | 'OVER_3M';

export interface EligibilityAnswers {
  debtRange: DebtRange;
  hasCar: boolean;
  hasExtraRealEstate: boolean;
  hasBusiness: boolean;
  marriedOrDivorcing: boolean;
  soldOrGiftedAssetsRecently: boolean;
  onlyConsumerDebts: boolean;
  hasForeignAssetsOrLawsuits: boolean;
}

export interface EligibilityResult {
  decision: 'SELF_SERVICE_OK' | 'NEEDS_LAWYER';
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
