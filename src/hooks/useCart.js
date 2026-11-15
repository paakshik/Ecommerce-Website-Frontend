import { useCart as useCartContext } from "../context/CartContext";

// Re-export the context-backed useCart so all existing pages keep working
// with shared cart state across Navbar, ProductDetail, Cart, Checkout, etc.
export function useCart() {
  return useCartContext();
}
