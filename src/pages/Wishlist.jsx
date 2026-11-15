import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import ProductCard from "../components/ui/ProductCard";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import SectionHeader from "../components/ui/SectionHeader";
import Skeleton from "../components/ui/Skeleton";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get("/wishlist"),
      api.get("/products").catch(() => ({ items: [] })),
    ])
      .then(([wishlistRes, productsRes]) => {
        if (!mounted) return;
        const list = wishlistRes || [];
        setWishlist(list);
        const all = productsRes.items || productsRes || [];
        const ids = new Set(list.map((w) => w.product_id));
        setProducts(all.filter((p) => ids.has(p.id)));
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleRetry = () => {
    setLoading(true);
    Promise.all([
      api.get("/wishlist"),
      api.get("/products").catch(() => ({ items: [] })),
    ])
      .then(([wishlistRes, productsRes]) => {
        setWishlist(wishlistRes || []);
        const all = productsRes.items || productsRes || [];
        const ids = new Set((wishlistRes || []).map((w) => w.product_id));
        setProducts(all.filter((p) => ids.has(p.id)));
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const removeFromWishlist = async (productId) => {
    try {
      await api.delete(`/wishlist/${productId}`);
      setWishlist((prev) => prev.filter((w) => w.product_id !== productId));
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <React.Fragment key={i}>
              <Skeleton height="64" count={1} />
              <Skeleton height="4" width="full" count={1} />
              <Skeleton height="4" width="1/2" count={1} />
              <Skeleton height="6" width="1/3" count={1} />
            </React.Fragment>
          ))}
        </div>
      </section>
    );
  }

  if (error && !products.length) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center py-10">
          <h2 className="text-lg font-semibold text-warm-900 mb-2">Unable to load wishlist</h2>
          <p className="text-warm-600">{error.message}</p>
          <Button variant="primary" onClick={handleRetry}>Try again</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader title="Wishlist" subtitle="Your saved products" />

      {products.length === 0 ? (
        <EmptyState
          title="Your wishlist is empty"
          description="Save products you love to find them easily later."
          action={{ label: "Browse products", href: "/products" }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => {
            const inWishlist = wishlist.some((w) => w.product_id === p.id);
            return (
              <div key={p.id} className="relative">
                <ProductCard product={p} showAddToCart />
                {inWishlist && (
                  <button
                    onClick={() => removeFromWishlist(p.id)}
                    className="absolute top-2 right-2 p-1.5 text-warm-400 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                    aria-label={`Remove ${p.name} from wishlist`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
