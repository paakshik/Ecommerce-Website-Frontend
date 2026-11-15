import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import SectionHeader from "../components/ui/SectionHeader";
import Skeleton from "../components/ui/Skeleton";
import RateLimitMessage from "../components/RateLimitMessage";

const formatPrice = (minor, currency) => {
  return `$${((minor || 0) / 100).toFixed(2)}`;
};

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [shippingRequired, setShippingRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);
  const [order, setOrder] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.get("/cart")
      .then((data) => {
        if (!mounted) return;
        const items = data.items || [];
        setShippingRequired(items.some((i) => i.delivery_type === "ship" || i.delivery_type === "both"));
      })
      .catch(() => {
        if (mounted) setShippingRequired(true);
      });
    return () => { mounted = false; };
  }, []);

  const createOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRateLimit(null);
    try {
      const key = idempotencyKey || crypto.randomUUID();
      setIdempotencyKey(key);
      const data = await api.post("/orders", { shipping_address: address || undefined }, {
        headers: { "Idempotency-Key": key },
      });
      setOrder(data);
    } catch (e) {
      setError(e.message);
      if (e.status === 429) setRateLimit({ retryAfterSeconds: parseInt(e.retryAfter, 10) || 60 });
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (payload) => {
    setLoading(true);
    try {
      const data = await api.post(`/orders/${order.order_id}/verify-payment`, payload, {
        headers: { "Idempotency-Key": idempotencyKey || crypto.randomUUID() },
      });
      navigate(`/order/${order.order_id}`);
      return data;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

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
        onSuccess: (resp) => verifyPayment({ razorpay_payment_id: resp.razorpay_payment_id, razorpay_order_id: resp.razorpay_order_id, razorpay_signature: resp.razorpay_signature }),
        onError: (err) => setError(err.message),
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader title="Checkout" subtitle="Review your order and complete payment" />

      {!order ? (
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
            disabled={loading || !!rateLimit}
            className="w-full inline-flex items-center justify-center rounded-radius-md border border-brand-600 bg-brand-600 px-6 py-3 text-sm font-medium text-inverse shadow-sm transition-all duration-fast ease-out hover:bg-brand-800 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600"
          >
            {loading ? "Creating order…" : "Create order & pay"}
          </button>
          {error && <p className="mt-1 text-sm text-error" role="alert">{error}</p>}
        </form>
      ) : (
        <div className="bg-white border border-warm-200 rounded-radius-lg p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-warm-900 mb-2">Order created — {order.order_id}</h2>
          <p className="text-body-sm text-warm-600">Amount: {formatPrice(order.amount_minor, order.currency)}</p>
          <button
            onClick={openCheckout}
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-radius-md border border-brand-600 bg-brand-600 px-6 py-3 text-sm font-medium text-inverse shadow-sm transition-all duration-fast ease-out hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600"
          >
            {loading ? "Opening checkout…" : "Pay with Razorpay"}
          </button>
          {error && <p className="mt-1 text-sm text-error" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}
