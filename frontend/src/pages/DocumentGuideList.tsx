import type { DocumentGuide } from '../api/labels';

function Steps({ guide }: { guide: DocumentGuide }) {
  if (!guide.steps) {
    return null;
  }
  const items = guide.steps.map((step) => <li key={step}>{step}</li>);
  return guide.ordered
    ? <ol className="section-help-steps">{items}</ol>
    : <ul className="section-help-steps">{items}</ul>;
}

export default function DocumentGuideList({ guides }: { guides: DocumentGuide[] }) {
  return (
    <div className="doc-guides">
      {guides.map((guide) => (
        <details key={guide.title} className="check-fact section-help">
          <summary>{guide.title}</summary>
          <p className="doc-guide-need">{guide.need}</p>
          {guide.where && <p className="doc-guide-where">{guide.where}</p>}
          {guide.links && (
            <p className="doc-guide-links">
              {guide.links.map((link) => (
                <a
                  key={link.href}
                  className="section-help-link"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.text}
                </a>
              ))}
            </p>
          )}
          <Steps guide={guide} />
          <p className="doc-guide-format">Формат: {guide.format}</p>
          {guide.tip && <p className="doc-guide-tip">{guide.tip}</p>}
          {guide.warning && (
            <p className="section-caution" role="note">{guide.warning}</p>
          )}
        </details>
      ))}
    </div>
  );
}
