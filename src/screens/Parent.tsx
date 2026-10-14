import { useState } from 'react';
import { FLUENT_BOX, TIER_INFO, keyOf, tierFluency, tierOf, type BossMode, type Settings, type Tier } from '../engine';
import type { Save } from '../store';

interface Props {
  save: Save;
  onSettings: (s: Settings) => void;
  onReset: () => void;
  onBack: () => void;
}

const fmtMs = (ms: number) => (ms ? `${(ms / 1000).toFixed(1)}s` : '—');

export function Parent({ save, onSettings, onReset, onBack }: Props) {
  const [confirm, setConfirm] = useState(0);
  const st = save.settings;
  const set = (patch: Partial<Settings>) => onSettings({ ...st, ...patch });

  const trouble = Object.entries(save.stats)
    .filter(([, s]) => s.box < FLUENT_BOX && s.seen > 0)
    .sort((x, y) => y[1].misses - x[1].misses || x[1].box - y[1].box || y[1].lastMs - x[1].lastMs)
    .slice(0, 8);

  const status = (a: number, b: number) => {
    const s = save.stats[keyOf(a, b)];
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

      <section className="panel">
        <h3>Progress by skill</h3>
        {([1, 2, 3] as Tier[]).map((t) => {
          const f = tierFluency(save.stats, t);
          return (
            <div className="tier-row" key={t}>
              <div className="tier-label">
                <b>{TIER_INFO[t].name}</b> <span>e.g. {TIER_INFO[t].example}</span>
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
            <b>Boss bites (two-digit)</b>
          </div>
          <div className="tier-num">
            No regrouping: {save.boss.right - save.boss.borrowRight}/{save.boss.seen - save.boss.borrowSeen} first try · Regrouping:{' '}
            {save.boss.borrowRight}/{save.boss.borrowSeen} first try
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Fact map: the 81 basic facts</h3>
        <div className="legend">
          <span className="cell fluent">✓</span> fast and right <span className="cell learning">•</span> right, not fast yet{' '}
          <span className="cell missed">✗</span> missed recently <span className="cell unseen" /> not seen{' '}
          <span className="cell learning cross">•</span> ringed = crossing ten
        </div>
        <div className="grid-scroll">
          <table className="fact-grid">
            <thead>
              <tr>
                <th scope="col">a</th>
                {Array.from({ length: 9 }, (_, i) => (
                  <th key={i} scope="col">
                    −{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 17 }, (_, r) => {
                const a = r + 2;
                return (
                  <tr key={a}>
                    <th scope="row">{a}</th>
                    {Array.from({ length: 9 }, (_, i) => {
                      const b = i + 1;
                      const valid = a - b >= 1 && a - b <= 9;
                      if (!valid) return <td key={b} className="cell na" />;
                      const s = status(a, b);
                      return (
                        <td key={b} className={`cell ${s.cls} ${tierOf(a, b) === 3 ? 'cross' : ''}`} title={`${a} − ${b}: ${s.label}`}>
                          {s.sym}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small">Ringed cells are the crossing-ten facts (like 13 − 7), which this game targets most.</p>
      </section>

      <section className="panel">
        <h3>Needs work</h3>
        {trouble.length === 0 ? (
          <p className="small">Nothing yet. Play a round first.</p>
        ) : (
          <ul className="trouble">
            {trouble.map(([k, s]) => {
              const [a, b] = k.split('-');
              return (
                <li key={k}>
                  <b>
                    {a} − {b}
                  </b>
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
          <span>Sounds and read-aloud</span>
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
