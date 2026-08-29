import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSection } from '../local/case';
import type { SectionEntry } from '../local/case';
import { listDocuments } from '../local/documents';

type State = 'done' | 'todo' | 'own';

interface Item {
  title: string;
  state: State;
  to?: string;
  action?: string;
}

const STATE_WORD: Record<State, string> = {
  done: 'Готово',
  todo: 'Не готово',
  own: 'Проверьте сами',
};

const OWN_ITEMS: Item[] = [
  { title: 'Справки о доходах и имуществе на руках', state: 'own' },
  { title: 'Договоры и справки по долгам на руках', state: 'own' },
  { title: 'Копии заявления для кредиторов готовы', state: 'own' },
];

function single(data: SectionEntry | SectionEntry[] | null): SectionEntry | null {
  return data === null || Array.isArray(data) ? null : data;
}

function filled(entry: SectionEntry | null, field: string): boolean {
  const value = entry?.[field];
  return typeof value === 'string' ? value.trim() !== '' : value !== undefined;
}

function mark(state: State, title: string, to: string, action: string): Item {
  return state === 'done' ? { title, state } : { title, state, to, action };
}

export default function FilingChecklist() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let live = true;
    const build = async () => {
      try {
        const [documents, payments, sro] = await Promise.all([
          listDocuments(),
          getSection('PAYMENTS'),
          getSection('MANAGER_SRO'),
        ]);
        const money = single(payments.data);
        const ready = documents.length > 0 && documents.every((document) => !document.stale);
        if (!live) {
          return;
        }
        setItems([
          mark(ready ? 'done' : 'todo', 'Заявление готово', '/documents', 'Собрать →'),
          OWN_ITEMS[0],
          OWN_ITEMS[1],
          mark(filled(money, 'stateDutyPaidOn') ? 'done' : 'todo',
            'Госпошлина оплачена', '/journey/PAYMENTS', 'Отметить →'),
          mark(filled(money, 'depositPaidOn') ? 'done' : 'todo',
            'Депозит внесён', '/journey/PAYMENTS', 'Отметить →'),
          mark(filled(single(sro.data), 'name') ? 'done' : 'todo',
            'СРО выбрана', '/journey/MANAGER_SRO', 'Указать →'),
          OWN_ITEMS[2],
        ]);
      } catch {
        if (live) {
          setItems([
            { title: 'Заявление готово', state: 'own' },
            OWN_ITEMS[0],
            OWN_ITEMS[1],
            { title: 'Госпошлина оплачена', state: 'own' },
            { title: 'Депозит внесён', state: 'own' },
            { title: 'СРО выбрана', state: 'own' },
            OWN_ITEMS[2],
          ]);
        }
      }
    };
    void build();
    return () => {
      live = false;
    };
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="filing-check">
      <h2 className="filing-check-title">Перед подачей проверьте</h2>
      <ul className="filing-check-list">
        {items.map((item) => (
          <li key={item.title} className={`filing-check-item filing-check-${item.state}`}>
            <span className="filing-check-state">{STATE_WORD[item.state]}</span>
            <span className="filing-check-text">{item.title}</span>
            {item.to && (
              <Link to={item.to} className="filing-check-link">{item.action}</Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
