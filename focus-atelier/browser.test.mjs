// Start a static server, then set PLAYWRIGHT_MODULE to an installed Playwright module.
// No production dependency or browser-testing configuration is added to the site.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.FOCUS_URL || "http://127.0.0.1:8873/focus-atelier/";
let browser;
before(async () => {
  browser = await chromium.launch({
    headless: true,
    channel: process.env.BROWSER_CHANNEL || "chrome",
  });
});
after(async () => {
  await browser?.close();
});
async function fixture(t, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
    reducedMotion: "reduce",
    ...options,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install({ time: new Date("2026-11-05T06:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-05T06:00:01Z"));
  await page.goto(base);
  t.after(async () => {
    assert.deepEqual(errors, []);
    await context.close();
  });
  return page;
}
async function practice(page, game) {
  await page.locator(`[data-practice=${game}]`).click();
  await page.locator("#begin-round").click();
}
async function response(page, symbol, label) {
  assert.match(await page.locator("#response-feedback").textContent(), label);
  assert.equal(
    await page.locator("#response-feedback use").getAttribute("href"),
    `./assets/icons.svg#${symbol}`,
  );
}
async function saved(page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("focus-atelier-v1") || "{}"),
  );
}

test("responsive home, palettes and duration preferences survive reload", async (t) => {
  const p = await fixture(t);
  assert.equal(await p.title(), "一隅 · 专注小画室");
  for (const width of [320, 390, 768, 1440]) {
    await p.setViewportSize({ width, height: 900 });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    );
  }
  for (const palette of ["paper", "earth", "sea"]) {
    await p.locator(`button[data-palette=${palette}]`).click();
    await p.locator("#palette-art").evaluate((img) => img.decode());
    assert.match(
      await p.locator("#palette-art").getAttribute("src"),
      new RegExp(`atelier-${palette}\\.webp$`),
    );
    assert.ok(
      await p.locator("#palette-art").evaluate((img) => img.naturalWidth > 0),
    );
  }
  await p.locator('[data-minutes="5"]').click();
  await p.reload();
  assert.equal(await p.locator("html").getAttribute("data-palette"), "sea");
  assert.equal(
    await p.locator('[data-minutes="5"]').getAttribute("aria-pressed"),
    "true",
  );
});
test("Schulte enforces order, reshuffles, excludes pause time and saves only a completed trial", async (t) => {
  const p = await fixture(t, { viewport: { width: 390, height: 844 } });
  await practice(p, "schulte");
  await p.locator('[data-number="2"]').click();
  assert.equal(await p.locator("#next-number").textContent(), "1");
  assert.match(await p.locator("#round-score").textContent(), /误按 1/);
  const initial = await p.locator(".number-cell").allTextContents();
  for (let i = 1; i <= 25; i++) await p.locator(`[data-number="${i}"]`).click();
  await p.clock.runFor(500);
  assert.equal(await p.locator("#next-number").textContent(), "1");
  assert.notDeepEqual(
    await p.locator(".number-cell").allTextContents(),
    initial,
  );
  await p.locator("#pause-session").click();
  const timer = await p.locator("#round-timer").textContent();
  await p.clock.runFor(120000);
  assert.equal(await p.locator("#round-timer").textContent(), timer);
  await p.locator("#resume-session").click();
  await p.clock.runFor(60000);
  assert.match(await p.locator(".summary h1").textContent(), /初次相识/);
  assert.match(await p.locator(".result-card strong").textContent(), /1/);
  const s = await saved(p);
  assert.equal(s.history.length, 1);
  assert.equal(s.history[0].daily, false);
  assert.equal(s.history[0].seconds, 60);
});
test("Stroop answers use ink colour and timeouts count as omissions", async (t) => {
  const p = await fixture(t);
  await practice(p, "stroop");
  const color = await p.locator("#stimulus").evaluate((el) => el.style.color);
  const colors = [
    "rgb(177, 60, 49)",
    "rgb(36, 79, 176)",
    "rgb(54, 115, 68)",
    "rgb(137, 96, 0)",
  ];
  const answer = colors.indexOf(color);
  assert.ok(answer >= 0);
  await p.keyboard.press(String(answer + 1));
  assert.match(await p.locator("#round-score").textContent(), /正确 1/);
  await p.clock.runFor(5000);
  assert.match(await p.locator("#round-score").textContent(), /漏答 1/);
  await p.clock.runFor(56000);
  assert.equal((await saved(p)).history.length, 1);
});
test("direction alternative accepts keyboard arrows and has no colour requirement", async (t) => {
  const p = await fixture(t);
  await p.locator("[data-practice=stroop]").click();
  await p.locator("#toggle-direction").click();
  await p.locator("#begin-round").click();
  const arrows = await p.locator("#stimulus").textContent();
  assert.equal(arrows.length, 5);
  await p.keyboard.press(arrows[2] === "←" ? "ArrowLeft" : "ArrowRight");
  assert.match(await p.locator("#round-score").textContent(), /正确 1/);
  assert.equal(await p.locator("[data-answer]").count(), 2);
});
test("shape task distinguishes no response, false alarms and repeated input", async (t) => {
  const p = await fixture(t);
  await practice(p, "gonogo");
  let sawCircle = false,
    sawSquare = false;
  for (let i = 0; i < 12; i++) {
    const square = (
      await p.locator("#target-symbol").getAttribute("class")
    ).includes("nogo");
    if (square && !sawSquare) {
      await p.keyboard.press("Space");
      await p.keyboard.press("Space");
      sawSquare = true;
    }
    if (!square && !sawCircle) {
      await p.keyboard.press("Space");
      await p.keyboard.press("Space");
      sawCircle = true;
    }
    await p.clock.runFor(1500);
  }
  assert.ok(sawCircle && sawSquare);
  const score = await p.locator("#round-score").textContent();
  assert.match(score, /命中 1/);
  assert.match(score, /误按 1/);
  assert.match(score, /漏按 [1-9]/);
});
test("full five-minute daily flow includes two rests, explicit continuation and one completion record", async (t) => {
  const p = await fixture(t);
  await p.locator('[data-minutes="5"]').click();
  await p.locator("#start-daily").click();
  for (let i = 0; i < 3; i++) {
    await p.locator("#begin-round").click();
    await p.clock.runFor(90100);
    if (i < 2) {
      assert.equal(await p.locator(".break-stage").count(), 1);
      assert.equal(await p.locator("#continue-session").isVisible(), false);
      await p.clock.runFor(15000);
      await p.locator("#continue-session").click();
    }
  }
  assert.equal(await p.locator(".result-card").count(), 3);
  const s = await saved(p);
  assert.equal(s.history.length, 1);
  assert.equal(s.history[0].daily, true);
  assert.equal(s.history[0].seconds, 300);
  await p.locator("#back-home").click();
  assert.match(await p.locator("#today-label").textContent(), /已完成/);
  await p.reload();
  await p.locator("[data-dialog=history-dialog]").click();
  assert.match(
    await p.locator("#history-content").textContent(),
    /每日练习 · 5 分钟/,
  );
});
test("hidden page pauses; leaving does not falsely record completion", async (t) => {
  const p = await fixture(t);
  await practice(p, "schulte");
  await p.clock.runFor(1000);
  await p.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(await p.locator("#resume-session").count(), 1);
  await p.clock.runFor(70000);
  assert.equal(await p.locator(".summary").count(), 0);
  await p.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await p.locator("#resume-session").click();
  await p.locator("#leave-session").click();
  await p.locator("#confirm-leave").click();
  assert.equal((await saved(p)).history?.length || 0, 0);
  assert.equal(await p.locator("#home-view").isVisible(), true);
});
test("calendar download contains repeat rule, chosen wall time and explicit activation instructions", async (t) => {
  const p = await fixture(t);
  await p.locator("[data-dialog=reminder-dialog]").first().click();
  await p.locator("#reminder-time").fill("18:30");
  const downloading = p.waitForEvent("download");
  await p.locator("#download-calendar").click();
  const file = await downloading;
  const ics = await readFile(await file.path(), "utf8");
  assert.match(ics, /DTSTART:\d{8}T183000/);
  assert.match(ics, /RRULE:FREQ=DAILY/);
  assert.match(ics, /BEGIN:VALARM/);
  assert.match(ics, /DURATION:PT7M/);
  assert.match(
    await p.locator("#reminder-status").textContent(),
    /提醒尚未生效/,
  );
});
test("denied browser notifications and unavailable storage leave the game usable", async (t) => {
  const p = await fixture(t);
  await p.evaluate(() => {
    Object.defineProperty(Notification, "requestPermission", {
      value: async () => "denied",
      configurable: true,
    });
  });
  await p.locator("[data-dialog=reminder-dialog]").first().click();
  await p.locator("#browser-reminder").click();
  assert.equal(await p.locator("#browser-reminder").isChecked(), false);
  assert.match(await p.locator("#reminder-status").textContent(), /未允许/);
  await p.locator("#reminder-dialog .close-dialog").click();
  await p.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw Error("blocked");
    };
  });
  await p.reload();
  assert.equal(await p.locator("#storage-warning").isVisible(), true);
  await practice(p, "schulte");
  assert.equal(await p.locator(".number-cell").count(), 25);
});

