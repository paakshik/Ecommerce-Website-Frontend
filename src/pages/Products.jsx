import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import ProductCard from "../components/ui/ProductCard";

let searchDebounceTimer = null;
import SectionHeader from "../components/ui/SectionHeader";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Select from "../components/ui/Select";
import RateLimitMessage from "../components/RateLimitMessage";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sort, setSort] = useState("featured");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Read category/search from URL search params (direct URL / refresh / Back-Forward)
  const [category, setCategory] = useState(() => new URLSearchParams(location.search).get("category") || "");
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get("search") || "");

  // Keep URL in sync with UI-driven changes (skip if URL already matches)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const currentCategory = params.get("category") || "";
    const currentSearch = params.get("search") || "";
    if (currentCategory === category && currentSearch === search) return;
    if (category) params.set("category", category); else params.delete("category");
    if (search) params.set("search", search); else params.delete("search");
    navigate(`?${params.toString()}`, { replace: true });
  }, [category, search, location, navigate]);

  // Re-read from URL on location change (Back/Forward, direct URL)
  useEffect(() => {
    setCategory(new URLSearchParams(location.search).get("category") || "");
    setSearch(new URLSearchParams(location.search).get("search") || "");
  }, [location]);

  const buildProductUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    const qs = params.toString();
    return qs ? `/products?${qs}` : "/products";
  }, [category, search]);

  const fetchProducts = useCallback(() => {
    let mounted = true;
    Promise.all([
      api.get(buildProductUrl()),
      api.get("/categories").catch(() => []),
    ])
      .then(([productsRes, categoriesRes]) => {
        if (!mounted) return;
        setProducts(productsRes.items || productsRes || []);
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : categoriesRes.items || []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(typeof e.message === "string" ? e.message : JSON.stringify(e.message || e));
        if (e.status === 429) setRateLimit({ retryAfterSeconds: parseInt(e.retryAfter, 10) || 60 });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [buildProductUrl]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRetry = () => {
    setRateLimit(null);
    setLoading(true);
    let mounted = true;
    Promise.all([
      api.get(buildProductUrl()),
      api.get("/categories").catch(() => []),
    ])
      .then(([productsRes, categoriesRes]) => {
        if (!mounted) return;
        setProducts(productsRes.items || productsRes || []);
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : categoriesRes.items || []);
        setError(null);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(typeof e.message === "string" ? e.message : JSON.stringify(e.message || e));
        if (e.status === 429) setRateLimit({ retryAfterSeconds: parseInt(e.retryAfter, 10) || 60 });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  };

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      const catMatch = !category || p.category?.slug === category;
      const searchMatch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return catMatch && searchMatch;
    });
    if (sort === "price-asc") result = [...result].sort((a, b) => (a.price_minor || 0) - (b.price_minor || 0));
    if (sort === "price-desc") result = [...result].sort((a, b) => (b.price_minor || 0) - (a.price_minor || 0));
    if (sort === "name-asc") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [products, category, search, sort]);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-6">
          <Skeleton height="10" width="3/4" count={1} />
          <Skeleton height="10" width="1/2" count={1} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <>
                <Skeleton key={`img-${i}`} height="64" count={1} />
                <Skeleton key={`name-${i}`} height="4" width="full" count={1} />
                <Skeleton key={`desc-${i}`} height="4" width="1/2" count={1} />
                <Skeleton key={`price-${i}`} height="6" width="1/3" count={1} />
              </>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error && !products.length) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {rateLimit && (
          <RateLimitMessage retryAfterSeconds={rateLimit.retryAfterSeconds} onRetry={handleRetry} disabled={!rateLimit} />
        )}
        <p className="text-center text-warm-600">{error}</p>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader title="Products" subtitle="Browse our catalog" />

      <div className="flex flex-col md:flex-row gap-4 items-stretch mb-8">
        <div className="flex-1 min-w-0 relative">
          <label className="sr-only">Search products</label>
          <input
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={(e) => {
              if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
              searchDebounceTimer = setTimeout(() => {
                setSearch(e.target.value);
              }, 300);
            }}
            className="w-full rounded-radius-md border border-warm-200 bg-white px-3 py-2 text-sm text-warm-900 placeholder:text-warm-400 transition-all duration-fast ease-out focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:border-brand-600 min-h-[44px]"
          />
        </div>
        <div className="shrink-0">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="All categories"
            options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]}
          />
        </div>
        <div className="shrink-0">
          <Select
            label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            options={[
              { value: "featured", label: "Featured" },
              { value: "price-asc", label: "Price: low to high" },
              { value: "price-desc", label: "Price: high to low" },
              { value: "name-asc", label: "Name: A to Z" },
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No products found"
          description={search || category ? "Try adjusting your search or filters." : "There are no products available right now."}
          action={{ label: "Browse all products", href: "/products" }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
