export default function Select({
  name,
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  error = false,
  errorMessage,
  required = false,
  options,
  ...props
}) {
  const errorId = id ? `${id}-error` : undefined;
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-warm-900 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-radius-md border px-3 py-2 pr-10 text-sm text-warm-900 bg-white transition-all duration-fast ease-out focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:border-brand-600 min-h-[44px] appearance-none ${
            error
              ? "border-error focus-visible:ring-error focus-visible:border-error"
              : "border-warm-200"
          } ${disabled ? "disabled:bg-warm-100 disabled:text-warm-600 disabled:cursor-not-allowed" : ""}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-warm-600 text-sm">
          ▾
        </span>
      </div>
      {error && errorMessage && (
        <p id={errorId} className="mt-1 text-xs text-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
