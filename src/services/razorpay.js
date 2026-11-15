// Razorpay Standard Checkout (client side only).
// Only the public key_id comes from the server — no secrets in client code.
// After checkout, handler posts payment details to /api/orders/{id}/verify-payment.

import { api } from "./api";

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let scriptLoaded = false;
let scriptLoading = null;
let loadFailed = false;
let loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1000;

// Load the Razorpay script once, dedupe concurrent calls, and retry with
// backoff on load failure. Rejects with a safe error after retries are
// exhausted so the caller can surface a user-friendly message without
// leaking raw provider details.
function loadRazorpay() {
  if (scriptLoaded) return Promise.resolve();
  if (loadFailed) return Promise.reject(new Error("razorpay_unavailable"));

  if (scriptLoading) return scriptLoading;

  const attemptNo = ++loadAttempts;

  scriptLoading = new Promise((resolve, reject) => {
    let settled = false;
    // Persists across recursive tryLoad() calls within this single promise so
    // retries are genuinely bounded (MAX_LOAD_ATTEMPTS total attempts).
    let retries = 0;
    const settle = () => { settled = true; scriptLoading = null; };

    const tryLoad = () => {
      const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
      if (existing) {
        scriptLoaded = true;
        settle();
        return resolve();
      }

      const s = document.createElement("script");
      s.src = RAZORPAY_SCRIPT_URL;
      s.async = true;

      const onSuccess = () => {
        if (settled) return;
        scriptLoaded = true;
        settle();
        resolve();
      };

      const onFail = () => {
        if (settled) return;
        retries += 1;
        // Only retry while this is still the active loading attempt and we
        // have attempts left. attemptNo pins this to the current loadRazorpay()
        // call so concurrent calls can't inflate the retry count.
        if (loadAttempts === attemptNo && retries < MAX_LOAD_ATTEMPTS) {
          const delay = Math.min(BASE_BACKOFF_MS * 2 ** (retries - 1), 10000);
          setTimeout(() => {
            try { document.head.removeChild(s); } catch (e) {}
            tryLoad();
          }, delay);
        } else {
          // Exhausted: mark failed so repeated calls reject fast instead of
          // retrying unboundedly. Clean up the script element and reset the
          // shared loading promise so a later attempt starts clean.
          loadFailed = true;
          try { document.head.removeChild(s); } catch (e) {}
          settle();
          reject(new Error("razorpay_unavailable"));
        }
      };

      s.onload = onSuccess;
      s.onerror = onFail;
      document.head.appendChild(s);
    };

    tryLoad();
  });

  return scriptLoading;
}

// Guard against multiple concurrent Razorpay checkout windows (double clicks).
let checkoutOpen = false;

export async function openRazorpayCheckout({
  key_id,
  order_id,
  amount_minor,
  currency,
  name,
  description,
  prefill = {},
  onSuccess,
  onError,
  onClose,
}) {
  if (checkoutOpen) {
    return Promise.reject(new Error("checkout_already_open"));
  }

  try {
    await loadRazorpay();
  } catch {
    return Promise.reject(new Error("razorpay_unavailable"));
  }

  checkoutOpen = true;

  return new Promise((resolve, reject) => {
    const release = () => { checkoutOpen = false; };

    const options = {
      key: key_id,
      amount: amount_minor,
      currency,
      name,
      description,
      order_id,
      prefill,
      handler: (response) => {
        release();
        resolve(response);
        if (onSuccess) onSuccess(response);
      },
      onError: (err) => {
        release();
        if (onClose) onClose();
        if (onError) onError(err);
        // Razorpay onError covers payment.failed and other checkout errors.
        // Treated as payment failure via the onError callback; not a hard
        // rejection so the caller doesn't double-handle the UI.
        resolve();
      },
      modal: {
        ondismiss: () => {
          release();
          if (onClose) onClose();
          // Dismissal is the user cancelling the modal — NOT a payment
          // failure. Treated via the onClose callback; not a hard rejection.
          resolve();
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  });
}

// Verifies a payment with the backend. Uses a relative path so api.js's
// BASE_URL (which already carries the /api prefix) is applied exactly once,
// avoiding a double /api prefix.
export async function verifyPayment(orderId, payload, init = {}) {
  return api.post(`/orders/${orderId}/verify-payment`, payload, init);
}
