import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import SectionHeader from "../components/ui/SectionHeader";
import RateLimitMessage from "../components/RateLimitMessage";

export default function Register() {
  const { register, error, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setRateLimit(null);
    try {
      await register({ email, password });
      navigate("/");
    } catch (e) {
      setLocalError(e.message);
      if (e.status === 429) setRateLimit({ retryAfterSeconds: parseInt(e.retryAfter, 10) || 60 });
    }
  };

  return (
    <section className="max-w-md mx-auto px-4 py-12">
      <SectionHeader title="Create an account" subtitle="Join Nook today" />
      <div className="bg-white border border-warm-200 rounded-radius-lg p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="register-email"
            name="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <Input
            id="register-password"
            name="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
          />
          {rateLimit && (
            <RateLimitMessage retryAfterSeconds={rateLimit.retryAfterSeconds} onRetry={handleSubmit} disabled={true} />
          )}
          {localError && <p className="mt-1 text-sm text-error" role="alert">{localError}</p>}
          {error && <p className="mt-1 text-sm text-error" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={loading || !!rateLimit}
            className="w-full inline-flex items-center justify-center rounded-radius-md border border-brand-600 bg-brand-600 px-6 py-3 text-sm font-medium text-inverse shadow-sm transition-all duration-fast ease-out hover:bg-brand-800 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-body-sm text-warm-600">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 hover:text-brand-800 font-medium underline">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
