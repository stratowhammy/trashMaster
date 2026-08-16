// ============================================================
// keybinds.js — Customizable Keybinds System & Menu Manager
// ============================================================

const DEFAULT_KEYBINDS = {
    // Movement & Basics
    moveUp: 'ArrowUp',
    moveDown: 'ArrowDown',
    moveLeft: 'ArrowLeft',
    moveRight: 'ArrowRight',
    jump: ' ',
    sprint: 'Shift',
    pickupTrash: 'q',
    interact: 'e',
    harvestTree: 'x',

    // Construction / Builder Mode
    builderBuyCheckDoor: 'e',
    builderOfferTenant: 'a',
    builderBribeInspector: 'b',

    // Pirate Mode
    pirateCannon: 'c',
    pirateSeaDumpEngage: 'e',

    // Ranger Mode
    rangerCapture: 'c',
    rangerDeliverZoo: 'e',

    // Crime Mode
    crimeIntimidate: 'i',
    crimeRob: 'r',
    crimeStealCar: 's',
    crimeDumpTrash: 'd',
    crimeKillDon: 'k',
    policeBribe: 'b',

    // Politics Mode
    campaignSpeech: 'a',
    politicsShakeHands: 's',
    mayorBribe: 'b',
    politicsIntimidate: 'i',

    // Cult & Posters
    posterPropaganda: 'g',
    posterRecruitment: 't',
    posterChurch: 'm',

    // Consumables & Special Items
    useProtection: 'p',
    useTime: 't',
    useMushrooms: 'u',
    useWings: 'w',
    useSnacks: 'k',
    useFertilizer: 'f',
    useBottomlessPit: 'B',
    eatShroom: 'M',

    // Audio Controls
    toggleMusic: 'm',
    toggleSFX: 'n'
};

const ACTION_CONFIG = [
    {
        category: '🏃 MOVEMENT & BASIC ACTIONS',
        actions: [
            { id: 'moveUp', label: 'Move Up' },
            { id: 'moveDown', label: 'Move Down' },
            { id: 'moveLeft', label: 'Move Left' },
            { id: 'moveRight', label: 'Move Right' },
            { id: 'jump', label: 'Jump' },
            { id: 'sprint', label: 'Sprint (Hold Shift to Run Fast)' },
            { id: 'pickupTrash', label: 'Pick Up Trash' },
            { id: 'interact', label: 'Interact / Enter Building / Deliver' },
            { id: 'harvestTree', label: 'Harvest Tree (Cut Wood)' }
        ]
    },
    {
        category: '🏗️ CONSTRUCTION / BUILDER MODE',
        actions: [
            { id: 'builderBuyCheckDoor', label: 'Check Building / Buy Building Door' },
            { id: 'builderOfferTenant', label: 'Offer Apartment / Recruit Tenant' },
            { id: 'builderBribeInspector', label: 'Bribe Building Inspector' }
        ]
    },
    {
        category: '🏴‍☠️ PIRATE MODE',
        actions: [
            { id: 'pirateCannon', label: 'Fire Pirate Cannon / Disembark' },
            { id: 'pirateSeaDumpEngage', label: 'Engage / Unload at Sea Dump Dock' }
        ]
    },
    {
        category: '🦁 RANGER & ANIMAL MODE',
        actions: [
            { id: 'rangerCapture', label: 'Ranger Capture Animal Node' },
            { id: 'rangerDeliverZoo', label: 'Deliver Animals to ZOO' }
        ]
    },
    {
        category: '🕵️ CRIME MODE',
        actions: [
            { id: 'crimeIntimidate', label: 'Intimidate Rival / Citizen' },
            { id: 'crimeRob', label: 'Rob Citizen / Don' },
            { id: 'crimeStealCar', label: 'Steal Car' },
            { id: 'crimeDumpTrash', label: 'Illegal Trash Dump' },
            { id: 'crimeKillDon', label: 'Eliminate Target / Don' },
            { id: 'policeBribe', label: 'Bribe Police Chief' }
        ]
    },
    {
        category: '🏛️ POLITICS & ELECTIONS',
        actions: [
            { id: 'campaignSpeech', label: 'Deliver Campaign Speech' },
            { id: 'politicsShakeHands', label: 'Shake Hands with Voter' },
            { id: 'mayorBribe', label: 'Bribe Mayor' },
            { id: 'politicsIntimidate', label: 'Intimidate Voter' }
        ]
    },
    {
        category: '🧹 CULT MODE & POSTERS',
        actions: [
            { id: 'posterPropaganda', label: 'Post Propaganda Poster' },
            { id: 'posterRecruitment', label: 'Post Recruitment Poster' },
            { id: 'posterChurch', label: 'Post Church Poster' }
        ]
    },
    {
        category: '🍕 CONSUMABLES & ITEMS',
        actions: [
            { id: 'useProtection', label: 'Use Protection' },
            { id: 'useTime', label: 'Use Borrowed Time' },
            { id: 'useMushrooms', label: 'Use Mushrooms' },
            { id: 'useWings', label: 'Use Wings' },
            { id: 'useSnacks', label: 'Use Snacks' },
            { id: 'useFertilizer', label: 'Plant Fertilizer (Flowers)' },
            { id: 'useBottomlessPit', label: 'Activate Bottomless Pit (Shift+B)' },
            { id: 'eatShroom', label: 'Eat Mushroom (Shift+M)' }
        ]
    },
    {
        category: '🎵 AUDIO CONTROLS',
        actions: [
            { id: 'toggleMusic', label: 'Toggle Music Mute' },
            { id: 'toggleSFX', label: 'Toggle SFX Mute' }
        ]
    }
];

