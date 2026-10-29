// All sounds are synthesized — no audio files, works offline.
let ctx: AudioContext | null = null;
let enabled = true;
let override: BaseAudioContext | null = null;

/** Render sounds into another context (e.g. an OfflineAudioContext, to measure them). */
export function withContext(c: BaseAudioContext, fn: () => void) {
  override = c;
  try {
    fn();
  } finally {
    override = null;
  }
}

/** Android tablets buzz; a second, non-visual cue for every big moment. */
function buzz(pattern: number | number[]) {
  if (!enabled || override) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no vibration */
  }
}

export const setSound = (on: boolean) => {
  enabled = on;
};

function ac(): BaseAudioContext {
  if (override) return override;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// Measured offline (OfflineAudioContext): peaks stay under ~0.7 even when chomp + boss fanfare overlap.
const MASTER = 1.5;

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, when = 0, slideTo?: number) {
  if (!enabled && !override) return;
  vol *= MASTER;
  try {
    const c = ac();
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch {
    /* audio unavailable */
  }
}

function noise(dur: number, vol: number, when: number, cutoff: number) {
  if (!enabled && !override) return;
  vol *= MASTER;
  try {
    const c = ac();
    const t = c.currentTime + when;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  } catch {
    /* audio unavailable */
  }
}

// A burp is a voice, not a beep: a low buzz whose pitch wobbles and drops, chopped by
// vocal-fold flutter (the "rrr"), shaped by two mouth resonances ("urrp"), ending in a pop.
function burpVoice(when: number, dur: number, f0: number, f1: number, flutter: number, vol: number, vowel: [number, number]) {
  if (!enabled && !override) return;
  vol *= MASTER * 1.6; // measured: a burp should land louder than a chomp
  try {
    const c = ac();
    const t = c.currentTime + when;
    const src = c.createOscillator();
    src.type = 'sawtooth';
    const pts = new Float32Array(32);
    for (let i = 0; i < pts.length; i++) {
      const k = i / (pts.length - 1);
      pts[i] = (f0 + (f1 - f0) * k * k) * (1 + (Math.random() - 0.5) * 0.16);
    }
    src.frequency.setValueCurveAtTime(pts, t, dur);
    // Flutter: amplitude chopped 25–45 times a second.
    const fl = c.createOscillator();
    fl.type = 'square';
    fl.frequency.setValueAtTime(flutter, t);
    fl.frequency.linearRampToValueAtTime(flutter * 0.7, t + dur);
    const flDepth = c.createGain();
    flDepth.gain.value = 0.45;
    const chop = c.createGain();
    chop.gain.value = 0.55;
    fl.connect(flDepth).connect(chop.gain);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(vol, t + 0.04);
    env.gain.setValueAtTime(vol, t + dur * 0.7);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(chop);
    for (const [f, q, g] of [
      [vowel[0], 5, 1],
      [vowel[1], 7, 0.45],
    ]) {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(f, t);
      bp.frequency.linearRampToValueAtTime(f * 0.8, t + dur); // the mouth closes toward the end
      bp.Q.value = q;
      const gg = c.createGain();
      gg.gain.value = g * 3;
      chop.connect(bp).connect(gg).connect(env);
    }
    env.connect(c.destination);
    src.start(t);
    fl.start(t);
    src.stop(t + dur + 0.05);
    fl.stop(t + dur + 0.05);
  } catch {
    /* audio unavailable */
  }
  noise(dur * 0.8, 0.05, when, 500); // breathy rumble underneath
  noise(0.05, 0.22, when + dur - 0.02, 900); // the "p"
}

export const sfx = {
  key: () => tone(720, 0.05, 'triangle', 0.07),
  chomp: () => {
    buzz([25, 90, 25, 90, 25]);
    for (let i = 0; i < 3; i++) {
      noise(0.08, 0.55, i * 0.12, 1100);
      tone(150, 0.07, 'square', 0.05, i * 0.12, 90);
    }
  },
  yum: () => {
    tone(523, 0.1, 'triangle', 0.14, 0.36);
    tone(659, 0.1, 'triangle', 0.14, 0.45);
    tone(784, 0.22, 'triangle', 0.16, 0.54);
  },
  speedy: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.11, 'square', 0.13, 0.36 + i * 0.06)),
  oops: () => {
    buzz([60, 50, 60]);
    tone(392, 0.16, 'sine', 0.14, 0, 300);
    tone(300, 0.22, 'sine', 0.12, 0.16, 240);
  },
  /** size 1 = streak of 5, 2 = 10, 3 = 15+: the burps get bigger. */
  burp: (size = 1) => {
    buzz(size >= 3 ? [60, 30, 60, 30, 200] : [80, 40, 120]);
    const pick = Math.floor(Math.random() * 3);
    if (size >= 3) {
      // MEGA: a long rolling one that drops at the end.
      burpVoice(0, 1.5, 105, 58, 30, 0.2, [380, 820]);
      burpVoice(1.35, 0.25, 140, 95, 40, 0.12, [480, 1000]);
    } else if (pick === 0 || size === 2) {
      burpVoice(0, size === 2 ? 1.05 : 0.75, 115, 70, 34, 0.18, [420, 880]); // classic "urrrp"
    } else if (pick === 1) {
      // Double: "burp-burp!"
      burpVoice(0, 0.32, 125, 95, 40, 0.16, [460, 950]);
      burpVoice(0.38, 0.5, 110, 72, 34, 0.18, [420, 880]);
    } else {
      burpVoice(0, 0.55, 150, 200, 45, 0.14, [520, 1100]); // little squeaky one that goes up
    }
  },
  miniBoss: () => {
    buzz([70, 90, 70]);
    [0, 0.18].forEach((t) => tone(110, 0.22, 'sine', 0.28, t, 70));
    tone(330, 0.3, 'square', 0.06, 0.38, 495);
  },
  giggle: () => [0, 0.09, 0.18, 0.27].forEach((t, i) => tone(660 + i * 70, 0.07, 'triangle', 0.2, t, 880 + i * 70)),
  pop: () => {
    tone(900, 0.06, 'sine', 0.14, 0, 1500);
    noise(0.04, 0.2, 0, 4000);
  },
  /** A short bouncy groove for the dance; one bar is ~1.9 s. */
  dance: () => {
    const beat = 0.24;
    for (let i = 0; i < 8; i++) {
      tone(i % 2 ? 98 : 65, 0.16, 'sine', 0.3, i * beat, i % 2 ? 90 : 55); // kick + bass
      if (i % 2) noise(0.05, 0.12, i * beat, 7000); // clap
    }
    [523, 659, 784, 659, 880, 784, 659, 523].forEach((f, i) => tone(f, 0.18, 'square', 0.05, i * beat + 0.02));
  },
  boing: () => tone(220, 0.35, 'sine', 0.16, 0, 660),
  hatch: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, i * 0.09)),
  walk: () => [0, 0.18, 0.36, 0.54, 0.72].forEach((t, i) => tone(i % 2 ? 330 : 392, 0.08, 'triangle', 0.13, t)),
  whoosh: () => noise(0.28, 0.22, 0, 2400),
  bossIntro: () => {
    buzz([90, 130, 90, 130, 90]);
    [0, 0.22, 0.44].forEach((t) => {
      tone(70, 0.3, 'sine', 0.35, t, 45);
      noise(0.12, 0.3, t, 300);
    });
    tone(220, 0.5, 'sawtooth', 0.07, 0.66, 330);
  },
  bossWin: () => {
    buzz([40, 40, 40, 40, 160]);
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.07, 0.3 + i * 0.08));
    tone(1047, 0.5, 'triangle', 0.14, 0.62);
    tone(1319, 0.5, 'triangle', 0.1, 0.62);
    noise(0.4, 0.2, 0.3, 5000);
  },
  chest: () => {
    tone(200, 0.12, 'square', 0.08, 0, 160);
    [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.18, 'sine', 0.1, 0.18 + i * 0.07));
  },
  sparkle: () => [1568, 2093, 2637].forEach((f, i) => tone(f, 0.14, 'sine', 0.1, i * 0.05)),
  crack: () => noise(0.1, 0.5, 0, 3000),
  nibble: () => noise(0.05, 0.35, 0, 1500),
  break: () => {
    noise(0.15, 0.5, 0, 2500);
    tone(880, 0.12, 'triangle', 0.08, 0.05, 1320);
  },
};

export function speak(text: string) {
  if (!enabled) return;
  try {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text.replace('−', 'minus'));
    u.rate = 0.92;
    u.pitch = 1.1;
    const v = s.getVoices().find((x) => x.lang === 'en-US');
    if (v) u.voice = v;
    s.speak(u);
  } catch {
    /* no speech */
  }
}

// Create the AudioContext on a tap that isn't latency-sensitive, so the first keypad press isn't.
export function warm() {
  try {
    ac();
  } catch {
    /* audio unavailable */
  }
}
