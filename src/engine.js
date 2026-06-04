// --- Configurations ---
export const DECK_SIZE = 16;
export const BOARD_SIZE = 5;
export const ACTIONS_PER_TURN = 3;
export const MAX_ATTACKS_PER_TURN = 1;
export const MAX_EXHAUSTION_TIERS = 1;

// --- ENUMS & CONSTANTS ---
export const TITLE = { PAWN: 'Pawn', KNIGHT: 'Knight', BISHOP: 'Bishop', ROOK: 'Rook', QUEEN: 'Queen', KING: 'King' };
export const FIGHTING_CLASS = {
    CHAMPION: 'Champion', GUARDIAN: 'Guardian', HERALD: 'Herald',
    RAVAGER: 'Ravager', LANCER: 'Lancer', HUNTER: 'Hunter',
    REVENANT: 'Revenant', MYSTIC: 'Mystic', SEALER: 'Sealer'
};
export const STATE = { READY: 0, EXHAUSTED_1: 1, EXHAUSTED_2: 2, EXHAUSTED_3: 3 };
export const PLAYER = { P1: 'Player', P2: 'AI' };

// --- DATA MODELS ---
export class Card {
    constructor(name, title, influence, cost, fightingClass, fcAmplifier, owner, faction = "Greek") {
        this.id = Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.title = title;
        this.influence = influence;
        this.cost = cost;
        this.fightingClass = fightingClass;
        this.fcAmplifier = fcAmplifier;
        this.owner = owner;
        this.faction = faction;
        this.state = STATE.READY;
        this.status = { sealedTurns: 0, heraldBoost: 0, revenantActive: false, attacksThisTurn: 0 };
    }
}

// --- GAME STATE ---
export const GameState = {
    turn: PLAYER.P1,
    actionsRemaining: ACTIONS_PER_TURN,
    isMulliganPhase: true,
    isGameOver: false,
    checkmatePhaseActive: false,
    turnsUntilEnd: -1,
    mulliganSelection: [],
    playersReady: [],
    board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
    decks: { [PLAYER.P1]: [], [PLAYER.P2]: [] },
    hands: { [PLAYER.P1]: [], [PLAYER.P2]: [] },

    // UI selections (Engine shouldn't technically need these, but we keep them for now to validate UI actions, or UI can just send absolute coords)
    // Actually, UI should just send `{ type: 'SUMMON', cardIdx: 2, x: 1, y: 1, payments: [{x:0, y:0}] }`
    // We will clean this up by letting the UI track its own selections, and Engine just executes validated Actions.

    matchHistory: [],
    stateSnapshots: [],
    timeStarted: Date.now(),
    gameDuration: 0,

    log(message) {
        // We will dispatch this to the UI instead of manipulating DOM
        const prefix = this.isGameOver ? "[END]" : `[${this.turn}]`;
        this.matchHistory.push(`${prefix} ${message}`);
        Engine.emit('LOG', message);
    },

    captureStateSnapshot(eventName) {
        const snapshot = {
            eventName: eventName,
            turnCount: this.stateSnapshots.length,
            activePlayer: this.turn,
            p1Influence: this.getCardsOnBoard(PLAYER.P1).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + RulesEngine.getEffectiveInfluence(f.card), 0),
            p2Influence: this.getCardsOnBoard(PLAYER.P2).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + RulesEngine.getEffectiveInfluence(f.card), 0),
            board: JSON.parse(JSON.stringify(this.board)),
            p1Hand: JSON.parse(JSON.stringify(this.hands[PLAYER.P1])),
            p2Hand: JSON.parse(JSON.stringify(this.hands[PLAYER.P2]))
        };
        this.stateSnapshots.push(snapshot);
    },

    getCardsOnBoard(owner) {
        let cards = [];
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (this.board[y][x] && this.board[y][x].owner === owner) {
                    cards.push({ x, y, card: this.board[y][x] });
                }
            }
        }
        return cards;
    }
};

