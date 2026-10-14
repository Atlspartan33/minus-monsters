import { useCallback, useEffect, useRef, useState } from 'react';
import { FLUENT_BOX, buildLightning, buildRound, record, type Attempt, type Problem, type Stats } from './engine';
import { Hatch } from './Hatch';
import { monsterById } from './monsters';
import { Home } from './screens/Home';
import { Lightning } from './screens/Lightning';
import { Parent } from './screens/Parent';
import { Play, type Result } from './screens/Play';
import { RoundEnd } from './screens/RoundEnd';
import { Zoo } from './screens/Zoo';
import { setSound } from './sound';
import { EGG_COST, eggReady, fresh, nextMonster, useSave } from './store';

type Screen =
  | { k: 'home' }
  | { k: 'play'; round: Problem[]; before: Stats; id: number }
  | { k: 'lightning'; round: Problem[]; before: Stats; id: number }
  | { k: 'end'; results: Result[]; newFluent: string[]; mode: 'tap' | 'lightning'; time?: { ms: number; best: number | null; isNew: boolean } }
  | { k: 'zoo' }
  | { k: 'parent' };

export default function App() {
  const [save, setSave] = useSave();
  const [screen, setScreen] = useState<Screen>({ k: 'home' });
  const [hatching, setHatching] = useState<string | null>(null);
  const latest = useRef(save);
  latest.current = save;

  useEffect(() => {
    setSound(save.settings.sound);
  }, [save.settings.sound]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.k]);

  const play = useCallback(() => {
    const s = latest.current;
    setScreen({ k: 'play', round: buildRound(s.stats, s.settings, s.bossWins), before: s.stats, id: Date.now() });
  }, []);

  const lightning = useCallback(() => {
    const s = latest.current;
    setScreen({ k: 'lightning', round: buildLightning(s.stats, s.settings), before: s.stats, id: Date.now() });
  }, []);

  const onAnswer = useCallback(
    (p: Problem, at: Attempt, stars: number) => {
      setSave((s) => {
        const clean = at.firstTry && !at.usedHelp;
        const next = { ...s, stars: s.stars + stars, egg: s.egg + stars };
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
      const prevBest = latest.current.lightning.best;
      const isNew = mode === 'lightning' && totalMs !== undefined && (prevBest === null || totalMs < prevBest);
      const before = screen.before;
      const after = latest.current.stats;
      const newFluent = Object.keys(after)
        .filter((k) => after[k].box >= FLUENT_BOX && (before[k]?.box ?? 0) < FLUENT_BOX)
        .map((k) => k.replace('-', ' − '));
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
            totalMs: totalMs === undefined ? undefined : Math.round(totalMs),
          },
        ].slice(-200),
        lightning:
          mode === 'lightning'
            ? { runs: s.lightning.runs + 1, best: isNew && totalMs !== undefined ? Math.round(totalMs) : s.lightning.best }
            : s.lightning,
      }));
      setScreen({
        k: 'end',
        results,
        newFluent,
        mode,
        time: mode === 'lightning' && totalMs !== undefined ? { ms: totalMs, best: prevBest, isNew } : undefined,
      });
    },
    [screen, setSave],
  );

  const startHatch = () => {
    const n = nextMonster(latest.current);
    if (n && eggReady(latest.current)) setHatching(n.id);
  };
  const finishHatch = () => {
    const id = hatching;
    setHatching(null);
    if (!id) return;
    setSave((s) => (s.owned.includes(id) ? s : { ...s, owned: [...s.owned, id], egg: s.egg - EGG_COST, current: id }));
  };

  const m = monsterById(save.current);

  return (
    <>
      {screen.k === 'home' && (
        <Home save={save} onPlay={play} onLightning={lightning} onZoo={() => setScreen({ k: 'zoo' })} onParent={() => setScreen({ k: 'parent' })} onHatch={startHatch} />
      )}
      {screen.k === 'play' && (
        <Play
          key={screen.id}
          round={screen.round}
          m={m}
          readAloud={save.settings.readAloud}
          onAnswer={onAnswer}
          onFinish={onFinish}
          onQuit={() => setScreen({ k: 'home' })}
        />
      )}
      {screen.k === 'lightning' && (
        <Lightning
          key={screen.id}
          round={screen.round}
          m={m}
          best={save.lightning.best}
          onAnswer={onAnswer}
          onFinish={onFinish}
          onQuit={() => setScreen({ k: 'home' })}
        />
      )}
      {screen.k === 'end' && (
        <RoundEnd
          results={screen.results}
          m={m}
          newFluent={screen.newFluent}
          time={screen.time}
          eggReady={eggReady(save)}
          onHatch={startHatch}
          onAgain={screen.mode === 'lightning' ? lightning : play}
          onHome={() => setScreen({ k: 'home' })}
        />
      )}
      {screen.k === 'zoo' && (
        <Zoo save={save} onPick={(id) => setSave((s) => ({ ...s, current: id }))} onBack={() => setScreen({ k: 'home' })} />
      )}
      {screen.k === 'parent' && (
        <Parent
          save={save}
          onSettings={(settings) => setSave((s) => ({ ...s, settings }))}
          onReset={() => setSave(fresh())}
          onBack={() => setScreen({ k: 'home' })}
        />
      )}
      {hatching && <Hatch m={monsterById(hatching)} onDone={finishHatch} />}
    </>
  );
}
