import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { seedCase, signIn, storedCase } from '../test/localCase';
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
  render(
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

    expect(await screen.findByText('Заполнено 1 из 13. Продолжайте — всё сохраняется сразу.'))
      .toBeInTheDocument();
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

  it('links up to the stage overview (AI-019)', async () => {
    await seedCase({ sections: ONE_STEP_FILLED });
    renderSignedIn();

    expect(await screen.findByRole('link', { name: 'Весь путь' })).toHaveAttribute('href', '/procedure');
  });
});
