import { useEffect, useState } from 'react';
import type { Outfit } from './accessories';
import { Monster, type MonsterDef } from './monsters';
import { sfx } from './sound';
import { STOP_EVERY, trailStops, type PrizeKind, type Save } from './store';

// The Snack Trail: her monster walks from stop to stop as she earns stars.
// Every stop holds a prize (chest = dress-up item, egg = new monster).

const SLOTS = 4; // stops shown ahead of the start marker

export function PrizeIcon({ kind, size = 40 }: { kind: PrizeKind; size?: number }) {
  if (kind === 'egg')
    return (
      <svg viewBox="0 0 40 48" width={size} height={size * 1.2} aria-hidden="true">
        <path d="M20 3C31 3 37 22 37 31C37 41 29 46 20 46C11 46 3 41 3 31C3 22 9 3 20 3Z" fill="#FFF6FF" stroke="#1B1033" strokeWidth="3" />
        <circle cx="14" cy="22" r="3.5" fill="#FF5FA8" />
        <circle cx="27" cy="17" r="2.5" fill="#5CC2FF" />
        <circle cx="26" cy="35" r="4" fill="#8EE04A" />
      </svg>
    );
  if (kind === 'chest')
    return (
      <svg viewBox="0 0 48 40" width={size * 1.2} height={size} aria-hidden="true">
        <rect x="4" y="16" width="40" height="21" rx="4" fill="#C9772E" stroke="#1B1033" strokeWidth="3" />
        <path d="M4 18 Q4 4 24 4 Q44 4 44 18 Z" fill="#E08E3C" stroke="#1B1033" strokeWidth="3" strokeLinejoin="round" />
        <rect x="20" y="14" width="8" height="10" rx="2" fill="#FFD23F" stroke="#1B1033" strokeWidth="2.5" />
        <path d="M4 26 H44" stroke="#8B4A16" strokeWidth="3" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="#FFD23F" stroke="#B8860B" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function StarMini() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="#FFD23F" />
    </svg>
  );
}

const PRIZE_WORD: Record<PrizeKind, string> = { egg: 'egg', chest: 'treasure chest', trophy: 'super star' };

interface Props {
  save: Save;
  m: MonsterDef;
  outfit?: Outfit;
  /** Animate the walk from this many stars to save.stars. */
  fromStars?: number;
  compact?: boolean;
  /** Tapping a reached stop opens its prize. */
  onOpen?: () => void;
}

export function Trail({ save, m, outfit, fromStars, compact = false, onOpen }: Props) {
  const base = save.claimed + 1; // first stop shown = next unopened prize
  const stops = trailStops(save, base, SLOTS);
  const startStars = (base - 1) * STOP_EVERY;
  const slotOf = (stars: number) => Math.max(0, Math.min(SLOTS, (stars - startStars) / STOP_EVERY));
  const xOf = (slot: number) => 7 + slot * (86 / SLOTS); // % across

  const [shown, setShown] = useState(fromStars ?? save.stars);
  const [walking, setWalking] = useState(false);

  useEffect(() => {
    if (fromStars === undefined || fromStars === save.stars) {
      setShown(save.stars);
      return;
    }
    setShown(fromStars);
    const t1 = window.setTimeout(() => {
      setWalking(true);
      setShown(save.stars);
      sfx.walk();
    }, 450);
    const t2 = window.setTimeout(() => setWalking(false), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fromStars, save.stars]);

  const pos = slotOf(shown);
  const next = stops.find((s) => s.at > save.stars);
  const ready = stops.filter((s) => s.at <= save.stars).length;

  // Wavy path through the stops.
  const pts = Array.from({ length: SLOTS + 1 }, (_, i) => [xOf(i), i % 2 ? 66 : 50] as const);
  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x} ${y}`;
    const [px, py] = pts[i - 1];
    const mx = (px + x) / 2;
    return `${acc} C${mx} ${py} ${mx} ${y} ${x} ${y}`;
  }, '');
  const yAt = (slot: number) => {
    const i = Math.min(SLOTS - 1, Math.floor(slot));
    const t = slot - i;
    const [, y0] = pts[i];
    const [, y1] = pts[i + 1];
    return y0 + (y1 - y0) * (0.5 - Math.cos(Math.PI * t) / 2);
  };

  return (
    <section className={`trail ${compact ? 'compact' : ''}`} aria-label="Snack Trail">
      <div className="trail-board">
        <svg className="trail-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={d} className="trail-road" vectorEffect="non-scaling-stroke" />
          <path d={d} className="trail-dash" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="trail-start" style={{ left: `${xOf(0)}%`, top: `${pts[0][1]}%` }} aria-hidden="true" />
        {stops.map((s, i) => {
          const reached = s.at <= save.stars;
          const Tag = reached && onOpen ? 'button' : 'div';
          return (
            <Tag
              key={s.n}
              className={`trail-stop ${reached ? 'reached' : ''} kind-${s.kind}`}
              style={{ left: `${xOf(i + 1)}%`, top: `${pts[i + 1][1]}%`, ['--d' as string]: `${i * 70}ms` }}
              aria-label={`${PRIZE_WORD[s.kind]} at ${s.at} stars${reached ? ', tap to open' : ''}`}
              onClick={reached && onOpen ? onOpen : undefined}
            >
              <div className="stop-badge">
                <PrizeIcon kind={s.kind} size={compact ? 26 : 32} />
                {reached && <span className="stop-bang">!</span>}
              </div>
              <span className="stop-at">
                <StarMini />
                {s.at}
              </span>
            </Tag>
          );
        })}
        <div
          className={`trail-token ${walking ? 'walking' : ''}`}
          style={{ left: `${xOf(pos)}%`, top: `${yAt(pos)}%` }}
          aria-hidden="true"
        >
          <Monster m={m} mood={walking ? 'happy' : 'idle'} outfit={outfit} />
        </div>
      </div>
      <p className="trail-caption">
        {ready > 0 ? (
          <b>
            You reached {ready === 1 ? `a ${PRIZE_WORD[stops[0].kind]}` : `${ready} prizes`}!
          </b>
        ) : next ? (
          <>
            <b>{next.at - save.stars}</b> more <span className="star-word">stars</span> to the {PRIZE_WORD[next.kind]}
          </>
        ) : null}
      </p>
    </section>
  );
}
