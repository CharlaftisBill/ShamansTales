# ⚔️ Skirmish: Game Design Document & Core Rules

## 1. Overview & Objective

**Skirmish** is a fast-paced, 1v1 tactical card battler played on a claustrophobic grid. Players use action points to deploy armies, manage their economy, and brutally fight for board control.

* **The Board:** A 5x5 Grid (25 squares).
* **The Deck:** 16 Cards per player.
* **The Goal:** Have the highest total **Influence** at the end of the game. Only pieces in the **Ready** state contribute to your final score. Exhausted pieces count as zero.

## 2. End-Game Triggers (The Checkmate Phase)

The game does not have a set turn limit or health pool. Instead, the sudden-death **Checkmate Phase** triggers when:

1. A player attempts to draw a card but their **deck is empty**.

When triggered, the active player finishes their turn, the opponent gets **one final turn**, and then the game immediately ends and scores are tallied.

*(Note: The board filling up does not trigger game over; cards will be destroyed and returned to the deck throughout the match).*

## 3. The Game Loop & Economy

Players start the game by drawing 6 cards, followed by a **Flexible Mulligan** (replace up to 6 cards; if 0 are replaced, draw 1 extra card as a reward).

On a player's turn, the following sequence occurs:

1. **The Refill Phase:** The player automatically draws cards from their deck until they have exactly **6 cards** in their hand. (If they already have 6 or more, they draw nothing).
2. **The Action Phase:** The player has **3 Actions** to spend in any combination.
3. **End Turn:** Play passes to the opponent.

## 4. The Player Actions

Players can spend their 3 Actions per turn to perform any of the following moves:

* **SUMMON (Cost: 1 Action)**
  * **Supported Placement:** You may place any card adjacent to a friendly piece. To pay for the Cost, you may mix and match two methods: **Exhaust** your own Ready pieces, AND/OR **Ready** the opponent's Exhausted pieces (e.g., to pay a Cost of 6, you could Exhaust 2 of your pieces and Ready 4 of the opponent's pieces). Supported cards enter the board **Ready**.
  * **Unsupported Placement (Pawns Only):** Pawns can be placed freely (Cost: 0) on the two rows closest to the player without needing friendly adjacency. They enter the board **Exhausted**.

* **ATTACK (Cost: 1 Action)**
  * **Action Cost:** Attacking consumes 1 Action Point, and a card may only attack once per turn.
  * **The Mechanic:** Select a Ready piece and choose an enemy in its blast zone.
  * **Successful Attack:** If the attacker's Influence is **greater than or equal to** the target's Influence, the target is **Exhausted** (loses a life pip). The attacker is also **Exhausted** by the effort of the strike!
  * **Blocked Attack:** If the target's Influence is **strictly greater than** the attacker's, the attack is **Blocked!** The target takes no damage, but the attacker is penalized and becomes **Exhausted**.
  * **Destruction:** If a card is exhausted beyond its maximum lives (`MAX_EXHAUSTION_TIERS`), it is removed from the board and sent to the bottom of its owner's deck.

* **RESURGE (Cost: 1 Action)**
  * Target a friendly Exhausted piece and flip it back to **Ready** (healing 1 life pip). It can now attack, be used to pay for Summons, and counts towards your Influence score.

* **RECALL (Cost: 1 Action)**
  * Return a friendly card from the board back into your hand, freeing up board space and rescuing the unit from destruction.

* **USE ABILITY (Cost: 1 Action)**
  * Specific to Support classes (Mystics, Heralds). Targets friendly units instead of enemies to apply buffs or heals. Consumes 1 Action Point. Limited to once per turn.

## 5. Combat & The Fighting Classes

A piece targets enemies that fall along its standard chess-inspired lines of sight. However, the way they deal damage depends on their **Fighting Class**.

### 1. ⚔️ Champion
* **The Rule:** During an attack, boost the attack equal to the Amp.

### 2. 🛡️ Guardian
* **The Rule:** When attacked, the attacker’s Influence must be higher than this card’s Influence + Amp to succeed.

### 3. 👼 Herald
* **The Rule:** Passive combatant. Cannot attack. Instead, it uses its turn to target a friendly card in PoV. That card gains a temporary attack boost (lasts until the start of your next turn) equal to the Herald's Amp.

### 4. 🪓 Ravager
* **The Rule:** On a successful attack against a primary target, automatically Exhaust adjacent enemy units with Influence <= Amp (friendly units are safely ignored).

### 5. 🔱 Lancer
* **The Rule:** The attack pierces through the primary target, continuing in a straight line to exhaust subsequent enemies until it hits an enemy it cannot defeat, or reaches its Amp limit.

### 6. 🏹 Hunter
* **The Rule:** Can attack an enemy even if the PoV is blocked by up to [Amp] number of cards. Projectiles fly over blocking units.

### 7. 🪦 Revenant
* **The Rule:** Auto-Resurges at the start of the turn for 0 Actions if this card was exhausted by an attack. During that turn, its Influence equals its Amp.

### 8. ⚕️ Mystic
* **The Rule:** Dual-threat. Can choose to Attack enemies, OR Use Ability to target a friendly Exhausted unit in PoV (with Influence <= Amp) and instantly Resurge them to Ready state. Also cleanses Seals.

### 9. 📃 Sealer
* **The Rule:** If an enemy successfully attacks the Sealer, the attacking unit becomes "Sealed" for a number of turns equal to the Amp, preventing it from Resurging.

### 10. 🩸 Berserker
* **The Rule:** On a successful attack, this unit ignores the global exhaustion penalty and remains **Ready**. This exhaustion-immunity can be utilized a total number of times equal to its Amp (the Amp is depleted by 1 after each use). *(Note: The unit is still bound by the rule of 1 attack per turn).*

## 6. Card Modularity & Example Base Stats

Skirmish uses a **Modular Stat System**. A unit's Title (Pawn, Knight, Queen) dictates its *Line of Sight geometry*. However, its **Cost**, **Influence**, **Fighting Class**, and **Amplifier** are fluid and used as balancing levers depending on the specific deck or theme.

### UI Guidelines for Modularity:
* **Lives Indicator:** Cards show their remaining hits via glowing red pips.
* **Class & Amplifiers:** Emblems clearly show the class and current amplifier.
* **Action Menu:** Context-sensitive popups ensure players know exactly what actions a card can take (Attack, Use Ability, Recall) without memorization.