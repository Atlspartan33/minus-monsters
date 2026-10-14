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

export function parseNumbers(text: string): number[] {
  const tokens = text.toLowerCase().replace(/-/g, ' ').match(/[a-z]+|\d+/g) ?? [];
  const out: number[] = [];
  let pend: number | null = null;
  for (const t of tokens) {
    const v = /^\d+$/.test(t) ? Number(t) : WORDS[t];
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

export function createListener(onHeard: (h: Heard) => void, onState: (s: 'listening' | 'idle' | 'blocked') => void): Listener | null {
  const C = ctor();
  if (!C || !window.isSecureContext) return null;
  const r = new C();
  r.lang = 'en-US';
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 5;
  let want = false;
  let seen = 0;
  let minIndex = 0;

  r.onresult = (e) => {
    seen = e.results.length;
    for (let i = Math.max(e.resultIndex, minIndex); i < e.results.length; i++) {
      const res = e.results[i];
      const alts: number[][] = [];
      for (let j = 0; j < res.length; j++) alts.push(parseNumbers(res[j].transcript));
      onHeard({ text: res[0]?.transcript ?? '', alts, final: res.isFinal });
    }
  };
  r.onstart = () => onState('listening');
  // Android ends the session after a pause; keep it going while the round runs.
  r.onend = () => {
    seen = 0;
    minIndex = 0;
    if (want) {
      try {
        r.start();
      } catch {
        /* already starting */
      }
    } else onState('idle');
  };
  r.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
      want = false;
      onState('blocked');
    }
  };

  return {
    start() {
      want = true;
      try {
        r.start();
      } catch {
        /* already running */
      }
    },
    stop() {
      want = false;
      try {
        r.abort();
      } catch {
        /* not running */
      }
    },
    mark() {
      minIndex = seen;
    },
  };
}
