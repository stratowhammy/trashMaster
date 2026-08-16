/* ============================================================
   audio.js — Complete Sound Design Engine & Music Synthesizer
   ============================================================ */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMuted = false;
        this.isMusicMuted = false;
        this.sfxMuted = false;

        this.currentTrack = null;
        this.sequenceInterval = null;
        this.currentStep = 0;
        this.baseTempo = 72; // Base slow lo-fi BPM
        this.tempoMultiplier = 1.0; // Dynamic speed adjustment (0.8 for Mushroom, 1.2 for Wings)
        
        this.musicVolumePercent = 100;
        this.volume = 0.28;

        // Individual SFX Toggles
        this.sfxToggles = {
            click: true,
            trash: true,
            splat: true,
            ding: true,
            handshake: true,
            gunshot: true,
            cash: true,
            choir: true,
            dialog: true
        };

        this.NOTES = {
            'C1': 32.70, 'CS1': 34.65, 'D1': 36.71, 'DS1': 38.89, 'E1': 41.20, 'F1': 43.65, 'FS1': 46.25, 'G1': 49.00, 'GS1': 51.91, 'A1': 55.00, 'AS1': 58.27, 'B1': 61.74,
            'C2': 65.41, 'CS2': 69.30, 'D2': 73.42, 'DS2': 77.78, 'E2': 82.41, 'F2': 87.31, 'FS2': 92.50, 'G2': 98.00, 'GS2': 103.83, 'A2': 110.00, 'AS2': 116.54, 'B2': 123.47,
            'C3': 130.81, 'CS3': 138.59, 'D3': 146.83, 'DS3': 155.56, 'E3': 164.81, 'F3': 174.61, 'FS3': 185.00, 'G3': 196.00, 'GS3': 207.65, 'A3': 220.00, 'AS3': 233.08, 'B3': 246.94,
            'C4': 261.63, 'CS4': 277.18, 'D4': 293.66, 'DS4': 311.13, 'E4': 329.63, 'F4': 349.23, 'FS4': 369.99, 'G4': 392.00, 'GS4': 415.30, 'A4': 440.00, 'AS4': 466.16, 'B4': 493.88,
            'C5': 523.25, 'CS5': 554.37, 'D5': 587.33, 'DS5': 622.25, 'E5': 659.25, 'F5': 698.46, 'FS5': 739.99, 'G5': 783.99, 'GS5': 830.61, 'A5': 880.00, 'AS5': 932.33, 'B5': 987.77,
            'C6': 1046.50, 'CS6': 1108.73, 'D6': 1174.66, 'DS6': 1244.51, 'E6': 1318.51, 'F6': 1396.91, 'FS6': 1479.98, 'G6': 1567.98, 'GS6': 1661.22, 'A6': 1760.00, 'AS6': 1864.66, 'B6': 1975.53,
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
                this.masterGain.gain.value = (this.isMuted || this.isMusicMuted) ? 0 : this.volume;
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

    // ── Soundtrack Volume & Toggle Controls ──
    setMusicVolume(percent) {
        this.musicVolumePercent = Math.max(0, Math.min(100, percent));
        this.volume = (this.musicVolumePercent / 100) * 0.28;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime((this.isMuted || this.isMusicMuted) ? 0 : this.volume, this.ctx.currentTime);
        }
    }

    toggleMusicMute() {
        this.isMusicMuted = !this.isMusicMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime((this.isMuted || this.isMusicMuted) ? 0 : this.volume, this.ctx.currentTime);
        }
        return this.isMusicMuted;
    }

    // ── SFX Toggles Controls ──
    setSFXToggle(key, enabled) {
        this.sfxToggles[key] = !!enabled;
    }

    setAllSFXToggles(enabled) {
        for (const k in this.sfxToggles) {
            this.sfxToggles[k] = !!enabled;
        }
    }

    isSFXEnabled(key) {
        if (this.isMuted || this.sfxMuted) return false;
        if (key && this.sfxToggles[key] === false) return false;
        return true;
    }

    // ── Dynamic Music Speed Adjustment ──
    setTempoMultiplier(multiplier = 1.0) {
        if (this.tempoMultiplier === multiplier) return;
        this.tempoMultiplier = multiplier;
        if (this.currentTrack === 'lofi') {
            this.restartSequence();
        }
    }

    // ── Sound Effects ──

    playJumpSFX() {
        if (!this.isSFXEnabled('trash')) return;
        if (!this.ctx) this._initAudio();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(460, now + 0.12);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.16);
        } catch (e) {}
    }

    playButtonClickSFX() {
        if (!this.isSFXEnabled('click')) return;
        if (!this.ctx) this._initAudio();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
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

    playSplatSFX() {
        if (!this.isSFXEnabled('splat')) return;
        if (!this.ctx) this._initAudio();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.18);

        const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.35, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.masterGain);
        noise.start(now);
        noise.stop(now + 0.12);
    }

    playDingSFX() {
        if (!this.isSFXEnabled('ding')) return;
        if (!this.ctx) this._initAudio();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1318.51, now);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2637.02, now);
        gain2.gain.setValueAtTime(0.15, now);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.45);
        osc2.start(now);
        osc2.stop(now + 0.35);
    }

    playHandshakeSFX() {
        if (!this.isSFXEnabled('handshake')) return;
        if (!this.ctx) this._initAudio();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        [0, 0.08].forEach(offset => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now + offset);
            osc.frequency.exponentialRampToValueAtTime(140, now + offset + 0.05);
            gain.gain.setValueAtTime(0.25, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.05);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + offset);
            osc.stop(now + offset + 0.05);
        });
    }

    playKillSFX() {
        if (!this.isSFXEnabled('gunshot')) return;
        if (!this.ctx) this._initAudio();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.15);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.6, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.masterGain);
        noise.start(now);
        noise.stop(now + 0.18);

        const sub = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(150, now);
        sub.frequency.exponentialRampToValueAtTime(25, now + 0.15);
        sGain.gain.setValueAtTime(0.7, now);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        sub.connect(sGain);
        sGain.connect(this.masterGain);
        sub.start(now);
        sub.stop(now + 0.15);
    }

    playCashRegisterSFX() {
        if (!this.isSFXEnabled('cash')) return;
        if (!this.ctx) this._initAudio();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const chime1 = this.ctx.createOscillator();
        const cGain1 = this.ctx.createGain();
        chime1.type = 'sine';
        chime1.frequency.setValueAtTime(987.77, now);
        cGain1.gain.setValueAtTime(0.3, now);
        cGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        const chime2 = this.ctx.createOscillator();
        const cGain2 = this.ctx.createGain();
        chime2.type = 'sine';
        chime2.frequency.setValueAtTime(1479.98, now + 0.08);
        cGain2.gain.setValueAtTime(0.35, now + 0.08);
        cGain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

        chime1.connect(cGain1);
        cGain1.connect(this.masterGain);
        chime2.connect(cGain2);
        cGain2.connect(this.masterGain);

        chime1.start(now);
        chime1.stop(now + 0.15);
        chime2.start(now + 0.08);
        chime2.stop(now + 0.4);

        const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(5000, now + 0.08);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.08, now + 0.08);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.masterGain);
        noise.start(now + 0.08);
        noise.stop(now + 0.2);
    }

    playAngelicChoirSFX() {
        if (!this.isSFXEnabled('choir')) return;
        if (!this.ctx) this._initAudio();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const chord = [349.23, 440.00, 523.25, 698.46];
        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.frequency.setValueAtTime(5.5, now);
            lfoGain.gain.setValueAtTime(3.0, now);
            lfo.connect(osc.frequency);
            lfo.start(now);
            lfo.stop(now + 1.6);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 1.6);
        });
    }

    playTrashPickupSFX() {
        if (!this.isSFXEnabled('trash')) return;
        if (!this.ctx) this._initAudio();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    playDialogAppearSFX() {
        if (!this.isSFXEnabled('dialog')) return;
        if (!this.ctx) this._initAudio();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.06);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    playEngageSFX() {
        if (!this.isSFXEnabled('dialog')) return;
        if (!this.ctx) this._initAudio();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playRobSFX() {
        if (!this.isSFXEnabled('dialog')) return;
        if (!this.ctx) this._initAudio();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
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

    playLofiChord(notes, now, duration = 1.4) {
        if (!this.ctx || this.isMuted) return;
        notes.forEach((note, idx) => {
            const freq = this.NOTES[note];
            if (!freq) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.025);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1100, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.07, now + 0.06);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + idx * 0.025);
            osc.stop(now + duration + 0.05);
        });
    }

    playLofiKick(now) {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.14);

        gain.gain.setValueAtTime(0.42, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.16);
    }

    playLofiSnare(now) {
        if (!this.ctx || this.isMuted) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.1, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(now);
        noise.stop(now + 0.08);

        const body = this.ctx.createOscillator();
        const bodyGain = this.ctx.createGain();
        body.type = 'triangle';
        body.frequency.setValueAtTime(200, now);
        body.frequency.exponentialRampToValueAtTime(75, now + 0.06);
        bodyGain.gain.setValueAtTime(0.2, now);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

        body.connect(bodyGain);
        bodyGain.connect(this.masterGain);
        body.start(now);
        body.stop(now + 0.06);
    }

    playLofiHat(now, soft = false) {
        if (!this.ctx || this.isMuted) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.03);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6500, now);

        const gain = this.ctx.createGain();
        const level = soft ? 0.025 : 0.05;
        gain.gain.setValueAtTime(level, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(now);
        noise.stop(now + 0.03);
    }

    playTrack(trackName) {
        const targetTrack = (trackName || 'lofi').toLowerCase();
        if (this.sequenceInterval && this.currentTrack === targetTrack) {
            return;
        }
        this.stop();

        this._initAudio();
        this.currentTrack = targetTrack;
        this.currentStep = 0;

        if (this.currentTrack === 'cucaracha') {
            this.playCucarachaSoundtrack();
        } else if (this.currentTrack === 'dahgbad') {
            this.playDahgbadSoundtrack();
        } else {
            this.restartSequence();
        }
    }

    restartSequence() {
        if (this.sequenceInterval) {
            clearInterval(this.sequenceInterval);
            this.sequenceInterval = null;
        }

        const effectiveTempo = this.baseTempo * this.tempoMultiplier;
        const stepTime = (60 / effectiveTempo) / 4;

        const chords = [
            ['F3', 'A3', 'C4', 'E4'],
            ['E3', 'G3', 'B3', 'D4'],
            ['D3', 'F3', 'A3', 'C4'],
            ['C3', 'E3', 'G3', 'B3']
        ];
        const bassNotes = ['F2', 'E2', 'D2', 'C2'];

        this.sequenceInterval = setInterval(() => {
            if (!this.currentTrack) return;
            const now = this.ctx ? this.ctx.currentTime : 0;
            const step = this.currentStep % 64;

            const barIndex = Math.floor(step / 16);
            const stepInBar = step % 16;

            if (stepInBar === 0) {
                this.playLofiChord(chords[barIndex], now, stepTime * 14);
            } else if (stepInBar === 10) {
                this.playLofiChord(chords[barIndex], now, stepTime * 5);
            }

            if (stepInBar === 0 || stepInBar === 6) {
                const bassNote = bassNotes[barIndex];
                if (bassNote && this.NOTES[bassNote]) {
                    this.playTone(this.NOTES[bassNote], 'sine', stepTime * 5, now, 0.28);
                }
            }

            if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) {
                this.playLofiKick(now);
            }
            if (stepInBar === 4 || stepInBar === 12) {
                this.playLofiSnare(now);
            }
            if (stepInBar % 2 === 0) {
                this.playLofiHat(now, stepInBar % 4 !== 0);
            }

            this.currentStep++;
        }, stepTime * 1000);
    }

    // ── Dubstep Synthesis Engine ──
    playDubstepWobble(freq, now, duration, wobbleRate = 4) {
        if (!this.ctx || this.isMuted || this.isMusicMuted || !freq) return;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * 1.008, now); // Detune for thick width

        filter.type = 'lowpass';
        filter.Q.setValueAtTime(6.5, now); // Resonant screech/growl

        // Rhythmic LFO lowpass filter wobble modulation
        const totalWobbles = Math.max(1, Math.floor(duration * wobbleRate));
        const wobbleDur = duration / totalWobbles;
        for (let i = 0; i < totalWobbles; i++) {
            const t0 = now + i * wobbleDur;
            const tMid = t0 + wobbleDur * 0.45;
            const tEnd = t0 + wobbleDur;
            filter.frequency.setValueAtTime(220, t0);
            filter.frequency.exponentialRampToValueAtTime(2600, tMid);
            filter.frequency.exponentialRampToValueAtTime(220, tEnd);
        }

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.24, now + 0.03);
        gain.gain.setValueAtTime(0.22, now + duration - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration + 0.05);
        osc2.stop(now + duration + 0.05);
    }

    playDubstepSub(freq, now, duration) {
        if (!this.ctx || this.isMuted || this.isMusicMuted || !freq) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.95, now + duration);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.38, now + 0.03);
        gain.gain.setValueAtTime(0.35, now + duration - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration + 0.05);
    }

    playDubstepKick(now) {
        if (!this.ctx || this.isMuted || this.isMusicMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.18);

        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    playDubstepSnare(now) {
        if (!this.ctx || this.isMuted || this.isMusicMuted) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1600, now);
        noiseFilter.Q.setValueAtTime(1.5, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(now);
        noise.stop(now + 0.18);

        const body = this.ctx.createOscillator();
        const bodyGain = this.ctx.createGain();
        body.type = 'triangle';
        body.frequency.setValueAtTime(240, now);
        body.frequency.exponentialRampToValueAtTime(90, now + 0.1);

        bodyGain.gain.setValueAtTime(0.38, now);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

        body.connect(bodyGain);
        bodyGain.connect(this.masterGain);
        body.start(now);
        body.stop(now + 0.1);
    }

    playDubstepPad(chord, now, duration) {
        if (!this.ctx || this.isMuted || this.isMusicMuted || !chord) return;
        chord.forEach((note, idx) => {
            const freq = this.NOTES[note];
            if (!freq) return;

            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.01);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, now);
            filter.frequency.exponentialRampToValueAtTime(950, now + duration * 0.5);
            filter.frequency.exponentialRampToValueAtTime(400, now + duration);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.04, now + 0.1);
            gain.gain.setValueAtTime(0.035, now + duration - 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + idx * 0.01);
            osc.stop(now + duration + 0.05);
        });
    }

    // ── Cucaracha Heavy Dubstep Soundtrack (Half-Time 140 BPM) ──
    playCucarachaSoundtrack() {
        if (this.sequenceInterval) {
            clearInterval(this.sequenceInterval);
            this.sequenceInterval = null;
        }

        const bpm = 140; // 140 BPM Dubstep Tempo
        const stepTime = (60 / bpm) / 4; // Sixteenth note step duration

        const pads = [
            ['D3', 'F3', 'A3', 'C4'],  // Dm7
            ['AS2', 'D3', 'F3', 'A3'], // Bbmaj7
            ['C3', 'E3', 'G3', 'AS3'], // C7
            ['A2', 'C3', 'E3', 'G3']   // Am7
        ];

        const subNotes = ['D1', 'AS1', 'C1', 'A1'];
        const bassNotes = ['D2', 'AS1', 'C2', 'A1'];

        this.sequenceInterval = setInterval(() => {
            if (this.currentTrack !== 'cucaracha') return;
            const now = this.ctx ? this.ctx.currentTime : 0;
            const step = this.currentStep % 64;

            const barIndex = Math.floor(step / 16);
            const stepInBar = step % 16;

            // 1. Atmospheric Deep Pad Chords (Bar Start)
            if (stepInBar === 0) {
                this.playDubstepPad(pads[barIndex], now, stepTime * 14);
            }

            // 2. Heavy Sub-Bass
            if (stepInBar === 0) {
                const sub = subNotes[barIndex];
                if (sub && this.NOTES[sub]) {
                    this.playDubstepSub(this.NOTES[sub], now, stepTime * 7);
                }
            } else if (stepInBar === 8) {
                const sub = subNotes[barIndex];
                if (sub && this.NOTES[sub]) {
                    this.playDubstepSub(this.NOTES[sub], now, stepTime * 6);
                }
            }

            // 3. Dubstep Wobble Basslines & Growls (No 8-bit beeps!)
            const rootBass = bassNotes[barIndex];
            const rootFreq = rootBass && this.NOTES[rootBass] ? this.NOTES[rootBass] : 73.42;

            if (barIndex === 0) {
                if (stepInBar === 0) this.playDubstepWobble(rootFreq, now, stepTime * 3.8, 2);
                else if (stepInBar === 4) this.playDubstepWobble(rootFreq, now, stepTime * 3.8, 4);
                else if (stepInBar === 10) this.playDubstepWobble(this.NOTES['F2'], now, stepTime * 2.8, 4);
                else if (stepInBar === 13) this.playDubstepWobble(rootFreq, now, stepTime * 2.8, 8);
            } else if (barIndex === 1) {
                if (stepInBar === 0) this.playDubstepWobble(rootFreq, now, stepTime * 3.8, 4);
                else if (stepInBar === 4) this.playDubstepWobble(this.NOTES['D2'], now, stepTime * 3.8, 8);
                else if (stepInBar === 10) this.playDubstepWobble(this.NOTES['F2'], now, stepTime * 2.8, 6);
                else if (stepInBar === 13) this.playDubstepWobble(rootFreq, now, stepTime * 2.8, 8);
            } else if (barIndex === 2) {
                if (stepInBar === 0) this.playDubstepWobble(rootFreq, now, stepTime * 3.8, 2);
                else if (stepInBar === 4) this.playDubstepWobble(this.NOTES['E2'], now, stepTime * 3.8, 4);
                else if (stepInBar === 10) this.playDubstepWobble(this.NOTES['G2'], now, stepTime * 2.8, 8);
                else if (stepInBar === 13) this.playDubstepWobble(rootFreq, now, stepTime * 2.8, 8);
            } else if (barIndex === 3) {
                if (stepInBar === 0) this.playDubstepWobble(rootFreq, now, stepTime * 3.8, 4);
                else if (stepInBar === 4) this.playDubstepWobble(this.NOTES['C2'], now, stepTime * 3.8, 8);
                else if (stepInBar === 10) this.playDubstepWobble(this.NOTES['D2'], now, stepTime * 2.8, 8);
                else if (stepInBar === 13) this.playDubstepWobble(this.NOTES['E2'], now, stepTime * 2.8, 12); // Turnaround stutter
            }

            // 4. Dubstep Half-Time Drum Groove
            if (stepInBar === 0 || stepInBar === 10) {
                this.playDubstepKick(now);
            } else if (stepInBar === 6 && (barIndex === 1 || barIndex === 3)) {
                this.playDubstepKick(now);
            }

            // Half-time snare on beat 3 (step 8)
            if (stepInBar === 8) {
                this.playDubstepSnare(now);
            } else if (stepInBar === 15 && barIndex === 3) {
                this.playDubstepSnare(now); // turnaround ghost snare
            }

            // Crisp Hi-Hats
            if (stepInBar % 2 === 0) {
                this.playLofiHat(now, stepInBar % 4 !== 0);
            }

            this.currentStep++;
        }, stepTime * 1000);
    }

    // ── Dahgbad Lo-Fi Middle Eastern Beat ──
    playDahgbadSoundtrack() {
        if (this.sequenceInterval) {
            clearInterval(this.sequenceInterval);
            this.sequenceInterval = null;
        }

        const bpm = 74;
        const stepTime = (60 / bpm) / 4;

        const chords = [
            ['D3', 'FS3', 'A3', 'C4'],
            ['DS3', 'G3', 'AS3', 'DS4'],
            ['C3', 'E3', 'G3', 'AS3'],
            ['D3', 'FS3', 'A3', 'D4']
        ];
        const bassNotes = ['D2', 'DS2', 'C2', 'D2'];
        const hijazScale = ['D4', 'DS4', 'FS4', 'G4', 'A4', 'AS4', 'C5', 'D5', 'DS5', 'FS5'];

        this.sequenceInterval = setInterval(() => {
            if (this.currentTrack !== 'dahgbad') return;
            const now = this.ctx ? this.ctx.currentTime : 0;
            const step = this.currentStep % 64;

            const barIndex = Math.floor(step / 16);
            const stepInBar = step % 16;

            if (stepInBar === 0 || stepInBar === 8) {
                this.playLofiChord(chords[barIndex], now, stepTime * 7.5);
            }

            if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) {
                const bassNote = bassNotes[barIndex];
                if (bassNote && this.NOTES[bassNote]) {
                    this.playTone(this.NOTES[bassNote], 'sine', stepTime * 5, now, 0.32);
                }
                this.playLofiKick(now);
            }

            if (stepInBar === 4 || stepInBar === 12 || stepInBar === 14) {
                this.playLofiSnare(now);
            }
            if (stepInBar % 2 === 0) {
                this.playLofiHat(now, stepInBar % 4 !== 0);
            }

            if ([2, 5, 8, 11, 13].includes(stepInBar)) {
                const noteIndex = (step + barIndex * 3) % hijazScale.length;
                const noteName = hijazScale[noteIndex];
                if (noteName && this.NOTES[noteName]) {
                    const startFreq = this.NOTES[noteName];
                    const endFreq = startFreq * (stepInBar % 3 === 0 ? 1.059 : 0.944);
                    
                    if (this.ctx && !this.isMuted) {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(startFreq, now);
                        osc.frequency.exponentialRampToValueAtTime(endFreq, now + stepTime * 1.2);

                        const filter = this.ctx.createBiquadFilter();
                        filter.type = 'lowpass';
                        filter.frequency.setValueAtTime(950, now);

                        gain.gain.setValueAtTime(0.14, now);
                        gain.gain.exponentialRampToValueAtTime(0.0001, now + stepTime * 1.5);

                        osc.connect(filter);
                        filter.connect(gain);
                        gain.connect(this.masterGain);

                        osc.start(now);
                        osc.stop(now + stepTime * 1.5);
                    }
                }
            }

            this.currentStep++;
        }, stepTime * 1000);
    }

    playVictoriousEndSoundtrack() {
        this.stop();
        this._initAudio();
        this.currentTrack = 'victory';
        this.currentStep = 0;

        const bpm = 90;
        const stepTime = (60 / bpm) / 4;

        const chords = [
            ['C4', 'E4', 'G4', 'B4'],
            ['F3', 'A3', 'C4', 'E4'],
            ['G3', 'B3', 'D4', 'F4'],
            ['C4', 'E4', 'G4', 'C5']
        ];
        const bassNotes = ['C2', 'F2', 'G2', 'C2'];

        this.sequenceInterval = setInterval(() => {
            if (!this.currentTrack) return;
            const now = this.ctx ? this.ctx.currentTime : 0;
            const step = this.currentStep % 64;

            const barIndex = Math.floor(step / 16);
            const stepInBar = step % 16;

            if (stepInBar === 0 || stepInBar === 8) {
                this.playLofiChord(chords[barIndex], now, stepTime * 7);
            }

            if (stepInBar === 0 || stepInBar === 4 || stepInBar === 8 || stepInBar === 12) {
                const bassNote = bassNotes[barIndex];
                if (bassNote && this.NOTES[bassNote]) {
                    this.playTone(this.NOTES[bassNote], 'sine', stepTime * 3, now, 0.25);
                }
            }

            if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) this.playLofiKick(now);
            if (stepInBar === 4 || stepInBar === 12) this.playLofiSnare(now);
            if (stepInBar % 2 === 0) this.playLofiHat(now, stepInBar % 4 !== 0);

            this.currentStep++;
        }, stepTime * 1000);
    }

    playMelancholyEndSoundtrack() {
        this.stop();
        this._initAudio();
        this.currentTrack = 'defeat';
        this.currentStep = 0;

        const bpm = 56;
        const stepTime = (60 / bpm) / 4;

        const chords = [
            ['A3', 'C4', 'E4', 'G4'],
            ['D3', 'F3', 'A3', 'C4'],
            ['E3', 'G3', 'B3', 'D4'],
            ['A3', 'C4', 'E4', 'A4']
        ];
        const bassNotes = ['A2', 'D2', 'E2', 'A2'];

        this.sequenceInterval = setInterval(() => {
            if (!this.currentTrack) return;
            const now = this.ctx ? this.ctx.currentTime : 0;
            const step = this.currentStep % 64;

            const barIndex = Math.floor(step / 16);
            const stepInBar = step % 16;

            if (stepInBar === 0) {
                this.playLofiChord(chords[barIndex], now, stepTime * 14);
            }

            if (stepInBar === 0 || stepInBar === 8) {
                const bassNote = bassNotes[barIndex];
                if (bassNote && this.NOTES[bassNote]) {
                    this.playTone(this.NOTES[bassNote], 'sine', stepTime * 6, now, 0.22);
                }
            }

            if (stepInBar === 0) this.playLofiKick(now);
            if (stepInBar === 8) this.playLofiSnare(now);
            if (stepInBar % 4 === 0) this.playLofiHat(now, true);

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

    toggleMute() {
        return this.toggleMusicMute();
    }

    toggleSFX() {
        this.sfxMuted = !this.sfxMuted;
        return this.sfxMuted;
    }
}

const rawSoundManager = new SoundManager();
window.soundManager = new Proxy(rawSoundManager, {
    get(target, prop) {
        if (prop in target) {
            return typeof target[prop] === 'function' ? target[prop].bind(target) : target[prop];
        }
        if (typeof prop === 'string' && prop.startsWith('play')) {
            return () => {};
        }
        return target[prop];
    }
});

window.selectedMusicTrack = 'lofi';

document.addEventListener('DOMContentLoaded', () => {
    if (window.soundManager) {
        const dest = (window.travelDestination || '').toLowerCase();
        if (dest === 'cucaracha') {
            window.soundManager.playTrack('cucaracha');
        } else if (dest === 'dahgbad') {
            window.soundManager.playTrack('dahgbad');
        } else {
            window.soundManager.playTrack('lofi');
        }
    }
});
