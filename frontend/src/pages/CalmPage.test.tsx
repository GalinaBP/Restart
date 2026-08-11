import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CalmPage from './CalmPage';
import { CALM_CARDS, CALM_FAQ, CALM_TEMPLATES } from './calmContent';

function renderPage() {
  render(<MemoryRouter initialEntries={['/calm']}><CalmPage /></MemoryRouter>);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CalmPage', () => {
  it('opens with reassurance and every subsection of the ticket', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /Спокойно, это нормально/ })).toBeInTheDocument();
    expect(screen.getByText(/Почти каждый, кто проходит банкротство/)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Черновик — проверяется юристом');

    for (const card of CALM_CARDS) {
      expect(screen.getByText(new RegExp(card.title))).toBeInTheDocument();
    }
    expect(screen.getByText(/Шаблоны писем/)).toBeInTheDocument();
    expect(screen.getByText(/Частые вопросы/)).toBeInTheDocument();
  });

  it('copies the script through the clipboard and confirms it', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'Скопировать ответ' })[0]);

    expect(writeText).toHaveBeenCalledWith(CALM_CARDS[0].script);
    expect(await screen.findByRole('button', { name: 'Скопировано ✓' })).toBeInTheDocument();
  });

  it('falls back to the legacy copy when the Clipboard API is refused', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('Write permission denied'));
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const execCommand = vi.fn().mockReturnValue(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy API, not in the lib types we use
    (document as any).execCommand = execCommand;
    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'Скопировать ответ' })[0]);

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(await screen.findByRole('button', { name: 'Скопировано ✓' })).toBeInTheDocument();
  });

  it('says so honestly when nothing could be copied', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy API, not in the lib types we use
    (document as any).execCommand = vi.fn().mockReturnValue(false);
    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'Скопировать ответ' })[0]);

    expect(await screen.findByRole('button', { name: /Не вышло/ })).toBeInTheDocument();
  });

  it('offers every letter template with a copy and a download', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText(/Шаблоны писем/));

    for (const template of CALM_TEMPLATES) {
      expect(screen.getByText(template.title)).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button', { name: 'Скачать' })).toHaveLength(CALM_TEMPLATES.length);
  });

  it('answers the frequent questions in an accordion', async () => {
    const user = userEvent.setup();
    renderPage();

    const first = CALM_FAQ[0];
    const question = screen.getByText(first.question);
    await user.click(question);

    const details = question.closest('details');
    expect(within(details as HTMLElement).getByText(first.answer)).toBeInTheDocument();
  });
});
