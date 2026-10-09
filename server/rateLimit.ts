import { MAX_TRACKED_CLIENTS, RATE_LIMIT_PER_HOUR, RATE_LIMIT_PER_MINUTE } from "./limits";

// Per-IP rate limit on /api/chat (build-steps risk R5, issue #122). In memory, for the single
// instance on the host: a restart forgets every count. A sliding log per client: the times of its
// accepted requests in the last hour. A refused request isn't counted, so waiting `retryAfter`
// seconds is always enough.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export type RateLimits = { perMinute: number; perHour: number; maxClients: number };

export type RateDecision =
  | { ok: true }
  // `retryAfter` is in whole seconds, at least 1.
  | { ok: false; window: "minute" | "hour"; retryAfter: number };

export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limits: RateLimits,
    private readonly now: () => number = Date.now,
  ) {}

  take(client: string): RateDecision {
    const t = this.now();
    const recent = (this.hits.get(client) ?? []).filter((at) => t - at < HOUR);
    const lastMinute = recent.filter((at) => t - at < MINUTE);
    // The time each window frees a slot: when the hit that fills it leaves the window.
    const waits: { window: "minute" | "hour"; ms: number }[] = [];
    if (lastMinute.length >= this.limits.perMinute) {
      const filling = lastMinute[lastMinute.length - this.limits.perMinute]!;
      waits.push({ window: "minute", ms: filling + MINUTE - t });
    }
    if (recent.length >= this.limits.perHour) {
      const filling = recent[recent.length - this.limits.perHour]!;
      waits.push({ window: "hour", ms: filling + HOUR - t });
    }
    if (!waits.length) recent.push(t);
    this.remember(client, recent);
    if (!waits.length) return { ok: true };
    const longest = waits.reduce((a, b) => (b.ms > a.ms ? b : a));
    return {
      ok: false,
      window: longest.window,
      retryAfter: Math.max(1, Math.ceil(longest.ms / 1000)),
    };
  }

  reset(): void {
    this.hits.clear();
  }

  // Map order is the order clients were last seen, so past the cap the oldest is dropped. This
  // bounds memory when many addresses each send a little.
  private remember(client: string, recent: number[]) {
    this.hits.delete(client);
    if (!recent.length) return;
    this.hits.set(client, recent);
    if (this.hits.size > this.limits.maxClients) {
      this.hits.delete(this.hits.keys().next().value!);
    }
  }
}

// The client's address: the last entry of X-Forwarded-For, the one the host's proxy added for
// the connection it received (earlier entries come from the client and can be forged). Next.js
// fills the header with the socket address only when no proxy sent one. Then X-Real-IP, then one
// shared bucket. Never logged.
export function clientAddress(headers: Headers): string {
  const forwarded = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const address = forwarded.at(-1) ?? headers.get("x-real-ip")?.trim();
  // An address is at most 45 characters (IPv6 with an IPv4 tail); anything longer isn't one.
  return address && address.length <= 45 ? address : "unknown";
}

export const chatRateLimiter = new RateLimiter({
  perMinute: RATE_LIMIT_PER_MINUTE,
  perHour: RATE_LIMIT_PER_HOUR,
  maxClients: MAX_TRACKED_CLIENTS,
});
