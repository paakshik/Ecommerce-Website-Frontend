// Out-of-band API helpers for E2E setup.
// Uses Playwright's APIRequestContext (which shares the `baseURL` and cookie
// jar with the page) so specs stay focused on the browser flow while setup is
// fast and deterministic.
//
// Endpoints used:
//   GET    /api/auth/session   -> csrf_token + session cookie
//   POST   /api/auth/register  -> create a customer account
//   GET    /api/products       -> catalog (to locate a purchasable variant)

export async function bootstrapCsrf(request) {
  const res = await request.get("/api/auth/session");
  if (!res.ok()) {
    throw new Error(`auth/session bootstrap failed: HTTP ${res.status()}`);
  }
  return res.json();
}

export async function registerUser(request, email, password) {
  const { csrf_token } = await bootstrapCsrf(request);
  const res = await request.post("/api/auth/register", {
    data: { email, password },
    headers: { "X-CSRF-Token": csrf_token },
  });
  return res;
}

// Find the first purchasable physical (non-download-only) product variant with
// stock. Returns enough detail to drive the storefront flow through the UI.
export async function findPhysicalVariant(request) {
  const res = await request.get("/api/products");
  if (!res.ok()) {
    throw new Error(`/api/products failed: HTTP ${res.status()}`);
  }
  const body = await res.json();
  const items = body.items || body;
  const product = items.find(
    (p) => p.delivery_type !== "download" && Array.isArray(p.variants) && p.variants.length
  );
  if (!product) {
    throw new Error("No purchasable physical product found in catalog");
  }
  const variant = product.variants.find((v) => v.active && (v.stock ?? 0) > 0);
  if (!variant) {
    throw new Error(`No in-stock variant for product ${product.id}`);
  }
  return {
    productId: product.id,
    productName: product.name,
    variantId: variant.id,
    variantSku: variant.sku,
    priceMinor: variant.price_minor,
  };
}

// Log in an existing customer through the UI (mirrors the real storefront
// sign-in flow, including CSRF bootstrap performed by useAuth).
// NOTE: this will observe a 403 because api.js omits X-CSRF-Token (frontend
// defect). Use apiLogin() below for a correctly-headered login.
export async function signInUi(page, email, password) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button:has-text("Sign in")').click();
  // Successful login rotates the session and redirects home.
  await expect(page).toHaveURL("/", { timeout: 10000 });
}

// ---- Correctly-headered API helpers (isolate backend correctness from the
// frontend's missing CSRF / Idempotency-Key headers) ----

export async function apiLogin(request, email, password) {
  const { csrf_token } = await bootstrapCsrf(request);
  const res = await request.post("/api/auth/login", {
    data: { email, password },
    headers: { "X-CSRF-Token": csrf_token },
  });
  return res;
}

export async function apiAddToCart(request, variantId, quantity = 1) {
  const { csrf_token } = await bootstrapCsrf(request);
  const res = await request.post("/api/cart", {
    data: { variant_id: variantId, quantity },
    headers: { "X-CSRF-Token": csrf_token },
  });
  return res;
}

export async function apiCreateOrder(request, shippingAddress) {
  const { csrf_token } = await bootstrapCsrf(request);
  const idempotencyKey = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const res = await request.post("/api/orders", {
    data: { shipping_address: shippingAddress },
    headers: {
      "X-CSRF-Token": csrf_token,
      "Idempotency-Key": idempotencyKey,
    },
  });
  return res;
}

export async function apiVerifyPayment(request, orderId) {
  const { csrf_token } = await bootstrapCsrf(request);
  // Forged/mock signature: server-side Razorpay signature verification must
  // reject it. This is deterministic regardless of Razorpay test credentials.
  const res = await request.post(`/api/orders/${orderId}/verify-payment`, {
    data: {
      razorpay_payment_id: "pay_mock_forged",
      razorpay_order_id: "order_mock",
      razorpay_signature: "sig_mock_forged",
    },
    headers: { "X-CSRF-Token": csrf_token },
  });
  return res;
}

export async function apiAdminUpload(request, fileName = "e2e-upload.png") {
  const { csrf_token } = await bootstrapCsrf(request);
  // Build multipart/form-data manually as a Buffer. Playwright's `body`
  // option drops the payload in this build (Content-Length: 0), so we pass
  // the bytes as `data`, which Playwright sends as-is. Binary-safe.
  const png = makeTinyPng(); // Buffer
  const boundary = `----WebKitFormBoundary${Date.now()}`;
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: image/png\r\n\r\n`,
    "utf8",
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([header, png, footer]);
  const res = await request.post("/api/admin/uploads/images", {
    data: body,
    headers: {
      "X-CSRF-Token": csrf_token,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
  });
  return res;
}

// Create a tiny in-memory PNG (1x1) for admin upload tests.
export function makeTinyPng() {
  // 1x1 opaque purple PNG.
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
  );
}
