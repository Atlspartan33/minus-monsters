import { useState } from 'react';
import {
  FACT_TIERS,
  FLUENT_BOX,
  OPS,
  OP_INFO,
  TIER_INFO,
  factLabel,
  keyOf,
  parseKey,
  tierFluency,
  tierOf,
  unlockedTiers,
  type BossMode,
  type Op,
  type Settings,
} from '../engine';
import type { Save } from '../store';
import { fmtTime } from './Lightning';

interface Props {
  save: Save;
  onSettings: (s: Settings) => void;
  onReset: () => void;
  onBack: () => void;
}

const fmtMs = (ms: number) => (ms ? `${(ms / 1000).toFixed(1)}s` : '—');
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

export function Parent({ save, onSettings, onReset, onBack }: Props) {
  const [confirm, setConfirm] = useState(0);
  const st = save.settings;
  const [view, setView] = useState<Op>(st.op);
  const sym = OP_INFO[view].sym;
  const open = unlockedTiers(save.stats, view);
  const set = (patch: Partial<Settings>) => onSettings({ ...st, ...patch });

  const trouble = Object.entries(save.stats)
    .filter(([k, s]) => s.box < FLUENT_BOX && s.seen > 0 && parseKey(k)?.op === view)
    .sort((x, y) => y[1].misses - x[1].misses || x[1].box - y[1].box || y[1].lastMs - x[1].lastMs)
    .slice(0, 8);

  // Fact map layout per track: rows × columns, and which (a, b) each cell is.
  const grid =
    view === 'sub'
      ? { rows: range(2, 18), cols: range(1, 9), corner: 'a', cell: (r: number, c: number) => (r - c >= 1 && r - c <= 9 ? ([r, c] as const) : null) }
      : view === 'div'
        ? { rows: range(1, 10), cols: range(1, 10), corner: 'ans', cell: (r: number, c: number) => [r * c, c] as const }
        : { rows: range(1, view === 'add' ? 9 : 10), cols: range(1, view === 'add' ? 9 : 10), corner: 'a', cell: (r: number, c: number) => [r, c] as const };

  const status = (a: number, b: number) => {
    const s = save.stats[keyOf(a, b, view)];
    if (!s) return { cls: 'unseen', sym: '', label: 'not seen yet' };
    if (s.box >= FLUENT_BOX) return { cls: 'fluent', sym: '✓', label: 'fast and right' };
    if (s.box === 0 && s.misses > 0) return { cls: 'missed', sym: '✗', label: 'missed recently' };
    return { cls: 'learning', sym: '•', label: 'right but not fast yet' };
  };

  return (
    <main className="parent">
      <header className="sub-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back to home">
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2>Grown-ups</h2>
        <span />
      </header>

      <section className="panel">
        <h3>How it works</h3>
        <p>
          Each fact climbs a ladder. It counts as <b>fluent</b> only after it is right on the first try, with no help, in under 4 seconds, three
          separate times. She never sees a timer; fast answers just earn a bonus star. Missed facts come back later in the same round and more often
          in later rounds. Each round opens with two easy ones so it never starts on a wall.
        </p>
      </section>

      <div className="seg track-tabs" role="group" aria-label="Which math track">
        {OPS.map((o) => (
          <button key={o} aria-pressed={view === o} onClick={() => setView(o)}>
            {OP_INFO[o].sym} {OP_INFO[o].name}
          </button>
        ))}
      </div>

      <section className="panel">
        <h3>Progress by skill: {OP_INFO[view].name}</h3>
        {FACT_TIERS.map((t) => {
          const f = tierFluency(save.stats, t, view);
          const info = TIER_INFO[view][t]!;
          return (
            <div className="tier-row" key={t}>
              <div className="tier-label">
                <b>{info.name}</b> <span>e.g. {info.example}</span>
                {!open.includes(t) && <span> · opens when the row above is 60% fluent</span>}
              </div>
              <div className="tier-bar" role="img" aria-label={`${f.fluent} of ${f.total} fluent`}>
                <div style={{ width: `${(f.fluent / f.total) * 100}%` }} />
              </div>
              <div className="tier-num">
                {f.fluent}/{f.total} fluent · {f.seen} seen
              </div>
            </div>
          );
        })}
        <div className="tier-row">
          <div className="tier-label">
            <b>Boss bites, all tracks</b> <span>e.g. {TIER_INFO[view][4]!.example}</span>
          </div>
          <div className="tier-num">
            No regrouping: {save.boss.right - save.boss.borrowRight}/{save.boss.seen - save.boss.borrowSeen} first try · Regrouping:{' '}
            {save.boss.borrowRight}/{save.boss.borrowSeen} first try
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Fact map: {OP_INFO[view].name}</h3>
        <div className="legend">
          <span className="cell fluent">✓</span> fast and right <span className="cell learning">•</span> right, not fast yet{' '}
          <span className="cell missed">✗</span> missed recently <span className="cell unseen" /> not seen{' '}
          <span className="cell learning cross">•</span> ringed = {view === 'sub' || view === 'add' ? 'crossing ten' : 'hardest tables'}
        </div>
        <div className="grid-scroll">
          <table className="fact-grid">
            <thead>
              <tr>
                <th scope="col">{grid.corner}</th>
                {grid.cols.map((c) => (
                  <th key={c} scope="col">
                    {sym}
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((r) => (
                <tr key={r}>
                  <th scope="row">{r}</th>
                  {grid.cols.map((c) => {
                    const ab = grid.cell(r, c);
                    if (!ab) return <td key={c} className="cell na" />;
                    const [a, b] = ab;
                    const s = status(a, b);
                    return (
                      <td key={c} className={`cell ${s.cls} ${tierOf(a, b, view) === 3 ? 'cross' : ''}`} title={`${a} ${sym} ${b}: ${s.label}`}>
                        {s.sym}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">
          {view === 'sub'
            ? 'Ringed cells are the crossing-ten facts (like 13 − 7), which this game targets most.'
            : view === 'add'
              ? 'Ringed cells are the crossing-ten facts (like 8 + 5).'
              : view === 'mul'
                ? 'Times starts with the 1, 2 and 10 tables. Ringed cells are the hardest tables.'
                : 'Each row is the answer; each column is the number she shares by. Ringed cells are the hardest tables.'}
        </p>
      </section>

      <section className="panel">
        <h3>Needs work</h3>
        {trouble.length === 0 ? (
          <p className="small">Nothing yet. Play a round first.</p>
        ) : (
          <ul className="trouble">
            {trouble.map(([k, s]) => {
              return (
                <li key={k}>
                  <b>{factLabel(k)}</b>
                  <span>
                    {s.right}/{s.seen} first try · missed {s.misses}× · last {fmtMs(s.lastMs)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel">
        <h3>Recent rounds</h3>
        {save.rounds.length === 0 ? (
          <p className="small">No rounds yet.</p>
        ) : (
          <table className="rounds">
            <thead>
              <tr>
                <th>When</th>
                <th>Mode</th>
                <th>First try</th>
                <th>Speedy</th>
                <th>Avg time</th>
              </tr>
            </thead>
            <tbody>
              {save.rounds
                .slice(-10)
                .reverse()
                .map((r) => (
                  <tr key={r.at}>
                    <td>{new Date(r.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                    <td>
                      {r.op ? `${OP_INFO[r.op].sym} ` : ''}
                      {r.mode === 'lightning' ? `Lightning ${r.totalMs ? fmtTime(r.totalMs) : ''}` : 'Tap'}
                    </td>
                    <td>
                      {r.firstTry}/{r.n}
                    </td>
                    <td>{r.speedy}</td>
                    <td>{fmtMs(r.avgMs)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel settings">
        <h3>Settings</h3>
        <fieldset>
          <legend>Math tracks she can pick</legend>
          <div className="seg">
            {OPS.map((o) => {
              const on = st.ops.includes(o);
              return (
                <button
                  key={o}
                  aria-pressed={on}
                  disabled={on && st.ops.length === 1}
                  onClick={() => {
                    const ops = on ? st.ops.filter((x) => x !== o) : OPS.filter((x) => x === o || st.ops.includes(x));
                    set({ ops, op: ops.includes(st.op) ? st.op : ops[0] });
                  }}
                >
                  {OP_INFO[o].sym} {OP_INFO[o].name}
                </button>
              );
            })}
          </div>
          <p className="small">Times and Share start with the friendliest tables (1, 2 and 10) and open the next ones as she gets fast.</p>
        </fieldset>
        <fieldset>
          <legend>Problems per round</legend>
          <div className="seg">
            {[8, 12, 16].map((n) => (
              <button key={n} aria-pressed={st.roundLen === n} onClick={() => set({ roundLen: n })}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Boss bites (2 two-digit problems at the end of each round)</legend>
          <div className="seg">
            {(
              [
                ['auto', 'Auto'],
                ['noborrow', 'No regrouping'],
                ['borrow', 'Regrouping'],
                ['off', 'Off'],
              ] as [BossMode, string][]
            ).map(([v, l]) => (
              <button key={v} aria-pressed={st.boss === v} onClick={() => set({ boss: v })}>
                {l}
              </button>
            ))}
          </div>
          <p className="small">Auto starts without regrouping and mixes regrouping in after a few boss wins.</p>
        </fieldset>
        <label className="toggle">
          <input type="checkbox" checked={st.sound} onChange={(e) => set({ sound: e.target.checked })} />
          <span>Sounds, buzzes and read-aloud</span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={st.readAloud} onChange={(e) => set({ readAloud: e.target.checked })} />
          <span>Read each problem out loud automatically</span>
        </label>
        <button
          className="btn danger"
          onClick={() => {
            if (confirm >= 1) {
              onReset();
              setConfirm(0);
            } else setConfirm(1);
          }}
        >
          {confirm ? 'Tap again to erase all progress' : 'Reset all progress'}
        </button>
      </section>
    </main>
  );
}
