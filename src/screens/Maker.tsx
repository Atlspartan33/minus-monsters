import { useState } from 'react';
import { BODIES, COLORS, Monster, TEETH, TOPS, type Body, type MonsterDef, type Mood, type Teeth, type Top } from '../monsters';
import { sfx } from '../sound';

// Monster Maker: she designs her own monster. Every choice previews live.

const FIRST = ['Captain', 'Little', 'Big', 'Sir', 'Lady', 'Professor', 'Baby', 'Super', 'Tiny', 'Mega'];
const CORE = ['Chomp', 'Nibble', 'Munch', 'Gulp', 'Crunch', 'Snack', 'Wobble', 'Burp', 'Slurp', 'Crumb'];
const END = ['ster', 'zilla', 'y', 'kins', 'o', 'a-saurus', 'bot', ''];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const silly = () => `${pick(FIRST)} ${pick(CORE)}${pick(END)}`;
const LINES = ['I was made with love. And snacks.', 'Fresh from the Monster Maker!', 'Feed me numbers, please!', 'I like my problems crunchy.'];

const BODY_WORD: Record<Body, string> = { round: 'Round', blob: 'Blobby', tall: 'Tall', square: 'Boxy' };
const TOP_WORD: Record<Top, string> = { horns: 'Horns', antenna: 'Antenna', ears: 'Ears', none: 'Nothing' };
const TEETH_WORD: Record<Teeth, string> = { fangs: 'Fangs', buck: 'Buck teeth', none: 'No teeth' };

interface Props {
  count: number;
  max: number;
  onSave: (def: MonsterDef) => void;
  onBack: () => void;
}

export function Maker({ count, max, onSave, onBack }: Props) {
  const [def, setDef] = useState<MonsterDef>(() => ({
    id: `custom-${Date.now()}`,
    name: silly(),
    color: pick(COLORS),
    body: pick(BODIES),
    eyes: pick([1, 2, 3] as const),
    top: pick(TOPS),
    teeth: pick(TEETH),
    spots: Math.random() < 0.5,
    line: pick(LINES),
  }));
  const [mood, setMood] = useState<Mood>('happy');
  const [bump, setBump] = useState(0);
  const full = count >= max;

  const set = (patch: Partial<MonsterDef>) => {
    setDef((d) => ({ ...d, ...patch }));
    setBump((b) => b + 1);
    setMood(pick(['happy', 'open', 'chomp'] as Mood[]));
    sfx.sparkle();
  };
  const surprise = () =>
    set({ color: pick(COLORS), body: pick(BODIES), eyes: pick([1, 2, 3] as const), top: pick(TOPS), teeth: pick(TEETH), spots: Math.random() < 0.5, name: silly() });

  const preview = (patch: Partial<MonsterDef>) => <Monster m={{ ...def, ...patch }} mood="idle" />;

  return (
    <main className="maker">
      <header className="sub-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2>Monster Maker</h2>
        <button className="icon-btn dice" onClick={surprise} aria-label="Surprise me: random monster">
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="4" fill="#fff" stroke="currentColor" strokeWidth="2" />
            {[
              [8, 8],
              [16, 8],
              [12, 12],
              [8, 16],
              [16, 16],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.8" fill="#1B1033" />
            ))}
          </svg>
        </button>
      </header>

      <div className="maker-stage">
        <div className="spotlight" aria-hidden="true" />
        <div className={`monster-wrap mood-${mood} wardrobe-monster`} key={bump}>
          <div className="monster big">
            <Monster m={def} mood={mood} />
          </div>
        </div>
      </div>

      <label className="name-field">
        <span>Name</span>
        <div className="name-row">
          <input value={def.name} maxLength={22} onChange={(e) => setDef((d) => ({ ...d, name: e.target.value }))} />
          <button className="btn ghost" onClick={() => set({ name: silly() })}>
            New name
          </button>
        </div>
      </label>

      <fieldset className="maker-group">
        <legend>Color</legend>
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`swatch ${def.color === c ? 'on' : ''}`}
              style={{ background: c }}
              aria-label={`Color ${c}`}
              aria-pressed={def.color === c}
              onClick={() => set({ color: c })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="maker-group">
        <legend>Shape</legend>
        <div className="opt-row">
          {BODIES.map((b) => (
            <button key={b} className={`opt ${def.body === b ? 'on' : ''}`} aria-pressed={def.body === b} onClick={() => set({ body: b })}>
              <span className="opt-art">{preview({ body: b })}</span>
              <span>{BODY_WORD[b]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="maker-group">
        <legend>Eyes</legend>
        <div className="opt-row">
          {([1, 2, 3] as const).map((n) => (
            <button key={n} className={`opt ${def.eyes === n ? 'on' : ''}`} aria-pressed={def.eyes === n} onClick={() => set({ eyes: n })}>
              <span className="opt-art">{preview({ eyes: n })}</span>
              <span>
                {n} eye{n > 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="maker-group">
        <legend>On top</legend>
        <div className="opt-row">
          {TOPS.map((t) => (
            <button key={t} className={`opt ${def.top === t ? 'on' : ''}`} aria-pressed={def.top === t} onClick={() => set({ top: t })}>
              <span className="opt-art">{preview({ top: t })}</span>
              <span>{TOP_WORD[t]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="maker-group">
        <legend>Teeth and spots</legend>
        <div className="opt-row">
          {TEETH.map((t) => (
            <button key={t} className={`opt ${def.teeth === t ? 'on' : ''}`} aria-pressed={def.teeth === t} onClick={() => set({ teeth: t })}>
              <span>{TEETH_WORD[t]}</span>
            </button>
          ))}
          <button className={`opt ${def.spots ? 'on' : ''}`} aria-pressed={def.spots} onClick={() => set({ spots: !def.spots })}>
            <span>{def.spots ? 'Spots on' : 'Spots off'}</span>
          </button>
        </div>
      </fieldset>

      <div className="wardrobe-actions">
        {full ? (
          <p className="zoo-hint center">Your zoo has {max} homemade monsters. That’s the most it can hold!</p>
        ) : (
          <button
            className="btn primary"
            disabled={!def.name.trim()}
            onClick={() => {
              sfx.hatch();
              onSave({ ...def, name: def.name.trim() });
            }}
          >
            Bring {def.name.trim() || 'it'} to life!
          </button>
        )}
      </div>
    </main>
  );
}
