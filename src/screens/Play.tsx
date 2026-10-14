import { useCallback, useEffect, useRef, useState } from 'react';
import { isSpeedy, opText, type Attempt, type Problem } from '../engine';
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
  readAloud: boolean;
  onAnswer: (p: Problem, at: Attempt, stars: number) => void;
  onFinish: (results: Result[]) => void;
  onQuit: () => void;
}

const BURP_EVERY = 5;

export function Play({ round, m, readAloud, onAnswer, onFinish, onQuit }: Props) {
  const [queue, setQueue] = useState(round);
  const [idx, setIdx] = useState(0);
  const [entry, setEntry] = useState('');
  const [tries, setTries] = useState(0);
  const [helped, setHelped] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mood, setMood] = useState<Mood>('open');
  const [flash, setFlash] = useState<{ text: string; tone: 'good' | 'great' | 'soft' | 'burp' } | null>(null);
  const [shake, setShake] = useState(0);
  const [crumbs, setCrumbs] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roundStars, setRoundStars] = useState(0);
  const [busy, setBusy] = useState(false);
  const results = useRef<Result[]>([]);
  const started = useRef(performance.now());
  const p = queue[idx];

  useEffect(() => {
    started.current = performance.now();
    if (readAloud) speak(opText(p));
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
      setFlash(null);
      setBusy(false);
    },
    [idx, onFinish],
  );

  const submit = useCallback(() => {
    if (busy || entry === '') return;
    const val = parseInt(entry, 10);
    if (val === p.answer) {
      const at: Attempt = { firstTry: tries === 0, usedHelp: helped, ms: performance.now() - started.current };
      const speedy = isSpeedy(p, at);
      const stars = 1 + (speedy ? 1 : 0) + (p.boss ? 2 : 0);
      results.current.push({ p, at, speedy, stars });
      onAnswer(p, at, stars);
      setRoundStars((s) => s + stars);
      const clean = at.firstTry && !at.usedHelp;
      const st = clean ? streak + 1 : 0;
      setStreak(st);
      setBusy(true);
      setCrumbs((c) => c + 1);
      setShowHelp(false);
      sfx.chomp();
      const burp = clean && st > 0 && st % BURP_EVERY === 0;
      if (speedy) sfx.speedy();
      else sfx.yum();
      setMood('chomp');
      setFlash(
        p.boss
          ? { text: 'BOSS BEATEN! +' + stars, tone: 'great' }
          : speedy
            ? { text: 'SPEEDY! +2', tone: 'great' }
            : { text: clean ? 'YUM! +1' : 'Got it! +1', tone: 'good' },
      );

      // A missed fact comes back once, a few bites later.
      let q = queue;
      if (!clean && !p.boss && !p.comeback) {
        const firstBoss = queue.findIndex((x, i) => i > idx && x.boss);
        const at2 = Math.min(idx + 4, firstBoss === -1 ? queue.length : firstBoss);
        q = [...queue.slice(0, at2), { ...p, comeback: true }, ...queue.slice(at2)];
        setQueue(q);
      }

      let wait = 1000;
      if (burp) {
        window.setTimeout(() => {
          setMood('burp');
          setFlash({ text: `BURRRP! ${st} in a row`, tone: 'burp' });
          sfx.burp();
        }, 650);
        wait = 2100;
      } else window.setTimeout(() => setMood('happy'), 450);
      window.setTimeout(() => next(q), wait);
    } else {
      const t = tries + 1;
      setTries(t);
      setEntry('');
      setStreak(0);
      setShake((s) => s + 1);
      setMood('confused');
      sfx.oops();
      if (t >= 2) {
        setHelped(true);
        setShowHelp(true);
        setFlash({ text: 'Let’s watch it together.', tone: 'soft' });
      } else setFlash({ text: 'Hmm, not that one. Try again!', tone: 'soft' });
      window.setTimeout(() => setMood('open'), 900);
    }
  }, [busy, entry, p, tries, helped, streak, queue, idx, onAnswer, next]);

  const press = useCallback(
    (k: string) => {
      if (busy) return;
      if (k === 'go') return submit();
      sfx.key();
      if (k === 'del') setEntry((e) => e.slice(0, -1));
      else setEntry((e) => (e.length >= 3 ? e : e === '0' ? k : e + k));
    },
    [busy, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter') press('go');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  const openHelp = () => {
    setHelped(true);
    setShowHelp(true);
  };

  const box = (
    <span className={`answer ${entry ? 'filled' : ''}`} aria-label={entry ? `your answer ${entry}` : 'your answer'}>
      {entry || '?'}
    </span>
  );

  return (
    <main className="play">
      <header className="play-top">
        <button className="icon-btn" onClick={onQuit} aria-label="Back to home">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={idx} aria-label="Bites left in this round">
          <div className="progress-fill" style={{ width: `${(idx / queue.length) * 100}%` }} />
          <span className="progress-text">
            {idx + 1} / {queue.length}
          </span>
        </div>
        <div className="round-stars" aria-label={`${roundStars} stars this round`}>
          <Star /> {roundStars}
        </div>
      </header>

      <section className="stage">
        {showHelp ? (
          <HelpDemo p={p} m={m} onClose={() => setShowHelp(false)} />
        ) : (
          <div className={`monster-wrap mood-${mood}`} key={idx}>
            {p.boss && <div className="boss-tag">BOSS BITE</div>}
            {p.comeback && <div className="boss-tag comeback">Comeback!</div>}
            <div className="monster big">
              <Monster m={m} mood={mood} />
            </div>
            {crumbs > 0 && mood === 'chomp' && (
              <div className="crumbs" key={crumbs} aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => (
                  <i key={i} style={{ ['--a' as string]: `${i * 36}deg` }} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`card ${p.boss ? 'boss' : ''}`} key={`${idx}-${shake}`} data-shake={shake > 0 && mood === 'confused'}>
          <div className="eq" aria-live="polite">
            <span>{p.a}</span>
            <span className="op">−</span>
            {p.kind === 'missing' ? box : <span>{p.b}</span>}
            <span className="op">=</span>
            {p.kind === 'missing' ? <span>{p.c}</span> : box}
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
            <span className="streak">{streak} in a row</span>
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
