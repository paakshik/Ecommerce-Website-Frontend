import { useState, useCallback } from "react";
import { api } from "../services/api";

export function useCart() {
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
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = async (variantId, qty = 1) => {
    setError(null);
    const data = await api.post("/cart", { variant_id: variantId, quantity: qty });
    setCart(data);
    return data;
  };

  const updateItem = async (variantId, qty) => {
    setError(null);
    const data = await api.put(`/cart/${variantId}`, { qty });
    setCart(data);
    return data;
  };

  const removeItem = async (variantId) => {
    setError(null);
    const data = await api.delete(`/cart/${variantId}`);
    setCart(data);
    return data;
  };

  return { cart, loading, error, fetchCart, addItem, updateItem, removeItem };
}
