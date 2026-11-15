import { useReducedMotion } from "framer-motion";

export default function Skeleton({ width = "full", height = "4", radius = "md", count = 1, className }) {
  const reduced = useReducedMotion();
  const radiusClass = `rounded-radius-${radius}`;
  const pulse = reduced ? "bg-warm-200" : "animate-pulse bg-warm-200";
  const widthClass = width === "full" ? "w-full" : `w-[${width}]`;
  const heightClass = `h-[${height}]`;

  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(
      <div key={i} className={`${widthClass} ${heightClass} ${radiusClass} ${pulse} ${className || ""}`} />
    );
  }
  return <>{items}</>;
}

export function Loader({ size = "5", className }) {
  const reduced = useReducedMotion();
  return (
    <svg
      className={`w-[${size}] h-[${size}] border-2 border-warm-200 border-t-brand-600 rounded-full ${reduced ? "" : "animate-spin"} ${className || ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    />
  );
}
