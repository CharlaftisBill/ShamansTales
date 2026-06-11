import { Engine, GameState, RulesEngine, PLAYER, STATE, TITLE, FIGHTING_CLASS, ACTIONS_PER_TURN, MAX_ATTACKS_PER_TURN, BOARD_SIZE } from './engine.js';

export const AI = {
    init() {
        Engine.on(event => {
            if (event.type === 'STATE_UPDATED') {
                if (GameState.isMulliganPhase && !GameState.playersReady.includes(PLAYER.P2)) {
                    this.evaluateMulligan();
                } else if (!GameState.isMulliganPhase && GameState.turn === PLAYER.P2 && !GameState.isGameOver) {
                    if (!this.isThinking) this.startTurn();
                }
            }
        });
    },

    evaluateMulligan() {
        let toReplace = [];
        GameState.hands[PLAYER.P2].forEach((card, index) => {
            if (card.title !== TITLE.PAWN) toReplace.push(index);
        });
        setTimeout(() => {
            Engine.dispatch({ type: 'SUBMIT_MULLIGAN', payload: { player: PLAYER.P2, replacedIndices: toReplace } });
        }, 1000);
    },

    startTurn() {
        this.isThinking = true;
        if (GameState.turn !== PLAYER.P2 || GameState.isGameOver) {
            this.isThinking = false;
            return;
        }
        setTimeout(() => {
            this.executeMove(ACTIONS_PER_TURN);
        }, 1000);
    },

    executeMove(actionsLeft) {
        if (actionsLeft <= 0 || GameState.isGameOver || GameState.turn !== PLAYER.P2) {
            this.isThinking = false;
            Engine.dispatch({ type: 'END_TURN', payload: {} });
            return;
        }

        GameState.log(`AI evaluating move... (Actions left: ${actionsLeft})`);

        const aiReadyCards = GameState.getCardsOnBoard(PLAYER.P2).filter(c => c.card.state === STATE.READY);
        const aiExhausted = GameState.getCardsOnBoard(PLAYER.P2).filter(c => c.card.state > 0);
        let possibleMoves = [];

        this._evaluateAttacks(aiReadyCards, actionsLeft, possibleMoves);
        this._evaluateSummons(aiReadyCards, possibleMoves);
        this._evaluateResurges(aiExhausted, possibleMoves);
        this._evaluateRecalls(aiReadyCards, possibleMoves);

        // --- EXECUTE THE BEST MOVE ---
        if (possibleMoves.length > 0) {
            possibleMoves.sort(() => Math.random() - 0.5);
            possibleMoves.sort((a, b) => b.delta - a.delta);
            const bestMove = possibleMoves[0];

            if (bestMove.delta >= 0 || bestMove.type === 'SUMMON') {
                this._dispatchMove(bestMove);

                setTimeout(() => this.executeMove(actionsLeft - 1), 2000);
                return;
            }
        }

        Engine.dispatch({ type: 'END_TURN', payload: {} });
        this.isThinking = false;
    },

    _evaluateAttacks(aiReadyCards, actionsLeft, possibleMoves) {
        for (let attacker of aiReadyCards) {
            let maxAttacks = MAX_ATTACKS_PER_TURN;
            if (attacker.card.fightingClass === FIGHTING_CLASS.BERSERK && attacker.card.status.berserkCharges > 0) {
                maxAttacks = 100;
            }
            if ((attacker.card.status.attacksThisTurn || 0) >= maxAttacks) continue;
            let options = RulesEngine.getAttackOptions(GameState, attacker.x, attacker.y, attacker.card, 'ATTACK');
            
            if (attacker.card.fightingClass === FIGHTING_CLASS.MYSTIC || attacker.card.fightingClass === FIGHTING_CLASS.HERALD) {
                options = options.concat(RulesEngine.getAttackOptions(GameState, attacker.x, attacker.y, attacker.card, 'ABILITY'));
            }

            for (let opt of options) {
                let targetDamage = 0;
                let validHits = 0;
                
                if (opt.isAbility) {
                    for (let target of opt.affected) {
                        let tCard = GameState.board[target.y][target.x];
                        if (attacker.card.fightingClass === FIGHTING_CLASS.MYSTIC) {
                            if (tCard.status.sealedTurns > 0) continue;
                            targetDamage += RulesEngine.getEffectiveInfluence(tCard);
                        } else if (attacker.card.fightingClass === FIGHTING_CLASS.HERALD) {
                            targetDamage += attacker.card.fcAmplifier * 0.5;
                        }
                        validHits++;
                    }
                } else {
                    for (let target of opt.affected) {
                        let tCard = GameState.board[target.y][target.x];
                        if (tCard.state > 1) continue; // MAX_EXHAUSTION_TIERS = 1

                        let targetDef = RulesEngine.getEffectiveInfluence(tCard) + (tCard.fightingClass === FIGHTING_CLASS.GUARDIAN ? tCard.fcAmplifier : 0);
                        let attackerAtk = RulesEngine.getEffectiveInfluence(attacker.card) + (attacker.card.fightingClass === FIGHTING_CLASS.CHAMPION ? attacker.card.fcAmplifier : 0) + (attacker.card.status.heraldBoost || 0);

                        if (attackerAtk >= targetDef) {
                            targetDamage += RulesEngine.getEffectiveInfluence(tCard);
                            validHits++;
                        }
                    }
                }

                if (validHits > 0) {
                    let delta = targetDamage - RulesEngine.getEffectiveInfluence(attacker.card);
                    if (opt.isAbility) {
                        delta = actionsLeft === 1 ? (targetDamage - RulesEngine.getEffectiveInfluence(attacker.card)) : (targetDamage - 0.1); 
                    }
                    possibleMoves.push({ type: 'ATTACK', delta, attacker, opt, validHits });
                }
            }
        }
    },

    _evaluateSummons(aiReadyCards, possibleMoves) {
        let availablePaymentPoints = aiReadyCards.length + GameState.getCardsOnBoard(PLAYER.P1).filter(c => c.card.state > 0).length;
        let affordableCards = GameState.hands[PLAYER.P2].filter(c => c.cost <= availablePaymentPoints || c.title === TITLE.PAWN);
        
        let availablePayments = [];
        GameState.getCardsOnBoard(PLAYER.P1).filter(c => c.card.state > 0).forEach(c => availablePayments.push({ card: c.card, x: c.x, y: c.y, isEnemy: true }));
        aiReadyCards.sort((a, b) => RulesEngine.getEffectiveInfluence(a.card) - RulesEngine.getEffectiveInfluence(b.card)).forEach(c => availablePayments.push({ card: c.card, x: c.x, y: c.y, isEnemy: false }));

        for (let cardToSummon of affordableCards) {
            for (let y = 0; y < BOARD_SIZE; y++) {
                for (let x = 0; x < BOARD_SIZE; x++) {
                    if (RulesEngine.isValidSummonSquare(GameState, x, y, cardToSummon, PLAYER.P2)) {
                        const isSupported = RulesEngine.isAdjacentToFriendly(GameState, x, y, PLAYER.P2);
                        const requiredCost = isSupported ? cardToSummon.cost : 0;
                        if (requiredCost > availablePayments.length) continue;

                        let costInfluence = 0;
                        let paymentCards = [];
                        for (let i = 0; i < requiredCost; i++) {
                            if (!availablePayments[i].isEnemy) {
                                costInfluence += RulesEngine.getEffectiveInfluence(availablePayments[i].card);
                            } else {
                                costInfluence += RulesEngine.getEffectiveInfluence(availablePayments[i].card) * 0.5;
                            }
                            paymentCards.push(availablePayments[i]);
                        }
                        let delta = (isSupported ? RulesEngine.getEffectiveInfluence(cardToSummon) : 0) - costInfluence + 0.1;
                        possibleMoves.push({ type: 'SUMMON', delta, cardToSummon, x, y, isSupported, paymentCards });
                    }
                }
            }
        }
    },

    _evaluateResurges(aiExhausted, possibleMoves) {
        for (let exCard of aiExhausted) {
            if (exCard.card.status.sealedTurns > 0) continue;
            let delta = RulesEngine.getEffectiveInfluence(exCard.card);
            possibleMoves.push({ type: 'RESURGE', delta, target: exCard });
        }
    },

    _evaluateRecalls(aiReadyCards, possibleMoves) {
        if (GameState.hands[PLAYER.P2].length < 6) {
            for (let rCard of aiReadyCards) {
                let delta = 0.1;
                possibleMoves.push({ type: 'RECALL', delta, target: rCard });
            }
        }
    },

    _dispatchMove(bestMove) {
        if (bestMove.type === 'ATTACK') {
            Engine.dispatch({
                type: 'ATTACK',
                payload: {
                    player: PLAYER.P2,
                    attackerX: bestMove.attacker.x,
                    attackerY: bestMove.attacker.y,
                    targetX: bestMove.opt.primary.x,
                    targetY: bestMove.opt.primary.y,
                    isAbility: bestMove.opt.isAbility
                }
            });
        }
        else if (bestMove.type === 'SUMMON') {
            const handIdx = GameState.hands[PLAYER.P2].indexOf(bestMove.cardToSummon);
            const paymentCoords = bestMove.paymentCards.map(p => ({ x: p.x, y: p.y }));
            Engine.dispatch({
                type: 'SUMMON',
                payload: {
                    player: PLAYER.P2,
                    cardIndex: handIdx,
                    x: bestMove.x,
                    y: bestMove.y,
                    paymentCoords
                }
            });
        }
        else if (bestMove.type === 'RESURGE') {
            Engine.dispatch({
                type: 'RESURGE',
                payload: { player: PLAYER.P2, x: bestMove.target.x, y: bestMove.target.y }
            });
        }
        else if (bestMove.type === 'RECALL') {
            Engine.dispatch({
                type: 'RECALL',
                payload: { player: PLAYER.P2, x: bestMove.target.x, y: bestMove.target.y }
            });
        }
    }
};
