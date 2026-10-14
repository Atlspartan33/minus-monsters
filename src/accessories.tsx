// Dress-up items, won on the Snack Trail. Drawn in the monster's own 200×228 SVG space.

export type Slot = 'head' | 'face' | 'neck';
export interface Accessory {
  id: string;
  name: string;
  slot: Slot;
}
export type Outfit = Partial<Record<Slot, string>>;

// Unlock order: the first chest on the trail gives the first item.
export const ACCESSORIES: Accessory[] = [
  { id: 'party', name: 'Party Hat', slot: 'head' },
  { id: 'shades', name: 'Cool Shades', slot: 'face' },
  { id: 'bow', name: 'Big Bow', slot: 'head' },
  { id: 'bowtie', name: 'Bow Tie', slot: 'neck' },
  { id: 'crown', name: 'Crown', slot: 'head' },
  { id: 'hearts', name: 'Heart Glasses', slot: 'face' },
  { id: 'chef', name: 'Chef Hat', slot: 'head' },
  { id: 'scarf', name: 'Cozy Scarf', slot: 'neck' },
  { id: 'wizard', name: 'Wizard Hat', slot: 'head' },
  { id: 'stars', name: 'Star Glasses', slot: 'face' },
  { id: 'cap', name: 'Snack Cap', slot: 'head' },
];
export const accessoryById = (id: string) => ACCESSORIES.find((a) => a.id === id);

const INK = '#1B1033';

export function HeadItem({ id, ty }: { id: string; ty: number }) {
  const t = ty + 8; // where a hat sits on the head
  switch (id) {
    case 'party':
      return (
        <g transform={`rotate(-8 100 ${t})`}>
          <path d={`M74 ${t} L100 ${t - 62} L126 ${t} Z`} fill="#FF5FA8" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d={`M82 ${t - 16} L118 ${t - 16} M89 ${t - 34} L111 ${t - 34}`} stroke="#FFD23F" strokeWidth="6" />
          <circle cx="100" cy={t - 64} r="9" fill="#FFD23F" stroke={INK} strokeWidth="3" />
          <path d={`M72 ${t} Q100 ${t + 8} 128 ${t}`} fill="none" stroke="#5CC2FF" strokeWidth="6" strokeLinecap="round" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path
            d={`M66 ${t + 2} L62 ${t - 34} L80 ${t - 16} L100 ${t - 42} L120 ${t - 16} L138 ${t - 34} L134 ${t + 2} Z`}
            fill="#FFD23F"
            stroke={INK}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="100" cy={t - 12} r="6" fill="#FF5FA8" stroke={INK} strokeWidth="2" />
          <circle cx="78" cy={t - 6} r="4" fill="#5CC2FF" stroke={INK} strokeWidth="2" />
          <circle cx="122" cy={t - 6} r="4" fill="#8EE04A" stroke={INK} strokeWidth="2" />
        </g>
      );
    case 'bow':
      return (
        <g transform={`translate(128 ${t - 4}) rotate(18)`}>
          <path d="M0 0 L-30 -18 Q-36 0 -30 18 Z" fill="#FF5FA8" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M0 0 L30 -18 Q36 0 30 18 Z" fill="#FF5FA8" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <circle r="8" fill="#FF8FC4" stroke={INK} strokeWidth="3" />
        </g>
      );
    case 'chef':
      return (
        <g>
          <rect x="70" y={t - 18} width="60" height="20" rx="4" fill="#fff" stroke={INK} strokeWidth="3" />
          <circle cx="78" cy={t - 30} r="17" fill="#fff" stroke={INK} strokeWidth="3" />
          <circle cx="122" cy={t - 30} r="17" fill="#fff" stroke={INK} strokeWidth="3" />
          <circle cx="100" cy={t - 42} r="21" fill="#fff" stroke={INK} strokeWidth="3" />
          <rect x="72" y={t - 26} width="56" height="12" fill="#fff" />
        </g>
      );
    case 'wizard':
      return (
        <g transform={`rotate(6 100 ${t})`}>
          <ellipse cx="100" cy={t} rx="44" ry="9" fill="#6B3FD0" stroke={INK} strokeWidth="3" />
          <path d={`M72 ${t - 2} Q96 ${t - 40} 112 ${t - 78} Q116 ${t - 40} 128 ${t - 2} Z`} fill="#7D4FE8" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d={`M98 ${t - 30} l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1z`} fill="#FFD23F" />
          <circle cx="112" cy={t - 50} r="3" fill="#FFD23F" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d={`M68 ${t + 2} Q68 ${t - 34} 100 ${t - 34} Q132 ${t - 34} 132 ${t + 2} Z`} fill="#5CC2FF" stroke={INK} strokeWidth="3" />
          <path d={`M124 ${t} Q150 ${t - 4} 164 ${t + 6} Q140 ${t + 10} 120 ${t + 6} Z`} fill="#2E86C1" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="100" cy={t - 34} r="5" fill="#FFD23F" stroke={INK} strokeWidth="2" />
        </g>
      );
    default:
      return null;
  }
}

