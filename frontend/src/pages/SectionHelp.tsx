import type { HelpBlock } from '../api/labels';

export default function SectionHelp({ blocks }: { blocks: HelpBlock[] | undefined }) {
  if (!blocks) return null;

  return (
    <>
      {blocks.map((block) => (
        <details key={block.summary} className="check-fact section-help">
          <summary>{block.summary}</summary>
          <ol className="section-help-steps">
            {block.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          {block.link && (
            <p>
              <a
                className="section-help-link"
                href={block.link.href}
                target="_blank"
                rel="noreferrer"
              >
                {block.link.text}
              </a>
            </p>
          )}
          {block.note && <p>{block.note}</p>}
        </details>
      ))}
    </>
  );
}
