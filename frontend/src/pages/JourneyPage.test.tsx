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

    expect(await screen.findByText('Информация о вас')).toBeInTheDocument();
    expect(await storedCase()).toMatchObject({ status: 'DRAFT', sections: {} });
  });

  it('shows progress and points «Продолжить» at the first unfilled step', async () => {
    await seedCase({ sections: ONE_STEP_FILLED });
    renderSignedIn();

    const progress = await screen.findByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '1');
    expect(progress).toHaveAttribute('aria-valuemax', '13');
    expect(screen.getByText('1 из 13')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Продолжить' }))
      .toHaveAttribute('href', '/journey/all');
    expect(screen.getByText('Документы, которые нужно подготовить самостоятельно'))
      .toBeInTheDocument();
  });

  it('asks whether the user works, and lists the papers that answer proves', async () => {
    await seedCase({ sections: ONE_STEP_FILLED });
    const user = userEvent.setup();
    renderSignedIn();

    expect(await screen.findByText('Паспорт')).toBeInTheDocument();
    expect(screen.getByText('Вы сейчас работаете?')).toBeInTheDocument();
    expect(screen.queryByText('Трудовая книжка')).not.toBeInTheDocument();
    expect(screen.queryByText('Справка из центра занятости')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Работаю' }));
    expect(screen.getByText('Трудовая книжка')).toBeInTheDocument();
    expect(screen.getByText('Справки о доходах (2-НДФЛ) за три года')).toBeInTheDocument();
    expect(screen.queryByText('Справка из центра занятости')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Не работаю' }));
    expect(screen.getByText('Справка из центра занятости')).toBeInTheDocument();
    expect(screen.getByText('Выписка из трудовой книжки')).toBeInTheDocument();
    expect(screen.queryByText('Трудовая книжка')).not.toBeInTheDocument();
    expect(screen.queryByText('Справки о доходах (2-НДФЛ) за три года')).not.toBeInTheDocument();
  });

  it('remembers the work answer after leaving the page', async () => {
    await seedCase({ sections: ONE_STEP_FILLED });
    const user = userEvent.setup();
    const { unmount } = renderSignedIn();

    await user.click(await screen.findByRole('button', { name: 'Не работаю' }));
    expect(screen.getByText('Справка из центра занятости')).toBeInTheDocument();
    unmount();

    renderSignedIn();

    expect(await screen.findByText('Справка из центра занятости')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Не работаю' })).toHaveAttribute('aria-pressed', 'true');
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
