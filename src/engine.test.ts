import { describe, expect, it } from 'vitest';
import {
  CORE,
  FLUENT_BOX,
  TEENS,
  bossProblem,
  buildLightning,
  buildRound,
  factLabel,
  factPool,
  factsInTier,
  keyOf,
  parseKey,
  record,
  unlockedTiers,
  type Settings,
  type Stats,
} from './engine';
import { parseNumbers } from 'kid-voice';

const settings: Settings = { roundLen: 12, boss: 'auto', sound: false, readAloud: false, lightningLen: 15, voice: true, op: 'sub', ops: ['sub', 'add', 'mul', 'div'] };

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
  const p = { op: 'sub' as const, a: 13, b: 7, c: 6, answer: 6, kind: 'diff' as const, tier: 3 as const, key: '13-7', boss: false };
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
    ['one hundred', [100]],
    ['hundred', [100]],
    ['forty two divided by seven is six', [42, 7, 6]],
    ['it is 8', [8]],
    ['ate', [8]],
    ['for', [4]],
    ['I want to go', []],
    ['wait for it', []],
    ['I ate it', []],
    ['thirteen minus seven', [13, 7]],
    ['um nine', [9]],
    ['Kevin', [7]],
    ['8th', [8]],
    ['fine', [5]],
    ['then I said it', []],
  ])('%s → %j', (text, nums) => {
    expect(parseNumbers(text)).toEqual(nums);
  });
});

describe('the other tracks', () => {
  const ops = ['add', 'mul', 'div'] as const;
  it('every track builds valid full rounds for any history', () => {
    for (const op of ops) {
      for (let seed = 1; seed <= 400; seed++) {
        const r = rng(seed);
        const stats: Stats = {};
        for (const [a, b] of factPool(op)) {
          if (r() < 0.4) continue;
          stats[keyOf(a, b, op)] = { seen: 3, right: 2, fast: 1, box: Math.floor(r() * 5), misses: Math.floor(r() * 3), lastMs: 3000, lastAt: 0 };
        }
        const round = buildRound(stats, { ...settings, op }, Math.floor(r() * 20), r);
        expect(round.length).toBe(12);
        for (const p of round) {
          expect(p.op).toBe(op);
          const c = op === 'add' ? p.a + p.b : op === 'mul' ? p.a * p.b : p.a / p.b;
          expect(p.c).toBe(c);
          expect(Number.isInteger(p.c) && p.c >= 1).toBe(true);
          expect(p.answer).toBe(p.kind === 'diff' ? p.c : p.b);
        }
        expect(round.filter((p) => p.mini).length).toBe(1);
        expect(buildLightning(stats, { ...settings, op, lightningLen: 20 }, r).every((p) => p.op === op && p.kind === 'diff')).toBe(true);
      }
    }
  });

  it('a new times player only gets the friendly tables', () => {
    const round = buildRound({}, { ...settings, op: 'mul', boss: 'off' }, 0, rng(5));
    expect(round.every((p) => p.tier === 1)).toBe(true);
    expect(unlockedTiers({}, 'mul')).toEqual([1]);
  });

  it('times opens the next tables once the friendly ones are fluent', () => {
    const stats: Stats = {};
    for (const [a, b] of factsInTier(1, 'mul')) stats[keyOf(a, b, 'mul')] = { seen: 3, right: 3, fast: 3, box: 3, misses: 0, lastMs: 1000, lastAt: 0 };
    expect(unlockedTiers(stats, 'mul')).toEqual([1, 2]);
  });

  it('boss bites stay in range on every track', () => {
    const r = rng(19);
    for (let i = 0; i < 2000; i++) {
      const add = bossProblem(i % 2 ? 'borrow' : 'noborrow', 0, r, 'add');
      expect(add.c).toBeLessThanOrEqual(99);
      expect(add.b).toBeGreaterThanOrEqual(10);
      expect(add.tier).toBe(i % 2 ? 5 : 4);
      const mul = bossProblem('auto', 0, r, 'mul');
      expect(mul.c).toBeLessThanOrEqual(90);
      const div = bossProblem('auto', 0, r, 'div');
      expect(Number.isInteger(div.c) && div.c >= 10).toBe(true);
    }
  });

  it('keys round-trip and old subtraction keys still read', () => {
    expect(keyOf(13, 7)).toBe('13-7');
    expect(factLabel('13-7')).toBe('13 − 7');
    expect(factLabel(keyOf(6, 7, 'mul'))).toBe('6 × 7');
    expect(factLabel(keyOf(42, 7, 'div'))).toBe('42 ÷ 7');
    expect(parseKey(keyOf(8, 5, 'add'))).toEqual({ op: 'add', a: 8, b: 5 });
  });
});

describe('round shape', () => {
  it('the two boss bites differ and a new player gets a meaty mini boss', () => {
    for (const op of ['sub', 'add', 'mul', 'div'] as const) {
      for (let seed = 1; seed <= 200; seed++) {
        const round = buildRound({}, { ...settings, op }, 0, rng(seed));
        const [b1, b2] = round.filter((p) => p.boss);
        expect(b1.key).not.toBe(b2.key);
        const mini = round.find((p) => p.mini)!;
        expect(mini.c).toBeGreaterThan(1);
        if (op === 'mul') expect(Math.min(mini.a, mini.b)).toBeGreaterThan(1);
      }
    }
  });
});
