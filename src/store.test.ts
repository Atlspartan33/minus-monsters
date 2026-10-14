import { describe, expect, it } from 'vitest';
import { ACCESSORIES } from './accessories';
import { MONSTERS } from './monsters';
import { STOP_EVERY, claimPrize, fresh, pendingPrizes, trailStops } from './store';

describe('Snack Trail', () => {
  it('alternates chest, egg, chest, egg', () => {
    expect(trailStops(fresh(), 1, 4).map((s) => s.kind)).toEqual(['chest', 'egg', 'chest', 'egg']);
  });

  it('claims exactly what the trail promised, until everything is won', () => {
    let s = { ...fresh(), stars: 10_000 };
    const total = MONSTERS.length - 1 + ACCESSORIES.length;
    for (let i = 0; i < total; i++) {
      const [promised] = trailStops(s, s.claimed + 1, 1);
      const r = claimPrize(s)!;
      expect(r.prize.kind).toBe(promised.kind);
      s = r.save;
    }
    expect(s.owned.length).toBe(MONSTERS.length);
    expect(s.items.length).toBe(ACCESSORIES.length);
    expect(claimPrize(s)!.prize.kind).toBe('trophy');
  });

  it('a chest item goes straight onto the current monster', () => {
    const r = claimPrize({ ...fresh(), stars: STOP_EVERY })!;
    expect(r.prize.kind).toBe('chest');
    expect(Object.values(r.save.outfits[r.save.current] ?? {})).toContain(ACCESSORIES[0].id);
  });

  it('counts pending prizes from stars', () => {
    expect(pendingPrizes({ ...fresh(), stars: STOP_EVERY * 3 - 1 })).toBe(2);
    expect(claimPrize({ ...fresh(), stars: STOP_EVERY - 1 })).toBeNull();
  });
});
