import { useRef, useState } from 'react';
import { MONSTERS, Monster, monsterById, type Mood } from '../monsters';
import { sfx, warm } from '../sound';
import { EGG_COST, eggReady, type Save } from '../store';
import { Bolt, fmtTime } from './Lightning';
import { Star } from './Play';

interface Props {
  save: Save;
  onPlay: () => void;
  onLightning: () => void;
  onZoo: () => void;
  onParent: () => void;
  onHatch: () => void;
}

export function Home({ save, onPlay, onLightning, onZoo, onParent, onHatch }: Props) {
  const m = monsterById(save.current);
  const [mood, setMood] = useState<Mood>('idle');
  const [hold, setHold] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const ready = eggReady(save);
  const allFound = save.owned.length >= MONSTERS.length;

  const poke = () => {
    sfx.boing();
    setMood('happy');
    window.setTimeout(() => setMood('idle'), 700);
  };
  const startHold = () => {
    setHold(true);
    holdTimer.current = window.setTimeout(() => {
      setHold(false);
      onParent();
    }, 1500);
  };
  const endHold = () => {
    setHold(false);
    window.clearTimeout(holdTimer.current);
  };

  return (
    <main className="home">
      <h1 className="wordmark" aria-label="Minus Monsters">
        <span>MINUS</span>
        <span className="minus-bar" aria-hidden="true" />
        <span>MONSTERS</span>
      </h1>

      <div className="home-hero">
        <div className="bubble">{m.line}</div>
        <button className={`monster-wrap hero mood-${mood}`} onClick={poke} aria-label={`Poke ${m.name}`}>
          <div className="monster big">
            <Monster m={m} mood={mood} />
          </div>
        </button>
        <div className="hero-name">{m.name}</div>
      </div>

      <div className="home-actions">
        {ready ? (
          <button className="btn primary pulse" onClick={onHatch}>
            Hatch your egg!
          </button>
        ) : (
          <button
            className="btn primary"
            onClick={() => {
              warm();
              onPlay();
            }}
          >
            Feed {m.name}
          </button>
        )}
        {ready && (
          <button
            className="btn secondary"
            onClick={() => {
              warm();
              onPlay();
            }}
          >
            Feed {m.name}
          </button>
        )}

        <div className="egg-meter" aria-label={allFound ? 'All monsters found' : `${Math.min(save.egg, EGG_COST)} of ${EGG_COST} stars to the next egg`}>
          {allFound ? (
            <span className="egg-text">
              <Star /> {save.stars} stars · every monster found!
            </span>
          ) : (
            <>
              <div className="egg-bar">
                <div className="egg-fill" style={{ width: `${Math.min(100, (save.egg / EGG_COST) * 100)}%` }} />
              </div>
              <span className="egg-text">
                <Star /> {Math.min(save.egg, EGG_COST)} / {EGG_COST} to the next egg
              </span>
            </>
          )}
        </div>

        <button
          className="btn lightning-btn"
          onClick={() => {
            warm();
            onLightning();
          }}
        >
          <Bolt /> Lightning Round
          <span className="btn-sub">{save.lightning.best ? `Best ${fmtTime(save.lightning.best)}` : 'Say it fast!'}</span>
        </button>

        <button className="btn secondary" onClick={onZoo}>
          Monster Zoo · {save.owned.length}/{MONSTERS.length}
        </button>
      </div>

      <button
        className={`grownups ${hold ? 'holding' : ''}`}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="hold-fill" aria-hidden="true" />
        Grown-ups: press and hold
      </button>
    </main>
  );
}
