import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Outfit } from './accessories';
import { Monster, type MonsterDef } from './monsters';
import { sfx } from './sound';
import { STOP_EVERY, trailStops, type PrizeKind, type Save } from './store';
import './worlds.css';

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

// ---------- worlds ----------
// The trail passes through a new world every WORLD_STOPS stops. After the last world it loops
// back to the first, so the scenery keeps changing however far she walks.

export type WorldId = 'candy' | 'ocean' | 'volcano' | 'space' | 'castle';
export const WORLD_STOPS = 8;
const WORLDS: readonly { id: WorldId; name: string }[] = [
  { id: 'candy', name: 'Candy Meadow' },
  { id: 'ocean', name: 'Bubble Ocean' },
  { id: 'volcano', name: 'Cupcake Volcano' },
  { id: 'space', name: 'Starry Space' },
  { id: 'castle', name: 'Rainbow Castle' },
];

/** 0-based count of worlds passed before this stop (keeps counting past the loop: stop 41 → 5). */
const worldIndex = (stopN: number) => Math.floor((Math.max(1, Math.floor(stopN)) - 1) / WORLD_STOPS);

/** Which world a trail stop (1-based) sits in. Stops 1–8 are world 1, 9–16 world 2, and so on, looping. */
export function worldOf(stopN: number): { id: WorldId; name: string } {
  const w = WORLDS[worldIndex(stopN) % WORLDS.length];
  return { id: w.id, name: w.name };
}

const INK = '#1B1033';

