import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useOrder } from "../hooks/useOrder";
import { openRazorpayCheckout, verifyPayment } from "../services/razorpay";
import { isPaidOrder, retryAfterMilliseconds } from "../utils/orders";
import { formatPrice } from "../utils/format";
import Button from "../components/ui/Button";
import CartItem from "../components/ui/CartItem";
import Input from "../components/ui/Input";
import SectionHeader from "../components/ui/SectionHeader";
import RateLimitMessage from "../components/RateLimitMessage";

const quantities = (items = []) => items.map((i) => `${i.variant_id}:${i.quantity}`).sort().join("|");

export default function Checkout() {
  const { user } = useAuth();
  const { cart, loading: cartLoading, error: cartError, fetchCart, updateItem, removeItem } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [checkout, setCheckout] = useState(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);
  const [verificationPayload, setVerificationPayload] = useState(null);
  const creating = useRef(false);
  const paying = useRef(false);
  const verifying = useRef(false);
  const attempt = useRef(null);
  const active = useRef(true);
  const storageKey = user ? `nook.checkout.${user.id || user.email}` : null;
  const { order, error: orderError, rateLimit: orderRateLimit, refresh } = useOrder(checkout?.order_id);

  const forget = () => { try { if (storageKey) sessionStorage.removeItem(storageKey); } catch {} };
  const remember = (value) => {
    // Store only public checkout identifiers, never payment signatures or secrets.
    try { if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch {}
  };
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    setCheckout(null);
    setStarted(false);
    setVerificationPayload(null);
    attempt.current = null;
    try {
      const saved = storageKey && JSON.parse(sessionStorage.getItem(storageKey));
      if (Number.isInteger(saved?.order_id) && saved.order_id > 0) {
        setCheckout(saved);
        setStarted(true);
      }
    } catch { forget(); }
  }, [storageKey]);
  useEffect(() => {
    if (checkout) return;
    fetchCart();
    const onFocus = () => { if (document.visibilityState !== "hidden") fetchCart(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [Boolean(checkout), fetchCart]);
  useEffect(() => {
    if (!order || !isPaidOrder(order)) return;
    forget();
    fetchCart();
    navigate(`/order/${order.id}`, { replace: true });
  }, [order, navigate, fetchCart]);

  const items = checkout ? order?.items || [] : cart?.items || [];
  const currency = order?.currency || checkout?.currency || cart?.currency || "USD";
  const shippingRequired = !checkout && items.some((item) => item.delivery_type !== "download");
  const cartChanged = checkout && order && cart && quantities(cart.items) !== quantities(order.items);

  const createOrder = async (event) => {
    event?.preventDefault();
    if (creating.current || cartLoading || !cart?.items?.length) return;
    creating.current = true;
    setBusy(true);
    setError(null);
    setRateLimit(null);
    const payload = { shipping_address: shippingRequired ? address : undefined };
    const fingerprint = JSON.stringify({ payload, items: quantities(cart.items) });
    if (!attempt.current || attempt.current.fingerprint !== fingerprint) {
      attempt.current = { key: crypto.randomUUID(), fingerprint };
    }
    try {
      const data = await api.post("/orders", payload, { headers: { "Idempotency-Key": attempt.current.key } });
      if (active.current) setCheckout(data);
    } catch (e) {
      if (!active.current) return;
      if (e.status === 429) setRateLimit({ retryAfterSeconds: Math.ceil(retryAfterMilliseconds(e.retryAfter, 60000) / 1000) });
      else setError(e.status === 401 ? "Please sign in to check out." : e.status === 409 ? "An item is unavailable. Refresh your cart and try again." : "Unable to create payment order. Please try again.");
    } finally {
      creating.current = false;
      if (active.current) setBusy(false);
    }
  };

  const confirm = async (payload) => {
    if (verifying.current || !checkout) return;
    verifying.current = true;
    setVerificationPayload(payload);
    setBusy(true);
    setStarted(true);
    setError(null);
    try {
      await verifyPayment(checkout.order_id, payload);
      forget();
      await fetchCart();
      if (active.current) navigate(`/order/${checkout.order_id}`, { replace: true });
    } catch (e) {
      if (!active.current) return;
      setError(e.status && e.status < 500 && e.status !== 429
        ? "Payment details could not be verified. Check your order status or contact support before paying again."
        : "Payment confirmation pending. Check the order status before making another payment.");
      if (e.status === 429) setRateLimit({ retryAfterSeconds: Math.ceil(retryAfterMilliseconds(e.retryAfter, 60000) / 1000) });
      refresh();
    } finally {
      verifying.current = false;
      if (active.current) setBusy(false);
    }
  };
  const pay = async () => {
    if (paying.current || busy || started || cartChanged || !order || order.status !== "pending") return;
    paying.current = true;
    setBusy(true);
    setStarted(true);
    setError(null);
    const current = { ...checkout, key_id: order.key_id || checkout.key_id, currency: order.currency, amount_minor: order.total_minor };
    remember(current);
    try {
      await openRazorpayCheckout({
        ...current, order_id: current.razorpay_order_id,
        name: "Nook", description: `Order ${checkout.order_id}`, prefill: { email: user?.email || "" },
        onSuccess: confirm,
        onClose: () => { if (active.current) { setStarted(false); setError(null); } forget(); },
        onError: () => { if (active.current) setError("The payment attempt failed. You can retry or close the payment window."); },
      });
    } catch {
      if (active.current) { setStarted(false); setError("Unable to open payment. Please try again."); }
      forget();
    } finally {
      paying.current = false;
      if (active.current) setBusy(false);
    }
  };

  if (!user) return <section className="max-w-3xl mx-auto p-6"><Link to="/login">Sign in to check out</Link></section>;
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader title="Checkout" subtitle="Review your items and complete payment" />
      {(error || orderError || cartError) && <p role="alert" className="mb-4 text-error">{error || orderError || cartError?.message}</p>}
      {(rateLimit || orderRateLimit) && <RateLimitMessage {...(rateLimit || orderRateLimit)} disabled={busy}
        onRetry={() => { setRateLimit(null); if (checkout) { if (verificationPayload) confirm(verificationPayload); else refresh(); } else createOrder(); }} />}
      {!checkout && (!cart || cartLoading) && <p role="status">Updating your cart…</p>}
      {!checkout && cart && <form onSubmit={createOrder} className="bg-white border border-warm-200 rounded-radius-lg p-6 space-y-5">
        {items.map((item) => <CartItem key={item.variant_id} item={item} onUpdate={updateItem} onRemove={removeItem} disabled={cartLoading || busy} />)}
        {!items.length && <p>Your cart is empty. <Link to="/products">Browse products</Link></p>}
        {shippingRequired && <Input id="shipping-address" label="Shipping address" value={address} onChange={(e) => setAddress(e.target.value)} required />}
        <div>Subtotal: {formatPrice(cart.subtotal_minor, currency)}</div>
        <div>Shipping: {formatPrice(cart.shipping_minor, currency)}</div>
        <div className="font-bold">Total: {formatPrice(cart.total_minor, currency)}</div>
        <Button type="submit" disabled={busy || cartLoading || !items.length || Boolean(rateLimit)}> {busy ? "Creating order…" : "Create order & pay"} </Button>
      </form>}
      {checkout && <div className="bg-white border border-warm-200 rounded-radius-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Order #{checkout.order_id}</h2>
        {!order && <p role="status">Refreshing your order…</p>}
        {order && <>
          <ul className="space-y-2">{items.map((item) => <li key={item.id}>{item.product_name} × {item.quantity} — {formatPrice(item.price_minor * item.quantity, currency)}</li>)}</ul>
          <div>Subtotal: {formatPrice(order.subtotal_minor, currency)}</div>
          <div>Shipping: {formatPrice(order.shipping_minor, currency)}</div>
          <div className="font-bold">Total: {formatPrice(order.total_minor, currency)}</div>
          {cartChanged && !started && <p role="alert">Your cart has changed. <Link to="/cart">Return to your cart</Link> to review a new checkout.</p>}
          {order.status === "pending" && !started && <Button onClick={pay} disabled={busy || cartChanged}>Pay with Razorpay</Button>}
          {started && <div role="status"><p>Payment confirmation pending. Check your order before paying again.</p>
            {verificationPayload && !rateLimit && <Button onClick={() => confirm(verificationPayload)} disabled={busy}>Retry confirmation</Button>}
          </div>}
          {!started && order.status !== "pending" && <p>Order status: {order.status}</p>}
        </>}
        <Button onClick={refresh} disabled={busy || Boolean(orderRateLimit)}>Refresh order status</Button>
        <Link to={`/order/${checkout.order_id}`} className="block underline">View order</Link>
      </div>}
    </section>
  );
}
