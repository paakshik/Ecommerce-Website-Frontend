export default function Input({
  type = "text",
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
  autoComplete,
  ...props
}) {
  const errorId = id ? `${id}-error` : undefined;
  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-warm-900 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-radius-md border px-3 py-2 text-sm text-warm-900 placeholder:text-warm-400 transition-all duration-fast ease-out focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:border-brand-600 min-h-[44px] ${
          error
            ? "border-error focus-visible:ring-error focus-visible:border-error"
            : "border-warm-200 bg-white"
        } ${disabled ? "disabled:bg-warm-100 disabled:text-warm-600 disabled:cursor-not-allowed" : ""}`}
        {...props}
      />
      {error && errorMessage && (
        <p id={errorId} className="mt-1 text-xs text-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
