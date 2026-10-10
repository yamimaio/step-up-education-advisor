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

// The client's key. On Render, Cloudflare sits in front and sets CF-Connecting-IP to the address
// it received the connection from, overwriting any value the client sent, so that header wins
// (issue #186). Render's X-Forwarded-For can't be used there: its last entry is a proxy address
// that changes between requests, and the earlier ones come from the client.
// Without CF-Connecting-IP (local Docker), the last entry of X-Forwarded-For, the one the host's
// proxy appended for the connection it received. That entry is trustworthy only behind such a
// proxy. Next.js fills the header with the socket address only when it is missing, so with no
// proxy in front a client that sends its own header (or its own CF-Connecting-IP) chooses its
// key. No address means one shared bucket. Never logged.
export function clientAddress(headers: Headers): string {
  const address =
    headers.get("cf-connecting-ip")?.trim() ||
    (headers.get("x-forwarded-for") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .at(-1);
  // An address is at most 45 characters (IPv6 with an IPv4 tail); anything longer isn't one.
  return address && address.length <= 45 ? clientKey(address) : "unknown";
}

// An IPv6 address counts by its /64, since one host usually holds a whole /64 and could send each
// request from a new address in it. An IPv4-mapped address counts as its IPv4 form. Anything that
// doesn't parse as IPv6 is used as it is.
export function clientKey(address: string): string {
  if (!address.includes(":")) return address;
  const hextets = expandIPv6(address.replace(/%.*$/, ""));
  if (!hextets) return address;
  if (hextets.slice(0, 5).every((h) => h === 0) && hextets[5] === 0xffff) {
    const [hi, lo] = [hextets[6]!, hextets[7]!];
    return [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff].join(".");
  }
  return `${hextets
    .slice(0, 4)
    .map((h) => h.toString(16))
    .join(":")}::/64`;
}

// The eight 16-bit groups of an IPv6 address, or null if it isn't one.
function expandIPv6(address: string): number[] | null {
  let text = address.toLowerCase();
  // An IPv4 tail ("::ffff:203.0.113.7") is the last two groups.
  const v4 = /^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (v4) {
    const bytes = v4.slice(2).map(Number);
    if (bytes.some((b) => b > 255)) return null;
    text = `${v4[1]}${((bytes[0]! << 8) | bytes[1]!).toString(16)}:${((bytes[2]! << 8) | bytes[3]!).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const groups = (part: string) => (part ? part.split(":") : []);
  const head = groups(halves[0]!);
  const tail = halves.length === 2 ? groups(halves[1]!) : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const all = [...head, ...Array<string>(missing).fill("0"), ...tail];
  if (!all.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return all.map((g) => parseInt(g, 16));
}

export const chatRateLimiter = new RateLimiter({
  perMinute: RATE_LIMIT_PER_MINUTE,
  perHour: RATE_LIMIT_PER_HOUR,
  maxClients: MAX_TRACKED_CLIENTS,
});
