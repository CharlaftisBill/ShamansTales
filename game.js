// --- Configurations ---
const DECK_SIZE = 16; //16 OR 32

// --- ENUMS & CONSTANTS ---
const TITLE = { PAWN: 'Pawn', KNIGHT: 'Knight', BISHOP: 'Bishop', ROOK: 'Rook', QUEEN: 'Queen', KING: 'King' };
const FIGHTING_CLASS = { PIERCER: 'Piercer', RANGER: 'Ranger', BRAWLER: 'Brawler' };
const STATE = { READY: 'Ready', EXHAUSTED: 'Exhausted' };
const PLAYER = { P1: 'Player', P2: 'AI' };

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

    triggerAttack(attackerCard, targetCoords) {
        // Screen shake on attack
        document.body.classList.add('screen-shake');
        setTimeout(() => document.body.classList.remove('screen-shake'), 300);

        const fc = attackerCard.fightingClass;
        let sfxName = 'attackBrawler';
        let vfxClass = 'vfx-explosion';

        if (fc === FIGHTING_CLASS.PIERCER) {
            sfxName = 'attackPiercer';
            vfxClass = 'vfx-laser-beam';
        } else if (fc === FIGHTING_CLASS.RANGER) {
            sfxName = 'attackRanger';
            vfxClass = 'vfx-sniper-crosshair';
        }

        if (window.AudioSys) AudioSys.playSFX(sfxName);

        targetCoords.forEach(t => {
            const targetCell = document.getElementById(`cell-${t.x}-${t.y}`);
            if (targetCell) {
                // Add shake to target card
                if (targetCell.firstElementChild) {
                    targetCell.firstElementChild.classList.add('vfx-shake-active');
                    setTimeout(() => {
                        if (targetCell.firstElementChild) {
                            targetCell.firstElementChild.classList.remove('vfx-shake-active');
                        }
                    }, 300);
                }

                // Add particle overlay
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
    }
};

// Helper to get the right icon for the UI
function getClassIcon(fightingClass) {
    switch (fightingClass) {
        case FIGHTING_CLASS.PIERCER: return '🔱';
        case FIGHTING_CLASS.RANGER: return '🏹';
        case FIGHTING_CLASS.BRAWLER: return '⚔️';
        default: return '';
    }
}

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

// --- DATA MODELS ---
class Card {
    constructor(name, title, influence, cost, fightingClass, fcAmplifier, owner) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.title = title;
        this.influence = influence;
        this.cost = cost;
        this.fightingClass = fightingClass;
        this.fcAmplifier = fcAmplifier;
        this.owner = owner;
        this.state = STATE.READY;
    }
}

// --- GAME STATE ---
const GameState = {
    turn: PLAYER.P1,
    actionsRemaining: 2,
    isMulliganPhase: true,
    isGameOver: false,
    checkmatePhaseActive: false,
    turnsUntilEnd: -1,
    mulliganSelection: [],
    board: Array(5).fill(null).map(() => Array(5).fill(null)),
    decks: { [PLAYER.P1]: [], [PLAYER.P2]: [] },
    hands: { [PLAYER.P1]: [], [PLAYER.P2]: [] },
    selectedCardIndex: null,
    selectedPaymentCards: [],
    activeAttacker: null,
    hoveredCell: null,

    matchHistory: [],
    stateSnapshots: [],

    timeStarted: Date.now(),
    gameDuration: 0,

    log(message) {
        document.getElementById('action-log').innerText = message;
        console.log(message);

        if (this.matchHistory) {
            const prefix = this.isGameOver ? "[END]" : `[${this.turn}]`;
            this.matchHistory.push(`${prefix} ${message}`);
        }
    },

    calculateGameDuration() {
        this.gameDuration = Date.now() - this.timeStarted;
    },

    captureStateSnapshot(eventName) {
        const snapshot = {
            eventName: eventName,
            turnCount: this.stateSnapshots.length,
            activePlayer: this.turn,
            p1Influence: this.getCardsOnBoard(PLAYER.P1).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + f.card.influence, 0),
            p2Influence: this.getCardsOnBoard(PLAYER.P2).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + f.card.influence, 0),
            board: JSON.parse(JSON.stringify(this.board)),
            p1Hand: JSON.parse(JSON.stringify(this.hands[PLAYER.P1])),
            p2Hand: JSON.parse(JSON.stringify(this.hands[PLAYER.P2]))
        };
        this.stateSnapshots.push(snapshot);
    },

    getCardsOnBoard(owner) {
        let cards = [];
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                if (this.board[y][x] && this.board[y][x].owner === owner) {
                    cards.push({ x, y, card: this.board[y][x] });
                }
            }
        }
        return cards;
    }
};

