import { formatPrice } from "../../utils/format";

export default function CartItem({ item, onUpdate, onRemove, disabled = false }) {
  const qty = item.quantity || 1;
  return (
    <div className="flex gap-4 items-center py-4 border-b border-warm-200 last:border-0">
      <div className="w-20 h-20 rounded-radius-md bg-warm-100 flex-shrink-0 flex items-center justify-center text-warm-400 text-xs">
        {item.product_name?.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="font-semibold text-warm-900">{item.product_name}</div>
        <div className="text-body-sm text-warm-600">{formatPrice(item.price_minor, item.currency)} each</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          disabled={disabled}
          onClick={() => { Promise.resolve(qty <= 1 ? onRemove(item.variant_id) : onUpdate(item.variant_id, qty - 1)).catch(() => {}); }}
          className="px-2 py-1 min-h-[44px] text-warm-600 hover:text-warm-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="w-8 text-center">{qty}</span>
        <button
          onClick={() => { Promise.resolve(onUpdate(item.variant_id, qty + 1)).catch(() => {}); }}
          disabled={disabled || qty >= 100}
          className="px-2 py-1 min-h-[44px] text-warm-600 hover:text-warm-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      <div className="font-bold text-warm-900">{formatPrice(item.line_total_minor, item.currency)}</div>
      <button
        disabled={disabled}
        onClick={() => { Promise.resolve(onRemove(item.variant_id)).catch(() => {}); }}
        className="ml-4 text-sm text-warm-600 hover:text-error underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        aria-label="Remove item"
      >
        Remove
      </button>
    </div>
  );
}
