/** Tiny synthesized percussion voices; no audio files needed. */

interface Voice {
  type: OscillatorType;
  startHz: number;
  endHz: number;
  gain: number;
  decay: number;
}

const VOICES = {
  /** Down strum: low woodblock "tock". */
  tock: { type: 'triangle', startHz: 420, endHz: 180, gain: 0.9, decay: 0.12 },
  /** Up strum: short high "tick". */
  tick: { type: 'triangle', startHz: 2200, endHz: 1600, gain: 0.45, decay: 0.05 },
  /** Metronome click on beat 1. */
  accent: { type: 'square', startHz: 1500, endHz: 1500, gain: 0.18, decay: 0.03 },
  /** Metronome click on other beats. */
  click: { type: 'square', startHz: 1000, endHz: 1000, gain: 0.12, decay: 0.03 },
} satisfies Record<string, Voice>;

export type SoundName = keyof typeof VOICES;

export function playSound(
  ctx: BaseAudioContext,
  destination: AudioNode,
  name: SoundName,
  when: number,
): void {
  const v: Voice = VOICES[name];
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = v.type;
  osc.frequency.setValueAtTime(v.startHz, when);
  if (v.endHz !== v.startHz) osc.frequency.exponentialRampToValueAtTime(v.endHz, when + v.decay);
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(v.gain, when + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, when + v.decay);
  osc.connect(env).connect(destination);
  osc.start(when);
  osc.stop(when + v.decay + 0.02);
  osc.onended = () => env.disconnect();
}
