import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { exportBackup } from '../local/backup';
import { VALID_CASE } from '../local/caseFixture';
import { loadCase } from '../local/store';
import { seedCase, signIn } from '../test/localCase';
import BackupPage from './BackupPage';

const PASSPHRASE = 'коробка-с-документами';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPage() {
  signIn();
  render(
    <MemoryRouter initialEntries={['/backup']}>
      <Routes>
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/journey" element={<p>journey-map</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BackupPage', () => {
  it('says plainly that the case lives on this device and can be lost', async () => {
    await seedCase({ sections: VALID_CASE });
    renderPage();

    expect(screen.getByRole('note')).toHaveTextContent(/Дело пропадёт, если очистить данные сайта/);
    expect(screen.getByText(/хранится только на этом устройстве/)).toBeInTheDocument();
  });

  it('saves an encrypted file and warns that a forgotten passphrase is final', async () => {
    const createObjectURL = vi.fn(() => 'blob:restart');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL }));
    await seedCase({ sections: VALID_CASE });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Пароль для файла/), PASSPHRASE);
    await user.click(screen.getByRole('button', { name: 'Сохранить файл' }));

    expect(await screen.findByRole('status')).toHaveTextContent('без пароля');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('refuses a passphrase too short to protect a passport number', async () => {
    await seedCase({ sections: VALID_CASE });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Пароль для файла/), '1234');
    await user.click(screen.getByRole('button', { name: 'Сохранить файл' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('не короче 8 символов');
  });

  it('restores a case from a file and takes the user back to it', async () => {
    await seedCase({ sections: VALID_CASE });
    const blob = await exportBackup(PASSPHRASE, new Date());
    const file = new File([await blob.text()], 'restart-delo.restart', { type: 'application/json' });
    const user = userEvent.setup();
    renderPage();

    await user.upload(screen.getByLabelText('Файл с копией'), file);
    await user.type(screen.getByLabelText('Пароль от файла'), PASSPHRASE);
    await user.click(screen.getByRole('button', { name: 'Открыть файл' }));

    expect(await screen.findByText('journey-map')).toBeInTheDocument();
    expect((await loadCase())?.sections).toEqual(VALID_CASE);
  });

  it('says the passphrase is wrong instead of failing silently', async () => {
    await seedCase({ sections: VALID_CASE });
    const blob = await exportBackup(PASSPHRASE, new Date());
    const file = new File([await blob.text()], 'restart-delo.restart', { type: 'application/json' });
    const user = userEvent.setup();
    renderPage();

    await user.upload(screen.getByLabelText('Файл с копией'), file);
    await user.type(screen.getByLabelText('Пароль от файла'), 'совсем-другой-пароль');
    await user.click(screen.getByRole('button', { name: 'Открыть файл' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Не подошёл пароль');
  });

  it('asks for a file when none was chosen', async () => {
    await seedCase({ sections: VALID_CASE });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Пароль от файла'), PASSPHRASE);
    await user.click(screen.getByRole('button', { name: 'Открыть файл' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Выберите файл');
  });
});
