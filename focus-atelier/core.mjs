export const DEFAULTS = Object.freeze({
  minutes: 7,
  difficulty: "normal",
  palette: "paper",
  direction: false,
  reminderTime: "15:00",
  browserReminder: false,
});
export const LEVELS = Object.freeze({
  gentle: { size: 4, wordMs: 5500, shapeMs: 1500 },
  normal: { size: 5, wordMs: 4000, shapeMs: 1200 },
  bold: { size: 6, wordMs: 3000, shapeMs: 950 },
});
export const COLORS = Object.freeze([
  { name: "红", hex: "#b13c31" },
  { name: "蓝", hex: "#244fb0" },
  { name: "绿", hex: "#367344" },
  { name: "黄", hex: "#896000" },
]);
export const KEY = "focus-atelier-v1";
export function shuffle(values, random = Math.random) {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function grid(size, random = Math.random) {
  if (![4, 5, 6].includes(size)) throw new RangeError("Unsupported grid");
  return shuffle(
    Array.from({ length: size * size }, (_, i) => i + 1),
    random,
  );
}
export function interference(direction = false, random = Math.random) {
  const count = direction ? 2 : 4;
  const answer = Math.floor(random() * count);
  const congruent = random() < 0.5;
  const distractor = congruent
    ? answer
    : (answer + 1 + Math.floor(random() * (count - 1))) % count;
  return { answer, distractor, congruent };
}
export function shapeDeck(random = Math.random) {
  return shuffle(
    [true, true, true, true, true, true, true, true, true, false, false, false],
    random,
  );
}
export function gradeShape(go, pressed) {
  return go ? (pressed ? "hit" : "miss") : pressed ? "falseAlarm" : "withheld";
}
export function plan(minutes) {
  if (![5, 7, 10].includes(minutes))
    throw new RangeError("Unsupported duration");
  return {
    roundMs: ((minutes * 60 - 30) / 3) * 1000,
    breakMs: 15000,
    totalMs: minutes * 60000,
  };
}
export class ActiveClock {
  constructor() {
    this.elapsed = 0;
    this.anchor = null;
  }
  start(now) {
    if (this.anchor === null) this.anchor = now;
  }
  read(now) {
    return (
      this.elapsed + (this.anchor === null ? 0 : Math.max(0, now - this.anchor))
    );
  }
  pause(now) {
    this.elapsed = this.read(now);
    this.anchor = null;
  }
  reset() {
    this.elapsed = 0;
    this.anchor = null;
  }
}
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validTime(time) {
  return typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}
export function normalize(raw) {
  const p = raw?.prefs ?? {};
  const prefs = {
    minutes: [5, 7, 10].includes(p.minutes) ? p.minutes : 7,
    difficulty: Object.hasOwn(LEVELS, p.difficulty) ? p.difficulty : "normal",
    palette: ["paper", "earth", "sea"].includes(p.palette)
      ? p.palette
      : "paper",
    direction: p.direction === true,
    reminderTime: validTime(p.reminderTime) ? p.reminderTime : "15:00",
    browserReminder: p.browserReminder === true,
  };
  const history = (Array.isArray(raw?.history) ? raw.history : [])
    .filter(
      (h) =>
        h &&
        typeof h.id === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(h.day) &&
        Number.isFinite(h.seconds) &&
        h.seconds >= 0 &&
        h.seconds <= 3600 &&
        typeof h.daily === "boolean",
    )
    .slice(-180)
    .map((h) => ({
      id: h.id.slice(0, 80),
      day: h.day,
      seconds: h.seconds,
      daily: h.daily,
    }));
  return {
    prefs,
    history,
    lastNotified:
      typeof raw?.lastNotified === "string"
        ? raw.lastNotified.slice(0, 10)
        : "",
  };
}
export function loadState(storage) {
  try {
    return {
      state: normalize(JSON.parse(storage.getItem(KEY) || "{}")),
      available: true,
    };
  } catch {
    return { state: normalize({}), available: false };
  }
}
export function saveState(storage, state) {
  try {
    storage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function reminderDue(state, now = new Date()) {
  const { prefs } = state;
  if (
    !prefs.browserReminder ||
    !validTime(prefs.reminderTime) ||
    state.lastNotified === dayKey(now)
  )
    return false;
  const [h, m] = prefs.reminderTime.split(":").map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes() - h * 60 - m;
  return minutes >= 0 && minutes < 10;
}
function foldLine(line) {
  let out = "",
    chunk = "",
    bytes = 0;
  for (const char of line) {
    const n = new TextEncoder().encode(char).length;
    if (bytes + n > 75) {
      out += chunk + "\r\n";
      chunk = " ";
      bytes = 1;
    }
    chunk += char;
    bytes += n;
  }
  return out + chunk;
}
export function calendar(
  time,
  minutes,
  now = new Date(),
  url = "https://yvesyao.github.io/focus-atelier/",
) {
  if (!validTime(time) || ![5, 7, 10].includes(minutes))
    throw new RangeError("Invalid reminder");
  const [h, m] = time.split(":").map(Number);
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  if (start <= now) start.setDate(start.getDate() + 1);
  const local =
    dayKey(start).replaceAll("-", "") + "T" + time.replace(":", "") + "00";
  const stamp = now
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
  const escapedURL = String(url)
    .replace(/[\r\n]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Focus Atelier//Daily practice//ZH",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:daily-practice@focus-atelier.yvesyao.github.io",
    `DTSTAMP:${stamp}`,
    `DTSTART:${local}`,
    `DURATION:PT${minutes}M`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:一隅 · ${minutes} 分钟专注练习`,
    `DESCRIPTION:给注意力留一小块空白。打开小画室开始今天的练习：${escapedURL}`,
    `URL:${String(url).replace(/[\r\n]/g, "")}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:到小画室坐一会儿",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .map(foldLine)
    .join("\r\n");
}
