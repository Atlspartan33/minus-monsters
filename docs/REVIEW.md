# Minus Monsters — UX design + code review (v1 → v2, 2026-10-14)

## Design review of v1 (what was weak)

| # | Problem in v1 | Principle | v2 answer |
|---|---|---|---|
| 1 | A right answer went nowhere. The monster chomped on nothing, so the number she typed didn't *become* the food. | Feedback | A hand swoops in holding her answer as a tile, pushes it into the mouth, and the bite lands on that tile. The monster's eyes track the hand. |
| 2 | Numbers were static text. A new problem just swapped in. | Feedback / delight | Each part of the equation bounces in, staggered. Typed digits pop. The answer lifts out of the box as the hand takes it. Earned stars fly from the monster to the counter. |
| 3 | Boss bites differed only by a pink tag and outline. | Hierarchy | Boss bites now have their own sequence: a "BOSS BITE!" slam with screen shake and drum hits, a red vignette, angry brows and a pulsing aura, a giant fork in place of the hand, then shockwave rings, confetti and a fanfare when she wins. |
| 4 | Progress was a thin bar toward an egg. There was nothing to look forward to beyond the next egg. | Clarity / motivation | The **Snack Trail** has a stop every 15 stars, alternating treasure chests (dress-up items) and eggs (monsters). Her monster walks the trail after every round. Reached stops bounce with a "!" and turn the main button into "Open your prize!". |
| 5 | Monsters were collectibles she could only pick. There was no way to make one hers. | Engagement | The **Wardrobe** has 11 items across hats, glasses and neckwear, worn per monster, with locked items shown as silhouettes ("In a chest"). Outfits appear everywhere the monster does. |
| 6 | The Lightning Round was a fixed 15 problems. | Control | She picks 10, 15, 20 or 30 problems, and each length keeps its own best time. |
| 7 | Screens hard-cut and the background was flat. | Feel | Screens slide in. Faint numbers drift in the background. The home monster's eyes wander and it reacts when poked. Everything respects reduced-motion settings. |
| 8 | On short screens the stage could push into the "Show me" button. | Layout | In portrait the monster shrinks first (`--mon` is capped by available height). |

What stayed the same on purpose:
- No visible timer in the regular game.
- One lime primary action per screen.
- Tap targets of 56px or more.
- "Show me" never prints the answer.

## Code review (code-reviewer agent) → fixes

| Severity | Finding | Fix |
|---|---|---|
| **Critical** | `buildRound` crashed when exactly one easy fact remained. Its warm-up loop called `weightedPick([])`. The crash happened inside a click handler, so **Feed silently stopped working, for good**. In 137 of 200 simulated players this happened by round 15–30. | The warm-up loop now checks for an empty pool and stops early. `weightedPick` throws a clear error on an empty list. Regression test added. |
| Important | Play's timers outlived the screen. Quitting during the last chomp could still jump to the round summary, or clobber a new round. | All timers are tracked and cleared on unmount. |
| Important | Offline, the voice recognizer restarted in a tight loop while showing "Listening…". | `network` errors and fast restart storms switch Lightning to typing, with a message. |
| Important | Voice false positives: "I want **to** go" counted as 2, and noise from TJ or the TV started the speed clock. | Sound-alike words count only as a whole utterance. Interim results trust only the top guess. The clock starts on the first parsed number. "Thirteen…" on its own is treated as reading the problem. |
| Important | First install wasn't offline-safe. The JS bundle loaded before the service worker existed. | After `serviceWorker.ready`, all loaded same-origin resources are cached. |
| Suggestion | A comeback answered right after the demo counted as a clean, fluent answer. | A comeback climbs no higher than box 1, and is never placed immediately next. |
| Suggestion | `pagehide` is unreliable on Android. | The save also flushes on `visibilitychange → hidden`. |

Tests now exist (`npm test`, 21 passing):
- A property test of `buildRound`/`buildLightning` over 2,000 random histories, plus the v1 crash case.
- Bounds checks on `bossProblem`.
- Ladder rules in `record`.
- A table test for `parseNumbers`.
- Snack Trail prize order and claiming.

## UX audit of v2 (ux-auditor, measured) → fixes

The audit measured at 375×812, 800×1280 and 1280×800. The 800×1280 tablet was clean on every layout check.

| Principle | Result | Fixed |
|---|---|---|
| Clarity | Pass. The trail-to-prize flow reads for a 7-year-old. The trail stops looked tappable but weren't. | Reached stops are now buttons that open the prize. Stop numbers carry a star. |
| Hierarchy | Flagged two lime buttons on Home when a prize is waiting. | Re-measured: only "Open your prize!" is lime (72px). "Feed" is the secondary style (59px, 12% white). |
| Accessibility | Fail: at 375px the streak pill overlapped "Show me" by 15px. The trail "!" was 2.82:1. Boss shake caused a 3px sideways scroll. The wardrobe tabs were 52px. | Monster height cap is now `100dvh − 590px`; at 375×812 the streak ends at 431 and "Show me" starts at 432, with no scroll. The "!" is now ink on pink. `overflow-x: clip` stops the sideways scroll. Tabs are 56px, and the item being worn shows a ✓ badge. |
| Feedback | Pass. FEED to hand on screen takes 14–19ms. With reduced motion on, the boss intro was invisible during a 1.4s input lock, and the hand never appeared. | Reduced motion now keeps the intro overlay and the hand visible, without the movement. |

