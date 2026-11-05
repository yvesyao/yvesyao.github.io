import {
  COLORS,
  LEVELS,
  KEY,
  grid,
  interference,
  shapeDeck,
  gradeShape,
  plan,
  ActiveClock,
  dayKey,
  loadState,
  saveState,
  calendar,
  reminderDue,
} from "./core.mjs";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}
const loaded = loadState(storage);
let state = loaded.state;
let session = null;
let toastTimer;
const clock = new ActiveClock();
// All icon names are internal constants; game stimuli keep their own semantics.
const icon = (name) =>
  `<svg class="ui-icon" aria-hidden="true" focusable="false"><use href="./assets/icons.svg#${name}"></use></svg>`;
const responseIcon = (outcome) =>
  icon(
    outcome === "correct" ? "check" : outcome === "wrong" ? "close" : "clock",
  );
const GAME = {
  schulte: {
    name: "序光",
    subtitle: "舒尔特方格",
    english: "SEARCH",
    emblem: "1—N",
    instruction: "从 1 开始，依次点击数字。找齐一盘，会自动换一张新方格。",
    hints: ["不用背位置", "看准了再点", "点错不会扣时间"],
  },
  stroop: {
    name: "异色",
    subtitle: "色词干扰",
    english: "FILTER",
    emblem: "红",
    instruction: "选择字的墨色，忽略它的字义。例如：蓝色的“红”，应该选“蓝”。",
    hints: ["看墨色，不看字义", "点击选项或按 1–4", "超时会记为漏答"],
  },
  gonogo: {
    name: "留白",
    subtitle: "点按与停手",
    english: "PAUSE",
    emblem: `${icon("circle")}${icon("square")}`,
    instruction:
      "看到圆形，直接点图形或下方按钮一次；看到方形，两处都不要点。也可以按空格作答。",
    hints: ["圆形：点一次", "方形：不点", "图形、按钮、空格都能作答"],
  },
};
const escapeHTML = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const timeText = (ms) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
};
const ratio = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : "—");
const mean = (numbers) =>
  numbers.length
    ? `${Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length)} ms`
    : "—";
