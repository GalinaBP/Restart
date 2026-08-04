import type { SectionEntry } from '../api/cases';
import type { StageStatusKey } from '../api/procedure';

/**
 * The steps «Поиск финансового управляющего» breaks down into — the same shape as the document
 * preparation screen: a short list, each step one action, the next unfinished one is what the
 * user is asked to do now.
 *
 * Every step's «done» is derived from data that already exists somewhere else (the СРО step, the
 * payments step, the stage the user records) — nothing about the manager is stored twice, so this
 * screen can never disagree with «Весь путь» or with the documents.
 *
 * The copy is a PLACEHOLDER pending lawyer review, like everything rule-like in the app.
 */

export type ManagerStepKey = 'SRO' | 'DEPOSIT' | 'APPOINTMENT';

export interface ManagerStep {
  key: ManagerStepKey;
  title: string;
  description: string;
  done: boolean;
  /**
   * The screen that fills this step in, or null for the appointment step — that one is the
   * journey stage itself and is recorded on the manager screen, right in the card.
   */
  route: string | null;
  linkLabel: string | null;
}

/** A blank/absent value must not count as filled in — a whitespace name closes nothing. */
function filled(value: SectionEntry[string] | undefined): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

export function managerSteps(
  sro: SectionEntry | null,
  payments: SectionEntry | null,
  stageStatus: StageStatusKey,
): ManagerStep[] {
  return [
    {
      key: 'SRO',
      title: 'Выбрать организацию',
      description: 'Организацию (СРО) вы называете в заявлении сами — из её участников суд '
        + 'утвердит вашего управляющего. Название и адрес нужны точно как в реестре.',
      done: filled(sro?.name),
      route: '/journey/MANAGER_SRO',
      linkLabel: 'Указать организацию',
    },
    {
      key: 'DEPOSIT',
      title: 'Внести деньги на работу управляющего',
      description: 'Это {managerDeposit} на депозит суда, до подачи заявления. Квитанция '
        + 'прикладывается к заявлению — без неё его могут не принять.',
      done: filled(payments?.depositPaidOn),
      route: '/journey/PAYMENTS',
      linkLabel: 'Отметить оплату',
    },
    {
      key: 'APPOINTMENT',
      title: 'Дождаться, когда управляющего утвердят',
      description: 'Когда суд примет заявление, организация назовёт кандидатуру, а суд утвердит '
        + 'управляющего. Как только это произойдёт — отметьте здесь, и шаг закроется.',
      done: stageStatus === 'DONE',
      route: null,
      linkLabel: null,
    },
  ];
}
