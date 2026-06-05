import { Engine, GameState, RulesEngine, PLAYER, STATE, TITLE, FIGHTING_CLASS, ACTIONS_PER_TURN, BOARD_SIZE } from './engine.js';

// --- UI LOCAL STATE ---
let UIState = {
    selectedCardIndex: null,
    selectedPaymentCards: [],
    activeAttacker: null,
    hoveredCell: null,
    menuOpenForCard: null
};

// --- VFX & SFX Manager ---
const VFXManager = {
    triggerSummon(x, y) {
        if (window.AudioSys) AudioSys.playSFX('summon');
        const cell = document.getElementById(`cell-${x}-${y}`);
        if (cell && cell.firstElementChild) {
            cell.firstElementChild.classList.add('vfx-summon-active');
            setTimeout(() => {
                if (cell.firstElementChild) {
                    cell.firstElementChild.classList.remove('vfx-summon-active');
                }
            }, 400);
        }
    },

    triggerAttack(attackerCard, targetCoords, attackerX, attackerY) {
        const fc = attackerCard.fightingClass;
        const isAbility = fc === FIGHTING_CLASS.MYSTIC || fc === FIGHTING_CLASS.HERALD;

        if (!isAbility) {
            document.body.classList.add('screen-shake');
            setTimeout(() => document.body.classList.remove('screen-shake'), 300);
        }

        let sfxName = isAbility ? 'summon' : 'attackBrawler';
        let vfxClass = isAbility ? 'vfx-summon-active' : 'vfx-explosion';

        if (fc === FIGHTING_CLASS.LANCER) {
            sfxName = 'attackPiercer';
            vfxClass = 'vfx-laser-beam';
        } else if (fc === FIGHTING_CLASS.HUNTER) {
            sfxName = 'attackRanger';
            vfxClass = 'vfx-sniper-crosshair';
        }

        if (window.AudioSys) AudioSys.playSFX(sfxName);

        if (!isAbility && attackerX !== undefined && attackerY !== undefined) {
            const boardContainer = document.getElementById('board');
            if (boardContainer) {
                targetCoords.forEach(t => {
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('class', 'vfx-hunter-arc-svg');
                    svg.setAttribute('viewBox', '0 0 100 100');
                    svg.setAttribute('preserveAspectRatio', 'none');
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    
                    const startPxX = (attackerX * 20) + 10;
                    const startPxY = (attackerY * 20) + 10;
                    const endPxX = (t.x * 20) + 10;
                    const endPxY = (t.y * 20) + 10;
                    
                    const midX = (startPxX + endPxX) / 2;
                    const midY = (startPxY + endPxY) / 2 - 30;
                    
                    path.setAttribute('d', `M ${startPxX} ${startPxY} Q ${midX} ${midY} ${endPxX} ${endPxY}`);
                    path.setAttribute('class', 'hunter-arc-path');
                    
                    svg.appendChild(path);
                    boardContainer.appendChild(svg);
                    
                    setTimeout(() => {
                        if (boardContainer.contains(svg)) boardContainer.removeChild(svg);
                    }, 500);
                });
            }
        }

        targetCoords.forEach(t => {
            const targetCell = document.getElementById(`cell-${t.x}-${t.y}`);
            if (targetCell) {
                if (isAbility) {
                    if (targetCell.firstElementChild) {
                        targetCell.firstElementChild.classList.add('vfx-summon-active');
                        setTimeout(() => {
                            if (targetCell.firstElementChild) {
                                targetCell.firstElementChild.classList.remove('vfx-summon-active');
                            }
                        }, 400);
                    }
                } else {
                    if (targetCell.firstElementChild) {
                        targetCell.firstElementChild.classList.add('vfx-shake-active');
                        setTimeout(() => {
                            if (targetCell.firstElementChild) {
                                targetCell.firstElementChild.classList.remove('vfx-shake-active');
                            }
                        }, 300);
                    }

                    const particleContainer = document.createElement('div');
                    particleContainer.className = 'vfx-particle-container';
                    const particle = document.createElement('div');
                    particle.className = vfxClass;
                    particleContainer.appendChild(particle);
                    targetCell.appendChild(particleContainer);

                    setTimeout(() => {
                        if (targetCell.contains(particleContainer)) {
                            targetCell.removeChild(particleContainer);
                        }
                    }, 400);
                }
            }
        });
    },

    triggerExhaust(x, y) {
        if (window.AudioSys) AudioSys.playSFX('exhaust');
        const cell = document.getElementById(`cell-${x}-${y}`);
        if (cell && cell.firstElementChild) {
            cell.firstElementChild.classList.add('vfx-exhaust-active');
            setTimeout(() => {
                if (cell.firstElementChild) {
                    cell.firstElementChild.classList.remove('vfx-exhaust-active');
                }
            }, 400);
        }
    },

    triggerBlocked(x, y) {
        if (window.AudioSys) AudioSys.playSFX('select');
        const targetCell = document.getElementById(`cell-${x}-${y}`);
        if (targetCell) {
            const popup = document.createElement('div');
            popup.className = 'vfx-blocked-text';
            popup.innerText = 'Blocked!';
            targetCell.appendChild(popup);
            setTimeout(() => {
                if (targetCell.contains(popup)) targetCell.removeChild(popup);
            }, 800);
        }
    }
};