function persist() {
  $("#storage-warning").hidden = saveState(storage, state);
}
function toast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 5000);
}
function setPalette(name) {
  document.documentElement.dataset.palette = name;
  $("#palette-art").src = `./assets/atelier-${name}.webp`;
  $("#palette-label").textContent = {
    paper: "纸上晴日",
    earth: "陶土午后",
    sea: "海边来信",
  }[name];
  $$("[data-palette]")
    .filter((el) => el.tagName === "BUTTON")
    .forEach((el) =>
      el.setAttribute("aria-pressed", String(el.dataset.palette === name)),
    );
  $("meta[name=theme-color]").content = getComputedStyle(
    document.documentElement,
  )
    .getPropertyValue("--paper")
    .trim();
}
function renderHome() {
  $("#home-view").hidden = false;
  $("#session-view").hidden = true;
  $("#site-footer").hidden = false;
  $("#home-nav").hidden = false;
  $("#session-note").hidden = true;
  $$("[data-minutes]").forEach((b) =>
    b.setAttribute(
      "aria-pressed",
      String(Number(b.dataset.minutes) === state.prefs.minutes),
    ),
  );
  const done = state.history.some((h) => h.daily && h.day === dayKey());
  $("#today-label").textContent = done
    ? "今天已完成 · 也可以就此收笔"
    : "今天的小小留白";
  $("#start-daily span").textContent = done
    ? "再练一次，也随心"
    : "开始今天的练习";
  setPalette(state.prefs.palette);
}
function currentGame() {
  return session.queue[session.index];
}
function gameInfo(id) {
  if (id === "stroop" && session?.prefs.direction)
    return {
      ...GAME.stroop,
      subtitle: "方向干扰",
      emblem: "← →",
      instruction:
        "选择中央箭头指向的方向，忽略两旁箭头。它们有时会故意指向相反方向。",
      hints: ["只看正中间", "点击或按左右方向键", "超时会记为漏答"],
    };
  return GAME[id];
}
function renderPath() {
  $("#session-path").innerHTML = session.queue
    .map(
      (id, i) =>
        `<span class="path-item ${i === session.index ? "current" : i < session.index ? "done" : ""}" ${i === session.index ? 'aria-current="step"' : ""}><b>${i < session.index ? icon("check") : i + 1}</b>${GAME[id].name}</span>`,
    )
    .join("");
}
function startSession(practice) {
  const prefs = { ...state.prefs };
  session = {
    id: crypto.randomUUID(),
    queue: practice ? [practice] : ["schulte", "stroop", "gonogo"],
    index: 0,
    phase: "intro",
    daily: !practice,
    prefs,
    plan: plan(prefs.minutes),
    results: [],
    countedMs: 0,
    paused: false,
    lastTick: performance.now(),
  };
  $("#home-view").hidden = true;
  $("#site-footer").hidden = true;
  $("#home-nav").hidden = true;
  $("#session-note").hidden = false;
  $("#session-view").hidden = false;
  $("#session-kind").textContent = practice
    ? "一分钟试玩"
    : `${prefs.minutes} 分钟 · 今日练习`;
  $("#leave-session").hidden = false;
  renderIntro();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function renderIntro() {
  session.phase = "intro";
  session.paused = false;
  clock.reset();
  $("#pause-session").hidden = true;
  renderPath();
  const id = currentGame(),
    info = gameInfo(id);
  const seconds = session.daily ? session.plan.roundMs / 1000 : 60;
  $("#stage").innerHTML =
    `<div class="intro"><div class="intro-emblem" aria-hidden="true">${info.emblem}</div><p class="eyebrow">${String(session.index + 1).padStart(2, "0")} / ${info.english}</p><h1 tabindex="-1">${info.name} · ${info.subtitle}</h1><p class="intro-copy">${info.instruction}</p><ul class="intro-hints">${info.hints.map((h) => `<li>${h}</li>`).join("")}</ul><button class="primary" id="begin-round">准备好了，开始 ${icon("arrow-up-right")}</button><p class="practice-tag">这一段 ${seconds} 秒${id === "schulte" ? ` · ${LEVELS[session.prefs.difficulty].size} × ${LEVELS[session.prefs.difficulty].size} 方格` : ""} · 读规则时不计时</p>${id === "stroop" ? `<button class="text-button" id="toggle-direction">${session.prefs.direction ? "切换回色词模式" : "不方便辨色？切换方向模式"} ${icon("swap")}</button>` : ""}</div>`;
  $("#begin-round").addEventListener("click", beginRound);
  $("#toggle-direction")?.addEventListener("click", () => {
    session.prefs.direction = !session.prefs.direction;
    state.prefs.direction = session.prefs.direction;
    persist();
    renderIntro();
  });
  $(".intro h1").focus({ preventScroll: true });
}
function beginRound() {
  const id = currentGame(),
    info = gameInfo(id);
  session.phase = "play";
  session.paused = false;
  session.duration = session.daily ? session.plan.roundMs : 60000;
  session.round = {
    game: id,
    correct: 0,
    wrong: 0,
    omitted: 0,
    times: [],
    boards: [],
    hit: 0,
    miss: 0,
    falseAlarm: 0,
    withheld: 0,
    direction: session.prefs.direction,
  };
  session.trial = null;
  session.trialNumber = 0;
  session.nextAt = null;
  session.deck = [];
  clock.reset();
  clock.start(performance.now());
  session.lastTick = performance.now();
  $("#pause-session").hidden = false;
  $("#pause-session").innerHTML = `暂停 ${icon("pause")}`;
  $("#stage").innerHTML =
    `<div class="game-shell"><div class="game-heading"><div><h1>${info.name} <span aria-hidden="true">/</span> ${info.subtitle}</h1><p>${id === "schulte" ? "按顺序寻找。每一次，只找下一个。" : id === "stroop" ? (session.prefs.direction ? "看中央箭头的方向，忽略两旁。" : "看墨色，不看字义。") : "圆形点一次，方形不点。"}</p></div><span class="timer" id="round-timer" aria-label="本段剩余时间">${timeText(session.duration)}</span></div><div class="progress-track" role="progressbar" aria-label="本段进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="progress-fill"></span></div><div class="game-canvas" id="game-canvas"></div><p class="game-feedback" id="game-feedback" role="status" aria-live="polite"></p><div class="game-footer"><span id="round-score"></span><span>切走页面会暂停 · 按 P 暂停</span></div></div>`;
  if (id === "schulte") newBoard(0);
  else if (id === "stroop") setupInterference();
  else setupShapes();
  updateScore();
}
function feedback(text) {
  if ($("#game-feedback")) $("#game-feedback").textContent = text;
}
function resetQuestionFeedback() {
  session.trialNumber++;
  $("#trial-count").textContent = `第 ${session.trialNumber} 题`;
  $("#trial-state").textContent =
    currentGame() === "stroop" ? "请选择" : "观察形状";
  $("#response-feedback").textContent = "";
  delete $("#response-feedback").dataset.outcome;
  $$("#game-canvas [data-response]").forEach(
    (el) => delete el.dataset.response,
  );
  $$(".answer-mark, .shape-mark").forEach((el) => (el.textContent = ""));
  feedback("");
}
function showResponse(outcome, label) {
  $("#trial-state").textContent = "本题已结束";
  const result = $("#response-feedback");
  result.dataset.outcome = outcome;
  result.innerHTML = `${responseIcon(outcome)}<span>${escapeHTML(label)}</span>`;
}
function newBoard(now) {
  const size = LEVELS[session.prefs.difficulty].size;
  session.board = { next: 1, size, start: now, values: grid(size) };
  $("#game-canvas").innerHTML =
    `<div class="next-number"><span>下一枚 <strong id="next-number" aria-live="polite">1</strong></span><span>1 → ${size * size}</span></div><div class="schulte-grid" style="--size:${size}" aria-label="按顺序点击数字">${session.board.values.map((n) => `<button class="number-cell" data-number="${n}">${n}</button>`).join("")}</div>`;
  $$(".number-cell").forEach((b) =>
    b.addEventListener("click", () => chooseNumber(b)),
  );
}
function inputTime() {
  if (!session || session.phase !== "play" || session.paused) return null;
  const now = clock.read(performance.now());
  if (now >= session.duration) {
    finishRound();
    return null;
  }
  return now;
}
function chooseNumber(button) {
  const now = inputTime();
  if (now === null || session.nextAt !== null) return;
  const n = Number(button.dataset.number);
  if (n !== session.board.next) {
    session.round.wrong++;
    button.classList.add("bad");
    feedback(`再看一眼，现在找 ${session.board.next}。`);
    setTimeout(() => button.classList.remove("bad"), 250);
    updateScore();
    return;
  }
  session.round.correct++;
  session.board.next++;
  button.classList.add("good");
  setTimeout(() => button.classList.remove("good"), 180);
  if (session.board.next > session.board.size ** 2) {
    session.round.boards.push(now - session.board.start);
    session.nextAt = now + 450;
    feedback("这一盘完成了，换一张新的。");
  } else {
    $("#next-number").textContent = session.board.next;
    feedback("");
  }
  updateScore();
}
function setupInterference() {
  const direction = session.prefs.direction;
  $("#game-canvas").innerHTML =
    `<p class="game-instruction">${direction ? "选中央箭头的方向" : "选墨色，忽略字义"}</p><div class="trial-meta"><span id="trial-count"></span><span id="trial-state"></span></div><div class="stimulus ${direction ? "arrows" : ""}" id="stimulus"></div><div class="response-feedback" id="response-feedback" aria-hidden="true"></div><div class="answer-options ${direction ? "two" : ""}">${(direction ? ["← 左", "右 →"] : COLORS.map((c) => c.name)).map((name, i) => `<button class="answer-button" data-answer="${i}">${direction ? "" : `<span class="color-swatch" style="background:${COLORS[i].hex}" aria-hidden="true"></span>`}${name}<span class="key-hint">${direction ? (i ? "→" : "←") : i + 1}</span><span class="answer-mark" aria-hidden="true"></span></button>`).join("")}</div>`;
  $$("[data-answer]").forEach((b) =>
    b.addEventListener("click", () =>
      answerInterference(Number(b.dataset.answer)),
    ),
  );
  newInterference(0);
}
function newInterference(now) {
  resetQuestionFeedback();
  const q = interference(session.prefs.direction);
  session.trial = {
    ...q,
    start: now,
    deadline: now + LEVELS[session.prefs.difficulty].wordMs,
    closed: false,
  };
  session.nextAt = null;
  const stimulus = $("#stimulus");
  // A fresh child makes identical consecutive prompts visibly enter again.
  const content = document.createElement("span");
  content.className = "stimulus-content";
  if (session.prefs.direction) {
    const arrows = ["←", "→"];
    content.textContent =
      arrows[q.distractor].repeat(2) +
      arrows[q.answer] +
      arrows[q.distractor].repeat(2);
    stimulus.removeAttribute("style");
  } else {
    content.textContent = COLORS[q.distractor].name;
    stimulus.style.color = COLORS[q.answer].hex;
  }
  stimulus.replaceChildren(content);
  $$("[data-answer]").forEach((b) => (b.disabled = false));
}
function answerInterference(answer) {
  const now = inputTime();
  if (now === null || session.trial.closed) return;
  if (now >= session.trial.deadline) {
    resolveInterference(null, now);
    return;
  }
  resolveInterference(answer, now);
}
function resolveInterference(answer, now) {
  const q = session.trial;
  if (q.closed) return;
  q.closed = true;
  const correct = answer === q.answer;
  const outcome = correct ? "correct" : answer === null ? "missed" : "wrong";
  const expected = session.prefs.direction
    ? q.answer
      ? "右"
      : "左"
    : COLORS[q.answer].name;
  $("#stimulus").dataset.response = outcome;
  showResponse(
    outcome,
    correct ? "正确" : `${answer === null ? "超时" : "应选"}：${expected}`,
  );
  if (answer !== null) {
    const chosen = $(`[data-answer="${answer}"]`);
    chosen.dataset.response = outcome;
    chosen.querySelector(".answer-mark").innerHTML = responseIcon(outcome);
  }
  if (!correct) {
    const solution = $(`[data-answer="${q.answer}"]`);
    solution.dataset.response = "solution";
    solution.querySelector(".answer-mark").innerHTML = icon("check");
  }
  if (answer === q.answer) {
    session.round.correct++;
    session.round.times.push(now - q.start);
    feedback("看准了。");
  } else {
    if (answer === null) session.round.omitted++;
    else session.round.wrong++;
    feedback(
      `${answer === null ? "这一题超时了" : "再慢一点也没关系"}，答案是${session.prefs.direction ? (q.answer ? "右" : "左") : COLORS[q.answer].name}。`,
    );
  }
  session.nextAt = now + 400;
  $$("[data-answer]").forEach((b) => (b.disabled = true));
  updateScore();
}
function setupShapes() {
  $("#game-canvas").innerHTML =
    `<p class="game-instruction" id="shape-rule">${icon("circle")} 圆形：点一次 &nbsp; · &nbsp; ${icon("square")} 方形：不点</p><div class="trial-meta"><span id="trial-count"></span><span id="trial-state"></span></div><button class="shape-target" id="shape-response" type="button" aria-label="点击图形作答" aria-describedby="shape-rule"><span id="shape-visual"></span><span class="shape-mark" aria-hidden="true"></span></button><div class="response-feedback" id="response-feedback" aria-hidden="true"></div><button class="primary tap-button" id="tap-shape">点击作答 <span class="key-hint">SPACE</span></button><p class="tap-hint">直接点上方图形也可以 · 方形时两处都不要点</p>`;
  $("#tap-shape").addEventListener("click", answerShape);
  $("#shape-response").addEventListener("click", answerShape);
  newShape(0);
}
function newShape(now) {
  resetQuestionFeedback();
  if (!session.deck.length) session.deck = shapeDeck();
  const go = session.deck.pop();
  session.trial = {
    go,
    start: now,
    deadline: now + LEVELS[session.prefs.difficulty].shapeMs,
    closed: false,
  };
  session.nextAt = null;
  $("#shape-visual").innerHTML =
    `<span class="target-symbol ${go ? "" : "nogo"}" id="target-symbol" role="img" aria-label="${go ? "圆形" : "方形"}"></span>`;
  $("#shape-response").disabled = false;
  $("#tap-shape").disabled = false;
  $("#tap-shape").innerHTML = '点击作答 <span class="key-hint">SPACE</span>';
}
function answerShape() {
  const now = inputTime();
  if (now === null || session.trial.closed) return;
  if (now >= session.trial.deadline) {
    resolveShape(false, now);
    return;
  }
  resolveShape(true, now);
}
function resolveShape(pressed, now) {
  const q = session.trial;
  if (q.closed) return;
  q.closed = true;
  const outcome = gradeShape(q.go, pressed);
  session.round[outcome]++;
  const response =
    outcome === "hit" || outcome === "withheld"
      ? "correct"
      : outcome === "miss"
        ? "missed"
        : "wrong";
  const label = {
    hit: "点中了",
    miss: "漏按了，圆形需要点一下",
    falseAlarm: "方形要停手",
    withheld: "停住了",
  }[outcome];
  showResponse(response, label);
  $("#shape-response").dataset.response = response;
  $(".shape-mark").innerHTML = responseIcon(response);
  $("#tap-shape").dataset.response = response;
  const buttonLabel = {
    hit: "已点中",
    miss: "这枚漏按了",
    falseAlarm: "这次应停手",
    withheld: "已停手",
  }[outcome];
  $("#tap-shape").innerHTML = `${responseIcon(response)} ${buttonLabel}`;
  if (outcome === "hit") session.round.times.push(now - q.start);
  feedback(
    {
      hit: "看见了，再等下一个。",
      miss: "这一枚圆形漏掉了，下一枚再来。",
      falseAlarm: "刚才是方形，试着停一下。",
      withheld: "留住了这一小块空白。",
    }[outcome],
  );
  $("#tap-shape").disabled = true;
  $("#shape-response").disabled = true;
  session.nextAt = q.deadline + 250;
  updateScore();
}
function updateScore() {
  const r = session.round;
  $("#round-score").textContent =
    r.game === "schulte"
      ? `完成 ${r.boards.length} 盘 · 误按 ${r.wrong} 次`
      : r.game === "stroop"
        ? `正确 ${r.correct} · 错误 ${r.wrong} · 漏答 ${r.omitted}`
        : `命中 ${r.hit} · 漏按 ${r.miss} · 误按 ${r.falseAlarm}`;
}
function finishRound() {
  if (session.phase !== "play") return;
  clock.pause(performance.now());
  session.countedMs += session.duration;
  session.results.push({ ...session.round, seconds: session.duration / 1000 });
  $("#pause-session").hidden = true;
  if (session.index === session.queue.length - 1) {
    finishSession();
    return;
  }
  session.phase = "break";
  session.paused = false;
  clock.reset();
  clock.start(performance.now());
  session.lastTick = performance.now();
  const next = GAME[session.queue[session.index + 1]];
  $("#stage").innerHTML =
    `<div class="break-stage"><p class="eyebrow">A LITTLE SPACE BETWEEN</p><h1>目光，去远处走走。</h1><p>放松手指，看看窗外。下一段是「${next.name}」。</p><div class="breath-art" aria-hidden="true"><span id="break-timer">15</span></div><p id="break-status">休息 15 秒，再继续。</p><button class="primary" id="continue-session" hidden>进入下一段 ${icon("arrow-up-right")}</button></div>`;
  $("#continue-session").addEventListener("click", () => {
    session.index++;
    renderIntro();
  });
}
function pauseSession(
  reason = "练习已暂停。准备好再回来。",
  stoppedAt = performance.now(),
) {
  if (!session || !["play", "break"].includes(session.phase) || session.paused)
    return;
  clock.pause(stoppedAt);
  session.paused = true;
  $("#pause-session").innerHTML = `继续 ${icon("play")}`;
  const canvas = $("#game-canvas") || $(".break-stage");
  if (canvas) {
    canvas.style.position = "relative";
    const cover = document.createElement("div");
    cover.className = "paused-cover";
    cover.innerHTML = `<h2>留一会儿白。</h2><p>${escapeHTML(reason)}</p><button class="primary" id="resume-session">继续练习 ${icon("play")}</button>`;
    canvas.append(cover);
    $("#resume-session").addEventListener("click", resumeSession);
    $("#resume-session").focus({ preventScroll: true });
  }
}
function resumeSession() {
  if (!session?.paused || document.hidden || $("#leave-dialog").open) return;
  $(".paused-cover")?.remove();
  session.paused = false;
  clock.start(performance.now());
  session.lastTick = performance.now();
  $("#pause-session").innerHTML = `暂停 ${icon("pause")}`;
}
function finishSession() {
  session.phase = "summary";
  session.paused = false;
  clock.reset();
  state.history.push({
    id: session.id,
    day: dayKey(),
    seconds: session.countedMs / 1000,
    daily: session.daily,
  });
  state.history = state.history.slice(-180);
  persist();
  $("#pause-session").hidden = true;
  $("#leave-session").hidden = true;
  $$(".path-item").forEach((e) => {
    e.classList.remove("current");
    e.classList.add("done");
    e.removeAttribute("aria-current");
  });
  const seconds = session.countedMs / 1000;
  $("#stage").innerHTML =
    `<div class="summary"><p class="eyebrow">A SMALL PRACTICE, WELL KEPT</p><h1 tabindex="-1">${session.daily ? "今天，就练到这里。" : "初次相识，慢慢来。"}</h1><p class="summary-note">${session.daily ? `你给自己留了 ${Math.round(seconds / 60)} 分钟。谢谢这段专心的时间。` : "完成了 1 分钟试玩。试玩记录单独保存，不计作每日练习完成。"}</p><div class="result-grid ${session.daily ? "" : "single"}">${session.results.map(resultCard).join("")}</div><p class="next-step">收起屏幕，把这份专心带去一件小事。<br>这里记录的是游戏表现，不是能力评分。</p><div class="dialog-actions"><button class="primary" id="back-home">完成，回到小画室</button><button class="secondary" data-dialog="reminder-dialog">约好明天</button></div></div>`;
  $("#back-home").addEventListener("click", goHome);
  bindDialogButtons($("#stage"));
  $(".summary h1").focus({ preventScroll: true });
}
function resultCard(r) {
  if (r.game === "schulte")
    return `<article class="result-card"><h2>序光</h2><strong>${r.boards.length} <small>盘</small></strong><p>正确点击 ${r.correct} · 误按 ${r.wrong}</p><p>${r.boards.length ? `最快完整盘 ${(Math.min(...r.boards) / 1000).toFixed(1)} 秒` : "未完成整盘，下次继续慢慢找。"}</p></article>`;
  if (r.game === "stroop")
    return `<article class="result-card"><h2>异色 · ${r.direction ? "方向" : "色词"}</h2><strong>${ratio(r.correct, r.correct + r.wrong + r.omitted)}</strong><p>正确率（含超时）</p><p>正确 ${r.correct} · 错误 ${r.wrong} · 漏答 ${r.omitted}</p><p>正确反应均值 ${mean(r.times)}</p></article>`;
  return `<article class="result-card"><h2>留白</h2><strong>${ratio(r.hit, r.hit + r.miss)}</strong><p>圆形命中率 · 漏按 ${r.miss}</p><p>方形误按 ${r.falseAlarm} / ${r.falseAlarm + r.withheld}</p><p>成功停手 ${r.withheld} 次</p></article>`;
}
function tick() {
  if (!session || !["play", "break"].includes(session.phase) || session.paused)
    return;
  const wall = performance.now();
  if (wall - session.lastTick > 2200) {
    pauseSession("页面暂时中断了，继续前先准备一下。", session.lastTick);
    return;
  }
  session.lastTick = wall;
  const now = clock.read(wall);
  if (session.phase === "break") {
    $("#break-timer").textContent = Math.max(
      0,
      Math.ceil((session.plan.breakMs - now) / 1000),
    );
    if (now >= session.plan.breakMs) {
      clock.pause(wall);
      session.countedMs += session.plan.breakMs;
      session.phase = "between";
      $("#break-status").textContent = "准备好，就进入下一段。";
      $("#continue-session").hidden = false;
    }
    return;
  }
  if (now >= session.duration) {
    finishRound();
    return;
  }
  $("#round-timer").textContent = timeText(session.duration - now);
  $(".progress-fill").style.width = `${(now / session.duration) * 100}%`;
  $(".progress-track").setAttribute(
    "aria-valuenow",
    Math.floor((now / session.duration) * 100),
  );
  if (currentGame() === "schulte") {
    if (session.nextAt !== null && now >= session.nextAt) {
      session.nextAt = null;
      newBoard(now);
    }
    return;
  }
  const q = session.trial;
  if (!q.closed && now >= q.deadline) {
    if (currentGame() === "stroop") resolveInterference(null, now);
    else resolveShape(false, now);
  }
  if (currentGame() === "gonogo" && now >= q.deadline)
    $("#target-symbol").classList.add("blank");
  if (session.nextAt !== null && now >= session.nextAt) {
    if (currentGame() === "stroop") newInterference(now);
    else newShape(now);
  }
}
function goHome() {
  clock.reset();
  session = null;
  $("#leave-dialog").close();
  renderHome();
  window.scrollTo({ top: 0, behavior: "instant" });
  $("#start-daily").focus({ preventScroll: true });
}
function renderHistory() {
  const daily = state.history.filter((h) => h.daily);
  const days = new Set(daily.map((h) => h.day));
  $("#history-content").innerHTML = state.history.length
    ? `<div class="history-overview"><div><strong>${days.size}</strong><span>完成练习的日子</span></div><div><strong>${Math.round(state.history.reduce((s, h) => s + h.seconds, 0) / 60)}</strong><span>累计分钟（含试玩）</span></div></div><ul class="history-list">${[
        ...state.history,
      ]
        .reverse()
        .slice(0, 20)
        .map(
          (h) =>
            `<li><span>${escapeHTML(h.day)}</span><span>${h.daily ? "每日练习" : "一分钟试玩"} · ${Math.round(h.seconds / 60)} 分钟</span></li>`,
        )
        .join("")}</ul>`
    : '<div class="empty-record"><p>这里还是一张白纸。<br>完成第一次练习，就会留下足迹。</p></div>';
  $("#clear-history").hidden = !state.history.length;
  $("#clear-history").textContent = "清除本机练习记录";
  delete $("#clear-history").dataset.confirm;
}
function openDialog(id) {
  if (id === "settings-dialog") {
    $("#difficulty").value = state.prefs.difficulty;
    $("#direction-mode").checked = state.prefs.direction;
  }
  if (id === "reminder-dialog") {
    $("#reminder-time").value = state.prefs.reminderTime;
    $("#browser-reminder").checked = state.prefs.browserReminder;
    $("#reminder-status").textContent = state.prefs.browserReminder
      ? "网页通知已选用；页面须保持打开，且浏览器需允许通知。"
      : "日历提醒需要你下载并导入后才会生效。";
  }
  if (id === "history-dialog") renderHistory();
  $(`#${id}`).showModal();
}
function bindDialogButtons(root = document) {
  root
    .querySelectorAll("[data-dialog]")
    .forEach((b) =>
      b.addEventListener("click", () => openDialog(b.dataset.dialog)),
    );
}
function downloadCalendar() {
  const input = $("#reminder-time");
  if (!input.reportValidity()) return;
  state.prefs.reminderTime = input.value;
  persist();
  const blob = new Blob(
    [
      calendar(
        input.value,
        state.prefs.minutes,
        new Date(),
        new URL("./", location.href).href,
      ),
    ],
    { type: "text/calendar;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "一隅-每日练习.ics";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  $("#reminder-status").textContent =
    "已生成日历文件。请打开并导入日历，确认每日时间和通知；完成导入前，提醒尚未生效。";
}
async function toggleBrowserReminder() {
  if (!$("#browser-reminder").checked) {
    state.prefs.browserReminder = false;
    persist();
    $("#reminder-status").textContent =
      "网页通知已关闭。已导入的日历提醒需在日历中取消。";
    return;
  }
  if (!("Notification" in window)) {
    $("#browser-reminder").checked = false;
    $("#reminder-status").textContent =
      "当前浏览器不支持网页通知，请使用上方日历提醒。";
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    state.prefs.browserReminder = permission === "granted";
    $("#browser-reminder").checked = state.prefs.browserReminder;
    if ($("#reminder-time").validity.valid)
      state.prefs.reminderTime = $("#reminder-time").value;
    persist();
    $("#reminder-status").textContent =
      permission === "granted"
        ? "网页通知已允许。请保持页面打开；关闭页面后请依靠日历提醒。"
        : "浏览器未允许通知。你仍可下载日历提醒，或在浏览器设置中修改权限。";
  } catch {
    $("#browser-reminder").checked = false;
    state.prefs.browserReminder = false;
    persist();
    $("#reminder-status").textContent = "无法启用网页通知，请使用日历提醒。";
  }
}
function checkReminder() {
  if (!reminderDue(state) || (session && session.phase !== "summary")) return;
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;
  try {
    const n = new Notification("一隅 · 给自己几分钟", {
      body: `今天的小画室，留了 ${state.prefs.minutes} 分钟给你。`,
      icon: new URL("./icon.svg", location.href).href,
      tag: "focus-atelier-daily",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    state.lastNotified = dayKey();
    persist();
  } catch {
    /* Calendar remains the primary reminder on unsupported mobile browsers. */
  }
}

bindDialogButtons();
$$("[data-minutes]").forEach((b) =>
  b.addEventListener("click", () => {
    state.prefs.minutes = Number(b.dataset.minutes);
    persist();
    renderHome();
  }),
);
$$("button[data-palette]").forEach((b) =>
  b.addEventListener("click", () => {
    state.prefs.palette = b.dataset.palette;
    setPalette(state.prefs.palette);
    persist();
  }),
);
$$("[data-practice]").forEach((b) =>
  b.addEventListener("click", () => startSession(b.dataset.practice)),
);
$("#start-daily").addEventListener("click", () => startSession());
$("#save-settings").addEventListener("click", () => {
  state.prefs.difficulty = $("#difficulty").value;
  state.prefs.direction = $("#direction-mode").checked;
  persist();
  $("#settings-dialog").close();
  toast("设置已保存，下次练习使用。");
});
$("#download-calendar").addEventListener("click", downloadCalendar);
$("#browser-reminder").addEventListener("change", toggleBrowserReminder);
$("#reminder-time").addEventListener("change", () => {
  if ($("#reminder-time").validity.valid) {
    state.prefs.reminderTime = $("#reminder-time").value;
    persist();
    $("#reminder-status").textContent =
      "已保存网页中的时间。已导入的日历不会自动更新，请在日历中修改原事件。";
  }
});
$("#pause-session").addEventListener("click", () =>
  session?.paused ? resumeSession() : pauseSession(),
);
$("#leave-session").addEventListener("click", () => {
  if (session?.phase === "intro" && session.index === 0) {
    goHome();
    return;
  }
  pauseSession();
  $("#leave-dialog").showModal();
});
$("#keep-playing").addEventListener("click", () => {
  $("#leave-dialog").close();
  resumeSession();
});
$("#confirm-leave").addEventListener("click", goHome);
$("#leave-dialog").addEventListener("cancel", () => {
  setTimeout(resumeSession, 0);
});
$("#clear-history").addEventListener("click", () => {
  if (!$("#clear-history").dataset.confirm) {
    $("#clear-history").dataset.confirm = "yes";
    $("#clear-history").textContent = "再次点击，确认清除全部本机记录";
    return;
  }
  state.history = [];
  persist();
  renderHistory();
  if (!session) renderHome();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseSession("你刚刚切走了页面，计时已暂停。");
  else if (!session) renderHome();
});
window.addEventListener("pagehide", () => pauseSession());
window.addEventListener("beforeunload", (event) => {
  if (session && !["summary", "intro"].includes(session.phase)) {
    event.preventDefault();
    event.returnValue = "";
  }
});
document.addEventListener("keydown", (event) => {
  if (
    !session ||
    $("dialog[open]") ||
    /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) ||
    event.repeat
  )
    return;
  if (
    event.key.toLowerCase() === "p" &&
    ["play", "break"].includes(session.phase)
  ) {
    event.preventDefault();
    session.paused ? resumeSession() : pauseSession();
    return;
  }
  if (session.phase !== "play" || session.paused) return;
  if (currentGame() === "stroop") {
    const answer = session.prefs.direction
      ? { ArrowLeft: 0, ArrowRight: 1 }[event.key]
      : /^[1-4]$/.test(event.key)
        ? Number(event.key) - 1
        : undefined;
    if (answer !== undefined) {
      event.preventDefault();
      answerInterference(answer);
    }
  } else if (currentGame() === "gonogo" && event.code === "Space") {
    event.preventDefault();
    answerShape();
  }
});
window.addEventListener("storage", (event) => {
  if (event.key !== KEY) return;
  const incoming = loadState(storage);
  if (!session) {
    state = incoming.state;
    renderHome();
  } else {
    state.history = incoming.state.history;
    state.lastNotified = incoming.state.lastNotified;
  }
});
$("#storage-warning").hidden = loaded.available;
renderHome();
setInterval(tick, 100);
setInterval(checkReminder, 15000);
