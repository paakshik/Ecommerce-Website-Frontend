import { useState } from "react";
import { motion } from "framer-motion";

const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const base =
  "inline-flex items-center justify-center gap-2 rounded-radius-md font-medium transition-all duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 shadow-sm disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] px-4 py-2 text-sm";

const variants = {
  primary: "bg-brand-600 text-inverse hover:bg-brand-800 active:bg-brand-800",
  secondary:
    "bg-white text-warm-900 border border-warm-200 hover:bg-warm-100 active:bg-warm-200 shadow-sm",
  ghost: "bg-transparent text-warm-900 hover:bg-warm-100 active:bg-warm-200",
  danger: "bg-error text-inverse hover:bg-error/90 active:bg-error/90 shadow-sm",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs min-h-[36px]",
  md: "px-4 py-2 text-sm min-h-[44px]",
  lg: "px-6 py-3 text-base min-h-[48px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  type = "button",
  onClick,
  children,
  ariaLabel,
  ...props
}) {
  const [spinning, setSpinning] = useState(loading);

  const classes = `${base} ${variants[variant]} ${sizes[size]}`;

  if (loading && !spinning) setSpinning(true);
  if (!loading && spinning) setSpinning(false);

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={classes}
      aria-label={ariaLabel}
      {...props}
    >
      {loading && (
        <motion.span
          animate={spinning ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={reduced ? { animation: "none" } : {}}
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        />
      )}
      {children}
    </button>
  );
}
