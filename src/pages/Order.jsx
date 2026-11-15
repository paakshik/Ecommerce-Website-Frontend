import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import SectionHeader from "../components/ui/SectionHeader";
import Skeleton from "../components/ui/Skeleton";
import RateLimitMessage from "../components/RateLimitMessage";

const formatPrice = (minor, currency) => `$${((minor || 0) / 100).toFixed(2)}`;

const statusStyles = {
  pending: "bg-[#FDF4EC] text-[#92400E]",
  paid: "bg-[#ECF7F1] text-[#15803D]",
  fulfilled: "bg-[#ECF7F1] text-[#15803D]",
  payment_review: "bg-[#FDF4EC] text-[#92400E]",
  cancelled: "bg-[#F3F0EB] text-[#6E6557]",
};

const statusMessages = {
  pending: "Order confirmation is pending until payment is verified.",
  paid: "Payment confirmed.",
  fulfilled: "Order fulfilled.",
  payment_review: "Payment is under review.",
  cancelled: "Order cancelled.",
};

export default function Order() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.get(`/orders/${id}`)
      .then((data) => { if (mounted) setOrder(data); })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message);
        if (e.status === 429) setRateLimit({ retryAfterSeconds: parseInt(e.retryAfter, 10) || 60 });
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  const requestDownload = async (itemId) => {
    try {
      const data = await api.post(`/orders/${id}/downloads/${itemId}`);
      window.location.href = `/api/downloads/${data.token}`;
    } catch (e) {
      setError(e.message);
    }
  };

  const reorder = async () => {
    try {
      await api.post("/cart", { variant_id: (order.items?.[0]?.variant_id || order.id), quantity: 1 });
      navigate("/cart");
    } catch (e) {
      setError(e.message);
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
            <RateLimitMessage retryAfterSeconds={rateLimit.retryAfterSeconds} onRetry={() => window.location.reload()} disabled={!rateLimit} />
          )}
          <h2 className="text-lg font-semibold text-warm-900 mb-2">{error || "Order not found."}</h2>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader title="Order confirmation" subtitle={`Order #{order.id}`} />
      <div className="bg-white border border-warm-200 rounded-radius-lg p-6 shadow-sm space-y-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-lg font-bold text-warm-900">Order #{order.id}</h1>
            <p className="text-body-sm text-warm-600">{order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${statusStyles[order.status] || "bg-[#F3F0EB] text-[#6E6557]"}`}>
            {order.status}
          </span>
        </div>

        <div className="flex justify-between text-sm mb-4 border-b border-warm-200 pb-2">
          <span className="text-warm-600">Payment</span>
          <span className={order.payment_status === "paid" ? "text-[#15803D] font-medium" : "text-warm-600"}>
            {order.payment_status}
          </span>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-warm-200 text-warm-600 text-xs">
              <th className="text-left pb-2">Item</th>
              <th className="text-right pb-2">Price</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item) => (
              <tr key={item.id || item.variant_id} className="border-b border-warm-200">
                <td className="py-2 text-warm-900">{item.product_name}</td>
                <td className="py-2 text-right font-medium">{formatPrice((item.price_minor || 0) * (item.quantity || 1), order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between text-sm font-semibold mb-6">
          <span className="text-warm-900">Total</span>
          <span className="text-warm-900">{formatPrice(order.total_minor, order.currency)}</span>
        </div>

        {order.downloadable_item_ids &&
          order.downloadable_item_ids.length > 0 &&
          (order.payment_status === "paid" || order.payment_status === "fulfilled") && order.items ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-warm-900">Digital downloads</h3>
            {(order.items || [])
              .filter((item) => order.downloadable_item_ids.includes(item.id))
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border border-warm-200 rounded-radius-md bg-warm-50">
                  <span className="text-body-sm">{item.product_name}</span>
                  <button
                    onClick={() => requestDownload(item.id)}
                    className="text-body-sm text-brand-600 hover:text-brand-800 underline"
                  >
                    Download
                  </button>
                </div>
              ))}
          </div>
        ) : (
          (order.payment_status === "paid" || order.payment_status === "fulfilled") && (
            <p className="text-body-sm text-warm-600">No downloadable items.</p>
          )
        )}

        <div className="pt-4 border-t border-warm-200">
          <p className="text-body-sm text-warm-600 mb-3">{statusMessages[order.payment_status] || statusMessages.pending}</p>
          <Button variant="primary" onClick={reorder}>
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
