import type { FieldMeta } from '../api/cases';
import { fieldLabel } from '../api/labels';
import { inputType } from './sectionForm';

export function SectionField({
  sectionKey,
  field,
  value,
  issue,
  onChange,
}: {
  sectionKey: string;
  field: FieldMeta;
  value: string | boolean | undefined;
  issue: string | undefined;
  onChange: (value: string | boolean) => void;
}) {
  if (field.type === 'BOOLEAN') {
    return (
      <label className="section-bool">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        {fieldLabel(sectionKey, field.name)}
      </label>
    );
  }
  const widget = inputType(field);
  return (
    <label className="auth-label">
      {fieldLabel(sectionKey, field.name)}
      <input
        className={`auth-input${issue ? ' section-input-invalid' : ''}`}
        type={widget.type}
        inputMode={widget.inputMode}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
      />
      {issue && <span className="auth-error" role="alert">{issue}</span>}
    </label>
  );
}