test("system suspension does not consume practice time", async (t) => {
  const p = await fixture(t);
  await practice(p, "schulte");
  await p.clock.runFor(1000);
  const before = await p.locator("#round-timer").textContent();
  await p.clock.fastForward(120000);
  assert.equal(await p.locator("#resume-session").count(), 1);
  await p.locator("#resume-session").click();
  await p.clock.runFor(100);
  assert.equal(await p.locator("#round-timer").textContent(), before);
  assert.equal(await p.locator(".summary").count(), 0);
});
test("six-by-six remains visible and tappable on a narrow phone", async (t) => {
  const p = await fixture(t, { viewport: { width: 320, height: 760 } });
  await p.locator("[data-dialog=settings-dialog]").click();
  await p.locator("#difficulty").selectOption("bold");
  await p.locator("#save-settings").click();
  await practice(p, "schulte");
  assert.equal(await p.locator(".number-cell").count(), 36);
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  const box = await p.locator(".number-cell").first().boundingBox();
  assert.ok(
    box.width >= 44 && box.height >= 44,
    `${box.width} × ${box.height}`,
  );
});

test("repeated colour prompts acknowledge each answer and visibly start a new question", async (t) => {
  const p = await fixture(t, { viewport: { width: 390, height: 844 } });
  p.setDefaultTimeout(3000);
  await p.evaluate(() => {
    Math.random = () => 0;
  });
  await practice(p, "stroop");
  const first = await p.locator("#stimulus").textContent();
  await p.locator('[data-answer="0"]').click();
  await response(p, "check", /正确/);
  assert.equal(
    await p.locator('[data-answer="0"]').getAttribute("data-response"),
    "correct",
  );
  await p.keyboard.press("1");
  assert.match(await p.locator("#round-score").textContent(), /正确 1/);
  await p.clock.runFor(400);
  assert.equal(await p.locator("#stimulus").textContent(), first);
  assert.equal(await p.locator("#trial-count").textContent(), "第 2 题");
  assert.equal(await p.locator("#trial-state").textContent(), "请选择");
  assert.equal(
    await p.locator('[data-answer="0"]').getAttribute("data-response"),
    null,
  );
  await p.locator('[data-answer="1"]').click();
  await response(p, "close", /应选.*红/);
  assert.equal(
    await p.locator('[data-answer="1"]').getAttribute("data-response"),
    "wrong",
  );
  assert.equal(
    await p.locator('[data-answer="0"]').getAttribute("data-response"),
    "solution",
  );
  await p.clock.runFor(200);
  await p.clock.runFor(4000);
  await response(p, "clock", /超时.*红/);
});

