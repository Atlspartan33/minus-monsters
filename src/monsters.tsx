import { useId } from 'react';
import { FaceItem, HeadItem, NeckItem, type Outfit } from './accessories';

// `Body` / `Top` are the original parts; the Maker's word tables are keyed by them.
// `Shape` / `Topper` are every part the art can draw. Once the Maker's tables list
// 'pear' | 'cloud' and 'bunny' | 'unicorn', fold these back into Body / Top.
export type Body = 'round' | 'blob' | 'tall' | 'square';
export type Shape = Body | 'pear' | 'cloud';
export type Top = 'horns' | 'antenna' | 'ears' | 'none';
export type Topper = Top | 'bunny' | 'unicorn';
export type Teeth = 'fangs' | 'buck' | 'none';
export type Mood = 'idle' | 'open' | 'chomp' | 'happy' | 'confused' | 'burp';

export interface MonsterDef {
  id: string;
  name: string;
  color: string;
  body: Shape;
  eyes: 1 | 2 | 3;
  top: Topper;
  teeth: Teeth;
  spots: boolean;
  line: string; // what it says on the home screen
}

export const MONSTERS: MonsterDef[] = [
  { id: 'gobbles', name: 'Gobbles', color: '#8EE04A', body: 'round', eyes: 2, top: 'horns', teeth: 'fangs', spots: false, line: "My tummy is rumbling!" },
  { id: 'munch', name: 'Munch', color: '#FF5FA8', body: 'blob', eyes: 1, top: 'antenna', teeth: 'buck', spots: true, line: 'Numbers are my favorite snack.' },
  { id: 'burpzilla', name: 'Burpzilla', color: '#25C9B4', body: 'tall', eyes: 3, top: 'horns', teeth: 'fangs', spots: false, line: 'Feed me and stand back.' },
  { id: 'snack', name: 'Snack Attack', color: '#FF9A3C', body: 'square', eyes: 2, top: 'ears', teeth: 'buck', spots: true, line: 'Is it snack time? It is ALWAYS snack time.' },
  { id: 'crumbs', name: 'Crumbs', color: '#5CC2FF', body: 'round', eyes: 2, top: 'antenna', teeth: 'none', spots: true, line: 'I leave crumbs everywhere. Sorry.' },
  { id: 'nibbles', name: 'Nibbles', color: '#FFD23F', body: 'blob', eyes: 2, top: 'ears', teeth: 'buck', spots: false, line: 'Tiny bites. Big brain.' },
  { id: 'chompers', name: 'Chompers', color: '#FF5A5A', body: 'square', eyes: 3, top: 'horns', teeth: 'fangs', spots: false, line: 'CHOMP first, questions later.' },
  { id: 'slurp', name: 'Sir Slurp', color: '#7BE8C4', body: 'tall', eyes: 1, top: 'antenna', teeth: 'none', spots: true, line: 'I slurp numbers like noodles.' },
  { id: 'wobble', name: 'Wobble', color: '#FF8A7A', body: 'round', eyes: 2, top: 'none', teeth: 'buck', spots: true, line: 'Wibble wobble, feed me a problem.' },
  { id: 'gulp', name: 'Gulp', color: '#9C8CFF', body: 'blob', eyes: 2, top: 'horns', teeth: 'fangs', spots: false, line: "I swallow problems whole. Gulp!" },
  { id: 'crunch', name: 'Mrs. Crunch', color: '#F2B632', body: 'tall', eyes: 2, top: 'ears', teeth: 'fangs', spots: true, line: 'Crunchy problems are the best ones.' },
  { id: 'snaccident', name: 'Big Snaccident', color: '#E9A6FF', body: 'square', eyes: 3, top: 'antenna', teeth: 'buck', spots: true, line: 'Oops, I ate the whole thing.' },
  // Wave 2 (2026-10-28). Append only: saves reference ids and hatch order.
  { id: 'sprinkles', name: 'Princess Sprinkles', color: '#FF8FC4', body: 'cloud', eyes: 2, top: 'unicorn', teeth: 'buck', spots: true, line: 'I put sprinkles on every number.' },
  { id: 'puddin', name: 'Puddin’', color: '#A86B45', body: 'pear', eyes: 2, top: 'bunny', teeth: 'none', spots: false, line: 'Sweet as puddin’. Hungry as ten bears.' },
  { id: 'zuri', name: 'Zuri Zoom', color: '#B06BFF', body: 'tall', eyes: 1, top: 'unicorn', teeth: 'fangs', spots: false, line: 'I zoom through take-aways. Beep beep!' },
  { id: 'cottoncandy', name: 'Cotton Candy', color: '#8FD8FF', body: 'cloud', eyes: 3, top: 'none', teeth: 'fangs', spots: false, line: 'I am soft and fluffy. My teeth are not.' },
  { id: 'glitterbug', name: 'Glitterbug', color: '#3FD6A0', body: 'round', eyes: 2, top: 'bunny', teeth: 'buck', spots: true, line: 'Every right answer makes me sparkle.' },
  { id: 'jellybean', name: 'Jellybean Jo', color: '#FF6F7D', body: 'pear', eyes: 3, top: 'antenna', teeth: 'buck', spots: false, line: 'Three eyes. Zero crumbs left.' },
  { id: 'bubbles', name: 'Bubbles', color: '#C9A7FF', body: 'cloud', eyes: 1, top: 'bunny', teeth: 'none', spots: true, line: 'Pop! There goes another problem.' },
  { id: 'lemonade', name: 'Lady Lemonade', color: '#E4F25A', body: 'square', eyes: 2, top: 'unicorn', teeth: 'fangs', spots: true, line: 'Life gave me lemons. I ate them.' },
  { id: 'dazzle', name: 'Dazzle', color: '#E0479E', body: 'blob', eyes: 2, top: 'horns', teeth: 'fangs', spots: false, line: "I don't just eat numbers. I eat them with STYLE." },
  { id: 'peaches', name: 'Baby Peaches', color: '#FFB38A', body: 'pear', eyes: 1, top: 'ears', teeth: 'buck', spots: true, line: 'Tiny monster. GIANT tummy.' },
];

