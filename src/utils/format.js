// Shared, currency-aware formatting utilities.
// Replaces hardcoded "$" formatting so prices render in the order's currency.
export function formatPrice(minor, currency) {
  const value = (minor || 0) / 100;
  const curr = currency || "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: curr,
  }).format(value);
}

// Returns a localized date string, or an honest fallback when the value is
// missing or invalid. Never returns a blank or invented date.
export function formatDate(iso) {
  if (!iso) return "Date unavailable";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date unavailable";
  return d.toLocaleDateString();
}

// Returns a localized date + time string, or an honest fallback.
export function formatDateTime(iso) {
  if (!iso) return "Date unavailable";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date unavailable";
  return d.toLocaleString();
}

// Renders a shipping_address that the backend may store as either a string or
// a nullable JSON object. Never returns "[object Object]".
// If it's an object, joins whatever address fields are present (line1, line2,
// city, state, postal_code, country) with ", ".
export function formatShippingAddress(address) {
  if (!address) return "";
  if (typeof address === "string") return address;
  if (typeof address === "object" && !Array.isArray(address)) {
    const fields = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ].filter((f) => f != null && String(f).trim() !== "");
    if (fields.length > 0) return fields.join(", ");
    return "Address unavailable";
  }
  return String(address);
}
