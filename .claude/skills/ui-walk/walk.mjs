// Walks persona A through both stages at one viewport, against a MODEL_FAKE=1 server, and writes
// <outDir>/result-<width>x<height>.json plus screenshots. Run inside the Playwright container
// (ui-walk.sh does that). Usage: node walk.mjs <baseUrl> <width>x<height> <outDir>
//
// It measures, at every reply: horizontal scroll, where focus landed, whether the sticky progress
// line covers it, and the progress line's states; at the main screens: axe-core and a Tab pass.
// The progress line and the "What I've understood" panel are detected, not assumed: a check that
// needs one the page doesn't have (or hides at this width) is "n/a", not a failure.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const [base, viewport, out] = process.argv.slice(2);
if (!base || !/^\d+x\d+$/.test(viewport ?? "") || !out) {
  process.stderr.write("Usage: node walk.mjs <baseUrl> <width>x<height> <outDir>\n");
  process.exit(2);
}
const [width, height] = viewport.split("x").map(Number);
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Persona A (personas/A.md) as the fake model expects it. The fake answers from the taps, so
// these must be its chip labels exactly.
const OPENING = "I've led engineering teams for twelve years.";
const GOAL = "Move into an executive role";
const QUESTION = "What does a senior network mean?";
const CORRECTION = "Make the length up to a year, not longer.";
const YES = "Yes, show me programs.";
const BACKGROUND =
  "Buenos Aires. Sixteen years of experience, twelve of them leading teams, and a degree in engineering.";
// A real-looking link with a 44-character unbroken run: Chromium can't break it at a slash or a
// hyphen, so only overflow-wrap keeps it inside a 390 px bubble.
const LONG_LINK =
  "https://docs.google.com/document/d/1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4aB5cD6eF7gH/edit";
const STAGE_2_TAPS = {
  "Your tuition budget": ["$40k to $80k"],
  "How would you pay for it?": ["Installments"],
  "A separate budget for travel and housing": ["$5k to $10k"],
  "How do you feel about traveling for a program?": ["Part of the appeal"],
  "How would you like to study?": ["Blended"],
  "Days a year you could spend on site": ["Up to 20"],
  "The longest stretch you could be away": ["About a week"],
  "Would you relocate for a program?": ["No, I would not"],
  "A typical round trip to the US from home": ["$1,000 to $1,500"],
  "What should a location give you? Pick 2": ["Immersion", "Network density"],
  "Your highest degree": ["Bachelor's"],
  "Your current role": ["Manager"],
};

// Expected progress line states (Your goal · Your needs · Your situation · Verdict).
const [D, C, T] = ["done", "current", "todo"];
const P_GOAL = [C, T, T, T];
const P_NEEDS = [D, C, T, T];
const P_SITUATION = [D, D, C, T];
const P_VERDICT = [D, D, D, C];
const P_DONE = [D, D, D, D];

