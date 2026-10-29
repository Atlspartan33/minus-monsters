// Problem generation + adaptive practice.
// Facts are tracked one by one in a 5-box Leitner ladder. A fact climbs a box only when
// it's answered first try, without help, and fast — that's what "fluent" means here.
// Nothing on screen ever shows a timer; speed only earns bonus stars.
// Four tracks (− + × ÷) share the ladder; each fact's key carries its operation.

export type Tier = 1 | 2 | 3 | 4 | 5;
export type Kind = 'diff' | 'missing';
export type Op = 'sub' | 'add' | 'mul' | 'div';
export const OPS: Op[] = ['sub', 'add', 'mul', 'div'];

export const OP_INFO: Record<Op, { sym: string; word: string; name: string }> = {
  sub: { sym: '−', word: 'minus', name: 'Minus' },
  add: { sym: '+', word: 'plus', name: 'Plus' },
  mul: { sym: '×', word: 'times', name: 'Times' },
  div: { sym: '÷', word: 'divided by', name: 'Share' },
};

export interface Problem {
  op: Op;
  a: number;
  b: number;
  c: number; // a op b
  answer: number; // c for 'diff', b for 'missing'
  kind: Kind;
  tier: Tier;
  key: string;
  boss: boolean;
  /** One per round: her shakiest fact, given a small boss entrance and a bonus star. */
  mini?: boolean;
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
  /** Lightning Round listens for spoken answers. */
  voice: boolean;
  /** The track she's playing. */
  op: Op;
  /** Tracks a grown-up has switched on. */
  ops: Op[];
}

export const FAST_MS = 4000;
export const FLUENT_BOX = 3;

export const TIER_INFO: Record<Op, Partial<Record<Tier, { name: string; example: string }>>> = {
  sub: {
    1: { name: 'Within 10', example: '9 − 4' },
    2: { name: 'Teens, no crossing', example: '17 − 4' },
    3: { name: 'Crossing ten', example: '13 − 7' },
    4: { name: 'Two-digit, no regrouping', example: '68 − 25' },
    5: { name: 'Two-digit, regrouping', example: '52 − 27' },
  },
  add: {
    1: { name: 'Within 10', example: '6 + 3' },
    2: { name: 'Teens, no crossing', example: '12 + 5' },
    3: { name: 'Crossing ten', example: '8 + 5' },
    4: { name: 'Two-digit, no regrouping', example: '34 + 25' },
    5: { name: 'Two-digit, regrouping', example: '38 + 27' },
  },
  mul: {
    1: { name: 'Times 1, 2 and 10', example: '7 × 2' },
    2: { name: 'Times 3 and 5', example: '4 × 5' },
    3: { name: 'Times 4, 6, 7, 8, 9', example: '6 × 7' },
    4: { name: 'Tens times', example: '3 × 20' },
  },
  div: {
    1: { name: 'Share by 1, 2 and 10', example: '14 ÷ 2' },
    2: { name: 'Share by 3 and 5', example: '15 ÷ 5' },
    3: { name: 'Share by 4, 6, 7, 8, 9', example: '42 ÷ 7' },
    4: { name: 'Sharing tens', example: '60 ÷ 3' },
  },
};

/** Tiers that are single facts (the rest are boss bites). */
export const FACT_TIERS: Tier[] = [1, 2, 3];

const OP_KEY: Record<Op, string> = { sub: '-', add: '+', mul: 'x', div: '/' };
// Subtraction keys stay "13-7" so saves from before the other tracks keep their progress.
export const keyOf = (a: number, b: number, op: Op = 'sub') => `${a}${OP_KEY[op]}${b}`;

export function parseKey(key: string): { op: Op; a: number; b: number } | null {
  const m = key.match(/^(\d+)([-+x/])(\d+)$/);
  if (!m) return null;
  const op = OPS.find((o) => OP_KEY[o] === m[2])!;
  return { op, a: Number(m[1]), b: Number(m[3]) };
}

export const factLabel = (key: string) => {
  const k = parseKey(key);
  return k ? `${k.a} ${OP_INFO[k.op].sym} ${k.b}` : key;
};

// How friendly a times table is: 1, 2 and 10 first; 3 and 5 next; the rest last.
const table = (n: number): Tier => (n === 1 || n === 2 || n === 10 ? 1 : n === 3 || n === 5 ? 2 : 3);

