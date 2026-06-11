import { SettingsManager } from './settings-manager.js';
import { AudioSys } from './audio-manager.js';

document.addEventListener('DOMContentLoaded', async () => {
    const btnDeck = document.getElementById('btn-deck');
    const btnVsAI = document.getElementById('btn-vs-ai');
    
    // Setup Modal Elements
    const setupModal = document.getElementById('setup-modal');
    const playerFactionSelect = document.getElementById('player-faction');
    const aiFactionSelect = document.getElementById('ai-faction');
    const btnSetupBack = document.getElementById('btn-setup-back');
    const btnSetupNext = document.getElementById('btn-setup-next');

    // RPS Modal Elements
    const rpsModal = document.getElementById('rps-modal');
    const rpsSelectionArea = document.getElementById('rps-selection-area');
    const rpsResultArea = document.getElementById('rps-result-area');
    const rpsPlayerChoice = document.getElementById('rps-player-choice');
    const rpsAiChoice = document.getElementById('rps-ai-choice');
    const rpsWinnerText = document.getElementById('rps-winner-text');
    
    // New Modal Elements
    const playFirstModal = document.getElementById('play-first-modal');
    const btnPlayFirst = document.getElementById('btn-play-first');
    const btnPlaySecond = document.getElementById('btn-play-second');
    
    // RPS Buttons
    const btnRpsRetry = document.getElementById('btn-rps-retry');
    const btnRpsContinue = document.getElementById('btn-rps-continue');
    const btnRpsCancel = document.getElementById('btn-rps-cancel');
    const rpsBtns = document.querySelectorAll('.rps-btn');

    let availableFactions = [];
    let playerWonRPS = false;

    try {
        const response = await fetch('data/decks.json');
        const gameData = await response.json();
        availableFactions = Object.keys(gameData);
        
        // Populate dropdowns
        playerFactionSelect.innerHTML = '';
        aiFactionSelect.innerHTML = '';
        availableFactions.forEach(faction => {
            playerFactionSelect.innerHTML += `<option value="${faction}">${faction}</option>`;
            aiFactionSelect.innerHTML += `<option value="${faction}">${faction}</option>`;
        });

        // Set AI to Norse by default if it exists
        if (availableFactions.includes('Norse')) {
            aiFactionSelect.value = 'Norse';
        } else if (availableFactions.length > 1) {
            aiFactionSelect.value = availableFactions[1];
        }

    } catch (e) {
        console.error("Failed to load factions", e);
    }

    // --- AUDIO EVENT HOOKS FOR SFX TEAM ---
    const playHover = () => window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'menu_hover' }));
    const playSelect = () => window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'menu_select' }));
    
    playerFactionSelect.addEventListener('mouseenter', playHover);
    aiFactionSelect.addEventListener('mouseenter', playHover);
    playerFactionSelect.addEventListener('change', playSelect);
    aiFactionSelect.addEventListener('change', playSelect);

    // Navigation
    btnDeck.addEventListener('click', () => {
        window.location.href = 'pages/deck-viewer.html';
    });

    btnVsAI.addEventListener('click', () => {
        setupModal.classList.remove('modal-hidden');
        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
    });

    btnSetupBack.addEventListener('click', () => {
        setupModal.classList.add('modal-hidden');
        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
    });

    btnSetupNext.addEventListener('click', () => {
        setupModal.classList.add('modal-hidden');
        rpsModal.classList.remove('modal-hidden');
        resetRPS();
        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
    });

    // RPS Logic
    const choices = ['rock', 'paper', 'scissors'];
    const icons = { rock: '✊', paper: '✋', scissors: '✌️' };

    function resetRPS() {
        rpsSelectionArea.classList.remove('hidden');
        rpsResultArea.classList.add('hidden');
        btnRpsRetry.classList.add('hidden');
        btnRpsContinue.classList.add('hidden');
        playerWonRPS = false;
    }

    rpsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const playerChoice = btn.getAttribute('data-choice');
            const aiChoice = choices[Math.floor(Math.random() * choices.length)];
            
            window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'rps_click' }));
            setTimeout(() => window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'rps_clash' })), 200);

            rpsPlayerChoice.innerText = icons[playerChoice];
            rpsAiChoice.innerText = icons[aiChoice];
            
            rpsSelectionArea.classList.add('hidden');
            rpsResultArea.classList.remove('hidden');

            if (playerChoice === aiChoice) {
                rpsWinnerText.innerText = "It's a Tie!";
                window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'rps_tie' }));
                btnRpsRetry.classList.remove('hidden');
            } else if (
                (playerChoice === 'rock' && aiChoice === 'scissors') ||
                (playerChoice === 'paper' && aiChoice === 'rock') ||
                (playerChoice === 'scissors' && aiChoice === 'paper')
            ) {
                rpsWinnerText.innerText = "You Win!";
                window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'rps_win' }));
                playerWonRPS = true;
                btnRpsContinue.classList.remove('hidden');
            } else {
                rpsWinnerText.innerText = "AI Wins! (AI plays first)";
                window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'rps_lose' }));
                playerWonRPS = false;
                btnRpsContinue.classList.remove('hidden');
            }
        });
    });

    btnRpsRetry.addEventListener('click', resetRPS);

    btnRpsCancel.addEventListener('click', () => {
        rpsModal.classList.add('modal-hidden');
        setupModal.classList.remove('modal-hidden');
        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
    });

    btnRpsContinue.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
        rpsModal.classList.add('modal-hidden');
        
        if (playerWonRPS) {
            playFirstModal.classList.remove('modal-hidden');
        } else {
            startMatch(false); // AI goes first
        }
    });

    btnPlayFirst.addEventListener('click', () => startMatch(true));
    btnPlaySecond.addEventListener('click', () => startMatch(false));

    function startMatch(playerGoesFirst) {
        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
        const settings = {
            playerFaction: playerFactionSelect.value,
            aiFaction: aiFactionSelect.value,
            isPlayerP1: playerGoesFirst
        };
        localStorage.setItem('shamanstales_match_settings', JSON.stringify(settings));
        window.location.href = 'pages/game.html';
    }

    // Fire BGM start event
    window.dispatchEvent(new CustomEvent('PLAY_BGM'));

    // --- SETTINGS LOGIC ---
    const btnSettings = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const btnSettingsCancel = document.getElementById('btn-settings-cancel');
    const btnSettingsSave = document.getElementById('btn-settings-save');

    const setMasterVol = document.getElementById('set-master-vol');
    const setBgmVol = document.getElementById('set-bgm-vol');
    const setSfxVol = document.getElementById('set-sfx-vol');
    const setMute = document.getElementById('set-mute');
    
    const setGfxQuality = document.getElementById('set-gfx-quality');
    const setFastMode = document.getElementById('set-fast-mode');
    const setBgAnim = document.getElementById('set-bg-anim');
    const setScreenShake = document.getElementById('set-screen-shake');
    const setHolograms = document.getElementById('set-holograms');

    function loadSettings() {
        const s = SettingsManager.getSettings();
        if (s.masterVol !== undefined) setMasterVol.value = s.masterVol;
        if (s.bgmVol !== undefined) setBgmVol.value = s.bgmVol;
        if (s.sfxVol !== undefined) setSfxVol.value = s.sfxVol;
        if (s.mute !== undefined) setMute.checked = s.mute;
        
        if (s.gfxQuality) setGfxQuality.value = s.gfxQuality;
        if (s.fastMode !== undefined) setFastMode.checked = s.fastMode;
        if (s.bgAnimations !== undefined) setBgAnim.checked = s.bgAnimations;
        if (s.screenShake !== undefined) setScreenShake.checked = s.screenShake;
        if (s.holograms !== undefined) setHolograms.checked = s.holograms;
    }

    function saveSettings() {
        const s = {
            masterVol: parseInt(setMasterVol.value, 10),
            bgmVol: parseInt(setBgmVol.value, 10),
            sfxVol: parseInt(setSfxVol.value, 10),
            mute: setMute.checked,
            gfxQuality: setGfxQuality.value,
            fastMode: setFastMode.checked,
            bgAnimations: setBgAnim.checked,
            screenShake: setScreenShake.checked,
            holograms: setHolograms.checked
        };
        
        SettingsManager.saveSettings(s);
    }

    btnSettings.addEventListener('click', () => {
        loadSettings();
        settingsModal.classList.remove('modal-hidden');
        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
    });

    btnSettingsCancel.addEventListener('click', () => {
        settingsModal.classList.add('modal-hidden');
        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
    });

    btnSettingsSave.addEventListener('click', () => {
        saveSettings();
        settingsModal.classList.add('modal-hidden');
        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
    });

    // Initialize settings on load
    loadSettings();
    saveSettings(); // To ensure defaults are broadcasted immediately
});
