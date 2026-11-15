// Displays Retry-After wait, disables the affected action, no auto-resubmission.
import { useState, useEffect } from "react";

export default function RateLimitMessage({ retryAfterSeconds, onRetry, disabled }) {
  const [secondsLeft, setSecondsLeft] = useState(retryAfterSeconds ?? 0);

  useEffect(() => {
    setSecondsLeft(retryAfterSeconds ?? 0);
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (secondsLeft > 0) {
      const t = setInterval(() => {
        setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
      }, 1000);
      return () => clearInterval(t);
    }
  }, [secondsLeft]);

  if (!secondsLeft && retryAfterSeconds == null) return null;

  return (
    <div
      role="alert"
      className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm"
    >
      <p className="font-semibold mb-1">Too many requests. Please try again later.</p>
      {secondsLeft > 0 ? (
        <p className="mb-2">Wait approximately {secondsLeft} second{secondsLeft !== 1 ? "s" : ""}.</p>
      ) : null}
      <button
        onClick={onRetry}
        disabled={disabled || secondsLeft > 0}
        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {secondsLeft > 0 ? "Please wait..." : "Retry"}
      </button>
      <p className="mt-2 text-xs text-red-600">Automatic resubmission is disabled.</p>
    </div>
  );
}
