import {
  clampBpm,
  defaultPattern,
  fitPattern,
  formatPattern,
  parsePattern,
  stepDirection,
  stepLabel,
} from './pattern';

describe('pattern helpers', () => {
  it('default pattern enables every down and up strum of the bar', () => {
    expect(formatPattern(defaultPattern(4))).toBe('DUDUDUDU');
    expect(defaultPattern(3)).toHaveLength(6);
  });

  it('labels steps as counted ("1 & 2 & …")', () => {
    expect([0, 1, 2, 3, 6].map(stepLabel)).toEqual(['1', '&', '2', '&', '4']);
    expect(stepDirection(0)).toBe('down');
    expect(stepDirection(5)).toBe('up');
  });

  it('fits a pattern to a new time signature, keeping existing steps', () => {
    const p = parsePattern('D-DU-UDU');
    expect(formatPattern(fitPattern(p, 3))).toBe('D-DU-U');
    expect(formatPattern(fitPattern(p, 5))).toBe('D-DU-UDUDU');
  });

  it('round-trips the compact text form', () => {
    expect(formatPattern(parsePattern('D--UDU-U'))).toBe('D--UDU-U');
  });

  it('clamps BPM to the supported range', () => {
    expect(clampBpm(5)).toBe(30);
    expect(clampBpm(999)).toBe(300);
    expect(clampBpm(90.4)).toBe(90);
    expect(clampBpm(NaN)).toBe(30);
  });
});
