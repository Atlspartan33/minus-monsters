import { useEffect, useRef, useState } from 'react';
import { sfx } from './sound';
import { createListener, type MicState } from './voice';

// Say any number and see what the tablet heard. The event log underneath is for grown-ups:
// it shows where voice breaks (no "start", no "sound", or sound but no words).
export function MicCheck({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<MicState | 'starting'>('starting');
  const [text, setText] = useState('');
  const [got, setGot] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    let gone = false; // a stopped listener's last "idle" mustn't overwrite the live one
    const l = createListener(
      (h) => {
        if (gone) return;
        setText(h.text);
        const n = h.alts.flat().at(-1);
        if (h.final && n !== undefined) {
          setGot(n);
          sfx.chomp();
        }
      },
      (st) => !gone && setState(st),
      (ev) => !gone && setLog((xs) => [...xs.slice(-5), ev]),
    );
    l?.start();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      gone = true;
      l?.stop();
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const status =
    got !== null
      ? `I heard ${got}! The mic works.`
      : state === 'blocked'
        ? 'The mic is blocked. Turn on Microphone for this site in Chrome.'
        : state === 'offline'
          ? 'Voice needs internet and Google speech on this tablet.'
          : state === 'hearing'
            ? 'I hear you…'
            : state === 'listening'
              ? 'Say any number!'
              : state === 'idle'
                ? 'The mic stopped. Close and try again.'
                : 'Starting the mic…';

  return (
    <div className="hatch mic-check" role="dialog" aria-modal="true" aria-label="Mic test">
      <p className="hatch-title">Mic test</p>
      <div className={`mic big-mic ${state === 'hearing' ? 'hearing' : state === 'listening' ? 'listening' : ''}`} role="status">
        <span className="mic-dot" aria-hidden="true" />
        {status}
      </div>
      <p className="heard mic-heard">{text ? `“${text}”` : ' '}</p>
      <p className="mic-log" aria-label="Mic events">
        {log.length ? log.join(' · ') : 'waiting for the mic…'}
      </p>
      <button ref={closeRef} className="btn primary mic-done" onClick={onClose}>
        {got !== null ? 'Ready!' : 'Close'}
      </button>
    </div>
  );
}
