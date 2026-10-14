import { useState } from 'react';
import { ACCESSORIES, AccessoryIcon, type Slot } from '../accessories';
import { Monster, monsterById, type Mood } from '../monsters';
import { sfx } from '../sound';
import type { Save } from '../store';

const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'head', label: 'Hats' },
  { slot: 'face', label: 'Glasses' },
  { slot: 'neck', label: 'Neck' },
];

interface Props {
  save: Save;
  monsterId: string;
  onEquip: (monsterId: string, slot: Slot, itemId: string | null) => void;
  onPick: (monsterId: string) => void;
  onBack: () => void;
}

export function Wardrobe({ save, monsterId, onEquip, onPick, onBack }: Props) {
  const m = monsterById(monsterId);
  const outfit = save.outfits[m.id] ?? {};
  const [tab, setTab] = useState<Slot>('head');
  const [mood, setMood] = useState<Mood>('happy');
  const [spin, setSpin] = useState(0);
  const items = ACCESSORIES.filter((a) => a.slot === tab);
  const cur = save.current === m.id;

  const wear = (id: string | null) => {
    onEquip(m.id, tab, id);
    sfx.sparkle();
    setSpin((s) => s + 1);
    setMood('happy');
  };

  return (
    <main className="wardrobe">
      <header className="sub-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2>Dress up {m.name}</h2>
        <span />
      </header>

      <div className="wardrobe-stage">
        <div className="spotlight" aria-hidden="true" />
        <div className={`monster-wrap mood-${mood} wardrobe-monster`} key={spin}>
          <div className="monster big">
            <Monster m={m} mood={mood} outfit={outfit} />
          </div>
        </div>
      </div>

      <div className="seg tabs" role="tablist" aria-label="What to wear">
        {SLOTS.map((s) => (
          <button key={s.slot} role="tab" aria-selected={tab === s.slot} aria-pressed={tab === s.slot} onClick={() => setTab(s.slot)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="wardrobe-grid">
        <button className={`item-card ${!outfit[tab] ? 'on' : ''}`} onClick={() => wear(null)} aria-pressed={!outfit[tab]}>
          <span className="item-none" aria-hidden="true">
            ✕
          </span>
          <span className="item-name">Nothing</span>
        </button>
        {items.map((a) => {
          const have = save.items.includes(a.id);
          const on = outfit[tab] === a.id;
          return (
            <button
              key={a.id}
              className={`item-card ${on ? 'on' : ''} ${have ? '' : 'locked'}`}
              aria-pressed={on}
              aria-disabled={!have}
              onClick={() => {
                if (have) wear(a.id);
                else sfx.oops();
              }}
            >
              <span className="item-art">
                <AccessoryIcon a={a} />
              </span>
              <span className="item-name">{have ? a.name : 'In a chest'}</span>
            </button>
          );
        })}
      </div>
      <p className="zoo-hint center">Treasure chests on the Snack Trail hold more things to wear.</p>

      <div className="wardrobe-actions">
        {cur ? (
          <button className="btn primary" onClick={onBack}>
            Done
          </button>
        ) : (
          <button
            className="btn primary"
            onClick={() => {
              sfx.boing();
              onPick(m.id);
            }}
          >
            Feed {m.name} next
          </button>
        )}
      </div>
    </main>
  );
}