class KeybindManager {
    constructor() {
        this.keybinds = {};
        this.activeRebindAction = null;
        this.loadKeybinds();
        this.initGlobalListener();
    }

    loadKeybinds() {
        try {
            const saved = localStorage.getItem('trashmaster_keybinds');
            if (saved) {
                this.keybinds = Object.assign({}, DEFAULT_KEYBINDS, JSON.parse(saved));
            } else {
                this.keybinds = Object.assign({}, DEFAULT_KEYBINDS);
            }
        } catch (e) {
            this.keybinds = Object.assign({}, DEFAULT_KEYBINDS);
        }
        window.keybinds = this.keybinds;
    }

    saveKeybinds() {
        try {
            localStorage.setItem('trashmaster_keybinds', JSON.stringify(this.keybinds));
        } catch (e) {
            console.error('Failed to save keybinds:', e);
        }
        window.keybinds = this.keybinds;
    }

    resetKeybinds() {
        this.keybinds = Object.assign({}, DEFAULT_KEYBINDS);
        this.saveKeybinds();
        this.renderMenu();
        if (window.game && window.game.hud) {
            window.game.hud.showFollowerNotification("⌨️ Keybinds reset to defaults!", true);
        }
    }

    getKey(actionId) {
        return (this.keybinds[actionId] || DEFAULT_KEYBINDS[actionId] || '').toLowerCase();
    }

