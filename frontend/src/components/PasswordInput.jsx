import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// A password field with a show/hide button. Uses the same .field / .input styles as other forms.
export default function PasswordInput({ id, label, value, onChange, error, hint, autoComplete, inputRef }) {
  const [visible, setVisible] = useState(false);
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id} ref={inputRef} className="input" type={visible ? 'text' : 'password'} value={value}
          onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete}
          aria-invalid={!!error} aria-describedby={describedBy}
        />
        <button type="button" className="password-wrap__toggle" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${id}-err`} className="error-text" role="alert">{error}</p>}
    </div>
  );
}
