// Spoken answers via the Web Speech API (Chrome sends the audio to Google to transcribe).
// It needs a secure page (https or localhost) and a tap to start.

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onsoundstart?: (() => void) | null;
  onsoundend?: (() => void) | null;
};
type SREvent = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
type SRCtor = new () => SR;

const ctor = (): SRCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const voiceAvailable = () => !!ctor() && window.isSecureContext;
export const voiceProblem = () =>
  !ctor() ? 'This browser can’t hear answers. Use Chrome.' : !window.isSecureContext ? 'The mic only works on a secure (https) link.' : null;

// Kids' number words come back as homophones a lot.
const WORDS: Record<string, number> = {
  zero: 0, one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, tree: 3, free: 3, four: 4, for: 4, fore: 4, five: 5,
  six: 6, sicks: 6, sics: 6, sex: 6, seven: 7, eight: 8, ate: 8, nine: 9, nein: 9, ten: 10, tin: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

// Sound-alikes only count when they're the whole utterance ("ate!"), not inside a sentence ("I ate it").
const HOMOPHONES = new Set(['won', 'to', 'too', 'tree', 'free', 'for', 'fore', 'sicks', 'sics', 'sex', 'ate', 'nein', 'tin']);

export function parseNumbers(text: string): number[] {
  const tokens = text.toLowerCase().replace(/-/g, ' ').match(/[a-z]+|\d+/g) ?? [];
  const alone = tokens.length === 1;
  const out: number[] = [];
  let pend: number | null = null;
  for (const t of tokens) {
    const v = /^\d+$/.test(t) ? Number(t) : HOMOPHONES.has(t) && !alone ? undefined : WORDS[t];
    if (v === undefined) {
      if (pend !== null) out.push(pend);
      pend = null;
      continue;
    }
    if (pend !== null && pend >= 20 && pend % 10 === 0 && v < 10) {
      out.push(pend + v); // "twenty five"
      pend = null;
      continue;
    }
    if (pend !== null) out.push(pend);
    pend = v;
  }
  if (pend !== null) out.push(pend);
  return out;
}

export interface Heard {
  text: string;
  alts: number[][]; // numbers found in each alternative transcript
  final: boolean;
}

export interface Listener {
  start(): void;
  stop(): void;
  /** Ignore anything heard before this moment (call when a new problem appears). */
  mark(): void;
}

export type MicState = 'listening' | 'hearing' | 'idle' | 'blocked' | 'offline';

// One phrase per session (continuous mode is unreliable on Android: duplicate, missing or
// never-final results), restarted after a short pause because start() inside onend can
// throw while the old session winds down. A watchdog revives a session that silently died.
export function createListener(
  onHeard: (h: Heard) => void,
  onState: (s: MicState) => void,
  onLog?: (event: string) => void,
): Listener | null {
  const C = ctor();
  if (!C || !window.isSecureContext) return null;
  const log = (ev: string) => onLog?.(ev);
  let r: SR | null = null;
  let want = false;
  let running = false; // a session is open (start called, end not yet seen)
  let sid = 0; // session counter
  let staleSid = -1; // a session whose speech belongs to the previous problem
  let heardInSession = false;
  let lastEvent = 0;
  let fails: number[] = [];
  let retry = 0;
  let dog = 0;

  const make = () => {
    const x = new C();
    x.lang = 'en-US';
    x.continuous = false;
    x.interimResults = true;
    x.maxAlternatives = 5;
    x.onstart = () => {
      lastEvent = Date.now();
      log('start');
      if (want) onState('listening');
    };
    x.onsoundstart = () => {
      lastEvent = Date.now();
      log('sound');
      if (want) onState('hearing');
    };
    x.onsoundend = () => {
      if (want) onState('listening');
    };
    x.onresult = (e) => {
      lastEvent = Date.now();
      heardInSession = true;
      if (!want || sid === staleSid) return; // stopped, or speech left over from the last problem
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const alts: number[][] = [];
        for (let j = 0; j < res.length; j++) alts.push(parseNumbers(res[j].transcript));
        log(`${res.isFinal ? 'heard' : 'hearing'}: ${res[0]?.transcript ?? ''}`);
        onHeard({ text: res[0]?.transcript ?? '', alts, final: res.isFinal });
      }
    };
    x.onerror = (e) => {
      lastEvent = Date.now();
      log(`error: ${e.error}`);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
        give('blocked');
      } else if (e.error === 'network' || e.error === 'language-not-supported') {
        give('offline');
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        bump();
      }
    };
    x.onend = () => {
      running = false;
      log('end');
      if (want) queue(120);
      else onState('idle');
    };
    return x;
  };

  const give = (st: 'blocked' | 'offline') => {
    if (!want) return;
    want = false;
    clearInterval(dog);
    clearTimeout(retry);
    try {
      r?.abort();
    } catch {
      /* gone */
    }
    onState(st);
  };

  // Real failures (not silence) in a burst mean the recognizer can't work here.
  const bump = () => {
    const now = Date.now();
    fails = [...fails.filter((t) => now - t < 8000), now];
    if (fails.length > 4) give('offline');
  };

  const open = () => {
    if (!want || running) return;
    r ??= make();
    sid++;
    heardInSession = false;
    lastEvent = Date.now();
    try {
      r.start();
      running = true;
    } catch {
      // Still winding down: try again shortly with a fresh recognizer.
      log('start failed');
      r = make();
      bump();
      queue(400);
    }
  };

  const queue = (ms: number) => {
    clearTimeout(retry);
    retry = window.setTimeout(open, ms);
  };

  return {
    start() {
      if (want) return;
      want = true;
      fails = [];
      open();
      // A session that's open but silent for 9s (or never opened) gets replaced.
      dog = window.setInterval(() => {
        if (!want) return;
        if (!running) queue(0);
        else if (Date.now() - lastEvent > 9000) {
          log('stuck: restarting');
          try {
            r?.abort();
          } catch {
            /* gone */
          }
          running = false;
          r = make();
          queue(150);
        }
      }, 1000);
    },
    stop() {
      want = false;
      clearInterval(dog);
      clearTimeout(retry);
      try {
        r?.abort();
      } catch {
        /* not running */
      }
    },
    mark() {
      // A phrase already underway belongs to the old problem; a quiet session can keep listening.
      if (!heardInSession || !running) return;
      staleSid = sid;
      try {
        r?.abort(); // onend opens a fresh session
      } catch {
        /* gone */
      }
    },
  };
}
