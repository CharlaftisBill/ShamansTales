import { Engine, RulesEngine, GameState, PLAYER, Card, TITLE, FIGHTING_CLASS, STATE, BOARD_SIZE, ACTIONS_PER_TURN, MAX_EXHAUSTION_TIERS } from '../src/engine.js';

const { expect } = chai;

function setupBoard() {
    GameState.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    GameState.decks = { [PLAYER.P1]: [], [PLAYER.P2]: [] };
    GameState.hands = { [PLAYER.P1]: [], [PLAYER.P2]: [] };
    GameState.actionsRemaining = ACTIONS_PER_TURN;
    GameState.turn = PLAYER.P1;
    GameState.isGameOver = false;
    GameState.checkmatePhaseActive = false;
    GameState.isMulliganPhase = false;
    GameState.playersReady = [PLAYER.P1, PLAYER.P2];
    GameState.matchHistory = [];
}

describe("Shaman's Tales - Exhaustive Core Engine Tests", () => {

    beforeEach(() => {
        setupBoard();
    });

    describe("1. Mulligan Logic", () => {
        it("should keep hand and draw 1 extra card if 0 replacements selected", () => {
            GameState.isMulliganPhase = true;
            GameState.playersReady = [];
            GameState.hands[PLAYER.P1] = [new Card('A', TITLE.PAWN, 1, 1, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1)];
            GameState.decks[PLAYER.P1] = [new Card('B', TITLE.PAWN, 1, 1, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1)];
            
            const success = Engine.handleMulligan(PLAYER.P1, []);
            expect(success).to.be.true;
            expect(GameState.hands[PLAYER.P1].length).to.equal(2);
            expect(GameState.decks[PLAYER.P1].length).to.equal(0);
            expect(GameState.playersReady).to.include(PLAYER.P1);
        });

        it("should replace exactly the selected cards and end mulligan phase if both players ready", () => {
            GameState.isMulliganPhase = true;
            GameState.playersReady = [PLAYER.P2]; 
            
            const cardKeep = new Card('Keep', TITLE.PAWN, 1, 1, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1);
            const cardReplace1 = new Card('Replace1', TITLE.PAWN, 1, 1, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1);
            const cardReplace2 = new Card('Replace2', TITLE.PAWN, 1, 1, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1);
            const deckCard1 = new Card('Deck1', TITLE.PAWN, 1, 1, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1);
            const deckCard2 = new Card('Deck2', TITLE.PAWN, 1, 1, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1);
            
            GameState.hands[PLAYER.P1] = [cardKeep, cardReplace1, cardReplace2];
            GameState.decks[PLAYER.P1] = [deckCard1, deckCard2];
            
            Engine.dispatch({ type: 'SUBMIT_MULLIGAN', payload: { player: PLAYER.P1, replacedIndices: [1, 2] }});
            
            expect(GameState.hands[PLAYER.P1].length).to.equal(3);
            expect(GameState.decks[PLAYER.P1].length).to.equal(2);
            expect(GameState.isMulliganPhase).to.be.false;
        });

        it("should reject mulligan actions if mulligan phase is already over", () => {
            GameState.isMulliganPhase = false;
            const success = Engine.handleMulligan(PLAYER.P1, []);
            expect(success).to.be.false;
        });
    });

    describe("2. Action Point Deductions", () => {
        it("should deduct AP properly for Summon, Recall, Resurge and fail if out of AP", () => {
            const p1Card = new Card('C', TITLE.PAWN, 5, 0, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1);
            GameState.hands[PLAYER.P1] = [p1Card];
            GameState.actionsRemaining = 3;
            
            // Summon (AP 3 -> 2)
            Engine.dispatch({ type: 'SUMMON', payload: { player: PLAYER.P1, cardIndex: 0, x: 0, y: 4, paymentCoords: [] }});
            expect(GameState.actionsRemaining).to.equal(2);
            
            // Exhaust it manually so we can Resurge it
            GameState.board[4][0].state = 1;
            
            // Resurge (AP 2 -> 1)
            Engine.dispatch({ type: 'RESURGE', payload: { player: PLAYER.P1, x: 0, y: 4 }});
            expect(GameState.actionsRemaining).to.equal(1);
            expect(GameState.board[4][0].state).to.equal(0);
            
            // Recall (AP 1 -> 0)
            Engine.dispatch({ type: 'RECALL', payload: { player: PLAYER.P1, x: 0, y: 4 }});
            expect(GameState.actionsRemaining).to.equal(0);
            
            // Try Summon with 0 AP (Should fail)
            const success = Engine.handleSummon(PLAYER.P1, 0, 0, 4, []);
            expect(success).to.be.false;
        });

        it("should enforce MAX_ATTACKS_PER_TURN per card", () => {
            let attacker = new Card('Atk', TITLE.ROOK, 5, 0, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1);
            let target1 = new Card('T1', TITLE.PAWN, 1, 0, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2);
            let target2 = new Card('T2', TITLE.PAWN, 1, 0, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2);
            GameState.board[4][0] = attacker;
            GameState.board[3][0] = target1;
            GameState.board[3][1] = target2;
            
            // Attack 1
            const atk1 = Engine.handleAttack(PLAYER.P1, 0, 4, 0, 3, false);
            expect(atk1).to.be.true;
            expect(target1.state).to.equal(1);
            
            // Even if AP > 0, same card cannot attack twice in a turn by default
            const atk2 = Engine.handleAttack(PLAYER.P1, 0, 4, 1, 3, false);
            expect(atk2).to.be.false;
        });

        it("should prevent recalling a card if hand is already full (>= 6)", () => {
            const cardOnBoard = new Card('Board', TITLE.PAWN, 5, 0, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1);
            GameState.board[4][0] = cardOnBoard;
            GameState.hands[PLAYER.P1] = [1, 2, 3, 4, 5, 6]; // Mock full hand
            
            const success = Engine.handleRecall(PLAYER.P1, 0, 4);
            expect(success).to.be.false;
        });

        it("should prevent resurging a card if it is sealed", () => {
            const cardOnBoard = new Card('Board', TITLE.PAWN, 5, 0, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1);
            cardOnBoard.state = 1;
            cardOnBoard.status.sealedTurns = 2; // Sealed!
            GameState.board[4][0] = cardOnBoard;
            
            const success = Engine.handleResurge(PLAYER.P1, 0, 4);
            expect(success).to.be.false;
        });

        it("should reject Summon if payment coordinates are invalid", () => {
            const p1Card = new Card('Cost2', TITLE.PAWN, 5, 2, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1);
            GameState.hands[PLAYER.P1] = [p1Card];
            GameState.actionsRemaining = 3;

            // Add an exhausted friendly piece and a ready enemy piece
            const exhaustedFriendly = new Card('EF', TITLE.PAWN, 1, 0, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1);
            exhaustedFriendly.state = 1; // exhausted
            GameState.board[4][1] = exhaustedFriendly;

            const readyEnemy = new Card('RE', TITLE.PAWN, 1, 0, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P2);
            GameState.board[4][2] = readyEnemy;

            // Try to summon using exhausted friendly
            const success1 = Engine.handleSummon(PLAYER.P1, 0, 0, 4, [{x: 1, y: 4}]);
            expect(success1).to.be.false;

            // Try to summon using ready enemy
            const success2 = Engine.handleSummon(PLAYER.P1, 0, 0, 4, [{x: 2, y: 4}]);
            expect(success2).to.be.false;
        });
    });

    describe("3. Checkmate Conditions", () => {
        it("should trigger checkmate phase when deck is empty at start of turn", () => {
            GameState.turn = PLAYER.P2; 
            GameState.decks[PLAYER.P1] = []; 
            
            Engine.passTurn(); // Turn passes to P1
            
            expect(GameState.turn).to.equal(PLAYER.P1);
            expect(GameState.checkmatePhaseActive).to.be.true;
            expect(GameState.turnsUntilEnd).to.equal(1);
            expect(GameState.isGameOver).to.be.false;
            
            Engine.passTurn(); // Turn passes to P2, ending P1's final turn
            expect(GameState.isGameOver).to.be.true;
        });
        
        it("should avert checkmate if deck is replenished before game over", () => {
            GameState.turn = PLAYER.P2;
            GameState.decks[PLAYER.P1] = [];
            Engine.passTurn(); 
            expect(GameState.checkmatePhaseActive).to.be.true;
            
            // Replenish deck with enough cards to survive the 6-card draw step
            for (let i = 0; i < 7; i++) {
                GameState.decks[PLAYER.P1].push(new Card('A', TITLE.ROOK, 1, 1, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1));
                GameState.decks[PLAYER.P2].push(new Card('A', TITLE.ROOK, 1, 1, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P2));
            }
            
            Engine.passTurn(); 
            expect(GameState.checkmatePhaseActive).to.be.false;
            expect(GameState.isGameOver).to.be.false;
        });
    });

    describe("4. Exhaustive Fighting Class Abilities", () => {
        
        describe("CHAMPION", () => {
            it("adds amplifier to base influence ONLY when attacking", () => {
                let attacker = new Card('Champ', TITLE.ROOK, 4, 1, FIGHTING_CLASS.CHAMPION, 3, PLAYER.P1); // Total Atk: 7
                let target = new Card('Target', TITLE.PAWN, 6, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2); // Total Def: 6
                GameState.board[4][0] = attacker;
                GameState.board[3][0] = target;
                
                Engine.handleAttack(PLAYER.P1, 0, 4, 0, 3, false);
                expect(target.state).to.equal(1); 
                expect(attacker.state).to.equal(1);
            });
            
            it("does NOT add amplifier to influence when defending", () => {
                let attacker = new Card('Atk', TITLE.ROOK, 5, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2); // Total Atk: 5
                let targetChamp = new Card('TargetChamp', TITLE.PAWN, 4, 1, FIGHTING_CLASS.CHAMPION, 5, PLAYER.P1); // Base Def: 4
                GameState.turn = PLAYER.P2;
                GameState.board[3][0] = attacker;
                GameState.board[4][0] = targetChamp;
                
                Engine.handleAttack(PLAYER.P2, 0, 3, 0, 4, false);
                // Atk 5 > Def 4. If amp was added, Def would be 9 and block. Since it's not, it hits.
                expect(targetChamp.state).to.equal(1);
            });
        });

        describe("GUARDIAN", () => {
            it("adds amplifier to influence when defending", () => {
                let attacker = new Card('Atk', TITLE.ROOK, 6, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P1); // Total Atk: 6
                let target = new Card('Guard', TITLE.PAWN, 4, 1, FIGHTING_CLASS.GUARDIAN, 3, PLAYER.P2); // Total Def: 7
                GameState.board[4][0] = attacker;
                GameState.board[3][0] = target;
                
                Engine.handleAttack(PLAYER.P1, 0, 4, 0, 3, false);
                expect(target.state).to.equal(0); // Blocked
                expect(attacker.state).to.equal(1); // Exhausted due to block
            });
        });

        describe("BERSERK", () => {
            it("attacks multiple times without exhausting until charges deplete", () => {
                let berserk = new Card('Berserk', TITLE.ROOK, 6, 1, FIGHTING_CLASS.BERSERK, 1, PLAYER.P1); // amp=1 (1 charge)
                let enemy1 = new Card('E1', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2);
                let enemy2 = new Card('E2', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2);
                GameState.board[4][0] = berserk;
                GameState.board[3][0] = enemy1;
                GameState.board[2][0] = enemy2;
                
                // First attack (uses charge, does not exhaust)
                let success = Engine.handleAttack(PLAYER.P1, 0, 4, 0, 3, false);
                expect(success).to.be.true;
                expect(enemy1.state).to.equal(1);
                expect(berserk.state).to.equal(0);
                expect(berserk.status.berserkCharges).to.equal(0);

                // Second attack (no charges left, exhausts)
                success = Engine.handleAttack(PLAYER.P1, 0, 4, 0, 2, false);
                expect(success).to.be.true;
                expect(enemy2.state).to.equal(1);
                expect(berserk.state).to.equal(1); // Exhausted now!
            });
        });

        describe("HERALD", () => {
            it("boosts an ally's attack and loses boost on next turn", () => {
                let herald = new Card('Herald', TITLE.ROOK, 2, 1, FIGHTING_CLASS.HERALD, 4, PLAYER.P1);
                let ally = new Card('Ally', TITLE.ROOK, 3, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P1);
                GameState.board[4][0] = herald;
                GameState.board[3][0] = ally;
                
                // Ability use
                Engine.handleAttack(PLAYER.P1, 0, 4, 0, 3, true);
                expect(ally.status.heraldBoost).to.equal(4);
                expect(herald.state).to.equal(1);
                
                // Attack with boost
                let enemy = new Card('Enemy', TITLE.PAWN, 6, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2);
                GameState.board[2][0] = enemy;
                Engine.handleAttack(PLAYER.P1, 0, 3, 0, 2, false);
                expect(enemy.state).to.equal(1); // Atk 7 > Def 6
                
                // Next turn clears boost
                Engine.passTurn(); // P2
                Engine.passTurn(); // P1
                expect(ally.status.heraldBoost).to.equal(0);
            });
        });

        describe("RAVAGER", () => {
            it("splashes adjacent enemies ONLY if their defense is <= amp", () => {
                let ravager = new Card('Ravager', TITLE.ROOK, 8, 1, FIGHTING_CLASS.RAVAGER, 3, PLAYER.P1);
                let primaryTarget = new Card('T1', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2);
                let splashable = new Card('T2', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2); 
                let tooTanky = new Card('T3', TITLE.PAWN, 5, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2); 
                let friendly = new Card('T4', TITLE.PAWN, 1, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P1); 
                
                GameState.board[4][2] = ravager;
                GameState.board[2][2] = primaryTarget; 
                GameState.board[2][3] = splashable; // Adjacent
                GameState.board[2][1] = tooTanky; // Adjacent
                GameState.board[1][2] = friendly; // Adjacent, should ignore
                
                Engine.handleAttack(PLAYER.P1, 2, 4, 2, 2, false);
                
                expect(primaryTarget.state).to.equal(1);
                expect(splashable.state).to.equal(1); 
                expect(tooTanky.state).to.equal(0); 
                expect(friendly.state).to.equal(0); 
            });

            it("does NOT splash if the primary attack is blocked", () => {
                let ravager = new Card('Ravager', TITLE.ROOK, 3, 1, FIGHTING_CLASS.RAVAGER, 5, PLAYER.P1);
                let primaryTank = new Card('T1', TITLE.PAWN, 8, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2); // Tanky!
                let splashable = new Card('T2', TITLE.PAWN, 1, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2); 
                
                GameState.board[4][2] = ravager;
                GameState.board[2][2] = primaryTank; 
                GameState.board[2][3] = splashable; 
                
                Engine.handleAttack(PLAYER.P1, 2, 4, 2, 2, false);
                
                expect(primaryTank.state).to.equal(0); // Blocked
                expect(ravager.state).to.equal(1); // Rebound
                expect(splashable.state).to.equal(0); // No splash since primary was blocked
            });
        });

        describe("LANCER", () => {
            it("pierces multiple enemies strictly up to amplifier limit", () => {
                let lancer = new Card('Lancer', TITLE.ROOK, 8, 1, FIGHTING_CLASS.LANCER, 2, PLAYER.P1);
                let e1 = new Card('E1', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2);
                let e2 = new Card('E2', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2);
                let e3 = new Card('E3', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2); // Beyond amp limit
                
                GameState.board[4][0] = lancer;
                GameState.board[3][0] = e1;
                GameState.board[2][0] = e2;
                GameState.board[1][0] = e3;
                
                Engine.handleAttack(PLAYER.P1, 0, 4, 0, 3, false);
                
                expect(e1.state).to.equal(1);
                expect(e2.state).to.equal(1); 
                expect(e3.state).to.equal(0); // Piercing stops after 2
            });

            it("stops piercing immediately if an enemy blocks", () => {
                let lancer = new Card('Lancer', TITLE.ROOK, 5, 1, FIGHTING_CLASS.LANCER, 3, PLAYER.P1);
                let e1 = new Card('E1', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2);
                let e2 = new Card('E2', TITLE.PAWN, 9, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2); // Blocker
                let e3 = new Card('E3', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2); 
                
                GameState.board[4][0] = lancer;
                GameState.board[3][0] = e1;
                GameState.board[2][0] = e2;
                GameState.board[1][0] = e3;
                
                Engine.handleAttack(PLAYER.P1, 0, 4, 0, 3, false);
                
                expect(e1.state).to.equal(1); // E1 hit
                expect(e2.state).to.equal(0); // E2 blocked
                expect(e3.state).to.equal(0); // E3 completely safe
            });
        });

        describe("HUNTER", () => {
            it("arcs over blocking cards (friendly or enemy) up to amplifier limit", () => {
                let hunter = new Card('Hunter', TITLE.ROOK, 5, 1, FIGHTING_CLASS.HUNTER, 2, PLAYER.P1); // amp=2
                let f1 = new Card('F1', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P1); // Blocker 1
                let e1 = new Card('E1', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2); // Blocker 2
                let e2 = new Card('E2', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2); // Target!
                let e3 = new Card('E3', TITLE.PAWN, 2, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2); // Too many blockers for e3
                
                GameState.board[4][0] = hunter;
                GameState.board[3][0] = f1;
                GameState.board[2][0] = e1;
                GameState.board[1][0] = e2;
                GameState.board[0][0] = e3;
                
                let opts = RulesEngine.getAttackOptions(0, 4, hunter, 'ATTACK');
                expect(opts.find(o => o.primary.y === 1)).to.not.be.undefined; // E2 targetable
                expect(opts.find(o => o.primary.y === 0)).to.be.undefined; // E3 not targetable
                
                // Target E2 specifically
                Engine.handleAttack(PLAYER.P1, 0, 4, 0, 1, false);
                
                expect(e2.state).to.equal(1); 
                expect(e1.state).to.equal(0); 
                expect(f1.state).to.equal(0); 
            });
        });

        describe("REVENANT", () => {
            it("auto-resurges at the start of the owner's turn", () => {
                let rev = new Card('Rev', TITLE.PAWN, 5, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P1);
                rev.state = 1; // Exhausted
                GameState.board[4][0] = rev;
                
                Engine.passTurn(); // to P2
                expect(rev.state).to.equal(1); 
                
                Engine.passTurn(); // back to P1
                expect(rev.state).to.equal(0);
                expect(rev.status.revenantActive).to.be.true;
            });

            it("does NOT auto-resurge if it is sealed", () => {
                let rev = new Card('Rev', TITLE.PAWN, 5, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P1);
                rev.state = 1;
                rev.status.sealedTurns = 2;
                GameState.board[4][0] = rev;
                
                Engine.passTurn(); // to P2
                Engine.passTurn(); // to P1
                
                // Still exhausted because it was sealed (seal drops to 1)
                expect(rev.state).to.equal(1);
                expect(rev.status.sealedTurns).to.equal(1);
            });
        });

        describe("MYSTIC", () => {
            it("boosts amplifier of any friendly ally", () => {
                let mystic = new Card('Mystic', TITLE.ROOK, 2, 1, FIGHTING_CLASS.MYSTIC, 5, PLAYER.P1); // amp=5
                let ally = new Card('Ally', TITLE.PAWN, 4, 1, FIGHTING_CLASS.REVENANT, 2, PLAYER.P1); // amp=2
                
                GameState.board[4][0] = mystic;
                GameState.board[3][0] = ally;
                
                // Buff Ally
                Engine.handleAttack(PLAYER.P1, 0, 4, 0, 3, true);
                expect(ally.status.mysticBoost).to.equal(5);
                expect(mystic.state).to.equal(1);
                
                expect(RulesEngine.getEffectiveAmplifier(ally)).to.equal(7);
            });

            it("expires mystic boost at the end of the next opponent turn", () => {
                let ally = new Card('Ally', TITLE.PAWN, 4, 1, FIGHTING_CLASS.REVENANT, 2, PLAYER.P1);
                ally.status.mysticBoost = 5;
                
                GameState.board[3][0] = ally;
                
                // End P1's turn
                Engine.passTurn();
                expect(ally.status.mysticBoost).to.equal(5); // Still there!

                // P2's turn starts, then ends
                Engine.passTurn();
                expect(ally.status.mysticBoost).to.equal(0); // Cleared because GameState.turn was P2 and ally is P1
            });
        });

        describe("SEALER", () => {
            it("seals attacker for amp turns when hit", () => {
                let attacker = new Card('Atk', TITLE.ROOK, 6, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P1);
                let sealer = new Card('Sealer', TITLE.PAWN, 2, 1, FIGHTING_CLASS.SEALER, 3, PLAYER.P2); // Seals for 3
                
                GameState.board[4][0] = attacker;
                GameState.board[3][0] = sealer;
                
                Engine.handleAttack(PLAYER.P1, 0, 4, 0, 3, false);
                
                expect(sealer.state).to.equal(1);
                expect(attacker.status.sealedTurns).to.equal(3);
                
                Engine.passTurn(); // P1 -> P2
                expect(attacker.status.sealedTurns).to.equal(3); // Decrements on owner's start
                
                Engine.passTurn(); // P2 -> P1
                expect(attacker.status.sealedTurns).to.equal(2); // Decremented
            });
        });
    });

    describe("5. Maximum Exhaustion & Card Destruction", () => {
        it("destroys a card and returns it to deck if exhaustion exceeds MAX_EXHAUSTION_TIERS, resetting its status", () => {
            let attacker = new Card('Atk', TITLE.ROOK, 6, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P1);
            let target = new Card('Target', TITLE.PAWN, 1, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P2);
            target.state = MAX_EXHAUSTION_TIERS; // Already max
            target.status.sealedTurns = 3;
            target.status.mysticBoost = 5;
            
            GameState.board[4][0] = attacker;
            GameState.board[3][0] = target;
            
            Engine.handleAttack(PLAYER.P1, 0, 4, 0, 3, false);
            
            expect(GameState.board[3][0]).to.be.null; // Removed from board
            expect(GameState.decks[PLAYER.P2][0]).to.equal(target); // Sent to top of deck
            expect(target.state).to.equal(0); // Reset state
            expect(target.status.sealedTurns).to.equal(0); // Reset status
            expect(target.status.mysticBoost).to.equal(0); // Reset mystic boost
        });

        it("resets a card's status when recalled to hand", () => {
            let card = new Card('Target', TITLE.PAWN, 1, 1, FIGHTING_CLASS.REVENANT, 0, PLAYER.P1);
            card.state = STATE.READY;
            card.status.mysticBoost = 10;
            GameState.board[4][0] = card;
            GameState.turn = PLAYER.P1;
            GameState.actionsRemaining = 1;
            GameState.hands[PLAYER.P1] = [];
            
            Engine.handleRecall(PLAYER.P1, 0, 4);
            
            expect(GameState.board[4][0]).to.be.null;
            expect(GameState.hands[PLAYER.P1][0]).to.equal(card);
            expect(card.status.mysticBoost).to.equal(0);
        });
    });

    describe("6. State Snapshot Integrity", () => {
        it("should capture board state using real Card instances via Card.clone()", () => {
            const card = new Card('SnapshotTarget', TITLE.PAWN, 5, 1, FIGHTING_CLASS.CHAMPION, 0, PLAYER.P1);
            GameState.board[0][0] = card;
            
            const snapshot = GameState.captureStateSnapshot();
            const snapCard = snapshot.board[0][0];
            
            expect(snapCard).to.not.be.null;
            expect(snapCard).to.be.instanceOf(Card);
            expect(snapCard.title).to.equal(TITLE.PAWN);
            expect(snapCard).to.not.equal(card); // It should be a clone, not the same reference
        });
    });

    describe("7. UI Integration Tests", () => {
        it.skip("should set UIState.activeAttacker.mode to 'ABILITY' or 'ATTACK' based on action menu selection", () => {
            // Pending test due to lack of full DOM environment in current setup.
            // When implemented, this should mock the DOM action menu, simulate a click on
            // the 'Ability' or 'Attack' buttons, and assert that UIState.activeAttacker.mode
            // is updated accordingly.
        });
    });

});
