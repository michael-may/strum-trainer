import { DestroyRef, Service, inject, signal } from '@angular/core';
import { STEPS_PER_BEAT, stepDirection } from './pattern';
import { SettingsStore } from './settings-store';
import { playSound } from './sounds';

interface ScheduledStep {
  time: number;
  step: number;
  steps: number;
  duration: number;
}

export interface PlayPosition {
  /** Step (eighth note) currently sounding. */
  step: number;
  /** Steps in the bar when this step was scheduled. */
  steps: number;
  /** Progress through the current step, 0–1. */
  fraction: number;
}

const TICK_MS = 25;
const LOOKAHEAD_S = 0.12;
/** Background tabs throttle timers to ~1s, so schedule further ahead while hidden. */
const HIDDEN_LOOKAHEAD_S = 1.5;
const START_DELAY_S = 0.1;
const HISTORY_S = 2;
/** Cap on how far the interpolated clock may run ahead of a stalled `currentTime`. */
const MAX_EXTRAPOLATION_S = 0.1;

/** Safari 17+: play Web Audio even when the iPhone ring/silent switch is set to silent. */
function usePlaybackAudioSession(): void {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) session.type = 'playback';
}

/** iOS only unlocks audio once something is played inside a user gesture. */
function unlockAudio(ctx: AudioContext): void {
  const source = ctx.createBufferSource();
  source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  source.connect(ctx.destination);
  source.start();
}

/**
 * Lookahead scheduler on the Web Audio clock ("A Tale of Two Clocks"): a coarse JS timer
 * queues sounds a little ahead at sample-accurate times, and the visualizer reads the same
 * clock so the playhead stays in sync with what is heard.
 */
@Service()
export class StrumEngine {
  private readonly settings = inject(SettingsStore);

  private readonly playingState = signal(false);
  readonly playing = this.playingState.asReadonly();

  private readonly screenLockState = signal(false);
  /** Whether the screen is currently being kept awake. */
  readonly screenLocked = this.screenLockState.asReadonly();

  private ctx?: AudioContext;
  private output?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private nextTime = 0;
  private nextStep = 0;
  private history: ScheduledStep[] = [];
  private wakeLock?: WakeLockSentinel;
  private wakeLockRequest?: Promise<void>;
  private clockAnchor = { context: -1, perf: 0 };
  private lastAudibleTime = 0;