test("shape and button taps share one response, with local hit and false-alarm feedback", async (t) => {
  const p = await fixture(t, {
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  p.setDefaultTimeout(3000);
  await p.evaluate(() => {
    Math.random = () => 0.5;
  });
  await practice(p, "gonogo");
  // Synthetic sequence: circle, circle, square, circle, circle, circle, square.
  await p.locator("#target-symbol").tap();
  assert.match(await p.locator("#round-score").textContent(), /命中 1/);
  await response(p, "check", /点中/);
  assert.equal(await p.locator("#shape-response").isDisabled(), true);
  assert.equal(await p.locator("#tap-shape").isDisabled(), true);
  await p.keyboard.press("Space");
  assert.match(await p.locator("#round-score").textContent(), /命中 1/);
  await p.clock.runFor(1500);
  await p.locator("#tap-shape").tap();
  assert.match(await p.locator("#round-score").textContent(), /命中 2/);
  assert.equal(
    await p.locator("#shape-response").getAttribute("data-response"),
    "correct",
  );
  await p.clock.runFor(1500);
  assert.match(await p.locator("#target-symbol").getAttribute("class"), /nogo/);
  await p.locator("#target-symbol").tap();
  await response(p, "close", /停手/);
  assert.match(await p.locator("#round-score").textContent(), /误按 1/);
  await p.clock.runFor(7200);
  await response(p, "check", /停住/);
});

test("shape feedback survives reduced motion and new targets cannot be answered while paused", async (t) => {
  const p = await fixture(t);
  p.setDefaultTimeout(3000);
  await p.evaluate(() => {
    Math.random = () => 0.5;
  });
  await practice(p, "gonogo");
  await p.locator("#shape-response").focus();
  await p.keyboard.press("Enter");
  await response(p, "check", /点中/);
  assert.equal(
    await p
      .locator("#target-symbol")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await p.clock.runFor(1500);
  await p.locator("#pause-session").click();
  const score = await p.locator("#round-score").textContent();
  // Space on the focused resume button is a valid native button activation.
  // Test game inputs separately while the pause cover is still present.
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press("Space");
  await p.locator("#shape-response").dispatchEvent("click");
  await p.clock.runFor(3000);
  assert.equal(await p.locator("#round-score").textContent(), score);
  await p.locator("#resume-session").click();
  await p.clock.runFor(1200);
  assert.match(await p.locator("#response-feedback").textContent(), /漏按/);
});

test("word handoff overlaps different inks and settles without a blank stage", async (t) => {
  const p = await fixture(t, { reducedMotion: "no-preference" });
  await p.addStyleTag({
    content: ".stimulus-content { animation-play-state: paused !important; }",
  });
  await p.evaluate(() => {
    const draws = [0.25, 0, 0.75, 0]; // Blue blue, then yellow yellow.
    Math.random = () => draws.shift() ?? 0;
  });
  await practice(p, "stroop");
  await p.keyboard.press("2");
  assert.equal(await p.locator(".is-outgoing").textContent(), "蓝");
  assert.equal(await p.locator(".is-incoming").textContent(), "黄");
  const midpoint = await p.locator(".stimulus-content").evaluateAll((nodes) =>
    nodes.map((node) => {
      const animation = node.getAnimations()[0];
      animation.currentTime = 100;
      const style = getComputedStyle(node);
      return {
        ink: style.color,
        opacity: Number(style.opacity),
        x: new DOMMatrix(style.transform).m41,
      };
    }),
  );
  assert.equal(midpoint[0].ink, "rgb(36, 79, 176)");
  assert.equal(midpoint[1].ink, "rgb(137, 96, 0)");
  assert.ok(midpoint.every((layer) => layer.opacity > 0 && layer.opacity < 1));
  assert.ok(midpoint[0].x < 0 && midpoint[1].x > 0);
  await p.keyboard.press("2");
  assert.match(
    await p.locator("#round-score").textContent(),
    /正确 1 · 错误 0/,
  );
  await p.clock.runFor(200);
  assert.equal(await p.locator(".stimulus-content").count(), 1);
  assert.equal(await p.locator("#stimulus").textContent(), "黄");
  assert.equal(await p.locator("#trial-count").textContent(), "第 2 题");
  assert.equal(await p.locator('[data-answer="3"]').isEnabled(), true);
  await p.keyboard.press("4");
  assert.match(
    await p.locator("#round-score").textContent(),
    /正确 2 · 错误 0/,
  );
});

test("pausing mid-handoff freezes progress and leaving discards the pending question", async (t) => {
  const p = await fixture(t, { reducedMotion: "no-preference" });
  await p.evaluate(() => {
    Math.random = () => 0;
  });
  await practice(p, "stroop");
  await p.keyboard.press("1");
  await p.keyboard.press("p");
  assert.equal(
    await p
      .locator(".is-incoming")
      .evaluate((el) => getComputedStyle(el).animationPlayState),
    "paused",
  );
  const timer = await p.locator("#round-timer").textContent();
  await p.clock.runFor(5000);
  assert.equal(await p.locator("#round-timer").textContent(), timer);
  assert.equal(await p.locator("#trial-count").textContent(), "第 1 题");
  await p.locator("#resume-session").click();
  await p.clock.runFor(200);
  assert.equal(await p.locator("#trial-count").textContent(), "第 2 题");
  await p.keyboard.press("1");
  await p.locator("#leave-session").click();
  await p.locator("#confirm-leave").click();
  await practice(p, "stroop");
  await p.clock.runFor(300);
  assert.equal(await p.locator("#trial-count").textContent(), "第 1 题");
  assert.match(
    await p.locator("#round-score").textContent(),
    /正确 0 · 错误 0 · 漏答 0/,
  );
});

test("reduced motion shows one clear ink and gives the next question its full response window", async (t) => {
  const p = await fixture(t);
  await p.evaluate(() => {
    Math.random = () => 0;
  });
  await practice(p, "stroop");
  await p.keyboard.press("1");
  assert.equal(
    await p
      .locator(".is-outgoing")
      .evaluate((el) => getComputedStyle(el).opacity),
    "0",
  );
  const incoming = await p.locator(".is-incoming").evaluate((el) => {
    const s = getComputedStyle(el);
    return [s.opacity, s.transform, s.animationName];
  });
  assert.deepEqual(incoming, ["1", "none", "none"]);
  await p.clock.runFor(100);
  await p.keyboard.press("1");
  assert.match(await p.locator("#round-score").textContent(), /正确 1/);
  await p.clock.runFor(100);
  await p.clock.runFor(3900);
  assert.match(await p.locator("#round-score").textContent(), /漏答 0/);
  await p.clock.runFor(100);
  assert.match(await p.locator("#round-score").textContent(), /漏答 1/);
});

test("game text cannot be selected by repeated clicks while home copy remains selectable", async (t) => {
  const p = await fixture(t);
  for (const game of ["schulte", "stroop", "gonogo"]) {
    await practice(p, game);
    await p.locator(".game-heading h1").dblclick();
    assert.equal(await p.evaluate(() => getSelection().toString()), "");
    assert.equal(
      await p
        .locator(".game-canvas")
        .evaluate((el) => getComputedStyle(el).userSelect),
      "none",
    );
    await p.locator("#leave-session").click();
    await p.locator("#confirm-leave").click();
  }
  assert.notEqual(
    await p
      .locator(".hero-description")
      .evaluate((el) => getComputedStyle(el).userSelect),
    "none",
  );
});

test("shape handoff crossfades repeated and different shapes without a blank or duplicate score", async (t) => {
  const p = await fixture(t, { reducedMotion: "no-preference" });
  await p.addStyleTag({
    content: ".shape-layer { animation-play-state: paused !important; }",
  });
  await p.evaluate(() => {
    Math.random = () => 0.5;
  });
  await practice(p, "gonogo");
  for (const [index, nextLabel] of ["圆形", "方形"].entries()) {
    await p.keyboard.press("Space");
    await p.clock.runFor(1200);
    assert.equal(
      await p
        .locator("#target-symbol")
        .evaluate((el) => getComputedStyle(el).visibility),
      "visible",
    );
    assert.equal(await p.locator(".shape-layer").count(), 2);
    assert.equal(
      await p
        .locator(".shape-incoming .target-symbol")
        .getAttribute("aria-label"),
      nextLabel,
    );
    const layers = await p.locator(".shape-layer").evaluateAll((nodes) =>
      nodes.map((node) => {
        node.getAnimations()[0].currentTime = 125;
        return Number(getComputedStyle(node).opacity);
      }),
    );
    assert.ok(layers.every((opacity) => opacity > 0 && opacity < 1));
    assert.ok(Math.abs(layers[0] + layers[1] - 1) < 0.02);
    assert.equal(
      await p
        .locator(".shape-incoming .target-symbol")
        .evaluate((el) => getComputedStyle(el).outlineStyle),
      "none",
    );
    assert.equal(await p.locator("#shape-response").isDisabled(), true);
    await p.keyboard.press("Space");
    await p.locator("#shape-response").dispatchEvent("click");
    assert.match(
      await p.locator("#round-score").textContent(),
      new RegExp(`命中 ${index + 1} · 漏按 0 · 误按 0`),
    );
    await p.clock.runFor(300);
    assert.equal(await p.locator(".shape-layer").count(), 1);
    assert.equal(
      await p.locator("#target-symbol").getAttribute("aria-label"),
      nextLabel,
    );
    assert.equal(await p.locator("#shape-response").isEnabled(), true);
  }
});

test("reduced-motion shape handoff retains the old target until the next trial is ready", async (t) => {
  const p = await fixture(t);
  await p.evaluate(() => {
    Math.random = () => 0.5;
  });
  await practice(p, "gonogo");
  await p.clock.runFor(1500); // Second circle, followed by a square.
  await p.keyboard.press("Space");
  await p.clock.runFor(1200);
  assert.equal(
    await p
      .locator("#target-symbol")
      .evaluate((el) => getComputedStyle(el).visibility),
    "visible",
  );
  const layers = await p.locator(".shape-layer").evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = getComputedStyle(node);
      return { opacity: style.opacity, animation: style.animationName };
    }),
  );
  assert.deepEqual(layers, [
    { opacity: "1", animation: "none" },
    { opacity: "0", animation: "none" },
  ]);
  assert.equal(
    await p.locator("#target-symbol").getAttribute("aria-label"),
    "圆形",
  );
  await p.clock.runFor(300);
  assert.equal(
    await p.locator("#target-symbol").getAttribute("aria-label"),
    "方形",
  );
  assert.equal(await p.locator(".shape-layer").count(), 1);
});

test("pausing a shape handoff freezes both layers and preserves the pending trial", async (t) => {
  const p = await fixture(t, { reducedMotion: "no-preference" });
  await p.evaluate(() => {
    Math.random = () => 0.5;
  });
  await practice(p, "gonogo");
  await p.keyboard.press("Space");
  await p.clock.runFor(1200);
  await p.keyboard.press("p");
  assert.deepEqual(
    await p
      .locator(".shape-layer")
      .evaluateAll((nodes) =>
        nodes.map((el) => getComputedStyle(el).animationPlayState),
      ),
    ["paused", "paused"],
  );
  const timer = await p.locator("#round-timer").textContent();
  await p.clock.runFor(10000);
  assert.equal(await p.locator("#round-timer").textContent(), timer);
  assert.equal(await p.locator("#trial-count").textContent(), "第 1 题");
  await p.locator("#resume-session").click();
  await p.clock.runFor(300);
  assert.equal(await p.locator("#trial-count").textContent(), "第 2 题");
  assert.equal(await p.locator(".shape-layer").count(), 1);
  await p.keyboard.press("Space");
  assert.match(
    await p.locator("#round-score").textContent(),
    /命中 2 · 漏按 0 · 误按 0/,
  );
});
