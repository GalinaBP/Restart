import type { FeeScheduleView } from '../api/procedure';

/**
 * Money in stage copy never sits in the copy itself: `fees.yml` is the one source of truth for
 * amounts, so the text carries a `{managerDeposit}` placeholder and this substitutes it. That way
 * the stage text, the fees breakdown and the printed documents can never disagree about the sum.
 *
 * Shared by «Весь путь» and the manager screen — both show the same stage copy.
 */
export function fillAmounts(text: string, fees: FeeScheduleView | null): string {
  const deposit = fees?.lines.find((line) => line.item === 'MANAGER_DEPOSIT');
  return text.replace(
    '{managerDeposit}',
    deposit
      ? `${deposit.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`
      : 'фиксированная сумма',
  );
}

/** True while a text mentions an amount that is still an unreviewed placeholder in fees.yml. */
export function amountsAreDraft(texts: string[] | undefined, fees: FeeScheduleView | null): boolean {
  return Boolean(texts?.some((text) => text.includes('{managerDeposit}')))
    && fees !== null && !fees.allConfirmed;
}
