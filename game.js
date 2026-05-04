// --- ENUMS & CONSTANTS ---
const TITLE = { PAWN: 'Pawn', KNIGHT: 'Knight', BISHOP: 'Bishop', ROOK: 'Rook', QUEEN: 'Queen', KING: 'King' };
const FIGHTING_CLASS = { PIERCER: 'Piercer', RANGER: 'Ranger', BRAWLER: 'Brawler' };
const STATE = { READY: 'Ready', EXHAUSTED: 'Exhausted' };
const PLAYER = { P1: 'Player', P2: 'AI' };

// Helper to get the right icon for the UI
function getClassIcon(fightingClass) {
    switch (fightingClass) {
        case FIGHTING_CLASS.PIERCER: return '🔱';
        case FIGHTING_CLASS.RANGER:  return '🏹';
        case FIGHTING_CLASS.BRAWLER: return '⚔️';
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
    actionConsumed: false,
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

    log(message) {
        document.getElementById('action-log').innerText = message;
        console.log(message);
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
            case TITLE.ROOK:   return [{dx:0, dy:1}, {dx:0, dy:-1}, {dx:1, dy:0}, {dx:-1, dy:0}];
            case TITLE.BISHOP: return [{dx:1, dy:1}, {dx:1, dy:-1}, {dx:-1, dy:1}, {dx:-1, dy:-1}];
            case TITLE.QUEEN:  
            case TITLE.KING:   return [{dx:0, dy:1}, {dx:0, dy:-1}, {dx:1, dy:0}, {dx:-1, dy:0}, {dx:1, dy:1}, {dx:1, dy:-1}, {dx:-1, dy:1}, {dx:-1, dy:-1}];
            case TITLE.PAWN:   return [{dx:-1, dy:up}, {dx:1, dy:up}]; 
            case TITLE.KNIGHT: return [{dx:1, dy:2}, {dx:2, dy:1}, {dx:-1, dy:2}, {dx:-2, dy:1}, {dx:1, dy:-2}, {dx:2, dy:-1}, {dx:-1, dy:-2}, {dx:-2, dy:-1}];
            default: return [];
        }
    },

    getAttackOptions(attackerX, attackerY, attackerCard) {
        let options = [];
        const dirs = this.getPoVDirections(attackerCard.title, attackerCard.owner);
        const fc = attackerCard.fightingClass;
        const amp = attackerCard.fcAmplifier;

        if (fc === FIGHTING_CLASS.RANGER) {
            for (let dir of dirs) {
                for (let step = 1; step <= amp; step++) {
                    let nx = attackerX + (dir.dx * step);
                    let ny = attackerY + (dir.dy * step);
                    if (nx < 0 || nx > 4 || ny < 0 || ny > 4) break;
                    let hitCard = GameState.board[ny][nx];

                    if (hitCard) {
                        if (hitCard.owner !== attackerCard.owner && hitCard.state === STATE.READY) {
                            options.push({ primary: {x: nx, y: ny}, affected: [{x: nx, y: ny, card: hitCard}] });
                        }
                        break; 
                    }
                }
            }
        } 
        else if (fc === FIGHTING_CLASS.PIERCER) {
            for (let dir of dirs) {
                let affected = [];
                for (let dist = 1; dist < 5; dist++) {
                    let nx = attackerX + (dir.dx * dist);
                    let ny = attackerY + (dir.dy * dist);
                    if (nx < 0 || nx > 4 || ny < 0 || ny > 4) break;
                    let hitCard = GameState.board[ny][nx];

                    if (dist === 1 && (!hitCard || hitCard.owner === attackerCard.owner || hitCard.state === STATE.EXHAUSTED)) break; 

                    if (hitCard) {
                        if (hitCard.owner !== attackerCard.owner && hitCard.state === STATE.READY) {
                            affected.push({x: nx, y: ny, card: hitCard});
                            if (affected.length >= amp) break; 
                        } else {
                            break; 
                        }
                    }
                }
                if (affected.length > 0) options.push({ primary: {x: affected[0].x, y: affected[0].y}, affected: affected });
            }
        }
        else if (fc === FIGHTING_CLASS.BRAWLER) {
            let adjEnemies = [];
            for (let dir of dirs) {
                let nx = attackerX + dir.dx;
                let ny = attackerY + dir.dy;
                if (nx >= 0 && nx <= 4 && ny >= 0 && ny <= 4) {
                    let hitCard = GameState.board[ny][nx];
                    if (hitCard && hitCard.owner !== attackerCard.owner && hitCard.state === STATE.READY) {
                        adjEnemies.push({x: nx, y: ny, card: hitCard});
                    }
                }
            }
            for (let primary of adjEnemies) {
                let affected = [primary];
                for (let other of adjEnemies) {
                    if (affected.length >= amp) break;
                    if (other.x !== primary.x || other.y !== primary.y) affected.push(other);
                }
                options.push({ primary: {x: primary.x, y: primary.y}, affected: affected });
            }
        }
        return options;
    }
};