export function FaceItem({ id, eyes }: { id: string; eyes: [number, number, number][] }) {
  const span = [Math.min(...eyes.map(([x, , r]) => x - r)), Math.max(...eyes.map(([x, , r]) => x + r))];
  const y = eyes.reduce((s, [, ey]) => s + ey, 0) / eyes.length;
  if (id === 'shades') {
    return (
      <g>
        <line x1={span[0] - 8} y1={y - 4} x2={span[1] + 8} y2={y - 4} stroke={INK} strokeWidth="5" strokeLinecap="round" />
        {eyes.map(([x, ey, r], i) => (
          <g key={i}>
            <rect x={x - r - 5} y={ey - r * 0.7} width={2 * r + 10} height={r * 1.6} rx={r * 0.5} fill={INK} opacity="0.92" />
            <path d={`M${x - r * 0.6} ${ey - r * 0.25} l${r * 0.5} -${r * 0.3}`} stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          </g>
        ))}
      </g>
    );
  }
  if (id === 'hearts') {
    return (
      <g>
        <line x1={span[0]} y1={y - 6} x2={span[1]} y2={y - 6} stroke="#FF5FA8" strokeWidth="4" />
        {eyes.map(([x, ey, r], i) => {
          const s = (r + 7) / 20;
          return (
            <path
              key={i}
              transform={`translate(${x} ${ey - 2}) scale(${s})`}
              d="M0 14 C-22 0 -22 -16 -10 -18 C-4 -19 0 -14 0 -10 C0 -14 4 -19 10 -18 C22 -16 22 0 0 14 Z"
              fill="#FF5FA8"
              fillOpacity="0.35"
              stroke="#FF5FA8"
              strokeWidth={4 / s}
            />
          );
        })}
      </g>
    );
  }
  if (id === 'stars') {
    return (
      <g>
        <line x1={span[0]} y1={y - 6} x2={span[1]} y2={y - 6} stroke="#F2B632" strokeWidth="4" />
        {eyes.map(([x, ey, r], i) => {
          const s = (r + 8) / 20;
          return (
            <path
              key={i}
              transform={`translate(${x} ${ey}) scale(${s})`}
              d="M0 -20 L6 -7 L20 -6 L9 3 L12 18 L0 10 L-12 18 L-9 3 L-20 -6 L-6 -7 Z"
              fill="#FFD23F"
              fillOpacity="0.3"
              stroke="#F2B632"
              strokeWidth={4 / s}
              strokeLinejoin="round"
            />
          );
        })}
      </g>
    );
  }
  return null;
}

export function NeckItem({ id }: { id: string }) {
  if (id === 'bowtie') {
    return (
      <g transform="translate(100 196)">
        <path d="M0 0 L-22 -12 L-22 12 Z" fill="#FF5A5A" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M0 0 L22 -12 L22 12 Z" fill="#FF5A5A" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <circle r="6" fill="#FF8A8A" stroke={INK} strokeWidth="3" />
      </g>
    );
  }
  if (id === 'scarf') {
    return (
      <g>
        <path d="M44 184 Q100 204 156 184 L158 198 Q100 218 42 198 Z" fill="#FF9A3C" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M132 196 L146 226 L130 228 L122 200 Z" fill="#FF9A3C" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M60 192 L64 205 M84 197 L86 210 M110 198 L110 211" stroke="#FFD23F" strokeWidth="4" />
      </g>
    );
  }
  return null;
}

/** Small standalone preview of an item for the wardrobe grid. */
export function AccessoryIcon({ a }: { a: Accessory }) {
  const vb = a.slot === 'head' ? '34 -24 132 104' : a.slot === 'face' ? '40 64 120 74' : '30 168 140 64';
  const eyes: [number, number, number][] = [
    [72, 100, 19],
    [128, 100, 19],
  ];
  return (
    <svg viewBox={vb} className="acc-icon" aria-hidden="true">
      {a.slot === 'head' && <HeadItem id={a.id} ty={52} />}
      {a.slot === 'face' && (
        <>
          {eyes.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#fff" stroke={INK} strokeWidth="3" />
          ))}
          <FaceItem id={a.id} eyes={eyes} />
        </>
      )}
      {a.slot === 'neck' && <NeckItem id={a.id} />}
    </svg>
  );
}
