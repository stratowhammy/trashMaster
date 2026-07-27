/* 8-Bit Chiptune Web Audio Synthesizer & Music Manager */
class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMuted = false;
        this.currentTrack = null;
        this.sequenceInterval = null;
        this.currentStep = 0;
        this.tempo = 110;
        this.volume = 0.22;

        // Note Frequencies (Hz)
        this.NOTES = {
            'C3': 130.81, 'CS3': 138.59, 'D3': 146.83, 'DS3': 155.56, 'E3': 164.81, 'F3': 174.61, 'FS3': 185.00, 'G3': 196.00, 'GS3': 207.65, 'A3': 220.00, 'AS3': 233.08, 'B3': 246.94,
            'C4': 261.63, 'CS4': 277.18, 'D4': 293.66, 'DS4': 311.13, 'E4': 329.63, 'F4': 349.23, 'FS4': 369.99, 'G4': 392.00, 'GS4': 415.30, 'A4': 440.00, 'AS4': 466.16, 'B4': 493.88,
            'C5': 523.25, 'CS5': 554.37, 'D5': 587.33, 'DS5': 622.25, 'E5': 659.25, 'F5': 698.46, 'FS5': 739.99, 'G5': 783.99, 'GS5': 830.61, 'A5': 880.00, 'AS5': 932.33, 'B5': 987.77,
            'C6': 1046.50, 'CS6': 1108.73, 'D6': 1174.66, 'DS6': 1244.51, 'E6': 1318.51, 'F6': 1396.91, 'FS6': 1479.98, 'G6': 1567.98, 'GS6': 1661.22, 'A6': 1760.00, 'AS6': 1864.66, 'B6': 1975.53,
            'C7': 2093.00, 'CS7': 2217.46, 'D7': 2349.32,
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
        document.addEventListener('mousemove', unlock, { once: true });
        document.addEventListener('touchstart', unlock);
    }

    playTone(freq, type = 'square', duration = 0.15, startTime = 0, gainLevel = 0.15) {
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

    playNoise(duration = 0.08, startTime = 0, isSnare = false) {
        if (!this.ctx || this.isMuted) return;

        const now = startTime || this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = isSnare ? 'lowpass' : 'highpass';
        filter.frequency.setValueAtTime(isSnare ? 1200 : 7000, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isSnare ? 0.18 : 0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        whiteNoise.start(now);
        whiteNoise.stop(now + duration);
    }

    playTrack(trackName) {
        this.stop();

        this._initAudio();
        this.currentTrack = trackName;
        this.currentStep = 0;

        let melody = [], bass = [], drums = [];

        if (trackName === 'store') {
            // Relaxed 8-bit Shopping Theme (C Major, 90 BPM, 8 Bars / 128 Steps)
            this.tempo = 90;
            melody = [
                // Bar 1
                'E5', '-', 'G5', '-', 'C6', '-', 'B5', 'A5',  'G5', '-', 'E5', '-', 'C5', '-', 'D5', 'E5',
                // Bar 2
                'F5', '-', 'A5', '-', 'D6', '-', 'C6', 'B5',  'A5', '-', 'F5', '-', 'D5', '-', 'E5', 'F5',
                // Bar 3
                'G5', 'C6', 'E6', '-', 'D6', 'C6', 'B5', 'A5',  'G5', 'E5', 'C5', 'G4', 'A4', 'B4', 'C5', 'D5',
                // Bar 4
                'E5', '-', 'D5', 'C5', 'D5', '-', '-', '-',    'E5', 'G5', 'C6', '-', '-', '-', '-', '-',
                // Bar 5
                'A5', '-', 'C6', '-', 'F6', '-', 'E6', 'D6',  'C6', '-', 'A5', '-', 'F5', '-', 'G5', 'A5',
                // Bar 6
                'G5', '-', 'B5', '-', 'E6', '-', 'D6', 'C6',  'B5', '-', 'G5', '-', 'E5', '-', 'F5', 'G5',
                // Bar 7
                'F5', 'A5', 'C6', 'E6', 'D6', 'C6', 'B5', 'A5',  'G5', 'B5', 'D6', 'F6', 'E6', 'D6', 'C6', 'B5',
                // Bar 8
                'C6', '-', '-', '-', 'G5', '-', 'E5', '-',    'C5', '-', '-', '-', '-', '-', '-', '-'
            ];
            bass = [
                // Bar 1
                'C3', '-', 'G3', '-', 'C3', '-', 'G3', '-',  'C3', '-', 'G3', '-', 'C3', '-', 'G3', '-',
                // Bar 2
                'D3', '-', 'A3', '-', 'D3', '-', 'A3', '-',  'D3', '-', 'A3', '-', 'D3', '-', 'A3', '-',
                // Bar 3
                'E3', '-', 'B3', '-', 'F3', '-', 'C4', '-',  'G3', '-', 'D4', '-', 'G3', '-', 'D4', '-',
                // Bar 4
                'C3', '-', 'G3', '-', 'G3', '-', 'D4', '-',  'C3', '-', 'E3', '-', 'G3', '-', 'C4', '-',
                // Bar 5
                'F3', '-', 'C4', '-', 'F3', '-', 'C4', '-',  'F3', '-', 'C4', '-', 'F3', '-', 'C4', '-',
                // Bar 6
                'E3', '-', 'B3', '-', 'E3', '-', 'B3', '-',  'E3', '-', 'B3', '-', 'E3', '-', 'B3', '-',
                // Bar 7
                'D3', '-', 'A3', '-', 'F3', '-', 'C4', '-',  'G3', '-', 'D4', '-', 'G3', '-', 'F3', 'E3',
                // Bar 8
                'C3', '-', 'G3', '-', 'C3', '-', 'G3', '-',  'C3', '-', '-', '-', '-', '-', '-', '-'
            ];
            drums = [
                'hat', '-', 'hat', '-', 'snare', '-', 'hat', '-',  'hat', '-', 'hat', '-', 'snare', '-', 'hat', '-'
            ];
        } else if (trackName === 'chaos') {
            // Intense High-BPM Frantic Chiptune (A Minor, 132 BPM, 8 Bars / 128 Steps)
            this.tempo = 132;
            melody = [
                // Bar 1
                'A4', 'C5', 'E5', 'A5', 'GS5', 'E5', 'C5', 'GS4', 'A4', 'C5', 'E5', 'A5', 'B5', 'G5', 'E5', 'C5',
                // Bar 2
                'F5', 'A5', 'C6', 'F6', 'E6', 'C6', 'A5', 'F5',  'D5', 'F5', 'A5', 'D6', 'C6', 'A5', 'F5', 'D5',
                // Bar 3
                'E5', 'GS5', 'B5', 'E6', 'D6', 'B5', 'GS5', 'E5','F5', 'GS5', 'B5', 'D6', 'C6', 'B5', 'A5', 'GS5',
                // Bar 4
                'A5', 'E5', 'C5', 'A4', 'C5', 'E5', 'A5', 'C6', 'B5', 'G5', 'D5', 'B4', 'G4', 'B4', 'D5', 'G5',
                // Bar 5
                'C6', 'E6', 'G6', 'C7', 'B6', 'G6', 'E6', 'C6', 'A5', 'C6', 'E6', 'A6', 'GS6', 'E6', 'C6', 'A5',
                // Bar 6
                'F5', 'A5', 'C6', 'F6', 'E6', 'D6', 'C6', 'B5', 'E5', 'GS5', 'B5', 'E6', 'D6', 'C6', 'B5', 'GS5',
                // Bar 7
                'A5', 'C6', 'E6', 'A6', 'GS6', 'E6', 'C6', 'GS5','A5', 'C6', 'E6', 'A6', 'B6', 'A6', 'GS6', 'E6',
                // Bar 8
                'A6', '-', 'E6', '-', 'C6', '-', 'A5', '-',    'E5', '-', 'C5', '-', 'A4', '-', '-', '-'
            ];
            bass = [
                // Bar 1
                'A3', 'A3', 'A3', 'A3', 'E3', 'E3', 'E3', 'E3', 'A3', 'A3', 'A3', 'A3', 'G3', 'G3', 'G3', 'G3',
                // Bar 2
                'F3', 'F3', 'F3', 'F3', 'C3', 'C3', 'C3', 'C3', 'D3', 'D3', 'D3', 'D3', 'F3', 'F3', 'F3', 'F3',
                // Bar 3
                'E3', 'E3', 'E3', 'E3', 'GS3', 'GS3', 'GS3', 'GS3', 'E3', 'E3', 'E3', 'E3', 'E3', 'E3', 'E3', 'E3',
                // Bar 4
                'A3', 'A3', 'C3', 'C3', 'E3', 'E3', 'A3', 'A3', 'G3', 'G3', 'B3', 'B3', 'D3', 'D3', 'G3', 'G3',
                // Bar 5
                'C3', 'C3', 'C3', 'C3', 'G3', 'G3', 'G3', 'G3', 'A3', 'A3', 'A3', 'A3', 'E3', 'E3', 'E3', 'E3',
                // Bar 6
                'F3', 'F3', 'F3', 'F3', 'D3', 'D3', 'D3', 'D3', 'E3', 'E3', 'E3', 'E3', 'GS3', 'GS3', 'GS3', 'GS3',
                // Bar 7
                'A3', 'A3', 'A3', 'A3', 'E3', 'E3', 'E3', 'E3', 'A3', 'A3', 'A3', 'A3', 'E3', 'E3', 'E3', 'E3',
                // Bar 8
                'A3', '-', 'E3', '-', 'A3', '-', 'E3', '-', 'A3', '-', '-', '-', '-', '-', '-', '-'
            ];
            drums = [
                'kick', 'hat', 'snare', 'hat', 'kick', 'kick', 'snare', 'hat',
                'kick', 'hat', 'snare', 'hat', 'kick', 'snare', 'snare', 'hat'
            ];
        } else if (trackName === 'dnb') {
            // Atmospheric Drum & Bass — D Minor, 174 BPM, 8 Bars / 128 Steps
            // Driving half-time feel: hard kicks on 1 & 3, snare on 2 & 4, rolling hi-hats
            this.tempo = 174;
            melody = [
                // Bar 1 — dark atmospheric lead, D minor
                'D5', '-', '-', 'F5', '-', 'A5', '-', '-',  'C6', '-', 'A5', '-', '-', 'F5', '-', 'D5',
                // Bar 2
                '-', '-', 'E5', '-', 'G5', '-', 'C6', 'A5',  '-', 'G5', '-', 'F5', '-', '-', 'D5', '-',
                // Bar 3 — climbing phrase
                'F5', 'G5', 'A5', '-', 'C6', '-', 'D6', '-',  'C6', '-', 'A5', '-', 'G5', 'F5', 'E5', '-',
                // Bar 4
                'D5', '-', '-', '-', 'A5', '-', 'F5', '-',  'D5', '-', '-', 'E5', 'F5', '-', 'G5', '-',
                // Bar 5 — tension build
                'A5', '-', 'C6', '-', 'D6', '-', 'F6', '-',  'E6', '-', 'D6', '-', 'C6', '-', 'A5', '-',
                // Bar 6
                'G5', '-', 'A5', 'C6', '-', 'D6', '-', 'A5',  'G5', 'F5', '-', 'E5', 'D5', '-', '-', '-',
                // Bar 7 — drop melodic hook
                'D5', 'F5', 'A5', 'D6', '-', 'C6', 'A5', 'G5',  'F5', '-', 'G5', '-', 'A5', '-', 'C6', 'D6',
                // Bar 8 — outro resolve
                'A5', '-', 'G5', '-', 'F5', '-', 'D5', '-',  '-', '-', '-', '-', 'D5', '-', '-', '-'
            ];
            bass = [
                // Bar 1 — heavy sub-bass pumping on beat
                'D3', '-', 'D3', 'D3', '-', 'D3', '-', 'D3',  'A3', '-', 'A3', '-', 'D3', '-', 'D3', '-',
                // Bar 2
                'F3', '-', 'F3', '-', 'C3', '-', 'C3', 'F3',  'A3', '-', 'G3', '-', 'F3', '-', 'D3', '-',
                // Bar 3
                'D3', 'D3', '-', 'F3', '-', 'A3', '-', 'D4',  'D3', '-', 'D3', 'C3', '-', 'A3', '-', 'G3',
                // Bar 4
                'F3', '-', 'E3', '-', 'D3', '-', 'D3', '-',  'F3', 'F3', '-', 'G3', 'A3', '-', '-', 'D3',
                // Bar 5
                'A3', '-', 'A3', '-', 'A3', 'G3', 'F3', '-',  'E3', '-', 'F3', '-', 'G3', '-', 'A3', '-',
                // Bar 6
                'D3', '-', 'D3', 'F3', '-', 'G3', '-', 'A3',  'D3', '-', 'D3', '-', 'C3', '-', 'D3', '-',
                // Bar 7
                'D3', 'F3', 'A3', '-', 'D4', '-', 'C4', 'A3',  'F3', '-', 'G3', 'A3', '-', 'C4', '-', 'D4',
                // Bar 8
                'A3', '-', 'G3', '-', 'F3', '-', 'D3', 'D3',  '-', 'D3', '-', 'F3', 'D3', '-', '-', '-'
            ];
            // Amen-style drum pattern: 16th-note resolution, 4-bar loop
            drums = [
                // Bar A — big kick/snare + rolling hats
                'kick', 'hat',  'hat',  'hat',  'snare','hat',  'hat',  'kick',
                'kick', 'hat',  'snare','hat',  'kick', 'hat',  'kick', 'hat',
                // Bar B — syncopated
                'kick', 'hat',  'snare','hat',  'hat',  'kick', 'hat',  'snare',
                'hat',  'kick', 'hat',  'kick', 'snare','hat',  'hat',  'kick',
                // Bar C — half-time break
                'kick', '-',    'hat',  '-',    'snare','-',    'hat',  'hat',
                'kick', '-',    'kick', 'hat',  'snare','-',    'hat',  '-',
                // Bar D — full roll
                'kick', 'hat',  'kick', 'hat',  'snare','hat',  'kick', 'hat',
                'kick', 'hat',  'snare','hat',  'kick', 'hat',  'snare','kick'
            ];
        } else {
            // General Gameplay: Upbeat 8-Bar Retro Arcade Chiptune (G Major, 110 BPM, 128 Steps)
            this.tempo = 110;
            melody = [
                // Bar 1
                'G4', 'B4', 'D5', 'G5', 'FS5', '-', 'D5', '-',  'B4', '-', 'G4', '-', 'A4', 'B4', 'C5', 'D5',
                // Bar 2
                'E5', 'G5', 'B5', 'E6', 'D6', '-', 'B5', '-',  'G5', '-', 'E5', '-', 'FS5', 'G5', 'A5', 'B5',
                // Bar 3
                'C6', '-', 'G5', '-', 'E5', '-', 'C5', '-',    'D6', '-', 'A5', '-', 'FS5', '-', 'D5', '-',
                // Bar 4
                'B5', 'G5', 'D5', 'B4', 'G4', '-', 'A4', 'B4',  'C5', 'B4', 'A4', 'G4', 'FS4', 'G4', 'A4', 'B4',
                // Bar 5
                'D5', 'FS5', 'A5', 'D6', 'CS6', '-', 'A5', '-', 'FS5', '-', 'D5', '-', 'E5', 'FS5', 'G5', 'A5',
                // Bar 6
                'B5', 'D6', 'G6', 'D6', 'B5', '-', 'G5', '-',  'E5', '-', 'C5', '-', 'D5', 'E5', 'FS5', 'G5',
                // Bar 7
                'A5', 'C6', 'E6', 'A6', 'G6', 'E6', 'C6', 'A5', 'D6', 'FS6', 'A6', 'D7', 'C7', 'A6', 'FS6', 'D6',
                // Bar 8
                'G6', '-', 'D6', '-', 'B5', '-', 'G5', '-',    'D5', '-', 'B4', '-', 'G4', '-', '-', '-'
            ];
            bass = [
                // Bar 1
                'G3', '-', 'G3', '-', 'D3', '-', 'D3', '-',  'G3', '-', 'G3', '-', 'B3', '-', 'D4', '-',
                // Bar 2
                'E3', '-', 'E3', '-', 'B3', '-', 'B3', '-',  'E3', '-', 'E3', '-', 'G3', '-', 'B3', '-',
                // Bar 3
                'C3', '-', 'C3', '-', 'G3', '-', 'G3', '-',  'D3', '-', 'D3', '-', 'A3', '-', 'A3', '-',
                // Bar 4
                'G3', '-', 'D3', '-', 'G3', '-', 'D3', '-',  'C3', '-', 'B3', '-', 'A3', '-', 'D3', '-',
                // Bar 5
                'D3', '-', 'D3', '-', 'A3', '-', 'A3', '-',  'D3', '-', 'D3', '-', 'FS3', '-', 'A3', '-',
                // Bar 6
                'G3', '-', 'G3', '-', 'D3', '-', 'D3', '-',  'C3', '-', 'C3', '-', 'E3', '-', 'G3', '-',
                // Bar 7
                'A3', '-', 'A3', '-', 'C4', '-', 'C4', '-',  'D3', '-', 'D3', '-', 'FS3', '-', 'A3', '-',
                // Bar 8
                'G3', '-', 'D3', '-', 'G3', '-', 'D3', '-',  'G3', '-', '-', '-', '-', '-', '-', '-'
            ];
            drums = [
                'kick', 'hat', 'snare', 'hat', 'kick', 'kick', 'snare', 'hat',
                'kick', 'hat', 'snare', 'hat', 'kick', 'snare', 'snare', 'hat'
            ];
        }

        const stepTime = (60 / this.tempo) / 4;

        this.sequenceInterval = setInterval(() => {
            if (!this.currentTrack) return;
            const now = this.ctx ? this.ctx.currentTime : 0;
            const stepIndex = this.currentStep % 128;

            const melNote = (melody && melody.length > 0) ? melody[stepIndex % melody.length] : '-';
            if (melNote && melNote !== '-' && this.NOTES[melNote]) {
                this.playTone(this.NOTES[melNote], 'square', stepTime * 0.9, now, 0.14, false);
            }
            const bassNote = (bass && bass.length > 0) ? bass[stepIndex % bass.length] : '-';
            if (bassNote && bassNote !== '-' && this.NOTES[bassNote]) {
                this.playTone(this.NOTES[bassNote], trackName === 'dnb' ? 'sawtooth' : 'triangle', stepTime * 1.2, now, 0.22, false);
            }
            const drumNote = (drums && drums.length > 0) ? drums[stepIndex % drums.length] : '-';
            if (drumNote === 'hat' || drumNote === 'hihat') {
                this.playNoise(trackName === 'dnb' ? 0.025 : 0.04, now, false);
            } else if (drumNote === 'snare') {
                this.playNoise(trackName === 'dnb' ? 0.12 : 0.08, now, true);
            } else if (drumNote === 'kick') {
                if (trackName === 'dnb') {
                    // Hard D&B kick: fast freq sweep from 180Hz down to 40Hz
                    if (this.ctx && !this.isMuted) {
                        const ko = this.ctx.createOscillator();
                        const kg = this.ctx.createGain();
                        ko.type = 'sine';
                        ko.frequency.setValueAtTime(180, now);
                        ko.frequency.exponentialRampToValueAtTime(40, now + 0.1);
                        kg.gain.setValueAtTime(0.9, now);
                        kg.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
                        ko.connect(kg);
                        kg.connect(this.masterGain);
                        ko.start(now);
                        ko.stop(now + 0.18);
                    }
                } else {
                    this.playTone(110, 'triangle', 0.08, now, 0.35);
                }
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

    // Sound effects disabled entirely per user request
    playTrashPickupSFX() {}
    playDialogAppearSFX() {}
    playHandshakeSFX() {}
    playRobSFX() {}
    playKillSFX() {}
    playEngageSFX() {}

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.bgmGain && this.ctx) {
            this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        }
        this.updateAudioUI();
        return this.isMuted;
    }

    toggleSFX() {
        this.sfxMuted = true;
        return true;
    }

    updateAudioUI() {
        const bgmBtn = document.getElementById('btn-toggle-bgm');
        if (bgmBtn) {
            bgmBtn.innerHTML = this.isMuted ? '🎵 Music: OFF (M)' : '🎵 Music: ON (M)';
            bgmBtn.style.background = this.isMuted ? '#666' : '#b55fe6';
            bgmBtn.style.borderColor = this.isMuted ? '#444' : '#9240c5';
        }
    }
}

window.soundManager = new SoundManager();
window.selectedMusicTrack = 'game';

document.addEventListener('DOMContentLoaded', () => {
    const bgmBtn = document.getElementById('btn-toggle-bgm');
    if (bgmBtn) {
        bgmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.soundManager.toggleMute();
        });
    }

    const musicSelect = document.getElementById('music-style-select');
    if (musicSelect) {
        musicSelect.addEventListener('change', (e) => {
            window.selectedMusicTrack = e.target.value;
            if (window.soundManager && window.soundManager.currentTrack && window.soundManager.currentTrack !== 'store') {
                window.soundManager.playTrack(window.selectedMusicTrack);
            }
        });
    }

    if (window.soundManager) {
        window.soundManager.updateAudioUI();
        window.soundManager.playTrack('store');
    }
});
