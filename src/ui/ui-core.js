import { Engine, GameState, RulesEngine, PLAYER, STATE, TITLE, FIGHTING_CLASS, FIGHTING_CLASS_DESCRIPTIONS, ACTIONS_PER_TURN, MAX_ATTACKS_PER_TURN, BOARD_SIZE } from '../engine.js';
import { VFXManager } from "./vfx-manager.js";
import { generateCardHTML, getChessSymbol } from "./card-renderer.js";
import { openInspectModal, closeInspectModal } from "./overlays.js";

const animatedCardIds = new Set();

window.closeInspectModal = closeInspectModal;

// --- UI LOCAL STATE ---
let UIState = {
    selectedCardIndex: null,
    selectedPaymentCards: [],
    activeAttacker: null,
    hoveredCell: null,
    menuOpenForCard: null,
    mulliganSelection: []
};

// --- VFX & SFX Manager ---




function bindLongPress(element, onLongPress) {
    let pressTimer;
    const start = () => {
        element.dataset.longPressTriggered = 'false';
        pressTimer = window.setTimeout(() => {
            element.dataset.longPressTriggered = 'true';
            onLongPress();
        }, 400);
    };
    const cancel = () => clearTimeout(pressTimer);
    element.addEventListener('mousedown', start);
    element.addEventListener('mouseup', cancel);
    element.addEventListener('mouseleave', cancel);
    element.addEventListener('touchstart', start);
    element.addEventListener('touchend', cancel);
    element.addEventListener('touchcancel', cancel);
}