// --- SETUP ---
function generateDeck(owner, themeName) {
    const deck = [];
    for(let i=0; i<8; i++) deck.push(new Card(`${themeName} Pawn`, TITLE.PAWN, 1, 0, FIGHTING_CLASS.BRAWLER, 1, owner));
    for(let i=0; i<2; i++) {
        deck.push(new Card(`${themeName} Knight`, TITLE.KNIGHT, 3, 2, FIGHTING_CLASS.RANGER, 2, owner));
        deck.push(new Card(`${themeName} Bishop`, TITLE.BISHOP, 3, 2, FIGHTING_CLASS.PIERCER, 2, owner)); 
        deck.push(new Card(`${themeName} Rook`, TITLE.ROOK, 4, 3, FIGHTING_CLASS.PIERCER, 2, owner)); 
    }
    deck.push(new Card(`${themeName} Queen`, TITLE.QUEEN, 8, 4, FIGHTING_CLASS.BRAWLER, 3, owner));
    deck.push(new Card(`${themeName} King`, TITLE.KING, 10, 5, FIGHTING_CLASS.BRAWLER, 1, owner));
    return deck.sort(() => Math.random() - 0.5);
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

    screen.style.display = 'flex'; // Show the screen
}

function initGame() {
    GameState.decks[PLAYER.P1] = generateDeck(PLAYER.P1, "Greek");
    GameState.decks[PLAYER.P2] = generateDeck(PLAYER.P2, "Norse");
    
    for(let i = 0; i < 6; i++) {
        GameState.hands[PLAYER.P1].push(GameState.decks[PLAYER.P1].pop());
        GameState.hands[PLAYER.P2].push(GameState.decks[PLAYER.P2].pop());
    }
    
    initBoardDOM();

    GameState.log("MULLIGAN PHASE: Select up to 2 cards to replace, or keep hand to draw an extra card!");
    updateUI();
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
            
            cell.addEventListener('click', () => handleCellClick(x, y));
            cell.addEventListener('mouseenter', () => { GameState.hoveredCell = {x, y}; updateUI(); });
            cell.addEventListener('mouseleave', () => { GameState.hoveredCell = null; updateUI(); });
            
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
                    ${overlayHtml}
                    <div class="class-badge" title="${card.fightingClass} (Amp: ${card.fcAmplifier})">
                        ${getClassIcon(card.fightingClass)} <span>${card.fcAmplifier}</span>
                    </div>
                    <span style="font-size:0.8em; margin-bottom:4px;">${card.title}</span>
                    <span style="font-size:0.6em">Cost: ${card.cost}</span>
                    <span style="font-size:0.7em">Inf: ${card.influence}</span>
                </div>`;
            } else {
                if (isHoveredCell && !GameState.isMulliganPhase) cell.innerHTML = `<span style="color:#7f8c8d; font-size:0.8em; pointer-events:none;">[${x},${y}]</span>`;
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
        cardEl.style.width = '60px'; 
        cardEl.style.cursor = 'pointer';
        
        cardEl.innerHTML = `
            <div class="class-badge" title="${card.fightingClass} (Amp: ${card.fcAmplifier})">
                ${getClassIcon(card.fightingClass)} <span>${card.fcAmplifier}</span>
            </div>
            <span style="font-size:0.8em; margin-bottom:4px;">${card.title}</span>
            <span style="font-size:0.6em">Cost: ${card.cost}</span>
            <span style="font-size:0.6em">Inf: ${card.influence}</span>
        `;
        
        cardEl.addEventListener('click', () => {
            // MULLIGAN PHASE LOGIC
            if (GameState.isMulliganPhase) {
                const mIdx = GameState.mulliganSelection.indexOf(index);
                if (mIdx > -1) {
                    GameState.mulliganSelection.splice(mIdx, 1); // Deselect
                } else if (GameState.mulliganSelection.length < 2) {
                    GameState.mulliganSelection.push(index); // Select (max 2)
                }
                updateUI();
                return;
            }

            // NORMAL TURN LOGIC
            if (GameState.actionConsumed) { GameState.log("Action used! End Turn."); return; }
            if (GameState.selectedCardIndex !== index) GameState.selectedPaymentCards = []; 
            GameState.selectedCardIndex = index;
            GameState.activeAttacker = null; 
            GameState.log(`Selected ${card.title}.`);
            updateUI(); 
        });
        playerHandEl.appendChild(cardEl);
    });

    // Update Controls Text dynamically based on phase
    const btnEndTurn = document.getElementById('btn-end-turn');
    if (GameState.isMulliganPhase) {
        document.getElementById('turn-indicator').innerText = `Phase: Mulligan`;
        btnEndTurn.innerText = `Confirm (${GameState.mulliganSelection.length}/2)`;
        btnEndTurn.style.backgroundColor = '#9b59b6'; // Purple button for Mulligan
    } else {
        const statusText = GameState.actionConsumed ? "(Turn Complete)" : "(Action Available)";
        document.getElementById('turn-indicator').innerText = `Turn: ${GameState.turn} ${statusText}`;
        btnEndTurn.innerText = `End Turn`; 
        btnEndTurn.style.backgroundColor = 'var(--card-ready)'; // Back to blue
    }
    
    document.getElementById('player-deck-count').innerText = GameState.decks[PLAYER.P1].length;
    const p1Influence = GameState.getCardsOnBoard(PLAYER.P1).filter(f => f.card.state === STATE.READY).reduce((sum, f) => sum + f.card.influence, 0);
    document.getElementById('player-influence').innerText = p1Influence;

    const aiDeckEl = document.getElementById('ai-deck-count');
    if (aiDeckEl) {
        aiDeckEl.innerText = GameState.decks[PLAYER.P2].length;
    }
    
    const aiInfEl = document.getElementById('ai-influence');
    if (aiInfEl) {
        const p2Influence = GameState.getCardsOnBoard(PLAYER.P2)
            .filter(f => f.card.state === STATE.READY)
            .reduce((sum, f) => sum + f.card.influence, 0);
        aiInfEl.innerText = p2Influence;
    }
}

// --- INTERACTION LOGIC ---
function handleCellClick(x, y) {
    if (GameState.isMulliganPhase) {
        GameState.log("Please complete your Mulligan selection first!");
        return;
    }
    
    if (GameState.turn !== PLAYER.P1) return;
    if (GameState.actionConsumed) { GameState.log("Action consumed! Please End Turn."); return; }

    const clickedCard = GameState.board[y][x];

    if (clickedCard && clickedCard.owner === PLAYER.P2) {
        if (!GameState.activeAttacker) return; 

        const activeOpts = RulesEngine.getAttackOptions(GameState.activeAttacker.x, GameState.activeAttacker.y, GameState.activeAttacker.card);
        const selectedOpt = activeOpts.find(opt => opt.primary.x === x && opt.primary.y === y);

        if (!selectedOpt) return;

        const attacker = GameState.activeAttacker.card;
        let hits = 0;

        selectedOpt.affected.forEach(targetObj => {
            if (targetObj.card.influence <= attacker.influence) {
                targetObj.card.state = STATE.EXHAUSTED;
                hits++;
            }
        });

        GameState.log(`Attack executed! Exhausted ${hits} enemy cards.`);
        attacker.state = STATE.EXHAUSTED;
        GameState.activeAttacker = null;
        GameState.actionConsumed = true;
        updateUI();
        return;
    }

    if (clickedCard && clickedCard.owner === PLAYER.P1) {
        if (GameState.selectedCardIndex !== null) {
            const cardToSummon = GameState.hands[PLAYER.P1][GameState.selectedCardIndex];
            if (clickedCard.state === STATE.EXHAUSTED) return;
            const paymentIdx = GameState.selectedPaymentCards.findIndex(p => p.x === x && p.y === y);
            if (paymentIdx > -1) GameState.selectedPaymentCards.splice(paymentIdx, 1);
            else if (GameState.selectedPaymentCards.length < cardToSummon.cost) GameState.selectedPaymentCards.push({x, y, card: clickedCard});
            updateUI();
            return;
        }

        if (clickedCard.state === STATE.EXHAUSTED && GameState.selectedCardIndex === null) {
            clickedCard.state = STATE.READY;
            GameState.actionConsumed = true; 
            GameState.activeAttacker = null;
            GameState.log(`Resurged ${clickedCard.title}. Action consumed!`);
            updateUI();
            return;
        }

        if (clickedCard.state === STATE.READY && GameState.selectedCardIndex === null) {
            GameState.activeAttacker = {x, y, card: clickedCard};
            GameState.log(`Selected ${clickedCard.title} to attack. Hover targets to see blast zone.`);
            updateUI();
            return;
        }
    }

    if (!clickedCard && GameState.selectedCardIndex !== null) {
        const cardToSummon = GameState.hands[PLAYER.P1][GameState.selectedCardIndex];
        if (!RulesEngine.isValidSummonSquare(x, y, cardToSummon, PLAYER.P1)) return;
        if (GameState.selectedPaymentCards.length < cardToSummon.cost) return;

        GameState.selectedPaymentCards.forEach(p => GameState.board[p.y][p.x].state = STATE.EXHAUSTED);
        const newlySummonedCard = GameState.hands[PLAYER.P1].splice(GameState.selectedCardIndex, 1)[0];
        if (!RulesEngine.isAdjacentToFriendly(x, y, PLAYER.P1)) newlySummonedCard.state = STATE.EXHAUSTED;
        
        GameState.board[y][x] = newlySummonedCard;
        GameState.selectedCardIndex = null;
        GameState.selectedPaymentCards = [];
        GameState.actionConsumed = true; 
        updateUI(); 
    }
}

// --- AI ENGINE & TURN MANAGEMENT ---
function executeAITurn() {
    GameState.log("AI is evaluating all possible futures...");
    
    setTimeout(() => {
        // 0. AI DRAW PHASE (Remains exactly the same)
        if (GameState.decks[PLAYER.P2].length > 0) {
            GameState.hands[PLAYER.P2].push(GameState.decks[PLAYER.P2].pop());
        } else if (!GameState.checkmatePhaseActive) {
            GameState.checkmatePhaseActive = true;
            GameState.turnsUntilEnd = 1;
            GameState.log("🚨 CHECKMATE PHASE! AI deck is empty. This is your FINAL TURN! 🚨");
            document.getElementById('turn-indicator').style.color = '#e74c3c';
        }

        if (GameState.checkmatePhaseActive && GameState.turnsUntilEnd === 0) {
            triggerGameOver();
            return;
        }

        const aiReadyCards = GameState.getCardsOnBoard(PLAYER.P2).filter(c => c.card.state === STATE.READY);
        const aiExhausted = GameState.getCardsOnBoard(PLAYER.P2).filter(c => c.card.state === STATE.EXHAUSTED);
        
        // This array will hold every single possible move and its "Score" (Delta)
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
                    // DELTA: How much enemy influence we destroy MINUS the influence we exhaust to do it
                    let delta = targetDamage - attacker.card.influence;
                    possibleMoves.push({ type: 'ATTACK', delta, attacker, opt, validHits });
                }
            }
        }

        // --- 2. EVALUATE ALL SUMMONS ---
        let affordableCards = GameState.hands[PLAYER.P2].filter(c => c.cost <= aiReadyCards.length);
        
        // To pay the cost optimally, the AI should exhaust its WEAKEST cards first!
        let cheapestPaymentCards = [...aiReadyCards].sort((a,b) => a.card.influence - b.card.influence);

        for (let cardToSummon of affordableCards) {
            let costInfluence = 0;
            let paymentCards = [];
            for(let i = 0; i < cardToSummon.cost; i++) {
                costInfluence += cheapestPaymentCards[i].card.influence;
                paymentCards.push(cheapestPaymentCards[i]);
            }

            // Find all valid squares for this card
            for (let y = 0; y < 5; y++) {
                for (let x = 0; x < 5; x++) {
                    if (RulesEngine.isValidSummonSquare(x, y, cardToSummon, PLAYER.P2)) {
                        const isSupported = RulesEngine.isAdjacentToFriendly(x, y, PLAYER.P2);
                        
                        // DELTA: If supported, we gain its full influence. We subtract the influence of the cards we exhaust to pay for it.
                        let delta = (isSupported ? cardToSummon.influence : 0) - costInfluence;
                        
                        // We add a tiny micro-bonus (+0.1) to Summoning just to encourage the AI to put cards on the board when tied
                        delta += 0.1; 
                        
                        possibleMoves.push({ type: 'SUMMON', delta, cardToSummon, x, y, isSupported, paymentCards });
                    }
                }
            }
        }

        // --- 3. EVALUATE ALL RESURGES ---
        for (let exCard of aiExhausted) {
            // DELTA: We simply gain the influence of the card we are standing back up
            let delta = exCard.card.influence;
            possibleMoves.push({ type: 'RESURGE', delta, target: exCard });
        }

        // --- EXECUTE THE BEST MOVE ---
        if (possibleMoves.length > 0) {
            // Shuffle the array first so if there are multiple moves with the exact same score, it picks randomly
            possibleMoves.sort(() => Math.random() - 0.5);
            // Sort by highest Delta Score
            possibleMoves.sort((a, b) => b.delta - a.delta);

            const bestMove = possibleMoves[0];

            // AI will only pass its turn if literally every move actively hurts its score drastically (Delta < 0)
            if (bestMove.delta >= 0 || bestMove.type === 'SUMMON') {
                
                if (bestMove.type === 'ATTACK') {
                    bestMove.opt.affected.forEach(t => {
                        if (bestMove.attacker.card.influence >= t.card.influence) t.card.state = STATE.EXHAUSTED;
                    });
                    bestMove.attacker.card.state = STATE.EXHAUSTED;
                    GameState.log(`AI optimal move: Attack! Exhausted ${bestMove.validHits} of your card(s).`);
                } 
                else if (bestMove.type === 'SUMMON') {
                    bestMove.paymentCards.forEach(p => p.card.state = STATE.EXHAUSTED);
                    const handIdx = GameState.hands[PLAYER.P2].indexOf(bestMove.cardToSummon);
                    GameState.hands[PLAYER.P2].splice(handIdx, 1);
                    bestMove.cardToSummon.state = bestMove.isSupported ? STATE.READY : STATE.EXHAUSTED;
                    GameState.board[bestMove.y][bestMove.x] = bestMove.cardToSummon;
                    GameState.log(`AI optimal move: Summon ${bestMove.cardToSummon.title} ${bestMove.isSupported ? '(Ready)' : '(Exhausted)'}.`);
                } 
                else if (bestMove.type === 'RESURGE') {
                    bestMove.target.card.state = STATE.READY;
                    GameState.log(`AI optimal move: Resurge its ${bestMove.target.card.title}.`);
                }

                passTurnToPlayer();
                return;
            }
        }

        // FALLBACK: AI has absolutely no moves that don't destroy its own score
        GameState.log("AI calculates all moves are disadvantageous. It passes the turn.");
        passTurnToPlayer();
    }, 1200); 
}

function passTurnToPlayer() {
    GameState.turn = PLAYER.P1;
    GameState.actionConsumed = false;
    
    // Checkmate Clock
    if (GameState.checkmatePhaseActive) GameState.turnsUntilEnd--;

    // Player Draw Phase
    if (GameState.decks[PLAYER.P1].length > 0) {
        GameState.hands[PLAYER.P1].push(GameState.decks[PLAYER.P1].pop());
    } else if (!GameState.checkmatePhaseActive) {
        GameState.checkmatePhaseActive = true;
        GameState.turnsUntilEnd = 1;
        GameState.log("🚨 CHECKMATE PHASE! Your deck is empty. This is your FINAL TURN! 🚨");
        document.getElementById('turn-indicator').style.color = '#e74c3c';
    }

    updateUI();
}

// --- CONTROLS ---
document.getElementById('btn-end-turn').addEventListener('click', () => {
    if (GameState.isGameOver) return;

    if (GameState.isMulliganPhase) {
        if (GameState.mulliganSelection.length === 0) {
            if (GameState.decks[PLAYER.P1].length > 0) GameState.hands[PLAYER.P1].push(GameState.decks[PLAYER.P1].pop());
            GameState.log("Hand kept! Reward: Extra card drawn. Turn 1 Start.");
        } else {
            let toReplace = GameState.mulliganSelection.sort((a,b) => b-a); 
            toReplace.forEach(idx => {
                let discarded = GameState.hands[PLAYER.P1].splice(idx, 1)[0];
                GameState.decks[PLAYER.P1].push(discarded);
            });
            GameState.decks[PLAYER.P1].sort(() => Math.random() - 0.5);
            for (let i = 0; i < toReplace.length; i++) GameState.hands[PLAYER.P1].push(GameState.decks[PLAYER.P1].pop());
            GameState.log(`Mulligan complete. Replaced ${toReplace.length} card(s). Turn 1 Start.`);
        }
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
    
    executeAITurn();
});

initGame();