Re-measured after fixes (Play, mid-round):
- 375×812: no scroll.
- 800×1280: monster 100–556, card 566–682, Show me 770–830, keypad 840–1266, no scroll.
- 1280×800: two columns, no scroll.

Not verified in the browser pane:
- Voice (the mic is blocked there).
- Sound by ear.
- A real child.

## Round 3: closing the gaps

**Monster options.** v2 had dress-up only. The **Monster Maker** lets her design a whole monster. The choices are 12 colors, 4 shapes, 1–3 eyes, horns/antenna/ears/nothing on top, fangs/buck teeth/none, spots on/off, and a silly-name generator with a labelled name field. It hatches from an egg into a **Homemade monsters** section of the Zoo (up to 6), and it can be dressed up like any other monster.

**Sound, measured.** Every effect was rendered through an `OfflineAudioContext` (`withContext` in `sound.ts`) and checked for silence, clipping and level.
- **Before:** none silent, none clipping. But the **SPEEDY** reward chime sat at −45.5 dB RMS, about 10 dB under the chomp, so the reward for being fast was the quietest thing in the game. The sparkle (−48) and trail steps (−46) were also faint.
- **After:** speedy −35.1, chomp −31.6, walk −38.7, sparkle −38.9, with a 1.5× master gain. The loudest overlap (chomp + boss fanfare + speedy) peaks at **0.40**, so no clipping.
- **Haptics:** Android tablets now buzz on chomp, miss, boss intro and boss win, as a second non-visual cue. They follow the Sounds toggle.

**Voice, end to end on v2** (a fake `SpeechRecognition` driven from the page):
- "I want to go" → *Didn't catch that* (it no longer counts as 2).
- Saying only the problem's first number → *Didn't catch that*.
- Word answers ("seven") and digit answers both resolve.
- A 10-problem round finished with **NEW RECORD 0:13.5**, saved under `lightning.bests["10"]`.

**Bug found while building the Maker.** The Lightning best-run marker used the class `.ghost` (position absolute, full height). That collided with `.btn.ghost`, so every ghost-style button had been laid out as a full-height absolute bar since the Lightning Round shipped. That included the help demo's **Watch again / Hide**. It's renamed to `.ghost-mark`.

**Still not verifiable here:**
- A real child's voice through a real mic. The pane blocks the mic, and Android speech recognition needs internet.
- Whether Android beeps when the recognizer restarts.
- Hearing the mix on the tablet's own speaker.

## Final full audit (ux-auditor, all screens × 375 / 800×1280 / 1280×800)

- **Clarity: pass.**
- **Feedback: pass.** Wrong answer and help demo both respond within 150ms.
- **Contrast:** 0 failures on any screen.
- **Layout:** no horizontal scroll anywhere, and no vertical scroll on Play or Lightning rounds.
- **Ghost-button fix:** confirmed. All ghost buttons now lay out normally.

The audit flagged 5 items. All are fixed and re-measured at 800×1280:
1. The Maker's "Bring X to life!" button started at y=1312, below the fold. It's now pinned to the bottom of the screen, at 1172–1268 in a 1280-tall viewport.
2. "+ Make a monster" sat below 11 locked cards. The Homemade section now comes first, and the button sits at y=165.
3. The trail chest button was 42px wide on phones. Stops now have a 48px minimum width.
4. The name input's label also read "New name". The label now covers only the input and reads "Name".
5. The Lightning length radios also had `aria-pressed`. That's removed, so they're radios only.

## Round 4 (2026-10-28): Munch Monsters

**Built:**
- Four tracks: − + × ÷. Times and Share start on the 1, 2 and 10 tables, and the next tables open at 60% fluent.
- A mini boss in the middle of every round.
- Voice-like burps. Measured, they now land louder than a chomp, with the worst overlap peaking at 0.85.
- Dancing, tickle tricks, Home bubbles, multi-tap chests and stars, a sparkly keypad, 10 new monsters, and 5 Snack Trail worlds.
- The mic was rebuilt for Android, plus a mic test dialog.

**Code review fixes:**
- Lightning rejected answers equal to the first number (×1, ÷1) as "reading the problem".
- Lightning couldn't type 100.
- Lightning's answer reveal showed "−" on every track.
- The 6s mic fallback ran before the watchdog could retry.
- "Blocked" was overwritten by "idle".
- Late events from a replaced recognizer could clobber the new session.
- Some Share boss bites were plain facts.
- `.track` was shared by the picker and the Lightning lane.
- A damaged `ops` list could crash migration.
- Focus was lost when the hero monster and prize remounted.

**UX audit fixes:**
- At 375px, 10 plates covered the keypad. Plates now use 2 columns on phones, rows of five, and a capped, scrollable area.
- The mic test hid the "blocked" status.
- The wordmark badge was 2.82:1. It now uses an ink glyph (6.38:1).
- Grown-up controls were 43px. They are now 44px.
- Added dots showed by colour alone. They now carry a "+".
- Home scrolled 9px at 800×1280. It now fits exactly.

**Not yet checked:**
- The 1280×800 landscape layout.
- Trail worlds 2–5 on a real screen.
- Prize multi-tap visuals.
- Any audio on the tablet speaker.
- Voice on the real tablet.
