import { useCallback, useEffect, useRef, useState } from 'react';
import type { Outfit } from '../accessories';
import { LIGHTNING_LENGTHS } from '../store';
import { VOICE_FAST_MS, isSpeedy, type Attempt, type Problem } from '../engine';
import { Monster, type MonsterDef, type Mood } from '../monsters';
import { sfx, warm } from '../sound';
import { createListener, voiceAvailable, voiceProblem, type Heard, type Listener } from '../voice';
import { MicCheck } from '../MicCheck';
import { Star, type Result } from './Play';

// Lightning Round: say the answer before the cookie rolls into the monster's mouth.
// The cookie is the timer, but nothing is lost when it arrives; the monster just waits.
// The real race is against her own best time (the ghost on the progress bar).

const ROLL_MS = 5000;

interface Props {
  round: Problem[];
  m: MonsterDef;
  outfit?: Outfit;
  bests: Record<string, number>;
  onLen: (n: number) => void;
  onAnswer: (p: Problem, at: Attempt, stars: number) => void;
  onFinish: (results: Result[], totalMs: number) => void;
  onQuit: () => void;
}

type Flash = { text: string; tone: 'good' | 'great' | 'soft' };

export const fmtTime = (ms: number) => {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
};

export function Lightning({ round, m, outfit, bests, onLen, onAnswer, onFinish, onQuit }: Props) {
  const best = bests[String(round.length)] ?? null;
  const problem = voiceProblem();
  const [phase, setPhase] = useState<'ready' | 'count' | 'go'>('ready');
  const [count, setCount] = useState(3);
  const [queue, setQueue] = useState(round);
  const [idx, setIdx] = useState(0);
  const [mood, setMood] = useState<Mood>('open');
  const [flash, setFlash] = useState<Flash | null>(null);
  const [heard, setHeard] = useState('');
  const [mic, setMic] = useState<'off' | 'listening' | 'hearing' | 'blocked'>('off');
  const [checking, setChecking] = useState(false);
  const [typing, setTyping] = useState(!voiceAvailable());
  const [entry, setEntryState] = useState('');
  const entryRef = useRef('');
  const setEntry = (v: string | ((e: string) => string)) => {
    entryRef.current = typeof v === 'function' ? v(entryRef.current) : v;
    setEntryState(entryRef.current);
  };
  const [snatch, setSnatch] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stars, setStars] = useState(0);
  const g = useRef({ idx: 0, queue: round, tries: 0, busy: true, shownAt: 0, firstHeardAt: 0, startAt: 0, results: [] as Result[], done: false });
  const listener = useRef<Listener | null>(null);
  const micOn = useRef(false);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  useEffect(
    () => () => {
      listener.current?.stop();
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  useEffect(() => {
    if (phase !== 'go') return;
    const t = window.setInterval(() => {
      if (!g.current.done) setElapsed(performance.now() - g.current.startAt);
    }, 100);
    return () => clearInterval(t);
  }, [phase]);

  const show = useCallback((i: number) => {
    const s = g.current;
    s.idx = i;
    s.tries = 0;
    s.busy = false;
    s.shownAt = performance.now();
    s.firstHeardAt = 0;
    listener.current?.mark();
    setIdx(i);
    setMood('open');
    setHeard('');
    setEntry('');
    setSnatch(false);
    setFlash(null);
  }, []);

  const advance = useCallback(() => {
    const s = g.current;
    if (s.idx + 1 >= s.queue.length) {
      s.done = true;
      listener.current?.stop();
      onFinish(s.results, performance.now() - s.startAt);
    } else show(s.idx + 1);
  }, [onFinish, show]);

  const resolve = useCallback(
    (val: number, via: 'voice' | 'type') => {
      const s = g.current;
      if (s.busy) return;
      const p = s.queue[s.idx];
      const now = performance.now();
      if (val === p.answer) {
        s.busy = true;
        const ms = via === 'voice' && s.firstHeardAt ? s.firstHeardAt - s.shownAt : now - s.shownAt;
        const at: Attempt = { firstTry: s.tries === 0, usedHelp: false, ms, voice: via === 'voice' };
        const speedy = isSpeedy(p, at);
        const st = 1 + (speedy ? 1 : 0);
        s.results.push({ p, at, speedy, stars: st });
        onAnswer(p, at, st);
        setStars((x) => x + st);
        setEntry(String(val));
        setSnatch(true);
        setMood('chomp');
        sfx.chomp();
        if (speedy) sfx.speedy();
        else sfx.yum();
        setFlash(speedy ? { text: 'SPEEDY! +2', tone: 'great' } : { text: 'GULP! +1', tone: 'good' });
        later(advance, 850);
        return;
      }
      s.tries++;
      sfx.oops();
      setMood('confused');
      // Mishearings happen, so a spoken answer gets one extra try.
      if (s.tries >= (via === 'voice' ? 3 : 2)) {
        // Show the whole fact, then bring it back at the end of the round.
        s.busy = true;
        onAnswer(p, { firstTry: false, usedHelp: true, ms: now - s.shownAt, voice: via === 'voice' }, 0);
        if (!p.comeback) {
          s.queue = [...s.queue, { ...p, comeback: true }];
          setQueue(s.queue);
        }
        setFlash({ text: `${p.a} − ${p.b} is ${p.answer}. It’ll come back!`, tone: 'soft' });
        later(advance, 2400);
      } else {
        setFlash({ text: via === 'voice' ? `I heard ${val}. Try again!` : 'Not that one. Try again!', tone: 'soft' });
        later(() => setMood('open'), 800);
      }
    },
    [advance, onAnswer],
  );

  const onHeard = useCallback(
    (h: Heard) => {
      const s = g.current;
      if (s.busy || s.done) return;
      setHeard(h.text);
      const p = s.queue[s.idx];
      // Interim results are guesses: trust only the top one until it's final.
      const alts = h.final ? h.alts : h.alts.slice(0, 1);
      // The clock stops when she starts saying a number, not at any noise (TJ, the TV).
      if (!s.firstHeardAt && alts.some((n) => n.length > 0)) s.firstHeardAt = performance.now();
      // Reading the problem out loud ("thirteen minus seven", or a pause after "thirteen") isn't an answer.
      const readingIt = (nums: number[]) =>
        (nums.length >= 2 && nums[nums.length - 2] === p.a && nums[nums.length - 1] === p.b) || (nums.length === 1 && nums[0] === p.a);
      if (alts.some((nums) => nums.length > 0 && nums[nums.length - 1] === p.answer && !readingIt(nums))) {
        resolve(p.answer, 'voice');
        return;
      }
      if (!h.final) return;
      const nums = h.alts[0] ?? [];
      const last = nums[nums.length - 1];
      if (last === undefined || readingIt(nums)) {
        setFlash({ text: 'Didn’t catch that. Say it again!', tone: 'soft' });
        return;
      }
      resolve(last, 'voice');
    },
    [resolve],
  );

  const heardRef = useRef(onHeard);
  heardRef.current = onHeard;
  const listen = () => {
    if (listener.current) return;
    listener.current = createListener(
      (h) => heardRef.current(h),
      (st) => {
        if (st === 'blocked' || st === 'offline') {
          listener.current = null;
          setMic('blocked');
          setTyping(true);
          setFlash({
            text: st === 'offline' ? 'The mic needs internet. Type your answers instead!' : 'The mic is off. Type your answers instead!',
            tone: 'soft',
          });
        } else {
          micOn.current = st === 'listening' || st === 'hearing';
          setMic(st === 'listening' || st === 'hearing' ? st : 'off');
        }
      },
    );
    micOn.current = false;
    listener.current?.start();
    // A recognizer that never starts would leave "Starting the mic…" up forever.
    later(() => {
      if (!listener.current || micOn.current) return;
      listener.current.stop();
      listener.current = null;
      setMic('blocked');
      setTyping(true);
      setFlash({ text: 'The mic didn’t start. Type your answers instead!', tone: 'soft' });
    }, 6000);
  };

  const start = () => {
    warm();
    if (!typing) listen();
    setPhase('count');
    [3, 2, 1].forEach((n, i) =>
      later(() => {
        setCount(n);
        sfx.key();
      }, i * 700),
    );
    later(() => {
      sfx.boing();
      g.current.startAt = performance.now();
      setPhase('go');
      show(0);
    }, 2100);
  };

  const press = (k: string) => {
    if (g.current.busy) return;
    if (k === 'go') {
      if (entryRef.current) resolve(parseInt(entryRef.current, 10), 'type');
      setEntry('');
      return;
    }
    if (k === 'del') setEntry((e) => e.slice(0, -1));
    else setEntry((e) => (e.length >= 2 ? e : e === '0' ? k : e + k));
    sfx.key();
  };

  useEffect(() => {
    if (phase !== 'go' || !typing) return;
    const onKey = (e: KeyboardEvent) => {
      const k = /^[0-9]$/.test(e.key) ? e.key : e.key === 'Backspace' ? 'del' : e.key === 'Enter' ? 'go' : null;
      if (!k) return;
      e.preventDefault();
      press(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (phase !== 'go') {
    return (
      <main className="lightning ready">
        <header className="sub-top">
          <button className="icon-btn" onClick={onQuit} aria-label="Back to home">
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="bolt-title">
            <Bolt /> Lightning Round
          </h2>
          <span />
        </header>
        <div className="ready-body">
          {phase === 'count' ? (
            <div className="countdown" key={count} aria-live="assertive">
              {count}
            </div>
          ) : (
            <>
              <div className="monster-wrap mood-idle">
                <div className="monster big">
                  <Monster m={m} mood="open" outfit={outfit} />
                </div>
              </div>
              <div className="len-pick">
                <span className="len-label">How many problems?</span>
                <div className="seg len-seg" role="radiogroup" aria-label="How many problems">
                  {LIGHTNING_LENGTHS.map((n) => (
                    <button
                      key={n}
                      role="radio"
                      aria-checked={round.length === n}
                      onClick={() => {
                        sfx.key();
                        onLen(n);
                      }}
                    >
                      <b>{n}</b>
                      <small>{bests[String(n)] ? fmtTime(bests[String(n)]) : 'no record'}</small>
                    </button>
                  ))}
                </div>
              </div>
              <p className="ready-line">
                {typing ? 'Type each answer fast.' : 'Say each answer out loud.'} Beat the cookie to {m.name}’s mouth!
              </p>
              <p className="ready-best">{best ? `Your best for ${round.length}: ${fmtTime(best)}` : `${round.length} problems. Set your first record!`}</p>
              {problem && <p className="ready-note">{problem} You can still race by typing.</p>}
              <div className="ready-actions">
                <button className="btn primary" onClick={start}>
                  {typing ? 'Start (typing)' : 'Start'}
                </button>
                {!problem && (
                  <button className="btn secondary" onClick={() => setTyping((t) => !t)}>
                    {typing ? 'Use my voice instead' : 'Type instead'}
                  </button>
                )}
              </div>
              {!problem && !typing && (
                <button className="help-btn mic-test-btn" onClick={() => setChecking(true)}>
                  Test the mic
                </button>
              )}
              {checking && <MicCheck onClose={() => setChecking(false)} />}
            </>
          )}
        </div>
      </main>
    );
  }

  const p = queue[idx];
  const ghost = best ? Math.min(1, elapsed / best) : null;

  return (
    <main className={`play lightning ${typing ? 'typing' : 'talking'}`}>
      <header className="play-top">
        <button className="icon-btn" onClick={onQuit} aria-label="Back to home">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={idx} aria-label="Round progress">
          <div className="progress-fill" style={{ width: `${(idx / queue.length) * 100}%` }} />
          {ghost !== null && <div className="ghost-mark" style={{ left: `${ghost * 100}%` }} title="Your best run" aria-hidden="true" />}
          <span className="progress-text">{fmtTime(elapsed)}</span>
        </div>
        <div className="round-stars" aria-label={`${stars} stars this round`}>
          <Star /> {stars}
        </div>
      </header>

      <section className="stage">
        {best && <p className="pace">{ghost !== null && idx / queue.length >= ghost ? 'You’re ahead of your best!' : 'Beat the pink line. That’s your best!'}</p>}
        <div className="race">
          <div className="track" aria-hidden="true">
            <div className="speedy-zone" key={`z${idx}`} style={{ width: `${(VOICE_FAST_MS / ROLL_MS) * 100}%` }}>
              <Bolt />
            </div>
            <div className={`cookie ${snatch ? 'snatched' : ''}`} key={idx} style={{ animationDuration: `${ROLL_MS}ms` }}>
              <span className="cookie-spin" style={{ animationDuration: `${ROLL_MS}ms` }} />
            </div>
          </div>
          <div className={`monster-wrap mood-${mood} race-monster`}>
            <div className="monster">
              <Monster m={m} mood={mood} outfit={outfit} gaze={snatch ? [0, 0] : [-0.8, 0.3]} />
            </div>
          </div>
        </div>

        <div className="card" key={idx}>
          <div className="eq" aria-live="polite">
            {[
              <span key="a">{p.a}</span>,
              <span key="o" className="op">−</span>,
              <span key="b">{p.b}</span>,
              <span key="e" className="op">=</span>,
              <span key="x" className={`answer ${entry ? 'filled' : ''} ${snatch ? 'taken' : ''}`}>
                {entry ? (
                  entry.split('').map((d, i) => (
                    <span className="digit" key={`${i}-${d}`}>
                      {d}
                    </span>
                  ))
                ) : (
                  <span className="qmark">?</span>
                )}
              </span>,
            ].map((el, i) => (
              <span className="num-in" key={`${idx}-${i}`} style={{ ['--i' as string]: i }}>
                {el}
              </span>
            ))}
          </div>
        </div>

        <div className="flash-row" aria-live="assertive">
          {flash ? (
            <span className={`flash ${flash.tone}`} key={flash.text + idx}>
              {flash.text}
            </span>
          ) : !typing && heard ? (
            <span className="heard">I heard: “{heard}”</span>
          ) : null}
        </div>
      </section>

      <section className="pad-wrap">
        {!typing ? (
          <>
            <div className={`mic ${mic}`} role="status">
              <span className="mic-dot" aria-hidden="true" />
              {mic === 'hearing' ? 'I hear you…' : mic === 'listening' ? 'Listening… say the answer!' : 'Starting the mic…'}
            </div>
            <button
              className="help-btn"
              onClick={() => {
                listener.current?.stop();
                listener.current = null;
                setMic('off');
                setTyping(true);
              }}
            >
              Type instead
            </button>
          </>
        ) : (
          <>
            <div className="keypad compact">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
                <button key={k} className="key" onClick={() => press(k)}>
                  {k}
                </button>
              ))}
              <button className="key del" onClick={() => press('del')} disabled={!entry} aria-label="Delete">
                <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
                  <path d="M9 5h11v14H9l-6-7z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
                  <path d="M12 9l5 6M17 9l-5 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </button>
              <button className="key" onClick={() => press('0')}>
                0
              </button>
              <button className="key go" onClick={() => press('go')} disabled={!entry}>
                FEED
              </button>
            </div>
            {mic !== 'blocked' && voiceAvailable() && (
              <button
                className="help-btn"
                onClick={() => {
                  setTyping(false);
                  listen();
                }}
              >
                Use my voice
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export function Bolt() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" className="bolt">
      <path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="#FFD23F" stroke="#B8860B" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
