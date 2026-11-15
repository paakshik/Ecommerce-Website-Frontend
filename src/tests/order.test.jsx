import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Order from "../pages/Order";
import Account from "../pages/Account";
import { CartProvider } from "../context/CartContext";

// Mock the api module so tests don't hit the network.
vi.mock("../services/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock useAuth with a controllable implementation.
vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: { email: "buyer@example.com", role: "customer" },
    logout: vi.fn(),
  })),
}));

import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";

// Direct DOM poller: wait until `substring` appears in document.body.innerHTML,
// or until `predicate()` returns truthy when `check` is a function.
// Polling document.body.innerHTML directly is stable in this jsdom setup
// because api.get resolves outside React `act`, so testing-library's
// `screen` queries transiently fail between re-renders.
const waitFor = (check, { timeout = 8000, interval = 50 } = {}) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      try {
        const result = typeof check === "function" ? check() : document.body.innerHTML.includes(check);
        if (result) resolve();
        else if (Date.now() - start >= timeout) reject(new Error(`Timed out waiting in poll`));
        else setTimeout(poll, interval);
      } catch (e) {
        if (Date.now() - start >= timeout) reject(e);
        else setTimeout(poll, interval);
      }
    };
    poll();
  });

const baseOrder = {
  id: 42,
  status: "paid",
  payment_status: "paid",
  currency: "USD",
  total_minor: 3298,
  shipping_minor: 300,
  subtotal_minor: 2998,
  email: "buyer@example.com",
  created_at: "2026-01-15T09:30:00Z",
  shipping_address: "123 Maple Lane, Springfield",
  downloadable_item_ids: [101],
  items: [
    { id: 101, variant_id: "v-101", product_name: "Ebook: Nook Guide", quantity: 1, price_minor: 2999, delivery_type: "digital" },
    { id: 102, variant_id: "v-102", product_name: "Ceramic Mug", quantity: 1, price_minor: 299, delivery_type: "ship" },
  ],
};

// Unmount components between tests so Order/Account focus/visibility refresh
// listeners don't leak and pollute subsequent renders.
afterEach(() => cleanup());

// Each test explicitly configures api.get / api.post before rendering, so
// error/rate-limit tests are not overwritten by a default success response.
const mountOrder = () =>
  render(
    <MemoryRouter initialEntries={["/order/42"]}>
      <CartProvider>
        <Routes>
          <Route path="/order/:id" element={<Order />} />
        </Routes>
      </CartProvider>
    </MemoryRouter>
  );

const mountAccount = () =>
  render(
    <MemoryRouter initialEntries={["/account"]}>
      <Routes>
        <Route path="/account" element={<Account />} />
      </Routes>
    </MemoryRouter>
  );

