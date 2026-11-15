import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const variants = {
  success: "bg-[#ECF7F1] border-[#15803D]/20 text-[#15803D]",
  error: "bg-[#FEF2F2] border-[#B91C1C]/20 text-[#B91C1C]",
  info: "bg-[#EFF6FF] border-[#3B82F6]/20 text-[#1D4ED8]",
};

export default function Toast({ variant, message, duration = 5000, onDismiss, action }) {
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(duration);
  const timerRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (paused || remaining <= 0) return;
    timerRef.current = setInterval(() => {
      setRemaining((r) => (r <= 1000 ? 0 : r - 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [paused, remaining]);

  useEffect(() => {
    if (remaining <= 0 && !paused) {
      onDismiss?.();
    }
  }, [remaining, paused, onDismiss]);

  const variantClass = variants[variant] || variants.info;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
      className={`flex items-center gap-3 rounded-radius-md border px-4 py-3 shadow-md min-w-[300px] pointer-events-auto ${variantClass}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="alert"
      aria-live="polite"
    >
      <div className="text-sm">{message}</div>
      {action && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
            onDismiss?.();
          }}
          className="ml-auto text-xs text-warm-600 hover:text-warm-900 underline"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-xs text-warm-400 hover:text-warm-900 p-1"
      >
        ×
      </button>
    </motion.div>
  );
}
