# ⚔️ Skirmish: Game Design Document & Core Rules

## 1. Overview & Objective

**Skirmish** is a fast-paced, 1v1 tactical card battler played on a claustrophobic grid. Players use action points to deploy chess-inspired armies, manage their economy, and brutally fight for board control.

* **The Board:** A 5x5 Grid (25 squares).
* **The Deck:** 32 Cards per player.
* **The Goal:** Have the highest total **Influence** at the end of the game. Only pieces in the **Ready** state contribute to your final score. Exhausted pieces count as zero.

## 2. End-Game Triggers (The Checkmate Phase)

The game does not have a set turn limit or health pool. Instead, the sudden-death **Checkmate Phase** triggers if either of these two conditions is met:

1. A player attempts to draw a card but their **deck is empty**.
2. The **board becomes completely full** (all 25 squares are occupied).

When triggered, the active player finishes their turn, the opponent gets **one final turn**, and then the game immediately ends and scores are tallied.

## 3. The Game Loop & Economy

Players start the game by drawing 6 cards, followed by a **Flexible Mulligan** (replace up to 6 cards; if 0 are replaced, draw 1 extra card as a reward).

On a player's turn, the following sequence occurs:

1. **The Refill Phase:** The player automatically draws cards from their deck until they have exactly **6 cards** in their hand. (If they already have 6 or more, they draw nothing).
2. **The Action Phase:** The player has **2 Actions** to spend in any combination.
3. **End Turn:** Play passes to the opponent.

## 4. The 3 Player Actions

Players can spend their 2 Actions per turn to perform any of the following moves (the same action can be performed twice):

* **SUMMON (Cost: 1 Action)**
* **Supported Placement:** You may place any card adjacent to a friendly piece. To pay for it, you must **Exhaust** a number of your active pieces on the board equal to the new card's Cost. The newly summoned card enters the board **Ready**.
* **Unsupported Placement (Pawns Only):** Pawns can be placed freely (Cost: 0) on the two rows closest to the player without needing friendly adjacency. However, they enter the board **Exhausted**.


* **ATTACK (Cost: 1 Action)**
* Select a Ready piece to attack an enemy.
* **The Golden Rule:** The attacking card's Influence must be **greater than or equal to** the target's Influence.
* Whether the attack succeeds or fails, the attacker is immediately **Exhausted**.
* If successful, the enemy target(s) are flipped to **Exhausted**. (Cards are never destroyed or removed from the board).


* **RESURGE (Cost: 1 Action)**
* Target a friendly Exhausted piece and flip it back to **Ready**. It can now attack, be used to pay for Summons, and counts towards your Influence score.



## 5. Combat & The Fighting Classes

A piece can only attack enemies that fall along its standard chess movement lines (e.g., Rooks target in straight lines, Bishops in diagonals). However, the way they deal damage depends on their **Fighting Class**.

*(Note: Fighting Classes are modular and bound to the specific card variant, not the title. A Knight is not always a Ranger!)*

### 1. ⚔️ Champion (Formerly: Brawler)
* **The Rule:** During an attack, boost the attack equal to the Amp.
* **UI/Engine Note:** When calculating the hover preview, the Engine must add the Amp to the base Influence. The UI should display the number with a small `+` icon so the player knows a buff is actively applying to the attack.

### 2. 🛡️ Guardian
* **The Rule:** When attacked, the attacker’s Influence must be higher than this card’s Influence + Amp.
* **UI/Engine Note:** When an enemy hovers over your Guardian to attack it, the Guardian's Influence should visually increase on the board to show its armored state, preventing the attacker from doing bad math.

### 3. 👼 Herald
* **The Rule:** Use 1 Action to target a friendly card in PoV. That card gains an attack boost equal to the Amp if it attacks this turn.
* **UI/Engine Note:** The buffed friendly card needs a glowing aura or 👼 icon for the rest of the turn. When hovered, its Influence must show the boosted total.