function downloadJSONLog() {
    if (GameState.stateSnapshots.length === 0) {
        alert("No game data to download!");
        return;
    }

    GameState.calculateGameDuration();

    const exportData = {
        gameDuration: GameState.gameDuration,
        snapshots: GameState.stateSnapshots
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    const blob = new Blob([jsonString], {
        type: 'application/json'
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `SkirmishData_${new Date().toISOString()}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

function isBoardFull() {
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            if (GameState.board[y][x] === null) return false;
        }
    }
    return true;
}

// --- RULES ENGINE ---
const RulesEngine = {
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

    getAttackOptions(attackerX, attackerY, attackerCard) {
        let options = [];
        const dirs = this.getPoVDirections(attackerCard.title, attackerCard.owner);
        const fc = attackerCard.fightingClass;
        const amp = attackerCard.fcAmplifier;

        if (fc === FIGHTING_CLASS.RANGER) {
            // THE SNIPER: Ignores blocking cards. Targets any 1 enemy in the line up to Amp distance.
            for (let dir of dirs) {
                for (let step = 1; step <= amp; step++) {
                    let nx = attackerX + (dir.dx * step);
                    let ny = attackerY + (dir.dy * step);
                    if (nx < 0 || nx > 4 || ny < 0 || ny > 4) break; // Off board

                    let hitCard = GameState.board[ny][nx];
                    // If it's a valid enemy, it's a target! (We don't break the loop, so it shoots OVER cards)
                    if (hitCard && hitCard.owner !== attackerCard.owner && hitCard.state === STATE.READY) {
                        options.push({ primary: { x: nx, y: ny }, affected: [{ x: nx, y: ny, card: hitCard }] });
                    }
                }
            }
        }
        else if (fc === FIGHTING_CLASS.PIERCER) {
            // THE RAILGUN: Raycast. Stops at the first card. If it's an enemy, it penetrates directly behind it up to Amp limit.
            for (let dir of dirs) {
                let affected = [];
                let foundPrimary = false;

                for (let dist = 1; dist <= 5; dist++) {
                    let nx = attackerX + (dir.dx * dist);
                    let ny = attackerY + (dir.dy * dist);
                    if (nx < 0 || nx > 4 || ny < 0 || ny > 4) break;

                    let hitCard = GameState.board[ny][nx];

                    if (!foundPrimary) {
                        if (!hitCard) continue; // Empty space, bullet keeps flying
                        if (hitCard.owner === attackerCard.owner || hitCard.state === STATE.EXHAUSTED) break; // Blocked by friendly/dead

                        // Found the first valid enemy!
                        foundPrimary = true;
                        affected.push({ x: nx, y: ny, card: hitCard });
                        if (affected.length >= amp) break;
                    } else {
                        // Penetrating phase: checking the squares directly behind the primary target
                        if (hitCard && hitCard.owner !== attackerCard.owner && hitCard.state === STATE.READY) {
                            affected.push({ x: nx, y: ny, card: hitCard });
                            if (affected.length >= amp) break;
                        } else {
                            break; // Stop penetrating if it hits an empty square, a friendly, or an exhausted unit
                        }
                    }
                }
                if (affected.length > 0) {
                    options.push({ primary: { x: affected[0].x, y: affected[0].y }, affected: affected });
                }
            }
        }
        else if (fc === FIGHTING_CLASS.BRAWLER) {
            // THE GRENADE: Raycast up to AMP distance. Hits first thing. If enemy, explodes to all adjacent squares.
            for (let dir of dirs) {
                for (let dist = 1; dist <= amp; dist++) {
                    let nx = attackerX + (dir.dx * dist);
                    let ny = attackerY + (dir.dy * dist);
                    if (nx < 0 || nx > 4 || ny < 0 || ny > 4) break;

                    let hitCard = GameState.board[ny][nx];

                    if (hitCard) {
                        if (hitCard.owner === attackerCard.owner || hitCard.state === STATE.EXHAUSTED) break; // Blocked by friendly/dead

                        // Valid primary target found!
                        let primary = { x: nx, y: ny, card: hitCard };
                        let affected = [primary];

                        // Blast Radius: Find all adjacent enemies to the primary target
                        const adjacentDirs = [
                            { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
                            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
                            { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }
                        ];

                        for (let aDir of adjacentDirs) {
                            let ax = nx + aDir.dx;
                            let ay = ny + aDir.dy;
                            if (ax >= 0 && ax <= 4 && ay >= 0 && ay <= 4) {
                                let adjCard = GameState.board[ay][ax];
                                // We don't check Influence here, the main handleCellClick does the math later!
                                if (adjCard && adjCard.owner !== attackerCard.owner && adjCard.state === STATE.READY) {
                                    affected.push({ x: ax, y: ay, card: adjCard });
                                }
                            }
                        }

                        options.push({ primary: { x: nx, y: ny }, affected: affected });
                        break; // Stop raycasting in this direction after hitting the first thing
                    }
                }
            }
        }
        return options;
    }
};

// --- SETUP ---
function generateDeck(owner, themeName) {

    let num_of_pawns = 8;
    let num_of_knight_bishop_rook = 2;
    let num_of_queen_king = 1;

    if (DECK_SIZE == 32) {
        num_of_pawns = 16;
        num_of_knight_bishop_rook = 4;
        num_of_queen_king = 2;
    }

    if (![16, 32].includes(DECK_SIZE)) {
        alert("invalid Deck size");
    }

    const deck = [];
    for (let i = 0; i < num_of_pawns; i++) deck.push(new Card(`${themeName} Pawn`, TITLE.PAWN, 1, 1, FIGHTING_CLASS.BRAWLER, 1, owner));

    for (let i = 0; i < num_of_knight_bishop_rook; i++) {
        deck.push(new Card(`${themeName} Knight`, TITLE.KNIGHT, 3, 2, FIGHTING_CLASS.RANGER, 2, owner));
        deck.push(new Card(`${themeName} Bishop`, TITLE.BISHOP, 3, 2, FIGHTING_CLASS.PIERCER, 2, owner));
        deck.push(new Card(`${themeName} Rook`, TITLE.ROOK, 4, 3, FIGHTING_CLASS.PIERCER, 2, owner));
    }

    for (let i = 0; i < num_of_queen_king; i++) {
        deck.push(new Card(`${themeName} Queen`, TITLE.QUEEN, 8, 4, FIGHTING_CLASS.BRAWLER, 3, owner));
        deck.push(new Card(`${themeName} King`, TITLE.KING, 10, 5, FIGHTING_CLASS.BRAWLER, 1, owner));
    }

    // Proper Fisher-Yates Shuffle Algorithm (Guarantees true randomness!)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

function triggerGameOver() {
    GameState.isGameOver = true;

    // Calculate final Influence of READY cards only
    const p1Inf = GameState.getCardsOnBoard(PLAYER.P1).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + f.card.influence, 0);
    const p2Inf = GameState.getCardsOnBoard(PLAYER.P2).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + f.card.influence, 0);

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

    screen.style.display = 'flex'; // Show the screen
}

function initGame() {
    GameState.hands[PLAYER.P1] = [];
    GameState.hands[PLAYER.P2] = [];
    GameState.matchHistory = [];
    GameState.isMulliganPhase = true;
    GameState.mulliganSelection = [];

    GameState.decks[PLAYER.P1] = generateDeck(PLAYER.P1, "Greek");
    GameState.decks[PLAYER.P2] = generateDeck(PLAYER.P2, "Norse");

    for (let i = 0; i < 6; i++) {
        GameState.hands[PLAYER.P1].push(GameState.decks[PLAYER.P1].pop());
        GameState.hands[PLAYER.P2].push(GameState.decks[PLAYER.P2].pop());
    }

    initBoardDOM();

    GameState.log("MULLIGAN PHASE: Select up to 6 cards to replace, or keep hand to draw an extra card!");
    updateUI();
}

// --- RENDERING HELPERS ---
function generateCardHTML(card, overlayHtml = '') {
    return `${overlayHtml}
        <div class="hand-card-top-bar" style="justify-content: center;">
            <div class="hand-badge top-symbol-badge" style="font-size: 1.2em; background: transparent; box-shadow: none;">
                ${getChessSymbol(card.title)}
            </div>
        </div>
        <div class="hand-card-art">
            <span class="card-chess-symbol">${getChessSymbol(card.title)}</span>
        </div>
        <div class="hand-card-bottom-bar" style="justify-content: space-between;">
            <div class="hand-badge cost-badge" title="Cost">
                <span>⚡</span>
                <span>${card.cost}</span>
            </div>
            <div class="hand-badge inf-badge" title="Influence" style="margin: 0;">${card.influence}</div>
            <div class="hand-badge class-badge" title="${card.fightingClass} (Amp: ${card.fcAmplifier})">
                <span>${getClassIcon(card.fightingClass)}</span>
                <span>${card.fcAmplifier}</span>
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

// --- RENDERING ---
function initBoardDOM() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${x}-${y}`;

            cell.addEventListener('click', (e) => {
                if (window.longPressTriggered) {
                    window.longPressTriggered = false;
                    return;
                }
                handleCellClick(x, y);
            });
            cell.addEventListener('mouseenter', () => { GameState.hoveredCell = { x, y }; updateUI(); });
            cell.addEventListener('mouseleave', () => { GameState.hoveredCell = null; updateUI(); });

            bindLongPress(cell, () => {
                const card = GameState.board[y][x];
                if (card) openInspectModal(card);
            });

            boardElement.appendChild(cell);
        }
    }
}

function updateUI() {
    let hoverTargetCoords = [];
    let validPrimaryCoords = [];
    let cleavePreviewCoords = [];

    if (GameState.hoveredCell && !GameState.isMulliganPhase) {
        const hCard = GameState.board[GameState.hoveredCell.y][GameState.hoveredCell.x];
        if (hCard && hCard.state === STATE.READY && !GameState.activeAttacker) {
            const opts = RulesEngine.getAttackOptions(GameState.hoveredCell.x, GameState.hoveredCell.y, hCard);
            opts.forEach(opt => {
                opt.affected.forEach(target => hoverTargetCoords.push(target));
            });
        }
    }

    if (GameState.activeAttacker && !GameState.isMulliganPhase) {
        const activeOpts = RulesEngine.getAttackOptions(GameState.activeAttacker.x, GameState.activeAttacker.y, GameState.activeAttacker.card);
        activeOpts.forEach(opt => validPrimaryCoords.push(opt.primary));
        if (GameState.hoveredCell) {
            const hoveredOpt = activeOpts.find(opt => opt.primary.x === GameState.hoveredCell.x && opt.primary.y === GameState.hoveredCell.y);
            if (hoveredOpt) cleavePreviewCoords = hoveredOpt.affected;
        }
    }

    // Render Board
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            const cell = document.getElementById(`cell-${x}-${y}`);
            const card = GameState.board[y][x];

            const isHoveredCell = (GameState.hoveredCell && GameState.hoveredCell.x === x && GameState.hoveredCell.y === y);
            const isHoverTarget = hoverTargetCoords.some(t => t.x === x && t.y === y);
            const isCleaveTarget = cleavePreviewCoords.some(t => t.x === x && t.y === y);

            if (card) {
                const ownerClass = card.owner === PLAYER.P1 ? 'friendly' : 'enemy';
                const stateClass = card.state === STATE.EXHAUSTED ? 'exhausted' : 'ready';
                const paymentClass = GameState.selectedPaymentCards.some(p => p.x === x && p.y === y) ? 'payment-selected' : '';
                const attackerClass = (GameState.activeAttacker && GameState.activeAttacker.x === x && GameState.activeAttacker.y === y) ? 'active-attacker' : '';

                const targetClass = validPrimaryCoords.some(t => t.x === x && t.y === y) ? 'valid-target' : '';
                const hoverClass = isHoverTarget ? 'hover-target' : '';
                const cleaveClass = isCleaveTarget ? 'cleave-preview' : '';

                let overlayHtml = '';
                if (isHoveredCell && card.state === STATE.EXHAUSTED && !GameState.isMulliganPhase) {
                    const currentInf = GameState.getCardsOnBoard(card.owner).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + f.card.influence, 0);
                    overlayHtml = `<div class="exhausted-math">+${card.influence} (${currentInf + card.influence})</div>`;
                }

                cell.innerHTML = `<div class="card-entity ${ownerClass} ${stateClass} ${paymentClass} ${attackerClass} ${targetClass} ${hoverClass} ${cleaveClass}">
                    ${generateCardHTML(card, overlayHtml)}
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

        // Handle visual classes based on phases
        const isSelected = GameState.selectedCardIndex === index && !GameState.isMulliganPhase;
        const isMulligan = GameState.isMulliganPhase && GameState.mulliganSelection.includes(index);

        cardEl.className = `card-entity friendly ready ${isSelected ? 'selected' : ''} ${isMulligan ? 'mulligan-selected' : ''}`;
        cardEl.style.cursor = 'pointer';

        cardEl.innerHTML = generateCardHTML(card);

        bindLongPress(cardEl, () => openInspectModal(card));

        cardEl.addEventListener('click', (e) => {
            if (window.longPressTriggered) {
                window.longPressTriggered = false;
                return;
            }
            // MULLIGAN PHASE LOGIC
            if (GameState.isMulliganPhase) {
                const mIdx = GameState.mulliganSelection.indexOf(index);
                if (mIdx > -1) {
                    GameState.mulliganSelection.splice(mIdx, 1); // Deselect
                    if (window.AudioSys) AudioSys.playSFX('select');
                } else if (GameState.mulliganSelection.length < 6) {
                    GameState.mulliganSelection.push(index);
                    if (window.AudioSys) AudioSys.playSFX('select');
                }
                updateUI();
                return;
            }

            // NORMAL TURN LOGIC
            if (GameState.actionConsumed) { GameState.log("Action used! End Turn."); return; }
            if (GameState.selectedCardIndex !== index) GameState.selectedPaymentCards = [];
            GameState.selectedCardIndex = index;
            GameState.activeAttacker = null;
            // GameState.log(`Selected ${card.title}.`);
            if (window.AudioSys) AudioSys.playSFX('select');
            updateUI();
        });
        playerHandEl.appendChild(cardEl);
    });

    // Update Controls Text dynamically based on phase
    const btnEndTurn = document.getElementById('btn-end-turn');
    if (GameState.isMulliganPhase) {
        document.getElementById('turn-indicator').innerText = `Phase: Mulligan`;
        btnEndTurn.innerText = `Confirm (${GameState.mulliganSelection.length})`;
        btnEndTurn.style.backgroundColor = '#9b59b6'; // Purple button for Mulligan
    } else {
        document.getElementById('turn-indicator').innerText = `Turn: ${GameState.turn} (Actions: ${GameState.actionsRemaining}/2)`;
        btnEndTurn.innerText = `End Turn`;
        btnEndTurn.style.backgroundColor = 'var(--card-ready)';
    }

    document.getElementById('player-deck-count').innerText = GameState.decks[PLAYER.P1].length;
    const playerHandCountEl = document.getElementById('player-hand-count');
    if (playerHandCountEl) {
        playerHandCountEl.innerText = GameState.hands[PLAYER.P1].length;
    }

    const p1Influence = GameState.getCardsOnBoard(PLAYER.P1).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + f.card.influence, 0);
    document.getElementById('player-influence').innerText = p1Influence;

    const aiDeckEl = document.getElementById('ai-deck-count');
    if (aiDeckEl) {
        aiDeckEl.innerText = GameState.decks[PLAYER.P2].length;
    }

    const aiHandEl = document.getElementById('ai-hand-count');
    if (aiHandEl) {
        aiHandEl.innerText = GameState.hands[PLAYER.P2].length;
    }

    const p2Influence = GameState.getCardsOnBoard(PLAYER.P2)
        .filter(f => f.card.state === STATE.READY)
        .reduce((sum, f) => sum + f.card.influence, 0);

    const aiInfEl = document.getElementById('ai-influence');
    if (aiInfEl) {
        aiInfEl.innerText = p2Influence;
    }

    // Update audio manager stress level based on influence difference
    if (window.AudioSys) {
        window.AudioSys.isStressful = (p2Influence - p1Influence) >= 15;
        window.AudioSys.isCheckmate = GameState.checkmatePhaseActive;
    }
}

