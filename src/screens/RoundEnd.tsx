import { Monster, type MonsterDef } from '../monsters';
import { Star, type Result } from './Play';

interface Props {
  results: Result[];
  m: MonsterDef;
  newFluent: string[];
  eggReady: boolean;
  onHatch: () => void;
  onAgain: () => void;
  onHome: () => void;
}

export function RoundEnd({ results, m, newFluent, eggReady, onHatch, onAgain, onHome }: Props) {
  const stars = results.reduce((s, r) => s + r.stars, 0);
  const first = results.filter((r) => r.at.firstTry && !r.at.usedHelp).length;
  const speedy = results.filter((r) => r.speedy).length;
  const helped = results.filter((r) => r.at.usedHelp).length;
  const boss = results.filter((r) => r.p.boss);

  return (
    <main className="end">
      <div className="monster-wrap mood-happy end-monster">
        <div className="monster big full">
          <Monster m={m} mood="happy" />
        </div>
      </div>
      <h2 className="end-title">{m.name} is stuffed!</h2>

      <div className="end-stars" aria-label={`${stars} stars earned`}>
        <Star size={40} /> +{stars}
      </div>

      <ul className="end-stats">
        <li>
          <b>{first}</b> right the first time
        </li>
        <li>
          <b>{speedy}</b> speedy
        </li>
        {boss.length > 0 && (
          <li>
            <b>
              {boss.filter((r) => r.at.firstTry && !r.at.usedHelp).length}/{boss.length}
            </b>{' '}
            boss bites
          </li>
        )}
      </ul>

      {newFluent.length > 0 && (
        <p className="end-note">
          New super-fast fact{newFluent.length > 1 ? 's' : ''}: <b>{newFluent.join(', ')}</b>
        </p>
      )}
      {helped > 0 && newFluent.length === 0 && (
        <p className="end-note">You watched {helped === 1 ? 'one' : helped} and then solved {helped === 1 ? 'it' : 'them'}. That’s how brains get faster.</p>
      )}

      <div className="end-actions">
        {eggReady ? (
          <>
            <button className="btn primary pulse" onClick={onHatch}>
              Hatch your egg!
            </button>
            <button className="btn secondary" onClick={onAgain}>
              Play again
            </button>
          </>
        ) : (
          <button className="btn primary" onClick={onAgain}>
            Play again
          </button>
        )}
        <button className="btn secondary" onClick={onHome}>
          Home
        </button>
      </div>
    </main>
  );
}
