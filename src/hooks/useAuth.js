import { useAuth as useAuthContext } from "../context/AuthContext";

// Re-export the context-backed useAuth so all existing pages keep working
// with shared auth state across Navbar, Login, Register, Account, Checkout, etc.
export function useAuth() {
  return useAuthContext();
}