### 4. 🪓 Ravager
* **The Rule:** On a successful kill, Exhaust adjacent enemies with Influence <= Amp.
* **UI/Engine Note:** During the mouse-over preview, the engine must check the primary target. If it's a guaranteed kill, the UI should immediately flash the adjacent doomed units in red so the player sees the AoE *before* clicking.

### 5. 🔱 Lancer
* **The Rule:** On a kill, chain the attack to the next enemy in the line of sight (stops if enemy Influence is too high, or at Amp limit).
* **UI/Engine Note:** The targeting raycaster must highlight the entire line of affected units. The preview must evaluate the math for the *first* unit, and if successful, evaluate the *second*, showing exactly where the spear will stop.

### 6. 🏹 Hunter
* **The Rule:** Can attack an enemy even if the PoV is blocked by up to [Amp] number of cards.
* **UI/Engine Note:** When the player clicks a Hunter, the UI should draw an arched, dotted line *over* the blocking units to show that the projectile is flying over their heads.

### 7. 🪦 Revenant
* **The Rule:** Auto-Resurges at the start of the turn for 0 Actions if this card exhausted by an attack. During that turn, its Influence equals its Amp.
* **UI/Engine Note:** Because the Amp could be *higher* or *lower* than the original Influence, the UI must make it obvious that the card is in an unnatural state.
* **Visual Suggestion:** Change the Influence number's color to a ghostly teal or purple.
* **Text Suggestion:** Display the number with an asterisk (e.g., `2*`) and apply a visual "decay" or "ethereal" filter over the card portrait for that turn.

### 8. ⚕️ Mystic
* **The Rule:** Use 1 Action to Resurge all friendly cards in PoV with Influence <= Amp.
* **UI/Engine Note:** When previewing this ability, all valid Exhausted friendly units in the PoV should glow white/gold, indicating they will wake up if the player confirms the action.

### 9. 📃 Sealer
* **The Rule:** If defeated, the attacker cannot be Resurged for a number of turns equal to the Amp.
* **UI/Engine Note:** When the attacker is Exhausted after killing the Binder, the UI must overlay 🔗 chains on the attacker's card and display a tiny countdown integer showing how many turns remain before it can be used again.

## 6. Card Modularity & Example Base Stats

Skirmish uses a **Modular Stat System**. A unit's Title (Pawn, Knight, Queen) dictates its *Movement / Line of Sight geometry*. However, its **Cost**, **Influence**, **Fighting Class**, and **Amplifier** are fluid and used as balancing levers depending on the specific deck or theme.

Below is an example of the *current* base setup, but these numbers and classes will vary:

| Title (Dictates Movement) | Base Cost | Base Influence | Example Class | Example Amplifier |
| --- | --- | --- | --- | --- |
| **Pawn** *(Forward Diagonals)* | 1 | 1 | Brawler | 1 |
| **Knight** *(L-Shapes)* | 2 | 3 | Ranger | 2 |
| **Bishop** *(Diagonals)* | 2 | 3 | Piercer | 2 |
| **Rook** *(Orthogonals)* | 3 | 4 | Piercer | 2 |
| **Queen** *(All 8 Directions)* | 4 | 8 | Brawler | 3 |
| **King** *(All 8 Directions)* | 5 | 10 | Brawler | 1 |

---

### Notes for the UI/UX Designer:

* **The "Modular" Constraint:** Because stats and classes are fluid, the UI *must* explicitly communicate a card's Class, Amplifier, Cost, and Influence dynamically. Players cannot rely on memory (e.g., they cannot assume a Queen is always a Brawler).
* **Visual Priority:** The distinction between **Ready** (High Threat / Points active) and **Exhausted** (Zero Threat / Zero Points) is the most important visual read on the board.
* **HUD Elements:** The UI must feature a dynamic scoreboard tracking P1 and P2's active Influence, an Action Point tracker (0/2), and clear "blast zone" highlights when hovering to attack so players don't have to guess the math.