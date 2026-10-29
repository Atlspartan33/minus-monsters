import { useCallback, useEffect, useRef, useState } from 'react';
import type { Slot } from './accessories';
import { FLUENT_BOX, bestKey, buildLightning, buildRound, factLabel, record, type Attempt, type Op, type Problem, type Stats } from './engine';
import { monsterById, setCustomMonsters } from './monsters';
import { PrizeReveal } from './Prize';
import { Home } from './screens/Home';
import { Lightning } from './screens/Lightning';
import { Maker } from './screens/Maker';
import { Parent } from './screens/Parent';
import { Play, type Result } from './screens/Play';
import { RoundEnd } from './screens/RoundEnd';
import { Wardrobe } from './screens/Wardrobe';
import { Zoo } from './screens/Zoo';
import { prepareVoice } from 'kid-voice';
import { setSound } from './sound';
import { MAX_CUSTOM, claimPrize, fresh, pendingPrizes, useSave, type Prize } from './store';

type Run = { round: Problem[]; before: Stats; starsBefore: number; id: number };
type Screen =
  | { k: 'home' }
  | ({ k: 'play' } & Run)
  | ({ k: 'lightning' } & Run)
  | {
      k: 'end';
      results: Result[];
      newFluent: string[];
      mode: 'tap' | 'lightning';
      starsBefore: number;
      time?: { ms: number; best: number | null; isNew: boolean };
    }
  | { k: 'zoo' }
  | { k: 'wardrobe'; id: string; back: 'home' | 'zoo' }
  | { k: 'maker' }
  | { k: 'parent' };

