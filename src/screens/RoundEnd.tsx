import { useEffect, useState } from 'react';
import type { Outfit } from '../accessories';
import { Monster, type MonsterDef } from '../monsters';
import type { Save } from '../store';
import { Trail } from '../Trail';
import { Bolt, fmtTime } from './Lightning';
import { Star, type Result } from './Play';

interface Props {
  results: Result[];
  m: MonsterDef;
  outfit?: Outfit;
  save: Save;
  starsBefore: number;
  newFluent: string[];
  time?: { ms: number; best: number | null; isNew: boolean };
  prizes: number;
  onPrize: () => void;
  onAgain: () => void;
  onHome: () => void;
}

function useCountUp(to: number, ms = 900, delay = 300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / ms));
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, delay]);
  return v;
}

export function RoundEnd({ results, m, outfit, save, starsBefore, newFluent, time, prizes, onPrize, onAgain, onHome }: Props) {
  const stars = results.reduce((s, r) => s + r.stars, 0);
  const first = results.filter((r) => r.at.firstTry && !r.at.usedHelp).length;
  const speedy = results.filter((r) => r.speedy).length;
  const helped = results.filter((r) => r.at.usedHelp).length;
  const boss = results.filter((r) => r.p.boss);
  const shown = useCountUp(stars);

  return (
    <main className="end">
      <div className="monster-wrap mood-happy end-monster">
        <div className="monster big full">
          <Monster m={m} mood="happy" outfit={outfit} />
        </div>
      </div>
      <h2 className="end-title">{time?.isNew ? 'NEW RECORD!' : `${m.name} is stuffed!`}</h2>
      {time && (
        <div className={`end-time ${time.isNew ? 'record' : ''}`}>
          <Bolt /> {fmtTime(time.ms)}
          <span>{time.isNew ? (time.best ? `Old best ${fmtTime(time.best)}` : 'Your first record!') : `Best ${fmtTime(time.best ?? time.ms)}`}</span>
        </div>
      )}

      <div className="end-stars" aria-label={`${stars} stars earned`}>
        <Star size={44} /> +{shown}
      </div>

      <ul className="end-stats">
        <li style={{ ['--d' as string]: '0.5s' }}>
          <b>{first}</b> right the first time
        </li>
        <li style={{ ['--d' as string]: '0.62s' }}>
          <b>{speedy}</b> speedy
        </li>
        {boss.length > 0 && (
          <li style={{ ['--d' as string]: '0.74s' }}>
            <b>
              {boss.filter((r) => r.at.firstTry && !r.at.usedHelp).length}/{boss.length}
            </b>{' '}
            boss bites
          </li>
        )}
      </ul>

      {newFluent.length > 0 && (
        <p className="end-note">
          New super-fast fact{newFluent.length > 1 ? 's' : ''}: <b>{newFluent.join(', ')}</b>
        </p>
      )}
      {helped > 0 && newFluent.length === 0 && (
        <p className="end-note">You watched {helped === 1 ? 'one' : helped} and then solved {helped === 1 ? 'it' : 'them'}. That’s how brains get faster.</p>
      )}

      <div className="end-trail">
        <Trail save={save} m={m} outfit={outfit} fromStars={starsBefore} onOpen={onPrize} />
      </div>

      <div className="end-actions">
        {prizes > 0 ? (
          <>
            <button className="btn primary pulse" onClick={onPrize}>
              Open your prize!
            </button>
            <button className="btn secondary" onClick={onAgain}>
              Play again
            </button>
          </>
        ) : (
          <button className="btn primary" onClick={onAgain}>
            Play again
          </button>
        )}
        <button className="btn secondary" onClick={onHome}>
          Home
        </button>
      </div>
    </main>
  );
}
