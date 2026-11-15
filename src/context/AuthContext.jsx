import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, getCsrfToken, setCsrfToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const data = await api.get("/auth/me");
      setUser(data.user || null);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
    getCsrfToken().then(setCsrfToken);
  }, [loadSession]);

  const login = async ({ email, password }) => {
    const token = await getCsrfToken();
    setCsrfToken(token);
    const data = await api.post("/auth/login", { email, password });
    setUser(data.user || null);
    const newToken = await getCsrfToken();
    setCsrfToken(newToken);
    return data;
  };

  const register = async ({ email, password }) => {
    const token = await getCsrfToken();
    setCsrfToken(token);
    const data = await api.post("/auth/register", { email, password });
    setUser(data.user || null);
    const newToken = await getCsrfToken();
    setCsrfToken(newToken);
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // ignore logout errors
    }
    setCsrfToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loadSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export default AuthContext;
