import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { api } from "../services/api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const revision = useRef(0);
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);

  const fetchCart = useCallback(async () => {
    const request = ++revision.current;
    await queue.current;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/cart");
      if (request === revision.current) setCart(data);
      return data;
    } catch (e) {
      if (request === revision.current) setError(e);
      return null;
    } finally {
      if (request === revision.current && !pending.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const mutate = useCallback((operation) => {
    ++revision.current; // Invalidate any older GET response.
    pending.current += 1;
    setLoading(true);
    setError(null);
    const result = queue.current.then(async () => {
      try {
        const data = await operation();
        setCart(data);
        return data;
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        pending.current -= 1;
        if (!pending.current) setLoading(false);
      }
    });
    queue.current = result.catch(() => {});
    return result;
  }, []);

  const addItem = useCallback((variantId, quantity = 1) => mutate(
    () => api.post("/cart", { variant_id: variantId, quantity })
  ), [mutate]);
  const updateItem = useCallback((variantId, quantity) => mutate(
    () => api.put(`/cart/${variantId}`, { variant_id: variantId, quantity })
  ), [mutate]);
  const removeItem = useCallback((variantId) => mutate(async () => {
    await api.delete(`/cart/${variantId}`);
    return api.get("/cart");
  }), [mutate]);

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
