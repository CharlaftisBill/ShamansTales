document.addEventListener('DOMContentLoaded', () => {
    const btnDeck = document.getElementById('btn-deck');
    const btnVsAI = document.getElementById('btn-vs-ai');
    const btnVsOnline = document.getElementById('btn-vs-online');
    
    // Routing Logic
    btnDeck.addEventListener('click', () => {
        window.location.href = 'pages/deck-viewer.html';
    });

    btnVsAI.addEventListener('click', () => {
        window.location.href = 'pages/game.html';
    });

    btnVsOnline.addEventListener('click', () => {
        // Currently disabled via CSS, but we can catch clicks just in case
    });
});