  constructor() {
    const onVisibility = () => {
      if (document.hidden || !this.playing()) return;
      void this.acquireWakeLock();
      // iOS suspends/"interrupts" the context in the background or during calls.
      if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisibility);
      this.stop();
      void this.ctx?.close();
    });
  }

  toggle(): void {
    if (this.playing()) this.stop();
    else void this.start();
  }

  async start(): Promise<void> {
    if (this.playing()) return;
    this.playingState.set(true);

    // Everything up to the first await runs inside the click/tap gesture, which iOS requires.
    void this.acquireWakeLock();
    usePlaybackAudioSession();
    const ctx = (this.ctx ??= new AudioContext({ latencyHint: 'interactive' }));
    unlockAudio(ctx);
    await ctx.resume();
    if (!this.playing()) return;

    this.output = ctx.createGain();
    this.output.connect(ctx.destination);
    this.nextStep = 0;
    this.nextTime = ctx.currentTime + START_DELAY_S;
    this.history = [];
    this.lastAudibleTime = 0;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  stop(): void {
    this.playingState.set(false);
    clearInterval(this.timer);
    this.timer = undefined;
    // Drop the output so already-queued sounds are silenced immediately.
    this.output?.disconnect();
    this.output = undefined;
    this.history = [];
    this.releaseWakeLock();
  }

  /** Where the audible playhead is right now, or null when stopped / before the first step. */
  position(): PlayPosition | null {
    if (!this.ctx || !this.playing()) return null;
    const now = this.audibleTime(this.ctx);
    let current: ScheduledStep | undefined;
    for (const s of this.history) {
      if (s.time > now) break;
      current = s;
    }
    if (!current) return null;
    return {
      step: current.step,
      steps: current.steps,
      fraction: Math.min(1, (now - current.time) / current.duration),
    };
  }

  private schedule(): void {
    const ctx = this.ctx;
    const output = this.output;
    if (!ctx || !output) return;

    // If the timer stalled (e.g. device sleep), resync rather than flood past notes.
    if (this.nextTime < ctx.currentTime - 0.05) this.nextTime = ctx.currentTime + 0.05;

    const horizon = ctx.currentTime + (document.hidden ? HIDDEN_LOOKAHEAD_S : LOOKAHEAD_S);
    while (this.nextTime < horizon) {
      const pattern = this.settings.pattern();
      const steps = pattern.length;
      if (this.nextStep >= steps) this.nextStep = 0;
      const step = this.nextStep;
      const time = this.nextTime;
      const duration = 60 / this.settings.bpm() / STEPS_PER_BEAT;
      const direction = stepDirection(step);

      if (direction === 'down' && this.settings.metronome()) {
        playSound(ctx, output, step === 0 ? 'accent' : 'click', time);
      }
      if (pattern[step]) {
        if (direction === 'down' && this.settings.downSound()) playSound(ctx, output, 'tock', time);
        if (direction === 'up' && this.settings.upSound()) playSound(ctx, output, 'tick', time);
      }

      this.history.push({ time, step, steps, duration });
      this.nextTime += duration;
      this.nextStep = (step + 1) % steps;
    }

    const cutoff = ctx.currentTime - HISTORY_S;
    while (this.history.length > 1 && this.history[1].time < cutoff) this.history.shift();
  }

  /** Context time of the sample currently reaching the speakers. */
  private audibleTime(ctx: AudioContext): number {
    const ts = ctx.getOutputTimestamp?.();
    if (ts?.contextTime !== undefined && ts.performanceTime) {
      return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    }
    // Safari lacks getOutputTimestamp and its currentTime advances in render-buffer-sized
    // jumps, so interpolate between updates for a smooth playhead.
    const perf = performance.now();
    if (ctx.currentTime !== this.clockAnchor.context) {
      this.clockAnchor = { context: ctx.currentTime, perf };
    }
    const elapsed = Math.min(MAX_EXTRAPOLATION_S, (perf - this.clockAnchor.perf) / 1000);
    const latency = ctx.outputLatency || ctx.baseLatency || 0;
    this.lastAudibleTime = Math.max(
      this.lastAudibleTime,
      this.clockAnchor.context + elapsed - latency,
    );
    return this.lastAudibleTime;
  }

  /**
   * Keep the screen on while playing via the Screen Wake Lock API (iOS 16.4+, home-screen
   * apps 18.4+). The system drops the lock when the page is hidden or on low battery, so it
   * is re-requested on `release` and when the page becomes visible again.
   */
  private acquireWakeLock(): Promise<void> {
    if (this.wakeLock || !('wakeLock' in navigator)) return Promise.resolve();
    return (this.wakeLockRequest ??= navigator.wakeLock
      .request('screen')
      .then((lock) => {
        if (!this.playing()) {
          void lock.release();
          return;
        }
        this.wakeLock = lock;
        this.screenLockState.set(true);
        lock.addEventListener('release', () => {
          if (this.wakeLock !== lock) return;
          this.wakeLock = undefined;
          this.screenLockState.set(false);
          if (this.playing() && !document.hidden) void this.acquireWakeLock();
        });
      })
      .catch(() => undefined) // Denied (e.g. Low Power Mode); the UI shows a hint.
      .finally(() => (this.wakeLockRequest = undefined)));
  }

  private releaseWakeLock(): void {
    const lock = this.wakeLock;
    this.wakeLock = undefined;
    this.screenLockState.set(false);
    void lock?.release().catch(() => undefined);
  }
}
