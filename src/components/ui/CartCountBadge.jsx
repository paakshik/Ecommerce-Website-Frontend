export default function CartCountBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className="absolute top-0 right-0 flex items-center justify-center min-w-[1.5rem] h-[1.5rem] rounded-full bg-brand-600 text-inverse text-[10px] font-bold px-1.5 shadow-sm"
      aria-label={`Cart, ${count} item${count !== 1 ? "s" : ""}`}
    >
      {count}
    </span>
  );
}
