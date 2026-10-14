import { useState } from 'react';
import { AccessoryIcon, type Outfit } from './accessories';
import { Monster, type MonsterDef } from './monsters';
import { sfx } from './sound';
import type { Prize } from './store';
import { PrizeIcon } from './Trail';

// Opening a Snack Trail prize. Eggs take three taps to crack; chests pop on one.

interface Props {
  prize: Prize;
  m: MonsterDef; // the monster that gets the chest item
  outfit?: Outfit;
  onDone: () => void;
  onDressUp?: () => void;
}

export function PrizeReveal({ prize, m, outfit, onDone, onDressUp }: Props) {
  const [taps, setTaps] = useState(0);
  const need = prize.kind === 'egg' ? 3 : 1;
  const out = taps >= need;

  const tap = () => {
    if (out) return;
    const t = taps + 1;
    setTaps(t);
    if (t < need) sfx.crack();
    else if (prize.kind === 'egg') sfx.hatch();
    else if (prize.kind === 'chest') sfx.chest();
    else sfx.bossWin();
  };

  const title =
    prize.kind === 'egg' ? (out ? `Meet ${prize.monster.name}!` : 'Tap the egg!') : prize.kind === 'chest' ? (out ? prize.item.name + '!' : 'Tap the chest!') : out ? 'Super star!' : 'Tap the star!';

  return (
    <div className="hatch" role="dialog" aria-modal="true" aria-label="Open your prize">
      <div className="rays" aria-hidden="true" />
      <p className="hatch-title" key={title}>
        {title}
      </p>

      {!out && prize.kind === 'egg' && (
        <>
          <button className={`egg crack-${taps}`} key={taps} onClick={tap} aria-label={`Egg, tap ${need - taps} more times`}>
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
      )}

      {!out && prize.kind !== 'egg' && (
        <button className="egg chest-btn" onClick={tap} aria-label={prize.kind === 'chest' ? 'Open the chest' : 'Tap the star'}>
          <PrizeIcon kind={prize.kind} size={170} />
        </button>
      )}

      {out && prize.kind === 'egg' && (
        <>
          <div className="monster-wrap mood-happy popin">
            <div className="monster big">
              <Monster m={prize.monster} mood="happy" />
            </div>
          </div>
          <p className="hatch-line">“{prize.monster.line}”</p>
        </>
      )}

      {out && prize.kind === 'chest' && (
        <div className="chest-reveal">
          <div className="item-rise" aria-hidden="true">
            <AccessoryIcon a={prize.item} />
          </div>
          <div className="monster-wrap mood-happy popin-late">
            <div className="monster big">
              <Monster m={m} mood="happy" outfit={outfit} />
            </div>
          </div>
          <p className="hatch-line">{m.name} is wearing it!</p>
        </div>
      )}

      {out && prize.kind === 'trophy' && (
        <>
          <div className="popin">
            <PrizeIcon kind="trophy" size={200} />
          </div>
          <p className="hatch-line">Super star #{prize.n}. You found every monster and every prize!</p>
        </>
      )}

      {out && (
        <div className="hatch-actions">
          <button className="btn primary" onClick={onDone}>
            Yay!
          </button>
          {prize.kind === 'chest' && onDressUp && (
            <button className="btn secondary" onClick={onDressUp}>
              Dress up
            </button>
          )}
        </div>
      )}
    </div>
  );
}
