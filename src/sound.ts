// All sounds are synthesized — no audio files, works offline.
let ctx: AudioContext | null = null;
let enabled = true;

export const setSound = (on: boolean) => {
  enabled = on;
};

function ac() {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, when = 0, slideTo?: number) {
  if (!enabled) return;
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
  if (!enabled) return;
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

export const sfx = {
  key: () => tone(720, 0.05, 'triangle', 0.07),
  chomp: () => {
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
  speedy: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.09, 'square', 0.06, 0.36 + i * 0.06)),
  oops: () => {
    tone(392, 0.16, 'sine', 0.14, 0, 300);
    tone(300, 0.22, 'sine', 0.12, 0.16, 240);
  },
  burp: () => {
    tone(120, 0.7, 'sawtooth', 0.16, 0, 62);
    tone(126, 0.7, 'sawtooth', 0.1, 0.02, 58);
    noise(0.5, 0.12, 0, 400);
  },
  boing: () => tone(220, 0.35, 'sine', 0.16, 0, 660),
  hatch: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, i * 0.09)),
  walk: () => [0, 0.18, 0.36, 0.54, 0.72].forEach((t, i) => tone(i % 2 ? 330 : 392, 0.08, 'triangle', 0.08, t)),
  whoosh: () => noise(0.28, 0.22, 0, 2400),
  bossIntro: () => {
    [0, 0.22, 0.44].forEach((t) => {
      tone(70, 0.3, 'sine', 0.35, t, 45);
      noise(0.12, 0.3, t, 300);
    });
    tone(220, 0.5, 'sawtooth', 0.07, 0.66, 330);
  },
  bossWin: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.07, 0.3 + i * 0.08));
    tone(1047, 0.5, 'triangle', 0.14, 0.62);
    tone(1319, 0.5, 'triangle', 0.1, 0.62);
    noise(0.4, 0.2, 0.3, 5000);
  },
  chest: () => {
    tone(200, 0.12, 'square', 0.08, 0, 160);
    [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.18, 'sine', 0.1, 0.18 + i * 0.07));
  },
  sparkle: () => [1568, 2093, 2637].forEach((f, i) => tone(f, 0.12, 'sine', 0.05, i * 0.05)),
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