// Monsters she designs herself (Monster Maker) live in her save; App registers them here each render.
let customs: MonsterDef[] = [];
export const setCustomMonsters = (defs: MonsterDef[]) => {
  customs = defs;
};
export const allMonsters = () => [...MONSTERS, ...customs];
export const monsterById = (id: string) => allMonsters().find((m) => m.id === id) ?? MONSTERS[0];

// Typed as the original unions so the Maker's word tables still compile; the new
// entries render with a blank word until those tables gain them (see Shape / Topper).
export const BODIES: Shape[] = ['round', 'blob', 'tall', 'square', 'pear', 'cloud'];
export const TOPS: Topper[] = ['horns', 'antenna', 'ears', 'bunny', 'unicorn', 'none'];
export const TEETH: Teeth[] = ['fangs', 'buck', 'none'];
export const COLORS = ['#8EE04A', '#FF5FA8', '#25C9B4', '#FF9A3C', '#5CC2FF', '#FFD23F', '#FF5A5A', '#7BE8C4', '#9C8CFF', '#E9A6FF', '#F2B632', '#C47A4E'];

function mix(hex: string, to: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(hex), p(to)];
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

const BODY: Record<Shape, string> = {
  round: 'M100 52 C150 52 180 88 180 132 C180 178 146 204 100 204 C54 204 20 178 20 132 C20 88 50 52 100 52Z',
  blob: 'M100 44 C162 40 186 84 182 134 C178 184 150 206 100 206 C50 206 18 184 18 134 C16 82 40 48 100 44Z',
  tall: 'M100 28 C148 28 166 82 168 132 C172 186 146 208 100 208 C54 208 28 186 32 132 C34 82 52 28 100 28Z',
  square: 'M70 52 H130 C160 52 176 68 176 98 V176 C176 196 162 206 142 206 H58 C38 206 24 196 24 176 V98 C24 68 40 52 70 52Z',
  // Small dome on wide hips. Still ≥120 wide through the eye band (y 80–125).
  pear: 'M100 36 C130 36 144 56 148 76 C152 96 186 118 186 160 C186 196 152 206 100 206 C48 206 14 196 14 160 C14 118 48 96 52 76 C56 56 70 36 100 36Z',
  // Five puffs; the side puffs stay inside x 15–185 so the arms still peek out.
  cloud:
    'M44 204 C18 204 12 176 26 162 C10 150 12 112 34 102 C22 76 46 52 70 62 C76 34 124 34 130 62 C154 52 178 76 166 102 C188 112 190 150 174 162 C188 176 182 204 156 204 Q100 212 44 204Z',
};
// Where the top of the head is (tops and hats anchor here) …
const TOP_Y: Record<Shape, number> = { round: 56, blob: 48, tall: 32, square: 54, pear: 40, cloud: 46 };
// … and how far apart side-mounted tops (horns, ears) sit: narrow heads pull them in.
const TOP_SPREAD: Record<Shape, number> = { round: 1, blob: 1, tall: 1, square: 1, pear: 0.88, cloud: 1 };

