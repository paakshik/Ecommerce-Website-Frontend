import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import SectionHeader from "../components/ui/SectionHeader";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

const formatPrice = (minor, currency) => `$${((minor || 0) / 100).toFixed(2)}`;

const statusStyles = {
  pending: "bg-[#FDF4EC] text-[#92400E]",
  paid: "bg-[#ECF7F1] text-[#15803D]",
  fulfilled: "bg-[#ECF7F1] text-[#15803D]",
  cancelled: "bg-[#F3F0EB] text-[#6E6557]",
};

export default function Account() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let mounted = true;
    api.get("/orders")
      .then((data) => { if (mounted) setOrders(data.items || data || []); })
      .catch((e) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [user]);

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
      {error && <p className="mb-4 text-sm text-error" role="alert">{error}</p>}
      {(orders || []).length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Your order history will appear here."
          action={{ label: "Browse products", href: "/products" }}
        />
      ) : (
        <div className="bg-white border border-warm-200 rounded-radius-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200 bg-warm-50">
                <th className="text-left px-4 py-3 text-xs text-warm-600">Order</th>
                <th className="text-left px-4 py-3 text-xs text-warm-600">Date</th>
                <th className="text-right px-4 py-3 text-xs text-warm-600">Total</th>
                <th className="text-left px-4 py-3 text-xs text-warm-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {(orders || []).map((o) => (
                <tr key={o.id} className="border-b border-warm-200">
                  <td className="px-4 py-3 font-medium text-warm-900">#{o.id}</td>
                  <td className="px-4 py-3 text-warm-600">{o.created_at ? new Date(o.created_at).toLocaleDateString() : ""}</td>
                  <td className="px-4 py-3 text-right font-medium text-warm-900">{formatPrice(o.total_minor, o.currency)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={o.status === "paid" || o.status === "fulfilled" ? "success" : "default"}>
                      {o.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
