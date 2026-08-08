/* ============================================================
   8bit_lofi_soundtrack.js — 8-Bit Retro Video Game Lo-Fi Track
   ============================================================
   A standalone 8-bit NES/GameBoy retro adaptation of the chill
   lo-fi beat soundtrack.

   Features:
   - 72 BPM slow lo-fi groove
   - 4-bar lo-fi 7th chord progression (Fmaj7 -> Em7 -> Dm7 -> Cmaj7)
   - Chiptune pulse wave (square wave) arpeggios & lead countermelodies
   - NES triangle wave bassline
   - 8-bit noise channel percussion (kick sweep, noise snare, hi-hats)
   ============================================================ */

class Retro8BitLofiSoundtrack {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMuted = false;
        this.isPlaying = false;
        this.sequenceInterval = null;
        this.currentStep = 0;
        this.tempo = 72; // Slow lo-fi BPM
        this.volume = 0.28;

        // Frequencies (Hz) for 8-bit notes
        this.NOTES = {
            'C2': 65.41, 'CS2': 69.30, 'D2': 73.42, 'DS2': 77.78, 'E2': 82.41, 'F2': 87.31, 'FS2': 92.50, 'G2': 98.00, 'GS2': 103.83, 'A2': 110.00, 'AS2': 116.54, 'B2': 123.47,
            'C3': 130.81, 'CS3': 138.59, 'D3': 146.83, 'DS3': 155.56, 'E3': 164.81, 'F3': 174.61, 'FS3': 185.00, 'G3': 196.00, 'GS3': 207.65, 'A3': 220.00, 'AS3': 233.08, 'B3': 246.94,
            'C4': 261.63, 'CS4': 277.18, 'D4': 293.66, 'DS4': 311.13, 'E4': 329.63, 'F4': 349.23, 'FS4': 369.99, 'G4': 392.00, 'GS4': 415.30, 'A4': 440.00, 'AS4': 466.16, 'B4': 493.88,
            'C5': 523.25, 'CS5': 554.37, 'D5': 587.33, 'DS5': 622.25, 'E5': 659.25, 'F5': 698.46, 'FS5': 739.99, 'G5': 783.99, 'GS5': 830.61, 'A5': 880.00, 'AS5': 932.33, 'B5': 987.77,
            'C6': 1046.50, 'E6': 1318.51, 'G6': 1567.98,
            '-': 0
        };

        // 4-Bar Lo-Fi Chord Progression in 8-Bit Chiptune format
        this.chords = [
            ['F3', 'A3', 'C4', 'E4'], // Fmaj7
            ['E3', 'G3', 'B3', 'D4'], // Em7
            ['D3', 'F3', 'A3', 'C4'], // Dm7
            ['C3', 'E3', 'G3', 'B3']  // Cmaj7
        ];
        this.bassNotes = ['F2', 'E2', 'D2', 'C2'];
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

    // 8-Bit Square Wave Chiptune Tone
    play8BitTone(freq, type = 'square', duration = 0.15, startTime = 0, gainLevel = 0.12) {
        if (!this.ctx || this.isMuted || !freq) return;

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

    // Fast 8-Bit NES Style Arpeggio Strum
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

    // 8-Bit NES Kick (Square/Sine Pitch Drop)
    play8BitKick(now) {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.14);
    }

    // 8-Bit Noise Snare
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
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.07);
    }

    // 8-Bit Hi-Hat
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

        noise.start(now);
        noise.stop(now + 0.025);
    }

    start() {
        if (this.isPlaying) return;
        this._initAudio();
        this.isPlaying = true;
        this.currentStep = 0;

        const stepTime = (60 / this.tempo) / 4; // 16th step at 72 BPM

        this.sequenceInterval = setInterval(() => {
            if (!this.isPlaying) return;
            const now = this.ctx ? this.ctx.currentTime : 0;
            const step = this.currentStep % 64; // 4-bar loop

            const barIndex = Math.floor(step / 16);
            const stepInBar = step % 16;

            // 1. 8-Bit Retro Chiptune Arpeggios & Chords
            if (stepInBar === 0) {
                this.play8BitArp(this.chords[barIndex], now, stepTime * 10);
            } else if (stepInBar === 10) {
                this.play8BitArp(this.chords[barIndex], now, stepTime * 4);
            }

            // 2. NES Triangle Sub-Bass
            if (stepInBar === 0 || stepInBar === 6) {
                const bassNote = this.bassNotes[barIndex];
                if (bassNote && this.NOTES[bassNote]) {
                    this.play8BitTone(this.NOTES[bassNote], 'triangle', stepTime * 5, now, 0.26);
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
        this.isPlaying = false;
    }
}

if (typeof window !== 'undefined') {
    window.Retro8BitLofiSoundtrack = Retro8BitLofiSoundtrack;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Retro8BitLofiSoundtrack;
}
