import { useEffect, useRef, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";

const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Modal({ open, onClose, title, size = "md", closeOnOverlayClick = true, children, className }) {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      // Focus first interactive element
      const focusable = panelRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-"])'
      );
      if (focusable) focusable.focus();
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [open, handleKeyDown]);

  const sizes = { sm: "max-w-xs", md: "max-w-md", lg: "max-w-lg" };

  if (!open) return null;

  return (
    <>
      <motion.div
        initial={reduced ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduced ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.25 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={() => closeOnOverlayClick && onClose()}
      />
      <motion.div
        ref={panelRef}
        initial={reduced ? {} : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={reduced ? {} : { scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300, duration: reduced ? 0 : 0.25 }}
        className={`fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-full ${sizes[size]} bg-white rounded-lg shadow-md border border-warm-200 p-6 z-50 ${className || ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 text-warm-600 hover:text-warm-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {title && <h2 id="modal-title" className="text-lg font-semibold text-warm-900 mb-4">{title}</h2>}
        <div className="text-sm text-warm-600">{children}</div>
      </motion.div>
    </>
  );
}
