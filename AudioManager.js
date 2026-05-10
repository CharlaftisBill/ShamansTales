// AudioManager.js
class AudioManager {
    constructor() {
        // Initialize Audio Context lazily to avoid browser autoplay blocks
        this.ctx = null;
        this.isMuted = false;
        this.bgmPlaying = false;
        this.isStressful = false;
        this.isCheckmate = false;
        this.isGameOver = false;
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
        this.isGameOver = false;

        const scheduleNextNote = () => {
            if (!this.bgmPlaying || this.isGameOver) return;
            
            let nextTick = 2000;
            
            if (this.ctx.state === 'running' && !this.isMuted) {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                let duration = 5;
                let volMult = this.isStressful ? 1.3 : 0.8;
                
                if (this.isCheckmate) {
                    osc.type = 'sawtooth';
                    duration = 0.3; // Fast, aggressive pulse
                    nextTick = 500; // Plays every 500ms
                    volMult = 1.5;
                } else {
                    osc.type = this.isStressful ? 'triangle' : 'sine';
                }
                
                // Stressful: E minor atmospheric notes
                const stressfulNotes = [82.41, 98.00, 123.47, 146.83, 164.81];
                // Calm: C major soothing notes
                const calmNotes = [130.81, 146.83, 164.81, 196.00, 261.63]; 
                // Checkmate: D minor low power chord roots
                const checkmateNotes = [55.00, 65.41, 73.42]; 
                
                let notes = this.isStressful ? stressfulNotes : calmNotes;
                if (this.isCheckmate) notes = checkmateNotes;
                
                const note = notes[Math.floor(Math.random() * notes.length)];
                
                osc.frequency.setValueAtTime(note, now);
                gain.gain.setValueAtTime(0, now);
                
                if (this.isCheckmate) {
                    // Stabby, urgent rhythm
                    gain.gain.linearRampToValueAtTime(0.08 * volMult, now + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                } else {
                    // Soft pad
                    gain.gain.linearRampToValueAtTime(0.01 * volMult, now + 2);
                    gain.gain.linearRampToValueAtTime(0, now + duration);
                }
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.start(now);
                osc.stop(now + duration);
            }
            
            this.bgmTimeout = setTimeout(scheduleNextNote, nextTick);
        };

        scheduleNextNote();
    }

    playEndGameFanfare(isVictory) {
        if (!this.ctx || this.isMuted) return;
        this.isGameOver = true; // Halts the BGM loop
        clearTimeout(this.bgmTimeout);

        const now = this.ctx.currentTime;
        
        if (isVictory) {
            // Majestic major arpeggio: C, E, G, C
            const notes = [261.63, 329.63, 392.00, 523.25]; 
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                const t = now + (i * 0.15);
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
                
                osc.start(t);
                osc.stop(t + 1.0);
            });
        } else {
            // Dark descending dissonance: D#, D, C#, C
            const notes = [311.13, 293.66, 277.18, 261.63]; 
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                const t = now + (i * 0.3);
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.05, t + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
                
                osc.start(t);
                osc.stop(t + 1.5);
            });
        }
    }

    playSyntheticSFX(name, pitchVariance) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        const variance = 1 + (Math.random() * pitchVariance * 2 - pitchVariance);

        // Scale intensity based on the BGM state!
        const stressMult = this.isStressful ? 1.5 : 1.0;
        const volMult = this.isStressful ? 1.3 : 0.8;

        if (name === 'select') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600 * variance * stressMult, now);
            osc.frequency.exponentialRampToValueAtTime(300 * stressMult, now + 0.1);
            gain.gain.setValueAtTime(0.05 * volMult, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (name === 'resurge') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300 * variance * stressMult, now);
            osc.frequency.exponentialRampToValueAtTime(800 * variance * stressMult, now + 0.2);
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.2 * volMult, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (name === 'summon') {
            // Hologram materialization sound
            osc.type = 'triangle'; // Smoother, less harsh than square
            osc.frequency.setValueAtTime(100 * variance, now);
            osc.frequency.exponentialRampToValueAtTime(600 * stressMult, now + 0.15);
            osc.frequency.linearRampToValueAtTime(600 * stressMult, now + 0.3); 
            
            // LFO for the "wobble / shimmer" effect
            const lfo = this.ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 25; // Slightly softer modulation speed
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 100; // Less aggressive pitch wobble
            
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(now);
            lfo.stop(now + 0.3);

            // Volume Envelope
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15 * volMult, now + 0.1); // Reduced volume
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (name === 'attackBrawler') {
            // Explosive thud
            osc.type = this.isStressful ? 'sawtooth' : 'square';
            osc.frequency.setValueAtTime(100 * variance * stressMult, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + (0.3 / stressMult));
            gain.gain.setValueAtTime(0.8 * volMult, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + (0.3 / stressMult));
            osc.start(now);
            osc.stop(now + (0.3 / stressMult));
        } else if (name === 'attackPiercer') {
            // Sharp metal slice / railgun pierce
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400 * variance, now);
            osc.frequency.exponentialRampToValueAtTime(2000 * variance * stressMult, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            gain.gain.setValueAtTime(0.5 * volMult, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (name === 'attackRanger') {
            // Arrow traveling through air (whoosh/fwip)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300 * variance, now);
            osc.frequency.exponentialRampToValueAtTime(800 * variance * stressMult, now + 0.1);
            osc.frequency.exponentialRampToValueAtTime(200 * variance, now + 0.2);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.6 * volMult, now + 0.05);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (name === 'exhaust') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200 * variance * stressMult, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.2);
            gain.gain.setValueAtTime(0.6 * volMult, now);
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
