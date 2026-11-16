import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { isPendingOrder, retryAfterMilliseconds } from "../utils/orders";

// Poll the order state, not the provider payment state (which can initially be null).
export function useOrder(id) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);
  const refreshRef = useRef(() => {});
  const refresh = useCallback(() => refreshRef.current(true), []);

  useEffect(() => {
    let active = true, controller, timer, sequence = 0, attempts = 0, retryAt = 0;
    let current = null;
    setOrder(null);
    setError(null);
    setRateLimit(null);
    setLoading(Boolean(id));
    if (!id) { refreshRef.current = () => {}; return; }

    const schedule = (delay) => {
      clearTimeout(timer);
      if (active && attempts < 10 && document.visibilityState !== "hidden") {
        timer = setTimeout(() => load(), delay);
      }
    };
    const load = async (manual = false) => {
      if (!active) return;
      if (Date.now() < retryAt) { schedule(retryAt - Date.now()); return; }
      if (manual) attempts = 0;
      clearTimeout(timer);
      controller?.abort();
      controller = new AbortController();
      const request = ++sequence;
      attempts += 1;
      try {
        const data = await api.get(`/orders/${id}`, { signal: controller.signal });
        if (!active || request !== sequence) return;
        current = data;
        setOrder(data);
        setError(null);
        setRateLimit(null);
        if (isPendingOrder(data)) schedule(3000);
      } catch (e) {
        if (!active || request !== sequence || e.name === "AbortError") return;
        setError(e.message);
        if (e.status === 429) {
          const delay = retryAfterMilliseconds(e.retryAfter);
          retryAt = Date.now() + delay;
          setRateLimit({ retryAfterSeconds: Math.ceil(delay / 1000) });
          schedule(delay);
        } else if ((!e.status || e.status >= 500) && (!current || isPendingOrder(current))) {
          schedule(Math.min(3000 * 2 ** Math.min(attempts - 1, 3), 30000));
        }
      } finally {
        if (active && request === sequence) setLoading(false);
      }
    };
    const onFocus = () => { if (document.visibilityState !== "hidden") load(); };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { clearTimeout(timer); controller?.abort(); }
      else load();
    };
    refreshRef.current = load;
    load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      ++sequence;
      controller?.abort();
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [id]);
  return { order, loading, error, setError, rateLimit, refresh };
}
