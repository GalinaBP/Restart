import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CALM_CARDS,
  CALM_FAQ,
  CALM_INTRO,
  CALM_TEMPLATES,
  type CalmTemplate,
} from './calmContent';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '0';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(area);
      return copied;
    } catch {
      return false;
    }
  }
}

function CopyButton({ text, label = 'Скопировать текст' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    setState(await copyText(text) ? 'done' : 'failed');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2500);
  };

  return (
    <button type="button" className="btn-primary-small" onClick={() => void copy()}>
      {state === 'done' ? 'Скопировано ✓' : state === 'failed' ? 'Не вышло — выделите текст' : label}
    </button>
  );
}

function downloadTemplate(template: CalmTemplate) {
  const url = URL.createObjectURL(new Blob([template.body], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = template.filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CalmPage() {
  return (
    <main className="calm">
      <header className="journey-header">
        <h1 className="journey-title">🛡️ Кредиторы</h1>
        <Link to="/journey" className="check-back">← К делу</Link>
      </header>

      <p className="calm-lead">
        Банки будут звонить. Это ожидаемо. Мы подготовили готовые ответы, чтобы вы чувствовали
        себя уверенно.
      </p>

      <p className="calm-intro">💙 {CALM_INTRO}</p>

      <p className="check-placeholder" role="note">Черновик — проверяется юристом</p>

      {CALM_CARDS.map((card) => (
        <details key={card.title} className="calm-card">
          <summary>
            <span className="calm-card-title">{card.emoji} {card.title}</span>
            <span className="calm-card-summary">{card.summary}</span>
          </summary>

          {card.script && (
            <div className="calm-script">
              <p className="calm-script-text">«{card.script}»</p>
              <CopyButton text={card.script} label="Скопировать ответ" />
            </div>
          )}

          {card.points?.map((block) => (
            <div key={block.heading} className="calm-block">
              <h3 className="calm-block-heading">{block.heading}</h3>
              <ul className="calm-list">
                {block.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </details>
      ))}

      <details className="calm-card">
        <summary>
          <span className="calm-card-title">✉️ Шаблоны писем</span>
          <span className="calm-card-summary">Готовый текст — скопировать или скачать файлом.</span>
        </summary>
        {CALM_TEMPLATES.map((template) => (
          <div key={template.title} className="calm-template">
            <span className="calm-template-title">{template.title}</span>
            <span className="calm-template-summary">{template.summary}</span>
            <pre className="calm-template-body">{template.body}</pre>
            <span className="calm-template-actions">
              <CopyButton text={template.body} />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => downloadTemplate(template)}
              >
                Скачать
              </button>
            </span>
          </div>
        ))}
      </details>

      <h2 className="calm-faq-title">❓ Частые вопросы</h2>
      {CALM_FAQ.map((item) => (
        <details key={item.question} className="check-fact calm-faq">
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </main>
  );
}
