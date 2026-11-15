import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import CartItem from "../components/ui/CartItem";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import SectionHeader from "../components/ui/SectionHeader";
import Skeleton from "../components/ui/Skeleton";
import RateLimitMessage from "../components/RateLimitMessage";

const formatPrice = (minor) => `$${(minor / 100).toFixed(2)}`;

export default function Cart() {
  const { cart, loading, error, fetchCart, updateItem, removeItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleRetry = () => fetchCart();

  const subtotal = cart?.subtotal_minor ?? 0;
  const shipping = cart?.shipping_minor ?? 0;
  const total = cart?.total_minor ?? 0;

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-6">
          <Skeleton height="10" width="1/2" count={1} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3].map((i) => (
              <React.Fragment key={i}>
                <Skeleton height="64" count={1} />
                <Skeleton height="4" width="full" count={1} />
                <Skeleton height="4" width="1/2" count={1} />
                <Skeleton height="6" width="1/3" count={1} />
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center py-10">
          {error.status === 429 && rateLimitShown(error) ? (
            <RateLimitMessage retryAfterSeconds={parseInt(error.retryAfter, 10) || 60} onRetry={handleRetry} disabled={true} />
          ) : null}
          <h2 className="text-lg font-semibold text-warm-900 mb-2">Unable to load cart</h2>
          <p className="text-warm-600">{error.message}</p>
          <Button variant="primary" onClick={handleRetry}>Try again</Button>
        </div>
      </section>
    );
  }

  const items = cart?.items || [];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader title="Shopping cart" subtitle={`(${items.length} item${items.length !== 1 ? "s" : ""})`} />

      {items.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          description="Looks like you haven't added anything yet."
          action={{ label: "Browse products", href: "/products" }}
        />
      ) : (
        <>
          <div className="space-y-0 mb-8">
            {items.map((item) => (
              <CartItem key={item.variant_id} item={item} onUpdate={updateItem} onRemove={removeItem} />
            ))}
          </div>
          <div className="bg-white border border-warm-200 rounded-radius-lg p-6 shadow-sm">
            <div className="flex justify-between text-sm mb-2"><span className="text-warm-600">Subtotal</span><span className="font-medium text-warm-900">{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between text-sm mb-2"><span className="text-warm-600">Shipping</span><span className="font-medium text-warm-900">{formatPrice(shipping)}</span></div>
            <div className="flex justify-between font-bold text-lg mb-6 border-t pt-2"><span className="text-warm-900">Total</span><span>{formatPrice(total)}</span></div>
            <Link to="/checkout">
              <Button variant="primary" size="lg" className="w-full">
                Proceed to checkout
              </Button>
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

function rateLimitShown(error) {
  return error && error.status === 429;
}