function getChessSymbol(title) {
    switch (title) {
        case TITLE.PAWN: return '♙';
        case TITLE.KNIGHT: return '♘';
        case TITLE.BISHOP: return '♗';
        case TITLE.ROOK: return '♖';
        case TITLE.QUEEN: return '♕';
        case TITLE.KING: return '♔';
        default: return '';
    }
}

function triggerGameOver(p1Inf, p2Inf) {
    const screen = document.getElementById('game-over-screen');
    const title = document.getElementById('go-title');

    document.getElementById('go-p1-inf').innerText = p1Inf;
    document.getElementById('go-p2-inf').innerText = p2Inf;

    const p1Box = document.getElementById('go-p1-score');
    const p2Box = document.getElementById('go-p2-score');

    if (p1Inf > p2Inf) {
        title.innerText = "Victory!";
        p1Box.className = "score-box winner";
        p2Box.className = "score-box loser";
    } else if (p2Inf > p1Inf) {
        title.innerText = "Defeat!";
        p1Box.className = "score-box loser";
        p2Box.className = "score-box winner";
    } else {
        title.innerText = "Draw!";
        p1Box.className = "score-box";
        p2Box.className = "score-box";
    }

    if (window.AudioSys) {
        window.AudioSys.playEndGameFanfare(p1Inf >= p2Inf);
    }
    screen.style.display = 'flex';
}

function generateCardHTML(card, overlayHtml = '', mathBonus = null) {
    let statusHtml = '';
    if (card.status.sealedTurns > 0) statusHtml += `<div class="status-sealed-overlay">🔗<br>${card.status.sealedTurns}</div>`;

    let mathHelperHtml = '';
    if (mathBonus) mathHelperHtml = `<span class="math-helper">${mathBonus > 0 ? '+' : ''}${mathBonus}</span>`;

    const factionFolder = card.faction || (card.owner === PLAYER.P1 ? 'Greek' : 'Norse');
    const imagePath = `assets/icons/cards/${factionFolder}/${card.id}.png`;
    const fcEmblemPath = `assets/icons/UI/Classes/${card.fightingClass.toLowerCase()}_emblem.png`;
    const costEmblemPath = `assets/icons/UI/Mechanics/cost_emblem.png`;

    return `${overlayHtml}${statusHtml}
        <img class="full-art-image" src="${imagePath}" alt="${card.name}">
        <div class="full-art-gradient-top"></div>
        <div class="full-art-gradient-bottom"></div>
        <div class="full-art-cost-container">
            <img class="full-art-cost-icon" src="${costEmblemPath}" alt="Cost">
            <span class="full-art-cost-value">${card.cost}</span>
        </div>
        <div class="full-art-class-container">
            <div style="position: relative;">
                <img class="full-art-class-icon" src="${fcEmblemPath}" alt="${card.fightingClass}">
                <div class="full-art-amp-value">${card.fcAmplifier}</div>
            </div>
        </div>
        <div class="full-art-bottom-info-container">
            <div class="full-art-chess-symbol-small">${getChessSymbol(card.title)}</div>
            <div class="full-art-influence-container">
                <span class="full-art-influence-value-small">${RulesEngine.getEffectiveInfluence(card)}${mathHelperHtml}</span>
            </div>
        </div>
    `;
}

