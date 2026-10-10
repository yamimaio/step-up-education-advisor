import { describe, expect, it } from "vitest";
import { RATE_LIMIT_PER_HOUR, RATE_LIMIT_PER_MINUTE } from "./limits";
import { clientAddress, clientHeaderShape, clientKey, RateLimiter } from "./rateLimit";

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
    expect(clientAddress(headers({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8:0:0::/64");
  });

  it("uses one shared bucket with no entry, and ignores X-Real-IP", () => {
    // Next.js always fills X-Forwarded-For, so an X-Real-IP fallback would never run.
    expect(clientAddress(headers({ "x-real-ip": "198.51.100.2" }))).toBe("unknown");
    expect(clientAddress(headers({ "x-forwarded-for": " , " }))).toBe("unknown");
    expect(clientAddress(headers({}))).toBe("unknown");
  });

  it("refuses a value too long to be an address", () => {
    expect(clientAddress(headers({ "x-forwarded-for": "x".repeat(46) }))).toBe("unknown");
    expect(clientAddress(headers({ "cf-connecting-ip": "x".repeat(46) }))).toBe("unknown");
  });

  // Issue #186: on Render, Cloudflare sets CF-Connecting-IP and the last X-Forwarded-For entry is a
  // proxy address that changes between requests.
  it("prefers CF-Connecting-IP over X-Forwarded-For", () => {
    expect(
      clientAddress(
        headers({
          "cf-connecting-ip": "198.51.100.9",
          "x-forwarded-for": "198.51.100.9, 10.0.0.4",
        }),
      ),
    ).toBe("198.51.100.9");
    expect(clientAddress(headers({ "cf-connecting-ip": " 2001:db8:1:2::a " }))).toBe(
      "2001:db8:1:2::/64",
    );
  });

  it("falls back to the last X-Forwarded-For entry when CF-Connecting-IP is missing or empty", () => {
    expect(clientAddress(headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
    expect(
      clientAddress(
        headers({ "cf-connecting-ip": " ", "x-forwarded-for": "1.1.1.1, 203.0.113.7" }),
      ),
    ).toBe("203.0.113.7");
  });

  it("ignores True-Client-IP", () => {
    expect(
      clientAddress(
        headers({ "true-client-ip": "198.51.100.9", "x-forwarded-for": "203.0.113.7" }),
      ),
    ).toBe("203.0.113.7");
  });

  it("keeps one visitor in one bucket behind CF-Connecting-IP, whatever X-Forwarded-For says", () => {
    const rl = new RateLimiter({ perMinute: 2, perHour: 5, maxClients: 10 }, () => 0);
    // A visitor forging a new first entry each time, with Render's proxy appending a new last one.
    const from = (i: number) =>
      clientAddress(
        headers({
          "cf-connecting-ip": "198.51.100.9",
          "x-forwarded-for": `203.0.113.${i}, 10.0.0.${i}`,
        }),
      );
    expect(rl.take(from(1)).ok).toBe(true);
    expect(rl.take(from(2)).ok).toBe(true);
    expect(rl.take(from(3)).ok).toBe(false);
  });
});

describe("clientHeaderShape", () => {
  it("reports counts and booleans, never an address", () => {
    const shape = clientHeaderShape(
      new Headers({
        "x-forwarded-for": "198.51.100.9, , 10.0.0.4",
        "cf-connecting-ip": "198.51.100.9",
      }),
    );
    expect(shape).toEqual({ forwardedFor: 2, cfConnectingIp: true, trueClientIp: false });
    expect(clientHeaderShape(new Headers({ "true-client-ip": "198.51.100.9" }))).toEqual({
      forwardedFor: 0,
      cfConnectingIp: false,
      trueClientIp: true,
    });
  });
});

describe("clientKey", () => {
  it("keys an IPv6 address by its /64, so addresses in one /64 share a bucket", () => {
    const a = clientKey("2001:db8:85a3:12::1");
    expect(a).toBe("2001:db8:85a3:12::/64");
    expect(clientKey("2001:0DB8:85a3:0012:ffff:1:2:3")).toBe(a);
    expect(clientKey("2001:db8:85a3:13::1")).not.toBe(a);
    expect(clientKey("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });

  it("keys an IPv4-mapped address as its IPv4 form", () => {
    expect(clientKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(clientKey("::ffff:cb00:7107")).toBe("203.0.113.7");
  });

  it("leaves IPv4 and anything that isn't IPv6 as it is", () => {
    expect(clientKey("198.51.100.2")).toBe("198.51.100.2");
    expect(clientKey("1:2:3::4::5")).toBe("1:2:3::4::5");
    expect(clientKey("1:2:3:4:5:6:7:8:9")).toBe("1:2:3:4:5:6:7:8:9");
    expect(clientKey("::ffff:300.0.0.1")).toBe("::ffff:300.0.0.1");
  });

  it("shares a bucket across a /64 in the limiter", () => {
    const rl = new RateLimiter({ perMinute: 1, perHour: 5, maxClients: 10 }, () => 0);
    const from = (ip: string) => clientAddress(new Headers({ "x-forwarded-for": ip }));
    expect(rl.take(from("2001:db8:1:2::a")).ok).toBe(true);
    expect(rl.take(from("2001:db8:1:2::b")).ok).toBe(false);
  });
});
