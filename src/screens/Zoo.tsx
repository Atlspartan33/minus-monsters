import { MONSTERS, Monster } from '../monsters';
import type { Save } from '../store';

export function Zoo({ save, onPick, onBack }: { save: Save; onPick: (id: string) => void; onBack: () => void }) {
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
              disabled={!owned}
              onClick={() => onPick(m.id)}
              aria-pressed={cur}
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
    </main>
  );
}