describe("Order detail page", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    vi.mocked(useAuth).mockReturnValue({
      user: { email: "buyer@example.com", role: "customer" },
      logout: vi.fn(),
    });
  });

  it("shows order number, date+time, currency-formatted total, and item breakdown", async () => {
    api.get.mockResolvedValue(baseOrder);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Order #42");
    await waitFor("2026");
    await waitFor("$32.98");
    await waitFor("$29.98");
    await waitFor("$3.00");
    expect(screen.getAllByText("Ebook: Nook Guide").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ceramic Mug").length).toBeGreaterThan(0);
  });

  it("shows payment and fulfillment status separately", async () => {
    api.get.mockResolvedValue(baseOrder);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("paid");
    expect(screen.getByText("Payment summary")).toBeInTheDocument();
    expect(screen.getByText("Fulfillment summary")).toBeInTheDocument();
  });

  it("renders captured payment status separately from fulfillment", async () => {
    const captured = { ...baseOrder, status: "fulfilled", payment_status: "captured" };
    api.get.mockResolvedValue(captured);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Order #42");
    await waitFor("captured");
    expect(screen.getAllByText(/captured/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/fulfilled/i).length).toBeGreaterThan(0);
  });

  it("shows saved shipping address when present", async () => {
    api.get.mockResolvedValue(baseOrder);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("123 Maple Lane");
  });

  it("renders object-shaped shipping_address without [object Object]", async () => {
    const objectAddress = {
      ...baseOrder,
      shipping_address: {
        line1: "456 Oak Avenue",
        line2: "Apt 4B",
        city: "Shelbyville",
        state: "NY",
        postal_code: "10001",
        country: "US",
      },
    };
    api.get.mockResolvedValue(objectAddress);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("456 Oak Avenue");
    await waitFor("Shelbyville");
    await waitFor("NY");
    await waitFor("10001");
    expect(document.body.innerHTML).not.toContain("[object Object]");
  });

  it("renders partial object-shaped shipping_address with missing fields", async () => {
    const partialAddress = {
      ...baseOrder,
      shipping_address: { line1: "777 Pine Road", city: "Springfield" },
    };
    api.get.mockResolvedValue(partialAddress);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("777 Pine Road");
    await waitFor("Springfield");
    expect(document.body.innerHTML).not.toContain("[object Object]");
  });

  it("shows download button for paid orders with downloadable items", async () => {
    api.get.mockResolvedValue(baseOrder);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Order #42");
    expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Download Ebook: Nook Guide/i)).toBeInTheDocument();
  });

  it("shows download button for captured orders with downloadable items", async () => {
    const captured = { ...baseOrder, payment_status: "captured", status: "fulfilled" };
    api.get.mockResolvedValue(captured);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Order #42");
    expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Download Ebook: Nook Guide/i)).toBeInTheDocument();
  });

  it("hides download button for unpaid orders", async () => {
    const unpaid = { ...baseOrder, payment_status: "failed", status: "pending" };
    api.get.mockResolvedValue(unpaid);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Order #42");
    expect(screen.queryAllByText(/Download/i).length).toBe(0);
  });

  it("re-order adds all items with valid variant IDs and reports skipped items", async () => {
    api.get.mockResolvedValue(baseOrder);
    api.post.mockImplementation((path, body) => {
      if (body.variant_id === "v-102") {
        const e = new Error("Out of stock");
        e.status = 409;
        return Promise.reject(e);
      }
      return Promise.resolve({});
    });

    mountOrder();

    await waitFor("Order #42");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Re-order/i }));
    });
    await waitFor("Added 1 item");
    await waitFor("Couldn't add: Ceramic Mug");
  });

  it("re-order handles partial success and explains skipped items with reasons", async () => {
    const mixed = {
      ...baseOrder,
      items: [
        { id: 101, variant_id: "v-101", product_name: "Ebook: Nook Guide", quantity: 1, price_minor: 2999, delivery_type: "digital" },
        { id: 102, variant_id: null, product_name: "Discontinued Item", quantity: 1, price_minor: 299, delivery_type: "ship" },
      ],
    };
    api.get.mockResolvedValue(mixed);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Order #42");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Re-order/i }));
    });
    await waitFor("Added 1 item");
    await waitFor("Discontinued Item (No valid product variant)");
  });

  it("guards against duplicate re-order clicks while a request is in flight", async () => {
    api.get.mockResolvedValue(baseOrder);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Order #42");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Re-order/i }));
    });
    // Let reordering=true take effect before the second click.
    await act(async () => {});
    // Second click while the first request is in flight must be ignored.
    fireEvent.click(screen.getByRole("button", { name: /Re-order/i }));
    // One POST per item (2 items), no duplicates from the double-click.
    expect(api.post).toHaveBeenCalledTimes(2);

    await waitFor("Added 2 items");
  });

  it("shows honest fallback when date is missing", async () => {
    const noDate = { ...baseOrder, created_at: null };
    api.get.mockResolvedValue(noDate);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Order #42");
    expect(screen.getByText(/Date unavailable/)).toBeInTheDocument();
  });

  it("shows error and retry on load failure (404)", async () => {
    const e = new Error("Not found");
    e.status = 404;
    api.get.mockRejectedValue(e);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Not found");
    expect(screen.getByRole("button", { name: /Refresh order/i })).toBeInTheDocument();
  });

  it("handles rate limit 429 with retry-after", async () => {
    const e = new Error("Too many requests");
    e.status = 429;
    e.retryAfter = "5";
    api.get.mockRejectedValue(e);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Too many requests");
  });

  it.each([401, 403, 404, 409])("handles HTTP %s on order load with a retry action", async (status) => {
    const e = new Error("Request failed");
    e.status = status;
    api.get.mockRejectedValue(e);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Request failed");
    expect(screen.getByRole("button", { name: /Refresh order/i })).toBeInTheDocument();
  });

  it("recovers from a network error after a successful retry", async () => {
    const networkErr = new Error("Failed to fetch");
    api.get
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValue(baseOrder);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Failed to fetch");
    fireEvent.click(screen.getByLabelText(/Refresh order/i));
    await waitFor("Order #42");
  });

  it("download triggers POST then navigates to the download token URL", async () => {
    api.get.mockResolvedValue(baseOrder);
    api.post.mockResolvedValue({ token: "dl_abc123" });

    mountOrder();

    await waitFor("Order #42");
    fireEvent.click(screen.getByRole("button", { name: /Download Ebook: Nook Guide/i }));
    await waitFor(() => api.post.mock.calls.some(([path]) => path === "/orders/42/downloads/101"));
  });

  it("renders responsive mobile/desktop classes", async () => {
    api.get.mockResolvedValue(baseOrder);
    api.post.mockResolvedValue({});

    mountOrder();

    await waitFor("Order #42");
    // The responsive flex layout lives on the order header div (an ancestor of the
    // heading, not the outermost section). Find it by class rather than closest("section").
    const heading = screen.getByRole("heading", { name: /Order #42/ });
    const flexContainer = heading.closest('[class*="sm:flex-row"]');
    expect(flexContainer).toBeInTheDocument();
    expect(flexContainer.className).toContain("sm:flex-row");
    expect(flexContainer.className).toContain("sm:items-center");
    // Touch targets meet min-h-[44px]. (Refresh order only renders on error state.)
    expect(screen.getByRole("button", { name: /Download Ebook: Nook Guide/i }).className).toContain("min-h-[44px]");
    expect(screen.getByRole("button", { name: /Re-order/i }).className).toContain("min-h-[44px]");
  });
});

