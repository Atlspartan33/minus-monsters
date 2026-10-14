import { useRef, useState } from 'react';
import { MONSTERS, Monster } from '../monsters';
import { sfx } from '../sound';
import { EGG_COST, type Save } from '../store';

export function Zoo({ save, onPick, onBack }: { save: Save; onPick: (id: string) => void; onBack: () => void }) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const say = (text: string) => {
    setToast(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2200);
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
      <p className="zoo-hint">Tap a monster to feed it next. Earn stars to hatch the rest.</p>
      <div className="zoo-grid">
        {MONSTERS.map((m) => {
          const owned = save.owned.includes(m.id);
          const cur = save.current === m.id;
          return (
            <button
              key={m.id}
              className={`zoo-card ${cur ? 'current' : ''} ${owned ? '' : 'locked'}`}
              aria-disabled={!owned}
              onClick={() => {
                if (owned) {
                  sfx.boing();
                  onPick(m.id);
                  say(`${m.name} is hungry next!`);
                } else {
                  sfx.oops();
                  say(`Hatch an egg to meet me! ${Math.min(save.egg, EGG_COST)}/${EGG_COST} stars`);
                }
              }}
              aria-pressed={owned ? cur : undefined}
              aria-label={owned ? `${m.name}${cur ? ', picked' : ''}` : 'Locked monster'}
            >
              <div className="zoo-art">
                <Monster m={m} silhouette={!owned} />
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
