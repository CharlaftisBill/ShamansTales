# Shaman's Tales: Architecture Roadmap
## Migrating to a Data-Driven Engine

This document outlines the theoretical roadmap for transitioning *Shaman's Tales* from its current hardcoded procedural architecture into a scalable, production-ready, Data-Driven CCG engine (similar to *Hearthstone* or *Marvel Snap*). 

This migration should only be attempted **after** creating an extensive, 100% coverage regression test suite for `engine.js` to ensure the core game loop is protected during the refactor.

---

## 1. The Core Problem with the Current Architecture
Currently, the `RulesEngine` object (inside `engine.js`) relies on hardcoded validation. To see if a unit splashes damage, the engine literally checks `if (card.fightingClass === FIGHTING_CLASS.RAVAGER)`.
* **Pro:** Extremely fast for prototyping.
* **Con:** Does not scale. Adding custom card text (e.g., "When this unit is summoned, give all friendly pawns +1 Influence") requires injecting new `if` statements into the core engine. This leads to massive, fragile "spaghetti code."

---

## 2. The Target Architecture: Three Pillars

Professional CCGs use a combination of three design patterns to solve this:

### A. Data-Driven Design (JSON Schemas)
The engine should know nothing about specific cards. Cards should not be JavaScript classes. Instead, they are pure data payloads (`decks.json`), and they define their own effects using modular, reusable building blocks.

**Example of the Future JSON Schema:**
```json
{
  "id": "GR03-00004",
  "title": "Medusa, The Gorgon",
  "cost": 6,
  "influence": 5,
  "triggers": [
    {
      "event": "ON_ATTACKED",
      "action": "SEAL_TARGET",
      "duration": 3
    }
  ]
}
```

### B. The Mechanics Event Bus (Observer Pattern)
We already have a **System Event Bus** (`window.dispatchEvent` used for `VFX_SUMMON`, `PLAY_SFX`, etc.). 

We need to create a **Mechanics Event Bus**. 
* The engine will no longer check if a card has a special power. 
* Instead, the engine broadcasts what just happened (e.g., `window.dispatchEvent(new CustomEvent('GAME:ON_ATTACKED', { target, attacker }))`).
* A generic `CardInstance` class sits on the board and listens to this event. If it sees its own data matches the trigger condition, it pushes a reaction to the Action Queue.

### C. The Action Queue (Command Pattern)
Resolutions must no longer happen instantly. 
Currently, `target.health -= 5` happens synchronously. In the new architecture, the engine generates an `Action` object and pushes it to an `ActionQueue`. 

**Why?**
1. It allows UI animations to play in between mechanics.
2. It handles "Nested Triggers". (E.g., An attack drops health to 0 -> Triggers a Death Event -> Death Event triggers a secondary explosion -> Explosion deals damage).
3. It allows the AI to simulate moves cleanly by copying the queue and running it in a sandbox.

---

## 3. Implementation Step-by-Step Guide

If we choose to proceed, this is the exact order of operations:

### Phase 1: The Regression Test Suite
* Expand `tests/test_runner.js`.
* Hardcode board states and run attacks/summons for every edge case currently existing in the game.
* Use `console.assert()` to mathematically prove the state mutates perfectly.
* **Do not touch engine code until this passes.**

### Phase 2: Atomic Mutators
* Break down the massive `handleAttack` and `handleSummon` functions inside `engine.js` into tiny atomic functions.
* Examples: `applyDamage(x, y, amount)`, `destroyUnit(x, y)`, `changeUnitState(x, y, state)`.

### Phase 3: The Event-Driven Engine
* Refactor the `engine.js` so it no longer mutates state directly.
* `handleAttack` now simply emits an event: `GAME:APPLY_DAMAGE`.
* The `Engine` listens for `GAME:APPLY_DAMAGE` and routes it to the `applyDamage` atomic function.
* The atomic function then emits a reaction event: `GAME:ON_DAMAGED`.

### Phase 4: The Action Queue
* Introduce `ActionQueue.js`. 
* Change the event listeners so they don't resolve instantly. Instead, they push to the Queue.
* Set up an `async processNext()` loop in the queue to resolve actions one by one, optionally `await`ing for the UI to play animations.

### Phase 5: The Effect Processor & Keyword Mechanics
* Write a generic `EffectProcessor.js` that knows how to read JSON definitions and convert them into custom actions.
* **Preserve Fighting Classes as Core Keywords:** Do not strip out the `FIGHTING_CLASS` mechanics. Instead, refactor them into modular, intrinsic functions (e.g., `resolveRavagerSplash()`). The engine will automatically hook these functions into the appropriate event (e.g., a Ravager automatically subscribes to `ON_DAMAGE_DEALT` to trigger its splash).
* Port all truly unique, one-off card mechanics into the new `decks.json` format, leaving Fighting Classes as the core backbone of the game.

---

## 4. Key Considerations & Advantages

* **No Separate JS Files for Cards:** You do *not* need a `Medusa.js` or `Njord.js`. One single `CardInstance.js` handles all cards by parsing their JSON definitions.
* **Game Designer Friendly:** Balancing the game requires zero programming. A designer just edits `decks.json`.
* **Hot-Patching:** `decks.json` can be fetched from a server, meaning balance patches can happen instantly without requiring app updates.
* **Separation of Concerns:** Keep System events (UI/AI/SFX) strictly separated from Game events (mechanics). Use prefixes like `GAME:` for internal mechanics and `SYS:` for visuals.