function bindLongPress(element, onLongPress) {
    let pressTimer;
    const start = () => {
        pressTimer = window.setTimeout(() => {
            window.longPressTriggered = true;
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
                if (window.longPressTriggered) {
                    window.longPressTriggered = false;
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
        const activeOpts = RulesEngine.getAttackOptions(UIState.activeAttacker.x, UIState.activeAttacker.y, UIState.activeAttacker.card);
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

            if (card) {
                const ownerClass = card.owner === PLAYER.P1 ? 'friendly' : 'enemy';
                const stateClass = card.state > 0 ? 'exhausted' : 'ready';
                const paymentClass = UIState.selectedPaymentCards.some(p => p.x === x && p.y === y) ? 'payment-selected' : '';
                const attackerClass = (UIState.activeAttacker && UIState.activeAttacker.x === x && UIState.activeAttacker.y === y) ? 'active-attacker' : '';

                const targetClass = validPrimaryCoords.some(t => t.x === x && t.y === y) ? 'valid-target' : '';
                const hoverClass = isHoverEnemy ? 'hover-enemy-preview' : isHoverAlly ? 'hover-ally-preview' : '';
                const cleaveClass = isCleaveEnemy ? 'cleave-enemy-preview' : isCleaveAlly ? 'cleave-ally-preview' : '';

                let statusClasses = [];
                if (card.status.heraldBoost > 0) statusClasses.push('status-herald');
                if (card.status.revenantActive) statusClasses.push('status-revenant');
                if (card.status.sealedTurns > 0) statusClasses.push('status-sealed');

                let mathBonus = null;
                if ((isHoverEnemy || isCleaveEnemy || isHoverAlly || isCleaveAlly) && card.fightingClass === FIGHTING_CLASS.GUARDIAN) mathBonus = card.fcAmplifier;
                if ((isHoveredCell && card.fightingClass === FIGHTING_CLASS.CHAMPION && !GameState.isMulliganPhase) || 
                    (attackerClass && card.fightingClass === FIGHTING_CLASS.CHAMPION)) mathBonus = card.fcAmplifier;
                if (card.status.heraldBoost > 0) mathBonus = (mathBonus || 0) + card.status.heraldBoost;

                let overlayHtml = '';
                if (isHoveredCell && card.state > 0 && !GameState.isMulliganPhase) {
                    const currentInf = GameState.getCardsOnBoard(card.owner).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + RulesEngine.getEffectiveInfluence(f.card), 0);
                    overlayHtml = `<div class="exhausted-math">+${RulesEngine.getEffectiveInfluence(card)} (${currentInf + RulesEngine.getEffectiveInfluence(card)})</div>`;
                }

                cell.innerHTML = `<div class="card-entity ${ownerClass} ${stateClass} ${paymentClass} ${attackerClass} ${targetClass} ${hoverClass} ${cleaveClass} ${statusClasses.join(' ')}" style="transform: rotate(${card.state * 90}deg);">
                    ${generateCardHTML(card, overlayHtml, mathBonus)}
                </div>`;
            } else {
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
        const isMulligan = GameState.isMulliganPhase && GameState.mulliganSelection.includes(index);

        cardEl.className = `card-entity friendly ready ${isSelected ? 'selected' : ''} ${isMulligan ? 'mulligan-selected' : ''}`;
        cardEl.style.cursor = 'pointer';
        cardEl.innerHTML = generateCardHTML(card);
        bindLongPress(cardEl, () => openInspectModal(card));

        cardEl.addEventListener('click', (e) => {
            if (window.longPressTriggered) { window.longPressTriggered = false; return; }
            if (GameState.isMulliganPhase) {
                const mIdx = GameState.mulliganSelection.indexOf(index);
                if (mIdx > -1) { GameState.mulliganSelection.splice(mIdx, 1); if (window.AudioSys) AudioSys.playSFX('select'); }
                else if (GameState.mulliganSelection.length < 6) { GameState.mulliganSelection.push(index); if (window.AudioSys) AudioSys.playSFX('select'); }
                updateUI();
                return;
            }
            if (GameState.turn !== PLAYER.P1) return;
            if (UIState.selectedCardIndex !== index) UIState.selectedPaymentCards = [];
            UIState.selectedCardIndex = index;
            UIState.activeAttacker = null;
            if (window.AudioSys) AudioSys.playSFX('select');
            updateUI();
        });
        playerHandEl.appendChild(cardEl);
    });

    const btnEndTurn = document.getElementById('btn-end-turn');
    if (GameState.isMulliganPhase) {
        document.getElementById('turn-indicator').innerText = `Phase: Mulligan`;
        btnEndTurn.innerText = `Confirm (${GameState.mulliganSelection.length})`;
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
        const activeOpts = RulesEngine.getAttackOptions(UIState.activeAttacker.x, UIState.activeAttacker.y, UIState.activeAttacker.card);
        const selectedOpt = activeOpts.find(opt => opt.primary.x === x && opt.primary.y === y);

        if (selectedOpt) {
            Engine.dispatch({
                type: 'ATTACK',
                payload: {
                    player: PLAYER.P1,
                    attackerX: UIState.activeAttacker.x,
                    attackerY: UIState.activeAttacker.y,
                    targetX: x,
                    targetY: y,
                    isAbility: selectedOpt.isAbility
                }
            });
            UIState.activeAttacker = null;
            return;
        }
        if (clickedCard && clickedCard.owner === PLAYER.P2) return;
    }

    if (clickedCard && UIState.selectedCardIndex !== null) {
        const cardToSummon = GameState.hands[PLAYER.P1][UIState.selectedCardIndex];
        if (clickedCard.owner === PLAYER.P1 && clickedCard.state >= 3) return; 
        if (clickedCard.owner === PLAYER.P2 && clickedCard.state === 0) return;

        const paymentIdx = UIState.selectedPaymentCards.findIndex(p => p.x === x && p.y === y);
        if (paymentIdx > -1) {
            UIState.selectedPaymentCards.splice(paymentIdx, 1);
            if (window.AudioSys) AudioSys.playSFX('select');
        } else if (UIState.selectedPaymentCards.length < cardToSummon.cost) {
            UIState.selectedPaymentCards.push({ x, y, card: clickedCard });
            if (window.AudioSys) AudioSys.playSFX('select');
        }
        updateUI();
        return;
    }

    if (clickedCard && clickedCard.owner === PLAYER.P1) {
        if (clickedCard.state > 0 && UIState.selectedCardIndex === null) {
            if (clickedCard.status.sealedTurns > 0) return;
            Engine.dispatch({ type: 'RESURGE', payload: { player: PLAYER.P1, x, y } });
            return;
        }
        if (clickedCard.state === STATE.READY && UIState.selectedCardIndex === null) {
            openActionMenu(x, y, clickedCard, event);
            return;
        }
    }

    if (!clickedCard && UIState.selectedCardIndex !== null) {
        Engine.dispatch({
            type: 'SUMMON',
            payload: {
                player: PLAYER.P1,
                cardIndex: UIState.selectedCardIndex,
                x, y,
                paymentCoords: UIState.selectedPaymentCards.map(p => ({ x: p.x, y: p.y }))
            }
        });
        UIState.selectedCardIndex = null;
        UIState.selectedPaymentCards = [];
    }
}

document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    if (GameState.isGameOver) return;

    if (GameState.isMulliganPhase && GameState.mulliganSelection.length > 0) {
        GameState.mulliganSelection = [];
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
            payload: { player: PLAYER.P1, replacedIndices: GameState.mulliganSelection }
        });
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

function openInspectModal(card) {
    const modal = document.getElementById('inspect-modal');
    document.getElementById('inspect-cost').innerText = card.cost;
    document.getElementById('inspect-class-icon-img').src = `assets/icons/UI/Classes/${card.fightingClass.toLowerCase()}_emblem.png`;
    document.getElementById('inspect-class-amp').innerText = card.fcAmplifier;
    document.getElementById('inspect-title').innerText = card.name;
    document.getElementById('inspect-influence').innerText = RulesEngine.getEffectiveInfluence(card);
    document.getElementById('inspect-card-type').innerText = `${card.fightingClass} / ${card.title}`;

    const factionFolder = card.faction || (card.owner === PLAYER.P1 ? 'Greek' : 'Norse');
    const imagePath = `assets/icons/cards/${factionFolder}/${card.id}.png`;
    const inspectArtImg = document.getElementById('inspect-art-img');
    if (inspectArtImg) { inspectArtImg.src = imagePath; inspectArtImg.style.display = 'block'; }
    
    let desc = card.text ? `"${card.text}"` : "";
    
    document.getElementById('inspect-desc').innerText = desc;
    document.getElementById('inspect-card').className = 'premium-card-25d ' + (card.owner === PLAYER.P1 ? 'friendly' : 'enemy');
    modal.classList.remove('modal-hidden');
    modal.classList.add('modal-visible');
}

window.closeInspectModal = function() {
    const modal = document.getElementById('inspect-modal');
    modal.classList.remove('modal-visible');
    modal.classList.add('modal-hidden');
};

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
    if (GameState.hands[PLAYER.P1].length >= 6) { btnRecall.disabled = true; btnRecall.title = "Hand is full!"; } 
    else { btnRecall.disabled = false; btnRecall.title = ""; }

    const btnAttack = document.getElementById('btn-am-attack');
    if (card.fightingClass === FIGHTING_CLASS.MYSTIC || card.fightingClass === FIGHTING_CLASS.HERALD) btnAttack.innerHTML = '✨ Use Ability';
    else btnAttack.innerHTML = '⚔️ Attack';

    if ((card.status.attacksThisTurn || 0) >= 1) { btnAttack.disabled = true; btnAttack.title = "Already used this turn!"; } 
    else { btnAttack.disabled = false; btnAttack.title = ""; }

    menu.classList.remove('hidden');
}

