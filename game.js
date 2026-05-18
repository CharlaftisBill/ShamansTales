// --- Configurations ---
const DECK_SIZE = 16; //16 OR 32

// --- ENUMS & CONSTANTS ---
const TITLE = { PAWN: 'Pawn', KNIGHT: 'Knight', BISHOP: 'Bishop', ROOK: 'Rook', QUEEN: 'Queen', KING: 'King' };
const FIGHTING_CLASS = {
    CHAMPION: 'Champion',
    GUARDIAN: 'Guardian',
    HERALD: 'Herald',
    RAVAGER: 'Ravager',
    LANCER: 'Lancer',
    HUNTER: 'Hunter',
    REVENANT: 'Revenant',
    MYSTIC: 'Mystic',
    SEALER: 'Sealer'
};
const STATE = { READY: 'Ready', EXHAUSTED: 'Exhausted' };
const PLAYER = { P1: 'Player', P2: 'AI' };

// --- Globals ---
let GameData = {};

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
        // Screen shake on attack
        document.body.classList.add('screen-shake');
        setTimeout(() => document.body.classList.remove('screen-shake'), 300);

        const fc = attackerCard.fightingClass;
        let sfxName = 'attackBrawler';
        let vfxClass = 'vfx-explosion';

        if (fc === FIGHTING_CLASS.PIERCER) {
            sfxName = 'attackPiercer';
            vfxClass = 'vfx-laser-beam';
        } else if (fc === FIGHTING_CLASS.RANGER || fc === FIGHTING_CLASS.HUNTER) {
            sfxName = 'attackRanger';
            vfxClass = 'vfx-sniper-crosshair';
        }

        if (window.AudioSys) AudioSys.playSFX(sfxName);

        // Hunter Arc Drawing
        if (fc === FIGHTING_CLASS.HUNTER && attackerX !== undefined && attackerY !== undefined) {
            const boardContainer = document.getElementById('board');
            if (boardContainer) {
                targetCoords.forEach(t => {
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('class', 'vfx-hunter-arc-svg');
                    svg.setAttribute('viewBox', '0 0 100 100');
                    svg.setAttribute('preserveAspectRatio', 'none');
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    
                    // Cells are 20% of width/height. We use 100x100 viewBox so 20 = 20%
                    const startPxX = (attackerX * 20) + 10;
                    const startPxY = (attackerY * 20) + 10;
                    const endPxX = (t.x * 20) + 10;
                    const endPxY = (t.y * 20) + 10;
                    
                    // Control point for arc (push it upwards relative to the board)
                    const midX = (startPxX + endPxX) / 2;
                    const midY = (startPxY + endPxY) / 2 - 30; // 30% jump
                    
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
        case FIGHTING_CLASS.CHAMPION: return '⚔️';
        case FIGHTING_CLASS.GUARDIAN: return '🛡️';
        case FIGHTING_CLASS.HERALD: return '👼';
        case FIGHTING_CLASS.RAVAGER: return '🪓';
        case FIGHTING_CLASS.LANCER: return '🔱';
        case FIGHTING_CLASS.HUNTER: return '🏹';
        case FIGHTING_CLASS.REVENANT: return '🪦';
        case FIGHTING_CLASS.MYSTIC: return '⚕️';
        case FIGHTING_CLASS.SEALER: return '📃';
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
        this.status = { sealedTurns: 0, heraldBoost: 0, revenantActive: false };
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

    getRaycastTargets(startX, startY, card) {
        let rays = [];
        const directions = this.getPoVDirections(card.title, card.owner);
        // Knights jump to exactly their dir spot, Pawns and Kings move 1, others move indefinitely (up to edge)
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

                if (currentX >= 0 && currentX < 5 && currentY >= 0 && currentY < 5) {
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

    getAttackOptions(attackerX, attackerY, attackerCard) {
        let options = [];
        let rays = this.getRaycastTargets(attackerX, attackerY, attackerCard);

        const fc = attackerCard.fightingClass;
        const amp = attackerCard.fcAmplifier;
        let baseInf = attackerCard.influence + (attackerCard.status.heraldBoost || 0);
        
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
                            let targetDef = target.influence + (target.fightingClass === FIGHTING_CLASS.GUARDIAN ? target.fcAmplifier : 0);
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
                            let targetDef = target.influence + (target.fightingClass === FIGHTING_CLASS.GUARDIAN ? target.fcAmplifier : 0);
                            let affected = [ray[i]];
                            if (baseInf >= targetDef) {
                                const adjacent = [
                                    { x: ray[i].x - 1, y: ray[i].y }, { x: ray[i].x + 1, y: ray[i].y },
                                    { x: ray[i].x, y: ray[i].y - 1 }, { x: ray[i].x, y: ray[i].y + 1 },
                                    { x: ray[i].x - 1, y: ray[i].y - 1 }, { x: ray[i].x + 1, y: ray[i].y + 1 },
                                    { x: ray[i].x - 1, y: ray[i].y + 1 }, { x: ray[i].x + 1, y: ray[i].y - 1 }
                                ];
                                adjacent.forEach(adj => {
                                    if (adj.x >= 0 && adj.x < 5 && adj.y >= 0 && adj.y < 5) {
                                        const splashTarget = GameState.board[adj.y][adj.x];
                                        if (splashTarget && splashTarget.owner !== attackerCard.owner) {
                                            let splashDef = splashTarget.influence + (splashTarget.fightingClass === FIGHTING_CLASS.GUARDIAN ? splashTarget.fcAmplifier : 0);
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
            } else if (fc === FIGHTING_CLASS.MYSTIC || fc === FIGHTING_CLASS.HERALD) {
                for (let i = 0; i < ray.length; i++) {
                    const target = GameState.board[ray[i].y][ray[i].x];
                    if (target) {
                        if (target.owner === attackerCard.owner) {
                            if (fc === FIGHTING_CLASS.MYSTIC && target.state === STATE.EXHAUSTED && target.influence <= amp) {
                                options.push({ primary: ray[i], affected: [ray[i]] });
                            } else if (fc === FIGHTING_CLASS.HERALD && target.state === STATE.READY) {
                                options.push({ primary: ray[i], affected: [ray[i]] });
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

// --- SETUP ---
function loadDeck(owner, themeName) {
    const deck = [];

    const deckBlueprint = GameData[themeName];
    if (!deckBlueprint) {
        console.error(`ERROR: Theme ${themeName} not found in decks.json!`);
        return deck;
    }

    deckBlueprint.forEach(cardData => {
        deck.push(new Card(
            cardData.name,
            cardData.title,
            cardData.influence,
            cardData.cost,
            cardData.fightingClass,
            cardData.fcAmplifier,
            owner
        ));
    });

    // Fisher-Yates Shuffle Algorithm
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

    GameState.decks[PLAYER.P1] = loadDeck(PLAYER.P1, "Greek");
    GameState.decks[PLAYER.P2] = loadDeck(PLAYER.P2, "Norse");

    for (let i = 0; i < 6; i++) {
        GameState.hands[PLAYER.P1].push(GameState.decks[PLAYER.P1].pop());
        GameState.hands[PLAYER.P2].push(GameState.decks[PLAYER.P2].pop());
    }

    initBoardDOM();

    GameState.log("MULLIGAN PHASE: Select up to 6 cards to replace, or keep hand to draw an extra card!");
    updateUI();
}

// --- RENDERING HELPERS ---
function generateCardHTML(card, overlayHtml = '', mathBonus = null) {
    let statusHtml = '';
    if (card.status.sealedTurns > 0) {
        statusHtml += `<div class="status-sealed-overlay">🔗<br>${card.status.sealedTurns}</div>`;
    }

    let mathHelperHtml = '';
    if (mathBonus) {
        mathHelperHtml = `<span class="math-helper">${mathBonus > 0 ? '+' : ''}${mathBonus}</span>`;
    }

    return `${overlayHtml}${statusHtml}
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
            <div class="hand-badge inf-badge" title="Influence" style="margin: 0; position: relative;">
                ${card.influence}
                ${mathHelperHtml}
            </div>
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
    if (GameState.checkmatePhaseActive) {
        document.body.classList.add('checkmate-phase');
    } else {
        document.body.classList.remove('checkmate-phase');
    }

    let hoverTargetCoords = []; // Store {x, y, isAlly}
    let validPrimaryCoords = [];
    let cleavePreviewCoords = []; // Store {x, y, isAlly}

    if (GameState.hoveredCell && !GameState.isMulliganPhase) {
        const hCard = GameState.board[GameState.hoveredCell.y][GameState.hoveredCell.x];
        if (hCard && hCard.state === STATE.READY && !GameState.activeAttacker) {
            const opts = RulesEngine.getAttackOptions(GameState.hoveredCell.x, GameState.hoveredCell.y, hCard);
            opts.forEach(opt => {
                opt.affected.forEach(target => {
                    let targetCard = GameState.board[target.y][target.x];
                    let isAlly = targetCard ? targetCard.owner === hCard.owner : false;
                    hoverTargetCoords.push({x: target.x, y: target.y, isAlly});
                });
            });
        }
    }

    if (GameState.activeAttacker && !GameState.isMulliganPhase) {
        const activeOpts = RulesEngine.getAttackOptions(GameState.activeAttacker.x, GameState.activeAttacker.y, GameState.activeAttacker.card);
        activeOpts.forEach(opt => validPrimaryCoords.push(opt.primary));
        if (GameState.hoveredCell) {
            const hoveredOpt = activeOpts.find(opt => opt.primary.x === GameState.hoveredCell.x && opt.primary.y === GameState.hoveredCell.y);
            if (hoveredOpt) {
                hoveredOpt.affected.forEach(target => {
                    let targetCard = GameState.board[target.y][target.x];
                    let isAlly = targetCard ? targetCard.owner === GameState.activeAttacker.card.owner : false;
                    cleavePreviewCoords.push({x: target.x, y: target.y, isAlly});
                });
            }
        }
    }

    // Render Board
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            const cell = document.getElementById(`cell-${x}-${y}`);
            const card = GameState.board[y][x];

            const isHoveredCell = (GameState.hoveredCell && GameState.hoveredCell.x === x && GameState.hoveredCell.y === y);
            
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
                const stateClass = card.state === STATE.EXHAUSTED ? 'exhausted' : 'ready';
                const paymentClass = GameState.selectedPaymentCards.some(p => p.x === x && p.y === y) ? 'payment-selected' : '';
                const attackerClass = (GameState.activeAttacker && GameState.activeAttacker.x === x && GameState.activeAttacker.y === y) ? 'active-attacker' : '';

                const targetClass = validPrimaryCoords.some(t => t.x === x && t.y === y) ? 'valid-target' : '';
                const hoverClass = isHoverEnemy ? 'hover-enemy-preview' : isHoverAlly ? 'hover-ally-preview' : '';
                const cleaveClass = isCleaveEnemy ? 'cleave-enemy-preview' : isCleaveAlly ? 'cleave-ally-preview' : '';

                let statusClasses = [];
                if (card.status.heraldBoost > 0) statusClasses.push('status-herald');
                if (card.status.revenantActive) statusClasses.push('status-revenant');
                if (card.status.sealedTurns > 0) statusClasses.push('status-sealed');

                let mathBonus = null;
                // If it's a target being previewed, show Guardian def buff
                if ((isHoverEnemy || isCleaveEnemy || isHoverAlly || isCleaveAlly) && card.fightingClass === FIGHTING_CLASS.GUARDIAN) {
                    mathBonus = card.fcAmplifier;
                }
                // If it's the attacker being previewed or active, show Champion buff
                if ((isHoveredCell && card.fightingClass === FIGHTING_CLASS.CHAMPION && !GameState.isMulliganPhase) || 
                    (attackerClass && card.fightingClass === FIGHTING_CLASS.CHAMPION)) {
                    mathBonus = card.fcAmplifier;
                }
                if (card.status.heraldBoost > 0) {
                    mathBonus = (mathBonus || 0) + card.status.heraldBoost;
                }

                let overlayHtml = '';
                if (isHoveredCell && card.state === STATE.EXHAUSTED && !GameState.isMulliganPhase) {
                    const currentInf = GameState.getCardsOnBoard(card.owner).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + f.card.influence, 0);
                    overlayHtml = `<div class="exhausted-math">+${card.influence} (${currentInf + card.influence})</div>`;
                }

                cell.innerHTML = `<div class="card-entity ${ownerClass} ${stateClass} ${paymentClass} ${attackerClass} ${targetClass} ${hoverClass} ${cleaveClass} ${statusClasses.join(' ')}">
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

    // ACTION: CLICKING A TARGET (ATTACK / ABILITY PHASE)
    if (GameState.activeAttacker) {
        const activeOpts = RulesEngine.getAttackOptions(GameState.activeAttacker.x, GameState.activeAttacker.y, GameState.activeAttacker.card);
        const selectedOpt = activeOpts.find(opt => opt.primary.x === x && opt.primary.y === y);

        if (selectedOpt) {
            const attacker = GameState.activeAttacker.card;
            let hits = 0;
            let affectedCoords = [];

            if (attacker.fightingClass === FIGHTING_CLASS.MYSTIC || attacker.fightingClass === FIGHTING_CLASS.HERALD) {
                selectedOpt.affected.forEach(targetObj => {
                    affectedCoords.push({ x: targetObj.x, y: targetObj.y });
                    let tCard = GameState.board[targetObj.y][targetObj.x];
                    if (attacker.fightingClass === FIGHTING_CLASS.MYSTIC) {
                        if (tCard.status.sealedTurns === 0) tCard.state = STATE.READY;
                    } else if (attacker.fightingClass === FIGHTING_CLASS.HERALD) {
                        tCard.status.heraldBoost = attacker.fcAmplifier;
                    }
                    hits++;
                });
                GameState.log(`Used ${attacker.title}'s ability from [${GameState.activeAttacker.x}, ${GameState.activeAttacker.y}]. Affected ${hits} friendly card(s).`); 
            } else {
                selectedOpt.affected.forEach(targetObj => {
                    affectedCoords.push({ x: targetObj.x, y: targetObj.y });
                    let tCard = GameState.board[targetObj.y][targetObj.x];
                    let targetDef = tCard.influence + (tCard.fightingClass === FIGHTING_CLASS.GUARDIAN ? tCard.fcAmplifier : 0);
                    let attackerAtk = attacker.influence + (attacker.fightingClass === FIGHTING_CLASS.CHAMPION ? attacker.fcAmplifier : 0) + (attacker.status.heraldBoost || 0);

                    if (attackerAtk >= targetDef) {
                        if (tCard.fightingClass === FIGHTING_CLASS.SEALER) {
                            attacker.status.sealedTurns = tCard.fcAmplifier;
                        }
                        tCard.state = STATE.EXHAUSTED;
                        hits++;
                    }
                });
                GameState.log(`Attacked with ${attacker.title} from [${GameState.activeAttacker.x}, ${GameState.activeAttacker.y}]. Exhausted ${hits} enemy card(s).`); 
            }

            attacker.state = STATE.EXHAUSTED;
            const attackerX = GameState.activeAttacker.x;
            const attackerY = GameState.activeAttacker.y;

            GameState.activeAttacker = null;
            GameState.actionsRemaining--;
            updateUI();

            setTimeout(() => {
                VFXManager.triggerAttack(attacker, affectedCoords, attackerX, attackerY);
                setTimeout(() => VFXManager.triggerExhaust(attackerX, attackerY), 200);
                if (attacker.fightingClass !== FIGHTING_CLASS.MYSTIC && attacker.fightingClass !== FIGHTING_CLASS.HERALD) {
                    selectedOpt.affected.forEach(t => {
                        let tCard = GameState.board[t.y][t.x];
                        let tDef = tCard.influence + (tCard.fightingClass === FIGHTING_CLASS.GUARDIAN ? tCard.fcAmplifier : 0);
                        let aAtk = attacker.influence + (attacker.fightingClass === FIGHTING_CLASS.CHAMPION ? attacker.fcAmplifier : 0) + (attacker.status.heraldBoost || 0);
                        if (aAtk >= tDef) {
                            setTimeout(() => VFXManager.triggerExhaust(t.x, t.y), 200);
                        }
                    });
                }
            }, 0);
            return;
        }

        // If not a valid attack target, and we clicked an enemy, just return
        if (clickedCard && clickedCard.owner === PLAYER.P2) return;
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
            if (clickedCard.status.sealedTurns > 0) {
                GameState.log(`Cannot resurge ${clickedCard.title}, it is Sealed for ${clickedCard.status.sealedTurns} more turn(s)!`);
                return;
            }
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
            
            if (attacker.card.fightingClass === FIGHTING_CLASS.MYSTIC || attacker.card.fightingClass === FIGHTING_CLASS.HERALD) {
                for (let target of opt.affected) {
                    let tCard = GameState.board[target.y][target.x];
                    if (attacker.card.fightingClass === FIGHTING_CLASS.MYSTIC && tCard.status.sealedTurns > 0) continue;
                    targetDamage += tCard.influence;
                    validHits++;
                }
            } else {
                for (let target of opt.affected) {
                    let tCard = GameState.board[target.y][target.x];
                    let targetDef = tCard.influence + (tCard.fightingClass === FIGHTING_CLASS.GUARDIAN ? tCard.fcAmplifier : 0);
                    let attackerAtk = attacker.card.influence + (attacker.card.fightingClass === FIGHTING_CLASS.CHAMPION ? attacker.card.fcAmplifier : 0) + (attacker.card.status.heraldBoost || 0);

                    if (attackerAtk >= targetDef) {
                        targetDamage += tCard.influence;
                        validHits++;
                    }
                }
            }

            if (validHits > 0) {
                let delta = targetDamage - attacker.card.influence;
                if (attacker.card.fightingClass === FIGHTING_CLASS.MYSTIC || attacker.card.fightingClass === FIGHTING_CLASS.HERALD) {
                    delta = targetDamage; 
                }
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
        if (exCard.card.status.sealedTurns > 0) continue;
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
                let attacker = bestMove.attacker.card;
                let aAtk = attacker.influence + (attacker.fightingClass === FIGHTING_CLASS.CHAMPION ? attacker.fcAmplifier : 0) + (attacker.status.heraldBoost || 0);

                bestMove.opt.affected.forEach(t => {
                    affectedCoords.push({ x: t.x, y: t.y });
                    let tCard = GameState.board[t.y][t.x];
                    if (attacker.fightingClass === FIGHTING_CLASS.MYSTIC) {
                        if (tCard.status.sealedTurns === 0) tCard.state = STATE.READY;
                    } else if (attacker.fightingClass === FIGHTING_CLASS.HERALD) {
                        tCard.status.heraldBoost = attacker.fcAmplifier;
                    } else {
                        let tDef = tCard.influence + (tCard.fightingClass === FIGHTING_CLASS.GUARDIAN ? tCard.fcAmplifier : 0);
                        if (aAtk >= tDef) {
                            if (tCard.fightingClass === FIGHTING_CLASS.SEALER) {
                                attacker.status.sealedTurns = tCard.fcAmplifier;
                            }
                            tCard.state = STATE.EXHAUSTED;
                        }
                    }
                });
                attacker.state = STATE.EXHAUSTED;
                GameState.log(`AI Action: Used ${attacker.title} from [${bestMove.attacker.x}, ${bestMove.attacker.y}]. Affected ${bestMove.validHits} target(s).`);

                updateUI();

                setTimeout(() => {
                    VFXManager.triggerAttack(attacker, affectedCoords, bestMove.attacker.x, bestMove.attacker.y);
                    setTimeout(() => VFXManager.triggerExhaust(bestMove.attacker.x, bestMove.attacker.y), 200);
                    if (attacker.fightingClass !== FIGHTING_CLASS.MYSTIC && attacker.fightingClass !== FIGHTING_CLASS.HERALD) {
                        bestMove.opt.affected.forEach(t => {
                            let tCard = GameState.board[t.y][t.x];
                            let tDef = tCard.influence + (tCard.fightingClass === FIGHTING_CLASS.GUARDIAN ? tCard.fcAmplifier : 0);
                            if (aAtk >= tDef) {
                                setTimeout(() => VFXManager.triggerExhaust(t.x, t.y), 200);
                            }
                        });
                    }
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


function triggerStartOfTurn(player) {
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            let cardObj = GameState.board[row][col];
            if (cardObj && cardObj.owner === player) {
                if (cardObj.status.sealedTurns > 0) cardObj.status.sealedTurns--;
                cardObj.status.heraldBoost = 0;
                cardObj.status.revenantActive = false;

                if (cardObj.fightingClass === FIGHTING_CLASS.REVENANT && cardObj.state === STATE.EXHAUSTED && cardObj.status.sealedTurns === 0) {
                    cardObj.state = STATE.READY;
                    cardObj.status.revenantActive = true;
                    GameState.log(`${cardObj.title} Auto-Resurged via Revenant!`);
                }
            }
        }
    }
}

function passTurnToPlayer() {
    GameState.turn = PLAYER.P1;
    triggerStartOfTurn(PLAYER.P1);
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
    triggerStartOfTurn(PLAYER.P2);
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
    switch (card.fightingClass) {
        case FIGHTING_CLASS.CHAMPION: desc = "Gains temporary Influence equal to Amplifier when attacking."; break;
        case FIGHTING_CLASS.GUARDIAN: desc = "Gains temporary Influence equal to Amplifier when defending against an attack."; break;
        case FIGHTING_CLASS.HERALD: desc = "Use 1 Action to buff a friendly unit in range. Grants +Amp Influence on their next attack."; break;
        case FIGHTING_CLASS.RAVAGER: desc = "Hits primary target. Splash damage exhausts all adjacent enemies with Influence ≤ Amp."; break;
        case FIGHTING_CLASS.LANCER: desc = "Pierces through a line, exhausting up to Amp number of enemies."; break;
        case FIGHTING_CLASS.HUNTER: desc = "Shoots over blocking units in a straight line. Ignores up to Amp number of blocking units."; break;
        case FIGHTING_CLASS.REVENANT: desc = "Auto-resurges at the start of your turn for free."; break;
        case FIGHTING_CLASS.MYSTIC: desc = "Use 1 Action to resurge an exhausted friendly unit in range if their Influence is ≤ Amp."; break;
        case FIGHTING_CLASS.SEALER: desc = "If this unit is exhausted by an enemy attack, the attacker is sealed (cannot be readied) for Amp turns."; break;
    }

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


async function initializeEngine() {
    try {
        const response = await fetch('decks.json');
        GameData = await response.json();
        console.log("✅ Game Data loaded successfully:", GameData);

        initGame();

    } catch (error) {
        console.error("🚨 Failed to load decks.json. Make sure you are running a local server!", error);
    }
}

initializeEngine();
