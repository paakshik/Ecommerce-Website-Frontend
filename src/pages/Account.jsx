import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import { formatPrice, formatDate } from "../utils/format";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import SectionHeader from "../components/ui/SectionHeader";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import RateLimitMessage from "../components/RateLimitMessage";
import { retryAfterMilliseconds } from "../utils/orders";

const PAGE_SIZE = 10;

// Fulfillment status (order.status) badge styling.
const fulfillmentStyles = {
  pending: "bg-[#FDF4EC] text-[#92400E]",
  paid: "bg-[#ECF7F1] text-[#15803D]",
  fulfilled: "bg-[#ECF7F1] text-[#15803D]",
  payment_review: "bg-[#FDF4EC] text-[#92400E]",
  cancelled: "bg-[#F3F0EB] text-[#6E6557]",
};

// Payment status (order.payment_status) badge styling — kept separate from fulfillment.
const paymentStyles = {
  paid: "bg-[#ECF7F1] text-[#15803D]",
  captured: "bg-[#ECF7F1] text-[#15803D]",
  failed: "bg-[#FEF2F2] text-[#B91C1C]",
  pending: "bg-[#FDF4EC] text-[#92400E]",
  refunded: "bg-[#FDF4EC] text-[#92400E]",
};

export default function Account() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [total, setTotal] = useState(0);
  const requestRef = useRef({ sequence: 0, controller: null, retryAt: 0 });

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    const request = requestRef.current;
    if (Date.now() < request.retryAt) return;
    request.controller?.abort();
    request.controller = new AbortController();
    const sequence = ++request.sequence;
    setError(null);
    try {
      const start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
      const end = dateTo ? new Date(`${dateTo}T00:00:00`) : null;
      if (end) end.setDate(end.getDate() + 1);
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
        ...(searchQuery ? { q: searchQuery } : {}),
        ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(start ? { created_after: start.toISOString() } : {}),
        ...(end ? { created_before: new Date(end.getTime() - 1).toISOString() } : {}),
      }).toString();
      const data = await api.get(`/orders?${query}`, { signal: request.controller.signal });
      if (sequence !== request.sequence) return;
      const items = Array.isArray(data) ? data : data.items || [];
      setOrders(items);
      setTotal(Array.isArray(data) ? items.length : data.total);
      setRateLimit(null);
      if (data.total > 0 && (page - 1) * PAGE_SIZE >= data.total) setPage(Math.ceil(data.total / PAGE_SIZE));
    } catch (e) {
      if (sequence !== request.sequence || e.name === "AbortError") return;
      setError(e.message);
      if (e.status === 429) {
        const delay = retryAfterMilliseconds(e.retryAfter, 60000);
        request.retryAt = Date.now() + delay;
        setRateLimit({ retryAfterSeconds: Math.ceil(delay / 1000) });
      }
    } finally {
      if (sequence === request.sequence) setLoading(false);
    }
  }, [user, page, searchQuery, statusFilter, dateFrom, dateTo]);

  // Initial load + refresh when returning to the page / regaining focus.
  useEffect(() => {
    fetchOrders();
    const onFocus = () => fetchOrders();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchOrders();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      ++requestRef.current.sequence;
      requestRef.current.controller?.abort();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchOrders, refreshKey]);

  const handleRefresh = () => {
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));
  const currentPageOrders = orders;

  if (loading) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center py-10">
          <Skeleton height="6" width="1/3" count={1} />
          <Skeleton height="6" width="1/4" count={2} />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <EmptyState
          title="Please sign in"
          description="Sign in to view your account, orders, and wishlist."
          action={{ label: "Sign in", href: "/login" }}
        />
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader title="Account" subtitle="Your profile and order history" />

      <div className="bg-white border border-warm-200 rounded-radius-lg p-6 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-warm-900 mb-1">{user.email}</h2>
            <p className="text-body-sm text-warm-600">Role: {user.role}</p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center rounded-radius-md border border-warm-200 bg-white px-4 py-2 text-sm font-medium text-warm-900 shadow-sm transition-all duration-fast ease-out hover:bg-warm-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 min-h-[44px]"
          >
            Sign out
          </button>
        </div>
      </div>

      <SectionHeader title="Your orders" />

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
            aria-label="Retry orders"
            className="mt-2 inline-flex items-center gap-1 text-xs underline font-medium min-h-[44px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters + search */}
      <div className="bg-white border border-warm-200 rounded-radius-lg p-5 shadow-sm mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Input
              id="order-search"
              label="Search orders"
              placeholder="Order #, email, or item name"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <select
            value={statusFilter}
            aria-label="Order status"
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="block w-full sm:w-48 rounded-md border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="payment_review">Payment review</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-md border border-warm-200 bg-white px-3 py-2 text-sm font-medium text-warm-900 shadow-sm hover:bg-warm-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 min-h-[44px]"
            aria-label="Refresh orders"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v3h-3" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Date range filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm text-warm-600">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="rounded-md border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-warm-600">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="rounded-md border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            />
          </label>
        </div>
      </div>

      {orders.length === 0 && !error ? (
        <EmptyState
          title="No orders yet"
          description="Your order history will appear here."
          action={{ label: "Browse products", href: "/products" }}
        />
      ) : (
        <>
          <div className="bg-white border border-warm-200 rounded-radius-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-200 bg-warm-50">
                  <th className="text-left px-4 py-3 text-xs text-warm-600">Order</th>
                  <th className="text-left px-4 py-3 text-xs text-warm-600">Date</th>
                  <th className="text-left px-4 py-3 text-xs text-warm-600">Items</th>
                  <th className="text-right px-4 py-3 text-xs text-warm-600">Total</th>
                  <th className="text-left px-4 py-3 text-xs text-warm-600">Payment</th>
                  <th className="text-left px-4 py-3 text-xs text-warm-600">Fulfillment</th>
                  <th className="text-right px-4 py-3 text-xs text-warm-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentPageOrders.map((o) => (
                  <tr key={o.id} className="border-b border-warm-200 group">
                    <td className="px-4 py-3 font-medium text-warm-900">#{o.id}</td>
                    <td className="px-4 py-3 text-warm-600">
                      {o.created_at ? formatDate(o.created_at) : "Date unavailable"}
                    </td>
                    <td className="px-4 py-3 text-warm-600">
                      {(o.items || []).map((i) => (
                        <span key={i.id || i.variant_id} className="block">
                          {i.quantity}× {i.product_name}
                          {i.image_url && (
                            <img
                              src={i.image_url}
                              alt=""
                              className="mt-1 h-6 w-6 object-cover rounded-md border border-warm-200"
                            />
                          )}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-warm-900">
                      {formatPrice(o.total_minor, o.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          o.payment_status === "paid" || o.payment_status === "captured"
                            ? "success"
                            : o.payment_status === "failed"
                              ? "danger"
                              : o.payment_status === "pending" || o.payment_status === "refunded"
                                ? "warning"
                                : "default"
                        }
                      >
                        {o.payment_status || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          o.status === "paid" || o.status === "fulfilled"
                            ? "success"
                            : o.status === "cancelled"
                              ? "danger"
                              : o.status === "payment_review"
                                ? "warning"
                                : "default"
                      }
                      >
                        {o.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/order/${o.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-medium text-inverse shadow-sm hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 min-h-[36px]"
                      >
                        View order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-warm-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-warm-200 bg-white px-3 py-1.5 text-sm text-warm-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-warm-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 min-h-[36px]"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-md border border-warm-200 bg-white px-3 py-1.5 text-sm text-warm-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-warm-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 min-h-[36px]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-8 bg-white border border-warm-200 rounded-radius-lg p-6 shadow-sm">
        <h2 className="text-lg font-bold text-warm-900 mb-3">Wishlist</h2>
        <p className="text-body-sm text-warm-600 mb-4">Save products you love and find them easily later.</p>
        <Link to="/wishlist" className="inline-flex items-center justify-center rounded-radius-md border border-brand-600 bg-brand-600 px-4 py-2 text-xs font-medium text-inverse shadow-sm transition-all duration-fast ease-out hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 min-h-[36px]">
          View wishlist
        </Link>
      </div>
    </section>
  );
}