// --- INTERACTION LOGIC ---
function handleCellClick(x, y) {
    // Prevent clicking board during Mulligan
    if (GameState.isMulliganPhase) {
        GameState.log("Please complete your Mulligan selection first!");
        return;
    }

    if (GameState.turn !== PLAYER.P1) return;
    if (GameState.actionsRemaining <= 0) { GameState.log("Out of actions! Please End Turn."); return; }

    const clickedCard = GameState.board[y][x];

    // ACTION: CLICKING AN ENEMY CARD (ATTACK PHASE)
    if (clickedCard && clickedCard.owner === PLAYER.P2) {
        if (!GameState.activeAttacker) return;

        const activeOpts = RulesEngine.getAttackOptions(GameState.activeAttacker.x, GameState.activeAttacker.y, GameState.activeAttacker.card);
        const selectedOpt = activeOpts.find(opt => opt.primary.x === x && opt.primary.y === y);

        if (!selectedOpt) return;

        const attacker = GameState.activeAttacker.card;
        let hits = 0;

        // Auto-cleave logic: loop through all targets in blast zone
        let affectedCoords = [];
        selectedOpt.affected.forEach(targetObj => {
            affectedCoords.push({ x: targetObj.x, y: targetObj.y });
            if (targetObj.card.influence <= attacker.influence) {
                targetObj.card.state = STATE.EXHAUSTED;
                hits++;
            }
        });

        GameState.log(`Attacked with ${attacker.title} from [${GameState.activeAttacker.x}, ${GameState.activeAttacker.y}]. Exhausted ${hits} enemy card(s).`); attacker.state = STATE.EXHAUSTED;

        const attackerX = GameState.activeAttacker.x;
        const attackerY = GameState.activeAttacker.y;

        GameState.activeAttacker = null;
        GameState.actionsRemaining--;
        updateUI();

        setTimeout(() => {
            VFXManager.triggerAttack(attacker, affectedCoords);
            setTimeout(() => VFXManager.triggerExhaust(attackerX, attackerY), 200);
            selectedOpt.affected.forEach(t => {
                if (attacker.influence >= t.card.influence) {
                    setTimeout(() => VFXManager.triggerExhaust(t.x, t.y), 200);
                }
            });
        }, 0);
        return;
    }

    // ACTION: CLICKING A FRIENDLY CARD ON THE BOARD
    if (clickedCard && clickedCard.owner === PLAYER.P1) {

        // 1. Paying for a Summon
        if (GameState.selectedCardIndex !== null) {
            const cardToSummon = GameState.hands[PLAYER.P1][GameState.selectedCardIndex];
            if (clickedCard.state === STATE.EXHAUSTED) return;

            const paymentIdx = GameState.selectedPaymentCards.findIndex(p => p.x === x && p.y === y);
            if (paymentIdx > -1) {
                GameState.selectedPaymentCards.splice(paymentIdx, 1); // Deselect payment
                if (window.AudioSys) AudioSys.playSFX('select');
            } else if (GameState.selectedPaymentCards.length < cardToSummon.cost) {
                GameState.selectedPaymentCards.push({ x, y, card: clickedCard }); // Select payment
                if (window.AudioSys) AudioSys.playSFX('select');
            }
            updateUI();
            return;
        }

        // 2. Resurging an Exhausted Card
        if (clickedCard.state === STATE.EXHAUSTED && GameState.selectedCardIndex === null) {
            clickedCard.state = STATE.READY;
            GameState.actionsRemaining--;
            GameState.activeAttacker = null;
            GameState.log(`Resurged ${clickedCard.title} at [${x}, ${y}]. Action consumed!`);
            if (window.AudioSys) AudioSys.playSFX('resurge');
            updateUI();
            return;
        }

        // 3. Selecting a Ready Card to Attack
        if (clickedCard.state === STATE.READY && GameState.selectedCardIndex === null) {
            GameState.activeAttacker = { x, y, card: clickedCard };
            GameState.log(`Selected ${clickedCard.title} to attack. Hover targets to see blast zone.`);
            if (window.AudioSys) AudioSys.playSFX('select');
            updateUI();
            return;
        }
    }

    // ACTION: SUMMONING TO AN EMPTY SQUARE
    if (!clickedCard && GameState.selectedCardIndex !== null) {
        const cardToSummon = GameState.hands[PLAYER.P1][GameState.selectedCardIndex];

        // Check if the square is legal at all based on Title rules
        if (!RulesEngine.isValidSummonSquare(x, y, cardToSummon, PLAYER.P1)) return;

        // Check if the placement is next to a friendly card
        const isSupported = RulesEngine.isAdjacentToFriendly(x, y, PLAYER.P1);

        // NEW COST LOGIC: Supported placements require full cost. Unsupported (Pawns) are Free.
        const requiredCost = isSupported ? cardToSummon.cost : 0;

        if (GameState.selectedPaymentCards.length < requiredCost) {
            GameState.log(`You must select ${requiredCost} Ready cards to pay for this placement.`);
            return;
        }

        // Only exhaust the required amount of payment cards
        for (let i = 0; i < requiredCost; i++) {
            GameState.board[GameState.selectedPaymentCards[i].y][GameState.selectedPaymentCards[i].x].state = STATE.EXHAUSTED;
        }

        // Remove card from hand and set its state based on placement
        const newlySummonedCard = GameState.hands[PLAYER.P1].splice(GameState.selectedCardIndex, 1)[0];
        newlySummonedCard.state = isSupported ? STATE.READY : STATE.EXHAUSTED;

        // Place on board
        GameState.board[y][x] = newlySummonedCard;

        // Clean up UI state
        GameState.selectedCardIndex = null;
        GameState.selectedPaymentCards = [];
        GameState.actionsRemaining--;

        GameState.log(`Summoned ${newlySummonedCard.title} to [${x}, ${y}] ${isSupported ? '(Ready)' : '(Exhausted)'}. Paid ${requiredCost} Cost.`);
        updateUI();

        setTimeout(() => VFXManager.triggerSummon(x, y), 0);
    }
}

