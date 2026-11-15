import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { verifyPayment } from "../services/razorpay";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import SectionHeader from "../components/ui/SectionHeader";
import Skeleton from "../components/ui/Skeleton";
import RateLimitMessage from "../components/RateLimitMessage";
import { formatPrice } from "../utils/format";

// Safe, user-facing error messages. Raw backend/Razorpay messages are never
// surfaced directly to avoid leaking internal details.
const ORDER_CREATION_ERROR = "Unable to create payment order. Please try again.";
const CHECKOUT_ERROR = "Payment was cancelled or failed. Please try again.";
const VERIFICATION_ERROR = "Payment confirmation pending. Your payment may still be processing.";

// Pending-payment polling bounds.
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10;
const TERMINAL_PAYMENT_STATUSES = new Set(["paid", "failed", "cancelled"]);

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [shippingRequired, setShippingRequired] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);
  const [order, setOrder] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  const [verificationPending, setVerificationPending] = useState(false);
  // Last verification payload, kept so a failed verification can be retried
  // idempotently (same payment details) instead of starting a new payment.
  const [verificationPayload, setVerificationPayload] = useState(null);
  // Pending-payment polling state. Kept in refs so polling can start/stop
  // without triggering re-renders; the effect below gates on order + status.
  const pollAttempts = useRef(0);
  const abortRef = useRef(null);
  const timeoutRef = useRef(null);
  const pollingRef = useRef(false);
  const prevPaymentStatus = useRef(null);
  const isMounted = useRef(false);

  useEffect(() => {
    let mounted = true;
    api.get("/cart")
      .then((data) => {
        if (!mounted) return;
        const items = data.items || [];
        setCartItems(items);
        setShippingRequired(items.some((i) => i.delivery_type === "ship" || i.delivery_type === "both"));
      })
      .catch(() => {
        if (mounted) setShippingRequired(true);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const isEmpty = cartItems.length === 0 && !order;

  const createOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRateLimit(null);
    setVerificationPending(false);
    try {
      const key = idempotencyKey || crypto.randomUUID();
      setIdempotencyKey(key);
      const data = await api.post("/orders", { shipping_address: address || undefined }, {
        headers: { "Idempotency-Key": key },
      });
      setOrder(data);
    } catch (e) {
      if (e.status === 429) {
        setRateLimit({ retryAfterSeconds: parseInt(e.retryAfter, 10) || 60 });
      } else {
        // Backend order creation failures (502, cart_empty, Authentication failed, etc.)
        // show a safe generic message instead of leaking raw backend details.
        setError(ORDER_CREATION_ERROR);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyPaymentAndRedirect = async (payload) => {
    setVerificationPayload(payload);
    setLoading(true);
    setError(null);
    try {
      // Reuse the order-creation idempotency key so create+verify share one
      // idempotency scope; backend verify-payment is idempotent.
      const key = idempotencyKey || crypto.randomUUID();
      const data = await verifyPayment(order.order_id, payload, {
        headers: { "Idempotency-Key": key },
      });
      // Refetch order so the Order page lands on fresh, authoritative state.
      // The Order page also refetches on focus/visibility, so proceed even if
      // this refetch fails.
      try {
        const refreshed = await api.get(`/orders/${order.order_id}`);
        if (refreshed) setOrder(refreshed);
      } catch {
        // Ignore refetch failure; Order page will refresh on arrival.
      }
      navigate(`/order/${order.order_id}`);
      return data;
    } catch (e) {
      // Verification temporarily unavailable — do NOT encourage another payment.
      // Surface a safe "confirmation pending" state with an idempotent retry.
      setVerificationPending(true);
      setError(VERIFICATION_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const retryVerification = async () => {
    if (!order || !verificationPayload) return;
    // Re-submit the same verification idempotently — not a new payment.
    return verifyPaymentAndRedirect(verificationPayload);
  };

  // ---- Pending-payment polling (Issue 6) ----
  // Polls GET /orders/{id} while payment_status === "pending". Bounded by
  // MAX_POLL_ATTEMPTS, cancels in-flight requests via AbortController, backs
  // off on 429 / Retry-After, never overlaps polls, and cleans up on unmount.

  const stopPolling = () => {
    pollingRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const pollOrderStatus = async () => {
    if (!isMounted.current || pollingRef.current || !order) return; // sequence: never overlap polls
    pollingRef.current = true;

    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const refreshed = await api.get(`/orders/${order.order_id}`, {
        signal: controller.signal,
      });
      abortRef.current = null;

      if (!refreshed) return;

      setOrder(refreshed);
      const status = refreshed.payment_status;

      if (TERMINAL_PAYMENT_STATUSES.has(status)) {
        // Terminal state reached — stop polling and clear any pending banner.
        stopPolling();
        setVerificationPending(false);
        return;
      }

      // Still pending: continue if we have attempts left.
      pollAttempts.current += 1;
      if (pollAttempts.current >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        return;
      }
      timeoutRef.current = setTimeout(pollOrderStatus, POLL_INTERVAL_MS);
    } catch (e) {
      abortRef.current = null;
      if (e.status === 429) {
        // Respect Retry-After; back off instead of hammering.
        const retryAfterMs = (parseInt(e.retryAfter, 10) || 3) * 1000;
        pollAttempts.current += 1;
        if (pollAttempts.current >= MAX_POLL_ATTEMPTS) {
          stopPolling();
          return;
        }
        timeoutRef.current = setTimeout(pollOrderStatus, retryAfterMs);
      } else {
        // Transient error: retry after the normal interval unless exhausted.
        pollAttempts.current += 1;
        if (pollAttempts.current >= MAX_POLL_ATTEMPTS) {
          stopPolling();
          return;
        }
        timeoutRef.current = setTimeout(pollOrderStatus, POLL_INTERVAL_MS);
      }
    } finally {
      if (abortRef.current === null) pollingRef.current = false;
    }
  };

  // Start polling on a transition into "pending"; stop on terminal/unmount.
  // Using a status transition (rather than re-triggering on every setOrder)
  // keeps the bounded setTimeout schedule in pollOrderStatus as the sole
  // re-poll driver, preventing a tight re-poll loop.
  useEffect(() => {
    let mounted = true;
    const status = order ? order.payment_status : null;
    const wasPending = prevPaymentStatus.current === "pending";
    prevPaymentStatus.current = status;

    if (mounted && status === "pending" && !wasPending && !pollingRef.current) {
      pollAttempts.current = 0;
      pollOrderStatus();
    }
    if (mounted && status !== null && status !== "pending") {
      stopPolling();
    }
    return () => {
      mounted = false;
      stopPolling();
    };
  }, [order, order?.payment_status]);

  const openCheckout = async (e) => {
    e.preventDefault();
    if (!order) return;
    try {
      const { openRazorpayCheckout } = await import("../services/razorpay");
      const response = await openRazorpayCheckout({
        key_id: order.key_id,
        order_id: order.razorpay_order_id,
        amount_minor: order.amount_minor,
        currency: order.currency || "USD",
        name: "Nook",
        description: `Order ${order.order_id}`,
        prefill: { email: user?.email || "", contact: "" },
        onSuccess: (resp) => verifyPaymentAndRedirect({
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_order_id: resp.razorpay_order_id,
          razorpay_signature: resp.razorpay_signature,
        }),
        onError: () => setError(CHECKOUT_ERROR),
      });
    } catch (err) {
      // Razorpay Checkout errors and modal dismissal (checkout_cancelled) are
      // handled gracefully with a safe message, no raw error details exposed.
      setError(CHECKOUT_ERROR);
    }
  };

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader title="Checkout" subtitle="Review your order and complete payment" />

      {!order ? (
        isEmpty ? (
          <div className="bg-white border border-warm-200 rounded-radius-lg p-6 shadow-sm text-center">
            <h2 className="text-lg font-semibold text-warm-900 mb-2">Your cart is empty</h2>
            <p className="text-warm-600 mb-4">Add items before checking out.</p>
            <Link to="/products">
              <Button variant="primary">Browse products</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={createOrder} className="bg-white border border-warm-200 rounded-radius-lg p-6 shadow-sm space-y-5">
            {shippingRequired && (
              <div>
                <Input
                  id="shipping-address"
                  label="Shipping address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your shipping address"
                  required
                />
              </div>
            )}
            {rateLimit && (
              <RateLimitMessage retryAfterSeconds={rateLimit.retryAfterSeconds} onRetry={createOrder} disabled={loading} />
            )}
            <button
              type="submit"
              disabled={loading || !!rateLimit || isEmpty}
              className="w-full inline-flex items-center justify-center rounded-radius-md border border-brand-600 bg-brand-600 px-6 py-3 text-sm font-medium text-inverse shadow-sm transition-all duration-fast ease-out hover:bg-brand-800 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600"
            >
              {loading ? "Creating order…" : "Create order & pay"}
            </button>
            {error && <p className="mt-1 text-sm text-error" role="alert">{error}</p>}
          </form>
        )
      ) : (
        <div className="bg-white border border-warm-200 rounded-radius-lg p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-warm-900 mb-2">Order created — {order.order_id}</h2>
          <p className="text-body-sm text-warm-600">Amount: {formatPrice(order.amount_minor, order.currency)}</p>
          {/* Itemized review: what the user is paying for before clicking Pay. */}
          {cartItems.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-warm-900 mb-1">Items</h3>
              <ul className="list-disc list-inside text-sm text-warm-600 space-y-1">
                {cartItems.map((item) => (
                  <li key={item.variant_id || item.id}>
                    {item.product_name} x {item.quantity} &mdash;{" "}
                    {formatPrice(item.line_total_minor ?? item.price_minor * item.quantity, order.currency)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={openCheckout}
            disabled={loading || verificationPending}
            className="w-full inline-flex items-center justify-center rounded-radius-md border border-brand-600 bg-brand-600 px-6 py-3 text-sm font-medium text-inverse shadow-sm transition-all duration-fast ease-out hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600"
          >
            {loading ? "Opening checkout…" : "Pay with Razorpay"}
          </button>
          {verificationPending && (
            <div role="alert" className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-sm">
              {error}
              <button
                onClick={retryVerification}
                disabled={loading}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-medium text-inverse shadow-sm hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Retry confirmation
              </button>
            </div>
          )}
          {error && !verificationPending && <p className="mt-1 text-sm text-error" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}