const EYES: Record<1 | 2 | 3, [number, number, number][]> = {
  1: [[100, 98, 27]],
  2: [[72, 100, 19], [128, 100, 19]],
  3: [[62, 106, 15], [100, 86, 17], [138, 106, 15]],
};

interface MonsterProps {
  m: MonsterDef;
  mood?: Mood;
  silhouette?: boolean;
  outfit?: Outfit;
  /** Boss mode: angry brows and a flush. */
  boss?: boolean;
  /** Where the pupils look, each axis −1..1. */
  gaze?: [number, number];
}

export function Monster({ m, mood = 'idle', silhouette = false, outfit, boss = false, gaze }: MonsterProps) {
  const uid = useId().replace(/:/g, '');
  const base = silhouette ? '#20123F' : m.color;
  const light = silhouette ? '#2A1A52' : mix(m.color, '#FFFFFF', 0.45);
  const dark = silhouette ? '#170C2E' : mix(m.color, '#1B1033', 0.35);
  const ty = TOP_Y[m.body];
  const k = TOP_SPREAD[m.body];
  const sx = (x: number) => 100 + (x - 100) * k;
  const look = mood === 'confused' ? 4 : mood === 'open' ? 2 : 0;
  const [gx, gy] = gaze ?? [0, 0];

  return (
    <svg viewBox="0 0 200 228" className="monster-svg" role="img" aria-label={silhouette ? 'Mystery monster' : m.name}>
      <defs>
        <radialGradient id={`g${uid}`} cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={base} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <clipPath id={`c${uid}`}>
          <path d={BODY[m.body]} />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="218" rx="70" ry="8" fill="#000" opacity="0.22" />
      {/* top features */}
      {m.top === 'horns' && (
        <g fill={silhouette ? base : '#FFF3D6'} stroke={dark} strokeWidth="3">
          <path d={`M${sx(62)} ${ty + 14} L${sx(52)} ${ty - 22} L${sx(80)} ${ty + 6}Z`} />
          <path d={`M${sx(138)} ${ty + 14} L${sx(148)} ${ty - 22} L${sx(120)} ${ty + 6}Z`} />
        </g>
      )}
      {m.top === 'unicorn' && (
        <g strokeLinejoin="round">
          <path d={`M86 ${ty + 12} L100 ${ty - 50} L114 ${ty + 12}Z`} fill={silhouette ? base : '#FFE38A'} stroke={dark} strokeWidth="3" />
          {!silhouette && (
            <>
              <path d={`M91 ${ty - 2} L108 ${ty - 11} M94 ${ty - 19} L105 ${ty - 26}`} stroke="#FF6FB0" strokeWidth="4" strokeLinecap="round" />
              <path d={`M128 ${ty - 40} l3 7.5 7.5 3 -7.5 3 -3 7.5 -3 -7.5 -7.5 -3 7.5 -3z`} fill="#FFF3D6" className="antenna-ball" />
            </>
          )}
        </g>
      )}
      {m.top === 'bunny' && (
        <g stroke={dark} strokeWidth="3">
          <ellipse cx="80" cy={ty - 22} rx="13" ry="32" transform={`rotate(-12 80 ${ty - 22})`} fill={base} />
          <ellipse cx="120" cy={ty - 22} rx="13" ry="32" transform={`rotate(14 120 ${ty - 22})`} fill={base} />
          {!silhouette && (
            <g fill="#FF9EC6" stroke="none">
              <ellipse cx="80" cy={ty - 24} rx="6" ry="22" transform={`rotate(-12 80 ${ty - 22})`} />
              <ellipse cx="120" cy={ty - 24} rx="6" ry="22" transform={`rotate(14 120 ${ty - 22})`} />
            </g>
          )}
        </g>
      )}
      {m.top === 'antenna' && (
        <g>
          <path d={`M100 ${ty + 4} Q96 ${ty - 18} 110 ${ty - 30}`} stroke={dark} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="110" cy={ty - 32} r="9" fill={silhouette ? base : '#FFD23F'} stroke={dark} strokeWidth="3" className="antenna-ball" />
        </g>
      )}
      {m.top === 'ears' && (
        <g fill={base} stroke={dark} strokeWidth="3">
          <ellipse cx={sx(44)} cy={ty + 26} rx="20" ry="24" transform={`rotate(-25 ${sx(44)} ${ty + 26})`} />
          <ellipse cx={sx(156)} cy={ty + 26} rx="20" ry="24" transform={`rotate(25 ${sx(156)} ${ty + 26})`} />
        </g>
      )}
      {/* arms + feet */}
      <g fill={base} stroke={dark} strokeWidth="3" className="arms">
        <ellipse className="arm-l" cx="22" cy="150" rx="13" ry="22" transform="rotate(20 22 150)" />
        <ellipse className="arm-r" cx="178" cy="150" rx="13" ry="22" transform="rotate(-20 178 150)" />
      </g>
      <g fill={dark}>
        <ellipse cx="70" cy="208" rx="22" ry="11" />
        <ellipse cx="130" cy="208" rx="22" ry="11" />
      </g>
      {/* body */}
      <path d={BODY[m.body]} fill={`url(#g${uid})`} stroke={dark} strokeWidth="3" />
      <g clipPath={`url(#c${uid})`}>
        <ellipse cx="100" cy="178" rx="50" ry="36" fill={light} opacity="0.55" />
        {m.spots && !silhouette && (
          <g fill={dark} opacity="0.28">
            <circle cx="40" cy="120" r="9" />
            <circle cx="160" cy="132" r="11" />
            <circle cx="150" cy="80" r="6" />
            <circle cx="48" cy="170" r="6" />
          </g>
        )}
      </g>
      {silhouette ? (
        <text x="100" y="150" textAnchor="middle" fontSize="72" fontWeight="700" fill="#5B4A8C" fontFamily="Fredoka, sans-serif">?</text>
      ) : (
        <>
          {/* eyes */}
          <g className="eyes">
            {EYES[m.eyes].map(([x, y, r], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r={r} fill="#fff" stroke={dark} strokeWidth="3" />
                <g className="pupil" style={{ transform: `translate(${gx * r * 0.42}px, ${gy * r * 0.36}px)` }}>
                  <circle cx={x + (mood === 'confused' ? (i % 2 ? -3 : 3) : 0)} cy={y + look + r * 0.15} r={r * 0.5} fill="#1B1033" />
                  <circle cx={x - r * 0.18} cy={y - r * 0.12 + look} r={r * 0.17} fill="#fff" />
                </g>
              </g>
            ))}
          </g>
          {boss && mood !== 'confused' && mood !== 'burp' && (
            <g stroke="#1B1033" strokeWidth="5" strokeLinecap="round">
              {EYES[m.eyes].map(([x, y, r], i) => {
                const inward = x < 100 ? 1 : x > 100 ? -1 : 0;
                return <line key={i} x1={x - r * 0.9} y1={y - r - 10 - inward * 5} x2={x + r * 0.9} y2={y - r - 10 + inward * 5} />;
              })}
            </g>
          )}
          {boss && (
            <g fill="#FF3B6B" opacity="0.35">
              <ellipse cx="46" cy="136" rx="14" ry="8" />
              <ellipse cx="154" cy="136" rx="14" ry="8" />
            </g>
          )}
          {(mood === 'confused' || mood === 'burp') && (
            <g stroke="#1B1033" strokeWidth="4" strokeLinecap="round">
              {EYES[m.eyes].map(([x, y, r], i) => (
                <line key={i} x1={x - r * 0.8} y1={y - r - 8 + (i % 2 ? 4 : 0)} x2={x + r * 0.8} y2={y - r - 8 + (i % 2 ? 0 : 4)} />
              ))}
            </g>
          )}
          <Mouth mood={mood} teeth={m.teeth} dark={dark} />
          {outfit?.neck && <NeckItem id={outfit.neck} />}
          {outfit?.face && <FaceItem id={outfit.face} eyes={EYES[m.eyes]} />}
          {outfit?.head && <HeadItem id={outfit.head} ty={ty} />}
        </>
      )}
    </svg>
  );
}