export function tierOf(a: number, b: number, op: Op = 'sub'): Tier {
  switch (op) {
    case 'sub':
      if (a <= 10) return 1;
      if (a < 20) return a % 10 >= b ? 2 : 3;
      return a % 10 >= b % 10 ? 4 : 5;
    case 'add':
      if (a >= 10 && b >= 10) return (a % 10) + (b % 10) <= 9 ? 4 : 5;
      if (a + b <= 10) return 1;
      if (a > 10) return (a % 10) + b <= 9 ? 2 : 3;
      return 3;
    case 'mul':
      if (a > 10 || b > 10) return 4;
      return Math.min(table(a), table(b)) as Tier;
    case 'div':
      if (a / b > 10) return 4;
      return Math.min(table(b), table(a / b)) as Tier;
  }
}

// The 81 classic facts: subtract 1–9, answer 1–9.
export const CORE: [number, number][] = [];
for (let b = 1; b <= 9; b++) for (let d = 1; d <= 9; d++) CORE.push([b + d, b]);
// Easy teens (17 − 4): answer is 10+, no crossing.
export const TEENS: [number, number][] = [];
for (let a = 11; a <= 19; a++) for (let b = 1; b <= a % 10; b++) TEENS.push([a, b]);
// Addition: the 81 single-digit facts plus easy teens (12 + 5).
const ADD: [number, number][] = [];
for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) ADD.push([a, b]);
for (let a = 11; a <= 18; a++) for (let b = 1; b <= 9 - (a % 10); b++) ADD.push([a, b]);
// Times tables 1–10, and sharing as their inverse (14 ÷ 2 from 7 × 2).
const MUL: [number, number][] = [];
for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) MUL.push([a, b]);
const DIV: [number, number][] = MUL.map(([q, d]) => [q * d, d]);

const POOLS: Record<Op, [number, number][]> = { sub: [...CORE, ...TEENS], add: ADD, mul: MUL, div: DIV };
export const factPool = (op: Op) => POOLS[op];

export function factsInTier(t: Tier, op: Op = 'sub'): [number, number][] {
  return POOLS[op].filter(([a, b]) => tierOf(a, b, op) === t);
}

const calc = (a: number, b: number, op: Op) => (op === 'sub' ? a - b : op === 'add' ? a + b : op === 'mul' ? a * b : a / b);

export function make(a: number, b: number, kind: Kind = 'diff', boss = false, op: Op = 'sub'): Problem {
  const c = calc(a, b, op);
  return { op, a, b, c, answer: kind === 'diff' ? c : b, kind, tier: tierOf(a, b, op), key: keyOf(a, b, op), boss };
}

/** Times and Share open a harder table only once most of the easier one is fluent. */
export function unlockedTiers(stats: Stats, op: Op): Tier[] {
  if (op === 'sub' || op === 'add') return FACT_TIERS;
  const out: Tier[] = [1];
  for (const t of [2, 3] as Tier[]) {
    const f = tierFluency(stats, (t - 1) as Tier, op);
    if (f.fluent / f.total < 0.6) break;
    out.push(t);
  }
  return out;
}

const rint = (lo: number, hi: number, rng: () => number) => lo + Math.floor(rng() * (hi - lo + 1));