// --- AI ENGINE & TURN MANAGEMENT ---
function executeAITurn() {
    GameState.log("AI is taking its turn...");

    // 0. AI DRAW PHASE & CHECKMATE TRIGGERS
    let aiCardsDrawn = 0;
    while (GameState.hands[PLAYER.P2].length < 6 && GameState.decks[PLAYER.P2].length > 0) {
        GameState.hands[PLAYER.P2].push(GameState.decks[PLAYER.P2].pop());
        aiCardsDrawn++;
    }
    if (aiCardsDrawn > 0) {
        GameState.matchHistory.push(`[SYSTEM] AI drew ${aiCardsDrawn} card(s) to refill its hand.`);
    }

    if (!GameState.checkmatePhaseActive && (GameState.decks[PLAYER.P2].length === 0 || isBoardFull())) {
        GameState.checkmatePhaseActive = true;
        GameState.turnsUntilEnd = 1;
        const reason = isBoardFull() ? "The board is completely full" : "The AI deck is empty";
        GameState.log(`🚨 CHECKMATE PHASE! ${reason}. This is your FINAL TURN! 🚨`);
        document.getElementById('turn-indicator').style.color = '#e74c3c';
    }

    if (GameState.checkmatePhaseActive && GameState.turnsUntilEnd === 0) {
        triggerGameOver();
        return;
    }

    // Start executing the AI's 2 actions with a slight delay
    setTimeout(() => executeAIMove(2), 1000);
}

