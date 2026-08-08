/* ============================================================
   audio.js — 8-Bit Retro Lo-Fi Beat Synthesizer & Button Click Sound Design
   ============================================================ */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMuted = false;
        this.currentTrack = null;
        this.sequenceInterval = null;
        this.currentStep = 0;
        this.tempo = 72; // Slow chill lo-fi BPM
        this.volume = 0.28;

        // Frequencies for 8-bit lo-fi chords & sub-bass
        this.NOTES = {
            'C2': 65.41, 'CS2': 69.30, 'D2': 73.42, 'DS2': 77.78, 'E2': 82.41, 'F2': 87.31, 'FS2': 92.50, 'G2': 98.00, 'GS2': 103.83, 'A2': 110.00, 'AS2': 116.54, 'B2': 123.47,
            'C3': 130.81, 'CS3': 138.59, 'D3': 146.83, 'DS3': 155.56, 'E3': 164.81, 'F3': 174.61, 'FS3': 185.00, 'G3': 196.00, 'GS3': 207.65, 'A3': 220.00, 'AS3': 233.08, 'B3': 246.94,
            'C4': 261.63, 'CS4': 277.18, 'D4': 293.66, 'DS4': 311.13, 'E4': 329.63, 'F4': 349.23, 'FS4': 369.99, 'G4': 392.00, 'GS4': 415.30, 'A4': 440.00, 'AS4': 466.16, 'B4': 493.88,
            'C5': 523.25, 'CS5': 554.37, 'D5': 587.33, 'DS5': 622.25, 'E5': 659.25, 'F5': 698.46, 'FS5': 739.99, 'G5': 783.99, 'GS5': 830.61, 'A5': 880.00, 'AS5': 932.33, 'B5': 987.77,
            '-': 0
        };

        this._initUserEvents();
    }

    _initAudio() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
                this.masterGain.connect(this.ctx.destination);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    _initUserEvents() {
        const unlock = () => {
            this._initAudio();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        };
        document.addEventListener('click', unlock);
        document.addEventListener('keydown', unlock);
        document.addEventListener('mousedown', unlock);
        document.addEventListener('touchstart', unlock);

        // Global button click SFX listener
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button, .btn, [role="button"], select, input[type="button"], input[type="submit"]');
            if (btn) {
                this.playButtonClickSFX();
            }
        }, true);
    }

    playButtonClickSFX() {
        if (!this.ctx) this._initAudio();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;

        // High transient click (tactile snap)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1600, now);
        osc1.frequency.exponentialRampToValueAtTime(320, now + 0.02);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc1.connect(gain1);
        gain1.connect(this.masterGain);
        osc1.start(now);
        osc1.stop(now + 0.02);

        // Body pop (satisfying mechanical switch body)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(420, now);
        osc2.frequency.exponentialRampToValueAtTime(110, now + 0.035);
        gain2.gain.setValueAtTime(0.25, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(now);
        osc2.stop(now + 0.035);
    }

    playTone(freq, type = 'sine', duration = 0.2, startTime = 0, gainLevel = 0.15) {
        if (!this.ctx || this.isMuted || typeof freq !== 'number' || !isFinite(freq) || freq <= 0) return;

        const now = startTime || this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(gainLevel, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    // 8-Bit NES Style Arpeggio Strum for Lo-Fi Chords
    play8BitArp(notes, now, duration = 0.8) {
        if (!this.ctx || this.isMuted) return;
        const arpSpeed = 0.045; // 8-bit fast chord cascade
        notes.forEach((note, idx) => {
            const freq = this.NOTES[note];
            if (!freq) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + idx * arpSpeed);

            gain.gain.setValueAtTime(0.08, now + idx * arpSpeed);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * arpSpeed + duration);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + idx * arpSpeed);
            osc.stop(now + idx * arpSpeed + duration);
        });
    }

    // 8-Bit NES Kick Sweep
    play8BitKick(now) {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

        gain.gain.setValueAtTime(0.48, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.14);
    }

    // 8-Bit Bandpass Noise Snare
    play8BitSnare(now) {
        if (!this.ctx || this.isMuted) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.07);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.Q.value = 1.5;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.07);
    }

    // 8-Bit Highpass Noise Hi-Hat
    play8BitHat(now, soft = false) {
        if (!this.ctx || this.isMuted) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.025);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7500, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(soft ? 0.03 : 0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.025);
    }

    playTrack(trackName) {
        if (this.sequenceInterval && this.currentTrack) {
            return; // Seamlessly keep playing uninterrupted across menu changes!
        }
        this.stop();

        this._initAudio();
        this.currentTrack = trackName || '8bit_lofi';
        this.currentStep = 0;
        this.tempo = 72; // Slow 8-bit lo-fi BPM

        // 4-Bar Lo-Fi Jazz/Chill Chord Progression (7th Chords)
        const chords = [
            ['F3', 'A3', 'C4', 'E4'],
            ['E3', 'G3', 'B3', 'D4'],
            ['D3', 'F3', 'A3', 'C4'],
            ['C3', 'E3', 'G3', 'B3']
        ];
        const bassNotes = ['F2', 'E2', 'D2', 'C2'];

        const stepTime = (60 / this.tempo) / 4; // 16th notes at 72 BPM

        this.sequenceInterval = setInterval(() => {
            if (!this.currentTrack) return;
            const now = this.ctx ? this.ctx.currentTime : 0;
            const step = this.currentStep % 64; // 4 bars = 64 16th steps

            const barIndex = Math.floor(step / 16);
            const stepInBar = step % 16;

            // 1. 8-Bit Retro Chiptune Pulse Wave Arpeggios & Chords
            if (stepInBar === 0) {
                this.play8BitArp(chords[barIndex], now, stepTime * 10);
            } else if (stepInBar === 10) {
                this.play8BitArp(chords[barIndex], now, stepTime * 4);
            }

            // 2. NES Triangle Wave Sub-Bass
            if (stepInBar === 0 || stepInBar === 6) {
                const bassNote = bassNotes[barIndex];
                if (bassNote && this.NOTES[bassNote]) {
                    this.playTone(this.NOTES[bassNote], 'triangle', stepTime * 5, now, 0.26);
                }
            }

            // 3. 8-Bit Chiptune Percussion (Kick, Snare, Hat)
            if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) {
                this.play8BitKick(now);
            }
            if (stepInBar === 4 || stepInBar === 12) {
                this.play8BitSnare(now);
            }
            if (stepInBar % 2 === 0) {
                this.play8BitHat(now, stepInBar % 4 !== 0);
            }

            this.currentStep++;
        }, stepTime * 1000);
    }

    stop() {
        if (this.sequenceInterval) {
            clearInterval(this.sequenceInterval);
            this.sequenceInterval = null;
        }
        this.currentTrack = null;
    }

    playTrashPickupSFX() {}
    playDialogAppearSFX() {}
    playHandshakeSFX() {}
    playRobSFX() {}
    playKillSFX() {}
    playEngageSFX() {}

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    toggleSFX() {
        this.sfxMuted = true;
        return true;
    }
}

window.soundManager = new SoundManager();
window.selectedMusicTrack = '8bit_lofi';

document.addEventListener('DOMContentLoaded', () => {
    if (window.soundManager) {
        window.soundManager.playTrack('8bit_lofi');
    }
});
