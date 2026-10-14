// Problem generation + adaptive practice.
// Facts are tracked one by one in a 5-box Leitner ladder. A fact climbs a box only when
// it's answered first try, without help, and fast — that's what "fluent" means here.
// Nothing on screen ever shows a timer; speed only earns bonus stars.

export type Tier = 1 | 2 | 3 | 4 | 5;
export type Kind = 'diff' | 'missing';

export interface Problem {
  a: number;
  b: number;
  c: number; // a − b
  answer: number; // c for 'diff', b for 'missing'
  kind: Kind;
  tier: Tier;
  key: string;
  boss: boolean;
  comeback?: boolean;
}

export interface FactStat {
  seen: number;
  right: number; // first try, no help
  fast: number;
  box: number; // 0..4, fluent at 3+
  misses: number;
  lastMs: number;
  lastAt: number;
}
export type Stats = Record<string, FactStat>;

export type BossMode = 'off' | 'auto' | 'noborrow' | 'borrow';
export interface Settings {
  roundLen: number;
  boss: BossMode;
  sound: boolean;
  readAloud: boolean;
  lightningLen: number;
}

export const FAST_MS = 4000;
export const FLUENT_BOX = 3;

export const TIER_INFO: Record<Tier, { name: string; example: string }> = {
  1: { name: 'Within 10', example: '9 − 4' },
  2: { name: 'Teens, no crossing', example: '17 − 4' },
  3: { name: 'Crossing ten', example: '13 − 7' },
  4: { name: 'Two-digit, no regrouping', example: '68 − 25' },
  5: { name: 'Two-digit, regrouping', example: '52 − 27' },
};

export const keyOf = (a: number, b: number) => `${a}-${b}`;

export function tierOf(a: number, b: number): Tier {
  if (a <= 10) return 1;
  if (a < 20) return a % 10 >= b ? 2 : 3;
  return a % 10 >= b % 10 ? 4 : 5;
}

// The 81 classic facts: subtract 1–9, answer 1–9.
export const CORE: [number, number][] = [];
for (let b = 1; b <= 9; b++) for (let d = 1; d <= 9; d++) CORE.push([b + d, b]);
// Easy teens (17 − 4): answer is 10+, no crossing.
export const TEENS: [number, number][] = [];
for (let a = 11; a <= 19; a++) for (let b = 1; b <= a % 10; b++) TEENS.push([a, b]);
const FACT_POOL = [...CORE, ...TEENS];

export function factsInTier(t: Tier): [number, number][] {
  return FACT_POOL.filter(([a, b]) => tierOf(a, b) === t);
}

export function make(a: number, b: number, kind: Kind = 'diff', boss = false): Problem {
  const c = a - b;
  return { a, b, c, answer: kind === 'diff' ? c : b, kind, tier: tierOf(a, b), key: keyOf(a, b), boss };
}

const rint = (lo: number, hi: number, rng: () => number) => lo + Math.floor(rng() * (hi - lo + 1));

function weightOf(stats: Stats, a: number, b: number) {
  const s = stats[keyOf(a, b)];
  const t = tierOf(a, b);
  let w = s ? [6, 4, 2, 1, 0.35][s.box] : t === 1 ? 1.2 : t === 2 ? 1.6 : 4;
  if (t === 3) w *= 1.8; // crossing ten is the target
  if (s && s.misses > 0 && s.box < 2) w *= 1.5;
  return w;
}