function Lollipop() {
  return (
    <svg viewBox="0 0 40 56" aria-hidden="true">
      <rect x="17.5" y="30" width="5" height="24" rx="2" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <circle cx="20" cy="20" r="16" fill="#FF5FA8" stroke={INK} strokeWidth="3" />
      <path d="M20 20m-2 0a2 2 0 1 1 4 0a5 5 0 1 1-10 0a8 8 0 1 1 16 0a11 11 0 0 1-3 7.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
function WrappedCandy() {
  return (
    <svg viewBox="0 0 56 30" aria-hidden="true">
      <path d="M15 15L3 5V25Z M41 15L53 5V25Z" fill="#FFD23F" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="28" cy="15" rx="15" ry="11" fill="#FFD23F" stroke={INK} strokeWidth="2.5" />
      <path d="M22 6.5L18.5 23 M29.5 4.5L26 25.5 M37 6.5L33.5 23" stroke="#FF5FA8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function Gumdrop() {
  return (
    <svg viewBox="0 0 40 36" aria-hidden="true">
      <path d="M4 33Q3 5 20 4Q37 5 36 33Z" fill="#8EE04A" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="13" cy="16" r="2" fill="#fff" />
      <circle cx="22" cy="11" r="1.6" fill="#fff" />
      <circle cx="27" cy="21" r="2" fill="#fff" />
      <circle cx="17" cy="25" r="1.6" fill="#fff" />
    </svg>
  );
}
function Fish() {
  return (
    <svg viewBox="0 0 52 34" aria-hidden="true">
      <path d="M36 17L50 6V28Z" fill="#FF5FA8" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="22" cy="17" rx="17" ry="12" fill="#FF8CC6" stroke={INK} strokeWidth="2.5" />
      <path d="M20 6Q25 1 30 7" fill="#FF5FA8" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="13" cy="14" r="3" fill={INK} />
      <path d="M8 21Q11 23 14 21" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function Jellyfish() {
  return (
    <svg viewBox="0 0 36 46" aria-hidden="true">
      <path d="M10 21q-3 7 0 12q3 6 0 11 M18 22q3 7 0 12q-3 6 0 10 M26 21q-3 7 0 12q3 6 0 11" fill="none" stroke="#8F6BFF" strokeWidth="3" strokeLinecap="round" />
      <path d="M4 21Q4 3 18 3Q32 3 32 21Q25 17 18 21Q11 17 4 21Z" fill="#D7C4FF" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="13.5" cy="13" r="1.8" fill={INK} />
      <circle cx="22.5" cy="13" r="1.8" fill={INK} />
    </svg>
  );
}
function Bubbles() {
  return (
    <svg viewBox="0 0 36 40" aria-hidden="true">
      <g fill="rgba(255,255,255,0.55)" stroke={INK} strokeWidth="2.2">
        <circle cx="12" cy="28" r="9" />
        <circle cx="27" cy="17" r="6" />
        <circle cx="15" cy="8" r="4" />
      </g>
      <path d="M7 25a5 5 0 0 1 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function CupcakeVolcano() {
  return (
    <svg viewBox="0 0 48 50" aria-hidden="true">
      <circle cx="21" cy="5" r="2.6" fill="#FF8A3D" stroke={INK} strokeWidth="1.5" />
      <circle cx="29" cy="3" r="2" fill="#FF8A3D" stroke={INK} strokeWidth="1.5" />
      <path d="M7 33L18 10H30L41 33Z" fill="#8A4A22" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M15.5 15.5L18 10H30L32.5 15.5Q30 20 28 15.5Q25 22 22 15.5Q19 20 15.5 15.5Z" fill="#FF5FA8" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 32H39L35 47H13Z" fill="#FF8CC6" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M17 33L18 46 M24 33V46 M31 33L30 46" stroke={INK} strokeWidth="1.6" />
    </svg>
  );
}
function Puff({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 46 30" aria-hidden="true">
      <path d="M9 27a7 7 0 0 1 0-14a9.5 9.5 0 0 1 17-6a8 8 0 0 1 12.5 7a6.5 6.5 0 0 1-.5 13Z" fill={fill} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
function Sprinkles() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <g strokeWidth="4" strokeLinecap="round">
        <path d="M4 8l6-3" stroke="#FF5FA8" />
        <path d="M20 4l5 4" stroke="#3D7BFF" />
        <path d="M13 16l1 6" stroke="#6CC417" />
        <path d="M24 18l5-2" stroke="#8F6BFF" />
        <path d="M5 26l6 1" stroke="#FF5FA8" />
        <path d="M20 28l4-4" stroke="#3D7BFF" />
      </g>
    </svg>
  );
}
function Planet() {
  return (
    <svg viewBox="0 0 48 36" aria-hidden="true">
      <path d="M2 20A22 6 0 0 1 46 20" fill="none" stroke="#FFD23F" strokeWidth="3.5" />
      <circle cx="24" cy="18" r="12" fill="#FF8CC6" stroke={INK} strokeWidth="2.5" />
      <circle cx="19" cy="13" r="2.5" fill="#FF5FA8" />
      <path d="M2 20A22 6 0 0 0 46 20" fill="none" stroke="#FFD23F" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
function Moon() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true">
      <path d="M22 3A15 15 0 1 0 33 26A12 12 0 1 1 22 3Z" fill="#FFE98A" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
function Sparkle({ fill = '#fff' }: { fill?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1Q13.5 10.5 23 12Q13.5 13.5 12 23Q10.5 13.5 1 12Q10.5 10.5 12 1Z" fill={fill} />
    </svg>
  );
}
function Castle() {
  return (
    <svg viewBox="0 0 48 50" aria-hidden="true">
      <path d="M24 2V10" stroke={INK} strokeWidth="2" />
      <path d="M24 2L32 5L24 8Z" fill="#FF5FA8" />
      <rect x="13" y="22" width="22" height="26" fill="#FFB3DA" stroke={INK} strokeWidth="2.5" />
      <rect x="3" y="20" width="11" height="28" fill="#FFC9E6" stroke={INK} strokeWidth="2.5" />
      <rect x="34" y="20" width="11" height="28" fill="#FFC9E6" stroke={INK} strokeWidth="2.5" />
      <path d="M1.5 21L8.5 7L15.5 21Z M32.5 21L39.5 7L46.5 21Z M12 23L24 9L36 23Z" fill="#8F6BFF" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M19 48V39a5 5 0 0 1 10 0V48Z" fill={INK} />
    </svg>
  );
}
function Rainbow() {
  return (
    <svg viewBox="0 0 52 30" aria-hidden="true">
      <g fill="none" strokeWidth="5">
        <path d="M4 28A22 22 0 0 1 48 28" stroke="#FF5FA8" />
        <path d="M9 28A17 17 0 0 1 43 28" stroke="#FFD23F" />
        <path d="M14 28A12 12 0 0 1 38 28" stroke="#5CC2FF" />
      </g>
      <path d="M2 29a4 4 0 0 1 4-6a5 5 0 0 1 9 2a3.5 3.5 0 0 1 0 4Z M37 29a4 4 0 0 1 4-6a5 5 0 0 1 9 2a3.5 3.5 0 0 1 0 4Z" fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

// Three decorations per world, in fixed spots that never sit on a stop: above the two low stops
// (A, B) and in the top-right corner (C), which stays visible even when a gate is at the far end.
type Deco = { el: ReactNode; anim?: 'bob' | 'twinkle' };
const SCENES: Record<WorldId, [Deco, Deco, Deco]> = {
  candy: [{ el: <Lollipop /> }, { el: <WrappedCandy />, anim: 'bob' }, { el: <Gumdrop /> }],
  ocean: [{ el: <Fish />, anim: 'bob' }, { el: <Jellyfish />, anim: 'bob' }, { el: <Bubbles />, anim: 'bob' }],
  volcano: [{ el: <CupcakeVolcano /> }, { el: <Puff fill="#FFF1E6" />, anim: 'bob' }, { el: <Sprinkles />, anim: 'twinkle' }],
  space: [{ el: <Planet />, anim: 'bob' }, { el: <Moon /> }, { el: <Sparkle fill="#FFE98A" />, anim: 'twinkle' }],
  castle: [{ el: <Castle /> }, { el: <Rainbow /> }, { el: <Puff fill="#fff" />, anim: 'bob' }],
};

/** The sky behind the trail for one world. `gate` (in %) clips it to start at a world gate. */
function WorldSky({ id, gate }: { id: WorldId; gate?: number }) {
  return (
    <div
      className={`world-sky sky-${id} ${gate !== undefined ? 'next' : ''}`}
      style={gate !== undefined ? { ['--gx' as string]: `${gate}%` } : undefined}
      aria-hidden="true"
    >
      {SCENES[id].map((d, i) => (
        <span key={i} className={`world-deco deco-${'abc'[i]} ${d.anim ? `deco-${d.anim}` : ''}`}>
          {d.el}
        </span>
      ))}
    </div>
  );
}

function GateArch() {
  return (
    <svg className="gate-arch" viewBox="0 -8 36 88" preserveAspectRatio="none" aria-hidden="true">
      <path className="gate-frame" d="M2 80V18A16 16 0 0 1 34 18V80H27V19A9 9 0 0 0 9 19V80Z" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 -6l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#FFD23F" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

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

  // Worlds on the board: slot 0 (the start marker) is stop base-1. At most one gate fits in view.
  const uid = useId().replace(/[^\w-]/g, '');
  const leftWorld = worldOf(base - 1);
  const gateSlot = stops.findIndex((s, i) => worldIndex(s.n) !== worldIndex(i === 0 ? base - 1 : stops[i - 1].n)) + 1;
  const gateWorld = gateSlot > 0 ? worldOf(stops[gateSlot - 1].n) : null;
  const gateX = gateSlot > 0 ? (xOf(gateSlot - 1) + xOf(gateSlot)) / 2 : 0;
  const gateAnchor = gateSlot === 1 ? '-28%' : gateSlot === SLOTS ? '-72%' : '-50%';

  // The world she's in = the stop her token is standing on or walking to (kept on the board).
  // During a walk the label waits for her to arrive, then pops to the new world.
  const hereStars = walking && fromStars !== undefined ? fromStars : shown;
  const hereStop = Math.min(base + SLOTS - 1, Math.max(1, Math.ceil(hereStars / STOP_EVERY)));
  const here = worldOf(hereStop);
  const prevHere = useRef(here.id);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (prevHere.current === here.id) return;
    prevHere.current = here.id;
    setEntered(true);
  }, [here.id]);

  const road = (w: WorldId, clip?: string) => (
    <g className={`w-${w}`} clipPath={clip ? `url(#${clip})` : undefined}>
      <path d={d} className="trail-edge" vectorEffect="non-scaling-stroke" />
      <path d={d} className="trail-road" vectorEffect="non-scaling-stroke" />
      <path
        d={d}
        className="trail-dash"
        vectorEffect="non-scaling-stroke"
        style={w === 'castle' ? { stroke: `url(#${uid}-rb)` } : undefined}
      />
    </g>
  );

  return (
    <section className={`trail ${compact ? 'compact' : ''}`} aria-label="Snack Trail">
      <p className="trail-world" aria-live="polite">
        <span key={here.id} className={`tw-${here.id} ${entered ? 'entered' : ''}`}>
          <span className="tw-emblem" aria-hidden="true">
            {SCENES[here.id][0].el}
          </span>
          <span className="tw-num">World {worldIndex(hereStop) + 1}</span>
          <b className="tw-name">{here.name}</b>
        </span>
      </p>
      <div className="trail-board">
        <WorldSky id={leftWorld.id} />
        {gateWorld && <WorldSky id={gateWorld.id} gate={gateX} />}
        <svg className="trail-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={`${uid}-rb`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0">
              <stop offset="0" stopColor="#FF5FA8" />
              <stop offset="0.25" stopColor="#FF9A3D" />
              <stop offset="0.5" stopColor="#FFD23F" />
              <stop offset="0.75" stopColor="#5CC2FF" />
              <stop offset="1" stopColor="#8F6BFF" />
            </linearGradient>
            {gateWorld && (
              <>
                <clipPath id={`${uid}-l`}>
                  <rect x="-20" y="-50" width={gateX + 20} height="200" />
                </clipPath>
                <clipPath id={`${uid}-r`}>
                  <rect x={gateX} y="-50" width="200" height="200" />
                </clipPath>
              </>
            )}
          </defs>
          {road(leftWorld.id, gateWorld ? `${uid}-l` : undefined)}
          {gateWorld && road(gateWorld.id, `${uid}-r`)}
        </svg>
        <div className="trail-start" style={{ left: `${xOf(0)}%`, top: `${pts[0][1]}%` }} aria-hidden="true" />
        {stops.map((s, i) => {
          const reached = s.at <= save.stars;
          const Tag = reached && onOpen ? 'button' : 'div';
          const gate =
            gateWorld && i + 1 === gateSlot ? (
              <div
                key={`gate-${s.n}`}
                className={`trail-gate gate-${gateWorld.id}`}
                style={{ left: `${gateX}%`, ['--anchor' as string]: gateAnchor }}
              >
                <GateArch />
                <span className="gate-spark s1" aria-hidden="true">
                  <Sparkle />
                </span>
                <span className="gate-spark s2" aria-hidden="true">
                  <Sparkle />
                </span>
                <span className="gate-name">
                  <span className="world-sr">New world ahead: </span>
                  {gateWorld.name}
                </span>
              </div>
            ) : null;
          return [
            gate,
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
            </Tag>,
          ];
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
