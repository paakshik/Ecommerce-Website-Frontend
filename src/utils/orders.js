export const isPaidOrder = (order) => ["paid", "fulfilled"].includes(order?.status);
export const isPendingOrder = (order) => order?.status === "pending" && !["failed", "refunded"].includes(order.payment_status);

export function retryAfterMilliseconds(value, fallback = 3000) {
  if (value == null) return fallback;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(1000, date - Date.now()) : fallback;
}
