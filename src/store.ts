import { useEffect, useRef, useState } from 'react';
import { ACCESSORIES, type Accessory, type Outfit } from './accessories';
import type { Op, Settings, Stats } from './engine';
import { MONSTERS, type MonsterDef } from './monsters';

export const MAX_CUSTOM = 6;

const KEY = 'minus-monsters-v1';

/** Every 15 stars is a stop on the Snack Trail, and every stop has a prize. */
export const STOP_EVERY = 15;
export const LIGHTNING_LENGTHS = [10, 15, 20, 30];

export interface RoundLog {
  at: number;
  n: number;
  firstTry: number;
  speedy: number;
  helped: number;
  avgMs: number;
  stars: number;
  mode?: 'tap' | 'lightning';
  op?: Op;
  totalMs?: number;
}

export interface Save {
  v: 1;
  stars: number; // lifetime stars
  claimed: number; // trail stops whose prize has been opened
  owned: string[];
  current: string;
  items: string[]; // accessories won
  outfits: Record<string, Outfit>;
  customs: MonsterDef[]; // monsters she designed in the Monster Maker
  stats: Stats;
  boss: { seen: number; right: number; borrowSeen: number; borrowRight: number };
  bossWins: number;
  rounds: RoundLog[];
  settings: Settings;
  lightning: { bests: Record<string, number>; runs: number };
}

export const fresh = (): Save => ({
  v: 1,
  stars: 0,
  claimed: 0,
  owned: [MONSTERS[0].id],
  current: MONSTERS[0].id,
  items: [],
  outfits: {},
  customs: [],
  stats: {},
  boss: { seen: 0, right: 0, borrowSeen: 0, borrowRight: 0 },
  bossWins: 0,
  rounds: [],
  lightning: { bests: {}, runs: 0 },
  settings: { roundLen: 12, boss: 'auto', sound: true, readAloud: false, lightningLen: 15, op: 'sub', ops: ['sub', 'add', 'mul', 'div'] },
});

type Legacy = Partial<Save> & { egg?: number; lightning?: { best?: number | null; bests?: Record<string, number>; runs?: number } };

function migrate(s: Legacy): Save {
  const f = fresh();
  const out = { ...f, ...s, settings: { ...f.settings, ...s.settings }, boss: { ...f.boss, ...s.boss } } as Save & { egg?: number };
  const lt = (s.lightning ?? {}) as { best?: number | null; bests?: Record<string, number>; runs?: number };
  out.lightning = { bests: { ...(lt.bests ?? {}) }, runs: lt.runs ?? 0 };
  if (lt.best && !out.lightning.bests['15']) out.lightning.bests['15'] = lt.best;
  if (typeof s.claimed !== 'number') out.claimed = Math.floor((s.stars ?? 0) / STOP_EVERY);
  delete out.egg;
  if (!out.owned.includes(out.current)) out.current = out.owned[0] ?? MONSTERS[0].id;
  const ops = Array.isArray(out.settings.ops) ? out.settings.ops.filter((o) => f.settings.ops.includes(o)) : [];
  out.settings.ops = ops.length ? ops : f.settings.ops;
  if (!out.settings.ops.includes(out.settings.op)) out.settings.op = out.settings.ops[0];
  return out;
}

function load(): Save {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return fresh();
  }
  if (!raw) return fresh();
  try {
    return migrate(JSON.parse(raw) as Legacy);
  } catch {
    // Never overwrite a save we can't read — park it so it can be recovered.
    try {
      localStorage.setItem(`${KEY}-recovered-${Date.now()}`, raw);
    } catch {
      /* ignore */
    }
    return fresh();
  }
}

export function useSave() {
  const [save, setSave] = useState<Save>(load);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(save);
  latest.current = save;

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(save));
      } catch {
        /* storage full or blocked */
      }
    }, 250);
  }, [save]);

  useEffect(() => {
    const flush = () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(latest.current));
      } catch {
        /* ignore */
      }
    };
    // Android often skips pagehide when an app is swiped away; visibilitychange is reliable.
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  return [save, setSave] as const;
}

// ---------- the Snack Trail ----------

export type PrizeKind = 'egg' | 'chest' | 'trophy';
export interface Stop {
  n: number; // 1-based stop number
  at: number; // stars needed
  kind: PrizeKind;
}
export type Prize = { kind: 'egg'; monster: MonsterDef } | { kind: 'chest'; item: Accessory } | { kind: 'trophy'; n: number };

/** Prizes alternate chest, egg, chest, egg… and fall back to whatever is left. */
export function trailStops(s: Save, from: number, count: number): Stop[] {
  let eggs = MONSTERS.length - s.owned.length;
  let chests = ACCESSORIES.length - s.items.length;
  const out: Stop[] = [];
  // Walk from the first unclaimed stop so the plan matches what claiming will hand out.
  const last = Math.max(from, s.claimed + 1) + count - 1;
  for (let n = s.claimed + 1; n <= last; n++) {
    let kind: PrizeKind = n % 2 === 0 ? 'egg' : 'chest';
    if (kind === 'egg' && eggs === 0) kind = chests > 0 ? 'chest' : 'trophy';
    else if (kind === 'chest' && chests === 0) kind = eggs > 0 ? 'egg' : 'trophy';
    if (kind === 'egg') eggs--;
    if (kind === 'chest') chests--;
    out.push({ n, at: n * STOP_EVERY, kind });
  }
  return out.filter((x) => x.n >= from).slice(0, count);
}

/** Stars as a position along the trail, in stops (2.4 = 40% of the way from stop 2 to stop 3). */
export const trailPos = (stars: number) => stars / STOP_EVERY;

export const pendingPrizes = (s: Save) => Math.max(0, Math.floor(s.stars / STOP_EVERY) - s.claimed);

export function claimPrize(s: Save): { save: Save; prize: Prize } | null {
  if (pendingPrizes(s) === 0) return null;
  const [stop] = trailStops(s, s.claimed + 1, 1);
  if (stop.kind === 'egg') {
    const monster = MONSTERS.find((m) => !s.owned.includes(m.id))!;
    return { save: { ...s, claimed: s.claimed + 1, owned: [...s.owned, monster.id], current: monster.id }, prize: { kind: 'egg', monster } };
  }
  if (stop.kind === 'chest') {
    const item = ACCESSORIES.find((a) => !s.items.includes(a.id))!;
    // Put it straight on the current monster so she sees it right away.
    const outfit = { ...(s.outfits[s.current] ?? {}), [item.slot]: item.id };
    return {
      save: { ...s, claimed: s.claimed + 1, items: [...s.items, item.id], outfits: { ...s.outfits, [s.current]: outfit } },
      prize: { kind: 'chest', item },
    };
  }
  return { save: { ...s, claimed: s.claimed + 1 }, prize: { kind: 'trophy', n: stop.n } };
}
