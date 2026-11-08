// Real audio clocks for fades and output, with an accelerated game clock only
// where needed. Browser instrumentation observes the actual Web Audio graph.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
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
after(async () => browser?.close());

async function fixture(t, { virtual = false, ...options } = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext;
    window.audioProbe = { contexts: [] };
    window.AudioContext = class extends NativeContext {
      constructor(...args) {
        super(...args);
        this.probeGains = [];
        this.probeSources = [];
        this.monitor = this.createAnalyser();
        this.monitor.fftSize = 2048;
        window.audioProbe.contexts.push(this);
      }
      createGain() {
        const gain = super.createGain();
        this.probeGains.push(gain);
        gain.connect(this.monitor);
        return gain;
      }
      createBufferSource() {
        const source = super.createBufferSource();
        this.probeSources.push(source);
        return source;
      }
    };
  });
  if (virtual) {
    await page.clock.install({ time: new Date("2026-11-08T06:00:00Z") });
    await page.clock.pauseAt(new Date("2026-11-08T06:00:01Z"));
  }
  await page.goto(base);
  t.after(async () => {
    assert.deepEqual(errors, []);
    await context.close();
  });
  return page;
}
async function reading(page) {
  return page.evaluate(() => {
    const ctx = window.audioProbe.contexts[0];
    if (!ctx) return { contexts: 0, sources: 0 };
    const data = new Float32Array(ctx.monitor.fftSize);
    ctx.monitor.getFloatTimeDomainData(data);
    return {
      contexts: window.audioProbe.contexts.length,
      sources: ctx.probeSources.length,
      state: ctx.state,
      gain: ctx.probeGains[0].gain.value,
      time: ctx.currentTime,
      rms: Math.sqrt(data.reduce((n, x) => n + x * x, 0) / data.length),
    };
  });
}
async function sounding(p, minimum = 0.02) {
  await p.waitForFunction((min) => {
    const c = window.audioProbe.contexts[0];
    return (
      c?.state === "running" &&
      c.probeGains[0]?.gain.value > min &&
      c.probeSources.length === 1
    );
  }, minimum);
}
async function silent(p) {
  await p.waitForFunction(() => {
    const c = window.audioProbe.contexts[0];
    return (
      !c || (c.state === "suspended" && c.probeGains[0].gain.value < 0.0001)
    );
  });
}
async function practice(p) {
  await p.locator('[data-practice="schulte"]').click();
  await p.locator("#begin-round").click();
  await sounding(p);
}
async function visibility(p, hidden) {
  await p.evaluate((hidden) => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: hidden,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

test("home is silent; gestures start one audible loop; pause/resume preserves position", async (t) => {
  const p = await fixture(t);
  assert.equal((await reading(p)).contexts, 0);
  await practice(p);
  await p.waitForTimeout(1600);
  const playing = await reading(p);
  assert.ok(playing.rms > 0.0001, `nonzero PCM output: ${playing.rms}`);
  assert.ok(Math.abs(playing.gain - 0.28) < 0.005);
  await p.locator("#pause-session").click();
  await silent(p);
  const paused = await reading(p);
  await p.waitForTimeout(250);
  assert.equal((await reading(p)).time, paused.time);
  await p.locator("#resume-session").click();
  await sounding(p);
  assert.equal((await reading(p)).sources, 1);
  assert.equal((await reading(p)).contexts, 1);
  // A pending fade-out must not suspend a freshly resumed practice.
  await p.locator("#pause-session").click();
  await p.locator("#resume-session").click();
  await p.waitForTimeout(600);
  assert.equal((await reading(p)).state, "running");
});

test("hidden page stays silent on return, including rules; pagehide suspends immediately", async (t) => {
  const p = await fixture(t);
  await p.locator('[data-practice="schulte"]').click();
  await sounding(p);
  await visibility(p, true);
  await silent(p);
  await visibility(p, false);
  await p.waitForTimeout(400);
  assert.equal((await reading(p)).state, "suspended");
  await p.locator("#begin-round").click();
  await sounding(p);
  await visibility(p, true);
  await silent(p);
  await visibility(p, false);
  assert.equal((await reading(p)).state, "suspended");
  await p.locator("#resume-session").click();
  await sounding(p);
  await p.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await silent(p);
});

test("music controls fit narrow screens, preview closes silently, opt-out and volume persist", async (t) => {
  const p = await fixture(t, { viewport: { width: 320, height: 740 } });
  await p.locator(".home-music").click();
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await p.locator("#music-preview").click();
  await sounding(p);
  await visibility(p, true);
  await silent(p);
  await visibility(p, false);
  assert.equal((await reading(p)).state, "suspended");
  await p.locator("#music-preview").click();
  await sounding(p);
  await p.locator("#music-volume").fill("23");
  assert.equal(await p.locator("#music-volume-value").textContent(), "23%");
  await p.locator('[aria-label="关闭配乐设置"]').click();
  await silent(p);
  await p.locator(".home-music").click();
  await p.locator("#music-enabled").uncheck();
  await p.locator('[aria-label="关闭配乐设置"]').click();
  await p.reload();
  await p.locator('[data-practice="schulte"]').click();
  await p.locator("#begin-round").click();
  assert.equal((await reading(p)).contexts, 0);
  await p.locator("#session-note button").click();
  assert.equal(await p.locator("#music-enabled").isChecked(), false);
  assert.equal(await p.locator("#music-volume").inputValue(), "23");
  await p.locator("#music-enabled").check();
  await p.locator('[aria-label="关闭配乐设置"]').click();
  await p.locator("#resume-session").click();
  await sounding(p);
});

test("a delayed download cannot start after quit or mute", async (t) => {
  for (const action of ["quit", "mute"]) {
    const p = await fixture(t);
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    let requested;
    const requestSeen = new Promise((resolve) => {
      requested = resolve;
    });
    await p.route("**/paperlight.mp3", async (route) => {
      requested();
      await gate;
      await route.continue();
    });
    await p.locator('[data-practice="schulte"]').click();
    await requestSeen;
    if (action === "quit") await p.locator("#leave-session").click();
    else {
      await p.locator("#session-note button").click();
      await p.locator("#music-enabled").uncheck();
    }
    release();
    await p.waitForResponse("**/paperlight.mp3");
    await p.waitForTimeout(600);
    await silent(p);
    assert.equal((await reading(p)).sources, 0);
  }
});

test("failed audio can retry without blocking the game or doubling sources", async (t) => {
  const p = await fixture(t);
  await p.route("**/paperlight.mp3", (route) => route.abort());
  await p.locator('[data-practice="schulte"]').click();
  await p.locator("#begin-round").click();
  await p.locator('[data-number="1"]').click();
  assert.equal(await p.locator("#next-number").textContent(), "2");
  await p.waitForFunction(() =>
    document.querySelector("#session-note").textContent.includes("重试"),
  );
  await p.unroute("**/paperlight.mp3");
  await p.locator("#session-note button").click();
  await p.locator("#music-preview").click();
  await sounding(p);
  await p.locator('[aria-label="关闭配乐设置"]').click();
  await p.locator("#resume-session").click();
  await sounding(p);
  assert.equal((await reading(p)).sources, 1);
});

test("rests duck the same loop, completion fades out, preview is time-bounded", async (t) => {
  const p = await fixture(t, { virtual: true });
  await p.locator('[data-minutes="5"]').click();
  await p.locator("#start-daily").click();
  await p.locator("#begin-round").click();
  await sounding(p);
  await p.clock.runFor(90000);
  await p.waitForTimeout(1100);
  assert.ok(Math.abs((await reading(p)).gain - 0.154) < 0.005);
  await p.clock.runFor(15000);
  for (let i = 0; i < 2; i++) {
    await p.locator("#continue-session").click();
    await p.locator("#begin-round").click();
    await p.clock.runFor(90000);
    if (i === 0) await p.clock.runFor(15000);
  }
  assert.equal(await p.locator(".summary").count(), 1);
  assert.equal((await reading(p)).sources, 1);
  // AudioParam uses real audio time; timers use the virtual page clock here.
  await p.waitForTimeout(2700);
  assert.ok((await reading(p)).gain < 0.0001);
  await p.clock.runFor(2600);
  await silent(p);
  await p.locator("#back-home").click();
  await p.locator(".home-music").click();
  await p.locator("#music-preview").click();
  await sounding(p);
  await p.clock.runFor(20000);
  await p.waitForTimeout(2700);
  await p.clock.runFor(2600);
  await silent(p);
});

test("unexpected audio suspension pauses practice and needs a fresh gesture", async (t) => {
  const p = await fixture(t);
  await practice(p);
  await p.evaluate(() => window.audioProbe.contexts[0].suspend());
  await p.locator("#resume-session").waitFor();
  await silent(p);
  await p.locator("#resume-session").click();
  await sounding(p);
});

test("browser playback rejection is recoverable and unsupported audio leaves games usable", async (t) => {
  const p = await fixture(t);
  await p.evaluate(() => {
    const resume = AudioContext.prototype.resume;
    AudioContext.prototype.resume = function () {
      AudioContext.prototype.resume = resume;
      return Promise.reject(
        new DOMException("Playback denied", "NotAllowedError"),
      );
    };
  });
  await p.locator('[data-practice="schulte"]').click();
  await p.waitForFunction(() =>
    document.querySelector("#session-note").textContent.includes("重试"),
  );
  await p.locator("#begin-round").click();
  await sounding(p);
  const unsupported = await fixture(t);
  await unsupported.evaluate(() => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
  });
  await unsupported.locator('[data-practice="schulte"]').click();
  await unsupported.locator("#begin-round").click();
  await unsupported.locator('[data-number="1"]').click();
  assert.equal(await unsupported.locator("#next-number").textContent(), "2");
  assert.match(
    await unsupported.locator("#session-note").textContent(),
    /重试/,
  );
});

test("audio asset decodes with headroom, no empty seconds and a quiet loop seam", async (t) => {
  const p = await fixture(t);
  const stats = await p.evaluate(async () => {
    const ctx = new AudioContext();
    const response = await fetch(
      new URL("./assets/paperlight.mp3", location.href),
    );
    const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
    let peak = 0,
      minimumRms = 1,
      seam = 0;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      seam = Math.max(seam, Math.abs(data[0] - data[data.length - 1]));
      for (
        let at = 0;
        at + buffer.sampleRate <= data.length;
        at += buffer.sampleRate
      ) {
        let energy = 0;
        for (let i = at; i < at + buffer.sampleRate; i++) {
          peak = Math.max(peak, Math.abs(data[i]));
          energy += data[i] * data[i];
        }
        minimumRms = Math.min(
          minimumRms,
          Math.sqrt(energy / buffer.sampleRate),
        );
      }
    }
    await ctx.close();
    return {
      duration: buffer.duration,
      channels: buffer.numberOfChannels,
      peak,
      minimumRms,
      seam,
    };
  });
  assert.ok(Math.abs(stats.duration - 96) < 0.01, JSON.stringify(stats));
  assert.equal(stats.channels, 2);
  assert.ok(stats.peak < 0.8 && stats.peak > 0.1, JSON.stringify(stats));
  assert.ok(stats.minimumRms > 0.02, JSON.stringify(stats));
  assert.ok(stats.seam < 0.02, JSON.stringify(stats));
});
