import { useEffect, useRef, useState } from 'react';
import type { Settings, Stats } from './engine';
import { MONSTERS } from './monsters';

export const EGG_COST = 30;
const KEY = 'minus-monsters-v1';

export interface RoundLog {
  at: number;
  n: number;
  firstTry: number;
  speedy: number;
  helped: number;
  avgMs: number;
  stars: number;
}

export interface Save {
  v: 1;
  stars: number; // lifetime stars
  egg: number; // stars toward the next egg
  owned: string[];
  current: string;
  stats: Stats;
  boss: { seen: number; right: number; borrowSeen: number; borrowRight: number };
  bossWins: number;
  rounds: RoundLog[];
  settings: Settings;
}

export const fresh = (): Save => ({
  v: 1,
  stars: 0,
  egg: 0,
  owned: [MONSTERS[0].id],
  current: MONSTERS[0].id,
  stats: {},
  boss: { seen: 0, right: 0, borrowSeen: 0, borrowRight: 0 },
  bossWins: 0,
  rounds: [],
  settings: { roundLen: 12, boss: 'auto', sound: true, readAloud: false },
});

function load(): Save {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return fresh();
  }
  if (!raw) return fresh();
  try {
    const s = JSON.parse(raw) as Partial<Save>;
    const f = fresh();
    return { ...f, ...s, settings: { ...f.settings, ...s.settings }, boss: { ...f.boss, ...s.boss } } as Save;
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
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  return [save, setSave] as const;
}

export const nextMonster = (s: Save) => MONSTERS.find((m) => !s.owned.includes(m.id));
export const eggReady = (s: Save) => s.egg >= EGG_COST && !!nextMonster(s);