// Recursive function that allows the AI to take multiple actions per turn
function executeAIMove(actionsLeft) {
    if (actionsLeft <= 0 || GameState.isGameOver) {
        GameState.captureStateSnapshot("End of AI Turn");
        passTurnToPlayer();
        return;
    }

    GameState.log(`AI evaluating move... (Actions left: ${actionsLeft})`);

    const aiReadyCards = GameState.getCardsOnBoard(PLAYER.P2).filter(c => c.card.state === STATE.READY);
    const aiExhausted = GameState.getCardsOnBoard(PLAYER.P2).filter(c => c.card.state === STATE.EXHAUSTED);
    let possibleMoves = [];

    // --- 1. EVALUATE ALL ATTACKS ---
    for (let attacker of aiReadyCards) {
        const options = RulesEngine.getAttackOptions(attacker.x, attacker.y, attacker.card);
        for (let opt of options) {
            let targetDamage = 0;
            let validHits = 0;
            for (let target of opt.affected) {
                if (attacker.card.influence >= target.card.influence) {
                    targetDamage += target.card.influence;
                    validHits++;
                }
            }
            if (validHits > 0) {
                let delta = targetDamage - attacker.card.influence;
                possibleMoves.push({ type: 'ATTACK', delta, attacker, opt, validHits });
            }
        }
    }

    // --- 2. EVALUATE ALL SUMMONS ---
    let affordableCards = GameState.hands[PLAYER.P2].filter(c => c.cost <= aiReadyCards.length || c.title === TITLE.PAWN);
    let cheapestPaymentCards = [...aiReadyCards].sort((a, b) => a.card.influence - b.card.influence);

    for (let cardToSummon of affordableCards) {
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                if (RulesEngine.isValidSummonSquare(x, y, cardToSummon, PLAYER.P2)) {
                    const isSupported = RulesEngine.isAdjacentToFriendly(x, y, PLAYER.P2);
                    const requiredCost = isSupported ? cardToSummon.cost : 0;
                    if (requiredCost > aiReadyCards.length) continue;

                    let costInfluence = 0;
                    let paymentCards = [];
                    for (let i = 0; i < requiredCost; i++) {
                        costInfluence += cheapestPaymentCards[i].card.influence;
                        paymentCards.push(cheapestPaymentCards[i]);
                    }
                    let delta = (isSupported ? cardToSummon.influence : 0) - costInfluence + 0.1;
                    possibleMoves.push({ type: 'SUMMON', delta, cardToSummon, x, y, isSupported, paymentCards });
                }
            }
        }
    }

    // --- 3. EVALUATE ALL RESURGES ---
    for (let exCard of aiExhausted) {
        let delta = exCard.card.influence;
        possibleMoves.push({ type: 'RESURGE', delta, target: exCard });
    }

    // --- EXECUTE THE BEST MOVE ---
    if (possibleMoves.length > 0) {
        possibleMoves.sort(() => Math.random() - 0.5);
        possibleMoves.sort((a, b) => b.delta - a.delta);
        const bestMove = possibleMoves[0];

        if (bestMove.delta >= 0 || bestMove.type === 'SUMMON') {
            if (bestMove.type === 'ATTACK') {
                let affectedCoords = [];
                bestMove.opt.affected.forEach(t => {
                    affectedCoords.push({ x: t.x, y: t.y });
                    if (bestMove.attacker.card.influence >= t.card.influence) t.card.state = STATE.EXHAUSTED;
                });
                bestMove.attacker.card.state = STATE.EXHAUSTED;
                GameState.log(`AI Action: Attacked with ${bestMove.attacker.card.title} from [${bestMove.attacker.x}, ${bestMove.attacker.y}]. Exhausted ${bestMove.validHits} target(s).`);

                updateUI();

                setTimeout(() => {
                    VFXManager.triggerAttack(bestMove.attacker.card, affectedCoords);
                    setTimeout(() => VFXManager.triggerExhaust(bestMove.attacker.x, bestMove.attacker.y), 200);
                    bestMove.opt.affected.forEach(t => {
                        if (bestMove.attacker.card.influence >= t.card.influence) {
                            setTimeout(() => VFXManager.triggerExhaust(t.x, t.y), 200);
                        }
                    });
                }, 0);
            }
            else if (bestMove.type === 'SUMMON') {
                bestMove.paymentCards.forEach(p => p.card.state = STATE.EXHAUSTED);
                const handIdx = GameState.hands[PLAYER.P2].indexOf(bestMove.cardToSummon);
                GameState.hands[PLAYER.P2].splice(handIdx, 1);
                bestMove.cardToSummon.state = bestMove.isSupported ? STATE.READY : STATE.EXHAUSTED;
                GameState.board[bestMove.y][bestMove.x] = bestMove.cardToSummon;
                GameState.log(`AI Action: Summoned ${bestMove.cardToSummon.title} to [${bestMove.x}, ${bestMove.y}] ${bestMove.isSupported ? '(Ready)' : '(Exhausted)'}.`);

                updateUI();
                setTimeout(() => VFXManager.triggerSummon(bestMove.x, bestMove.y), 0);
            }
            else if (bestMove.type === 'RESURGE') {
                bestMove.target.card.state = STATE.READY;
                GameState.log(`AI Action: Resurged ${bestMove.target.card.title} at [${bestMove.target.x}, ${bestMove.target.y}].`);
                if (window.AudioSys) AudioSys.playSFX('resurge');
                updateUI();
            }

            // Wait 1.2 seconds so the player can see what the AI did, then take the next action!
            setTimeout(() => executeAIMove(actionsLeft - 1), 1200);
            return;
        }
    }

    // FALLBACK: AI has absolutely no moves that don't destroy its own score
    GameState.log("AI calculates remaining moves are disadvantageous. It ends its turn.");
    GameState.captureStateSnapshot("End of AI Turn");
    passTurnToPlayer();
}

