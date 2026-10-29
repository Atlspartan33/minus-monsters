import { useEffect, useState } from 'react';
import type { Problem } from './engine';
import { Monster, type MonsterDef, type Mood } from './monsters';
import { sfx, speak } from './sound';

// "Show me" — the monster acts the problem out in front of her, then she counts.
// Minus: it eats (make ten, break a ten). Plus: it adds (fill the ten, snap ten ones into a ten).
// Times: it fills plates with equal groups. Share: it deals snacks onto plates one at a time.
// It never prints the answer.

type Item = { id: number; kind: 'one' | 'ten'; eaten: boolean; fresh?: boolean; added?: boolean };
type Action =
  | { t: 'say'; text: string }
  | { t: 'eat'; kind: 'one' | 'ten' }
  | { t: 'add'; kind: 'one' | 'ten' }
  | { t: 'break' }
  | { t: 'snap' }
  | { t: 'plate'; plate: number; kind: 'one' | 'ten' };

type Model = { items: Item[]; plates: number; script: Action[]; end: string };

function setup(p: Problem): Model {
  const items: Item[] = [];
  const script: Action[] = [];
  let id = 0;
  const put = (n: number, kind: 'one' | 'ten') => {
    for (let i = 0; i < n; i++) items.push({ id: id++, kind, eaten: false });
  };
  const repeat = (n: number, act: Action) => {
    for (let i = 0; i < n; i++) script.push(act);
  };
  const say = (text: string) => script.push({ t: 'say', text });
  const ta = Math.floor(p.a / 10);
  const oa = p.a % 10;
  const tb = Math.floor(p.b / 10);
  const ob = p.b % 10;

  if (p.op === 'mul') {
    // a plates, b on each (3 × 20: three plates of two tens).
    const tens = p.b >= 20;
    say(`${p.a} plate${p.a > 1 ? 's' : ''}. ${p.b} snack${p.b > 1 ? 's' : ''} on each plate.`);
    for (let pl = 0; pl < p.a; pl++) repeat(tens ? p.b / 10 : p.b, { t: 'plate', plate: pl, kind: tens ? 'ten' : 'one' });
    return { items, plates: p.a, script, end: tens ? 'How many in all? Count the tens.' : `How many snacks in all? Count them, or count by ${p.b}s!` };
  }
  if (p.op === 'div') {
    // Deal a snacks round-robin onto b plates (60 ÷ 3: deal six tens).
    const tens = p.a >= 20 && p.a % 10 === 0 && p.c >= 10;
    const n = tens ? p.a / 10 : p.a;
    put(n, tens ? 'ten' : 'one');
    say(`Share ${p.a} snacks onto ${p.b} plate${p.b > 1 ? 's' : ''}, one at a time.`);
    for (let i = 0; i < n; i++) script.push({ t: 'plate', plate: i % p.b, kind: tens ? 'ten' : 'one' });
    return { items, plates: p.b, script, end: tens ? 'How many on each plate? Count the tens.' : 'How many snacks on each plate?' };
  }

  if (p.op === 'add') {
    const missing = p.kind === 'missing';
    if (!p.boss) {
      put(p.a, 'one');
      const need = 10 - p.a;
      if (missing) {
        say(`Add snacks until there are ${p.c}…`);
        repeat(p.b, { t: 'add', kind: 'one' });
      } else if (p.a < 10 && p.b > need) {
        say(`First add ${need} to fill the ten…`);
        repeat(need, { t: 'add', kind: 'one' });
        say(`…then ${p.b - need} more.`);
        repeat(p.b - need, { t: 'add', kind: 'one' });
      } else {
        say(`The monster adds ${p.b}.`);
        repeat(p.b, { t: 'add', kind: 'one' });
      }
      return {
        items,
        plates: 0,
        script,
        end: missing ? `There are ${p.c} now. How many did it add? Count the blue ones.` : 'How many are there now? Count them all.',
      };
    }
    put(ta, 'ten');
    put(oa, 'one');
    if (ob > 0) {
      say(`Add ${ob} one${ob > 1 ? 's' : ''}.`);
      repeat(ob, { t: 'add', kind: 'one' });
    }
    if (oa + ob >= 10) {
      say('Ten ones! Snap them together into a ten.');
      script.push({ t: 'snap' });
    }
    if (tb > 0) {
      say(`Now add ${tb} ten${tb > 1 ? 's' : ''}.`);
      repeat(tb, { t: 'add', kind: 'ten' });
    }
    return { items, plates: 0, script, end: 'How many in all? Count the tens, then the ones.' };
  }

  // Subtraction.
  const end =
    p.kind === 'missing'
      ? `It ate until ${p.c} were left. How many did it eat? Count the gray ones.`
      : p.boss
        ? 'What’s left? Count the tens, then the ones.'
        : 'How many are left? Count the bright ones.';
  if (!p.boss) {
    put(p.a, 'one');
    const extra = p.a - 10;
    if (p.a > 10 && p.b > extra) {
      say(`First eat ${extra} to get down to 10…`);
      repeat(extra, { t: 'eat', kind: 'one' });
      say(`…then ${p.b - extra} more.`);
      repeat(p.b - extra, { t: 'eat', kind: 'one' });
    } else {
      say(p.kind === 'missing' ? 'Watch the monster eat…' : `The monster eats ${p.b}.`);
      repeat(p.b, { t: 'eat', kind: 'one' });
    }
    return { items, plates: 0, script, end };
  }
  put(ta, 'ten');
  put(oa, 'one');
  if (ob > oa) {
    say(`Only ${oa} ones — not enough to eat ${ob}. Break a ten into 10 ones!`);
    script.push({ t: 'break' });
  }
  if (ob > 0) {
    say(`Eat ${ob} one${ob > 1 ? 's' : ''}.`);
    repeat(ob, { t: 'eat', kind: 'one' });
  }
  if (tb > 0) {
    say(`Now eat ${tb} ten${tb > 1 ? 's' : ''}.`);
    repeat(tb, { t: 'eat', kind: 'ten' });
  }
  return { items, plates: 0, script, end };
}

