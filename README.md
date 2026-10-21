# [Slop Coded] Strum Trainer

A browser-based guitar strumming trainer built with Angular (signals, zoneless). It works offline as an installable PWA.

## Features

- **Tempo**: BPM from 30 to 300 (default 90), with ± buttons and a slider. There's also **Tap tempo**: tap along with a song and the BPM is set from your last few taps. A pause of 2 s or more starts a new count.
- **Time signature**: 1–12 beats over 2, 4 or 8 (default 4/4).
- **Metronome**: on by default. Beat 1 gets an accented click.
- **Strum pattern editor**: one bar of eighth notes (`1 & 2 & …`) that always matches the time signature. Click a step to turn that down or up strum on or off. **Default** turns every step on again.
- **Pattern library**: built-in presets, plus your own named patterns that you can save, load and delete.
- **Visualizer**: shows the bar's strums as direction arrows. A playhead line sweeps across the bar in time with the audio.
- **Sounds**: a synthesized "tock" for down strums (on by default) and a "tick" for up strums (off by default). Both are made with the Web Audio API, so the app needs no sound files.
- **Settings**: saved to `localStorage`. Press <kbd>Space</kbd> to start or stop.
- **Screen stays awake** while playing, using the Screen Wake Lock API. If the system refuses (for example in Low Power Mode), a hint appears.

## iPhone notes

- **Layout**: on phones the controls compact into a short header. In landscape they move to a sidebar next to the visualizer.
- **Audio**: plays even with the ring/silent switch on silent (iOS 17+, via `navigator.audioSession`). Audio resumes after interruptions such as calls or backgrounding.
- **Keeping the screen on**: needs iOS 16.4+ in Safari, or iOS 18.4+ when installed to the Home Screen. On older versions, raise _Settings › Display & Brightness › Auto-Lock_ instead.

## Commands

```bash
npm start        # dev server at http://localhost:4200
npm run build    # production build to dist/strum-trainer
npm test         # unit tests (Vitest)
```

## Deployment

On every push to `main`, [.github/workflows/deploy.yml](.github/workflows/deploy.yml) runs the tests, builds the app and publishes it to GitHub Pages. One-time setup: in the repository, go to **Settings › Pages** and set **Source** to **GitHub Actions**.

## Layout

- `src/app/core/`: framework-light logic
  - pattern helpers
  - settings and pattern-library stores (signals + `localStorage`)
  - Web Audio scheduler (`StrumEngine`) and synthesized sounds
- `src/app/components/`
  - `transport`: play/stop, BPM, time signature and sound toggles
  - `visualizer`: the synced playhead and strum arrows
  - `pattern-editor`: the step toggles
  - `pattern-library`: presets and saved patterns

Audio timing uses a lookahead scheduler on the `AudioContext` clock. The visualizer reads that same clock (`getOutputTimestamp`), which keeps the playhead in sync with what you hear.
