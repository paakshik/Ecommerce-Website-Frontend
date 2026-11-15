import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { useCart } from "../hooks/useCart";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import RatingStars from "../components/ui/RatingStars";
import ProductCard from "../components/ui/ProductCard";
import SectionHeader from "../components/ui/SectionHeader";
import Skeleton from "../components/ui/Skeleton";
import RateLimitMessage from "../components/RateLimitMessage";

const formatPrice = (minor) => `$${(minor / 100).toFixed(2)}`;

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.get(`/products/${id}`)
      .then((data) => {
        if (!mounted) return;
        setProduct(data);
        setSelectedVariant(data.variants?.[0] || null);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message);
        if (e.status === 429) setRateLimit({ retryAfterSeconds: parseInt(e.retryAfter, 10) || 60 });
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    api.get("/products")
      .then((data) => {
        if (!mounted) return;
        const list = data.items || data || [];
        setRelated(list.filter((p) => String(p.id) !== String(id)).slice(0, 4));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [id]);

  const addToCart = async (e) => {
    e.preventDefault();
    if (!selectedVariant) return;
    if (selectedVariant.stock === 0) return;
    setAdded(null);
    try {
      await addItem(selectedVariant.id, qty);
      setAdded(selectedVariant.id);
      setTimeout(() => setAdded(null), 2000);
    } catch (e) {
      if (e.status === 429) setRateLimit({ retryAfterSeconds: parseInt(e.retryAfter, 10) || 60 });
      else setError(e.message);
    }
  };

  const variantPrice = selectedVariant ? selectedVariant.price_minor : product?.price_minor;
  const inStock = selectedVariant ? selectedVariant.stock > 0 : false;

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="h-80 rounded-radius-md bg-warm-100 flex items-center justify-center text-warm-400">
            <Skeleton height="64" count={1} />
          </div>
          <div>
            <Skeleton height="6" width="full" count={1} />
            <Skeleton height="4" width="3/4" count={2} />
            <Skeleton height="6" width="1/3" count={1} />
          </div>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center py-10">
          {rateLimit && (
            <RateLimitMessage retryAfterSeconds={rateLimit.retryAfterSeconds} onRetry={() => window.location.reload()} disabled={!rateLimit} />
          )}
          <h2 className="text-lg font-semibold text-warm-900 mb-2">{error || "Product not found."}</h2>
        </div>
      </section>
    );
  }

  const ratingAvg = useMemo(() => {
    if (!product.reviews || product.reviews.length === 0) return 0;
    return product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length;
  }, [product.reviews]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Image gallery */}
        <div className="space-y-3">
          <div className="h-80 rounded-radius-md bg-warm-100 overflow-hidden relative">
            {product.images?.[0]?.url ? (
              <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-warm-400 text-xs">No image</div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(0, 4).map((img, i) => (
                <button
                  key={i}
                  className="h-16 rounded-radius-md bg-warm-100 overflow-hidden border border-warm-200 hover:border-brand-600 transition-all duration-fast ease-out"
                  aria-label={`Image ${i + 1}`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <h1 className="h1 text-warm-900">{product.name}</h1>
          <p className="text-body text-warm-600">{product.description}</p>

          <div className="flex items-baseline gap-3">
            <span className="text-xl font-bold text-warm-900">{formatPrice(variantPrice)}</span>
            {selectedVariant && !inStock && (
              <Badge variant="danger" size="sm">Out of stock</Badge>
            )}
            {selectedVariant && inStock && selectedVariant.stock < 5 && (
              <Badge variant="warning" size="sm">Only {selectedVariant.stock} left</Badge>
            )}
          </div>

          {product.variants && product.variants.length > 1 && (
            <fieldset className="border border-warm-200 rounded-radius-md p-3" aria-label="Select variant">
              <legend className="px-2 text-caption font-medium text-warm-900">Variant</legend>
              <div className="grid gap-2">
                {product.variants.map((v) => {
                  const selected = selectedVariant?.id === v.id;
                  const vStock = v.stock === 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => { setSelectedVariant(v); setQty(1); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-radius-md border text-sm transition-all duration-fast ease-out ${
                        selected
                          ? "bg-brand-50 border-brand-200 text-brand-600 font-medium"
                          : "bg-white border-warm-200 text-warm-600 hover:border-warm-300"
                      } ${vStock ? "opacity-50 cursor-not-allowed" : ""}`}
                      disabled={vStock}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{v.sku}</span>
                        {v.options && <span className="text-body-sm text-warm-600">{Object.entries(v.options).map(([k, val]) => `${k}: ${val}`).join(" / ")}</span>}
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-medium">{formatPrice(v.price_minor)}</span>
                        <span className="text-[10px] text-warm-400">stock {v.stock}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <form onSubmit={addToCart}>
            <div className="flex items-center gap-4">
              <label className="text-caption font-medium text-warm-900">Quantity</label>
              <input
                type="number"
                min="1"
                max={inStock ? selectedVariant.stock : 1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={!inStock}
                className="w-16 rounded-radius-md border border-warm-200 bg-white px-2 py-2 text-sm text-warm-900 text-center transition-all duration-fast ease-out focus-visible:ring-2 focus-visible:ring-brand-600 min-h-[44px] disabled:bg-warm-100 disabled:cursor-not-allowed"
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!inStock || selectedVariant?.stock === 0}
                onClick={addToCart}
                aria-label={inStock ? `Add ${product.name} to cart` : "Out of stock"}
              >
                {added === selectedVariant?.id ? "Added" : inStock ? "Add to cart" : "Out of stock"}
              </Button>
            </div>
            {rateLimit && (
              <RateLimitMessage retryAfterSeconds={rateLimit.retryAfterSeconds} onRetry={addToCart} disabled={!rateLimit} />
            )}
            {error && <p className="mt-2 text-sm text-error" role="alert">{error}</p>}
          </form>

          {/* Reviews */}
          <SectionHeader title="Customer reviews" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <RatingStars rating={ratingAvg} count={product.reviews?.length || 0} size="md" showCount />
              {product.reviews && product.reviews.length === 0 && <span className="text-body-sm text-warm-600">No reviews yet.</span>}
            </div>
            {product.reviews && product.reviews.length > 0 && (
              <div className="space-y-3">
                {product.reviews.map((r) => (
                  <div key={r.id} className="border border-warm-200 rounded-radius-md p-3">
                    <div className="flex justify-between items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-warm-900">{r.user?.name || r.user_name || "A customer"}</span>
                      <RatingStars rating={r.rating} size="sm" />
                    </div>
                    <p className="text-body-sm text-warm-600">{r.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related products */}
      <SectionHeader title="You may also like" action={{ label: "View all", href: "/products" }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {related.length > 0 ? (
          related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))
        ) : (
          <div className="col-span-full text-center text-warm-600 py-10">No related products.</div>
        )}
      </div>
    </section>
  );
}
