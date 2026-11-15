import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../services/api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/cart");
      setCart(data);
      return data;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addItem = useCallback(async (variantId, qty = 1) => {
    setError(null);
    const data = await api.post("/cart", { variant_id: variantId, quantity: qty });
    setCart(data);
    return data;
  }, []);

  const updateItem = useCallback(async (variantId, qty) => {
    setError(null);
    const data = await api.put(`/cart/${variantId}`, { qty });
    setCart(data);
    return data;
  }, []);

  const removeItem = useCallback(async (variantId) => {
    setError(null);
    const data = await api.delete(`/cart/${variantId}`);
    setCart(data);
    return data;
  }, []);

  return (
    <CartContext.Provider value={{ cart, loading, error, fetchCart, addItem, updateItem, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}

export default CartContext;