export function HelpDemo({ p, m, onClose }: { p: Problem; m: MonsterDef; onClose: () => void }) {
  const [run, setRun] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [plates, setPlates] = useState<Item[][]>([]);
  const [caption, setCaption] = useState('');
  const [mood, setMood] = useState<Mood>('open');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { items: start, plates: nPlates, script, end } = setup(p);
    let alive = true;
    let cur = start;
    let curPlates: Item[][] = Array.from({ length: nPlates }, () => []);
    let nextId = start.length;
    setItems(start);
    setPlates(curPlates);
    setDone(false);
    setCaption('');
    setMood('open');
    const timers: number[] = [];
    const at = (t: number, fn: () => void) => timers.push(window.setTimeout(() => alive && fn(), t));
    const bite = (ms: number) => {
      setMood('chomp');
      window.setTimeout(() => alive && setMood('open'), ms);
    };
    let t = 500;
    const fast = p.boss ? 300 : 430;
    // Plates can hold up to 100 snacks; keep the whole demo near six seconds.
    const steps = script.filter((a) => a.t === 'plate').length;
    const dealMs = steps ? Math.max(70, Math.min(380, 6000 / steps)) : 0;
    for (const act of script) {
      if (act.t === 'say') {
        at(t, () => {
          setCaption(act.text);
          speak(act.text);
        });
        t += 1300;
      } else if (act.t === 'eat') {
        at(t, () => {
          const idx = cur.map((x) => !x.eaten && x.kind === act.kind).lastIndexOf(true);
          if (idx < 0) return;
          cur = cur.map((x, i) => (i === idx ? { ...x, eaten: true } : x));
          setItems(cur);
          bite(fast * 0.6);
          sfx.nibble();
        });
        t += act.kind === 'ten' ? 650 : fast;
      } else if (act.t === 'add') {
        at(t, () => {
          cur = [...cur, { id: nextId++, kind: act.kind, eaten: false, fresh: true, added: true }];
          setItems(cur);
          bite(fast * 0.5);
          sfx.pop();
        });
        t += act.kind === 'ten' ? 650 : fast;
      } else if (act.t === 'plate') {
        at(t, () => {
          // Sharing takes from the pile; times just serves fresh ones.
          const idx = cur.map((x) => !x.eaten && x.kind === act.kind).lastIndexOf(true);
          if (idx >= 0) {
            cur = cur.map((x, i) => (i === idx ? { ...x, eaten: true } : x));
            setItems(cur);
          }
          curPlates = curPlates.map((pl, i) => (i === act.plate ? [...pl, { id: nextId++, kind: act.kind, eaten: false, fresh: true }] : pl));
          setPlates(curPlates);
          if (dealMs > 150) bite(dealMs * 0.5);
          sfx.pop();
        });
        t += act.kind === 'ten' ? Math.max(dealMs, 450) : dealMs;
      } else if (act.t === 'snap') {
        at(t, () => {
          let n = 0;
          cur = cur.filter((x) => (x.kind === 'one' && !x.eaten && n < 10 ? (n++, false) : true));
          cur = [...cur, { id: nextId++, kind: 'ten', eaten: false, fresh: true, added: true }];
          setItems(cur);
          sfx.break();
        });
        t += 1400;
      } else {
        at(t, () => {
          const idx = cur.map((x) => !x.eaten && x.kind === 'ten').lastIndexOf(true);
          const ones = Array.from({ length: 10 }, () => ({ id: nextId++, kind: 'one' as const, eaten: false, fresh: true }));
          cur = [...cur.filter((_, i) => i !== idx), ...ones];
          setItems(cur);
          sfx.break();
        });
        t += 1400;
      }
    }
    at(t + 300, () => {
      setCaption(end);
      speak(end);
      setMood('happy');
      setDone(true);
    });
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      window.speechSynthesis?.cancel();
    };
  }, [p, run]);

  const ones = items.filter((x) => x.kind === 'one');
  const tens = items.filter((x) => x.kind === 'ten');
  const grouped = p.op === 'mul' || p.op === 'div';
  // Plus problems grow, so leave room for the total.
  const frameCount = Math.ceil(Math.max(p.a, p.op === 'add' ? p.c : 0) / 10);
  const addMissing = p.op === 'add' && p.kind === 'missing';

  return (
    <section className="help" aria-live="polite">
      <div className="help-top">
        <div className="help-monster">
          <Monster m={m} mood={mood} />
        </div>
        <p className="help-caption">{caption || 'Watch…'}</p>
      </div>

      {grouped ? (
        <div className="plates-wrap">
          {p.op === 'div' && ones.length + tens.length > 0 && (
            <div className="pile" aria-label="snacks to share">
              {items.map((x) =>
                x.kind === 'ten' ? (
                  <div key={x.id} className={`rod mini ${x.eaten ? 'gone' : ''}`}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <span key={i} />
                    ))}
                  </div>
                ) : (
                  <span key={x.id} className={`snack ${x.eaten ? 'gone' : ''}`} />
                ),
              )}
            </div>
          )}
          <div className={`plates n${plates.length}`}>
            {plates.map((pl, i) => (
              <div className={`plate ${done ? 'done' : ''}`} key={i} aria-label={`plate ${i + 1}`}>
                {pl.map((x) =>
                  x.kind === 'ten' ? (
                    <div key={x.id} className="rod mini fresh">
                      {Array.from({ length: 10 }, (_, j) => (
                        <span key={j} />
                      ))}
                    </div>
                  ) : (
                    <span key={x.id} className="snack fresh" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      ) : p.boss ? (
        <div className="blocks">
          <div className="rods">
            {tens.map((x) => (
              <div key={x.id} className={`rod ${x.eaten ? 'eaten' : ''} ${x.added ? 'added fresh' : ''}`} aria-label={x.eaten ? 'eaten ten' : 'ten'}>
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
            ))}
          </div>
          <div className="cubes">
            {ones.map((x) => (
              <span key={x.id} className={`cube ${x.eaten ? 'eaten' : ''} ${x.fresh ? 'fresh' : ''} ${x.added ? 'added' : ''}`} />
            ))}
          </div>
        </div>
      ) : (
        <div className="frames">
          {Array.from({ length: Math.max(1, frameCount) }, (_, f) => (
            <div className="frame" key={f}>
              {Array.from({ length: 10 }, (_, i) => {
                const it = ones[f * 10 + i];
                // Missing-addend: only the added (blue) ones are counted, so only they glow at the end.
                const cls = !it
                  ? 'empty'
                  : it.eaten
                    ? 'eaten'
                    : it.added
                      ? done
                        ? addMissing
                          ? 'added left'
                          : 'left'
                        : 'added'
                      : done && !addMissing
                        ? 'left'
                        : '';
                return <span key={i} className={`dot ${cls}`} />;
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
