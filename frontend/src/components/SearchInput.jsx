import { Search, X } from 'lucide-react';

// Controlled input: the parent keeps `value` in state and updates it in onChange.
export default function SearchInput({ id, label, value, onChange, placeholder, onClear, error, ...rest }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="search-input">
        <Search size={18} aria-hidden="true" />
        <input id={id} className="input" type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} autoComplete="off" {...rest} />
        {value && (
          <button type="button" className="search-input__clear" aria-label={`Clear ${label.toLowerCase()}`} onClick={onClear}><X size={16} /></button>
        )}
      </div>
      {error && <p id={`${id}-err`} className="error-text" role="alert">{error}</p>}
    </div>
  );
}
