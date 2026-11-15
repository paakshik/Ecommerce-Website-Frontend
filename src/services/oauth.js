// OAuth redirect/callback helpers via /api/auth/oauth/{provider}/redirect.

export function oauthRedirect(provider) {
  window.location.href = `${import.meta.env.VITE_API_BASE_URL || "/api"}/auth/oauth/${provider}/redirect`;
}