function initBoardDOM() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${x}-${y}`;

            cell.addEventListener('click', (e) => {
                if (cell.dataset.longPressTriggered === 'true') {
                    cell.dataset.longPressTriggered = 'false';
                    return;
                }
                handleCellClick(x, y, e);
            });
            cell.addEventListener('mouseenter', () => { UIState.hoveredCell = { x, y }; updateUI(); });
            cell.addEventListener('mouseleave', () => { UIState.hoveredCell = null; updateUI(); });

            bindLongPress(cell, () => {
                const card = GameState.board[y][x];
                if (card) openInspectModal(card);
            });

            boardElement.appendChild(cell);
        }
    }
}

function updateUI() {
    if (GameState.checkmatePhaseActive) document.body.classList.add('checkmate-phase');
    else document.body.classList.remove('checkmate-phase');

    let hoverTargetCoords = []; 
    let validPrimaryCoords = [];
    let cleavePreviewCoords = []; 
    let validPaymentCoords = [];
    let validSummonCoords = [];

    if (UIState.selectedCardIndex !== null && !GameState.isMulliganPhase) {
        const cardToSummon = GameState.hands[PLAYER.P1][UIState.selectedCardIndex];
        if (cardToSummon && cardToSummon.cost > 0 && UIState.selectedPaymentCards.length < cardToSummon.cost) {
            for (let y = 0; y < BOARD_SIZE; y++) {
                for (let x = 0; x < BOARD_SIZE; x++) {
                    const pCard = GameState.board[y][x];
                    if (pCard && !UIState.selectedPaymentCards.some(p => p.x === x && p.y === y)) {
                        if (pCard.status.sealedTurns === 0) {
                            if (pCard.owner === PLAYER.P1 && pCard.state === STATE.READY) {
                                validPaymentCoords.push({x, y});
                            } else if (pCard.owner === PLAYER.P2 && pCard.state > 0) {
                                validPaymentCoords.push({x, y});
                            }
                        }
                    }
                }
            }
        }

        // Calculate valid summon squares
        if (cardToSummon) {
            for (let y = 0; y < BOARD_SIZE; y++) {
                for (let x = 0; x < BOARD_SIZE; x++) {
                    if (RulesEngine.isValidSummonSquare(x, y, cardToSummon, PLAYER.P1)) {
                        validSummonCoords.push({x, y});
                    }
                }
            }
        }
    }

    if (UIState.hoveredCell && !GameState.isMulliganPhase) {
        const hCard = GameState.board[UIState.hoveredCell.y][UIState.hoveredCell.x];
        if (hCard && hCard.state === STATE.READY && !UIState.activeAttacker) {
            const opts = RulesEngine.getAttackOptions(UIState.hoveredCell.x, UIState.hoveredCell.y, hCard);
            opts.forEach(opt => {
                opt.affected.forEach(target => {
                    let targetCard = GameState.board[target.y][target.x];
                    let isAlly = targetCard ? targetCard.owner === hCard.owner : false;
                    hoverTargetCoords.push({x: target.x, y: target.y, isAlly});
                });
            });
        }
    }

    if (UIState.activeAttacker && !GameState.isMulliganPhase) {
        const activeOpts = RulesEngine.getAttackOptions(UIState.activeAttacker.x, UIState.activeAttacker.y, UIState.activeAttacker.card, UIState.activeAttacker.mode || 'ATTACK');
        activeOpts.forEach(opt => validPrimaryCoords.push(opt.primary));
        if (UIState.hoveredCell) {
            const hoveredOpt = activeOpts.find(opt => opt.primary.x === UIState.hoveredCell.x && opt.primary.y === UIState.hoveredCell.y);
            if (hoveredOpt) {
                hoveredOpt.affected.forEach(target => {
                    let targetCard = GameState.board[target.y][target.x];
                    let isAlly = targetCard ? targetCard.owner === UIState.activeAttacker.card.owner : false;
                    cleavePreviewCoords.push({x: target.x, y: target.y, isAlly});
                });
            }
        }
    }

    // Render Board
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.getElementById(`cell-${x}-${y}`);
            const card = GameState.board[y][x];

            const isHoveredCell = (UIState.hoveredCell && UIState.hoveredCell.x === x && UIState.hoveredCell.y === y);
            
            let isHoverEnemy = false, isHoverAlly = false;
            hoverTargetCoords.forEach(t => {
                if (t.x === x && t.y === y) { if (t.isAlly) isHoverAlly = true; else isHoverEnemy = true; }
            });

            let isCleaveEnemy = false, isCleaveAlly = false;
            cleavePreviewCoords.forEach(t => {
                if (t.x === x && t.y === y) { if (t.isAlly) isCleaveAlly = true; else isCleaveEnemy = true; }
            });

            cell.className = 'cell'; // Reset cell classes

            if (card) {
                const ownerClass = card.owner === PLAYER.P1 ? 'friendly' : 'enemy';
                const stateClass = card.state > 0 ? 'exhausted' : 'ready';
                const paymentClass = UIState.selectedPaymentCards.some(p => p.x === x && p.y === y) ? 'payment-selected' : '';
                const attackerClass = (UIState.activeAttacker && UIState.activeAttacker.x === x && UIState.activeAttacker.y === y) ? 'active-attacker' : '';

                const targetClass = validPrimaryCoords.some(t => t.x === x && t.y === y) ? 'valid-target' : '';
                const validPaymentClass = validPaymentCoords.some(t => t.x === x && t.y === y) ? 'valid-payment-target' : '';
                const hoverClass = isHoverEnemy ? 'hover-enemy-preview' : isHoverAlly ? 'hover-ally-preview' : '';
                const cleaveClass = isCleaveEnemy ? 'cleave-enemy-preview' : isCleaveAlly ? 'cleave-ally-preview' : '';

                let statusClasses = [];
                if (card.status.heraldBoost > 0) statusClasses.push('status-herald');
                if (card.status.revenantActive) statusClasses.push('status-revenant');
                if (card.status.sealedTurns > 0) statusClasses.push('status-sealed');
                if (card.fightingClass === FIGHTING_CLASS.BERSERK && card.status.berserkCharges > 0) statusClasses.push('status-berserk');

                let mathBonus = null;
                if ((isHoverEnemy || isCleaveEnemy || isHoverAlly || isCleaveAlly) && card.fightingClass === FIGHTING_CLASS.GUARDIAN) mathBonus = card.fcAmplifier;
                if ((isHoveredCell && card.fightingClass === FIGHTING_CLASS.CHAMPION && !GameState.isMulliganPhase) || 
                    (attackerClass && card.fightingClass === FIGHTING_CLASS.CHAMPION)) mathBonus = card.fcAmplifier;
                if (card.status.heraldBoost > 0) mathBonus = (mathBonus || 0) + card.status.heraldBoost;

                let overlayHtml = '';
                if (isHoveredCell && card.state > 0 && !GameState.isMulliganPhase) {
                    const currentInf = GameState.getCardsOnBoard(card.owner).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + RulesEngine.getEffectiveInfluence(f.card), 0);
                    overlayHtml += `<div class="exhausted-math">+${RulesEngine.getEffectiveInfluence(card)} (${currentInf + RulesEngine.getEffectiveInfluence(card)})</div>`;
                }
                
                if (card.fightingClass === FIGHTING_CLASS.BERSERK && card.status.berserkCharges > 0) {
                    overlayHtml += `<div class="berserk-charges">⚔️ ${card.status.berserkCharges}</div>`;
                }

                cell.innerHTML = `<div class="card-entity ${ownerClass} ${stateClass} ${paymentClass} ${attackerClass} ${targetClass} ${validPaymentClass} ${hoverClass} ${cleaveClass} ${statusClasses.join(' ')}" style="rotate: ${card.state * 90}deg;">
                    ${generateCardHTML(card, overlayHtml, mathBonus, 'board')}
                </div>`;
            } else {
                if (validSummonCoords.some(t => t.x === x && t.y === y)) {
                    cell.classList.add('valid-summon-target');
                }
                if (isHoveredCell && !GameState.isMulliganPhase) cell.innerHTML = `<span style="color:rgba(255,255,255,0.2); font-size:0.8em; pointer-events:none;">[${x},${y}]</span>`;
                else cell.innerHTML = '';
            }
        }
    }

    // Render Hand
    const playerHandEl = document.getElementById('player-hand');
    playerHandEl.innerHTML = '';
    GameState.hands[PLAYER.P1].forEach((card, index) => {
        const cardEl = document.createElement('div');
        const isSelected = UIState.selectedCardIndex === index && !GameState.isMulliganPhase;
        const isMulligan = GameState.isMulliganPhase && UIState.mulliganSelection.includes(index);

        cardEl.className = `card-entity friendly ready ${isSelected ? 'selected' : ''} ${isMulligan ? 'mulligan-selected' : ''}`;
        cardEl.style.cursor = 'pointer';
        cardEl.innerHTML = generateCardHTML(card, '', null, 'hand');
        bindLongPress(cardEl, () => openInspectModal(card));

        cardEl.addEventListener('click', (e) => {
            if (cardEl.dataset.longPressTriggered === 'true') { cardEl.dataset.longPressTriggered = 'false'; return; }
            if (GameState.isMulliganPhase) {
                const mIdx = UIState.mulliganSelection.indexOf(index);
                if (mIdx > -1) { UIState.mulliganSelection.splice(mIdx, 1); window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' })); }
                else if (UIState.mulliganSelection.length < 6) { UIState.mulliganSelection.push(index); window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' })); }
                updateUI();
                return;
            }
            if (GameState.turn !== PLAYER.P1) return;
            if (GameState.actionsRemaining <= 0) return;
            if (UIState.selectedCardIndex !== index) UIState.selectedPaymentCards = [];
            UIState.selectedCardIndex = index;
            UIState.activeAttacker = null;
            window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
            updateUI();
        });
        playerHandEl.appendChild(cardEl);
    });

    const btnEndTurn = document.getElementById('btn-end-turn');
    if (GameState.isMulliganPhase) {
        document.getElementById('turn-indicator').innerText = `Phase: Mulligan`;
        btnEndTurn.innerText = `Confirm (${UIState.mulliganSelection.length})`;
        btnEndTurn.style.backgroundColor = '#9b59b6';
    } else {
        document.getElementById('turn-indicator').innerText = `Turn: ${GameState.turn} (Actions: ${GameState.actionsRemaining}/${ACTIONS_PER_TURN})`;
        btnEndTurn.innerText = `End Turn`;
        btnEndTurn.style.backgroundColor = 'var(--card-ready)';
    }

    document.getElementById('player-deck-count').innerText = GameState.decks[PLAYER.P1].length;
    if (document.getElementById('player-hand-count')) document.getElementById('player-hand-count').innerText = GameState.hands[PLAYER.P1].length;

    const p1Influence = GameState.getCardsOnBoard(PLAYER.P1).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + RulesEngine.getEffectiveInfluence(f.card), 0);
    document.getElementById('player-influence').innerText = p1Influence;

    if (document.getElementById('ai-deck-count')) document.getElementById('ai-deck-count').innerText = GameState.decks[PLAYER.P2].length;
    if (document.getElementById('ai-hand-count')) document.getElementById('ai-hand-count').innerText = GameState.hands[PLAYER.P2].length;

    const p2Influence = GameState.getCardsOnBoard(PLAYER.P2).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + RulesEngine.getEffectiveInfluence(f.card), 0);
    if (document.getElementById('ai-influence')) document.getElementById('ai-influence').innerText = p2Influence;

    if (window.AudioSys) {
        window.AudioSys.isStressful = (p2Influence - p1Influence) >= 15;
        window.AudioSys.isCheckmate = GameState.checkmatePhaseActive;
    }
}

function handleCellClick(x, y, event) {
    if (GameState.isMulliganPhase) return;
    if (GameState.turn !== PLAYER.P1) return;
    const clickedCard = GameState.board[y][x];

    if (UIState.activeAttacker) {
        const activeOpts = RulesEngine.getAttackOptions(UIState.activeAttacker.x, UIState.activeAttacker.y, UIState.activeAttacker.card, UIState.activeAttacker.mode || 'ATTACK');
        const selectedOpt = activeOpts.find(opt => opt.primary.x === x && opt.primary.y === y);

        if (selectedOpt) {
            const attackerX = UIState.activeAttacker.x;
            const attackerY = UIState.activeAttacker.y;
            const isHerald = UIState.activeAttacker.card.fightingClass === FIGHTING_CLASS.HERALD;
            const isMystic = UIState.activeAttacker.card.fightingClass === FIGHTING_CLASS.MYSTIC;

            Engine.dispatch({
                type: 'ATTACK',
                payload: {
                    player: PLAYER.P1,
                    attackerX: attackerX,
                    attackerY: attackerY,
                    targetX: x,
                    targetY: y,
                    isAbility: selectedOpt.isAbility
                }
            });

            // Post-dispatch animation and SFX hooks for the UI/SFX teams
            const aCell = document.getElementById(`cell-${attackerX}-${attackerY}`);
            const tCell = document.getElementById(`cell-${x}-${y}`);
            const aCardEl = aCell ? aCell.querySelector('.card-entity') : null;
            const tCardEl = tCell ? tCell.querySelector('.card-entity') : null;

            if (selectedOpt.isAbility) {
                if (isHerald) {
                    if (aCardEl) aCardEl.classList.add('anim-herald-ability-caster');
                    if (tCardEl) tCardEl.classList.add('anim-herald-ability-target');
                    window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'herald-ability' }));
                } else if (isMystic) {
                    if (aCardEl) aCardEl.classList.add('anim-mystic-ability-caster');
                    if (tCardEl) tCardEl.classList.add('anim-mystic-ability-target');
                    window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'mystic-ability' }));
                }
            } else {
                window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'attack' }));
            }

            UIState.activeAttacker = null;
            return;
        }
        if (clickedCard && clickedCard.owner === PLAYER.P2) return;
    }

    if (clickedCard && UIState.selectedCardIndex !== null) {
        const cardToSummon = GameState.hands[PLAYER.P1][UIState.selectedCardIndex];
        if (clickedCard.owner === PLAYER.P1 && clickedCard.state !== STATE.READY) return; 
        if (clickedCard.owner === PLAYER.P2 && clickedCard.state === 0) return;
        if (clickedCard.status.sealedTurns > 0) return;

        const paymentIdx = UIState.selectedPaymentCards.findIndex(p => p.x === x && p.y === y);
        if (paymentIdx > -1) {
            UIState.selectedPaymentCards.splice(paymentIdx, 1);
            window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
        } else if (UIState.selectedPaymentCards.length < cardToSummon.cost) {
            UIState.selectedPaymentCards.push({ x, y, card: clickedCard });
            window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
        }
        updateUI();
        return;
    }

    if (clickedCard && clickedCard.owner === PLAYER.P1) {
        if (clickedCard.state > 0 && UIState.selectedCardIndex === null) {
            if (clickedCard.status.sealedTurns > 0) return;
            if (GameState.actionsRemaining <= 0) return;
            Engine.dispatch({ type: 'RESURGE', payload: { player: PLAYER.P1, x, y } });
            return;
        }
        if (clickedCard.state === STATE.READY && UIState.selectedCardIndex === null) {
            openActionMenu(x, y, clickedCard, event);
            return;
        }
    }

    if (!clickedCard && UIState.selectedCardIndex !== null) {
        const payload = {
            player: PLAYER.P1,
            cardIndex: UIState.selectedCardIndex,
            x, y,
            paymentCoords: UIState.selectedPaymentCards.map(p => ({ x: p.x, y: p.y }))
        };
        
        // Clear UI State before dispatching to prevent updateUI crashes
        UIState.selectedCardIndex = null;
        UIState.selectedPaymentCards = [];
        
        Engine.dispatch({ type: 'SUMMON', payload });
    }
}

document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    if (GameState.isGameOver) return;

    if (GameState.isMulliganPhase && UIState.mulliganSelection.length > 0) {
        UIState.mulliganSelection = [];
        updateUI();
    }
    if (!GameState.isMulliganPhase) {
        if (UIState.selectedCardIndex !== null || UIState.selectedPaymentCards.length > 0 || UIState.activeAttacker !== null) {
            UIState.selectedCardIndex = null;
            UIState.selectedPaymentCards = [];
            UIState.activeAttacker = null;
            updateUI();
        }
    }
});

document.getElementById('btn-end-turn').addEventListener('click', () => {
    if (GameState.isGameOver) return;
    
    if (GameState.isMulliganPhase) {
        Engine.dispatch({
            type: 'SUBMIT_MULLIGAN',
            payload: { player: PLAYER.P1, replacedIndices: [...UIState.mulliganSelection] }
        });
        UIState.mulliganSelection = [];
    } else {
        Engine.dispatch({ type: 'END_TURN', payload: {} });
    }
    UIState.selectedCardIndex = null;
    UIState.selectedPaymentCards = [];
    UIState.activeAttacker = null;
});

document.getElementById('btn-mute').addEventListener('click', (e) => {
    if (window.AudioSys) {
        window.AudioSys.isMuted = !window.AudioSys.isMuted;
        e.target.innerText = window.AudioSys.isMuted ? '🔇' : '🔊';
    }
});



function openActionMenu(x, y, card, event) {
    UIState.menuOpenForCard = { x, y, card };
    const menu = document.getElementById('action-menu');
    const cardEl = event.target.closest('.card-slot') || event.target.closest('.card-entity');
    if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        if (rect.right + 200 < window.innerWidth) menu.style.left = `${rect.right + 95}px`;
        else menu.style.left = `${rect.left - 95}px`;
        menu.style.top = `${rect.top + rect.height / 2}px`;
    } else {
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
    }
    
    const btnRecall = document.getElementById('btn-am-recall');
    if (GameState.actionsRemaining <= 0) { btnRecall.disabled = true; btnRecall.title = "No actions left!"; }
    else if (GameState.hands[PLAYER.P1].length >= 6) { btnRecall.disabled = true; btnRecall.title = "Hand is full!"; } 
    else { btnRecall.disabled = false; btnRecall.title = ""; }

    const btnAttack = document.getElementById('btn-am-attack');
    const btnAbility = document.getElementById('btn-am-ability');

    btnAttack.innerHTML = '⚔️ Attack';

    if (card.fightingClass === FIGHTING_CLASS.MYSTIC || card.fightingClass === FIGHTING_CLASS.HERALD) {
        btnAbility.classList.remove('hidden');
    } else {
        btnAbility.classList.add('hidden');
    }

    let maxAttacks = MAX_ATTACKS_PER_TURN;
    if (card.fightingClass === FIGHTING_CLASS.BERSERK && card.status.berserkCharges > 0) {
        maxAttacks = 100;
    }

    if (GameState.actionsRemaining <= 0) {
        btnAttack.disabled = true; btnAttack.title = "No actions left!"; 
        btnAbility.disabled = true; btnAbility.title = "No actions left!"; 
    } else if ((card.status.attacksThisTurn || 0) >= maxAttacks) { 
        btnAttack.disabled = true; btnAttack.title = "Already used this turn!"; 
        btnAbility.disabled = true; btnAbility.title = "Already used this turn!"; 
    } else { 
        btnAttack.disabled = false; btnAttack.title = ""; 
        btnAbility.disabled = false; btnAbility.title = ""; 
    }

    menu.classList.remove('hidden');
}

function closeActionMenu() {
    UIState.menuOpenForCard = null;
    document.getElementById('action-menu').classList.add('hidden');
}

document.getElementById('btn-am-attack').addEventListener('click', () => {
    if (!UIState.menuOpenForCard) return;
    const { x, y, card } = UIState.menuOpenForCard;
    UIState.activeAttacker = { x, y, card, mode: 'ATTACK' };
    window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
    closeActionMenu();
    updateUI();
});

document.getElementById('btn-am-ability').addEventListener('click', () => {
    if (!UIState.menuOpenForCard) return;
    const { x, y, card } = UIState.menuOpenForCard;
    UIState.activeAttacker = { x, y, card, mode: 'ABILITY' };
    window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
    closeActionMenu();
    updateUI();
});

document.getElementById('btn-am-recall').addEventListener('click', () => {
    if (!UIState.menuOpenForCard) return;
    const { x, y, card } = UIState.menuOpenForCard;
    Engine.dispatch({ type: 'RECALL', payload: { player: PLAYER.P1, x, y } });
    closeActionMenu();
});

document.getElementById('btn-am-cancel').addEventListener('click', () => closeActionMenu());

document.addEventListener('click', (e) => {
    const menu = document.getElementById('action-menu');
    if (!menu.classList.contains('hidden')) {
        if (!menu.contains(e.target)) {
            // Close the menu if we click outside of it.
            // But if we clicked the same card again, let handleCellClick handle it or toggle it.
            if (UIState.menuOpenForCard) {
                const cellId = `cell-${UIState.menuOpenForCard.x}-${UIState.menuOpenForCard.y}`;
                const cell = document.getElementById(cellId);
                if (cell && cell.contains(e.target)) return; 
            }
            closeActionMenu();
        }
    }
});

// --- ENGINE LISTENERS ---
Engine.on((event) => {
    if (event.type === 'GAME_OVER') {
        const goScreen = document.getElementById('game-over-screen');
        const goTitle = document.getElementById('go-title');
        const goP1Inf = document.getElementById('go-p1-inf');
        const goP2Inf = document.getElementById('go-p2-inf');
        const goP1ScoreBox = document.getElementById('go-p1-score');
        const goP2ScoreBox = document.getElementById('go-p2-score');
        
        let playerWon = false;
        
        if (event.payload.surrender) {
            goTitle.innerText = "Surrendered";
            if (event.payload.winner === PLAYER.P2) {
                goP1ScoreBox.className = "score-box loser";
                goP2ScoreBox.className = "score-box winner";
                playerWon = false;
            } else {
                goP1ScoreBox.className = "score-box winner";
                goP2ScoreBox.className = "score-box loser";
                playerWon = true;
            }
        } else if (event.payload.p1Inf > event.payload.p2Inf) {
            goTitle.innerText = "Victory!";
            goP1ScoreBox.className = "score-box winner";
            goP2ScoreBox.className = "score-box loser";
            playerWon = true;
        } else if (event.payload.p2Inf > event.payload.p1Inf) {
            goTitle.innerText = "Defeat!";
            goP1ScoreBox.className = "score-box loser";
            goP2ScoreBox.className = "score-box winner";
            playerWon = false;
        } else {
            goTitle.innerText = "Draw!";
            goP1ScoreBox.className = "score-box";
            goP2ScoreBox.className = "score-box";
            playerWon = true; // Use victory fanfare for draw
        }
        
        if (goP1Inf) goP1Inf.innerText = event.payload.p1Inf;
        if (goP2Inf) goP2Inf.innerText = event.payload.p2Inf;
        
        goScreen.style.display = 'flex';
        
        if (window.AudioSys) {
            window.dispatchEvent(new CustomEvent('PLAY_FANFARE', { detail: playerWon }));
        }
    }
    switch (event.type) {
        case 'LOG':
            document.getElementById('action-log').innerText = event.payload;
            console.log(event.payload);
            break;
        case 'STATE_UPDATED':
            updateUI();
            break;
        case 'VFX_SUMMON':
            VFXManager.triggerSummon(event.payload.x, event.payload.y);
            break;
        case 'VFX_ATTACK':
            const { attacker, affectedCoords, attackerX, attackerY, successfulHits, blockedCoords, isAbility, wasBlocked } = event.payload;
            VFXManager.triggerAttack(attacker, affectedCoords, attackerX, attackerY);
            if (isAbility || wasBlocked) {
                setTimeout(() => VFXManager.triggerExhaust(attackerX, attackerY), 200);
            }
            if (!isAbility) {
                successfulHits.forEach(t => setTimeout(() => VFXManager.triggerExhaust(t.x, t.y), 200));
                blockedCoords.forEach(t => setTimeout(() => VFXManager.triggerBlocked(t.x, t.y), 200));
            }
            break;
        case 'AUDIO_PLAY':
            window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: event.payload }));
            break;

    }
});

document.getElementById('btn-surrender').addEventListener('click', () => {
    if (GameState.isGameOver || GameState.isMulliganPhase) return;
    document.getElementById('surrender-modal').style.display = 'flex';
    window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
});

document.getElementById('btn-surrender-no').addEventListener('click', () => {
    document.getElementById('surrender-modal').style.display = 'none';
    window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
});

document.getElementById('btn-surrender-yes').addEventListener('click', () => {
    document.getElementById('surrender-modal').style.display = 'none';
    window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'combat' }));
    Engine.triggerGameOver(PLAYER.P1);
});

export async function initializeGameMode() {
    try {
        const response = await fetch('../data/decks.json');
        const gameData = await response.json();
        console.log("✅ Game Data loaded successfully via modules:", gameData);
        
        // --- ASSET PRELOADING ---
        const loadingScreen = document.getElementById('loading-screen');
        const progressBar = document.getElementById('loading-progress-bar');
        const loadingText = document.getElementById('loading-text');
        
        const imageUrls = [
            '../assets/icons/ui/mechanics/cost_emblem.png',
            '../assets/icons/ui/classes/champion_emblem.png',
            '../assets/icons/ui/classes/guardian_emblem.png',
            '../assets/icons/ui/classes/herald_emblem.png',
            '../assets/icons/ui/classes/hunter_emblem.png',
            '../assets/icons/ui/classes/lancer_emblem.png',
            '../assets/icons/ui/classes/mystic_emblem.png',
            '../assets/icons/ui/classes/ravager_emblem.png',
            '../assets/icons/ui/classes/revenant_emblem.png',
            '../assets/icons/ui/classes/sealer_emblem.png'
        ];
        
        for (const [faction, deck] of Object.entries(gameData)) {
            deck.forEach(card => {
                imageUrls.push(`../assets/icons/cards/${faction.toLowerCase()}/${card.id}.png`);
            });
        }
        
        let loadedCount = 0;
        if (loadingText) loadingText.innerText = `Loading 0 / ${imageUrls.length} assets...`;
        
        window.PRELOADED_ASSETS = window.PRELOADED_ASSETS || [];
        
        const loadPromises = imageUrls.map(url => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    loadedCount++;
                    window.PRELOADED_ASSETS.push(img);
                    if (progressBar) progressBar.style.width = `${(loadedCount / imageUrls.length) * 100}%`;
                    if (loadingText) loadingText.innerText = `Loading ${loadedCount} / ${imageUrls.length} assets...`;
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to preload image: ${url}`);
                    loadedCount++;
                    if (progressBar) progressBar.style.width = `${(loadedCount / imageUrls.length) * 100}%`;
                    resolve();
                };
                img.src = url;
            });
        });
        
        // Timeout to prevent infinite loading screens in case of browser/network issues (Wait up to 20 seconds)
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 30000));
        await Promise.race([Promise.all(loadPromises), timeoutPromise]);
        
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
        
        const settingsStr = localStorage.getItem('shamanstales_match_settings');
        let p1Faction = "Greek";
        let p2Faction = "Norse";
        let isPlayerP1 = true;

        if (settingsStr) {
            try {
                const settings = JSON.parse(settingsStr);
                p1Faction = settings.playerFaction || "Greek";
                p2Faction = settings.aiFaction || "Norse";
                isPlayerP1 = settings.isPlayerP1 !== false;
            } catch(e) {
                console.error("Failed to parse settings:", e);
            }
        }

        const uiP1Name = document.getElementById('ui-p1-name');
        if (uiP1Name) uiP1Name.innerText = `Player (${p1Faction})`;
        
        const goP1Name = document.getElementById('go-p1-name');
        if (goP1Name) goP1Name.innerText = `Player (${p1Faction})`;
        
        const uiP2Name = document.getElementById('ui-p2-name');
        if (uiP2Name) uiP2Name.innerText = `AI (${p2Faction})`;
        
        const goP2Name = document.getElementById('go-p2-name');
        if (goP2Name) goP2Name.innerText = `AI (${p2Faction})`;

        const startingTurn = isPlayerP1 ? PLAYER.P1 : PLAYER.P2;

        initBoardDOM();
        Engine.init(gameData, p1Faction, p2Faction, startingTurn);
    } catch (error) {
        console.error("🚨 Initialization Failed:", error);
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; background: #222; color: #ff5555;">
                <h1>🚨 System Error</h1>
                <p>The game engine failed to load required data.</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

window.downloadJSONLog = function() {
    const logData = Engine.exportLog();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(logData);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `shamans_tales_log_${new Date().getTime()}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
};