    isKey(e, actionId) {
        if (!e || !e.key) return false;
        const assigned = this.getKey(actionId);
        const pressed = e.key.toLowerCase();

        // Standard movement WASD defaults fallback if matching
        if (actionId === 'moveUp' && (pressed === 'arrowup' || pressed === 'w')) return true;
        if (actionId === 'moveDown' && (pressed === 'arrowdown' || pressed === 's')) return true;
        if (actionId === 'moveLeft' && (pressed === 'arrowleft' || pressed === 'a')) return true;
        if (actionId === 'moveRight' && (pressed === 'arrowright' || pressed === 'd')) return true;
        if (actionId === 'jump' && (pressed === ' ' || pressed === 'space' || pressed === 'spacebar' || (e && e.code === 'Space'))) return true;
        if (actionId === 'sprint' && (pressed === 'shift' || (e && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')))) return true;

        return pressed === assigned;
    }

    formatKeyName(key) {
        if (!key) return '[ NONE ]';
        if (key === ' ' || key.toLowerCase() === 'space') return '[ SPACE ]';
        if (key.toLowerCase() === 'shift') return '[ SHIFT ]';
        if (key === 'ArrowUp') return '[ UP ARROW ]';
        if (key === 'ArrowDown') return '[ DOWN ARROW ]';
        if (key === 'ArrowLeft') return '[ LEFT ARROW ]';
        if (key === 'ArrowRight') return '[ RIGHT ARROW ]';
        if (key.length === 1) return `[ ${key.toUpperCase()} ]`;
        return `[ ${key.toUpperCase()} ]`;
    }

    openMenu() {
        const dialog = document.getElementById('keybinds-options-dialog');
        if (dialog) {
            dialog.classList.remove('hidden');
            this.renderMenu();
        }
    }

    closeMenu() {
        const dialog = document.getElementById('keybinds-options-dialog');
        if (dialog) {
            dialog.classList.add('hidden');
            this.activeRebindAction = null;
        }
    }

    bindKey(actionId, newKey) {
        if (newKey === 'Escape') {
            this.activeRebindAction = null;
            this.renderMenu();
            return;
        }
        this.keybinds[actionId] = newKey;
        this.saveKeybinds();
        this.activeRebindAction = null;
        this.renderMenu();
    }

    initGlobalListener() {
        window.addEventListener('keydown', (e) => {
            if (this.activeRebindAction) {
                e.preventDefault();
                e.stopPropagation();
                this.bindKey(this.activeRebindAction, e.key);
            }
        }, true);
    }

    renderMenu() {
        const container = document.getElementById('keybinds-list-container');
        if (!container) return;

        container.innerHTML = '';

        ACTION_CONFIG.forEach(group => {
            const catHeader = document.createElement('div');
            catHeader.style.cssText = 'color: #00ffcc; font-size: 9px; margin: 15px 0 8px 0; border-bottom: 1px dashed #0088aa; padding-bottom: 4px; text-align: left; font-family: "Press Start 2P", monospace;';
            catHeader.innerText = group.category;
            container.appendChild(catHeader);

            group.actions.forEach(act => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(15, 25, 45, 0.75); margin-bottom: 5px; border-radius: 4px; border: 1px solid #005577; gap: 10px;';

                const labelSpan = document.createElement('span');
                labelSpan.style.cssText = 'color: #ffffff; font-size: 8px; font-family: "Press Start 2P", monospace; text-align: left; line-height: 1.4;';
                labelSpan.innerText = act.label;

                const keyBtn = document.createElement('button');
                const isListening = (this.activeRebindAction === act.id);
                const currentKeyStr = this.formatKeyName(this.keybinds[act.id] || DEFAULT_KEYBINDS[act.id]);

                keyBtn.innerText = isListening ? 'PRESS ANY KEY...' : currentKeyStr;
                keyBtn.style.cssText = `font-family: "Press Start 2P", monospace; font-size: 8px; padding: 6px 12px; cursor: pointer; border-radius: 4px; transition: all 0.2s ease; ${
                    isListening
                        ? 'background: #ff0055; border: 2px solid #ff99bb; color: #fff; box-shadow: 0 0 12px #ff0055;'
                        : 'background: #004466; border: 2px solid #00aaff; color: #ffd700;'
                }`;

                keyBtn.addEventListener('click', (evt) => {
                    evt.stopPropagation();
                    this.activeRebindAction = act.id;
                    this.renderMenu();
                });

                row.appendChild(labelSpan);
                row.appendChild(keyBtn);
                container.appendChild(row);
            });
        });
    }
}

window.keybindManager = new KeybindManager();
window.isKey = (e, actionId) => window.keybindManager.isKey(e, actionId);
