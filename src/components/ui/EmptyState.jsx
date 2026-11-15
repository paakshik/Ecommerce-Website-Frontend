import { Link } from "react-router-dom";

export default function EmptyState({ title, description, action, icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
      {icon && <div className="mb-6 text-warm-400">{icon}</div>}
      <h2 className="text-lg font-semibold text-warm-900 mb-2">{title}</h2>
      {description && (
        <p className="text-sm text-warm-600 mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <ButtonLink
          label={action.label}
          onClick={action.onClick}
          href={action.href}
        />
      )}
    </div>
  );
}

function ButtonLink({ label, onClick, href }) {
  if (href) {
    return (
      <Link to={href} className="inline-flex items-center justify-center rounded-radius-md border border-brand-600 bg-brand-600 px-4 py-2 text-xs font-medium text-inverse shadow-sm transition-all duration-fast ease-out hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 min-h-[44px]">
        {label}
      </Link>
    );
  }
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-radius-md border border-brand-600 bg-brand-600 px-4 py-2 text-xs font-medium text-inverse shadow-sm transition-all duration-fast ease-out hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 min-h-[44px]"
    >
      {label}
    </button>
  );
}
