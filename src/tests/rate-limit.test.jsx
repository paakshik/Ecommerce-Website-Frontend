import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import RateLimitMessage from "../components/RateLimitMessage";

describe("RateLimitMessage", () => {
  it("renders null when no retry-after provided", () => {
    render(<RateLimitMessage />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows wait time and disables retry", () => {
    render(<RateLimitMessage retryAfterSeconds={5} onRetry={vi.fn()} />);
    expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    expect(screen.getByText(/wait approximately 5 seconds/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /please wait/i });
    expect(btn).toBeDisabled();
  });

  it("enables retry when time expires", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    render(<RateLimitMessage retryAfterSeconds={1} onRetry={onRetry} />);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.getByRole("button", { name: /retry/i })).not.toBeDisabled();
    vi.useRealTimers();
  });
});