function Mouth({ mood, teeth, dark }: { mood: Mood; teeth: Teeth; dark: string }) {
  const y = 152;
  if (mood === 'open' || mood === 'burp') {
    const ry = mood === 'burp' ? 30 : 26;
    return (
      <g>
        <ellipse cx="100" cy={y} rx={mood === 'burp' ? 30 : 38} ry={ry} fill="#3A0A24" stroke={dark} strokeWidth="3" />
        <ellipse cx="100" cy={y + ry - 10} rx="20" ry="10" fill="#FF6F9C" />
        {teeth === 'fangs' && (
          <g fill="#fff">
            <path d={`M76 ${y - 20} L84 ${y - 4} L90 ${y - 23}Z`} />
            <path d={`M124 ${y - 20} L116 ${y - 4} L110 ${y - 23}Z`} />
          </g>
        )}
        {teeth === 'buck' && (
          <g fill="#fff" stroke={dark} strokeWidth="2">
            <rect x="88" y={y - 26} width="11" height="14" rx="2" />
            <rect x="101" y={y - 26} width="11" height="14" rx="2" />
          </g>
        )}
      </g>
    );
  }
  if (mood === 'chomp') {
    return (
      <g>
        <path d={`M62 ${y} Q100 ${y + 22} 138 ${y}`} fill="#3A0A24" stroke={dark} strokeWidth="4" strokeLinecap="round" />
        <path d={`M70 ${y + 3} l8 8 l8 -6 l8 8 l8 -8 l8 8 l8 -6 l8 6`} fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      </g>
    );
  }
  if (mood === 'confused') {
    return <path d={`M78 ${y + 4} q11 -10 22 0 t22 0`} fill="none" stroke="#3A0A24" strokeWidth="5" strokeLinecap="round" />;
  }
  // idle + happy: a smile
  const deep = mood === 'happy' ? 26 : 16;
  return (
    <g>
      <path d={`M70 ${y - 4} Q100 ${y + deep} 130 ${y - 4} Z`} fill="#3A0A24" stroke={dark} strokeWidth="3" strokeLinejoin="round" />
      {teeth === 'fangs' && (
        <g fill="#fff">
          <path d={`M78 ${y - 2} L84 ${y + 8} L90 ${y}Z`} />
          <path d={`M122 ${y - 2} L116 ${y + 8} L110 ${y}Z`} />
        </g>
      )}
      {teeth === 'buck' && <rect x="92" y={y - 3} width="16" height="10" rx="2" fill="#fff" />}
    </g>
  );
}
