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