function passTurnToPlayer() {
    GameState.turn = PLAYER.P1;
    GameState.actionsRemaining = 2;

    if (GameState.checkmatePhaseActive) GameState.turnsUntilEnd--;

    let cardsDrawn = 0;
    while (GameState.hands[PLAYER.P1].length < 6 && GameState.decks[PLAYER.P1].length > 0) {
        GameState.hands[PLAYER.P1].push(GameState.decks[PLAYER.P1].pop());
        cardsDrawn++;
    }

    if (cardsDrawn > 0) {
        GameState.log(`Turn started. You drew ${cardsDrawn} card(s) to refill your hand.`);
    } else if (GameState.hands[PLAYER.P1].length >= 6) {
        GameState.log(`Turn started. Hand is full (6+ cards). You draw nothing.`);
    }

    if (!GameState.checkmatePhaseActive && (GameState.decks[PLAYER.P1].length === 0 || isBoardFull())) {
        GameState.checkmatePhaseActive = true;
        GameState.turnsUntilEnd = 1;
        const reason = isBoardFull() ? "The board is completely full" : "Your deck is empty";
        GameState.log(`🚨 CHECKMATE PHASE! ${reason}. This is your FINAL TURN! 🚨`);
        document.getElementById('turn-indicator').style.color = '#e74c3c';
    }

    updateUI();
}

