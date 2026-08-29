import type { FieldMeta } from '../local/case';
import { fieldHint, fieldLabel, optionLabel } from '../api/labels';
import DateField from './DateField';
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
  const label = fieldLabel(sectionKey, field.name);

  if (field.type === 'BOOLEAN') {
    return (
      <label className="section-bool">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    );
  }

  if (field.options) {
    const hint = fieldHint(sectionKey, field.name);
    return (
      <label className="auth-label">
        {label}
        <select
          className={`auth-input${issue ? ' section-input-invalid' : ''}`}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Выберите вариант</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {optionLabel(sectionKey, field.name, option)}
            </option>
          ))}
        </select>
        {hint && <span className="section-field-hint">{hint}</span>}
        {issue && <span className="auth-error" role="alert">{issue}</span>}
      </label>
    );
  }

  if (field.type === 'DATE') {
    return (
      <DateField
        label={label}
        value={typeof value === 'string' ? value : ''}
        issue={issue}
        onChange={onChange}
      />
    );
  }

  const widget = inputType(field);
  return (
    <label className="auth-label">
      {label}
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
