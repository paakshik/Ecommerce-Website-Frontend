import { NavLink as RRNavLink } from "react-router-dom";

export default function NavLink({ to, children, end, onClick, className }) {
  return (
    <RRNavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `text-sm font-medium transition-all duration-fast ease-out ${
          isActive ? "text-brand-600 border-b-2 border-brand-600 pb-1" : "text-warm-600 hover:text-warm-900"
        } ${className || ""}`
      }
    >
      {children}
    </RRNavLink>
  );
}
