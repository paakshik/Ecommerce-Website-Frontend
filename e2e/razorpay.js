// Client-side Razorpay SDK mock for hermetic E2E tests.
//
// Aborts the real checkout.razorpay.com CDN script and installs a fake
// `window.Razorpay` so no external network, real API keys, or card entry are
// required. The fake is driven by the `outcome` option:
//
//   "success" - the mock modal auto-resolves `handler` with a fake payment
//   "cancel"  - the mock modal fires `modal.ondismiss` (user cancelled)
//   "failure" - the mock modal fires `onError`
//
// Usage:
//
//   import { mockRazorpay } from "./razorpay";
//   await mockRazorpay(page, { outcome: "success" });
//
// Note: server-side Razorpay calls (create_order / verify-payment /
// fetch_payment) still hit the real provider unless the backend is running
// Razorpay in test mode with credentials configured. A mocked client signature
// will not pass server-side signature verification, so verify-payment returns
// 400 (invalid_signature) unless the backend accepts test signatures. The
// specs below assert the deterministic client behaviour and the
// verify-payment attempt, and document that a real "paid" transition requires
// an actual Razorpay test payment with a valid signature.
export async function mockRazorpay(page, { outcome = "success" } = {}) {
  // Serve an empty script so loadRazorpay() resolves instead of rejecting.
  await page.route("**/checkout.razorpay.com/v1/checkout.js", (route) =>
    route.fulfill({ body: "", contentType: "application/javascript" })
  );

  await page.addInitScript(
    ({ outcome }) => {
      window.__rzpMock = { outcome, opened: false, handler: null, modal: null };

      window.Razorpay = class Razorpay {
        constructor(options) {
          this.options = options;
          this.opened = false;
          window.__rzpMock.handler = options.handler;
          window.__rzpMock.modal = options.modal;
        }
        open() {
          this.opened = true;
          window.__rzpMock.opened = true;
          const { handler, modal } = this.options;
          Promise.resolve().then(() => {
            if (window.__rzpMock.outcome === "success") {
              handler?.({
                razorpay_payment_id: `pay_mock_${Math.random()
                  .toString(36)
                  .slice(2)}`,
                razorpay_order_id: this.options.order_id || "order_mock",
                razorpay_signature: "sig_mock",
              });
            } else if (window.__rzpMock.outcome === "cancel") {
              modal?.ondismiss?.();
            } else if (window.__rzpMock.outcome === "failure") {
              this.options.onError?.("payment_failed");
            }
          });
        }
      };
    },
    { outcome }
  );
}