function closeActionMenu() {
    UIState.menuOpenForCard = null;
    document.getElementById('action-menu').classList.add('hidden');
}

document.getElementById('btn-am-attack').addEventListener('click', () => {
    if (!UIState.menuOpenForCard) return;
    const { x, y, card } = UIState.menuOpenForCard;
    UIState.activeAttacker = { x, y, card };
    if (window.AudioSys) AudioSys.playSFX('select');
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
        if (!menu.contains(e.target) && !e.target.closest('.cell')) closeActionMenu();
    }
});

// --- ENGINE LISTENERS ---
Engine.on(event => {
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
            if (window.AudioSys) AudioSys.playSFX(event.payload);
            break;
        case 'GAME_OVER':
            triggerGameOver(event.payload.p1Inf, event.payload.p2Inf);
            break;
    }
});

export async function initializeGameMode() {
    try {
        const response = await fetch('data/decks.json');
        const gameData = await response.json();
        console.log("✅ Game Data loaded successfully via modules:", gameData);
        
        // --- ASSET PRELOADING ---
        const loadingScreen = document.getElementById('loading-screen');
        const progressBar = document.getElementById('loading-progress-bar');
        const loadingText = document.getElementById('loading-text');
        
        const imageUrls = [
            'assets/icons/UI/Mechanics/cost_emblem.png',
            'assets/icons/UI/Classes/champion_emblem.png',
            'assets/icons/UI/Classes/guardian_emblem.png',
            'assets/icons/UI/Classes/herald_emblem.png',
            'assets/icons/UI/Classes/hunter_emblem.png',
            'assets/icons/UI/Classes/lancer_emblem.png',
            'assets/icons/UI/Classes/mystic_emblem.png',
            'assets/icons/UI/Classes/ravager_emblem.png',
            'assets/icons/UI/Classes/revenant_emblem.png',
            'assets/icons/UI/Classes/sealer_emblem.png'
        ];
        
        for (const [faction, deck] of Object.entries(gameData)) {
            deck.forEach(card => {
                imageUrls.push(`assets/icons/cards/${faction}/${card.id}.png`);
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
        
        await Promise.all(loadPromises);
        
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
        
        initBoardDOM();
        Engine.init(gameData);
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
