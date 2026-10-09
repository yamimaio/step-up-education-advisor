import { describe, expect, it } from "vitest";
import { RATE_LIMIT_PER_HOUR, RATE_LIMIT_PER_MINUTE } from "./limits";
import { clientAddress, RateLimiter } from "./rateLimit";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

function limiter(perMinute = 3, perHour = 5, maxClients = 100) {
  const clock = { t: 0 };
  return { clock, rl: new RateLimiter({ perMinute, perHour, maxClients }, () => clock.t) };
}

describe("RateLimiter", () => {
  it("defaults to 20 a minute and 100 an hour", () => {
    expect([RATE_LIMIT_PER_MINUTE, RATE_LIMIT_PER_HOUR]).toEqual([20, 100]);
  });

  it("refuses past the minute limit, with the seconds until a slot frees", () => {
    const { clock, rl } = limiter();
    for (let i = 0; i < 3; i++) {
      expect(rl.take("a")).toEqual({ ok: true });
      clock.t += 10 * SECOND;
    }
    // Hits at 0, 10 and 20 s; now 30 s. The first leaves the minute at 60 s.
    expect(rl.take("a")).toEqual({ ok: false, window: "minute", retryAfter: 30 });
  });

  it("lets the client back in once the minute slides past", () => {
    const { clock, rl } = limiter();
    for (let i = 0; i < 3; i++) rl.take("a");
    clock.t = MINUTE - 1;
    expect(rl.take("a").ok).toBe(false);
    clock.t = MINUTE;
    expect(rl.take("a")).toEqual({ ok: true });
  });

  it("doesn't count refused requests, so waiting retryAfter is enough", () => {
    const { clock, rl } = limiter();
    for (let i = 0; i < 3; i++) rl.take("a");
    for (let i = 0; i < 10; i++) {
      clock.t += SECOND;
      rl.take("a");
    }
    const refused = rl.take("a");
    expect(refused.ok).toBe(false);
    clock.t += (refused as { retryAfter: number }).retryAfter * SECOND;
    expect(rl.take("a")).toEqual({ ok: true });
  });

  it("refuses past the hour limit until the oldest hit is an hour old", () => {
    const { clock, rl } = limiter();
    for (let i = 0; i < 5; i++) {
      expect(rl.take("a").ok).toBe(true);
      clock.t += 2 * MINUTE;
    }
    // Hits at 0, 2, 4, 6 and 8 min; now 10 min.
    expect(rl.take("a")).toEqual({ ok: false, window: "hour", retryAfter: 50 * 60 });
    clock.t = 60 * MINUTE;
    expect(rl.take("a")).toEqual({ ok: true });
  });

  it("counts each client apart, and reset forgets them all", () => {
    const { rl } = limiter();
    for (let i = 0; i < 3; i++) rl.take("a");
    expect(rl.take("a").ok).toBe(false);
    expect(rl.take("b").ok).toBe(true);
    rl.reset();
    expect(rl.take("a").ok).toBe(true);
  });

  it("drops the client seen longest ago past the cap", () => {
    const { rl } = limiter(1, 5, 2);
    rl.take("a");
    rl.take("b");
    rl.take("a");
    rl.take("c");
    // b was seen longest ago, so it is forgotten; a is still counted.
    expect(rl.take("a").ok).toBe(false);
    expect(rl.take("b").ok).toBe(true);
  });
});

describe("clientAddress", () => {
  const headers = (h: Record<string, string>) => new Headers(h);

  it("takes the last X-Forwarded-For entry, the one the host's proxy added", () => {
    expect(clientAddress(headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
    expect(clientAddress(headers({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("falls back to X-Real-IP, then one shared bucket", () => {
    expect(clientAddress(headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientAddress(headers({ "x-forwarded-for": " , " }))).toBe("unknown");
    expect(clientAddress(headers({}))).toBe("unknown");
  });

  it("refuses a value too long to be an address", () => {
    expect(clientAddress(headers({ "x-forwarded-for": "x".repeat(46) }))).toBe("unknown");
  });
});
