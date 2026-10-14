import { useEffect, useState } from 'react';
import type { Problem } from './engine';
import { Monster, type MonsterDef, type Mood } from './monsters';
import { sfx, speak } from './sound';

// "Show me" — the monster eats the problem in front of her, then she counts what's left.
// It demonstrates the strategy (make ten, break a ten) but never prints the answer.

type Item = { id: number; kind: 'one' | 'ten'; eaten: boolean; fresh?: boolean };
type Action = { t: 'say'; text: string } | { t: 'eat'; kind: 'one' | 'ten' } | { t: 'break' };

function setup(p: Problem): { items: Item[]; script: Action[]; end: string } {
  const items: Item[] = [];
  const script: Action[] = [];
  let id = 0;
  const eat = (n: number, kind: 'one' | 'ten') => {
    for (let i = 0; i < n; i++) script.push({ t: 'eat', kind });
  };
  const end =
    p.kind === 'missing'
      ? `It ate until ${p.c} were left. How many did it eat? Count the gray ones.`
      : p.boss
        ? 'What’s left? Count the tens, then the ones.'
        : 'How many are left? Count the bright ones.';

  if (!p.boss) {
    for (let i = 0; i < p.a; i++) items.push({ id: id++, kind: 'one', eaten: false });
    const extra = p.a - 10;
    if (p.a > 10 && p.b > extra) {
      script.push({ t: 'say', text: `First eat ${extra} to get down to 10…` });
      eat(extra, 'one');
      script.push({ t: 'say', text: `…then ${p.b - extra} more.` });
      eat(p.b - extra, 'one');
    } else {
      script.push({ t: 'say', text: p.kind === 'missing' ? 'Watch the monster eat…' : `The monster eats ${p.b}.` });
      eat(p.b, 'one');
    }
    return { items, script, end };
  }

  const ta = Math.floor(p.a / 10);
  const oa = p.a % 10;
  const tb = Math.floor(p.b / 10);
  const ob = p.b % 10;
  for (let i = 0; i < ta; i++) items.push({ id: id++, kind: 'ten', eaten: false });
  for (let i = 0; i < oa; i++) items.push({ id: id++, kind: 'one', eaten: false });
  if (ob > oa) {
    script.push({ t: 'say', text: `Only ${oa} ones — not enough to eat ${ob}. Break a ten into 10 ones!` });
    script.push({ t: 'break' });
  }
  if (ob > 0) {
    script.push({ t: 'say', text: `Eat ${ob} one${ob > 1 ? 's' : ''}.` });
    eat(ob, 'one');
  }
  if (tb > 0) {
    script.push({ t: 'say', text: `Now eat ${tb} ten${tb > 1 ? 's' : ''}.` });
    eat(tb, 'ten');
  }
  return { items, script, end };
}

export function HelpDemo({ p, m, onClose }: { p: Problem; m: MonsterDef; onClose: () => void }) {
  const [run, setRun] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [caption, setCaption] = useState('');
  const [mood, setMood] = useState<Mood>('open');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { items: start, script, end } = setup(p);
    let alive = true;
    let cur = start;
    let nextId = start.length;
    setItems(start);
    setDone(false);
    setCaption('');
    setMood('open');
    const timers: number[] = [];
    let t = 500;
    const fast = p.boss ? 300 : 430;
    for (const act of script) {
      if (act.t === 'say') {
        timers.push(
          window.setTimeout(() => {
            if (!alive) return;
            setCaption(act.text);
            speak(act.text);
          }, t),
        );
        t += 1300;
      } else if (act.t === 'eat') {
        timers.push(
          window.setTimeout(() => {
            if (!alive) return;
            const idx = cur.map((x) => !x.eaten && x.kind === act.kind).lastIndexOf(true);
            if (idx < 0) return;
            cur = cur.map((x, i) => (i === idx ? { ...x, eaten: true } : x));
            setItems(cur);
            setMood('chomp');
            sfx.nibble();
            window.setTimeout(() => alive && setMood('open'), fast * 0.6);
          }, t),
        );
        t += act.kind === 'ten' ? 650 : fast;
      } else {
        timers.push(
          window.setTimeout(() => {
            if (!alive) return;
            const idx = cur.map((x) => !x.eaten && x.kind === 'ten').lastIndexOf(true);
            const ones = Array.from({ length: 10 }, () => ({ id: nextId++, kind: 'one' as const, eaten: false, fresh: true }));
            cur = [...cur.filter((_, i) => i !== idx), ...ones];
            setItems(cur);
            sfx.break();
          }, t),
        );
        t += 1400;
      }
    }
    timers.push(
      window.setTimeout(() => {
        if (!alive) return;
        setCaption(end);
        speak(end);
        setMood('happy');
        setDone(true);
      }, t + 300),
    );
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      window.speechSynthesis?.cancel();
    };
  }, [p, run]);

  const ones = items.filter((x) => x.kind === 'one');
  const tens = items.filter((x) => x.kind === 'ten');

  return (
    <section className="help" aria-live="polite">
      <div className="help-top">
        <div className="help-monster">
          <Monster m={m} mood={mood} />
        </div>
        <p className="help-caption">{caption || 'Watch…'}</p>
      </div>

      {p.boss ? (
        <div className="blocks">
          <div className="rods">
            {tens.map((x) => (
              <div key={x.id} className={`rod ${x.eaten ? 'eaten' : ''}`} aria-label={x.eaten ? 'eaten ten' : 'ten'}>
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
            ))}
          </div>
          <div className="cubes">
            {ones.map((x) => (
              <span key={x.id} className={`cube ${x.eaten ? 'eaten' : ''} ${x.fresh ? 'fresh' : ''}`} />
            ))}
          </div>
        </div>
      ) : (
        <div className="frames">
          {[0, 1].slice(0, p.a > 10 ? 2 : 1).map((f) => (
            <div className="frame" key={f}>
              {Array.from({ length: 10 }, (_, i) => {
                const it = ones[f * 10 + i];
                return <span key={i} className={`dot ${!it ? 'empty' : it.eaten ? 'eaten' : done ? 'left' : ''}`} />;
              })}
            </div>
          ))}
        </div>
      )}

      <div className="help-actions">
        <button className="btn ghost" onClick={() => setRun((r) => r + 1)}>
          Watch again
        </button>
        <button className="btn ghost" onClick={onClose}>
          Hide
        </button>
      </div>
    </section>
  );
}
