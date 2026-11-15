import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Cart from "../pages/Cart";

// Mock the api module so tests don't hit the network.
vi.mock("../services/api", () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ items: [], subtotal_minor: 0, shipping_minor: 0, total_minor: 0, item_count: 0 })),
    post: vi.fn(() => Promise.resolve({})),
    put: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve({})),
  },
}));

vi.mock("../hooks/useCart", () => ({
  useCart: () => ({
    cart: { items: [], subtotal_minor: 0, shipping_minor: 0, total_minor: 0, item_count: 0 },
    loading: false,
    error: null,
    fetchCart: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

describe("Cart page", () => {
  it("shows empty cart message when no items", () => {
    render(
      <BrowserRouter>
        <Cart />
      </BrowserRouter>
    );
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });
});
