import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createListener, type Heard } from './voice';

// A fake recognizer that behaves like Chrome on Android: every utterance arrives as a
// one-item results list at index 0, even inside one continuous session.
class FakeSR {
  static last: FakeSR;
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  running = false;
  starts = 0;
  onresult: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor() {
    FakeSR.last = this;
  }
  start() {
    if (this.running) throw new Error('already started');
    this.running = true;
    this.starts++;
    queueMicrotask(() => this.onstart?.());
  }
  abort() {
    if (!this.running) return;
    this.running = false;
    queueMicrotask(() => this.onend?.());
  }
  say(text: string, isFinal = true) {
    const res = Object.assign([{ transcript: text }], { isFinal });
    this.onresult?.({ resultIndex: 0, results: [res] });
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('createListener on Android-style results', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).window = { SpeechRecognition: FakeSR, isSecureContext: true };
  });
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
  });

  it('keeps hearing answers after each new problem', async () => {
    const heard: Heard[] = [];
    const l = createListener((h) => heard.push(h), () => {})!;
    l.start();
    await flush();
    FakeSR.last.say('five');
    l.mark(); // next problem
    await flush();
    FakeSR.last.say('eight');
    l.mark();
    await flush();
    FakeSR.last.say('six');
    expect(heard.map((h) => h.alts[0])).toEqual([[5], [8], [6]]);
  });

  it('drops speech still in flight from the previous problem', async () => {
    const heard: Heard[] = [];
    const l = createListener((h) => heard.push(h), () => {})!;
    l.start();
    await flush();
    FakeSR.last.say('fi', false);
    l.mark();
    FakeSR.last.say('five'); // the old utterance finishing late
    await flush();
    FakeSR.last.say('nine');
    expect(heard.map((h) => h.text)).toEqual(['fi', 'nine']);
  });

  it('intentional restarts never trip the offline guard', async () => {
    const states: string[] = [];
    const l = createListener(() => {}, (s) => states.push(s))!;
    l.start();
    await flush();
    for (let i = 0; i < 8; i++) {
      l.mark();
      await flush();
    }
    expect(states).not.toContain('offline');
    expect(FakeSR.last.running).toBe(true);
  });
});
