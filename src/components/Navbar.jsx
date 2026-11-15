import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { api } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import CartCountBadge from "./ui/CartCountBadge";

const BRAND = "Nook";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const itemCount = cart?.item_count ?? 0;

  useEffect(() => {
    api.get("/categories")
      .then((data) => setCategories(Array.isArray(data) ? data : data.items || []))
      .catch(() => {});
  }, []);

  const authLinks = user
    ? [
        { to: "/account", label: "Account" },
        { to: "/wishlist", label: "Wishlist" },
      ]
    : [
        { to: "/login", label: "Login" },
        { to: "/register", label: "Register" },
      ];

  const adminLink = user && user.role === "admin" ? { to: "/admin", label: "Admin" } : null;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-warm-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-brand-600 text-balance" aria-label="{BRAND} home">
            <span className="rounded-radius-md p-1 bg-brand-100 text-brand-600 font-bold text-sm">N</span>
            <span className="text-warm-900">{BRAND}</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/products">Products</NavLink>
            {categories.map((c) => (
              <NavLink key={c.id || c.slug} to={`/products?category=${c.slug}`} end={false}>
                {c.name}
              </NavLink>
            ))}
            {authLinks.map((l) => (
              <NavLink key={l.to} to={l.to}>{l.label}</NavLink>
            ))}
            {adminLink && <NavLink to={adminLink.to}>{adminLink.label}</NavLink>}
            <button
              onClick={logout}
              className="text-sm text-warm-600 hover:text-warm-900 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 px-2 py-1 rounded-radius-sm"
            >
              Sign out
            </button>
          </div>

          <div className="flex items-center gap-3">
            <CartLink count={itemCount} />
            <button
              className="md:hidden text-warm-600 hover:text-warm-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 p-1 rounded-radius-sm"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="md:hidden border-t border-warm-200 bg-white"
          >
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-warm-200">
                <NavLink to="/" end onClick={() => setMobileOpen(false)}>Home</NavLink>
                <CartLink count={itemCount} />
              </div>
              <NavLink to="/products" onClick={() => setMobileOpen(false)}>Products</NavLink>
              {categories.map((c) => (
                <NavLink key={c.id || c.slug} to={`/products?category=${c.slug}`} onClick={() => setMobileOpen(false)}>
                  {c.name}
                </NavLink>
              ))}
              {authLinks.map((l) => (
                <NavLink key={l.to} to={l.to} onClick={() => setMobileOpen(false)}>
                  {l.label}
                </NavLink>
              ))}
              {adminLink && (
                <NavLink to={adminLink.to} onClick={() => setMobileOpen(false)}>{adminLink.label}</NavLink>
              )}
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="w-full text-left text-sm text-warm-600 hover:text-warm-900 underline"
              >
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function NavLink({ to, children, end, onClick }) {
  return (
    <Link to={to} end={end ? "true" : undefined} onClick={onClick} className="text-warm-600 hover:text-brand-600">
      {children}
    </Link>
  );
}

function CartLink({ count }) {
  return (
    <Link to="/cart" className="relative text-warm-600 hover:text-brand-600" aria-label="Cart">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 110 4 2 2 0 010-4z" />
      </svg>
      <CartCountBadge count={count} />
    </Link>
  );
}
