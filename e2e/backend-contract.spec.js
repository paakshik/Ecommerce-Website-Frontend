// Backend contract tests driven through Playwright's APIRequestContext.
//
// These attach the headers the frontend currently omits (X-CSRF-Token on
// mutating calls, Idempotency-Key on checkout), so they isolate backend
// correctness from the frontend header defects captured in storefront-ui.spec.js.
//
// DEPENDENCIES (must be true in the execution environment):
//   - Razorpay test-mode credentials configured on the backend
//     (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). create_order calls the real
//     provider; without it, checkout returns 502 provider_order_failed.
//   - The DB is seeded (admin@example.com / change-me-admin) for the admin
//     upload test.
//
// NOTE on payment completion: verify-payment verifies a Razorpay signature
// computed with the server secret. A client-side E2E cannot forge a valid
// signature, so verify-payment with a mocked signature deterministically
// returns 400 invalid_signature (forged signatures are rejected). A real
// "paid" transition requires an actual Razorpay test payment with a valid
// signature — that is provider-side and out of scope for client-side E2E.
import { test, expect } from "@playwright/test";
import {
  registerUser,
  apiLogin,
  apiAddToCart,
  apiCreateOrder,
  apiVerifyPayment,
  apiAdminUpload,
  findPhysicalVariant,
} from "./helpers";

const CUSTOMER_EMAIL = `e2e-customer-${Date.now()}@example.com`;
const CUSTOMER_PASSWORD = "StrongPass123!";

test("full customer flow: register -> login -> add to cart -> checkout -> order -> verify-payment rejects forged signature", async ({ request }) => {
  // 1. Register a customer.
  const regRes = await registerUser(request, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  expect(regRes.status()).toBe(201);

  // 2. Log in (correctly headered).
  const loginRes = await apiLogin(request, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  expect(loginRes.status()).toBe(200);

  // 3. Add an in-stock physical variant to the cart.
  const variant = await findPhysicalVariant(request);
  const cartRes = await apiAddToCart(request, variant.variantId, 1);
  expect(cartRes.status()).toBe(200);

  // 4. View the cart — item present.
  const cart = await request.get("/api/cart");
  expect(cart.ok()).toBe(true);
  const cartBody = await cart.json();
  expect(cartBody.item_count).toBeGreaterThan(0);

  // 5. Create an order (Idempotency-Key supplied; calls Razorpay create_order).
  const orderRes = await apiCreateOrder(request, "123 E2E Test Street, Test City");
  expect(orderRes.status()).toBe(201);
  const order = await orderRes.json();
  expect(order.order_id).toBeDefined();
  expect(order.razorpay_order_id).toBeDefined();

  // 6. View the order page.
  const orderPage = await request.get(`/api/orders/${order.order_id}`);
  expect(orderPage.status()).toBe(200);

  // 7. Verify payment with a forged signature -> must be rejected.
  //    (A real signature requires an actual Razorpay test payment.)
  const verifyRes = await apiVerifyPayment(request, order.order_id);
  expect(verifyRes.status()).toBe(400);
  const verifyBody = await verifyRes.json();
  expect(verifyBody.error.code).toBe("invalid_signature");
});

test("admin upload: signed-in admin can upload an image (correctly headered)", async ({ request }) => {
  // Log in as the seeded admin.
  const loginRes = await apiLogin(request, "admin@example.com", "change-me-admin");
  expect(loginRes.status()).toBe(200);

  // Upload a tiny PNG (multipart + X-CSRF-Token).
  const uploadRes = await apiAdminUpload(request);
  expect(uploadRes.status()).toBe(201);
  const uploadBody = await uploadRes.json();
  expect(uploadBody.storage_key).toBeDefined();
  expect(uploadBody.url).toBe("/api/media/" + uploadBody.storage_key);
});
