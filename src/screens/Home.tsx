import { useEffect, useRef, useState } from 'react';
import { OP_INFO, OPS, bestKey, type Op } from '../engine';
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
  onTrack: (op: Op) => void;
}

const POKES = ['Hee hee! That tickles!', 'Hey! Feed me instead!', 'Boop!', 'I’m SO hungry…', 'Numbers, please!', 'Is it snack time?'];
type Trick = 'giggle' | 'spin' | 'sneeze' | 'burp' | 'hearts';
const TRICKS: Trick[] = ['giggle', 'spin', 'sneeze', 'burp', 'hearts'];
const TRICK_LINE: Record<Trick, string> = {
  giggle: 'Hee hee hee! Stop, that tickles!',
  spin: 'Wheee!',
  sneeze: 'Ah… ah… ACHOO! Numbers everywhere!',
  burp: 'Oops. Excuse me!',
  hearts: 'Aww, I love you too!',
};
export const DANCE_MS = 1920 * 2;

type Bubble = { id: number; x: number; sym: string; popped: boolean };

export function Home({ save, onPlay, onLightning, onZoo, onDressUp, onParent, onPrize, onTrack }: Props) {
  const m = monsterById(save.current);
  const outfit = save.outfits[m.id];
  const op = save.settings.op;
  const tracks = OPS.filter((o) => save.settings.ops.includes(o));
  const [mood, setMood] = useState<Mood>('idle');
  const [gaze, setGaze] = useState<[number, number]>([0, 0]);
  const [line, setLine] = useState(m.line);
  const [trick, setTrick] = useState<{ k: Trick | 'dance'; id: number } | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [hold, setHold] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const taps = useRef<number[]>([]);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const prizes = pendingPrizes(save);
  const best = save.lightning.bests[bestKey(op, save.settings.lightningLen)];

  // Eyes wander so the monster feels alive.
  useEffect(() => {
    const t = window.setInterval(() => {
      setGaze([Math.round((Math.random() * 2 - 1) * 10) / 10, Math.round((Math.random() * 1.4 - 0.5) * 10) / 10]);
    }, 2200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => setLine(m.line), [m.line]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Every so often a bubble floats up from the bottom for her to pop.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.hidden) return;
      const b = { id: Date.now(), x: 8 + Math.random() * 84, sym: ['★', '+', '−', '×', '÷', '♥', '7', '3'][Math.floor(Math.random() * 8)], popped: false };
      setBubbles((bs) => [...bs.filter((x) => Date.now() - x.id < 9000), b].slice(-4));
    }, 5200);
    return () => clearInterval(t);
  }, []);
  const pop = (id: number) => {
    sfx.pop();
    setBubbles((bs) => bs.map((b) => (b.id === id ? { ...b, popped: true } : b)));
    later(() => setBubbles((bs) => bs.filter((b) => b.id !== id)), 500);
  };

  const dance = () => {
    warm();
    timers.current.forEach(clearTimeout); // a half-finished sneeze mustn't reset the mood mid-dance
    timers.current = [];
    sfx.dance();
    later(() => sfx.dance(), 1920);
    setTrick({ k: 'dance', id: Date.now() });
    setMood('happy');
    setLine('Watch my moves!');
    later(() => {
      setTrick(null);
      setMood('idle');
    }, DANCE_MS);
  };

  const poke = () => {
    if (trick?.k === 'dance') return;
    // Four quick tickles and it bursts into a dance.
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 1600), now];
    if (taps.current.length >= 4) {
      taps.current = [];
      dance();
      return;
    }
    const k = Math.random() < 0.35 ? null : TRICKS[Math.floor(Math.random() * TRICKS.length)];
    if (!k) {
      sfx.boing();
      setMood('happy');
      setLine(POKES[Math.floor(Math.random() * POKES.length)]);
      later(() => setMood('idle'), 800);
      return;
    }
    setTrick({ k, id: now });
    setLine(TRICK_LINE[k]);
    if (k === 'giggle') {
      sfx.giggle();
      setMood('happy');
    } else if (k === 'spin') {
      sfx.boing();
      setMood('happy');
    } else if (k === 'sneeze') {
      setMood('confused');
      later(() => {
        setMood('open');
        sfx.whoosh();
      }, 500);
    } else if (k === 'burp') {
      setMood('burp');
      sfx.burp(1);
    } else {
      setMood('happy');
      sfx.sparkle();
    }
    later(() => {
      setMood('idle');
      setTrick((t) => (t?.id === now ? null : t));
    }, 1300);
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
      <div className="bubbles" aria-hidden="true">
        {bubbles.map((b) => (
          <button key={b.id} className={`pop-bubble ${b.popped ? 'popped' : ''}`} style={{ left: `${b.x}%` }} tabIndex={-1} onClick={() => pop(b.id)}>
            <span>{b.sym}</span>
          </button>
        ))}
      </div>

      <header className="home-top">
        <h1 className="wordmark" aria-label="Munch Monsters">
          <span>MUNCH</span>
          <span className="op-badge" key={op} aria-hidden="true">
            {OP_INFO[op].sym}
          </span>
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
        <button
          className={`monster-wrap hero mood-${mood} ${trick ? `trick-${trick.k}` : ''}`}
          onClick={poke}
          aria-label={`Tickle ${m.name}`}
        >
          <div className="hero-glow" aria-hidden="true" />
          <div className="monster big" key={trick?.k === 'dance' ? trick.id : 'still'}>
            <Monster m={m} mood={mood} outfit={outfit} gaze={gaze} />
          </div>
          {trick?.k === 'hearts' && (
            <div className="trick-fx hearts" key={trick.id} aria-hidden="true">
              {['♥', '♥', '♥', '♥', '♥'].map((h, i) => (
                <i key={i} style={{ ['--i' as string]: i }}>
                  {h}
                </i>
              ))}
            </div>
          )}
          {trick?.k === 'sneeze' && (
            <div className="trick-fx sneeze" key={trick.id} aria-hidden="true">
              {['3', '7', '+', '9', '−', '5', '×', '2'].map((h, i) => (
                <i key={i} style={{ ['--a' as string]: `${-70 + i * 20}deg` }}>
                  {h}
                </i>
              ))}
            </div>
          )}
        </button>
        <div className="hero-name-row">
          <span className="hero-name">{m.name}</span>
          <button className="dance-btn" onClick={dance} disabled={trick?.k === 'dance'} aria-label={`Make ${m.name} dance`}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
              <circle cx="6.5" cy="18" r="2.8" fill="currentColor" />
              <circle cx="17.5" cy="16" r="2.8" fill="currentColor" />
            </svg>
            Dance
          </button>
        </div>
      </div>

      <div className="home-actions">
        {tracks.length > 1 && (
          <div className="tracks" role="radiogroup" aria-label="What kind of math snack?">
            {tracks.map((o) => (
              <button
                key={o}
                role="radio"
                aria-checked={op === o}
                className={`track track-${o}`}
                onClick={() => {
                  sfx.key();
                  onTrack(o);
                }}
              >
                <b aria-hidden="true">{OP_INFO[o].sym}</b>
                <span>{OP_INFO[o].name}</span>
              </button>
            ))}
          </div>
        )}
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

        <Trail save={save} m={m} outfit={outfit} compact onOpen={go(onPrize)} />

        <div className="home-row">
          <button className="btn secondary" onClick={onZoo}>
            Zoo · {save.owned.filter((id) => MONSTERS.some((m) => m.id === id)).length}/{MONSTERS.length}
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
