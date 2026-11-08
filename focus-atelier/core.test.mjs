import test from "node:test";
import assert from "node:assert/strict";
import {
  grid,
  interference,
  shapeDeck,
  gradeShape,
  plan,
  ActiveClock,
  normalize,
  loadState,
  saveState,
  calendar,
  reminderDue,
  dayKey,
} from "./core.mjs";

test("every shuffled grid has exactly the required unique numbers", () => {
  for (const size of [4, 5, 6])
    for (let i = 0; i < 100; i++)
      assert.deepEqual(
        grid(size).sort((a, b) => a - b),
        Array.from({ length: size * size }, (_, j) => j + 1),
      );
  assert.throws(() => grid(7));
});
test("interference tasks have a valid answer and genuine congruent/incongruent trials", () => {
  for (const direction of [false, true]) {
    const types = new Set();
    for (let i = 0; i < 400; i++) {
      const q = interference(direction);
      types.add(q.congruent);
      assert.ok(q.answer >= 0 && q.answer < (direction ? 2 : 4));
      assert.equal(q.answer === q.distractor, q.congruent);
    }
    assert.equal(types.size, 2);
  }
});
test("shape task balances opportunities and scores silence, omissions and false alarms separately", () => {
  assert.equal(shapeDeck().filter(Boolean).length, 9);
  assert.equal(shapeDeck().length, 12);
  assert.deepEqual(
    [
      gradeShape(true, true),
      gradeShape(true, false),
      gradeShape(false, true),
      gradeShape(false, false),
    ],
    ["hit", "miss", "falseAlarm", "withheld"],
  );
});
test("daily durations include both rests exactly", () => {
  for (const m of [5, 7, 10]) {
    const p = plan(m);
    assert.equal(p.roundMs * 3 + p.breakMs * 2, m * 60000);
  }
  assert.throws(() => plan(20));
});
test("clock excludes paused/hidden time and repeated starts do not lose time", () => {
  const c = new ActiveClock();
  c.start(100);
  c.start(150);
  assert.equal(c.read(400), 300);
  c.pause(400);
  assert.equal(c.read(100000), 300);
  c.start(100000);
  assert.equal(c.read(100300), 600);
  c.pause(100300);
  c.reset();
  assert.equal(c.read(200000), 0);
});
test("persisted settings and histories are treated as untrusted data", () => {
  const s = normalize({
    prefs: {
      minutes: 99,
      difficulty: "__proto__",
      palette: "<script>",
      reminderTime: "99:99",
    },
    history: [
      null,
      {},
      { id: "a", day: "2026-11-05", seconds: 420, daily: true },
      { id: "bad", day: "2026-11-05", seconds: -1, daily: true },
    ],
  });
  assert.equal(s.prefs.minutes, 7);
  assert.equal(s.prefs.difficulty, "normal");
  assert.equal(s.prefs.reminderTime, "15:00");
  assert.equal(s.history.length, 1);
  assert.equal(
    loadState({
      getItem() {
        throw Error();
      },
    }).available,
    false,
  );
  assert.equal(
    loadState({
      getItem() {
        return "{";
      },
    }).available,
    false,
  );
  assert.equal(
    saveState(
      {
        setItem() {
          throw Error();
        },
      },
      s,
    ),
    false,
  );
});
test("calendar repeats at local wall time with an alarm and RFC-safe folded UTF-8 lines", () => {
  const now = new Date(2026, 10, 5, 16, 0);
  const ics = calendar("15:00", 7, now);
  assert.match(ics, /DTSTART:20261106T150000\r\n/);
  assert.match(ics, /RRULE:FREQ=DAILY/);
  assert.match(ics, /BEGIN:VALARM/);
  assert.match(ics, /TRIGGER:PT0M/);
  assert.match(ics, /DURATION:PT7M/);
  assert.ok(
    ics
      .split("\r\n")
      .every((line) => new TextEncoder().encode(line).length <= 75),
  );
  assert.match(calendar("17:00", 5, now), /DTSTART:20261105T170000/);
  assert.match(
    calendar("00:00", 10, new Date(2026, 11, 31, 23, 58)),
    /DTSTART:20270101T000000/,
  );
  assert.throws(() => calendar("25:00", 7, now));
});
test("browser reminder is opt-in, once per local day, with a bounded late window", () => {
  const s = normalize({
    prefs: { browserReminder: true, reminderTime: "15:00" },
  });
  const now = new Date(2026, 10, 5, 15, 3);
  assert.equal(reminderDue(s, now), true);
  s.lastNotified = dayKey(now);
  assert.equal(reminderDue(s, now), false);
  s.lastNotified = "";
  assert.equal(reminderDue(s, new Date(2026, 10, 5, 16, 0)), false);
  s.prefs.browserReminder = false;
  assert.equal(reminderDue(s, now), false);
});

test("music preferences migrate old storage and validate volume and opt-out", () => {
  assert.equal(normalize({}).prefs.musicEnabled, true);
  assert.equal(normalize({}).prefs.musicVolume, 40);
  assert.equal(
    normalize({ prefs: { musicEnabled: false } }).prefs.musicEnabled,
    false,
  );
  for (const invalid of [null, "90", NaN, Infinity, {}]) {
    assert.equal(
      normalize({ prefs: { musicVolume: invalid } }).prefs.musicVolume,
      40,
    );
  }
  for (const [input, expected] of [
    [-1, 0],
    [200, 100],
    [42.6, 43],
    [0, 0],
  ]) {
    assert.equal(
      normalize({ prefs: { musicVolume: input } }).prefs.musicVolume,
      expected,
    );
  }
});