function weightOf(stats: Stats, a: number, b: number, op: Op, newest: Tier) {
  const s = stats[keyOf(a, b, op)];
  const t = tierOf(a, b, op);
  const tables = op === 'mul' || op === 'div';
  let w = s ? [6, 4, 2, 1, 0.35][s.box] : tables ? (t === newest ? 3 : 1.2) : t === 1 ? 1.2 : t === 2 ? 1.6 : 4;
  if (!tables && t === 3) w *= 1.8; // crossing ten is the target
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

export function bossProblem(mode: BossMode, bossWins: number, rng = Math.random, op: Op = 'sub'): Problem {
  if (op === 'mul') {
    for (;;) {
      const a = rint(2, 4, rng);
      const b = rint(2, 4, rng) * 10;
      if (a * b <= 90) return make(a, b, 'diff', true, 'mul'); // 3 × 20
    }
  }
  if (op === 'div') {
    for (;;) {
      const d = rint(2, 4, rng);
      const q = rint(2, 4, rng) * 10;
      if (q * d <= 90) return make(q * d, d, 'diff', true, 'div'); // 60 ÷ 3
    }
  }
  const borrow =
    mode === 'borrow' ? true : mode === 'noborrow' ? false : bossWins >= 10 ? rng() < 0.75 : bossWins >= 4 ? rng() < 0.4 : false;
  if (op === 'add') {
    for (;;) {
      const a = rint(11, 78, rng);
      const ta = Math.floor(a / 10);
      const oa = a % 10;
      let b: number;
      if (borrow) {
        if (oa === 0 || ta > 7) continue;
        b = rint(1, 8 - ta, rng) * 10 + rint(10 - oa, 9, rng); // 38 + 27
      } else if (rng() < 0.2 && oa === 0) b = rint(1, 9 - ta, rng) * 10; // 40 + 30
      else b = rint(1, 9 - ta, rng) * 10 + rint(0, 9 - oa, rng); // 34 + 25
      if (b >= 10 && a + b <= 99) return make(a, b, 'diff', true, 'add');
    }
  }
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
  const op = settings.op ?? 'sub';
  const tiers = unlockedTiers(stats, op);
  const newest = tiers[tiers.length - 1];
  const open = POOLS[op].filter(([a, b]) => tiers.includes(tierOf(a, b, op)));
  const bossN = settings.boss === 'off' ? 0 : 2;
  const regular = Math.max(4, settings.roundLen - bossN);
  const k = (a: number, b: number) => keyOf(a, b, op);
  const used = new Set<string>();
  const out: Problem[] = [];

  const kindFor = (a: number, b: number): Kind => {
    if (op === 'mul' || op === 'div') return 'diff';
    const s = stats[k(a, b)];
    const t = tierOf(a, b, op);
    if (!s) return 'diff';
    if (t === 3 && s.box >= 2 && rng() < 0.3) return 'missing';
    if (t === 1 && s.box >= 3 && rng() < 0.2) return 'missing';
    return 'diff';
  };

  // Two warm-ups she can win, so a round never opens on a wall.
  const easy = open.filter(([a, b]) => {
    const s = stats[k(a, b)];
    return s ? s.box >= FLUENT_BOX : tierOf(a, b, op) === 1 && calc(a, b, op) > 1;
  });
  for (let i = 0; i < 2; i++) {
    const left = easy.filter(([x, y]) => !used.has(k(x, y)));
    if (!left.length) break;
    const [a, b] = weightedPick(left, () => 1, rng);
    used.add(k(a, b));
    out.push(make(a, b, 'diff', false, op));
  }
  const weight = (a: number, b: number) => weightOf(stats, a, b, op, newest);
  while (out.length < regular) {
    const pool = open.filter(([a, b]) => !used.has(k(a, b)));
    if (!pool.length) break;
    const [a, b] = weightedPick(pool, ([x, y]) => weight(x, y), rng);
    used.add(k(a, b));
    out.push(make(a, b, kindFor(a, b), false, op));
  }
  // Shuffle everything after the warm-ups.
  const rest = out.splice(2);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  // Mini boss: the shakiest fact in the round, moved to the middle.
  if (rest.length >= 4) {
    // Ties (a brand-new player) go to the harder tier, then the bigger answer, never "1 × 5".
    const tough = (p: Problem) => weight(p.a, p.b) + p.tier * 0.01 + p.c * 0.0001;
    let hi = 0;
    rest.forEach((p, i) => {
      if (tough(p) > tough(rest[hi])) hi = i;
    });
    const [mini] = rest.splice(hi, 1);
    rest.splice(Math.floor(rest.length / 2), 0, { ...mini, mini: true });
  }
  out.push(...rest);
  for (let i = 0, tries = 0; i < bossN; tries++) {
    const p = bossProblem(settings.boss, bossWins, rng, op);
    if (out.some((x) => x.key === p.key) && tries < 20) continue; // two different boss bites
    out.push(p);
    i++;
  }
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
const SLOWER: Record<Op, number> = { sub: 1, add: 1, mul: 1.25, div: 1.25 };

export const isSpeedy = (p: Problem, at: Attempt) =>
  at.firstTry &&
  !at.usedHelp &&
  at.ms <= (at.voice ? VOICE_FAST_MS : FAST_MS * SLOWER[p.op] * (p.boss ? 3 : p.kind === 'missing' ? 1.5 : 1));

/** Lightning Round: basic facts only, all "a ○ b = ?" so they're easy to say. */
export function buildLightning(stats: Stats, settings: Settings, rng = Math.random): Problem[] {
  const n = Math.min(40, Math.max(5, settings.lightningLen || 15));
  return buildRound(stats, { ...settings, roundLen: n, boss: 'off' }, 0, rng).map((p) => make(p.a, p.b, 'diff', false, p.op));
}

/** Lightning records are per track and length; subtraction keeps its old bare-length keys. */
export const bestKey = (op: Op, len: number) => (op === 'sub' ? String(len) : `${op}-${len}`);

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

export function tierFluency(stats: Stats, t: Tier, op: Op = 'sub') {
  const facts = factsInTier(t, op);
  let seen = 0;
  let fluent = 0;
  for (const [a, b] of facts) {
    const s = stats[keyOf(a, b, op)];
    if (!s) continue;
    seen++;
    if (s.box >= FLUENT_BOX) fluent++;
  }
  return { total: facts.length, seen, fluent };
}

export const opText = (p: Problem) => {
  const w = OP_INFO[p.op].word;
  return p.kind === 'diff' ? `${p.a} ${w} ${p.b}` : `${p.a} ${w} what equals ${p.c}`;
};
