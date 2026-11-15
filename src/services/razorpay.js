import { api } from "./api";

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
let loadingScript = null;
let checkoutOpen = false;

function loadOnce() {
  return new Promise((resolve, reject) => {
    let script = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    const created = !script;
    if (!script) { script = document.createElement("script"); script.src = SCRIPT_URL; script.async = true; }
    const cleanup = () => {
      clearTimeout(timer);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
    const onError = () => {
      cleanup();
      script.remove();
      reject(new Error("razorpay_unavailable"));
    };
    const onLoad = () => {
      if (typeof window.Razorpay !== "function") { onError(); return; }
      cleanup();
      resolve();
    };
    const timer = setTimeout(onError, 10000);
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    if (created) document.head.appendChild(script);
  });
}

async function loadRazorpay() {
  if (typeof window.Razorpay === "function") return;
  if (!loadingScript) {
    loadingScript = (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try { await loadOnce(); return; }
        catch (error) {
          if (attempt === 2) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
        }
      }
    })().finally(() => { loadingScript = null; });
  }
  return loadingScript;
}

export async function openRazorpayCheckout({ key_id, order_id, amount_minor, currency,
  name, description, prefill = {}, onSuccess, onError, onClose }) {
  if (checkoutOpen) throw new Error("checkout_already_open");
  if (!key_id || !order_id || order_id.startsWith("order_test_")) throw new Error("invalid_payment_order");
  checkoutOpen = true;
  try {
    await loadRazorpay();
    return await new Promise((resolve, reject) => {
      let finished = false;
      let confirming = false;
      const options = {
        key: key_id, order_id, amount: amount_minor, currency, name, description, prefill,
        handler: async (response) => {
          if (finished || confirming) return;
          confirming = true;
          try { await onSuccess?.(response); finished = true; resolve(response); }
          catch (error) { finished = true; reject(error); }
        },
        modal: {
          ondismiss: () => {
            if (finished || confirming) return;
            finished = true;
            try { onClose?.(); resolve(null); }
            catch (error) { reject(error); }
          },
        },
      };
      const checkout = new window.Razorpay(options);
      checkout.on("payment.failed", (response) => {
        if (finished || confirming) return;
        try { onError?.(response.error); }
        catch (error) { finished = true; checkout.close(); reject(error); }
      });
      checkout.open();
    });
  } finally {
    checkoutOpen = false;
  }
}

export function verifyPayment(orderId, payload, init = {}) {
  return api.post(`/orders/${orderId}/verify-payment`, payload, init);
}
