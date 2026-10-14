import { useEffect, useRef, useState } from 'react';
import { MONSTERS, Monster, monsterById, type Mood } from '../monsters';
import { sfx, warm } from '../sound';
import { pendingPrizes, type Save } from '../store';
import { Trail } from '../Trail';
import { Bolt, fmtTime } from './Lightning';
import { Star } from './Play';

interface Props {
  save: Save;
  onPlay: () => void;
  onLightning: () => void;
  onZoo: () => void;
  onDressUp: () => void;
  onParent: () => void;
  onPrize: () => void;
}

const POKES = ['Hee hee! That tickles!', 'Hey! Feed me instead!', 'Boop!', 'I’m SO hungry…', 'Numbers, please!', 'Is it snack time?'];

export function Home({ save, onPlay, onLightning, onZoo, onDressUp, onParent, onPrize }: Props) {
  const m = monsterById(save.current);
  const outfit = save.outfits[m.id];
  const [mood, setMood] = useState<Mood>('idle');
  const [gaze, setGaze] = useState<[number, number]>([0, 0]);
  const [line, setLine] = useState(m.line);
  const [hold, setHold] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const prizes = pendingPrizes(save);
  const best = save.lightning.bests[String(save.settings.lightningLen)];

  // Eyes wander so the monster feels alive.
  useEffect(() => {
    const t = window.setInterval(() => {
      setGaze([Math.round((Math.random() * 2 - 1) * 10) / 10, Math.round((Math.random() * 1.4 - 0.5) * 10) / 10]);
    }, 2200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => setLine(m.line), [m.line]);

  const poke = () => {
    sfx.boing();
    setMood('happy');
    setLine(POKES[Math.floor(Math.random() * POKES.length)]);
    window.setTimeout(() => setMood('idle'), 800);
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
  const go = (fn: () => void) => () => {
    warm();
    fn();
  };

  return (
    <main className="home">
      <header className="home-top">
        <h1 className="wordmark" aria-label="Minus Monsters">
          <span>MINUS</span>
          <span className="minus-bar" aria-hidden="true" />
          <span>MONSTERS</span>
        </h1>
        <div className="star-chip" aria-label={`${save.stars} stars`}>
          <Star size={24} /> {save.stars}
        </div>
      </header>

      <div className="home-hero">
        <div className="bubble" key={line}>
          {line}
        </div>
        <button className={`monster-wrap hero mood-${mood}`} onClick={poke} aria-label={`Poke ${m.name}`}>
          <div className="hero-glow" aria-hidden="true" />
          <div className="monster big">
            <Monster m={m} mood={mood} outfit={outfit} gaze={gaze} />
          </div>
        </button>
        <div className="hero-name">{m.name}</div>
      </div>

      <div className="home-actions">
        {prizes > 0 ? (
          <button className="btn primary pulse" onClick={go(onPrize)}>
            Open your prize!{prizes > 1 ? ` (${prizes})` : ''}
          </button>
        ) : (
          <button className="btn primary" onClick={go(onPlay)}>
            Feed {m.name}
          </button>
        )}
        {prizes > 0 && (
          <button className="btn secondary" onClick={go(onPlay)}>
            Feed {m.name}
          </button>
        )}
        <button className="btn lightning-btn" onClick={go(onLightning)}>
          <Bolt /> Lightning Round
          <span className="btn-sub">{best ? `Best ${fmtTime(best)} for ${save.settings.lightningLen}` : 'Say it fast!'}</span>
        </button>

        <Trail save={save} m={m} outfit={outfit} compact />

        <div className="home-row">
          <button className="btn secondary" onClick={onZoo}>
            Zoo · {save.owned.length}/{MONSTERS.length}
          </button>
          <button className="btn secondary" onClick={onDressUp}>
            Dress up
          </button>
        </div>
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
