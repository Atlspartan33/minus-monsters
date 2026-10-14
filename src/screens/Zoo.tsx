import { useRef, useState } from 'react';
import { MONSTERS, Monster } from '../monsters';
import { sfx } from '../sound';
import { MAX_CUSTOM, pendingPrizes, STOP_EVERY, trailStops, type Save } from '../store';

export function Zoo({ save, onOpen, onMake, onBack }: { save: Save; onOpen: (id: string) => void; onMake: () => void; onBack: () => void }) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const nextEgg = trailStops(save, save.claimed + 1, 8).find((s) => s.kind === 'egg');

  const say = (text: string) => {
    setToast(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2400);
  };

  return (
    <main className="zoo">
      <header className="sub-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back to home">
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2>Monster Zoo</h2>
        <span className="sub-count">
          {save.owned.length}/{MONSTERS.length}
        </span>
      </header>
      <p className="zoo-hint">Tap a monster to dress it up or feed it next. Eggs on the Snack Trail hatch the rest.</p>
      <h3 className="zoo-section">Homemade monsters</h3>
      <div className="zoo-grid">
        {save.customs.map((m, i) => {
          const cur = save.current === m.id;
          return (
            <button
              key={m.id}
              className={`zoo-card ${cur ? 'current' : ''}`}
              style={{ ['--d' as string]: `${i * 40}ms` }}
              onClick={() => {
                sfx.boing();
                onOpen(m.id);
              }}
              aria-label={`${m.name}${cur ? ', picked' : ''}`}
            >
              <div className="zoo-art">
                <Monster m={m} outfit={save.outfits[m.id]} />
              </div>
              <span className="zoo-name">{m.name}</span>
              {cur && <span className="zoo-badge">Picked</span>}
            </button>
          );
        })}
        {save.customs.length < MAX_CUSTOM && (
          <button className="zoo-card make-card" onClick={onMake}>
            <span className="make-plus" aria-hidden="true">
              +
            </span>
            <span className="zoo-name">Make a monster</span>
          </button>
        )}
      </div>
      <h3 className="zoo-section">Monsters to collect</h3>
      <div className="zoo-grid">
        {MONSTERS.map((m, i) => {
          const owned = save.owned.includes(m.id);
          const cur = save.current === m.id;
          return (
            <button
              key={m.id}
              className={`zoo-card ${cur ? 'current' : ''} ${owned ? '' : 'locked'}`}
              style={{ ['--d' as string]: `${i * 40}ms` }}
              aria-disabled={!owned}
              onClick={() => {
                if (owned) {
                  sfx.boing();
                  onOpen(m.id);
                } else {
                  sfx.oops();
                  say(
                    pendingPrizes(save) > 0
                      ? 'You have a prize waiting on the Snack Trail!'
                      : nextEgg
                        ? `Next egg at ${nextEgg.at} stars. You have ${save.stars}!`
                        : `Keep earning stars! Every ${STOP_EVERY} is a prize.`,
                  );
                }
              }}
              aria-label={owned ? `${m.name}${cur ? ', picked' : ''}` : 'Locked monster'}
            >
              <div className="zoo-art">
                <Monster m={m} silhouette={!owned} outfit={owned ? save.outfits[m.id] : undefined} />
              </div>
              <span className="zoo-name">{owned ? m.name : '???'}</span>
              {cur && <span className="zoo-badge">Picked</span>}
            </button>
          );
        })}
      </div>
      {toast && (
        <div className="zoo-toast" role="status" key={toast}>
          {toast}
        </div>
      )}
    </main>
  );
}
