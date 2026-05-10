// AudioManager.js
class AudioManager {
    constructor() {
        // Initialize Audio Context lazily to avoid browser autoplay blocks
        this.ctx = null;
        this.isMuted = false;
        this.bgmPlaying = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playSFX(name, pitchVariance = 0.1) {
        if (this.isMuted) return;
        this.init(); // Ensure context is running

        this.playSyntheticSFX(name, pitchVariance);
    }

    playBGM() {
        if (this.bgmPlaying) return;
        this.init();
        this.bgmPlaying = true;

        this.bgmInterval = setInterval(() => {
            if (this.ctx.state !== 'running' || this.isMuted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            // E minor atmospheric notes
            const notes = [82.41, 98.00, 123.47, 146.83, 164.81];
            const note = notes[Math.floor(Math.random() * notes.length)];
            
            osc.frequency.setValueAtTime(note, now);
            
            // Soft pad attack/release
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 2);
            gain.gain.linearRampToValueAtTime(0, now + 5);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 5);
        }, 2000);
    }

    playSyntheticSFX(name, pitchVariance) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        const variance = 1 + (Math.random() * pitchVariance * 2 - pitchVariance);

        if (name === 'select') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600 * variance, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (name === 'summon') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150 * variance, now);
            osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.2);
            gain.gain.setValueAtTime(1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (name === 'attackBrawler') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(100 * variance, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
            gain.gain.setValueAtTime(1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (name === 'attackPiercer') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800 * variance, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (name === 'attackRanger') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200 * variance, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
            gain.gain.setValueAtTime(0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (name === 'exhaust') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200 * variance, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.2);
            gain.gain.setValueAtTime(0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    }
}

window.AudioSys = new AudioManager();

// Ensure audio context is started on first user interaction
document.addEventListener('click', () => {
    window.AudioSys.init();
    window.AudioSys.playBGM();
}, { once: true });
