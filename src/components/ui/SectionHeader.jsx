import { Link } from "react-router-dom";

export default function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-h1 text-warm-900 mb-1">{title}</h2>
        {subtitle && <p className="text-body-sm text-warm-600">{subtitle}</p>}
      </div>
      {action && (
        <a
          href={action.href}
          onClick={action.onClick}
          className="inline-flex items-center justify-center rounded-radius-md border border-warm-200 bg-white px-3 py-2 text-xs font-medium text-warm-900 shadow-sm transition-all duration-fast ease-out hover:bg-warm-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 min-h-[44px]"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
