import { AI } from './ai.js';
import { initializeGameMode } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize AI silently in background
    AI.init();

    const btnDeck = document.getElementById('btn-deck');
    const btnVsAI = document.getElementById('btn-vs-ai');
    const btnVsOnline = document.getElementById('btn-vs-online');
    
    const mainMenu = document.getElementById('main-menu');
    const gameContainer = document.getElementById('game-container');
    const loadingScreen = document.getElementById('loading-screen');

    // Routing Logic
    btnDeck.addEventListener('click', () => {
        window.location.href = 'deck_viewer.html';
    });

    btnVsAI.addEventListener('click', () => {
        // Fade out menu
        mainMenu.style.opacity = '0';
        
        // Show loading screen
        loadingScreen.style.display = 'flex';
        loadingScreen.style.opacity = '1';

        setTimeout(() => {
            mainMenu.style.display = 'none';
            // Show game board
            gameContainer.style.display = 'flex';
            
            // Boot the game mode which handles its own loading screen fadeout
            initializeGameMode();
        }, 300);
    });

    btnVsOnline.addEventListener('click', () => {
        // Currently disabled via CSS, but we can catch clicks just in case
    });
});
