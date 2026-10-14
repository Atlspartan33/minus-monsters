import { describe, expect, it } from 'vitest';
import { CORE, FLUENT_BOX, TEENS, bossProblem, buildLightning, buildRound, keyOf, record, type Settings, type Stats } from './engine';
import { parseNumbers } from './voice';

const settings: Settings = { roundLen: 12, boss: 'auto', sound: false, readAloud: false, lightningLen: 15 };

// Small seeded RNG so failures reproduce.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function randomStats(r: () => number): Stats {
  const stats: Stats = {};
  for (const [a, b] of [...CORE, ...TEENS]) {
    if (r() < 0.3) continue;
    stats[keyOf(a, b)] = { seen: 3, right: 2, fast: 1, box: Math.floor(r() * 5), misses: Math.floor(r() * 3), lastMs: 3000, lastAt: 0 };
  }
  return stats;
}

describe('buildRound', () => {
  it('never throws and always returns a full round, for any history', () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const r = rng(seed);
      const stats = randomStats(r);
      const round = buildRound(stats, settings, Math.floor(r() * 20), r);
      expect(round.length).toBe(12);
      expect(round.every((p) => p.a - p.b === p.c && p.c >= 1)).toBe(true);
      expect(buildLightning(stats, { ...settings, lightningLen: 30 }, r).length).toBe(30);
    }
  });

  it('survives the case that crashed v1: exactly one easy fact', () => {
    const stats: Stats = {};
    for (const [a, b] of CORE) if (a <= 10) stats[keyOf(a, b)] = { seen: 1, right: 0, fast: 0, box: 0, misses: 1, lastMs: 9000, lastAt: 0 };
    stats[keyOf(5, 2)].box = FLUENT_BOX;
    expect(() => buildRound(stats, settings, 0, rng(7))).not.toThrow();
  });

  it('puts boss bites last and never repeats a fact in a round', () => {
    const round = buildRound({}, settings, 0, rng(3));
    expect(round.slice(-2).every((p) => p.boss)).toBe(true);
    const keys = round.filter((p) => !p.boss).map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('bossProblem', () => {
  it('always makes a valid two-digit problem with or without regrouping', () => {
    const r = rng(11);
    for (let i = 0; i < 3000; i++) {
      const borrow = bossProblem('borrow', 0, r);
      expect(borrow.a - borrow.b).toBeGreaterThanOrEqual(1);
      expect(borrow.a % 10).toBeLessThan(borrow.b % 10);
      const plain = bossProblem('noborrow', 0, r);
      expect(plain.a % 10).toBeGreaterThanOrEqual(plain.b % 10);
    }
  });
});

describe('record', () => {
  const p = { a: 13, b: 7, c: 6, answer: 6, kind: 'diff' as const, tier: 3 as const, key: '13-7', boss: false };
  it('only fast, clean answers climb the ladder', () => {
    let s = record({}, p, { firstTry: true, usedHelp: false, ms: 2000 });
    expect(s['13-7'].box).toBe(1);
    s = record(s, p, { firstTry: true, usedHelp: false, ms: 9000 });
    expect(s['13-7'].box).toBe(1);
    s = record(s, p, { firstTry: false, usedHelp: false, ms: 2000 });
    expect(s['13-7'].box).toBe(0);
  });
  it('a comeback right after a miss is capped at box 1', () => {
    const s = record({ '13-7': { seen: 4, right: 3, fast: 3, box: 0, misses: 1, lastMs: 0, lastAt: 0 } }, { ...p, comeback: true }, {
      firstTry: true,
      usedHelp: false,
      ms: 1000,
    });
    expect(s['13-7'].box).toBe(1);
  });
});

describe('parseNumbers', () => {
  it.each([
    ['6', [6]],
    ['six', [6]],
    ['twenty five', [25]],
    ['it is 8', [8]],
    ['ate', [8]],
    ['for', [4]],
    ['I want to go', []],
    ['wait for it', []],
    ['I ate it', []],
    ['thirteen minus seven', [13, 7]],
    ['um nine', [9]],
  ])('%s → %j', (text, nums) => {
    expect(parseNumbers(text)).toEqual(nums);
  });
});
