import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../context/ToastContext";
import Button from "./Button";
import RatingStars from "./RatingStars";

const formatPrice = (minor) => `$${(minor / 100).toFixed(2)}`;

export default function ProductCard({ product, onAddToCart, showAddToCart = true }) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [added, setAdded] = useState(false);
  const image = product.images?.[0]?.url || "";
  const firstVariant = product.variants?.[0];
  const outOfStock = firstVariant ? firstVariant.stock === 0 : false;
  const lowStock = firstVariant ? firstVariant.stock > 0 && firstVariant.stock < 5 : false;
  const price = firstVariant ? firstVariant.price_minor : product.price_minor;

  const handleAdd = async (e) => {
    e && e.preventDefault();
    if (onAddToCart) {
      onAddToCart(firstVariant ? firstVariant.id : null);
      return;
    }
    if (outOfStock || !firstVariant) return;
    try {
      await addItem(firstVariant.id, 1);
      setAdded(true);
      toast({ variant: "success", message: `${product.name} added to cart`, duration: 2000 });
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      toast({ variant: "error", message: e.message || "Failed to add to cart" });
    }
  };

  return (
    <article
      role="article"
      aria-label={product.name}
      className="bg-white border border-warm-200 rounded-radius-lg shadow-sm p-4 transition-all duration-medium ease-out group hover:border-warm-300 hover:shadow-md"
    >
      <div className="h-48 rounded-radius-md bg-warm-100 overflow-hidden relative mb-3">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-warm-400 text-xs">
            No image
          </div>
        )}
      </div>
      <Link to={`/products/${product.id}`} className="font-semibold text-warm-900 hover:text-brand-600 text-balance line-clamp-2 block mb-1 text-sm">
        {product.name}
      </Link>
      {product.description && (
        <p className="text-body-sm text-warm-600 line-clamp-2 mb-3">{product.description}</p>
      )}
      {(product.reviews && product.reviews.length > 0) && (
        <div className="mb-3">
          <RatingStars rating={product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length} count={product.reviews.length} size="sm" showCount />
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-warm-900">{formatPrice(price)}</span>
        {outOfStock ? (
          <span className="text-xs font-medium text-promo-700">Out of stock</span>
        ) : lowStock ? (
          <span className="text-xs font-medium text-warning">Only {firstVariant.stock} left</span>
        ) : null}
      </div>
      {showAddToCart && (
        <Button
          variant="ghost"
          size="sm"
          disabled={outOfStock}
          onClick={handleAdd}
          ariaLabel={outOfStock ? "Out of stock" : `Add ${product.name} to cart`}
        >
          {added ? "Added" : outOfStock ? "Out of stock" : "Add to cart"}
        </Button>
      )}
    </article>
  );
}
