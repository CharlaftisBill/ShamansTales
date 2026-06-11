import { AI } from './ai.js';
import { initializeGameMode } from './ui/ui-core.js';

document.addEventListener('DOMContentLoaded', () => {
    // Apply Settings
    try {
        const stored = localStorage.getItem('shamanstales_app_settings');
        if (stored) {
            const s = JSON.parse(stored);
            if (s.bgAnimations === false) {
                document.body.classList.add('no-bg-anim');
            }
        }
    } catch(e) {}

    // Initialize AI
    AI.init();

    // Show game board container immediately (since we moved it out of the menu, it can just be visible)
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.style.display = 'flex';
    }

    // Boot the game mode which handles the loading screen fadeout automatically
    initializeGameMode();

    // Fire BGM start event
    window.dispatchEvent(new CustomEvent('PLAY_BGM'));
});
