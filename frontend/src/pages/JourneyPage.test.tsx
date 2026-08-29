import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { seedCase, signIn, storedCase } from '../test/localCase';
import * as localCase from '../local/case';
import JourneyPage from './JourneyPage';

const ONE_STEP_FILLED = {
  PERSONAL_DETAILS: {
    lastName: 'Иванова',
    firstName: 'Анна',
    birthDate: '1999-05-20',
    birthPlace: 'г. Москва',
  },
};

function renderSignedIn() {
  signIn();
  return render(
    <MemoryRouter initialEntries={['/journey']}>
      <JourneyPage />
    </MemoryRouter>,
  );
}

describe('JourneyPage', () => {
  it('offers to start a case when none exists, then shows the journey map', async () => {
    renderSignedIn();

    expect(await screen.findByText('Начнём ваше дело')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Поехали' }));

    expect(await screen.findByText('Сначала — несколько вопросов')).toBeInTheDocument();
    expect(await storedCase()).toMatchObject({ status: 'DRAFT', sections: {} });
  });

  it('shows progress and points «Продолжить» at the first unfilled step', async () => {
    await seedCase({ sections: ONE_STEP_FILLED });
    renderSignedIn();

    const progress = await screen.findByRole('progressbar');
    expect(screen.getByText('Черновик — проверяется юристом')).toBeInTheDocument();
    expect(progress).toHaveAttribute('aria-valuenow', '1');
    expect(progress).toHaveAttribute('aria-valuemax', '13');
    expect(screen.getByText('1 из 13 шагов')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Продолжить' }))
      .toHaveAttribute('href', '/journey/all');
    expect(screen.getByText('А что нужно найти вам'))
      .toBeInTheDocument();
  });

  it('lists the papers that match what the questionnaire says about work', async () => {
    await seedCase({ sections: { ...ONE_STEP_FILLED, EMPLOYMENT: { status: 'EMPLOYED', otherIncome: 'NONE' } } });
    renderSignedIn();

    expect(await screen.findByText('Трудовая книжка')).toBeInTheDocument();
    expect(screen.getByText('Справки о доходах (2-НДФЛ) за три года')).toBeInTheDocument();
    expect(screen.queryByText('Справка из центра занятости')).not.toBeInTheDocument();
    expect(screen.queryByText('Справка о постановке на учёт самозанятого')).not.toBeInTheDocument();
  });

  it('adds the self-employment papers to the ones for having no job', async () => {
    await seedCase({
      sections: {
        ...ONE_STEP_FILLED,
        EMPLOYMENT: { status: 'NOT_WORKING', otherIncome: 'SELF_EMPLOYED' },
      },
    });
    renderSignedIn();

    expect(await screen.findByText('Справка о постановке на учёт самозанятого')).toBeInTheDocument();
    expect(screen.getByText('Выписка из трудовой книжки')).toBeInTheDocument();
    expect(screen.queryByText('Трудовая книжка')).not.toBeInTheDocument();
    expect(screen.queryByText('Справки о доходах (2-НДФЛ) за три года')).not.toBeInTheDocument();
  });

  it('lists both sets for someone who works and also draws a pension', async () => {
    await seedCase({
      sections: {
        ...ONE_STEP_FILLED,
        EMPLOYMENT: { status: 'EMPLOYED', otherIncome: 'PENSION' },
      },
    });
    renderSignedIn();

    expect(await screen.findByText('Трудовая книжка')).toBeInTheDocument();
    expect(screen.getByText('Справки о доходах (2-НДФЛ) за три года')).toBeInTheDocument();
    expect(screen.getByText('Справка о размере пенсии')).toBeInTheDocument();
  });

  it('points at the «Работа» step while the answer is missing, and asks nothing itself', async () => {
    await seedCase({ sections: ONE_STEP_FILLED });
    renderSignedIn();

    expect(await screen.findByText('Паспорт')).toBeInTheDocument();
    expect(screen.getByText(/Ответьте в шаге «Работа»/)).toBeInTheDocument();
    expect(screen.queryByText('Трудовая книжка')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Работаю' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Не работаю' })).not.toBeInTheDocument();
  });

  it('keeps the papers after a remount, because the answer lives in the case', async () => {
    await seedCase({ sections: { ...ONE_STEP_FILLED, EMPLOYMENT: { status: 'NOT_WORKING', otherIncome: 'PENSION' } } });
    const { unmount } = renderSignedIn();

    expect(await screen.findByText('Справка о размере пенсии')).toBeInTheDocument();
    unmount();
    localStorage.removeItem('restart.journey.workStatus');

    renderSignedIn();
    expect(await screen.findByText('Справка о размере пенсии')).toBeInTheDocument();
  });

  it('does not claim the case is complete when no known step matched', async () => {
    await seedCase({ sections: ONE_STEP_FILLED });
    vi.spyOn(localCase, 'sectionsOverview').mockResolvedValue([]);
    renderSignedIn();

    const progress = await screen.findByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuemax', '0');
    expect(screen.queryByText(/Все шаги заполнены/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Продолжить' })).toBeInTheDocument();
  });

  it('links up to the stage overview (AI-019)', async () => {
    await seedCase({ sections: ONE_STEP_FILLED });
    renderSignedIn();

    expect(await screen.findByRole('link', { name: 'Весь путь' })).toHaveAttribute('href', '/procedure');
  });
});