function weightedPick<T>(items: T[], w: (x: T) => number, rng: () => number): T {
  if (items.length === 0) throw new Error('weightedPick: empty pool');
  const ws = items.map(w);
  let r = rng() * ws.reduce((s, x) => s + x, 0);
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function bossProblem(mode: BossMode, bossWins: number, rng = Math.random): Problem {
  const borrow =
    mode === 'borrow' ? true : mode === 'noborrow' ? false : bossWins >= 10 ? rng() < 0.75 : bossWins >= 4 ? rng() < 0.4 : false;
  for (;;) {
    const a = rint(31, 98, rng);
    const ta = Math.floor(a / 10);
    const oa = a % 10;
    let b: number;
    if (borrow) {
      if (oa === 9) continue;
      b = rint(1, ta - 1, rng) * 10 + rint(oa + 1, 9, rng);
    } else {
      const v = rng();
      if (v < 0.2) b = rint(1, ta - 1, rng) * 10; // 70 − 30
      else if (v < 0.35 && oa > 0) b = rint(1, oa, rng); // 47 − 3
      else b = rint(1, ta - 1, rng) * 10 + rint(0, oa, rng); // 68 − 25
    }
    if (a - b >= 1 && b >= 1) return make(a, b, 'diff', true);
  }
}

export function buildRound(stats: Stats, settings: Settings, bossWins: number, rng = Math.random): Problem[] {
  const bossN = settings.boss === 'off' ? 0 : 2;
  const regular = Math.max(4, settings.roundLen - bossN);
  const used = new Set<string>();
  const out: Problem[] = [];

  const kindFor = (a: number, b: number): Kind => {
    const s = stats[keyOf(a, b)];
    const t = tierOf(a, b);
    if (!s) return 'diff';
    if (t === 3 && s.box >= 2 && rng() < 0.3) return 'missing';
    if (t === 1 && s.box >= 3 && rng() < 0.2) return 'missing';
    return 'diff';
  };

  // Two warm-ups she can win, so a round never opens on a wall.
  const easy = FACT_POOL.filter(([a, b]) => {
    const s = stats[keyOf(a, b)];
    return s ? s.box >= FLUENT_BOX : tierOf(a, b) === 1 && a - b > 1;
  });
  for (let i = 0; i < 2; i++) {
    const left = easy.filter(([x, y]) => !used.has(keyOf(x, y)));
    if (!left.length) break;
    const [a, b] = weightedPick(left, () => 1, rng);
    used.add(keyOf(a, b));
    out.push(make(a, b));
  }
  while (out.length < regular) {
    const pool = FACT_POOL.filter(([a, b]) => !used.has(keyOf(a, b)));
    if (!pool.length) break;
    const [a, b] = weightedPick(pool, ([x, y]) => weightOf(stats, x, y), rng);
    used.add(keyOf(a, b));
    out.push(make(a, b, kindFor(a, b)));
  }
  // Shuffle everything after the warm-ups.
  const rest = out.splice(2);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  out.push(...rest);
  for (let i = 0; i < bossN; i++) out.push(bossProblem(settings.boss, bossWins, rng));
  return out;
}

export interface Attempt {
  firstTry: boolean;
  usedHelp: boolean;
  ms: number;
  /** Spoken answer: ms runs to when she started talking, so there's no typing time in it. */
  voice?: boolean;
}

export const VOICE_FAST_MS = 3000;

export const isSpeedy = (p: Problem, at: Attempt) =>
  at.firstTry && !at.usedHelp && at.ms <= (at.voice ? VOICE_FAST_MS : FAST_MS * (p.boss ? 3 : p.kind === 'missing' ? 1.5 : 1));

/** Lightning Round: basic facts only, all "a − b = ?" so they're easy to say. */
export function buildLightning(stats: Stats, settings: Settings, rng = Math.random): Problem[] {
  const n = Math.min(40, Math.max(5, settings.lightningLen || 15));
  return buildRound(stats, { ...settings, roundLen: n, boss: 'off' }, 0, rng).map((p) => make(p.a, p.b));
}

export function record(stats: Stats, p: Problem, at: Attempt): Stats {
  const prev = stats[p.key] ?? { seen: 0, right: 0, fast: 0, box: 0, misses: 0, lastMs: 0, lastAt: 0 };
  const s = { ...prev, seen: prev.seen + 1, lastMs: at.ms, lastAt: Date.now() };
  if (at.firstTry && !at.usedHelp && p.comeback) {
    // Right after seeing it moments ago: good, but not proof it's in long-term memory.
    s.right++;
    s.box = Math.max(s.box, 1);
  } else if (at.firstTry && !at.usedHelp) {
    s.right++;
    if (isSpeedy(p, at)) {
      s.fast++;
      s.box = Math.min(4, s.box + 1);
    } else s.box = Math.max(s.box, 1);
    s.misses = Math.max(0, s.misses - 1);
  } else {
    s.misses++;
    s.box = 0;
  }
  return { ...stats, [p.key]: s };
}

export function tierFluency(stats: Stats, t: Tier) {
  const facts = factsInTier(t);
  let seen = 0;
  let fluent = 0;
  for (const [a, b] of facts) {
    const s = stats[keyOf(a, b)];
    if (!s) continue;
    seen++;
    if (s.box >= FLUENT_BOX) fluent++;
  }
  return { total: facts.length, seen, fluent };
}

export const opText = (p: Problem) =>
  p.kind === 'diff' ? `${p.a} minus ${p.b}` : `${p.a} minus what equals ${p.c}`;