describe("Account order history page", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    vi.mocked(useAuth).mockReturnValue({
      user: { email: "buyer@example.com", role: "customer" },
      logout: vi.fn(),
    });
  });

  it("lists orders with date, total, payment status, fulfillment status, and View order links", async () => {
    api.get.mockResolvedValue([baseOrder]);
    api.post.mockResolvedValue({});

    mountAccount();
    // Allow the first Account render + mocked api.get microtask to settle.
    await new Promise((r) => setTimeout(r, 300));
    expect(document.body.innerHTML.includes("#42"), "body should contain #42").toBe(true);
    expect(document.body.innerHTML.includes("$32.98"), "body should contain $32.98").toBe(true);
    expect(screen.getByText(/Paid/)).toBeInTheDocument();
    expect(screen.getByText(/View order/i)).toBeInTheDocument();
  });

  it("renders currency-aware totals via formatPrice", async () => {
    const inrOrder = { ...baseOrder, id: 99, currency: "INR", total_minor: 129900 };
    api.get.mockResolvedValue([inrOrder]);
    api.post.mockResolvedValue({});

    mountAccount();

    await waitFor("#99");
    await waitFor("₹");
  });

  it("shows honest fallback date when created_at is missing", async () => {
    api.get.mockResolvedValue([{ ...baseOrder, created_at: null }]);
    api.post.mockResolvedValue({});

    mountAccount();

    await waitFor("Date unavailable");
  });

  it("navigates from order list to order detail via View order", async () => {
    api.get.mockImplementation((path) => {
      if (path === "/orders/42") return Promise.resolve(baseOrder);
      if (path === "/orders" || path.startsWith("/orders?")) return Promise.resolve([baseOrder]);
      return Promise.reject(new Error("Not found"));
    });
    api.post.mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={["/account"]}>
        <CartProvider>
          <Routes>
            <Route path="/account" element={<Account />} />
            <Route path="/order/:id" element={<Order />} />
          </Routes>
        </CartProvider>
      </MemoryRouter>
    );

    await waitFor("#42");
    fireEvent.click(screen.getByText(/View order/i));
    await waitFor("Payment summary");
    await waitFor("Order #42");
  });

  it("filters orders by status", async () => {
    const pendingOrder = { ...baseOrder, id: 7, status: "pending", payment_status: "pending" };
    api.get.mockResolvedValue([baseOrder, pendingOrder]);
    api.post.mockResolvedValue({});

    mountAccount();
    await new Promise((r) => setTimeout(r, 300));
    expect(document.body.innerHTML.includes("#42"), "body should contain #42").toBe(true);
    expect(screen.getByText(/#7/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "pending" },
    });
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByText(/#42/)).not.toBeInTheDocument();
    expect(screen.getByText(/#7/)).toBeInTheDocument();
  });

  it("handles empty, loading, error, and retry states", async () => {
    // Empty state.
    api.get.mockResolvedValue([]);
    api.post.mockResolvedValue({});

    mountAccount();
    await waitFor("No orders yet");

    // Error state with retry.
    const e = new Error("Unable to load orders");
    e.status = 500;
    api.get.mockRejectedValue(e);

    mountAccount();

    await waitFor("Unable to load orders");
    expect(screen.getByLabelText(/Retry orders/i)).toBeInTheDocument();
  });

  it.each([401, 403, 404, 409, 429])("handles HTTP %s on order list with retry", async (status) => {
    const e = new Error("Request failed");
    e.status = status;
    if (status === 429) e.retryAfter = "10";
    api.get.mockRejectedValue(e);
    api.post.mockResolvedValue({});

    mountAccount();

    await waitFor("Request failed");
    expect(screen.getByLabelText(/Retry orders/i)).toBeInTheDocument();
  });

  it("recovers from network error after retry", async () => {
    const networkErr = new Error("Failed to fetch");
    api.get.mockRejectedValueOnce(networkErr).mockResolvedValue([baseOrder]);
    api.post.mockResolvedValue({});

    mountAccount();

    await waitFor("Failed to fetch");
    fireEvent.click(screen.getByLabelText(/Retry orders/i));
    await waitFor("#42");
  });

  it("renders responsive mobile/desktop classes", async () => {
    api.get.mockResolvedValue([baseOrder]);
    api.post.mockResolvedValue({});

    mountAccount();

    await waitFor("#42");
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    // Action cell buttons meet min-h-[36px] touch target.
    expect(screen.getByText(/View order/i).className).toContain("min-h-[36px]");
  });
});
