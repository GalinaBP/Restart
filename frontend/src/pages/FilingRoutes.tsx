import { useState } from 'react';
import { FILING_ROUTES, type FilingRouteKey } from '../api/labels';

export default function FilingRoutes() {
  const [chosen, setChosen] = useState<FilingRouteKey | null>(null);
  const route = FILING_ROUTES.find((option) => option.key === chosen);

  return (
    <section className="filing-routes">
      <h2 className="filing-check-title">Как подать</h2>
      <p className="check-hint">
        Заявление подают в арбитражный суд по месту прописки. Копию заявления нужно отправить
        каждому кредитору — этого требует закон.
      </p>

      <div className="filing-route-options" role="group" aria-label="Способ подачи">
        {FILING_ROUTES.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`check-option${chosen === option.key ? ' check-option-selected' : ''}`}
            aria-pressed={chosen === option.key}
            onClick={() => setChosen(option.key)}
          >
            <span className="filing-route-title">{option.title}</span>
            <span className="filing-route-summary">{option.summary}</span>
          </button>
        ))}
      </div>

      {route ? (
        <>
          <ol className="section-help-steps filing-route-steps">
            {route.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          {route.link && (
            <p className="filing-route-link">
              <a
                className="section-help-link"
                href={route.link.href}
                target="_blank"
                rel="noreferrer"
              >
                {route.link.text}
              </a>
            </p>
          )}
        </>
      ) : (
        <p className="check-hint">Выберите способ — покажем шаги только для него.</p>
      )}
    </section>
  );
}