// --- RULES ENGINE ---
export const RulesEngine = {
    getEffectiveInfluence(card) {
        if (card.status && card.status.revenantActive) {
            return card.fcAmplifier;
        }
        return card.influence;
    },

    resolveCombatHit(attackerCard, targetCard, targetCoords) {
        let targetDef = this.getEffectiveInfluence(targetCard) + (targetCard.fightingClass === FIGHTING_CLASS.GUARDIAN ? targetCard.fcAmplifier : 0);
        let attackerAtk = this.getEffectiveInfluence(attackerCard) + (attackerCard.fightingClass === FIGHTING_CLASS.CHAMPION ? attackerCard.fcAmplifier : 0) + (attackerCard.status.heraldBoost || 0);

        if (targetDef > attackerAtk) {
            return { wasBlocked: true, destroyed: false };
        } else {
            if (targetCard.fightingClass === FIGHTING_CLASS.SEALER) {
                attackerCard.status.sealedTurns = targetCard.fcAmplifier;
            }
            targetCard.state++;
            let destroyed = false;
            if (targetCard.state > MAX_EXHAUSTION_TIERS) {
                GameState.board[targetCoords.y][targetCoords.x] = null;
                targetCard.state = 0;
                GameState.decks[targetCard.owner].unshift(targetCard);
                destroyed = true;
            }
            return { wasBlocked: false, destroyed };
        }
    },

    isAdjacentToFriendly(x, y, owner) {
        const friendlyCards = GameState.getCardsOnBoard(owner);
        for (let f of friendlyCards) {
            if (Math.abs(f.x - x) <= 1 && Math.abs(f.y - y) <= 1) return true;
        }
        return false;
    },

    isValidSummonSquare(x, y, card, owner) {
        if (GameState.board[y][x] !== null) return false;
        if (this.isAdjacentToFriendly(x, y, owner)) return true;
        if (card.title === TITLE.PAWN) {
            if (owner === PLAYER.P1 && (y === 3 || y === 4)) return true;
            if (owner === PLAYER.P2 && (y === 0 || y === 1)) return true;
        }
        return false;
    },

    getPoVDirections(title, owner) {
        const up = owner === PLAYER.P1 ? -1 : 1;
        switch (title) {
            case TITLE.ROOK: return [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
            case TITLE.BISHOP: return [{ dx: 1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 }];
            case TITLE.QUEEN:
            case TITLE.KING: return [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 }];
            case TITLE.PAWN: return [{ dx: -1, dy: up }, { dx: 1, dy: up }];
            case TITLE.KNIGHT: return [{ dx: 1, dy: 2 }, { dx: 2, dy: 1 }, { dx: -1, dy: 2 }, { dx: -2, dy: 1 }, { dx: 1, dy: -2 }, { dx: 2, dy: -1 }, { dx: -1, dy: -2 }, { dx: -2, dy: -1 }];
            default: return [];
        }
    },

    getRaycastTargets(startX, startY, card) {
        let rays = [];
        const directions = this.getPoVDirections(card.title, card.owner);
        const maxRange = (card.title === TITLE.PAWN || card.title === TITLE.KNIGHT || card.title === TITLE.KING) ? 1 : 5;

        for (let dir of directions) {
            let ray = [];
            for (let i = 1; i <= maxRange; i++) {
                let currentX = startX + (dir.dx * i);
                let currentY = startY + (dir.dy * i);

                if (card.title === TITLE.KNIGHT) {
                    currentX = startX + dir.dx;
                    currentY = startY + dir.dy;
                }

                if (currentX >= 0 && currentX < BOARD_SIZE && currentY >= 0 && currentY < BOARD_SIZE) {
                    ray.push({ x: currentX, y: currentY });
                } else {
                    break;
                }

                if (card.title === TITLE.KNIGHT) break;
            }
            if (ray.length > 0) rays.push(ray);
        }
        return rays;
    },

    getAttackOptions(attackerX, attackerY, attackerCard, mode = 'ATTACK') {
        let options = [];
        let rays = this.getRaycastTargets(attackerX, attackerY, attackerCard);

        const fc = attackerCard.fightingClass;
        const amp = attackerCard.fcAmplifier;
        let baseInf = RulesEngine.getEffectiveInfluence(attackerCard) + (attackerCard.status.heraldBoost || 0);

        if (fc === FIGHTING_CLASS.CHAMPION) {
            baseInf += amp;
        }

        for (let ray of rays) {
            if (fc === FIGHTING_CLASS.HUNTER) {
                let blockingCount = 0;
                for (let i = 0; i < ray.length; i++) {
                    const target = GameState.board[ray[i].y][ray[i].x];
                    if (target) {
                        if (target.owner !== attackerCard.owner) {
                            options.push({ primary: ray[i], affected: [ray[i]] });
                        }
                        blockingCount++;
                        if (blockingCount > amp) break;
                    }
                }
            } else if (fc === FIGHTING_CLASS.LANCER) {
                let currentHits = [];
                for (let i = 0; i < ray.length; i++) {
                    const target = GameState.board[ray[i].y][ray[i].x];
                    if (target) {
                        if (target.owner !== attackerCard.owner) {
                            let targetDef = RulesEngine.getEffectiveInfluence(target) + (target.fightingClass === FIGHTING_CLASS.GUARDIAN ? target.fcAmplifier : 0);
                            if (baseInf >= targetDef) {
                                currentHits.push(ray[i]);
                                if (currentHits.length >= amp) break;
                            } else {
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                }
                if (currentHits.length > 0) {
                    options.push({ primary: currentHits[0], affected: [...currentHits] });
                }
            } else if (fc === FIGHTING_CLASS.RAVAGER) {
                for (let i = 0; i < ray.length; i++) {
                    const target = GameState.board[ray[i].y][ray[i].x];
                    if (target) {
                        if (target.owner !== attackerCard.owner) {
                            let targetDef = RulesEngine.getEffectiveInfluence(target) + (target.fightingClass === FIGHTING_CLASS.GUARDIAN ? target.fcAmplifier : 0);
                            let affected = [ray[i]];
                            if (baseInf >= targetDef) {
                                const adjacent = [
                                    { x: ray[i].x - 1, y: ray[i].y }, { x: ray[i].x + 1, y: ray[i].y },
                                    { x: ray[i].x, y: ray[i].y - 1 }, { x: ray[i].x, y: ray[i].y + 1 },
                                    { x: ray[i].x - 1, y: ray[i].y - 1 }, { x: ray[i].x + 1, y: ray[i].y + 1 },
                                    { x: ray[i].x - 1, y: ray[i].y + 1 }, { x: ray[i].x + 1, y: ray[i].y - 1 }
                                ];
                                adjacent.forEach(adj => {
                                    if (adj.x >= 0 && adj.x < BOARD_SIZE && adj.y >= 0 && adj.y < BOARD_SIZE) {
                                        const splashTarget = GameState.board[adj.y][adj.x];
                                        if (splashTarget && splashTarget.owner !== attackerCard.owner) {
                                            let splashDef = RulesEngine.getEffectiveInfluence(splashTarget) + (splashTarget.fightingClass === FIGHTING_CLASS.GUARDIAN ? splashTarget.fcAmplifier : 0);
                                            if (splashDef <= amp) {
                                                affected.push(adj);
                                            }
                                        }
                                    }
                                });
                            }
                            options.push({ primary: ray[i], affected });
                        }
                        break;
                    }
                }
            } else if ((fc === FIGHTING_CLASS.MYSTIC || fc === FIGHTING_CLASS.HERALD) && mode === 'ABILITY') {
                for (let i = 0; i < ray.length; i++) {
                    const target = GameState.board[ray[i].y][ray[i].x];
                    if (target) {
                        if (target.owner === attackerCard.owner) {
                            if (fc === FIGHTING_CLASS.MYSTIC && target.state > 0 && RulesEngine.getEffectiveInfluence(target) <= amp) {
                                options.push({ primary: ray[i], affected: [ray[i]], isAbility: true });
                            } else if (fc === FIGHTING_CLASS.HERALD && target.state === STATE.READY) {
                                options.push({ primary: ray[i], affected: [ray[i]], isAbility: true });
                            }
                        }
                        break;
                    }
                }
            } else {
                for (let i = 0; i < ray.length; i++) {
                    const target = GameState.board[ray[i].y][ray[i].x];
                    if (target) {
                        if (target.owner !== attackerCard.owner) {
                            options.push({ primary: ray[i], affected: [ray[i]] });
                        }
                        break;
                    }
                }
            }
        }
        return options;
    }
};

// --- ENGINE DISPATCHER ---
// The Engine receives actions from the UI/AI, processes them, and emits events back.
export const Engine = {
    listeners: [],

    on(callback) {
        this.listeners.push(callback);
    },

    emit(type, payload) {
        this.listeners.forEach(cb => cb({ type, payload }));
    },

    init(gameData) {
        GameState.hands[PLAYER.P1] = [];
        GameState.hands[PLAYER.P2] = [];
        GameState.matchHistory = [];
        GameState.isMulliganPhase = true;

        GameState.decks[PLAYER.P1] = this.loadDeck(gameData, PLAYER.P1, "Greek");
        GameState.decks[PLAYER.P2] = this.loadDeck(gameData, PLAYER.P2, "Norse");

        for (let i = 0; i < 6; i++) {
            if (GameState.decks[PLAYER.P1].length > 0) GameState.hands[PLAYER.P1].push(GameState.decks[PLAYER.P1].pop());
            if (GameState.decks[PLAYER.P2].length > 0) GameState.hands[PLAYER.P2].push(GameState.decks[PLAYER.P2].pop());
        }

        GameState.log("MULLIGAN PHASE: Select up to 6 cards to replace, or keep hand to draw an extra card!");
        this.emit('STATE_UPDATED', { state: GameState });
    },

    loadDeck(gameData, owner, themeName) {
        const deck = [];
        const deckBlueprint = gameData[themeName];
        if (!deckBlueprint) throw new Error(`Theme '${themeName}' not found!`);

        deckBlueprint.forEach(cardData => {
            deck.push(new Card(cardData.name, cardData.title, RulesEngine.getEffectiveInfluence(cardData), cardData.cost, cardData.fightingClass, cardData.fcAmplifier, owner, themeName));
        });

        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    },

    dispatch(action) {
        if (GameState.isGameOver) return;

        const { type, payload } = action;
        let success = false;

        switch (type) {
            case 'SUBMIT_MULLIGAN':
                success = this.handleMulligan(payload.player, payload.replacedIndices);
                break;
            case 'SUMMON':
                success = this.handleSummon(payload.player, payload.cardIndex, payload.x, payload.y, payload.paymentCoords);
                break;
            case 'ATTACK':
                success = this.handleAttack(payload.player, payload.attackerX, payload.attackerY, payload.targetX, payload.targetY, payload.isAbility);
                break;
            case 'RESURGE':
                success = this.handleResurge(payload.player, payload.x, payload.y);
                break;
            case 'RECALL':
                success = this.handleRecall(payload.player, payload.x, payload.y);
                break;
            case 'END_TURN':
                success = true;
                this.passTurn();
                break;
        }

        if (success) {
            this.emit('STATE_UPDATED', { state: GameState });
        }
    },

    handleMulligan(player, replacedIndices) {
        if (!GameState.isMulliganPhase) return false;

        if (replacedIndices.length === 0) {
            if (GameState.decks[player].length > 0) GameState.hands[player].push(GameState.decks[player].pop());
            GameState.log(`${player} kept hand. Reward: 1 extra draw.`);
        } else {
            let toReplace = replacedIndices.sort((a, b) => b - a);
            toReplace.forEach(idx => {
                let discarded = GameState.hands[player].splice(idx, 1)[0];
                GameState.decks[player].push(discarded);
            });
            GameState.decks[player].sort(() => Math.random() - 0.5);
            for (let i = 0; i < toReplace.length; i++) GameState.hands[player].push(GameState.decks[player].pop());
            GameState.log(`${player} replaced ${toReplace.length} card(s).`);
        }
        
        if (!GameState.playersReady.includes(player)) {
            GameState.playersReady.push(player);
        }
        
        if (GameState.playersReady.includes(PLAYER.P1) && GameState.playersReady.includes(PLAYER.P2)) {
            GameState.isMulliganPhase = false;
            GameState.log("Mulligan complete. Turn 1 Start.");
        }
        return true;
    },

    handleSummon(player, cardIndex, x, y, paymentCoords) {
        if (GameState.turn !== player || GameState.actionsRemaining <= 0) return false;

        const card = GameState.hands[player][cardIndex];
        if (!card) return false;
        if (!RulesEngine.isValidSummonSquare(x, y, card, player)) return false;

        const isSupported = RulesEngine.isAdjacentToFriendly(x, y, player);
        const requiredCost = isSupported ? card.cost : 0;

        if (paymentCoords.length < requiredCost) return false;

        // Exhaust payment cards
        paymentCoords.forEach(coord => {
            let pCard = GameState.board[coord.y][coord.x];
            if (pCard) {
                if (pCard.owner === player) pCard.state++;
                else pCard.state--;
            }
        });

        GameState.hands[player].splice(cardIndex, 1);
        card.state = isSupported ? STATE.READY : 1;
        GameState.board[y][x] = card;
        GameState.actionsRemaining--;
        GameState.log(`Summoned ${card.title} to [${x}, ${y}] ${isSupported ? '(Ready)' : '(Exhausted)'}. Paid ${requiredCost}.`);

        this.emit('VFX_SUMMON', { x, y });
        return true;
    },

    handleAttack(player, attackerX, attackerY, targetX, targetY, isAbilityParam) {
        if (GameState.turn !== player || GameState.actionsRemaining <= 0) return false;

        const attacker = GameState.board[attackerY][attackerX];
        if (!attacker || attacker.owner !== player || attacker.state !== STATE.READY) return false;
        if ((attacker.status.attacksThisTurn || 0) >= MAX_ATTACKS_PER_TURN) return false;

        const mode = isAbilityParam ? 'ABILITY' : 'ATTACK';
        const activeOpts = RulesEngine.getAttackOptions(attackerX, attackerY, attacker, mode);
        const selectedOpt = activeOpts.find(opt => opt.primary.x === targetX && opt.primary.y === targetY);

        if (!selectedOpt) return false;

        let hits = 0;
        let affectedCoords = [];
        let successfulHits = [];
        let blockedCoords = [];
        let wasBlocked = false;

        if (selectedOpt.isAbility) {
            selectedOpt.affected.forEach(targetObj => {
                affectedCoords.push({ x: targetObj.x, y: targetObj.y });
                let tCard = GameState.board[targetObj.y][targetObj.x];
                if (attacker.fightingClass === FIGHTING_CLASS.MYSTIC) {
                    if (tCard.status.sealedTurns === 0) tCard.state = STATE.READY;
                } else if (attacker.fightingClass === FIGHTING_CLASS.HERALD) {
                    tCard.status.heraldBoost += attacker.fcAmplifier;
                }
                hits++;
            });
            attacker.state++;
            GameState.log(`Used ${attacker.title}'s ability. Affected ${hits} friendly card(s).`);
        } else {
            selectedOpt.affected.forEach(targetObj => {
                affectedCoords.push({ x: targetObj.x, y: targetObj.y });
                let tCard = GameState.board[targetObj.y][targetObj.x];
                const result = RulesEngine.resolveCombatHit(attacker, tCard, targetObj);

                if (result.wasBlocked) {
                    wasBlocked = true;
                    blockedCoords.push(targetObj);
                } else {
                    hits++;
                    successfulHits.push(targetObj);
                }
            });

            if (wasBlocked) attacker.state++;
            GameState.log(`Attacked with ${attacker.title}. Exhausted ${hits} enemy card(s). ${wasBlocked ? '(Blocked)' : ''}`);
        }

        attacker.status.attacksThisTurn = (attacker.status.attacksThisTurn || 0) + 1;
        GameState.actionsRemaining--;

        this.emit('VFX_ATTACK', {
            attacker: attacker,
            attackerX, attackerY,
            affectedCoords,
            successfulHits,
            blockedCoords,
            isAbility: selectedOpt.isAbility,
            wasBlocked
        });
        return true;
    },

    handleResurge(player, x, y) {
        if (GameState.turn !== player || GameState.actionsRemaining <= 0) return false;
        const card = GameState.board[y][x];
        if (!card || card.owner !== player || card.state === STATE.READY || card.status.sealedTurns > 0) return false;

        card.state--;
        GameState.actionsRemaining--;
        GameState.log(`Resurged ${card.title} at [${x}, ${y}].`);
        this.emit('AUDIO_PLAY', 'resurge');
        return true;
    },

    handleRecall(player, x, y) {
        if (GameState.turn !== player || GameState.actionsRemaining <= 0) return false;
        if (GameState.hands[player].length >= 6) return false;
        const card = GameState.board[y][x];
        if (!card || card.owner !== player || card.state !== STATE.READY) return false;

        GameState.hands[player].push(card);
        GameState.board[y][x] = null;
        GameState.actionsRemaining--;
        GameState.log(`Recalled ${card.title} from [${x}, ${y}] to hand.`);
        this.emit('AUDIO_PLAY', 'select');
        return true;
    },

    passTurn() {
        GameState.captureStateSnapshot("End of Turn");

        // Pass turn to the other player
        GameState.turn = GameState.turn === PLAYER.P1 ? PLAYER.P2 : PLAYER.P1;

        // Trigger start of turn effects
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                let cardObj = GameState.board[row][col];
                if (cardObj && cardObj.owner === GameState.turn) {
                    if (cardObj.status.sealedTurns > 0) cardObj.status.sealedTurns--;
                    cardObj.status.heraldBoost = 0;
                    cardObj.status.revenantActive = false;
                    cardObj.status.attacksThisTurn = 0;

                    if (cardObj.fightingClass === FIGHTING_CLASS.REVENANT && cardObj.state > 0 && cardObj.status.sealedTurns === 0) {
                        cardObj.state--;
                        cardObj.status.revenantActive = true;
                        GameState.log(`${cardObj.title} Auto-Resurged via Revenant!`);
                    }
                }
            }
        }

        GameState.actionsRemaining = ACTIONS_PER_TURN;

        if (GameState.checkmatePhaseActive) GameState.turnsUntilEnd--;

        let cardsDrawn = 0;
        while (GameState.hands[GameState.turn].length < 6 && GameState.decks[GameState.turn].length > 0) {
            GameState.hands[GameState.turn].push(GameState.decks[GameState.turn].pop());
            cardsDrawn++;
        }

        if (cardsDrawn > 0) {
            GameState.log(`${GameState.turn} turn started. Drew ${cardsDrawn} card(s).`);
        }

        // Checkmate Checks
        if (GameState.checkmatePhaseActive && GameState.decks[PLAYER.P1].length > 0 && GameState.decks[PLAYER.P2].length > 0) {
            GameState.checkmatePhaseActive = false;
            GameState.turnsUntilEnd = -1;
            GameState.log("Checkmate averted! Deck was replenished.");
        }
        if (!GameState.checkmatePhaseActive && GameState.decks[GameState.turn].length === 0) {
            GameState.checkmatePhaseActive = true;
            GameState.turnsUntilEnd = 1;
            GameState.log(`🚨 CHECKMATE PHASE! ${GameState.turn}'s deck is empty. FINAL TURN! 🚨`);
        }

        if (GameState.checkmatePhaseActive && GameState.turnsUntilEnd === 0) {
            this.triggerGameOver();
        }
    },

    triggerGameOver() {
        GameState.isGameOver = true;
        const p1Inf = GameState.getCardsOnBoard(PLAYER.P1).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + RulesEngine.getEffectiveInfluence(f.card), 0);
        const p2Inf = GameState.getCardsOnBoard(PLAYER.P2).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + RulesEngine.getEffectiveInfluence(f.card), 0);

        this.emit('GAME_OVER', { p1Inf, p2Inf });
    }
};
