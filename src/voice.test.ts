import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createListener, type Heard } from './voice';

// A fake recognizer that behaves like Chrome on Android: one phrase per session, each
// arriving as a one-item results list, and start() throws while a session is still open.
class FakeSR {
  static last: FakeSR;
  static all: FakeSR[] = [];
  lang = '';
  continuous = true;
  interimResults = false;
  maxAlternatives = 1;
  running = false;
  onresult: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor() {
    FakeSR.last = this;
    FakeSR.all.push(this);
  }
  start() {
    if (this.running) throw new Error('InvalidStateError');
    this.running = true;
    setTimeout(() => this.onstart?.(), 5);
  }
  abort() {
    if (!this.running) return;
    this.running = false;
    setTimeout(() => this.onend?.(), 5);
  }
  say(text: string, isFinal = true) {
    const res = Object.assign([{ transcript: text }], { isFinal });
    this.onresult?.({ resultIndex: 0, results: [res] });
    if (isFinal && !this.continuous) this.abort(); // single-phrase session ends itself
  }
}

const live = () => FakeSR.all.find((x) => x.running)!;

describe('createListener on Android-style recognizers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeSR.all = [];
    (globalThis as Record<string, unknown>).window = {
      SpeechRecognition: FakeSR,
      isSecureContext: true,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
    };
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>).window;
  });

  it('keeps hearing an answer for every problem', async () => {
    const heard: Heard[] = [];
    const l = createListener((h) => heard.push(h), () => {})!;
    l.start();
    for (const w of ['five', 'eight', 'six', 'nine']) {
      await vi.advanceTimersByTimeAsync(300);
      live().say(w);
      l.mark();
    }
    expect(heard.map((h) => h.alts[0])).toEqual([[5], [8], [6], [9]]);
    expect(FakeSR.last.continuous).toBe(false);
  });

  it('drops a phrase from the previous problem that finishes late', async () => {
    const heard: Heard[] = [];
    const l = createListener((h) => heard.push(h), () => {})!;
    l.start();
    await vi.advanceTimersByTimeAsync(50);
    const old = live();
    old.say('fi', false);
    l.mark();
    old.say('five'); // late final from the aborted session
    await vi.advanceTimersByTimeAsync(300);
    live().say('nine');
    expect(heard.map((h) => h.text)).toEqual(['fi', 'nine']);
  });

  it('revives a session that silently died', async () => {
    const heard: Heard[] = [];
    const l = createListener((h) => heard.push(h), () => {})!;
    l.start();
    await vi.advanceTimersByTimeAsync(50);
    live().running = false; // died with no end event
    FakeSR.all.forEach((x) => (x.onend = null));
    await vi.advanceTimersByTimeAsync(10_500);
    live().say('seven');
    expect(heard.map((h) => h.text)).toEqual(['seven']);
  });

  it('silence alone never gives up on the mic', async () => {
    const states: string[] = [];
    const l = createListener(() => {}, (s) => states.push(s))!;
    l.start();
    for (let i = 0; i < 20; i++) {
      await vi.advanceTimersByTimeAsync(5000);
      const x = live();
      x.onerror?.({ error: 'no-speech' });
      x.abort();
    }
    expect(states).not.toContain('offline');
  });

  it('a blocked mic reports blocked', async () => {
    const states: string[] = [];
    const l = createListener(() => {}, (s) => states.push(s))!;
    l.start();
    await vi.advanceTimersByTimeAsync(50);
    live().onerror?.({ error: 'not-allowed' });
    expect(states).toContain('blocked');
  });
});

describe('createListener edge cases from review', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeSR.all = [];
    (globalThis as Record<string, unknown>).window = { SpeechRecognition: FakeSR, isSecureContext: true, setTimeout, clearTimeout, setInterval, clearInterval };
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>).window;
  });

  it('a replaced recognizer ending late does not break the new session', async () => {
    const heard: Heard[] = [];
    const states: string[] = [];
    const l = createListener((h) => heard.push(h), (s) => states.push(s))!;
    l.start();
    await vi.advanceTimersByTimeAsync(50);
    const old = live();
    // It goes quiet without ending; the watchdog replaces it.
    old.abort = () => {};
    await vi.advanceTimersByTimeAsync(10_500);
    const fresh = FakeSR.last;
    expect(fresh).not.toBe(old);
    old.onend?.(); // the old one's end finally arrives
    old.onstart?.();
    await vi.advanceTimersByTimeAsync(300);
    FakeSR.last.say('four');
    expect(heard.map((h) => h.text)).toEqual(['four']);
    expect(states).not.toContain('offline');
  });

  it('retries a later session that never fires onstart', async () => {
    const heard: Heard[] = [];
    const l = createListener((h) => heard.push(h), () => {})!;
    l.start();
    await vi.advanceTimersByTimeAsync(50);
    live().say('two'); // first session works and ends
    const proto = FakeSR.prototype.start;
    let mute = true;
    FakeSR.prototype.start = function (this: FakeSR) {
      if (mute) {
        mute = false;
        this.running = true; // opens but never reports onstart
        return;
      }
      proto.call(this);
    };
    await vi.advanceTimersByTimeAsync(4500);
    FakeSR.prototype.start = proto;
    await vi.advanceTimersByTimeAsync(300);
    FakeSR.all.filter((x) => x.running).at(-1)!.say('nine');
    expect(heard.map((h) => h.text)).toEqual(['two', 'nine']);
  });

  it('blocked stays blocked after the recognizer ends', async () => {
    const states: string[] = [];
    const l = createListener(() => {}, (s) => states.push(s))!;
    l.start();
    await vi.advanceTimersByTimeAsync(50);
    live().onerror?.({ error: 'not-allowed' });
    await vi.advanceTimersByTimeAsync(100);
    expect(states.at(-1)).toBe('blocked');
  });
});
