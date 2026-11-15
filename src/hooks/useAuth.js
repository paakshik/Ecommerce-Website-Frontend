import { useState, useEffect, useCallback } from "react";
import { api, getCsrfToken, setCsrfToken } from "../services/api";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSession = useCallback(async () => {
    try {
      const data = await api.get("/auth/me");
      setUser(data.user || null);
      setError(null);
    } catch (e) {
      setUser(null);
      if (e.status !== 401) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const bootstrapCsrf = useCallback(async () => {
    const token = await getCsrfToken();
    setCsrfToken(token);
    return token;
  }, []);

  useEffect(() => {
    loadSession();
    bootstrapCsrf();
  }, [loadSession, bootstrapCsrf]);

  const login = async ({ email, password }) => {
    setError(null);
    await bootstrapCsrf();
    const data = await api.post("/auth/login", { email, password });
    setUser(data.user || null);
    await bootstrapCsrf(); // refresh token after session rotation
    return data;
  };

  const register = async ({ email, password }) => {
    setError(null);
    await bootstrapCsrf();
    const data = await api.post("/auth/register", { email, password });
    setUser(data.user || null);
    await bootstrapCsrf(); // refresh token after session rotation
    return data;
  };

  const logout = async () => {
    setError(null);
    await api.post("/auth/logout");
    setCsrfToken(null);
    setUser(null);
  };

  return { user, loading, error, login, register, logout, loadSession, bootstrapCsrf };
}
