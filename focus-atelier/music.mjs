// A single decoded loop; the audio clock owns fades even in background tabs.
// Only explicit gestures may unlock/resume audio. Async work never owns intent.
export class PracticeMusic {
  constructor({ url, onChange = () => {}, onInterrupt = () => {} }) {
    this.url = url;
    this.onChange = onChange;
    this.onInterrupt = onInterrupt;
    this.enabled = true;
    this.volume = 40;
    this.mode = "idle";
    this.status = "idle";
    this.revision = 0;
    this.held = false;
  }

  report(status) {
    this.status = status;
    this.onChange(status);
  }

  configure({ enabled, volume }) {
    this.enabled = enabled;
    this.volume = volume;
    return this.sync();
  }

  setMode(mode, { gesture = false, immediate = false } = {}) {
    this.mode = mode;
    if (gesture) this.held = false;
    return this.sync({ gesture, immediate });
  }

  get audible() {
    return (
      this.enabled &&
      this.volume > 0 &&
      !this.held &&
      ["practice", "soft", "preview"].includes(this.mode)
    );
  }

  ramp(value, seconds) {
    const ctx = this.context;
    if (!ctx) return;
    const now = ctx.currentTime;
    const param = this.gain.gain;
    // A suspended audio clock cannot run a fade. Clear its old automation so
    // the next user-initiated resume starts from silence, not a frozen gain.
    if (!seconds || ctx.state !== "running") {
      param.cancelScheduledValues(0);
      param.value = value;
      return;
    }
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else {
      const current = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(current, now);
    }
    param.linearRampToValueAtTime(value, now + seconds);
  }

  async load() {
    if (!this.bufferPromise) {
      this.bufferPromise = (async () => {
        const response = await fetch(this.url);
        if (!response.ok) throw new Error("Music unavailable");
        return this.context.decodeAudioData(await response.arrayBuffer());
      })().catch((error) => {
        this.bufferPromise = null;
        throw error;
      });
    }
    return this.bufferPromise;
  }

  async sync({ gesture = false, immediate = false } = {}) {
    const revision = ++this.revision;
    clearTimeout(this.suspendTimer);
    if (!this.audible) {
      const seconds = immediate ? 0 : this.mode === "ending" ? 2.4 : 0.3;
      this.ramp(0, seconds);
      const suspend = () => {
        if (revision !== this.revision) return;
        // Invoking suspend is synchronous; a new gesture may resume while its
        // promise settles. Never chain a stale suspend after an awaited task.
        this.context?.suspend().catch(() => {});
      };
      if (seconds) this.suspendTimer = setTimeout(suspend, seconds * 1000 + 40);
      else suspend();
      this.report(!this.enabled || this.volume === 0 ? "muted" : "idle");
      return;
    }
    try {
      if (!this.context) {
        if (!gesture) return;
        const AudioContext =
          globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) throw new Error("Audio unsupported");
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.gain.gain.value = 0;
        this.gain.connect(this.context.destination);
        this.context.addEventListener("statechange", () => {
          if (
            this.context.state === "interrupted" ||
            (this.context.state === "suspended" && this.source && this.audible)
          ) {
            this.held = true;
            ++this.revision;
            clearTimeout(this.suspendTimer);
            this.ramp(0, 0);
            this.context.suspend().catch(() => {});
            this.report("blocked");
            this.onInterrupt();
          }
        });
      }
      const ctx = this.context;
      // resume() must be called in the click stack, before fetching/decoding.
      const resumed = gesture ? ctx.resume() : Promise.resolve();
      this.report("loading");
      const [buffer] = await Promise.all([this.load(), resumed]);
      if (revision !== this.revision || !this.audible) return;
      if (ctx.state !== "running") {
        this.report("blocked");
        return;
      }
      if (!this.source) {
        this.source = ctx.createBufferSource();
        this.source.buffer = buffer;
        this.source.loop = true;
        this.source.connect(this.gain);
        this.source.start();
      }
      const target =
        (this.volume / 100) * 0.7 * (this.mode === "soft" ? 0.55 : 1);
      this.ramp(target, gesture ? 1.4 : 0.8);
      this.report("playing");
    } catch {
      if (revision !== this.revision) return;
      this.ramp(0, 0);
      this.context?.suspend().catch(() => {});
      this.report("blocked");
    }
  }
}
