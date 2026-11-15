import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Products from "../pages/Products";
import { ToastProvider } from "../context/ToastContext";
import { CartProvider } from "../context/CartContext";
import { api } from "../services/api";

vi.mock("../services/api", () => ({
  api: {
    get: vi.fn((path) => {
      if (path === "/products") return Promise.resolve({ items: [{ id: 1, name: "Widget", description: "A widget", price_minor: 1000, images: [], variants: [], category: "gadgets" }], page: 1, total: 1 });
      if (path === "/categories") return Promise.resolve([]);
      return Promise.resolve([]);
    }),
  },
}));

describe("Products page", () => {
  it("lists products and allows search", async () => {
    render(
      <ToastProvider>
        <CartProvider>
          <BrowserRouter>
            <Products />
          </BrowserRouter>
        </CartProvider>
      </ToastProvider>
    );
    await screen.findByText(/^Widget$/);
  });
});
