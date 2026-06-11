// deck_viewer.js

let decksData = {};
let currentFaction = '';

const TITLE = {
    PAWN: 'Pawn',
    KNIGHT: 'Knight',
    BISHOP: 'Bishop',
    ROOK: 'Rook',
    QUEEN: 'Queen',
    KING: 'King'
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

async function loadDecks() {
    try {
        const response = await fetch('../data/decks.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        decksData = await response.json();
        
        populateDropdown();
        
        const factions = Object.keys(decksData);
        if (factions.length > 0) {
            currentFaction = factions[0];
            renderDeck(currentFaction);
        }
    } catch (error) {
        console.error("Failed to load decks:", error);
        document.getElementById('deck-grid').innerHTML = `<p style="color:red;">Error loading decks: ${error.message}</p>`;
    }
}

function populateDropdown() {
    const selector = document.getElementById('deck-selector');
    const factions = Object.keys(decksData);
    
    selector.innerHTML = '';
    factions.forEach(faction => {
        const option = document.createElement('option');
        option.value = faction;
        option.textContent = faction;
        selector.appendChild(option);
    });

    selector.addEventListener('change', async (e) => {
        currentFaction = e.target.value;
        await renderDeck(currentFaction);
    });
}

async function preloadDeck(factionName, deck) {
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('loading-progress-bar');
    const loadingText = document.getElementById('loading-text');

    loadingScreen.style.display = 'flex';
    // Use a small timeout to allow display:flex to apply before transitioning opacity
    setTimeout(() => loadingScreen.style.opacity = '1', 10);
    progressBar.style.width = '0%';
    loadingText.textContent = `Rendering ${factionName} Previews...`;

    const settings = getSettings();
    const gfx = settings.gfxQuality || 'hq';
    const ext = gfx === 'lq' ? 'webp' : 'png';

    const imageUrls = deck.map(card => `../assets/${gfx}/icons/cards/${factionName.toLowerCase()}/${card.id}.${ext}`);
    
    let loadedImages = 0;
    await Promise.all(imageUrls.map(url => {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                loadedImages++;
                progressBar.style.width = `${(loadedImages / imageUrls.length) * 100}%`;
                resolve();
            };
            img.onerror = resolve; // Ignore errors to prevent hanging
            img.src = url;
        });
    }));

    // Add a small artificial delay so the UI feels substantial even if images are cached
    await new Promise(resolve => setTimeout(resolve, 300));

    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 500);
}

async function renderDeck(factionName) {
    const grid = document.getElementById('deck-grid');
    
    const deck = decksData[factionName];
    if (!deck || !Array.isArray(deck)) {
        grid.innerHTML = '<p style="color:red;">Deck data is invalid.</p>';
        return;
    }

    await preloadDeck(factionName, deck);

    grid.innerHTML = ''; 

    const settings = SettingsManager.getSettings();
    const gfx = settings.gfxQuality || 'hq';
    const ext = SettingsManager.getGfxExtension();

    deck.forEach(card => {
        // Create the small compact board/hand card
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'grid-card card-entity friendly ready';
        
        // This mirrors the compact HTML generation from ui.js
        cardWrapper.innerHTML = `
            <img class="full-art-image" src="../assets/${gfx}/icons/cards/${factionName.toLowerCase()}/${card.id}.${ext}" onerror="this.src=''" alt="${card.name}">
            <div class="full-art-gradient-top"></div>
            <div class="full-art-gradient-bottom"></div>

            <div class="full-art-cost-container">
                <img class="full-art-cost-icon" src="../assets/${gfx}/icons/ui/mechanics/cost_emblem.${ext}" alt="Cost">
                <span class="full-art-cost-value">${card.cost}</span>
            </div>

            <div class="full-art-class-container">
                <div style="position: relative;">
                    <img class="full-art-class-icon" src="../assets/${gfx}/icons/ui/classes/${card.fightingClass.toLowerCase()}_emblem.${ext}" onerror="this.style.display='none'" alt="${card.fightingClass}">
                    <div class="full-art-amp-value">${card.fcAmplifier}</div>
                </div>
            </div>

            <div class="full-art-bottom-info-container">
                <div class="full-art-chess-symbol-small">${getChessSymbol(card.title)}</div>
                <div class="full-art-influence-container">
                    <span class="full-art-influence-value-small">${card.influence}</span>
                </div>
            </div>
        `;

        // Attach hover listener to update the Right Pane
        cardWrapper.addEventListener('mouseenter', () => updatePreviewPane(card, factionName));
        
        grid.appendChild(cardWrapper);
    });
    
    // Clear right pane or preview the first card by default
    if (deck.length > 0) {
        updatePreviewPane(deck[0], factionName);
    }
}

function updatePreviewPane(card, factionName) {
    const previewContainer = document.getElementById('card-preview-container');
    
    const settings = SettingsManager.getSettings();
    const gfx = settings.gfxQuality || 'hq';
    const ext = SettingsManager.getGfxExtension();
    const hClass = settings.holograms !== false ? 'glitch-reveal' : '';

    // Generate the massive Inspect Modal version of the card
    let statsHTML = '';
    if (card.fightingClass === 'Berserk') {
        statsHTML = `<div style="margin-top: 10px; color: #e74c3c; font-weight: bold;">⚔️ Berserk Charges Remaining: ${card.fcAmplifier}</div>`;
    }

    const premiumHTML = `
        <div class="premium-card-25d friendly">
            <img class="full-art-image ${hClass}" src="../assets/${gfx}/icons/cards/${factionName.toLowerCase()}/${card.id}.${ext}" onerror="this.src=''" alt="${card.name}">
            <div class="full-art-gradient-top"></div>
            <div class="full-art-gradient-bottom"></div>

            <div class="full-art-cost-container inspect-scale">
                <img class="full-art-cost-icon" src="../assets/${gfx}/icons/ui/mechanics/cost_emblem.${ext}" alt="Cost Icon">
                <span class="full-art-cost-value">${card.cost}</span>
            </div>

            <div class="full-art-class-container inspect-scale">
                <div style="position: relative;">
                    <img class="full-art-class-icon" src="../assets/${gfx}/icons/ui/classes/${card.fightingClass.toLowerCase()}_emblem.${ext}" onerror="this.style.display='none'" alt="Class">
                    <div class="full-art-amp-value">${card.fcAmplifier}</div>
                </div>
            </div>

            <div class="full-art-bottom-info-container inspect-scale">
                <div class="full-art-name-and-desc">
                    <h1 class="full-art-card-name">${card.name}</h1>
                    <p class="full-art-card-type-text">${card.fightingClass} / ${card.title}</p>
                    <p class="full-art-card-desc">"${card.text}"${statsHTML}</p>
                </div>
                
                <div class="full-art-influence-container">
                    <span class="full-art-influence-value-large">${card.influence}</span>
                </div>
            </div>
        </div>
    `;

    previewContainer.innerHTML = premiumHTML;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    const s = SettingsManager.getSettings();
    if (s.bgAnimations === false) {
        document.body.classList.add('no-bg-anim');
    }
    loadDecks();
});