// Page-side helpers, defined before the app's scripts on every page.
function pageHelpers() {
  const describe = (el) => {
    if (!el || el === document.body) return "body";
    const name = (el.getAttribute("aria-label") || el.textContent || el.id || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
    return `${el.tagName.toLowerCase()} "${name}"`;
  };
  const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
  const sticky = () => {
    for (let e = document.querySelector('ol[aria-label="Progress"]'); e; e = e.parentElement) {
      if (getComputedStyle(e).position === "sticky") return e;
    }
    return null;
  };
  // True when the sticky progress line overlaps the element; null when there is no sticky line.
  const covered = (el) => {
    const bar = sticky();
    if (!bar || !el || el === document.body) return null;
    if (bar.contains(el)) return false;
    const b = bar.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return r.top < b.bottom - 1 && r.bottom > b.top + 1;
  };
  const pending = () => {
    const alert = document.querySelector('[role="alert"]');
    const retry = [...(alert?.querySelectorAll("button") ?? [])].find((b) => text(b) === "Retry");
    const group = [...document.querySelectorAll('div[role="group"]')].at(-1) ?? null;
    const firstChip = group?.querySelector("button") ?? null;
    const card =
      [...document.querySelectorAll("section")].find((s) =>
        [...s.querySelectorAll("button")].some((b) =>
          ["Looks right", "Send changes"].includes(text(b)),
        ),
      ) ?? null;
    const results =
      [...document.querySelectorAll("h2")].find((h) => text(h) === "Programs that fit") ?? null;
    return { retry, group, firstChip, card, results };
  };
  const dlLines = (root) =>
    root
      ? [...root.querySelectorAll("dl > div")].map((d) => [
          text(d.querySelector("dt")),
          text(d.querySelector("dd")),
        ])
      : null;

  window.__uiwalk = {
    describe,
    text,
    snapshot() {
      const de = document.documentElement;
      const overflow = de.scrollWidth - de.clientWidth;
      const exceeds = (e) => e.getBoundingClientRect().right > de.clientWidth + 0.5;
      const wide =
        overflow > 0
          ? [...document.body.querySelectorAll("*")]
              .filter((e) => exceeds(e) && ![...e.children].some(exceeds))
              .slice(0, 3)
              .map(describe)
          : [];
      const ol = document.querySelector('ol[aria-label="Progress"]');
      const progress = ol
        ? [...ol.querySelectorAll(":scope > li")].map((li) =>
            li.getAttribute("aria-current")
              ? "current"
              : /\(done\)/.test(li.textContent)
                ? "done"
                : "todo",
          )
        : null;
      const aside = document.querySelector('aside[aria-label="What Step Up has understood"]');
      const panel = !aside
        ? null
        : aside.getClientRects().length === 0
          ? "hidden"
          : { lines: dlLines(aside), note: text(aside.querySelector(":scope > p")) || null };
      const p = pending();
      const a = document.activeElement;
      const focus =
        p.retry && a === p.retry
          ? "Retry"
          : p.firstChip && a === p.firstChip
            ? "first chip"
            : p.card && a === p.card.querySelector("h2")
              ? "card heading"
              : a === document.getElementById("chat-input")
                ? "input"
                : p.results && a === p.results
                  ? "Programs that fit heading"
                  : describe(a);
      return {
        overflow,
        wide,
        progress,
        panel,
        cardLines: dlLines(p.card),
        cardHeading: text(p.card?.querySelector("h2")) || null,
        question: text(p.group?.querySelector("p")) || null,
        retry: !!p.retry,
        chips: !!p.firstChip && !p.firstChip.disabled,
        card: !!p.card,
        focus,
        focusCovered: covered(a),
        notice: text(document.querySelector('[role="alert"]')) || null,
        status: text(document.querySelector('p[role="status"]')),
        inputDisabled: document.getElementById("chat-input")?.disabled ?? null,
        progressTop: sticky()?.getBoundingClientRect().top ?? null,
      };
    },
    focusInfo() {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      window.__uiwalkIds ??= new WeakMap();
      window.__uiwalkNext ??= 0;
      if (!window.__uiwalkIds.has(el)) window.__uiwalkIds.set(el, ++window.__uiwalkNext);
      const s = getComputedStyle(el);
      const outlined = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
      return {
        key: window.__uiwalkIds.get(el),
        el: describe(el),
        outline: `${s.outlineStyle} ${s.outlineWidth}`,
        ring: outlined || (s.boxShadow !== "none" && s.boxShadow !== ""),
        focusVisible: el.matches(":focus-visible"),
        covered: covered(el),
      };
    },
    youLines() {
      return [...document.querySelectorAll('[role="log"] > ol > li')]
        .map(text)
        .filter((t) => t.startsWith("You:") || t.startsWith("Step Up:"));
    },
    programs() {
      const region = pending().results?.closest("section");
      if (!region) return null;
      const cards = [...region.querySelectorAll("article")];
      const ranked = cards.filter((c) => c.parentElement?.closest("ol, ul")?.tagName === "OL");
      const ranks = ranked
        .map((c) =>
          [...c.querySelectorAll('span[aria-hidden="true"]')].find((s) => /^\d+$/.test(text(s))),
        )
        .map((s) => (s ? text(s) : null));
      // A summary row: a <dl> before the card's "Your limits" heading.
      const limits = (c) => [...c.querySelectorAll("h4")].find((h) => text(h) === "Your limits");
      const summary = cards.map((c) => {
        const dl = c.querySelector("dl");
        const h4 = limits(c);
        if (!dl || !h4 || !(dl.compareDocumentPosition(h4) & Node.DOCUMENT_POSITION_FOLLOWING))
          return null;
        return [...dl.querySelectorAll("dt")].map(text);
      });
      return {
        cards: cards.length,
        ranked: ranked.length,
        also: cards.length - ranked.length,
        names: cards.map((c) => text(c.querySelector("h3"))),
        ranks,
        summary,
        headings: [...region.querySelectorAll("h2, h3:not(article h3)")].map(text),
      };
    },
  };
}

const browser = await chromium.launch();
const result = {
  viewport,
  base,
  startedAt: new Date().toISOString(),
  features: {},
  steps: [],
  axe: [],
  tabPasses: [],
  extra: {},
  screenshots: [],
  rateLimited: 0,
  aborted: null,
};

// /api/chat goes through one route: each request gets its own CF-Connecting-IP, so the 20-a-minute
// limit (server/rateLimit.ts, which trusts that header when nothing sits in front) never stops a
// walk; `net.hold` delays the next request and `net.fail` aborts the next ones (a network error).
const net = { hold: 0, fail: 0 };
const run = Math.floor(Math.random() * 200) + 20;
let pages = 0;
async function newPage() {
  const page = await browser.newPage({ viewport: { width, height } });
  page.setDefaultTimeout(15000);
  await page.addInitScript(pageHelpers);
  const id = ++pages;
  let n = 0;
  await page.route("**/api/chat", async (route) => {
    if (net.fail > 0) {
      net.fail--;
      return route.abort("failed");
    }
    if (net.hold > 0) {
      const ms = net.hold;
      net.hold = 0;
      await new Promise((r) => setTimeout(r, ms));
    }
    n++;
    const headers = { ...route.request().headers(), "cf-connecting-ip": `10.${run}.${id}.${n}` };
    await route.continue({ headers });
  });
  page.on("response", (res) => {
    if (res.url().includes("/api/chat") && res.status() === 429) result.rateLimited++;
  });
  await page.goto(base);
  await page.waitForLoadState("networkidle");
  return page;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const snap = (page) => page.evaluate(() => window.__uiwalk.snapshot());

async function shot(page, name, opts = {}) {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);
  const file = `${viewport}-${name}.png`;
  await page.screenshot({ path: `${out}/${file}`, ...opts });
  result.screenshots.push(file);
}

// One reply: do the action, wait for its /api/chat request to end and the page to settle, then
// record the step. `during` runs while the request is in flight.
async function act(page, label, action, opts = {}) {
  const ended = new Promise((resolve) => {
    const onEnd = (req) => {
      if (!req.url().includes("/api/chat")) return;
      page.off("requestfinished", onEnd);
      page.off("requestfailed", onEnd);
      resolve();
    };
    page.on("requestfinished", onEnd);
    page.on("requestfailed", onEnd);
  });
  await action();
  const during = opts.during ? await opts.during() : undefined;
  await Promise.race([
    ended,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("no /api/chat reply in 20 s")), 20000),
    ),
  ]);
  await page.waitForFunction(() => document.querySelector('p[role="status"]')?.textContent === "");
  await page.waitForTimeout(350);
  const s = await snap(page);
  const expected = s.retry
    ? ["Retry"]
    : opts.results
      ? ["Programs that fit heading", "input"]
      : s.chips
        ? ["first chip"]
        : s.card
          ? ["card heading"]
          : ["input"];
  const step = {
    label,
    forced: !!opts.forced,
    overflow: s.overflow,
    wide: s.wide,
    focus: { actual: s.focus, expected, ok: expected.includes(s.focus), covered: s.focusCovered },
    progress:
      s.progress && opts.progress
        ? { actual: s.progress, expected: opts.progress, ok: same(s.progress, opts.progress) }
        : null,
    panel: s.panel,
    cardLines: s.cardLines,
    question: s.question,
    notice: s.notice,
    during,
  };
  result.steps.push(step);
  return step;
}

