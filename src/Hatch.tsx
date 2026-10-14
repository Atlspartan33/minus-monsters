import { useState } from 'react';
import { Monster, type MonsterDef } from './monsters';
import { sfx } from './sound';

// Tap the egg three times to crack it.
export function Hatch({ m, onDone }: { m: MonsterDef; onDone: () => void }) {
  const [taps, setTaps] = useState(0);
  const out = taps >= 3;

  const tap = () => {
    if (out) return;
    const t = taps + 1;
    setTaps(t);
    if (t >= 3) sfx.hatch();
    else sfx.crack();
  };

  return (
    <div className="hatch" role="dialog" aria-modal="true" aria-label="Hatch your egg">
      {!out ? (
        <>
          <p className="hatch-title">Tap the egg!</p>
          <button className={`egg crack-${taps}`} key={taps} onClick={tap} aria-label={`Egg, tap ${3 - taps} more times`}>
            <svg viewBox="0 0 160 200" aria-hidden="true">
              <defs>
                <radialGradient id="eggg" cx="35%" cy="30%" r="80%">
                  <stop offset="0" stopColor="#FFFFFF" />
                  <stop offset="1" stopColor="#F3D9FF" />
                </radialGradient>
              </defs>
              <path d="M80 8 C122 8 152 82 152 124 C152 166 120 194 80 194 C40 194 8 166 8 124 C8 82 38 8 80 8Z" fill="url(#eggg)" stroke="#1B1033" strokeWidth="4" />
              <g fill="#FF5FA8">
                <circle cx="50" cy="90" r="9" />
                <circle cx="108" cy="70" r="7" />
                <circle cx="112" cy="140" r="10" />
                <circle cx="56" cy="158" r="7" />
              </g>
              {taps >= 1 && <path d="M30 112 l18 10 l14 -12 l16 12 l14 -10" fill="none" stroke="#1B1033" strokeWidth="4" strokeLinejoin="round" />}
              {taps >= 2 && <path d="M92 112 l16 12 l14 -10 l16 10" fill="none" stroke="#1B1033" strokeWidth="4" strokeLinejoin="round" />}
            </svg>
          </button>
          <div className="hatch-dots" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < taps ? 'on' : ''} />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="hatch-title">Meet {m.name}!</p>
          <div className="monster-wrap mood-happy popin">
            <div className="monster big">
              <Monster m={m} mood="happy" />
            </div>
          </div>
          <p className="hatch-line">“{m.line}”</p>
          <button className="btn primary" onClick={onDone}>
            Yay!
          </button>
        </>
      )}
    </div>
  );
}
