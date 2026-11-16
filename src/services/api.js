// Centralized fetch wrapper.
// Credentials (session cookie) always sent; CSRF token attached on mutating calls.
// Errors parsed as { error: { code, message } }; 429 surfaces retry-after.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// CSRF double-submit token, refreshed by useAuth after session rotation.
let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

export async function getCsrfToken() {
  const res = await fetch(`${BASE_URL}/auth/session`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.csrf_token ?? null;
}

async function request(path, init = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const isFormData = init.body instanceof FormData;
  const headers = { ...(init.headers || {}) };
  if (!isFormData) headers["Content-Type"] = "application/json";

  const method = (init.method || "GET").toUpperCase();
  const isMutating = method !== "GET" && method !== "HEAD";
  if (isMutating && csrfToken) headers["X-CSRF-Token"] = csrfToken;

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  let data;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      // Empty or non-JSON body (e.g. HTTP 204 No Content). Treat as empty data.
      data = null;
    }
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const err = data && data.error ? data.error : { code: res.status, message: String(data) };
    const e = new Error(err.message || "Request failed");
    e.status = res.status;
    e.code = err.code;
    e.retryAfter = res.headers.get("retry-after");
    throw e;
  }
  return data;
}

export const api = {
  get: (path, init = {}) => request(path, { ...init, method: "GET" }),
  post: (path, body, init = {}) => {
    const opts = { ...init, method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) };
    return request(path, opts);
  },
  put: (path, body, init = {}) => {
    const opts = { ...init, method: "PUT", body: JSON.stringify(body) };
    return request(path, opts);
  },
  delete: (path, init = {}) => request(path, { ...init, method: "DELETE" }),
};

export default api;
