import { managerSteps } from './managerSteps';

describe('managerSteps', () => {
  it('starts with nothing done and the organisation as the first action', () => {
    const steps = managerSteps(null, null, 'NOT_STARTED');

    expect(steps.map((s) => s.key)).toEqual(['SRO', 'DEPOSIT', 'APPOINTMENT']);
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(steps[0].route).toBe('/journey/MANAGER_SRO');
    expect(steps[1].route).toBe('/journey/PAYMENTS');
    // The appointment is the journey stage itself — recorded on the screen, not on another one.
    expect(steps[2].route).toBeNull();
  });

  it('closes each step from the data that already exists elsewhere', () => {
    const steps = managerSteps(
      { name: 'СРО «Содействие»', address: 'г. Москва' },
      { depositPaidOn: '2026-08-01' },
      'DONE',
    );

    expect(steps.map((s) => s.done)).toEqual([true, true, true]);
  });

  it('does not count a blank organisation name or an unpaid deposit as done', () => {
    const steps = managerSteps({ name: '   ' }, { stateDutyPaidOn: '2026-08-01' }, 'IN_PROGRESS');

    expect(steps.map((s) => s.done)).toEqual([false, false, false]);
  });

  it('keeps the deposit amount out of the copy, leaving the placeholder for fees.yml', () => {
    const deposit = managerSteps(null, null, 'NOT_STARTED')[1];

    expect(deposit.description).toContain('{managerDeposit}');
  });
});