export default function App() {
  const [save, setSave] = useSave();
  const [screen, setScreen] = useState<Screen>({ k: 'home' });
  const [prize, setPrize] = useState<Prize | null>(null);
  const latest = useRef(save);
  latest.current = save;
  setCustomMonsters(save.customs);

  useEffect(() => {
    setSound(save.settings.sound);
  }, [save.settings.sound]);
  // Fetch the offline voice model in the background, so the first Lightning Round doesn't wait.
  useEffect(() => {
    if (!save.settings.voice) return;
    const t = window.setTimeout(() => void prepareVoice(), 3000);
    return () => clearTimeout(t);
  }, [save.settings.voice]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.k]);

  const run = (s = latest.current) => ({ before: s.stats, starsBefore: s.stars, id: Date.now() });
  const play = useCallback(() => {
    const s = latest.current;
    setScreen({ k: 'play', round: buildRound(s.stats, s.settings, s.bossWins), ...run(s) });
  }, []);
  const lightning = useCallback(() => {
    const s = latest.current;
    setScreen({ k: 'lightning', round: buildLightning(s.stats, s.settings), ...run(s) });
  }, []);
  const setTrack = (op: Op) => setSave((s) => ({ ...s, settings: { ...s.settings, op } }));
  const setLightningLen = (n: number) => {
    const s = { ...latest.current, settings: { ...latest.current.settings, lightningLen: n } };
    setSave(s);
    setScreen({ k: 'lightning', round: buildLightning(s.stats, s.settings), ...run(s) });
  };

  const onAnswer = useCallback(
    (p: Problem, at: Attempt, stars: number) => {
      setSave((s) => {
        const clean = at.firstTry && !at.usedHelp;
        const next = { ...s, stars: s.stars + stars };
        if (!p.boss) return { ...next, stats: record(s.stats, p, at) };
        const borrow = p.tier === 5;
        return {
          ...next,
          bossWins: s.bossWins + (clean ? 1 : 0),
          boss: {
            seen: s.boss.seen + 1,
            right: s.boss.right + (clean ? 1 : 0),
            borrowSeen: s.boss.borrowSeen + (borrow ? 1 : 0),
            borrowRight: s.boss.borrowRight + (borrow && clean ? 1 : 0),
          },
        };
      });
    },
    [setSave],
  );

  const onFinish = useCallback(
    (results: Result[], totalMs?: number) => {
      if (screen.k !== 'play' && screen.k !== 'lightning') return;
      const mode: 'tap' | 'lightning' = screen.k === 'lightning' ? 'lightning' : 'tap';
      const key = bestKey(screen.round[0]?.op ?? 'sub', screen.round.length);
      const prevBest = latest.current.lightning.bests[key] ?? null;
      const isNew = mode === 'lightning' && totalMs !== undefined && (prevBest === null || totalMs < prevBest);
      const before = screen.before;
      const after = latest.current.stats;
      const newFluent = Object.keys(after)
        .filter((k) => after[k].box >= FLUENT_BOX && (before[k]?.box ?? 0) < FLUENT_BOX)
        .map(factLabel);
      const facts = results.filter((r) => !r.p.boss);
      setSave((s) => ({
        ...s,
        rounds: [
          ...s.rounds,
          {
            at: Date.now(),
            n: results.length,
            firstTry: results.filter((r) => r.at.firstTry && !r.at.usedHelp).length,
            speedy: results.filter((r) => r.speedy).length,
            helped: results.filter((r) => r.at.usedHelp).length,
            avgMs: facts.length ? Math.round(facts.reduce((t, r) => t + r.at.ms, 0) / facts.length) : 0,
            stars: results.reduce((t, r) => t + r.stars, 0),
            mode,
            op: screen.round[0]?.op,
            totalMs: totalMs === undefined ? undefined : Math.round(totalMs),
          },
        ].slice(-200),
        lightning:
          mode === 'lightning'
            ? {
                runs: s.lightning.runs + 1,
                bests: isNew && totalMs !== undefined ? { ...s.lightning.bests, [key]: Math.round(totalMs) } : s.lightning.bests,
              }
            : s.lightning,
      }));
      setScreen({
        k: 'end',
        results,
        newFluent,
        mode,
        starsBefore: screen.starsBefore,
        time: mode === 'lightning' && totalMs !== undefined ? { ms: totalMs, best: prevBest, isNew } : undefined,
      });
    },
    [screen, setSave],
  );

  const openPrize = () => {
    const r = claimPrize(latest.current);
    if (!r) return;
    setSave(r.save);
    setPrize(r.prize);
  };
  const equip = (monsterId: string, slot: Slot, itemId: string | null) =>
    setSave((s) => {
      const o = { ...(s.outfits[monsterId] ?? {}) };
      if (itemId) o[slot] = itemId;
      else delete o[slot];
      return { ...s, outfits: { ...s.outfits, [monsterId]: o } };
    });

  const m = monsterById(save.current);
  const outfit = save.outfits[m.id];
  const home = () => setScreen({ k: 'home' });

  return (
    <>
      <Ambient />
      <div className="screen" key={screen.k === 'play' || screen.k === 'lightning' ? screen.id : screen.k}>
        {screen.k === 'home' && (
          <Home
            save={save}
            onPlay={play}
            onLightning={lightning}
            onZoo={() => setScreen({ k: 'zoo' })}
            onDressUp={() => setScreen({ k: 'wardrobe', id: save.current, back: 'home' })}
            onParent={() => setScreen({ k: 'parent' })}
            onPrize={openPrize}
            onTrack={setTrack}
          />
        )}
        {screen.k === 'play' && (
          <Play
            round={screen.round}
            m={m}
            outfit={outfit}
            readAloud={save.settings.readAloud}
            onAnswer={onAnswer}
            onFinish={onFinish}
            onQuit={home}
          />
        )}
        {screen.k === 'lightning' && (
          <Lightning
            round={screen.round}
            m={m}
            outfit={outfit}
            bests={save.lightning.bests}
            onLen={setLightningLen}
            onAnswer={onAnswer}
            onFinish={onFinish}
            onQuit={home}
            voiceOn={save.settings.voice}
          />
        )}
        {screen.k === 'end' && (
          <RoundEnd
            results={screen.results}
            m={m}
            outfit={outfit}
            save={save}
            starsBefore={screen.starsBefore}
            newFluent={screen.newFluent}
            time={screen.time}
            prizes={pendingPrizes(save)}
            onPrize={openPrize}
            onAgain={screen.mode === 'lightning' ? lightning : play}
            onHome={home}
          />
        )}
        {screen.k === 'zoo' && (
          <Zoo save={save} onOpen={(id) => setScreen({ k: 'wardrobe', id, back: 'zoo' })} onMake={() => setScreen({ k: 'maker' })} onBack={home} />
        )}
        {screen.k === 'maker' && (
          <Maker
            count={save.customs.length}
            max={MAX_CUSTOM}
            onSave={(def) => {
              setSave((s) => ({ ...s, customs: [...s.customs, def], owned: [...s.owned, def.id], current: def.id }));
              setCustomMonsters([...save.customs, def]);
              setPrize({ kind: 'egg', monster: def });
              setScreen({ k: 'zoo' });
            }}
            onBack={() => setScreen({ k: 'zoo' })}
          />
        )}
        {screen.k === 'wardrobe' && (
          <Wardrobe
            save={save}
            monsterId={screen.id}
            onEquip={equip}
            onPick={(id) => {
              setSave((s) => ({ ...s, current: id }));
              home();
            }}
            onBack={() => setScreen(screen.back === 'zoo' ? { k: 'zoo' } : { k: 'home' })}
          />
        )}
        {screen.k === 'parent' && (
          <Parent
            save={save}
            onSettings={(settings) => setSave((s) => ({ ...s, settings }))}
            onReset={() => setSave(fresh())}
            onBack={home}
          />
        )}
      </div>
      {prize && (
        <PrizeReveal
          prize={prize}
          m={monsterById(latest.current.current)}
          outfit={latest.current.outfits[latest.current.current]}
          onDone={() => setPrize(null)}
          onDressUp={() => {
            setPrize(null);
            setScreen({ k: 'wardrobe', id: latest.current.current, back: 'home' });
          }}
        />
      )}
    </>
  );
}

// Slow-drifting numbers and shapes behind every screen.
const BITS = ['7', '−', '3', '★', '9', '+', '5', '●', '2', '×', '8', '★', '÷', '4'];
function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      {BITS.map((b, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 73) % 100}%`,
            animationDelay: `${-(i * 3.7) % 26}s`,
            animationDuration: `${22 + ((i * 5) % 12)}s`,
            fontSize: `${2 + ((i * 7) % 5)}rem`,
          }}
        >
          {b}
        </span>
      ))}
    </div>
  );
}