// --- CONTROLS ---

document.addEventListener('contextmenu', (event) => {
    // 1. Prevent the default browser context menu from appearing
    event.preventDefault();

    // 2. Do nothing if the game is over
    if (GameState.isGameOver) return;

    let clearedSomething = false;

    // 3. Handle Mulligan Phase clearing
    if (GameState.isMulliganPhase && GameState.mulliganSelection.length > 0) {
        GameState.mulliganSelection = [];
        clearedSomething = true;
    }

    // 4. Handle Normal Turn clearing
    if (!GameState.isMulliganPhase) {
        if (GameState.selectedCardIndex !== null || GameState.selectedPaymentCards.length > 0 || GameState.activeAttacker !== null) {
            GameState.selectedCardIndex = null;
            GameState.selectedPaymentCards = [];
            GameState.activeAttacker = null;
            clearedSomething = true;
        }
    }

    // 5. Only update UI and log if we actually deselected something
    if (clearedSomething) {
        GameState.log("Selection cleared.");
        updateUI();
    }
});

document.getElementById('btn-end-turn').addEventListener('click', () => {
    if (GameState.isGameOver) return;

    if (GameState.isMulliganPhase) {
        if (GameState.mulliganSelection.length === 0) {
            if (GameState.decks[PLAYER.P1].length > 0) GameState.hands[PLAYER.P1].push(GameState.decks[PLAYER.P1].pop());
            GameState.log("Hand kept! Reward: Extra card drawn. Turn 1 Start.");
        } else {
            let toReplace = GameState.mulliganSelection.sort((a, b) => b - a);
            toReplace.forEach(idx => {
                let discarded = GameState.hands[PLAYER.P1].splice(idx, 1)[0];
                GameState.decks[PLAYER.P1].push(discarded);
            });
            GameState.decks[PLAYER.P1].sort(() => Math.random() - 0.5);
            for (let i = 0; i < toReplace.length; i++) GameState.hands[PLAYER.P1].push(GameState.decks[PLAYER.P1].pop());
            GameState.log(`Mulligan complete. Replaced ${toReplace.length} card(s). Turn 1 Start.`);
        }

        // --- AI MULLIGAN LOGIC ---
        // The AI wants early game tempo. It will keep ALL Pawns, and throw away EVERYTHING else!
        let aiCardsToKeep = [];
        let aiCardsToReplace = [];

        GameState.hands[PLAYER.P2].forEach(card => {
            // If it's a 1-cost Pawn, keep it. Otherwise, toss it back.
            if (card.title === TITLE.PAWN) {
                aiCardsToKeep.push(card);
            } else {
                aiCardsToReplace.push(card);
            }
        });

        if (aiCardsToReplace.length === 0) {
            // AI kept a perfect hand of all Pawns! Reward it with an extra draw.
            if (GameState.decks[PLAYER.P2].length > 0) GameState.hands[PLAYER.P2].push(GameState.decks[PLAYER.P2].pop());
            GameState.matchHistory.push(`[SYSTEM] AI kept its hand. Drew 1 extra card.`);
        } else {
            // AI replaces the expensive cards
            aiCardsToReplace.forEach(discarded => GameState.decks[PLAYER.P2].push(discarded));
            GameState.decks[PLAYER.P2].sort(() => Math.random() - 0.5); // Shuffle

            GameState.hands[PLAYER.P2] = [...aiCardsToKeep]; // Reset hand to only the kept cards
            for (let i = 0; i < aiCardsToReplace.length; i++) {
                GameState.hands[PLAYER.P2].push(GameState.decks[PLAYER.P2].pop());
            }
            GameState.matchHistory.push(`[SYSTEM] AI mulliganed ${aiCardsToReplace.length} card(s).`);
        }

        // Log AI Final Hand for JSON/Text logs
        GameState.matchHistory.push(`[SYSTEM] AI Final Starting Hand: [${GameState.hands[PLAYER.P2].map(c => c.title).join(", ")}]`);

        GameState.isMulliganPhase = false;
        GameState.mulliganSelection = [];
        updateUI();
        return;
    }

    if (GameState.checkmatePhaseActive && GameState.turnsUntilEnd === 0) {
        triggerGameOver();
        return;
    }

    GameState.turn = PLAYER.P2;
    GameState.selectedCardIndex = null;
    GameState.selectedPaymentCards = [];
    GameState.activeAttacker = null;
    updateUI();

    GameState.captureStateSnapshot("End of Player Turn");
    executeAITurn();
});

