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
  await p.clock.runFor(4400);
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
