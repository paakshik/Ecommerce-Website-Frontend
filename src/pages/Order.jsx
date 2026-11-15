import { useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import SectionHeader from "../components/ui/SectionHeader";
import Skeleton from "../components/ui/Skeleton";
import RateLimitMessage from "../components/RateLimitMessage";
import { useCart } from "../hooks/useCart";
import { useOrder } from "../hooks/useOrder";
import { isPaidOrder } from "../utils/orders";
import { formatPrice, formatDateTime, formatShippingAddress } from "../utils/format";

// Matches api.js so download URLs resolve against the API origin.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Progress display based ONLY on states the backend supports. No fabricated
// delivery dates, tracking numbers, or intermediate steps.
const statusOrder = ["pending", "paid", "fulfilled"];

const statusStyles = {
  pending: "bg-[#FDF4EC] text-[#92400E]",
  paid: "bg-[#ECF7F1] text-[#15803D]",
  fulfilled: "bg-[#ECF7F1] text-[#15803D]",
  payment_review: "bg-[#FDF4EC] text-[#92400E]",
  cancelled: "bg-[#F3F0EB] text-[#6E6557]",
};

const fulfillmentMessages = {
  pending: "Order confirmation is pending until payment is verified.",
  paid: "Payment confirmed — awaiting fulfillment.",
  fulfilled: "Order fulfilled.",
  payment_review: "Payment is under review.",
  cancelled: "Order cancelled.",
};

export default function Order() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { order, loading, error, setError, rateLimit, refresh } = useOrder(id);
  const [reorderResult, setReorderResult] = useState(null); // { added, skipped: [{name, reason}] }
  const [reordering, setReordering] = useState(false); // guards duplicate clicks / idempotent retries
  const reorderLock = useRef(false);
  const { fetchCart } = useCart(); // shared cart store; refreshes the cart badge after re-order

  const handleRefresh = () => {
    setReorderResult(null);
    refresh();
  };

  const requestDownload = async (itemId) => {
    try {
      setError(null);
      const data = await api.post(`/orders/${id}/downloads/${itemId}`);
      window.location.href = `${BASE_URL}/downloads/${data.token}`;
    } catch (e) {
      setError(e.message || "Download failed. Please try again.");
    }
  };

  const reorder = async () => {
    if (reorderLock.current) return;
    setError(null);
    setReorderResult(null);
    if (!(order && order.items)) return;

    setReordering(true);
    reorderLock.current = true;
    const added = [];
    const skipped = [];

    try {
      for (const item of order.items) {
        const variantId = item.variant_id;
        if (!variantId) {
          skipped.push({ name: item.product_name, reason: "No valid product variant" });
          continue;
        }
        try {
          const data = await api.post("/cart", { variant_id: variantId, quantity: item.quantity || 1 });
          added.push({ ...item, variant_id: variantId, quantity: item.quantity || 1, _cartResponse: data });
        } catch (e) {
          const reason =
            e.status === 409 || e.status === 400
              ? "Out of stock or unavailable"
              : e.status === 404
                ? "Product no longer available"
                : "Unable to add to cart";
          skipped.push({ name: item.product_name, reason });
        }
      }

      setReorderResult({ added, skipped });
      if (added.length > 0) {
        // Refresh the shared cart so the Navbar cart badge reflects the
        // newly added items. Never let a cart refresh failure break re-order.
        try {
          await fetchCart();
        } catch {}
        if (skipped.length === 0) navigate("/cart");
        // Keep partial results visible so the customer can review unavailable items.
      }
    } finally {
      reorderLock.current = false;
      setReordering(false);
    }
  };

  if (loading) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center py-10">
          <Skeleton height="6" width="1/2" count={1} />
          <Skeleton height="6" width="1/4" count={2} />
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center py-10">
          {rateLimit && (
            <RateLimitMessage
              retryAfterSeconds={rateLimit.retryAfterSeconds}
              onRetry={handleRefresh}
              disabled={loading}
            />
          )}
          <h2 className="text-lg font-semibold text-warm-900 mb-2">
            {error || "Order not found."}
          </h2>
          {!rateLimit && error && (
            <button
              onClick={handleRefresh}
              aria-label="Refresh order"
              className="mt-3 inline-flex items-center gap-1 rounded-md border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-medium text-inverse shadow-sm hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 min-h-[44px]"
            >
              Refresh
            </button>
          )}
        </div>
      </section>
    );
  }

  const currency = order.currency || "USD";
  const isPayable = isPaidOrder(order);
  const downloadableItems = (order.items || []).filter((i) =>
    order.downloadable_item_ids && order.downloadable_item_ids.includes(i.id)
  );

  // Progress: only states the backend supports, in lifecycle order.
  const currentIndex = statusOrder.indexOf(order.status);
  const progressSteps = statusOrder.map((status, idx) => ({
    status,
    active: idx === currentIndex,
    completed: idx < currentIndex,
  }));

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader title="Order confirmation" subtitle={`Order #{order.id}`} />

      {rateLimit && (
        <RateLimitMessage
          retryAfterSeconds={rateLimit.retryAfterSeconds}
          onRetry={handleRefresh}
          disabled={loading}
        />
      )}

      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-sm">
          {error}
          <button
            onClick={handleRefresh}
            aria-label="Refresh order"
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-medium text-inverse shadow-sm hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 min-h-[44px]"
          >
            Refresh
          </button>
        </div>
      )}

      <div className="bg-white border border-warm-200 rounded-radius-lg p-6 shadow-sm space-y-5">
        {/* Order number + date/time */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-warm-900">Order #{order.id}</h1>
            <p className="text-body-sm text-warm-600">
              Placed {order.created_at ? formatDateTime(order.created_at) : "Date unavailable"}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
              statusStyles[order.status] || "bg-[#F3F0EB] text-[#6E6557]"
            }`}
          >
            {order.status}
          </span>
        </div>

        {/* Payment summary */}
        <div className="border border-warm-200 rounded-radius-lg p-4">
          <h3 className="text-sm font-semibold text-warm-900 mb-3 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: order.payment_status === "paid" || order.payment_status === "captured" ? "#15803D" : "#B7AE9F" }} />
            Payment summary
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <dt className="text-warm-600">Payment status</dt>
            <dd className="text-warm-900 font-medium">{order.payment_status || "—"}</dd>
            <dt className="text-warm-600">Order total</dt>
            <dd className="text-warm-900 font-medium">{formatPrice(order.total_minor, currency)}</dd>
          </dl>
        </div>

        {/* Fulfillment summary */}
        <div className="border border-warm-200 rounded-radius-lg p-4">
          <h3 className="text-sm font-semibold text-warm-900 mb-3">Fulfillment summary</h3>
          <p className="text-body-sm text-warm-600 mb-2">
            {fulfillmentMessages[order.status] || fulfillmentMessages.pending}
          </p>
          <div className="flex flex-col gap-2">
            {progressSteps.map((step) => (
              <div key={step.status} className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${step.completed ? "bg-[#15803D]" : step.active ? "bg-[#B45309]" : "bg-[#D9CEC3]"}`}
                />
                <span className={`text-xs font-medium ${step.completed ? "text-[#15803D]" : step.active ? "text-[#92400E]" : "text-warm-400"}`}>
                  {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                </span>
                {step.status !== progressSteps[progressSteps.length - 1].status && (
                  <span className="w-px h-3 bg-warm-200 mx-1" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Saved shipping information */}
        {order.shipping_address && (
          <div className="border border-warm-200 rounded-radius-lg p-4">
            <h3 className="text-sm font-semibold text-warm-900 mb-2">Shipping to</h3>
            <p className="text-body-sm text-warm-600 whitespace-pre-line">{formatShippingAddress(order.shipping_address)}</p>
          </div>
        )}

        {/* Item breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-warm-900 mb-3">Items</h3>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-warm-200 text-warm-600 text-xs">
                <th className="text-left pb-2">Item</th>
                <th className="text-right pb-2">Qty</th>
                <th className="text-right pb-2">Unit price</th>
                <th className="text-right pb-2">Line total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item) => (
                <tr key={item.id || item.variant_id} className="border-b border-warm-200">
                  <td className="py-2 text-warm-900">{item.product_name}</td>
                  <td className="py-2 text-right text-warm-600">{item.quantity || 1}</td>
                  <td className="py-2 text-right font-medium">{formatPrice(item.price_minor, currency)}</td>
                  <td className="py-2 text-right font-medium">
                    {formatPrice(((item.price_minor || 0) * (item.quantity || 1)), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-2 mb-6 border-t border-warm-200 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-warm-600">Subtotal</span>
              <span className="text-warm-900">{formatPrice(order.subtotal_minor ?? order.total_minor, currency)}</span>
            </div>
            {order.shipping_minor !== undefined && order.shipping_minor !== null && order.shipping_minor > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-warm-600">Shipping</span>
                <span className="text-warm-900">{formatPrice(order.shipping_minor, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-warm-200 pt-2">
              <span className="text-warm-900">Total</span>
              <span className="text-warm-900">{formatPrice(order.total_minor, currency)}</span>
            </div>
          </div>
        </div>

        {/* Digital downloads */}
        {isPayable && (
          <div className="border border-warm-200 rounded-radius-lg p-4">
            <h3 className="text-sm font-semibold text-warm-900 mb-3">Digital downloads</h3>
            {downloadableItems.length > 0 ? (
              <div className="space-y-2">
                {downloadableItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 border border-warm-200 rounded-radius-md bg-warm-50">
                    <span className="text-body-sm">{item.product_name}</span>
                    <button
                      onClick={() => requestDownload(item.id)}
                      disabled={loading}
                      aria-label={`Download ${item.product_name}`}
                      className="text-body-sm text-brand-600 hover:text-brand-800 underline disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-warm-600">No downloadable items.</p>
            )}
          </div>
        )}

        {/* Re-order result banner */}
        {reorderResult && (
          <div className={reorderResult.skipped.length > 0 ? "p-3 rounded-lg bg-[#FDF4EC] border border-[#FED7AA] text-[#92400E] text-sm" : "p-3 rounded-lg bg-[#ECF7F1] border border-[#BBF7D0] text-[#15803D] text-sm"}>
            {reorderResult.added.length > 0 ? (
              <>
                Added {reorderResult.added.length} item{reorderResult.added.length !== 1 ? "s" : ""} to cart.
                {reorderResult.skipped.length > 0 && (
                  <>
                    <br />
                    Couldn&apos;t add: {reorderResult.skipped.map((s) => `${s.name} (${s.reason})`).join("; ")}.
                  </>
                )}
              </>
            ) : (
              `Couldn&apos;t add any items: ${reorderResult.skipped.map((s) => `${s.name} (${s.reason})`).join("; ")}.`
            )}
          </div>
        )}

        <div className="pt-4 border-t border-warm-200">
          <Button variant="primary" onClick={reorder} disabled={loading || reordering} aria-label="Re-order items">
            Re-order
          </Button>
          <Link to="/products" className="mt-3 inline-block text-body-sm text-warm-600 hover:text-brand-600 underline">
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
