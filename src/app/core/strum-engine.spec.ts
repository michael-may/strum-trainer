import { TestBed } from '@angular/core/testing';
import { StrumEngine } from './strum-engine';

class FakeParam {
  setValueAtTime(): void {}
  exponentialRampToValueAtTime(): void {}
}

class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  type = '';
  buffer: unknown = null;
  onended: (() => void) | null = null;
  connect<T>(node: T): T {
    return node;
  }
  disconnect(): void {}
  start(): void {}
  stop(): void {}
}

class FakeAudioContext {
  static oscillators = 0;
  currentTime = 0;
  sampleRate = 44100;
  baseLatency = 0;
  outputLatency = 0;
  state = 'suspended';
  destination = new FakeNode();
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => undefined);
  createGain = () => new FakeNode();
  createBufferSource = () => new FakeNode();
  createBuffer = () => ({});
  createOscillator = () => {
    FakeAudioContext.oscillators++;
    return new FakeNode();
  };
}

class FakeSentinel extends EventTarget {
  released = false;
  release = vi.fn(async () => {
    this.released = true;
    this.dispatchEvent(new Event('release'));
  });
}

describe('StrumEngine', () => {
  let request: ReturnType<typeof vi.fn>;
  let sentinels: FakeSentinel[];

  beforeEach(() => {
    localStorage.clear();
    FakeAudioContext.oscillators = 0;
    sentinels = [];
    request = vi.fn(async () => {
      const s = new FakeSentinel();
      sentinels.push(s);
      return s;
    });
    vi.stubGlobal('AudioContext', FakeAudioContext);
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (navigator as { wakeLock?: unknown }).wakeLock;
  });

  function create(): StrumEngine {
    TestBed.configureTestingModule({});
    return TestBed.inject(StrumEngine);
  }

  it('requests the wake lock synchronously, within the start gesture', async () => {
    const engine = create();
    const started = engine.start();
    expect(request).toHaveBeenCalledWith('screen');
    await started;
    await vi.waitFor(() => expect(engine.screenLocked()).toBe(true));
    engine.stop();
  });

  it('schedules sounds and releases the wake lock on stop', async () => {
    const engine = create();
    await engine.start();
    await vi.waitFor(() => expect(engine.screenLocked()).toBe(true));
    // Metronome click + down "tock" on beat 1.
    expect(FakeAudioContext.oscillators).toBeGreaterThanOrEqual(2);

    engine.stop();
    expect(engine.playing()).toBe(false);
    expect(engine.screenLocked()).toBe(false);
    expect(sentinels[0].release).toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('re-acquires the lock if the system releases it while playing', async () => {
    const engine = create();
    await engine.start();
    await vi.waitFor(() => expect(engine.screenLocked()).toBe(true));

    await sentinels[0].release();
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(engine.screenLocked()).toBe(true));
    engine.stop();
  });

  it('reports the screen as not locked when the request is denied', async () => {
    request.mockRejectedValueOnce(new DOMException('Low Power Mode', 'NotAllowedError'));
    const engine = create();
    await engine.start();
    await Promise.resolve();
    expect(engine.playing()).toBe(true);
    expect(engine.screenLocked()).toBe(false);
    engine.stop();
  });
});
