import { useCallback, useEffect, useRef, useState } from 'react';
import type { Outfit } from '../accessories';
import { OP_INFO, isSpeedy, opText, type Attempt, type Problem } from '../engine';
import { FeedHand } from '../FeedHand';
import { HelpDemo } from '../Help';
import { Monster, type MonsterDef, type Mood } from '../monsters';
import { sfx, speak } from '../sound';

export interface Result {
  p: Problem;
  at: Attempt;
  speedy: boolean;
  stars: number;
}

interface Props {
  round: Problem[];
  m: MonsterDef;
  outfit?: Outfit;
  readAloud: boolean;
  onAnswer: (p: Problem, at: Attempt, stars: number) => void;
  onFinish: (results: Result[]) => void;
  onQuit: () => void;
}

const BURP_EVERY = 5;
const BITE_AT = 470; // ms after FEED when the hand reaches the mouth

type Flash = { text: string; tone: 'good' | 'great' | 'soft' | 'burp' };
type Flyer = { id: number; sx: number; sy: number; ex: number; ey: number; delay: number };

export function Play({ round, m, outfit, readAloud, onAnswer, onFinish, onQuit }: Props) {
  const [queue, setQueue] = useState(round);
  const [idx, setIdx] = useState(0);
  const [entry, setEntry] = useState('');
  const [tries, setTries] = useState(0);
  const [helped, setHelped] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mood, setMood] = useState<Mood>('open');
  const [flash, setFlash] = useState<Flash | null>(null);
  const [shake, setShake] = useState(0);
  const [crumbs, setCrumbs] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roundStars, setRoundStars] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState<{ id: number; value: number; fork: boolean } | null>(null);
  const [gaze, setGaze] = useState<[number, number]>([0, 0.2]);
  const [bossIntro, setBossIntro] = useState(false);
  const [miniIntro, setMiniIntro] = useState(false);
  const [bossWin, setBossWin] = useState(0);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const results = useRef<Result[]>([]);
  const started = useRef(performance.now());
  const timers = useRef<number[]>([]);
  const monsterRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const shakeScreen = (power: number) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    mainRef.current?.animate(
      [0, 1, -1, 0.7, -0.6, 0.3, 0].map((k) => ({ transform: `translate(${k * power}px, ${-k * power * 0.4}px)` })),
      { duration: 480, easing: 'ease-out' },
    );
  };
  const p = queue[idx];

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  // Nothing scheduled here may fire after she leaves the round.
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      window.speechSynthesis?.cancel();
    },
    [],
  );

  useEffect(() => {
    started.current = performance.now();
    if (p.boss && !p.comeback) {
      setBossIntro(true);
      setBusy(true);
      sfx.bossIntro();
      [0, 220, 440].forEach((d) => timers.current.push(window.setTimeout(() => shakeScreen(9), d)));
      const t = window.setTimeout(() => {
        setBossIntro(false);
        setBusy(false);
        started.current = performance.now();
        if (readAloud) speak(opText(p));
      }, 1400);
      timers.current.push(t);
    } else if (p.mini && !p.comeback) {
      setMiniIntro(true);
      setBusy(true);
      sfx.miniBoss();
      timers.current.push(window.setTimeout(() => shakeScreen(5), 120));
      timers.current.push(
        window.setTimeout(() => {
          setMiniIntro(false);
          setBusy(false);
          started.current = performance.now();
          if (readAloud) speak(opText(p));
        }, 1000),
      );
    } else if (readAloud) speak(opText(p));
  }, [p, readAloud]);

  const next = useCallback(
    (q: Problem[]) => {
      if (idx + 1 >= q.length) {
        onFinish(results.current);
        return;
      }
      setIdx(idx + 1);
      setEntry('');
      setTries(0);
      setHelped(false);
      setShowHelp(false);
      setMood('open');
      setGaze([0, 0.2]);
      setFlash(null);
      setFeed(null);
      setBusy(false);
    },
    [idx, onFinish],
  );

  const flyStars = (n: number) => {
    const a = monsterRef.current?.getBoundingClientRect();
    const b = starsRef.current?.getBoundingClientRect();
    if (!a || !b) return;
    const sx = a.left + a.width / 2;
    const sy = a.top + a.height * 0.45;
    const fresh = Array.from({ length: n * 2 }, (_, i) => ({
      id: Date.now() + i,
      sx: sx + (Math.random() - 0.5) * a.width * 0.5,
      sy: sy + (Math.random() - 0.5) * a.height * 0.3,
      ex: b.left + 14,
      ey: b.top + b.height / 2,
      delay: i * 70,
    }));
    setFlyers((f) => [...f, ...fresh]);
    later(() => setFlyers((f) => f.filter((x) => !fresh.includes(x))), 1300);
  };

  const submit = useCallback(() => {
    if (busy || entry === '') return;
    const val = parseInt(entry, 10);
    if (val === p.answer) {
      const at: Attempt = { firstTry: tries === 0, usedHelp: helped, ms: performance.now() - started.current };
      const speedy = isSpeedy(p, at);
      const stars = 1 + (speedy ? 1 : 0) + (p.boss ? 2 : p.mini ? 1 : 0);
      results.current.push({ p, at, speedy, stars });
      onAnswer(p, at, stars);
      const clean = at.firstTry && !at.usedHelp;
      const st = clean ? streak + 1 : 0;
      setStreak(st);
      setBusy(true);
      setShowHelp(false);
      setFlash(null);

      // 1. The hand (or the boss fork) brings the number over.
      setFeed({ id: Date.now(), value: val, fork: p.boss });
      setMood('open');
      setGaze([0.7, 0.7]);
      sfx.whoosh();

      // 2. Bite.
      later(() => {
        setMood('chomp');
        setGaze([0, 0]);
        setCrumbs((c) => c + 1);
        sfx.chomp();
        if (p.boss) {
          setBossWin((b) => b + 1);
          sfx.bossWin();
          shakeScreen(14);
        } else if (p.mini) {
          setBossWin((b) => b + 1);
          sfx.speedy();
          shakeScreen(7);
        } else if (speedy) sfx.speedy();
        else sfx.yum();
        setRoundStars((s) => s + stars);
        flyStars(stars);
        setFlash(
          p.boss
            ? { text: `BOSS BEATEN! +${stars}`, tone: 'great' }
            : p.mini
              ? { text: `MINI BOSS BEATEN! +${stars}`, tone: 'great' }
              : speedy
              ? { text: 'SPEEDY! +2', tone: 'great' }
              : { text: clean ? 'YUM! +1' : 'Got it! +1', tone: 'good' },
        );
      }, BITE_AT);

      // A missed fact comes back once, a few bites later (never right away).
      let q = queue;
      if (!clean && !p.boss && !p.comeback) {
        const firstBoss = queue.findIndex((x, i) => i > idx && x.boss);
        const end = firstBoss === -1 ? queue.length : firstBoss;
        const at2 = Math.max(Math.min(idx + 4, end), Math.min(idx + 2, queue.length));
        q = [...queue.slice(0, at2), { ...p, comeback: true, mini: false }, ...queue.slice(at2)];
        setQueue(q);
      }

      const burp = clean && st > 0 && st % BURP_EVERY === 0;
      let wait = p.boss ? 2300 : 1350;
      if (burp) {
        later(() => {
          setMood('burp');
          setFlash({ text: `${st >= 15 ? 'MEGA ' : ''}BURRRP! ${st} in a row`, tone: 'burp' });
          sfx.burp(st >= 15 ? 3 : st >= 10 ? 2 : 1);
        }, BITE_AT + 650);
        wait = 2600;
      } else later(() => setMood('happy'), BITE_AT + 450);
      later(() => next(q), wait);
    } else {
      const t = tries + 1;
      setTries(t);
      setEntry('');
      setStreak(0);
      setShake((s) => s + 1);
      setMood('confused');
      setGaze([0, 0.6]);
      sfx.oops();
      if (t >= 2) {
        setHelped(true);
        setShowHelp(true);
        setFlash({ text: 'Let’s watch it together.', tone: 'soft' });
      } else setFlash({ text: 'Hmm, not that one. Try again!', tone: 'soft' });
      later(() => {
        setMood((md) => (md === 'confused' ? 'open' : md));
        setGaze([0, 0.2]);
      }, 900);
    }
  }, [busy, entry, p, tries, helped, streak, queue, idx, onAnswer, next]);

  const press = useCallback(
    (k: string) => {
      if (busy) return;
      if (k === 'go') return submit();
      if (k === 'del') setEntry((e) => e.slice(0, -1));
      else setEntry((e) => (e.length >= 3 ? e : e === '0' ? k : e + k));
      sfx.key();
    },
    [busy, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = /^[0-9]$/.test(e.key) ? e.key : e.key === 'Backspace' ? 'del' : e.key === 'Enter' ? 'go' : null;
      if (!k) return;
      e.preventDefault(); // keeps Enter on a focused key from also clicking it
      press(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  const openHelp = () => {
    setHelped(true);
    setShowHelp(true);
  };

  const box = (
    <span
      className={`answer ${entry ? 'filled' : ''} ${feed ? 'taken' : ''} ${mood === 'confused' ? 'nope' : ''}`}
      aria-label={entry ? `your answer ${entry}` : 'your answer'}
    >
      {entry ? (
        entry.split('').map((d, i) => (
          <span className="digit" key={`${i}-${d}`}>
            {d}
          </span>
        ))
      ) : (
        <span className="qmark">?</span>
      )}
    </span>
  );

  const sym = OP_INFO[p.op].sym;
  const parts =
    p.kind === 'missing'
      ? [<span key="a">{p.a}</span>, <span key="op" className="op">{sym}</span>, <span key="box">{box}</span>, <span key="eq" className="op">=</span>, <span key="c">{p.c}</span>]
      : [<span key="a">{p.a}</span>, <span key="op" className="op">{sym}</span>, <span key="b">{p.b}</span>, <span key="eq" className="op">=</span>, <span key="box">{box}</span>];

  return (
    <main className={`play ${p.boss ? 'boss-mode' : p.mini ? 'mini-mode' : ''}`} ref={mainRef}>
      {p.boss && <div className="boss-vignette" aria-hidden="true" />}
      <header className="play-top">
        <button className="icon-btn" onClick={onQuit} aria-label="Back to home">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={idx} aria-label="Round progress">
          <div className="progress-fill" style={{ width: `${(idx / queue.length) * 100}%` }} />
          <span className="progress-text">
            {queue.length - idx} {queue.length - idx === 1 ? 'bite' : 'bites'} left
          </span>
        </div>
        <div className="round-stars" ref={starsRef} aria-label={`${roundStars} stars this round`}>
          <Star /> <span key={roundStars} className="count-pop">{roundStars}</span>
        </div>
      </header>

      <section className="stage">
        {showHelp ? (
          <HelpDemo p={p} m={m} onClose={() => setShowHelp(false)} />
        ) : (
          <div className={`monster-wrap mood-${mood} ${p.boss ? 'is-boss' : ''}`} key={idx} ref={monsterRef}>
            {p.comeback && <div className="boss-tag comeback">Comeback!</div>}
            {p.mini && <div className="boss-tag mini">Mini boss</div>}
            {(p.boss || p.mini) && <div className={`boss-aura ${p.mini ? 'mini' : ''}`} aria-hidden="true" />}
            <div className="monster big">
              <Monster m={m} mood={mood} outfit={outfit} boss={p.boss || !!p.mini} gaze={gaze} />
            </div>
            {feed && <FeedHand key={feed.id} value={feed.value} fork={feed.fork} />}
            {crumbs > 0 && mood === 'chomp' && (
              <div className="crumbs" key={crumbs} aria-hidden="true">
                {Array.from({ length: 12 }, (_, i) => (
                  <i key={i} style={{ ['--a' as string]: `${i * 30}deg` }} />
                ))}
              </div>
            )}
            {(p.boss || p.mini) && bossWin > 0 && (
              <div className="boss-burst" key={`w${bossWin}`} aria-hidden="true">
                <span className="ring" />
                <span className="ring r2" />
                {Array.from({ length: 24 }, (_, i) => (
                  <i key={i} style={{ ['--a' as string]: `${i * 15}deg`, ['--c' as string]: ['#FFD23F', '#FF5FA8', '#5CC2FF', '#B8F23A'][i % 4] }} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`card ${p.boss ? 'boss' : ''}`} key={`${idx}-${shake}`} data-shake={shake > 0 && mood === 'confused'}>
          <div className="eq" aria-live="polite">
            {parts.map((el, i) => (
              <span className="num-in" key={`${idx}-${i}`} style={{ ['--i' as string]: i }}>
                {el}
              </span>
            ))}
          </div>
          <button className="icon-btn speak" onClick={() => speak(opText(p))} aria-label="Read the problem out loud">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flash-row" aria-live="assertive">
          {flash ? (
            <span className={`flash ${flash.tone}`} key={flash.text + idx + tries}>
              {flash.text}
            </span>
          ) : streak >= 2 ? (
            <span className="streak">
              <Flame /> {streak} in a row
            </span>
          ) : null}
        </div>
      </section>

      <section className="pad-wrap">
        {!showHelp && (
          <button className={`help-btn ${tries > 0 ? 'nudge' : ''}`} onClick={openHelp} disabled={busy}>
            Show me
          </button>
        )}
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
            <button key={k} className="key" onClick={() => press(k)} disabled={busy}>
              {k}
            </button>
          ))}
          <button className="key del" onClick={() => press('del')} disabled={busy || !entry} aria-label="Delete">
            <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
              <path d="M9 5h11v14H9l-6-7z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M12 9l5 6M17 9l-5 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
          <button className="key" onClick={() => press('0')} disabled={busy}>
            0
          </button>
          <button className="key go" onClick={() => press('go')} disabled={busy || !entry}>
            FEED
          </button>
        </div>
      </section>

      {miniIntro && (
        <div className="boss-intro mini" role="alert">
          <span className="boss-slam">MINI BOSS!</span>
          <span className="boss-sub">A sneaky one. You’ve got this.</span>
        </div>
      )}

      {bossIntro && (
        <div className="boss-intro" role="alert">
          <span className="boss-slam">BOSS BITE!</span>
          <span className="boss-sub">A big one. Take your time.</span>
        </div>
      )}

      {flyers.map((f) => (
        <span
          key={f.id}
          className="flyer"
          aria-hidden="true"
          style={{
            left: f.sx,
            top: f.sy,
            ['--dx' as string]: `${f.ex - f.sx}px`,
            ['--dy' as string]: `${f.ey - f.sy}px`,
            animationDelay: `${f.delay}ms`,
          }}
        >
          <Star size={26} />
        </span>
      ))}
    </main>
  );
}

export function Star({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="star">
      <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="#FFD23F" stroke="#B8860B" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function Flame() {
  return (
    <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" aria-hidden="true" className="flame">
      <path d="M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" fill="#FF8A3C" stroke="#B8460B" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M12 12c1 2 3 3 3 5a3 3 0 01-6 0c0-1 1-2 1.5-2.5.2 1 .8 1.5 1.5 1.5 0-2-.5-3 0-4z" fill="#FFD23F" />
    </svg>
  );
}
