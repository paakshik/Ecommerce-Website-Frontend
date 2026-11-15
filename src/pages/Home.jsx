import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import ProductCard from "../components/ui/ProductCard";
import SectionHeader from "../components/ui/SectionHeader";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import RatingStars from "../components/ui/RatingStars";

const formatPrice = (minor) => `$${(minor / 100).toFixed(2)}`;

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get("/products"),
      api.get("/categories").catch(() => []),
    ])
      .then(([productsRes, categoriesRes]) => {
        if (!mounted) return;
        setProducts(productsRes.items || productsRes || []);
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : categoriesRes.items || []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <React.Fragment key={`skeleton-${i}`}>
              <Skeleton key={`img-${i}`} height="64" count={1} />
              <Skeleton key={`txt-${i}`} height="4" width="full" count={1} />
            </React.Fragment>
          ))}
        </div>
      </section>
    );
  }

  if (error && !products.length) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <EmptyState
          title="Unable to load catalog"
          description={error || "Please try again later."}
          action={{ label: "Try again", onClick: () => window.location.reload() }}
        />
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Campaign hero */}
      <div className="relative rounded-radius-lg bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 p-10 md:p-16 text-inverse mb-12 shadow-md overflow-hidden" role="banner" aria-label="Campaign hero">
        <h1 className="h1 font-bold mb-4 text-balance">Quality essentials for everyday gathering</h1>
        <p className="text-body-sm mb-6 max-w-md opacity-90">Discover curated products, friendly service, and secure delivery.</p>
        <Link to="/products" className="inline-flex items-center justify-center rounded-radius-md border border-inverse bg-inverse px-6 py-3 text-sm font-medium text-brand-600 shadow-sm hover:bg-brand-800 transition-all duration-medium ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-inverse">
          Shop now
        </Link>
      </div>

      {/* Category discovery grid */}
      <SectionHeader title="Discover by category" action={{ label: "View all", href: "/products" }}>
      </SectionHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {categories.length > 0 ? (
          categories.map((c) => (
            <Link
              key={c.id || c.slug}
              to={`/categories/${c.slug || c.id}`}
              className="bg-white border border-warm-200 rounded-radius-lg p-4 flex flex-col items-center justify-center min-h-[200px] hover:border-warm-300 transition-all duration-medium ease-out text-decoration-none"
            >
              <div className="w-16 h-16 rounded-radius-md bg-warm-100 flex items-center justify-center mb-3 text-warm-400 text-sm font-medium">
                {String(c.name).charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-warm-900 font-medium text-balance text-center">{c.name}</span>
            </Link>
          ))
        ) : (
          <div className="col-span-full">
            <EmptyState title="No categories available" description="Check back soon for product categories." />
          </div>
        )}
      </div>

      {/* Featured collections */}
      <SectionHeader title="Featured" subtitle="New and notable products" action={{ label: "View all", href: "/products" }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.length > 0 ? (
          products.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))
        ) : (
          <div className="col-span-full">
            <EmptyState title="No products available" description="Check back soon for new arrivals." />
          </div>
        )}
      </div>
    </section>
  );
}
