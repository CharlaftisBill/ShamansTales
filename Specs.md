# Game Design Document: "Chess-Tactics Card Skirmish" (Working Title)

## 1. Core Concept
A highly tactical, grid-based card game played on a 5x5 board. It combines the spatial movement logic of Chess with the resource management and deck-building mechanics of modern card games. Players fight for territorial control and resource efficiency, culminating in a sudden-death endgame.

## 2. Setup & The Mulligan Phase
*   **The Grid:** 5x5 squares.
*   **The Deck:** 16 cards per player, distributed by Title (8 Pawns, 2 Knights, 2 Bishops, 2 Rooks, 1 Queen, 1 King). 
*   **The Draw:** Players draw a starting hand of 6 cards.
*   **The Mulligan Rule:** Before Turn 1, a player may select up to 2 cards in their hand to shuffle back into the deck and redraw. 
    *   *Strategic Reward:* If a player chooses to keep their original 6-card hand (Mulligans 0 cards), they are immediately rewarded with 1 extra card draw, starting Turn 1 with 7 cards.

## 3. The Economy & Turn Structure
The game relies on a strict Action-Economy. There is no "Auto-Ready" phase at the start of a turn.
*   **Start of Turn:** Draw 1 card from the deck.
*   **The Action Phase:** The player has exactly **1 Action** per turn. They may choose *one* of the following:
    1.  **Summon:** Play a card from hand to the board.
    2.  **Attack:** Command a Ready card to exhaust enemy cards.
    3.  **Resurge:** Target a friendly Exhausted card and switch its state to Ready.
*   **End of Turn:** The turn passes to the opponent. 

## 4. Card Anatomy & States
Every card exists in one of two states:
*   **Ready:** Card is active, its Influence counts toward the player's score, and it can be used to attack or pay costs.
*   **Exhausted:** Card is inactive (greyed out/tilted). Its Influence does *not* count toward the score, and it cannot act until Resurged.

**Card Stats:**
*   **Cost (0-5):** The number of *other* friendly Ready cards on the board that must be Exhausted to summon this card.
*   **Influence (1-10):** The card's "Health/Attack Power" and its value toward the final score.
*   **Title (Pawn to King):** Dictates the directional "Line of Sight" based on classic chess movement. 
*   **Fighting Class:** Dictates *how* the card applies damage along its Line of Sight (See Combat).
*   **Amplifier:** A numeric value limiting the range or maximum number of targets a Fighting Class can hit.

## 5. Summoning Rules
To play a card from hand, the player must pay its Cost by Exhausting the required number of friendly Ready cards.
*   **General Rule (Supported Deployment):** A card must be summoned adjacent (orthogonal or diagonal) to a friendly card. If played this way, it enters the board **Ready**.
*   **The Pawn Rule (Forward Deployment):** Pawns may be summoned *anywhere* in the player's first two lanes (bottom two rows), even if not adjacent to a friendly card. However, if a Pawn is deployed without friendly adjacency, it enters the board **Exhausted**.

## 6. Combat & Fighting Classes
An attack resolves successfully if the Attacker's Influence is *greater than or equal to* the Target's Influence. 
*   **Cost of Attacking:** The Attacking card is always Exhausted after the attack, regardless of success.
*   **Success:** The target(s) become Exhausted. (Cards are never destroyed/removed from the board).

**The 3 Fighting Classes:**
1.  **Ranger 🏹 (Sniper):** Skips over empty squares along the Line of Sight up to its Amplifier distance. Hits 1 target. (Line of Sight is blocked by friendly or exhausted cards).
2.  **Piercer 🔱 (Spear):** Must target an enemy on the *immediately adjacent* square along its Line of Sight. If successful, the attack penetrates in a straight line, hitting subsequent enemies up to its Amplifier limit.
3.  **Brawler ⚔️ (Cleave):** Targets an adjacent enemy. The attack automatically "cleaves" and hits *other* adjacent enemies within the Attacker's reach, up to its Amplifier limit. 

## 7. Endgame: The Checkmate Phase
The game is a war of attrition. There is no health total; the game ends when resources run dry.
*   **The Trigger:** If a player must draw a card at the start of their turn but their deck is empty, the game enters the **Checkmate Phase**.
*   **The Final Turn:** The player who triggered Checkmate is given exactly one final Action (their "Final Turn") to optimize their board.
*   **Win Condition:** After that final turn, the game freezes. The player with the highest total combined **Influence** from all **Ready** cards on their side of the board is the winner.