// --- MODAL LOGIC ---
function openInspectModal(card) {
    const modal = document.getElementById('inspect-modal');
    document.getElementById('inspect-cost').innerText = card.cost;
    document.getElementById('inspect-class-icon').innerText = getClassIcon(card.fightingClass);
    document.getElementById('inspect-class-amp').innerText = card.fcAmplifier;
    document.getElementById('inspect-chess-symbol-top').innerText = getChessSymbol(card.title);
    document.getElementById('inspect-cost-icon').innerText = '⚡';
    document.getElementById('inspect-title').innerText = card.name;
    document.getElementById('inspect-influence').innerText = card.influence;

    let desc = "";
    if (card.fightingClass === FIGHTING_CLASS.BRAWLER) desc = "Fires a projectile up to its Amplifier distance. Hits first unit. If enemy, explodes, exhausting target and all adjacent enemies.";
    else if (card.fightingClass === FIGHTING_CLASS.PIERCER) desc = "Fires a beam. Stops at first unit. If enemy, penetrates straight through them up to the Amplifier limit.";
    else if (card.fightingClass === FIGHTING_CLASS.RANGER) desc = "Ignores blocking units. Can target any 1 specific enemy anywhere along its line of sight up to Amplifier distance.";

    document.getElementById('inspect-desc').innerText = desc;

    const cardElement = document.getElementById('inspect-card');
    cardElement.className = 'premium-card-25d ' + (card.owner === PLAYER.P1 ? 'friendly' : 'enemy');

    modal.classList.remove('modal-hidden');
    modal.classList.add('modal-visible');
}

function closeInspectModal() {
    const modal = document.getElementById('inspect-modal');
    modal.classList.remove('modal-visible');
    modal.classList.add('modal-hidden');
}

// Mute button logic
document.getElementById('btn-mute').addEventListener('click', (e) => {
    if (window.AudioSys) {
        window.AudioSys.isMuted = !window.AudioSys.isMuted;
        e.target.innerText = window.AudioSys.isMuted ? '🔇' : '🔊';
    }
});

initGame();