async function axe(page, label) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: tags } });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => n.target.join(" ")),
    }));
  }, AXE_TAGS);
  result.axe.push({ label, violations });
}

// Tab from the top of the page through every control, once round.
async function tabPass(page, label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.click(1, 1);
  const stops = [];
  let first = null;
  for (let i = 0; i < 300; i++) {
    await page.keyboard.press("Tab");
    const f = await page.evaluate(() => window.__uiwalk.focusInfo());
    if (!f) {
      if (stops.length) break;
      continue;
    }
    if (f.key === first) break;
    first ??= f.key;
    stops.push(f);
  }
  result.tabPasses.push({ label, stops });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

const tap =
  (page, name, scope = page) =>
  async () => {
    const b = scope.getByRole("button", { name, exact: true });
    await b.waitFor();
    await b.click();
  };
const say = (page, text) => async () => {
  const input = page.getByLabel("Your message");
  await input.fill(text);
  await input.press("Enter");
};

async function walk() {
  const page = await newPage();
  const start = await snap(page);
  result.features = {
    progressLine: start.progress !== null,
    panel: start.panel === null ? "absent" : start.panel === "hidden" ? "hidden" : "shown",
    stickyProgress: start.progressTop !== null,
  };
  if (start.progress) {
    result.steps.push({
      label: "page load",
      overflow: start.overflow,
      wide: start.wide,
      focus: null,
      progress: { actual: start.progress, expected: P_GOAL, ok: same(start.progress, P_GOAL) },
      panel: start.panel,
    });
  }

  // Stage 1.
  await act(page, "opening message", say(page, OPENING), { progress: P_GOAL });
  await act(page, "goal tap", tap(page, "Step up to a bigger leadership role"), {
    progress: P_NEEDS,
  });
  await act(page, "goal in words", say(page, GOAL), { progress: P_NEEDS });
  const asked = await act(page, "question typed during chips", say(page, QUESTION), {
    progress: P_NEEDS,
  });
  const lines = await page.evaluate(() => window.__uiwalk.youLines());
  const at = lines.findLastIndex((l) => l === `You: ${QUESTION}`);
  result.extra.question = {
    answered: at >= 0 && (lines[at + 1] ?? "").startsWith("Step Up:"),
    reply: (lines[at + 1] ?? "").slice(0, 80),
    chipsBack: asked.question?.startsWith("Rank the top 3") ?? false,
  };
  for (const n of ["A senior network", "Leadership skills", "Deep expertise in a field"]) {
    await tap(page, n)();
  }
  await act(
    page,
    "needs: Send 3 of 3",
    async () => {
      await page.getByRole("button", { name: /^Send 3 of 3/ }).click();
    },
    { progress: P_SITUATION },
  );
  await act(page, "peer tap", tap(page, "More senior leaders"), { progress: P_SITUATION });
  await act(page, "length tap", tap(page, "Up to a year"), { progress: P_SITUATION });
  await shot(page, "mid", { fullPage: true });
  await axe(page, "mid-interview (chips)");
  await tabPass(page, "mid-interview (chips)");
  await act(page, "hours tap", tap(page, "5 to 10"), { progress: P_SITUATION });
  await act(page, "keep-working tap", tap(page, "Yes, I keep working"), { progress: P_SITUATION });
  const card = await act(page, "degree tap: the card", tap(page, "Not needed"), {
    progress: P_VERDICT,
  });
  await shot(page, "card");
  await axe(page, "stage 1 card");
  await tabPass(page, "stage 1 card");

  // "Change something", then the same length again, then the card.
  const stage1 = page.getByRole("region", { name: "Here's what I understood" });
  await stage1.getByRole("button", { name: "Change something" }).click();
  await page.getByLabel("What should change?").fill(CORRECTION);
  await act(page, "Change something: Send changes", tap(page, "Send changes"), {
    progress: P_VERDICT,
  });
  const again = await act(page, "length tap again: the card", tap(page, "Up to a year"), {
    progress: P_VERDICT,
  });

  // "Looks right" held 2 s.
  net.hold = 2000;
  const verdict = await act(
    page,
    "Looks right (held 2 s): the verdict",
    tap(page, "Looks right", stage1),
    {
      progress: P_DONE,
      during: async () => {
        await page.waitForTimeout(700);
        const s = await snap(page);
        await shot(page, "sending");
        return {
          status: (await page.locator('p[role="status"]').textContent())?.trim(),
          inputDisabled: s.inputDisabled,
          progress: s.progress,
          progressTop: s.progressTop,
          panel: s.panel,
        };
      },
    },
  );
  await page.getByRole("region", { name: "Your verdict" }).waitFor();
  await page.evaluate(() => {
    const h = [...document.querySelectorAll("h2")].find(
      (e) => e.textContent.trim() === "Your verdict",
    );
    h?.scrollIntoView({ block: "start" });
  });
  await shot(page, "verdict");
  await page.locator("summary", { hasText: "How each type compares" }).click();
  await axe(page, "verdict (How each type compares open)");

  // Stage 2: the yes fails once (network error), then Retry.
  net.fail = 1;
  const failed = await act(page, "yes to programs (request fails)", say(page, YES), {
    progress: P_DONE,
  });
  await act(page, "Retry", tap(page, "Retry"), { progress: P_DONE });
  await act(page, "background in words", say(page, BACKGROUND), { progress: P_DONE });
  const search = page.getByRole("region", { name: "Here's what I'll search with" });
  for (let i = 0; i < 20 && !(await search.count()); i++) {
    const group = page.locator('div[role="group"]').last();
    const q = ((await group.locator("p").first().textContent()) ?? "")
      .replace(/ \(pick.*$/, "")
      .trim();
    const taps = STAGE_2_TAPS[q];
    if (!taps) throw new Error(`no stage 2 tap for "${q}"`);
    if (taps.length === 1) {
      await act(page, `stage 2: ${q}`, tap(page, taps[0], group), { progress: P_DONE });
    } else {
      for (const t of taps) await tap(page, t, group)();
      await act(
        page,
        `stage 2: ${q}`,
        async () => {
          await group.getByRole("button", { name: /^Send/ }).click();
        },
        { progress: P_DONE },
      );
    }
  }
  const searchStep = result.steps.at(-1);
  await shot(page, "search");
  await axe(page, "search card");
  await act(page, "search card Looks right: the programs", tap(page, "Looks right", search), {
    progress: P_DONE,
    results: true,
  });
  await page.evaluate(() => {
    const h = [...document.querySelectorAll("h2")].find(
      (e) => e.textContent.trim() === "Programs that fit",
    );
    h?.scrollIntoView({ block: "start" });
  });
  await shot(page, "programs");
  const sources = page.locator("summary", { hasText: /^\s*Sources \(\d+\)/ }).first();
  if (await sources.count()) await sources.click();
  await axe(page, "program cards (first Sources open)");
  await tabPass(page, "program cards");
  await shot(page, "full", { fullPage: true });

  result.extra.you = await page.evaluate(() =>
    window.__uiwalk.youLines().filter((l) => l.startsWith("You:")),
  );
  result.extra.programs = await page.evaluate(() => window.__uiwalk.programs());
  result.extra.card = card;
  result.extra.again = again;
  result.extra.verdict = verdict;
  result.extra.failed = failed;
  result.extra.search = searchStep;
  await page.close();
}

// A long unbroken link typed as the answer to the first chips.
async function longLink() {
  const page = await newPage();
  await act(page, "long link: opening", say(page, OPENING), { forced: true });
  await act(page, "long link typed during chips", say(page, LONG_LINK), { forced: true });
  const m = await page.evaluate((link) => {
    const de = document.documentElement;
    const li = [...document.querySelectorAll('[role="log"] > ol > li')].find((l) =>
      l.textContent.includes(link.slice(-30)),
    );
    const bubble = li?.querySelector("div, p");
    const r = bubble?.getBoundingClientRect();
    return {
      overflow: de.scrollWidth - de.clientWidth,
      found: !!bubble,
      bubbleRight: r ? Math.round(r.right) : null,
      clientWidth: de.clientWidth,
      bubbleOverflow: bubble ? bubble.scrollWidth - bubble.clientWidth : null,
    };
  }, LONG_LINK);
  await shot(page, "long-link");
  result.extra.longLink = m;
  await page.close();
}

try {
  await walk();
} catch (e) {
  result.aborted = {
    step: result.steps.at(-1)?.label ?? "start",
    error: String(e.message ?? e).split("\n")[0],
  };
}
try {
  await longLink();
} catch (e) {
  result.extra.longLink = { error: String(e.message ?? e).split("\n")[0] };
}
await browser.close();

try {
  result.checks = checks(result);
} catch (e) {
  // A bug in the checks still leaves a result, so the summary shows a failure, not a gap.
  result.checks = [
    {
      name: "Walk: persona A, both stages",
      status: "fail",
      detail: `checks crashed: ${e.message}`,
      failures: [],
    },
  ];
}
writeFileSync(`${out}/result-${viewport}.json`, JSON.stringify(result, null, 1));
const failing = result.checks.filter((c) => c.status === "fail").length;
process.stdout.write(`walked ${viewport}: ${failing} failing checks\n`);

// pass / fail / n/a for each check, with the numbers behind it.
function checks(r) {
  const list = [];
  const add = (name, status, detail, failures = []) =>
    list.push({ name, status, detail, failures });
  // The long-link page is its own check, not part of the walk.
  const steps = r.steps.filter((s) => !s.forced);
  const replies = steps.filter((s) => s.focus);

  add(
    "Walk: persona A, both stages",
    r.aborted ? "fail" : "pass",
    r.aborted
      ? `stopped after "${r.aborted.step}": ${r.aborted.error}`
      : `${replies.length} replies`,
  );

  const rules = new Map();
  for (const run of r.axe) {
    for (const v of run.violations) {
      const rule = rules.get(v.id) ?? {
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: new Set(),
        screens: [],
      };
      v.nodes.forEach((n) => rule.nodes.add(n));
      rule.screens.push(run.label);
      rules.set(v.id, rule);
    }
  }
  add(
    "axe-core: WCAG 2.0/2.1 A and AA, 2.2 AA",
    r.axe.length === 0 ? "fail" : rules.size ? "fail" : "pass",
    r.axe.length === 0
      ? "not run"
      : rules.size
        ? `${rules.size} rules, ${[...rules.values()].reduce((n, x) => n + x.nodes.size, 0)} nodes, on ${r.axe.length} screens`
        : `0 violations on ${r.axe.length} screens`,
    [...rules.values()].map(
      (x) =>
        `${x.id} (${x.impact}): ${x.nodes.size} nodes, on ${[...new Set(x.screens)].join("; ")}: ${[...x.nodes].slice(0, 4).join(" | ")}`,
    ),
  );

  const wide = steps.filter((s) => s.overflow > 0);
  add(
    "Horizontal scroll at every step",
    wide.length ? "fail" : "pass",
    wide.length
      ? `${wide.length} of ${steps.length} steps scroll`
      : `0 px at all ${steps.length} steps`,
    wide.map((s) => `${s.label}: ${s.overflow} px (${s.wide.join(", ")})`),
  );

  const missed = replies.filter((s) => !s.focus.ok);
  add(
    "Focus after each reply",
    missed.length ? "fail" : "pass",
    `${replies.length - missed.length} of ${replies.length} on the first chip, card heading, Retry, input or programs heading`,
    missed.map(
      (s) => `${s.label}: on ${s.focus.actual}, expected ${s.focus.expected.join(" or ")}`,
    ),
  );
  const programsFocus = replies.find((s) => s.label.startsWith("search card Looks right"));
  if (programsFocus) list.at(-1).detail += `; after the programs: ${programsFocus.focus.actual}`;

  const stops = r.tabPasses.flatMap((p) => p.stops.map((s) => ({ ...s, pass: p.label })));
  const noRing = stops.filter((s) => !s.ring || !s.focusVisible);
  add(
    "Keyboard: Tab focus ring on every control",
    stops.length === 0 ? "fail" : noRing.length ? "fail" : "pass",
    `${stops.length - noRing.length} of ${stops.length} stops outlined, over ${r.tabPasses.length} Tab passes (${r.tabPasses.map((p) => `${p.label}: ${p.stops.length}`).join("; ")})`,
    noRing.map((s) => `${s.pass}: ${s.el}: outline ${s.outline}, :focus-visible ${s.focusVisible}`),
  );

  if (!r.features.stickyProgress) {
    add("Focus clear of the sticky progress line", "n/a", "no sticky progress line on this page");
  } else {
    const under = [
      ...replies.filter((s) => s.focus.covered).map((s) => `${s.label}: ${s.focus.actual}`),
      ...stops.filter((s) => s.covered).map((s) => `${s.pass} (Tab): ${s.el}`),
    ];
    add(
      "Focus clear of the sticky progress line",
      under.length ? "fail" : "pass",
      `${under.length} covered, of ${replies.length} replies and ${stops.length} Tab stops`,
      under,
    );
  }

  if (!r.features.progressLine) {
    add("Progress line states", "n/a", "no progress line on this page");
  } else {
    const checked = steps.filter((s) => s.progress);
    const wrong = checked.filter((s) => !s.progress.ok);
    add(
      'Progress line states (aria-current, "(done)")',
      wrong.length ? "fail" : "pass",
      `${checked.length - wrong.length} of ${checked.length} steps as expected`,
      wrong.map(
        (s) =>
          `${s.label}: ${s.progress.actual.join(",")}, expected ${s.progress.expected.join(",")}`,
      ),
    );
  }

  if (r.features.panel !== "shown") {
    add(
      '"What I\'ve understood" panel',
      "n/a",
      r.features.panel === "absent" ? "no panel on this page" : `panel hidden at ${r.viewport}`,
    );
  } else {
    const bad = [];
    const notYet = (p) =>
      p && p !== "hidden" ? p.lines.filter(([, v]) => v === "Not yet").length : null;
    const before = [];
    for (const s of steps) {
      if (s.label.startsWith("degree tap")) break;
      if (s.panel && s.panel !== "hidden") before.push([s.label, notYet(s.panel)]);
    }
    for (let i = 1; i < before.length; i++) {
      if (before[i][1] > before[i - 1][1])
        bad.push(`${before[i][0]}: "Not yet" went up to ${before[i][1]}`);
    }
    const c = r.extra.card;
    if (c) {
      if (!same(c.panel?.lines, c.cardLines))
        bad.push("at the card: panel lines differ from the card's");
      if (notYet(c.panel)) bad.push(`at the card: ${notYet(c.panel)} lines still "Not yet"`);
    }
    const change = steps.find((s) => s.label.startsWith("Change something"));
    if (change && !change.panel?.note?.includes(CORRECTION)) {
      bad.push(`after Change something: note is ${JSON.stringify(change.panel?.note)}`);
    }
    const v = r.extra.verdict;
    if (
      v?.during &&
      (!same(v.during.panel?.lines, r.extra.again?.cardLines) || v.during.panel?.note)
    ) {
      bad.push("while Looks right is sending: panel isn't the card's lines without a note");
    }
    if (v && !same(v.panel?.lines, r.extra.again?.cardLines))
      bad.push("at the verdict: panel lines differ from the card's");
    const sc = r.extra.search;
    if (sc && v && !same(sc.panel?.lines, v.panel?.lines))
      bad.push("at the search card: panel changed in stage 2");
    add(
      '"What I\'ve understood" panel',
      bad.length ? "fail" : "pass",
      bad.length
        ? `${bad.length} problems`
        : `"Not yet" ${before.map(([, n]) => n).join("→")}; matches the card; note after Change something; unchanged in stage 2`,
      bad,
    );
  }

  const q = r.extra.question;
  add(
    "Question typed during chips",
    q?.answered && q?.chipsBack ? "pass" : "fail",
    q
      ? `reply: ${q.answered ? "yes" : "no"}; same chips back: ${q.chipsBack ? "yes" : "no"}`
      : "not reached",
  );

  const change = r.steps.find((s) => s.label.startsWith("Change something"));
  const youText = (r.extra.you ?? []).join("\n");
  const changeOk =
    change?.question?.startsWith("The longest program") &&
    r.extra.again?.cardLines &&
    youText.includes(CORRECTION);
  add(
    "Change something",
    changeOk ? "pass" : "fail",
    change
      ? `length asked again: ${change.question?.startsWith("The longest program") ? "yes" : "no"}; card again: ${r.extra.again?.cardLines ? "yes" : "no"}; correction in the chat: ${youText.includes(CORRECTION) ? "yes" : "no"}`
      : "not reached",
  );

  const d = r.extra.verdict?.during;
  const heldOk =
    d &&
    d.status === "Step Up is thinking…" &&
    d.inputDisabled === true &&
    (d.progressTop === null || Math.abs(d.progressTop) < 1);
  add(
    "Held reply: Looks right sending 2 s",
    heldOk ? "pass" : "fail",
    d
      ? `status "${d.status}"; input disabled: ${d.inputDisabled}; progress line top: ${d.progressTop === null ? "n/a" : `${Math.round(d.progressTop)} px`}${d.progress ? `; progress ${d.progress.join(",")}` : ""}`
      : "not reached",
  );

  const f = r.extra.failed;
  const yesCount = (r.extra.you ?? []).filter((l) => l === `You: ${YES}`).length;
  const failOk = f && f.notice && f.focus.actual === "Retry" && yesCount === 1 && !r.aborted;
  add(
    "Failed request: Retry",
    failOk ? "pass" : "fail",
    f
      ? `notice: "${(f.notice ?? "").slice(0, 60)}"; focus on ${f.focus.actual}; the yes shows ${yesCount === 1 ? "once" : `${yesCount} times`} after Retry`
      : "not reached",
  );

  const l = r.extra.longLink;
  const linkOk =
    l &&
    !l.error &&
    l.found &&
    l.overflow === 0 &&
    l.bubbleRight <= l.clientWidth &&
    l.bubbleOverflow <= 1;
  add(
    "Long unbroken link typed (forced)",
    linkOk ? "pass" : "fail",
    !l
      ? "not run"
      : l.error
        ? l.error
        : `page scroll ${l.overflow} px; bubble right edge ${l.bubbleRight} of ${l.clientWidth} px; text past the bubble ${l.bubbleOverflow} px`,
  );

  const you = r.extra.you ?? [];
  const typed = [OPENING, GOAL, QUESTION, CORRECTION, YES, BACKGROUND];
  const absent = typed.filter((t) => !you.some((y) => y.includes(t)));
  add(
    'Chat "You:" lines',
    you.length && !absent.length ? "pass" : "fail",
    `${you.length} lines; typed answers missing: ${absent.length ? absent.join(" | ") : "none"}`,
  );

  const p = r.extra.programs;
  const ranks = p?.ranks ?? [];
  const summaryRows = (p?.summary ?? []).filter(Boolean);
  add(
    "Program cards",
    p && p.cards > 0 ? "pass" : "fail",
    p
      ? `${plural(p.cards, "card")} (${p.ranked} ranked, ${p.also} also worth a look); rank numbers: ${ranks.some(Boolean) ? ranks.join(",") : "n/a"}; summary row: ${summaryRows.length ? `${plural(summaryRows.length, "card")} (${summaryRows[0].join(", ")})` : "n/a"}`
      : "not reached",
  );

  add(
    "Rate limit (429 replies)",
    r.rateLimited ? "fail" : "pass",
    r.rateLimited
      ? `${r.rateLimited} requests refused: results after the first are unreliable`
      : "none",
  );
  return list;
}
