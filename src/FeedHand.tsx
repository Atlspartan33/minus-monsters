// A hand (or, for a boss, a giant fork) swoops in and feeds the answer to the monster.
// Positioned over the monster's mouth by CSS; the number tile vanishes at the bite.

const SKIN = '#8D5524';
const SKIN_DARK = '#5E3517';
const SKIN_LIGHT = '#A66A3A';
const INK = '#1B1033';

function Tile({ value }: { value: number }) {
  const two = value >= 10;
  return (
    <g className="feed-tile">
      <rect x="6" y="18" width="74" height="74" rx="18" fill="#FFF8EC" stroke={INK} strokeWidth="4" />
      <rect x="12" y="24" width="62" height="16" rx="8" fill="#fff" opacity="0.6" />
      <text x="43" y="72" textAnchor="middle" fontSize={two ? 40 : 50} fontWeight="700" fill={INK} fontFamily="Fredoka, sans-serif">
        {value}
      </text>
    </g>
  );
}

export function FeedHand({ value, fork }: { value: number; fork: boolean }) {
  return (
    <div className={`feed ${fork ? 'fork' : 'hand'}`} aria-hidden="true">
      <svg viewBox="0 0 230 170" overflow="visible">
        {fork ? (
          <g>
            {/* fork: the tile is skewered on the tines */}
            <g fill="#D9DEE8" stroke={INK} strokeWidth="3" strokeLinejoin="round">
              <path d="M98 30 H118 Q132 30 136 44 L142 70 Q144 82 132 84 H98 Z" />
              <path d="M136 60 L232 150 L220 164 L124 76 Z" />
            </g>
            <g stroke="#B8C0CF" strokeWidth="6" strokeLinecap="round">
              <path d="M30 36 H100 M30 51 H100 M30 66 H100 M30 81 H100" />
            </g>
            <g stroke={INK} strokeWidth="2" opacity="0.5">
              <path d="M30 36 H100 M30 51 H100 M30 66 H100 M30 81 H100" fill="none" />
            </g>
            <path d="M150 84 L210 140" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
            <Tile value={value} />
            <g fill="#D9DEE8" stroke={INK} strokeWidth="2">
              <path d="M2 33 L10 36 L2 39 Z M2 48 L10 51 L2 54 Z M2 63 L10 66 L2 69 Z M2 78 L10 81 L2 84 Z" />
            </g>
          </g>
        ) : (
          <g>
            {/* sleeve + forearm */}
            <path d="M150 62 L236 116 L222 170 L120 104 Z" fill={SKIN} stroke={SKIN_DARK} strokeWidth="3" strokeLinejoin="round" />
            <path d="M196 88 L240 114 L228 170 L180 140 Z" fill="#5CC2FF" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <path d="M196 88 L180 140" stroke="#FFD23F" strokeWidth="6" />
            {/* fingers behind the tile */}
            <g fill={SKIN} stroke={SKIN_DARK} strokeWidth="3">
              <rect x="56" y="22" width="56" height="17" rx="8.5" />
              <rect x="52" y="40" width="62" height="17" rx="8.5" />
            </g>
            <Tile value={value} />
            {/* palm + front fingers + thumb */}
            <path d="M92 42 Q130 30 152 56 Q166 80 146 102 Q122 120 98 104 Z" fill={SKIN} stroke={SKIN_DARK} strokeWidth="3" strokeLinejoin="round" />
            <g fill={SKIN} stroke={SKIN_DARK} strokeWidth="3">
              <rect x="64" y="58" width="44" height="16" rx="8" />
              <rect x="70" y="75" width="38" height="15" rx="7.5" />
            </g>
            <path d="M104 98 Q86 104 72 96 Q64 90 70 84 Q86 88 108 82" fill={SKIN_LIGHT} stroke={SKIN_DARK} strokeWidth="3" strokeLinejoin="round" />
            <path d="M110 50 Q132 46 144 60" fill="none" stroke={SKIN_LIGHT} strokeWidth="4" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
}
