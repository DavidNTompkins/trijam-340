// Audio system for the game
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.backgroundMusic = null;
        this.sounds = {};
        this.musicGain = null;
        this.sfxGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create gain nodes for volume control
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = 0.3; // Background music at 30%
            this.musicGain.connect(this.audioContext.destination);

            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = 0.5; // Sound effects at 50%
            this.sfxGain.connect(this.audioContext.destination);

            this.initialized = true;
            console.log('Audio system initialized');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        }
    }

    // Load the airhorn sound effect
    loadAirhorn() {
        const audio = new Audio('assets/airhorn.mp3');
        audio.volume = 0.5;
        audio.preload = 'auto';
        this.sounds.airhorn = audio;
    }

    playAirhorn() {
        if (this.sounds.airhorn) {
            this.sounds.airhorn.currentTime = 0;
            this.sounds.airhorn.play().catch(err => {
                console.warn('Failed to play airhorn:', err);
            });
        }
    }

    // Procedurally generated nautical background music
    startBackgroundMusic() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        this.stopBackgroundMusic();

        // Create oscillators for ambient ocean sounds
        const now = this.audioContext.currentTime;

        // Low bass drone (represents ocean depth)
        const bass = this.audioContext.createOscillator();
        bass.type = 'sine';
        bass.frequency.value = 55; // Low A

        const bassGain = this.audioContext.createGain();
        bassGain.gain.value = 0.15;
        bass.connect(bassGain);
        bassGain.connect(this.musicGain);
        bass.start(now);

        // Modulate bass for wave-like effect
        const bassLFO = this.audioContext.createOscillator();
        bassLFO.frequency.value = 0.2; // Slow modulation
        const bassLFOGain = this.audioContext.createGain();
        bassLFOGain.gain.value = 5;
        bassLFO.connect(bassLFOGain);
        bassLFOGain.connect(bass.frequency);
        bassLFO.start(now);

        // Ambient pad (represents wind/atmosphere)
        const pad = this.audioContext.createOscillator();
        pad.type = 'triangle';
        pad.frequency.value = 220; // A3

        const padGain = this.audioContext.createGain();
        padGain.gain.value = 0.08;
        pad.connect(padGain);
        padGain.connect(this.musicGain);
        pad.start(now);

        // Add subtle detuning for richness
        const pad2 = this.audioContext.createOscillator();
        pad2.type = 'triangle';
        pad2.frequency.value = 222;
        pad2.connect(padGain);
        pad2.start(now);

        // Bell-like tones (lighthouse bell)
        const createBell = (frequency, delay) => {
            setTimeout(() => {
                if (!this.audioContext) return;

                const bell = this.audioContext.createOscillator();
                bell.type = 'sine';
                bell.frequency.value = frequency;

                const bellGain = this.audioContext.createGain();
                bellGain.gain.value = 0.1;

                // Envelope for bell decay
                const now = this.audioContext.currentTime;
                bellGain.gain.setValueAtTime(0.1, now);
                bellGain.gain.exponentialRampToValueAtTime(0.01, now + 2);

                bell.connect(bellGain);
                bellGain.connect(this.musicGain);

                bell.start(now);
                bell.stop(now + 2);
            }, delay);
        };

        // Bell sequence - plays periodically
        const playBellSequence = () => {
            createBell(440, 0);      // A4
            createBell(554.37, 800); // C#5
            createBell(659.25, 1600); // E5

            // Schedule next sequence
            if (this.backgroundMusic) {
                this.backgroundMusic.bellTimeout = setTimeout(playBellSequence, 8000);
            }
        };

        playBellSequence();

        // White noise for ocean waves
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.audioContext.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        // Filter noise to make it sound more like waves
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 400;

        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.value = 0.03;

        whiteNoise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.musicGain);
        whiteNoise.start(now);

        // Modulate noise for wave effect
        const noiseLFO = this.audioContext.createOscillator();
        noiseLFO.frequency.value = 0.3;
        const noiseLFOGain = this.audioContext.createGain();
        noiseLFOGain.gain.value = 0.02;
        noiseLFO.connect(noiseLFOGain);
        noiseLFOGain.connect(noiseGain.gain);
        noiseLFO.start(now);

        // Store references for cleanup
        this.backgroundMusic = {
            oscillators: [bass, bassLFO, pad, pad2, whiteNoise, noiseLFO],
            bellTimeout: null
        };
    }

    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            // Stop all oscillators
            this.backgroundMusic.oscillators.forEach(osc => {
                try {
                    osc.stop();
                } catch (e) {
                    // Already stopped
                }
            });

            // Clear bell timeout
            if (this.backgroundMusic.bellTimeout) {
                clearTimeout(this.backgroundMusic.bellTimeout);
            }

            this.backgroundMusic = null;
        }
    }

    setMusicVolume(volume) {
        if (this.musicGain) {
            this.musicGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    setSFXVolume(volume) {
        if (this.sfxGain) {
            this.sfxGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }
}

// Global audio manager instance
const audioManager = new AudioManager();
