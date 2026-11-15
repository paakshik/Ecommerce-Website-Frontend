// Razorpay Standard Checkout (client side only).
// Only the public key_id comes from the server — no secrets in client code.
// After checkout, handler posts payment details to /api/orders/{id}/verify-payment.

let scriptLoaded = false;
let scriptLoading = null;

function loadRazorpay() {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      scriptLoaded = true;
      return resolve();
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => { scriptLoaded = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return scriptLoading;
}

export async function openRazorpayCheckout({
  key_id,
  order_id,
  amount_minor,
  currency = "INR",
  name,
  description,
  prefill = {},
  onSuccess,
  onError,
  onClose,
}) {
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const options = {
      key: key_id,
      amount: amount_minor,
      currency,
      name,
      description,
      order_id,
      prefill,
      handler: (response) => {
        resolve(response);
        if (onSuccess) onSuccess(response);
      },
      modal: {
        ondismiss: () => {
          if (onClose) onClose();
          reject(new Error("checkout_cancelled"));
        },
      },
    };
    if (onError) options.modal.ondismiss = () => { if (onClose) onClose(); reject(new Error("checkout_cancelled")); };
    const rzp = new window.Razorpay(options);
    rzp.open();
  });
}

export async function verifyPayment(orderId, payload) {
  return api.post(`/api/orders/${orderId}/verify-payment`, payload);
}
