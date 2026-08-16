// js/api.js
const API_URL = '';

var authToken = localStorage.getItem('trashMasterToken') || null;
var userRole = localStorage.getItem('trashMasterRole') || null;
var playerBalance = 0;
var playerCredits = 3;
var playerHasTruck = 0;
var playerInventory = {};
var playerMovementSize = 0;
var playerUnlockedFastFood = 0;
var playerUnlockedCrime = 0;
var playerStats = {};
var completedMafiaJobs = 0;
var playerStats = {};
var playerCredits = 3;
var internationalFollowers = 0;
var statsHistory = [];
var activeStatsCategory = 'trash';

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    try {
        const res = await fetch(`${API_URL}${endpoint}`, options);
        const contentType = res.headers.get('content-type') || '';
        let data = null;
        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            const text = await res.text();
            if (!res.ok) {
                throw new Error(`Server status ${res.status}: ${text.slice(0, 80)}`);
            }
            data = { success: true, text };
        }
        if (!res.ok) throw new Error((data && data.error) || `API Error ${res.status}`);
        return data;
    } catch (e) {
        throw e;
    }
}


// ── UI Management ──
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.remove('hidden');
        if (window.soundManager && screenId !== 'game-layer') {
            window.soundManager.playDialogAppearSFX();
        }
    }
    
    const cultDialog = document.getElementById('cult-leaving-dialog');
    if (cultDialog) cultDialog.classList.add('hidden');

    const btnReturnStore = document.getElementById('btn-return-store');
    if (btnReturnStore) {
        btnReturnStore.style.display = (screenId === 'game-layer') ? 'inline-block' : 'none';
    }

    const gameViewport = document.getElementById('game-viewport');
    const gameCanvas3d = document.getElementById('gameCanvas3d');
    const gameCanvas = document.getElementById('gameCanvas');

    if (screenId === 'game-layer') {
        document.getElementById('ui-layer').classList.add('hidden');
        if (gameViewport) gameViewport.classList.remove('hidden');
        if (gameCanvas) gameCanvas.classList.remove('hidden');
        if (gameCanvas3d) gameCanvas3d.classList.remove('hidden');
        if (window.soundManager) {
            const track = window.chaosMode ? 'chaos' : (window.selectedMusicTrack || 'game');
            window.soundManager.playTrack(track);
        }
    } else {
        document.getElementById('ui-layer').classList.remove('hidden');
        if (gameViewport) gameViewport.classList.add('hidden');
        if (gameCanvas) gameCanvas.classList.add('hidden');
        if (gameCanvas3d) gameCanvas3d.classList.add('hidden');
        if (window.soundManager && (screenId === 'store-screen' || screenId === 'store-items-screen' || screenId === 'login-screen')) {
            window.soundManager.playTrack('store');
        }
    }
}

function showChaosConfigDialog() {
    const dialog = document.getElementById('chaos-dialog');
    if (dialog) {
        dialog.classList.remove('hidden');
        if (window.soundManager) window.soundManager.playDialogAppearSFX();
    }
}

function initUI() {
    const btnLogin = document.getElementById('btn-login');
    const btnGenerate = document.getElementById('btn-generate');
    const btnAdminLogout = document.getElementById('btn-admin-logout');
    const btnStoreLogout = document.getElementById('btn-store-logout');
    const btnStartGame = document.getElementById('btn-start-game');

    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const user = document.getElementById('login-username').value;
            const pass = document.getElementById('login-password').value;
            const errEl = document.getElementById('login-error');
            try {
                const data = await apiCall('/api/auth/login', 'POST', { username: user, password: pass });
                authToken = data.token;
                userRole = data.role;
                window.currentUsername = user;
                window.currentUserAvatar = data.avatar_sticker || 'ducky_sticker.png';
                window.currentUserBio = data.bio || 'Ready to clean up the city!';
                localStorage.setItem('trashMasterToken', authToken);
                localStorage.setItem('trashMasterRole', userRole);
                localStorage.setItem('trashMasterUsername', user);
                localStorage.setItem('trashMasterAvatar', window.currentUserAvatar);
                errEl.innerText = '';
                
                if (userRole === 'admin') {
                    showScreen('admin-screen');
                } else {
                    await refreshGameState();
                    renderStore();
                    showScreen('store-screen');
                }
            } catch (e) {
                errEl.innerText = e.message;
            }
        });
    }

    const btnGotoRegister = document.getElementById('btn-goto-register');
    const btnGotoLogin = document.getElementById('btn-goto-login');
    const btnDoRegister = document.getElementById('btn-do-register');

    if (btnGotoRegister) {
        btnGotoRegister.addEventListener('click', () => {
            if (window.profileManager && typeof window.profileManager.populateRegisterStickers === 'function') {
                window.profileManager.populateRegisterStickers();
            }
            showScreen('register-screen');
        });
    }

    if (btnGotoLogin) {
        btnGotoLogin.addEventListener('click', () => {
            showScreen('login-screen');
        });
    }

    // Register screen sprite options handler
    const regSpriteBtns = document.querySelectorAll('#register-screen .sprite-option-btn');
    regSpriteBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            regSpriteBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    if (btnDoRegister) {
        btnDoRegister.addEventListener('click', async () => {
            const user = document.getElementById('reg-username').value.trim();
            const pass = document.getElementById('reg-password').value;
            const confirmPass = document.getElementById('reg-confirm-password').value;
            const errEl = document.getElementById('register-error');

            if (!user || !pass) {
                if (errEl) errEl.innerText = "Please enter username and password!";
                return;
            }
            if (pass !== confirmPass) {
                if (errEl) errEl.innerText = "Passwords do not match!";
                return;
            }

            const activeBtn = document.querySelector('#register-screen .sprite-option-btn.active') || document.querySelector('#register-screen .sprite-option-btn');
            const selectedSprite = activeBtn ? activeBtn.getAttribute('data-sprite') : 'char2';

            const activeStickerBtn = document.querySelector('#register-screen .register-sticker-btn.active');
            const selectedSticker = activeStickerBtn ? activeStickerBtn.getAttribute('data-sticker') : 'ducky_sticker.png';

            try {
                const data = await apiCall('/api/auth/register', 'POST', { 
                    username: user, 
                    password: pass, 
                    chosen_sprite: selectedSprite,
                    avatar_sticker: selectedSticker
                });
                authToken = data.token;
                userRole = data.role;
                window.currentUsername = user;
                window.currentUserAvatar = data.avatar_sticker || selectedSticker;
                window.currentUserBio = data.bio || 'Ready to clean up the city!';
                localStorage.setItem('trashMasterToken', authToken);
                localStorage.setItem('trashMasterRole', userRole);
                localStorage.setItem('trashMasterUsername', user);
                localStorage.setItem('trashMasterAvatar', window.currentUserAvatar);
                if (errEl) errEl.innerText = '';
                await refreshGameState();
                renderStore();
                showScreen('store-screen');
            } catch (e) {
                if (errEl) errEl.innerText = e.message;
            }
        });
    }

    if (btnGenerate) {
        btnGenerate.addEventListener('click', async () => {
            const count = document.getElementById('admin-count').value;
            try {
                const data = await apiCall('/api/admin/generate-accounts', 'POST', { count: count });
                const list = document.getElementById('generated-accounts');
                list.innerHTML = '<h3>Generated Accounts:</h3>';
                data.accounts.forEach(acc => {
                    list.innerHTML += `<div>User: <b>${acc.username}</b> Pass: <b>${acc.password}</b></div>`;
                });
            } catch (e) {
                alert(e.message);
            }
        });
    }

    const logout = () => {
        authToken = null;
        userRole = null;
        window.currentUsername = null;
        localStorage.removeItem('trashMasterToken');
        localStorage.removeItem('trashMasterRole');
        localStorage.removeItem('trashMasterUsername');
        showScreen('login-screen');
    };

    if (btnAdminLogout) btnAdminLogout.addEventListener('click', logout);
    if (btnStoreLogout) btnStoreLogout.addEventListener('click', logout);

    // Open Shop / Discrete Store Page
    const btnOpenShop = document.getElementById('btn-open-shop');
    if (btnOpenShop) {
        btnOpenShop.addEventListener('click', () => {
            renderStore();
            updateStoreUI();
            showScreen('store-items-screen');
        });
    }

    const btnOpenWorldBuilder = document.getElementById('btn-open-world-builder');
    if (btnOpenWorldBuilder) {
        btnOpenWorldBuilder.addEventListener('click', () => {
            if (window.worldBuilder) window.worldBuilder.open();
        });
    }

    const btnOpenMapBrowser = document.getElementById('btn-open-map-browser');
    if (btnOpenMapBrowser) {
        btnOpenMapBrowser.addEventListener('click', () => {
            if (window.mapBrowser) window.mapBrowser.open();
        });
    }

    const btnBackToStoreMain = document.getElementById('btn-back-to-store-main');
    if (btnBackToStoreMain) {
        btnBackToStoreMain.addEventListener('click', () => {
            updateStoreUI();
            showScreen('store-screen');
        });
    }

    // Store Terminal Event Handler
    const terminalInput = document.getElementById('terminal-input');
    const terminalHistory = document.getElementById('terminal-history');
    if (terminalInput) {
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = terminalInput.value.trim();
                terminalInput.value = '';
                if (cmd) {
                    if (terminalHistory) {
                        terminalHistory.innerHTML += `\n> ${cmd}`;
                        const cmdLower = cmd.toLowerCase();
                        if (cmdLower === 'eggs') {
                            terminalHistory.innerHTML += `\n<span style="color: #00ffcc;">🥚 EXECUTABLE TERMINAL COMMANDS:</span>\n<span style="color: #ffff00;">- eggs</span> : List all executable terminal commands\n<span style="color: #ffff00;">- ducky</span> : Activate Rubber Ducky mode!\n<span style="color: #ffff00;">- dragon ho!</span> : Activate Dragon Ho! cheat\n<span style="color: #ffff00;">- chaos / chaos mode / chaos ho!</span> : Unlock Chaos Mode\n<span style="color: #ffff00;">- clear</span> : Clear terminal history\n<span style="color: #ffff00;">- help</span> : Display terminal command list`;
                        } else if (cmdLower === 'ducky') {
                            window.duckyModeActive = true;
                            terminalHistory.innerHTML += `\n<span style="color: #ffff00; text-shadow: 0 0 5px #ffff00;">🦆 QUACK! Ducky Mode Activated! Rubber Ducky power engaged!</span>`;
                        } else if (cmdLower === 'dragon ho!') {
                            window.dragonHoCheat = true;
                            terminalHistory.innerHTML += `\n<span style="color: #ffff00;">Dragon Ho! Activated!</span>`;
                        } else if (cmdLower === 'chaos' || cmdLower === 'chaos mode' || cmdLower === 'chaos ho!') {
                            window.chaosCheatActive = true;
                            updateModeToggles();
                            terminalHistory.innerHTML += `\n<span style="color: #ff0055; text-shadow: 0 0 3px #ff0055;">Chaos Mode Unlocked for this round! Check the toggle.</span>`;
                        } else if (cmdLower === 'clear') {
                            terminalHistory.innerHTML = 'Ready.';
                        } else if (cmdLower === 'help' || cmdLower === 'commands') {
                            terminalHistory.innerHTML += `\n<span style="color: #00ffcc;">Type 'eggs' to view all executable terminal commands.</span>`;
                        } else {
                            terminalHistory.innerHTML += `\n<span style="color: #ff0055;">Unknown command. Type 'eggs' for command list.</span>`;
                        }
                        terminalHistory.scrollTop = terminalHistory.scrollHeight;
                    }
                }
            }
        });
    }

    let currentSlideIndex = 0;
    let activeSlides = [];

    const renderInstructionSlide = () => {
        const slide = activeSlides[currentSlideIndex];
        const container = document.getElementById('instruction-slides-container');
        if (!container || !slide) return;

        let iconHtml = "";
        if (slide.icon) {
            iconHtml = `<img src="${slide.icon}" style="width: 52px; height: 52px; image-rendering: pixelated; object-fit: contain; filter: drop-shadow(0 0 8px rgba(255,170,0,0.7)); margin-bottom: 10px;" />`;
        }

        let controlsHtml = "";
        if (slide.controls && slide.controls.length > 0) {
            controlsHtml = `
                <ul style="text-align: left; font-size: 7.5px; color: #00ffcc; line-height: 1.8; margin-top: 10px; padding-left: 10px; list-style-type: none; width: 100%; box-sizing: border-box;">
                    ${slide.controls.map(ctrl => `<li style="margin-bottom: 6px; display: flex; align-items: baseline; gap: 4px;"><span style="color: #ffaa00;">▪</span> <div>${ctrl}</div></li>`).join('')}
                </ul>
            `;
        }

        container.innerHTML = `
            ${iconHtml}
            <h2 style="color: #ffaa00; font-size: 10px; margin-bottom: 10px; text-shadow: 2px 2px #000; letter-spacing: 1px;">${slide.title}</h2>
            <p style="color: #ddd; font-size: 7.5px; line-height: 1.5; margin-bottom: 10px; text-align: center; word-break: break-word;">${slide.desc}</p>
            ${controlsHtml}
        `;

        const prevBtn = document.getElementById('btn-instruction-prev');
        const nextBtn = document.getElementById('btn-instruction-next');
        const indicator = document.getElementById('instruction-page-indicator');

        if (prevBtn) {
            prevBtn.style.visibility = currentSlideIndex === 0 ? 'hidden' : 'visible';
        }
        if (nextBtn) {
            nextBtn.innerText = currentSlideIndex === activeSlides.length - 1 ? 'START' : 'NEXT';
            nextBtn.style.background = currentSlideIndex === activeSlides.length - 1 ? '#00ffcc' : '#ffaa00';
            nextBtn.style.borderColor = currentSlideIndex === activeSlides.length - 1 ? '#00aa88' : '#cc7700';
        }
        if (indicator) {
            indicator.innerText = `${currentSlideIndex + 1} / ${activeSlides.length}`;
        }
        if (slide && slide.title && slide.title.includes('GRIMETOLOGY') && window.soundManager) {
            window.soundManager.playAngelicChoirSFX();
        }
    };

    const showInstructionsDialog = () => {
        const pirateToggle = document.getElementById('pirate-toggle');
        window.pirateMode = pirateToggle ? pirateToggle.checked : false;

        const frenzyToggle = document.getElementById('frenzy-toggle');
        window.frenzyMode = frenzyToggle ? frenzyToggle.checked : false;

        const crimeToggle = document.getElementById('crime-toggle');
        window.crimeMode = crimeToggle ? crimeToggle.checked : false;
        
        const fastfoodToggle = document.getElementById('fastfood-toggle');
        window.fastFoodMode = fastfoodToggle ? fastfoodToggle.checked : false;

        const politicsToggle = document.getElementById('politics-toggle');
        window.politicsMode = politicsToggle ? politicsToggle.checked : false;
        
        const flowersToggle = document.getElementById('flowers-toggle');
        window.flowersMode = flowersToggle ? flowersToggle.checked : false;

        const cultToggle = document.getElementById('cult-toggle');
        window.cultMode = cultToggle ? cultToggle.checked : false;

        const builderToggle = document.getElementById('builder-toggle');
        window.builderMode = builderToggle ? builderToggle.checked : false;

        const fantasyToggle = document.getElementById('fantasy-toggle');
        window.fantasyMode = fantasyToggle ? fantasyToggle.checked : false;

        const dragonToggle = document.getElementById('dragon-toggle');
        window.dragonMode = dragonToggle ? dragonToggle.checked : false;

        activeSlides = [];

        // Welcome / Introduction
        activeSlides.push({
            title: "WELCOME TO FILTHADELPHIA! 🗑️",
            icon: "assets/sprites/trash_truck.png",
            desc: "Clean up the streets of Filthadelphia! Use Arrow Keys to move your character or vehicle. (WASD does not move player)",
            controls: [
                "<span class='key-pill'>Q</span> Pick up trash manually when walking alone on foot.",
                "<span class='key-pill'>Followers</span> Recruited posse members pick up trash automatically as you lead!",
                "<span class='key-pill'>E</span> Drive Bruno the Trash Truck to the Dump (brown tile on minimap) and press E at the entrance to unload!",
                "<span class='key-pill'>Buildings</span> Posse size of 6+ followers required to enter map buildings."
            ]
        });

        if (window.fantasyMode) {
            activeSlides.push({
                title: "FANTASY MODE 🐲",
                icon: "assets/sprites/dragon.png",
                desc: "Welcome to a world of wonder! Posse members have a chance to be Dragon Masters, who can transform into giant Flying Dragons!",
                controls: [
                    "🔥 Incineration: Dragons incinerate trash using fire, earning cash directly without clogging inventory!",
                    "👑 Organizers: Dragons act as massive flying organizers that attract and lead posse members."
                ]
            });
        }

        if (window.pirateMode) {
            activeSlides.push({
                title: "PIRATE MODE 🏴‍☠️",
                icon: "assets/sprites/pirate_ship.png",
                desc: "Sail open waters in a Pirate Ship! Follow the 8-location Treasure Map, race rival pirates, and claim ultimate treasure!",
                controls: [
                    "<span class='key-pill'>C</span> Fire Cannons ahead to stun rival pirate ships for 5 seconds!",
                    "⚠️ Warning: Firing cannons at civilians turns them into Jolly Rogers & alerts police patrols!",
                    "<span class='key-pill'>E</span> Disembark onto island shores on foot, or re-embark onto your anchored pirate ship!",
                    "🌊 Edge of the Earth: Sailing off the bottom map boundary will plunge your ship off the edge of the Earth!"
                ]
            });
        }

        if (window.crimeMode) {
            activeSlides.push({
                title: "CRIME MODE 💼",
                icon: "assets/sprites/black_cadillac.png",
                desc: "Execute syndicate contracts with the Mafia for massive payouts, but watch out for law enforcement!",
                controls: [
                    "🚔 Police Patrols: 4 fast-moving police squad cars spawn at map corners to hunt you down!",
                    "⚖️ Arrests: Slashes posse size by 75%, destroys 1 truck, and levies scaling fines ($50k + $50k per arrest).",
                    "<span class='key-pill'>B</span> Bribe police officers when Price Fixing item is active."
                ]
            });
        }

        if (window.fastFoodMode) {
            activeSlides.push({
                title: "FAST FOOD MODE 🍔",
                icon: "assets/sprites/fast_food.png",
                desc: "Keep your muchachos fed and energized across 3 tiers of restaurants!",
                controls: [
                    "🌯 Tier 1 - Zippy D's: Budget SnackRap (+25-45% hunger, +8-18% happiness).",
                    "🥪 Tier 2 - Goose: Classic Hoagie (+55-80% hunger, +20-35% happiness, 25% off w/ Goose Cards).",
                    "🥩 Tier 3 - Chino's & Rats: Rival Philly Cheesesteaks across the street (+90-100% hunger, +45-70% happiness).",
                    "🏥 Healthcare: Greasy food can cause ailments—visit the Hospital and press E for healthcare!"
                ]
            });
        }

        if (window.politicsMode) {
            activeSlides.push({
                title: "POLITICS MODE 🏛️",
                icon: "assets/sprites/philly_city_hall.png",
                desc: "Campaign for political office! Nominate yourself in the store, then shake hands with NPCs around the city.",
                controls: [
                    "🤝 Handshakes: Stand near street NPCs to shake hands and win campaign votes.",
                    "🗳️ Rival Candidate: Out-campaign rival politicians roaming the streets before the round ends!",
                    "💰 Mafia Bribe: Accepting Mafia vote bribes delivers instant votes, but dispatches police immediately!"
                ]
            });
        }

        if (window.flowersMode) {
            activeSlides.push({
                title: "FLOWERS MODE 🌸",
                icon: "assets/sprites/flower.png",
                desc: "Beautify Filthadelphia's local parks by planting flowers!",
                controls: [
                    "<span class='key-pill'>F</span> Press F while standing in park zones to plant Fertilizer (requires Fertilizer from store).",
                    "🌷 Cash Payouts: Fully planted and bloomed parks reward big money payouts!"
                ]
            });
        }

        if (window.cultMode) {
            activeSlides.push({
                title: "THE CHURCH OF GRIMETOLOGY 🕯️",
                icon: "assets/sprites/cult_white_robe.png",
                desc: "Lead a charismatic cult to purify Filthadelphia! Raise $1,000,000 to summon Burninator the Dragon.",
                controls: [
                    "❤️ Happiness: Keep followers happy (proximity, reunions, food). 0% happiness causes half your posse to leave!",
                    "✨ Follower Multiplier: Clean rounds yield a 1.5x multiplier on followers gained!",
                    "<span class='key-pill'>C</span> / <span class='key-pill'>L</span> On cult leaving events, press C to convince members to stay (-15% happiness) or L to let them leave.",
                    "🐉 Burninator: Purchase Burninator in store for $1,000,000 (requires 5-follower sacrifice every round)."
                ]
            });
        }

        if (window.builderMode) {
            activeSlides.push({
                title: "BUILDER MODE 🏗️",
                icon: "assets/sprites/philly_art_museum.png",
                desc: "Invest in Filthadelphia real estate! Purchase buildings, recruit tenants, and collect rent.",
                controls: [
                    "<span class='key-pill'>E</span> Stand near building doors and press E to purchase real estate (ownership persists across rounds).",
                    "<span class='key-pill'>A</span> Stand near street NPCs and press A to offer apartment tenancy (50% success, $1,000 rent/tenant/round, max 5 tenants).",
                    "🏦 Property Tax: $750 tax per building assessed every 4 rounds. Avoid bankruptcy!"
                ]
            });
        }

        const chaosToggle = document.getElementById('chaos-toggle');
        if (window.chaosMode || (chaosToggle && chaosToggle.checked)) {
            activeSlides.push({
                title: "CHAOS MODE 💥",
                icon: "assets/sprites/chaos_splash.jpg",
                desc: "Experience extreme, unpredictable chaos with custom severity modifiers!",
                controls: [
                    "🙃 Level 5+ Inverted Controls: Arrow key movement is reversed (Up=Down, Left=Right)!",
                    "💣 Hazards: Explosive trash piles, orbital strike lightning, and hyper-aggressive police!"
                ]
            });
        }

        // Keys & Keybindings Summary
        activeSlides.push({
            title: "KEYS & KEYBINDINGS 🗝️",
            icon: "assets/sprites/magic_8_ball.png",
            desc: "Complete reference of all control shortcuts in Trash Master:",
            controls: [
                "<div><span class='key-pill'>Arrow Keys</span> Move Player / Vehicle</div>",
                "<div><span class='key-pill'>E</span> Interact (Dump, Fast Food, Hospital, NPCs, Cars, Doors)</div>",
                "<div><span class='key-pill'>Q</span> Pick up trash on foot (when alone)</div>",
                "<div><span class='key-pill'>U</span> Use Mushrooms (slows timer 50% for 20s)</div>",
                "<div><span class='key-pill'>W</span> Use Wings (1.5x speed boost for 15s)</div>",
                "<div><span class='key-pill'>T</span> Use Borrowed Time (+20s) / Plant Trash Bomb</div>",
                "<div><span class='key-pill'>P</span> Use Protection (+5% posse win chance for 30s)</div>",
                "<div><span class='key-pill'>Shift + P</span> Open Recruitment / Propaganda Posters</div>",
                "<div><span class='key-pill'>R</span> Use Parade Route (spawns 3x trash)</div>",
                "<div><span class='key-pill'>F</span> Plant Fertilizer / Toggle Flashlight</div>",
                "<div><span class='key-pill'>A</span> Offer Apartment (Builder Mode)</div>",
                "<div><span class='key-pill'>C</span> Pirate Cannons / Ranger Capture / Cult Stay</div>",
                "<div><span class='key-pill'>L</span> Cult Leave | <span class='key-pill'>B</span> Bribe Police | <span class='key-pill'>Shift + B</span> Bottomless Pit</div>",
                "<div><span class='key-pill'>G</span> Portal Gun | <span class='key-pill'>X</span> Harvest Trees</div>",
                "<div><span class='key-pill'>M</span> Toggle Music | <span class='key-pill'>N</span> Toggle SFX | <span class='key-pill'>Esc</span> Pause / Menu</div>"
            ]
        });

        currentSlideIndex = 0;
        renderInstructionSlide();
        document.getElementById('instructions-dialog').classList.remove('hidden');
    };

    if (btnStartGame) {
        btnStartGame.addEventListener('click', () => {
            showInstructionsDialog();
        });
    }

    const btnInstructionPrev = document.getElementById('btn-instruction-prev');
    if (btnInstructionPrev) {
        btnInstructionPrev.addEventListener('click', () => {
            if (currentSlideIndex > 0) {
                currentSlideIndex--;
                renderInstructionSlide();
            }
        });
    }

    const btnInstructionNext = document.getElementById('btn-instruction-next');
    if (btnInstructionNext) {
        btnInstructionNext.addEventListener('click', () => {
            if (currentSlideIndex < activeSlides.length - 1) {
                currentSlideIndex++;
                renderInstructionSlide();
            } else {
                document.getElementById('instructions-dialog').classList.add('hidden');
                showScreen('game-layer');
                if (window.startGameFromStore) {
                    window.startGameFromStore();
                }
            }
        });
    }

    // ── Trophy Dialog Buttons ──
    const btnViewTrophies = document.getElementById('btn-view-trophies');
    const btnTrophyClose = document.getElementById('btn-trophy-close');

    if (btnViewTrophies) {
        btnViewTrophies.addEventListener('click', () => {
            renderTrophyRoom();
            const dlg = document.getElementById('trophy-dialog');
            if (dlg) dlg.classList.remove('hidden');
        });
    }
    if (btnTrophyClose) {
        btnTrophyClose.addEventListener('click', () => {
            const dlg = document.getElementById('trophy-dialog');
            if (dlg) dlg.classList.add('hidden');
        });
    }

    // ── Performance Stats Dialog Buttons ──
    const btnViewStats = document.getElementById('btn-view-stats');
    const btnStatsClose = document.getElementById('btn-stats-close');
    
    if (btnViewStats) {
        btnViewStats.addEventListener('click', async () => {
            try {
                const data = await apiCall('/api/game/stats-history');
                statsHistory = data.history || [];
                
                // Set default tab active
                activeStatsCategory = 'trash';
                updateStatsTabStyles();
                
                document.getElementById('stats-dialog').classList.remove('hidden');
                
                // Draw graph and summary
                drawStatsGraph(activeStatsCategory);
                updateStatsSummary(activeStatsCategory);
            } catch (err) {
                alert("Failed to load statistics: " + err.message);
            }
        });
    }

    if (btnStatsClose) {
        btnStatsClose.addEventListener('click', () => {
            document.getElementById('stats-dialog').classList.add('hidden');
        });
    }

    // ── Sound & Audio Options Dialog Listeners ──
    const btnAudioSettings = document.getElementById('btn-audio-settings');
    const btnSoundMenu = document.getElementById('btn-sound-menu');
    const dlgSoundOptions = document.getElementById('sound-options-dialog');
    const btnSoundOptionsClose = document.getElementById('btn-sound-options-close');
    const sliderMusicVolume = document.getElementById('slider-music-volume');
    const musicVolumeText = document.getElementById('music-volume-text');
    const btnToggleMusic = document.getElementById('btn-toggle-music');
    const btnSfxAllOn = document.getElementById('btn-sfx-all-on');
    const btnSfxAllOff = document.getElementById('btn-sfx-all-off');

    const openSoundOptions = () => {
        if (dlgSoundOptions) dlgSoundOptions.classList.remove('hidden');
    };
    const closeSoundOptions = () => {
        if (dlgSoundOptions) dlgSoundOptions.classList.add('hidden');
    };

    if (btnAudioSettings) btnAudioSettings.addEventListener('click', openSoundOptions);
    if (btnSoundMenu) btnSoundMenu.addEventListener('click', openSoundOptions);
    if (btnSoundOptionsClose) btnSoundOptionsClose.addEventListener('click', closeSoundOptions);

    // Keybinds Menu Listeners
    const btnKeybindsSettings = document.getElementById('btn-keybinds-settings');
    const btnKeybindsMenu = document.getElementById('btn-keybinds-menu');
    const btnKeybindsClose = document.getElementById('btn-keybinds-close');
    const btnKeybindsReset = document.getElementById('btn-keybinds-reset');

    const openKeybindsMenu = () => {
        if (window.keybindManager) window.keybindManager.openMenu();
    };
    const closeKeybindsMenu = () => {
        if (window.keybindManager) window.keybindManager.closeMenu();
    };

    if (btnKeybindsSettings) btnKeybindsSettings.addEventListener('click', openKeybindsMenu);
    if (btnKeybindsMenu) btnKeybindsMenu.addEventListener('click', openKeybindsMenu);
    if (btnKeybindsClose) btnKeybindsClose.addEventListener('click', closeKeybindsMenu);
    if (btnKeybindsReset) btnKeybindsReset.addEventListener('click', () => {
        if (window.keybindManager) window.keybindManager.resetKeybinds();
    });

    // ── 3D FPS / 2D Retro Perspective Toggle Listener ──
    const btnFpsToggle = document.getElementById('btn-fps-toggle');
    if (btnFpsToggle) {
        btnFpsToggle.addEventListener('click', () => {
            if (window.game) {
                if (!window.game.engine3D && window.Engine3D) {
                    const canvas3d = document.getElementById('gameCanvas3d') || window.game.canvas;
                    window.game.engine3D = new Engine3D(canvas3d, window.game);
                    const dest = (window.travelDestination || '').toLowerCase();
                    let theme = (window.game.gameMap && window.game.gameMap.theme) || (dest === 'dahgbad' ? 'dahgbad' : (dest === 'cucaracha' ? 'cucaracha' : (window.pirateMode ? 'pirate' : 'filthadelphia')));
                    if (window.game.gameMap) {
                        window.game.engine3D.buildMapForGame(window.game.gameMap, theme);
                    }
                }
                if (window.game.engine3D) {
                    window.game.engine3D.enabled = !window.game.engine3D.enabled;
                    const is3D = window.game.engine3D.enabled;
                    btnFpsToggle.innerHTML = is3D ? '🎮 3D FPS' : '🕹️ 2D RETRO';
                    btnFpsToggle.style.borderColor = is3D ? '#00ffcc' : '#ffaa00';
                    btnFpsToggle.style.color = is3D ? '#00ffcc' : '#ffaa00';

                    const canvas3d = document.getElementById('gameCanvas3d');
                    if (canvas3d) {
                        canvas3d.style.display = is3D ? 'block' : 'none';
                    }

                    if (window.game.hud) {
                        window.game.hud.showFollowerNotification(is3D ? 'Switched to 3D FPS Mode (Doom)' : 'Switched to 2D Top-Down Mode', true);
                    }
                }
            }
        });
    }

    // Return to Store Button Listener
    const btnReturnStore = document.getElementById('btn-return-store');
    if (btnReturnStore) {
        btnReturnStore.addEventListener('click', () => {
            if (confirm("Return to store? The current level will be nullified and nothing will be recorded.")) {
                if (window.game && typeof window.game.nullifyLevelAndReturnToStore === 'function') {
                    window.game.nullifyLevelAndReturnToStore();
                } else if (window.showScreen) {
                    window.showScreen('store-screen');
                }
            }
        });
    }

    if (sliderMusicVolume) {
        sliderMusicVolume.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (musicVolumeText) musicVolumeText.innerText = `${val}%`;
            if (window.soundManager) window.soundManager.setMusicVolume(val);
        });
    }

    if (btnToggleMusic) {
        btnToggleMusic.addEventListener('click', () => {
            if (window.soundManager) {
                const muted = window.soundManager.toggleMusicMute();
                btnToggleMusic.innerText = muted ? "Unmute Music" : "Mute Music";
                btnToggleMusic.style.background = muted ? "#662222" : "#225544";
            }
        });
    }

    const sfxCheckboxKeys = {
        'sfx-click': 'click',
        'sfx-trash': 'trash',
        'sfx-splat': 'splat',
        'sfx-ding': 'ding',
        'sfx-handshake': 'handshake',
        'sfx-gunshot': 'gunshot',
        'sfx-cash': 'cash',
        'sfx-choir': 'choir',
        'sfx-dialog': 'dialog'
    };

    for (const [id, key] of Object.entries(sfxCheckboxKeys)) {
        const chk = document.getElementById(id);
        if (chk) {
            chk.addEventListener('change', (e) => {
                if (window.soundManager) window.soundManager.setSFXToggle(key, e.target.checked);
            });
        }
    }

    if (btnSfxAllOn) {
        btnSfxAllOn.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.setAllSFXToggles(true);
            for (const id of Object.keys(sfxCheckboxKeys)) {
                const chk = document.getElementById(id);
                if (chk) chk.checked = true;
            }
        });
    }

    if (btnSfxAllOff) {
        btnSfxAllOff.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.setAllSFXToggles(false);
            for (const id of Object.keys(sfxCheckboxKeys)) {
                const chk = document.getElementById(id);
                if (chk) chk.checked = false;
            }
        });
    }

    // Tab buttons event listeners
    document.querySelectorAll('.stats-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.target.getAttribute('data-category');
            activeStatsCategory = category;
            updateStatsTabStyles();
            drawStatsGraph(category);
            updateStatsSummary(category);
        });
    });

    // ── Made Man Dialog Buttons ──
    const btnMadeManYes = document.getElementById('btn-made-man-yes');
    const btnMadeManNo = document.getElementById('btn-made-man-no');

    if (btnMadeManYes) {
        btnMadeManYes.addEventListener('click', async () => {
            try {
                await apiCall('/api/game/made-man-choice', 'POST', { choice: 'accepted' });
                document.getElementById('made-man-dialog').classList.add('hidden');
                alert("Welcome to the family. Crime Mode is now unlocked!");
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    }
    if (btnMadeManNo) {
        btnMadeManNo.addEventListener('click', async () => {
            try {
                await apiCall('/api/game/made-man-choice', 'POST', { choice: 'declined' });
                document.getElementById('made-man-dialog').classList.add('hidden');
                alert("You declined the Don's offer.");
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // ── Council Nomination Dialog Buttons ──
    const btnPoliticalYes = document.getElementById('btn-political-yes');
    const btnPoliticalNo = document.getElementById('btn-political-no');

    if (btnPoliticalYes) {
        btnPoliticalYes.addEventListener('click', async () => {
            try {
                await apiCall('/api/game/political-choice', 'POST', { choice: 'accepted' });
                document.getElementById('political-candidate-dialog').classList.add('hidden');
                let alertMsg = "Nomination accepted! ";
                if (window.currentNominationTarget === 'candidate_council') {
                    alertMsg += "Politics Mode is now unlocked. Go shake 25 hands to win!";
                } else if (window.currentNominationTarget === 'candidate_mayor') {
                    alertMsg += "You are now running for Mayor! Shake 40 hands to win!";
                } else if (window.currentNominationTarget === 'candidate_senator') {
                    alertMsg += "You are now running for Senate! Shake 60 hands to win!";
                } else if (window.currentNominationTarget === 'candidate_president') {
                    alertMsg += "You are now running for President! Shake 100 hands to win!";
                }
                alert(alertMsg);
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    }
    if (btnPoliticalNo) {
        btnPoliticalNo.addEventListener('click', async () => {
            try {
                await apiCall('/api/game/political-choice', 'POST', { choice: 'declined' });
                document.getElementById('political-candidate-dialog').classList.add('hidden');
                if (window.currentNominationTarget) {
                    localStorage.setItem('declined_nomination_' + window.currentNominationTarget, 'true');
                }
                alert("You declined the nomination.");
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // ── Election Loss Mafia-Style Dialog ──
    const btnElectionLossYes = document.getElementById('btn-election-loss-yes');
    const btnElectionLossNo = document.getElementById('btn-election-loss-no');
    
    if (btnElectionLossYes) {
        btnElectionLossYes.addEventListener('click', async () => {
            try {
                // Accepts the same way we do initial political choice
                await apiCall('/api/game/political-choice', 'POST', { choice: 'accepted' });
                document.getElementById('election-loss-dialog').classList.add('hidden');
                alert("The campaign trail calls again!");
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    }
    if (btnElectionLossNo) {
        btnElectionLossNo.addEventListener('click', async () => {
            try {
                // We decline so it stops bugging us (for now)
                await apiCall('/api/game/political-choice', 'POST', { choice: 'declined' });
                document.getElementById('election-loss-dialog').classList.add('hidden');
                alert("Maybe next time.");
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    }
    
    // ── International Travel Dialog ──
    const btnTravelDahgbad = document.getElementById('btn-travel-dahgbad');
    const btnTravelCucaracha = document.getElementById('btn-travel-cucaracha');
    const btnTravelCancel = document.getElementById('btn-travel-cancel');
    
    const handleTravel = (destination, costPerMember) => {
        let followers = 0;
        if (window.game) {
            followers = window.game.getRoundTotalFollowers ? window.game.getRoundTotalFollowers() : 0;
            if (followers === 0 && window.game.followerManager && window.game.followerManager.followers) {
                followers = window.game.followerManager.followers.length;
            }
        }
        const totalCost = costPerMember;
        if (window.playerBalance < totalCost) {
            alert(`You need $${totalCost} to fly to ${destination}!`);
            return;
        }
        const isFilth = destination.toLowerCase() === 'filthadelphia';
        let intlFollowersGained = 0;

        if (window.game && isFilth) {
            // Only count person-followers, not truck followers (char_truck)
            const personFollowers = window.game.followerManager && window.game.followerManager.followers
                ? window.game.followerManager.followers.filter(f => f.spriteId !== 'char_truck').length
                : 0;
            intlFollowersGained = Math.max(window.game.currentTripIntlFollowers || 0, personFollowers);
        }

        if (confirm(`Fly to ${destination} for $${totalCost}?`)) {
            apiCall('/api/game/travel', 'POST', { 
                destination: destination, 
                cost: totalCost,
                intl_followers_collected: intlFollowersGained
            })
                .then(data => {
                    window.playerBalance = data.balance;
                    if (data.international_followers !== undefined) {
                        window.internationalFollowers = data.international_followers;
                        window.playerInternationalFollowers = data.international_followers;
                    }

                    if (window.game) {
                        if (!isFilth) {
                            if (!window.travelDestination) {
                                window.game.savedPhillyFollowers = [...window.game.followerManager.followers];
                                // Save and clear trash truck chain so no trucks follow player abroad
                                window.game.savedTruckChain = window.game.truckChain ? [...window.game.truckChain] : [];
                            }
                            // Player travels ALONE internationally — no followers, no trucks
                            window.game.followerManager.followers = [];
                            window.game.currentTripIntlFollowers = 0;
                            if (window.game.truckChain) {
                                window.game.truckChain = [];
                            }
                            if (window.game.organizers) {
                                if (!window.travelDestination) {
                                    window.game.savedOrganizerFollowers = window.game.organizers.map(org => [...org.followerManager.followers]);
                                }
                                window.game.organizers.forEach(org => org.followerManager.followers = []);
                            }
                        } else {
                            // Returned safely to Filthadelphia — record international followers gained!
                            window.game.currentTripIntlFollowers = 0;
                            window.game.internationalFollowersCollected = 0;

                            // Restore Philly followers
                            window.game.followerManager.followers = window.game.savedPhillyFollowers || [];
                            window.game.savedPhillyFollowers = null;

                            // Restore trash truck chain
                            if (window.game.savedTruckChain) {
                                window.game.truckChain = window.game.savedTruckChain;
                                window.game.savedTruckChain = null;
                            }

                            if (window.game.organizers && window.game.savedOrganizerFollowers) {
                                window.game.organizers.forEach((org, idx) => {
                                    if (window.game.savedOrganizerFollowers[idx]) {
                                        org.followerManager.followers = window.game.savedOrganizerFollowers[idx];
                                    }
                                });
                                window.game.savedOrganizerFollowers = null;
                            }
                        }
                    }

                    window.travelDestination = isFilth ? null : destination;
                    document.getElementById('airport-dialog').classList.add('hidden');

                    // Play new map soundtrack
                    if (window.soundManager) {
                        const destLower = destination.toLowerCase();
                        if (destLower === 'cucaracha') {
                            window.soundManager.playTrack('cucaracha');
                        } else if (destLower === 'dahgbad') {
                            window.soundManager.playTrack('dahgbad');
                        } else {
                            window.soundManager.playTrack('lofi');
                        }
                    }
                    
                    // Create a completely new map instance for the destination
                    // The GameMap constructor checks window.travelDestination and
                    // returns a DahgbadMap, CucarachaMap, or default Philly map.
                    if (window.game) {
                        window.game.gameMap = new GameMap();
                        const destLower = (window.travelDestination || destination || '').toLowerCase();
                        const theme = (window.game.gameMap.theme || (destLower === 'dahgbad' ? 'dahgbad' : (destLower === 'cucaracha' ? 'cucaracha' : (window.pirateMode ? 'pirate' : 'filthadelphia'))));
                        if (window.game.engine3D) {
                            window.game.engine3D.buildMapForGame(window.game.gameMap, theme);
                        }
                        if (window.game.miniMap) {
                            window.game.miniMap.buildStatic(window.game.gameMap);
                        }
                        if (window.game.carManager) {
                            window.game.carManager.spawnCars(window.game.gameMap);
                        }
                        // Re-spawn trash on the new map
                        if (window.game.trashManager) {
                            window.game.trashManager.items = [];
                            window.game.trashManager.spawnInitial(window.game.gameMap, 80);
                        }
                        // Re-spawn NPCs on the new map
                        if (window.game.npcManager) {
                            window.game.npcManager.npcs = [];
                            window.game.npcManager.spawnNPCs(window.game.gameMap, window.game.gameMap.buildings, window.frenzyMode);
                        }
                        // Re-position player to a walkable tile on the new map
                        if (window.game.player) {
                            for (let r = 0; r < 20; r++) {
                                let found = false;
                                for (let dy = -r; dy <= r && !found; dy++) {
                                    for (let dx = -r; dx <= r && !found; dx++) {
                                        const tx = 32 + dx;
                                        const ty = 32 + dy;
                                        if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
                                            const tile = window.game.gameMap.getTile(tx, ty);
                                            if (tile === TileType.ROAD || tile === TileType.SIDEWALK || tile === TileType.CROSSWALK) {
                                                window.game.player.x = tx * TILE_SIZE + TILE_SIZE / 2;
                                                window.game.player.y = ty * TILE_SIZE + TILE_SIZE / 2;
                                                window.game.player.keys = { up: false, down: false, left: false, right: false, k: false };
                                                found = true;
                                            }
                                        }
                                    }
                                }
                                if (found) break;
                            }
                        }
                        if (isFilth) {
                            window.playerHasTruck = playerHasTruck;
                            alert(`Welcome back to ${destination}! Garbage Truck is re-enabled if owned.`);
                        } else {
                            window.playerHasTruck = false; // Disable truck
                            alert(`Welcome to ${destination}! You are traveling alone.`);
                        }
                    }
                    updateStoreUI();
                })
                .catch(e => {
                    alert(e.message);
                });
        }
    };
    
    const btnTravelFilthadelphia = document.getElementById('btn-travel-filthadelphia');
    if (btnTravelFilthadelphia) {
        btnTravelFilthadelphia.addEventListener('click', () => handleTravel('Filthadelphia', 800));
    }
    if (btnTravelDahgbad) {
        btnTravelDahgbad.addEventListener('click', () => handleTravel('Dahgbad', 1500));
    }
    if (btnTravelCucaracha) {
        btnTravelCucaracha.addEventListener('click', () => handleTravel('Cucaracha', 750));
    }
    if (btnTravelCancel) {
        btnTravelCancel.addEventListener('click', () => {
            document.getElementById('airport-dialog').classList.add('hidden');
        });
    }

    // ── In-Round Messages Log Dialog Resume Button ──
    const btnMessagesResume = document.getElementById('btn-messages-resume');
    if (btnMessagesResume) {
        btnMessagesResume.addEventListener('click', () => {
            const dlg = document.getElementById('messages-log-dialog');
            if (dlg) dlg.classList.add('hidden');
            if (window.game && window.game.state === GameState.PAUSED) {
                window.game.state = GameState.PLAYING;
            }
        });
    }

    const btnNavGo = document.getElementById('btn-nav-go');
    if (btnNavGo) {
        btnNavGo.addEventListener('click', () => {
            const select = document.getElementById('nav-location-select');
            const targetLoc = select ? select.value : 'airport';
            if (window.game) {
                window.game.navigationTarget = targetLoc;
                let formattedName = targetLoc.toUpperCase();
                if (targetLoc === 'zippy_ds') formattedName = "ZIPPY D'S";
                else if (targetLoc === 'goose') formattedName = "GOOSE";
                else if (targetLoc === 'chinos_steaks') formattedName = "CHINO'S STEAKS";
                else if (targetLoc === 'rats_steaks') formattedName = "RATS STEAKS";
                else if (targetLoc === 'pulp mill') formattedName = "PULP MILL";
                else if (targetLoc === 'black market') formattedName = "BLACK MARKET";
                if (window.game.hud) {
                    window.game.hud.showFollowerNotification(`📍 Navigation set to ${formattedName}! Follow arrow.`, true);
                }
            }
            const dlg = document.getElementById('messages-log-dialog');
            if (dlg) dlg.classList.add('hidden');
            if (window.game && window.game.state === GameState.PAUSED) {
                window.game.state = GameState.PLAYING;
            }
        });
    }
    
    // ── Stranded Defeat Screen ──
    const btnStrandedReturn = document.getElementById('btn-stranded-return');
    if (btnStrandedReturn) {
        btnStrandedReturn.addEventListener('click', () => {
            apiCall('/api/game/travel', 'POST', { destination: 'filthadelphia', cost: 0 })
                .then(data => {
                    document.getElementById('stranded-screen').classList.add('hidden');
                    window.travelDestination = null;
                    if (window.game) {
                        window.game.gameMap = new GameMap();
                        if (window.game.engine3D) {
                            window.game.engine3D.buildMapForGame(window.game.gameMap, 'filthadelphia');
                        }
                        if (window.game.miniMap) {
                            window.game.miniMap.buildStatic(window.game.gameMap);
                        }
                    }
                    window.returnToStore();
                })
                .catch(e => {
                    alert(e.message);
                });
        });
    }
    
    // ── Primary Win Screen ──
    const btnPrimaryWinContinue = document.getElementById('btn-primary-win-continue');
    if (btnPrimaryWinContinue) {
        btnPrimaryWinContinue.addEventListener('click', () => {
            document.getElementById('primary-win-screen').classList.add('hidden');
            window.returnToStore();
        });
    }
    
    // ── Hire Dialog Event Listeners ──
    const btnHireMinus = document.getElementById('hire-minus-btn');
    const btnHirePlus = document.getElementById('hire-plus-btn');
    const btnHireConfirm = document.getElementById('btn-hire-confirm');
    const btnHireCancel = document.getElementById('btn-hire-cancel');

    if (btnHireMinus) {
        btnHireMinus.addEventListener('click', () => {
            if (tempHiresCount > 0) {
                tempHiresCount--;
                updateHireDialogUI();
            }
        });
    }

    if (btnHirePlus) {
        btnHirePlus.addEventListener('click', () => {
            const followers = playerMovementSize || 0;
            let maxAllowed = 5;
            if (followers >= 40) {
                maxAllowed = 2 * parseInt(playerHasTruck || 0);
            }
            if (tempHiresCount < maxAllowed) {
                tempHiresCount++;
                updateHireDialogUI();
            } else {
                alert(`Maximum ${maxAllowed} posse members allowed!`);
            }
        });
    }

    if (btnHireConfirm) {
        btnHireConfirm.addEventListener('click', () => {
            window.employeesHired = tempHiresCount;
            document.getElementById('hire-dialog').classList.add('hidden');
            alert(`Confirmed posse size: ${window.employeesHired}`);
        });
    }

    if (btnHireCancel) {
        btnHireCancel.addEventListener('click', () => {
            document.getElementById('hire-dialog').classList.add('hidden');
        });
    }

    // Chaos Mode Dialog Wiring
    const chaosLevelSlider = document.getElementById('chaos-level-slider');
    const chaosLevelDesc = document.getElementById('chaos-level-desc');
    const chaosTimeSlider = document.getElementById('chaos-time-slider');
    const chaosTimeValue = document.getElementById('chaos-time-value');
    const btnChaosStart = document.getElementById('btn-chaos-start');
    const btnChaosCancel = document.getElementById('btn-chaos-cancel');
    const chaosToggle = document.getElementById('chaos-toggle');

    if (chaosLevelSlider && chaosLevelDesc) {
        const descs = {
            1: "Position 1: Captain Kirk Douglas. All modes enabled simultaneously!",
            2: "Position 2: Twice as many NPCs, 8 police officers chase you. All modes enabled.",
            3: "Position 3: Questlove. Map turns Black & White. Twice as many NPCs, 8 police chasing, all modes enabled.",
            4: "Position 4: Map rotated 90 degrees. Twice as many NPCs, 8 police chasing, all modes enabled.",
            5: "Position 5: Malik B. Rotated 90 degrees map, twice as many NPCs, 8 police chasing, inverted X/Y arrow keys, all modes enabled."
        };
        chaosLevelSlider.addEventListener('input', () => {
            const val = chaosLevelSlider.value;
            chaosLevelDesc.innerText = descs[val] || "";
        });
    }

    if (chaosTimeSlider && chaosTimeValue) {
        chaosTimeSlider.addEventListener('input', () => {
            chaosTimeValue.innerText = `${chaosTimeSlider.value}s`;
        });
    }

    if (btnChaosCancel) {
        btnChaosCancel.addEventListener('click', () => {
            const dialog = document.getElementById('chaos-dialog');
            if (dialog) dialog.classList.add('hidden');
            if (chaosToggle) chaosToggle.checked = false;
            window.chaosMode = false;
        });
    }

    if (btnChaosStart) {
        btnChaosStart.addEventListener('click', () => {
            const dialog = document.getElementById('chaos-dialog');
            if (dialog) dialog.classList.add('hidden');
            
            window.chaosMode = true;
            window.chaosLevel = parseInt(chaosLevelSlider.value);
            window.chaosTimeLimit = parseInt(chaosTimeSlider.value);

            // Force all other modes active when Chaos Mode starts
            window.frenzyMode = true;
            window.crimeMode = true;
            window.fastFoodMode = true;
            window.politicsMode = true;
            window.flowersMode = true;
            window.cultMode = true;
            window.builderMode = true;
            window.fantasyMode = true;
            window.dragonMode = true;

            showScreen('game-layer');
            if (window.startGameFromStore) {
                window.startGameFromStore();
            }
        });
    }
}

async function refreshGameState() {
    try {
        const oldFollowers = playerMovementSize;
        const data = await apiCall('/api/game/sync');
        playerBalance = data.balance;
        playerHasTruck = data.has_truck;
        window.playerHasTruck = playerHasTruck;
        playerInventory = data.inventory;
        window.playerInventory = playerInventory;
        playerMovementSize = data.movement_size || 0;
        window.playerMovementSize = playerMovementSize;
        playerUnlockedFastFood = data.unlocked_fastfood || 0;
        window.playerUnlockedFastFood = playerUnlockedFastFood;
        playerUnlockedCrime = data.unlocked_crime || 0;
        window.playerUnlockedCrime = playerUnlockedCrime;
        window.madeManStatus = data.made_man_status || 'none';
        window.politicalOffice = data.political_office || 'citizen';
        window.politicsBanned = !!data.politics_banned;
        completedMafiaJobs = data.completed_mafia_jobs || 0;
        window.completedMafiaJobs = completedMafiaJobs;
        playerStats = data.stats || {};
        playerCredits = data.credits !== undefined ? data.credits : 3;
        window.playerCredits = playerCredits;
        internationalFollowers = data.international_followers || 0;
        window.internationalFollowers = internationalFollowers;
        window.playerInternationalFollowers = internationalFollowers;
        window.playerLids = data.lids !== undefined ? data.lids : 0;
        window.playerStreak = data.current_streak !== undefined ? data.current_streak : 0;
        window.playerMaxStreak = data.max_streak !== undefined ? data.max_streak : 0;
        window.playerStreakQualified = data.streak_qualified !== undefined ? data.streak_qualified : 0;
        window.playerLastActiveDate = data.last_active_date || null;
        window.todayGamesCount = data.today_games_count !== undefined ? data.today_games_count : 0;
        window.chosenSprite = data.chosen_sprite || 'char2';
        window.playerChosenSprite = window.chosenSprite;
        window.currentUsername = data.username || window.currentUsername || localStorage.getItem('trashMasterUsername');
        window.currentUserAvatar = data.avatar_sticker || localStorage.getItem('trashMasterAvatar') || 'ducky_sticker.png';
        window.currentUserBio = data.bio || 'Ready to clean up the city!';
        localStorage.setItem('trashMasterAvatar', window.currentUserAvatar);
        window.playerUnlockedInternational = data.unlocked_international || 0;
        window.electionState = data.election_state || 'idle';
        window.roundsInState = data.rounds_in_state || 0;
        window.travelDestination = data.travel_destination && data.travel_destination.toLowerCase() !== 'filthadelphia' ? data.travel_destination : null;
        
        window.playerUnlockedCult = data.unlocked_cult || 0;
        window.playerUnlockedBuilder = data.unlocked_builder || 0;
        window.playerUnlockedFantasy = data.unlocked_fantasy || 0;
        window.playerHappiness = data.happiness !== undefined ? data.happiness : 100.0;
        window.cultLeavesCumulative = data.cult_leaves_cumulative || 0;
        if (data.word_game_state) {
            window.wordGameState = data.word_game_state || {
                collected_letters: {},
                completed_words: [],
                word_slots_state: {}
            };
            // Do not call loadWordGameState on every sync to prevent overwriting local state
        }
        if (window.game && typeof window.game.loadWordGameState === 'function') {
            // window.game.loadWordGameState();
        }
        try {
            const bldgData = await apiCall('/api/game/buildings');
            window._serverOwnedBuildings = bldgData.buildings || [];
        } catch (e) {
            console.error("Failed to load buildings", e);
            window._serverOwnedBuildings = [];
        }
        
        // Notify player when reaching requirements
        if (oldFollowers > 0) {
            if (oldFollowers < 10 && playerMovementSize >= 10) {
                alert("🔓 Level Unlocked: Frenzy Mode is now available to play! (Needs 10 followers)");
            }
            if (oldFollowers < 25 && playerMovementSize >= 25) {
                alert("🔓 Level Unlocked: Fast Food Mode is now available for purchase! (Needs 25 followers + $20,000)");
            }
            if (oldFollowers < 40 && playerMovementSize >= 40) {
                alert("🔓 Level Unlocked: Cult Mode is now available for purchase! (Needs 40 followers + $15,000)");
            }
            if (oldFollowers < 60 && playerMovementSize >= 60) {
                alert("🔓 Level Unlocked: Builder Mode is now available for purchase! (Needs 60 followers + $25,000)");
            }
        }

        updateStoreUI();
        updateModeToggles();
        if (window.profileManager && typeof window.profileManager.updateMiniProfile === 'function') {
            window.profileManager.updateMiniProfile(data);
        }

        const followers = playerStats.total_followers || 0;
        if (followers >= 10 && window.madeManStatus === 'none') {
            document.getElementById('made-man-dialog').classList.remove('hidden');
        } else if (window.madeManStatus !== 'accepted' && !window.politicsBanned) {
            let nextOffice = null;
            let promptText = "";
            let promptTitle = "";
            
            if (window.politicalOffice === 'citizen' && followers >= 40 && window.madeManStatus === 'declined') {
                nextOffice = 'candidate_council';
                promptTitle = "RUN FOR COUNCIL?";
                promptText = "The machine has taken interest in you. Mayor Barker has personally endorsed you for city council, will you run?";
            } else if (window.politicalOffice === 'council' && followers >= 160) {
                nextOffice = 'candidate_mayor';
                promptTitle = "RUN FOR MAYOR?";
                promptText = "City council doesn't have enough power to clean up the city. Your followers are urging you to run for mayor, will you run?";
            } else if (window.politicalOffice === 'mayor' && followers >= 640) {
                nextOffice = 'candidate_senator';
                promptTitle = "RUN FOR SENATE?";
                promptText = "Filthadelphia isn't big enough to contain you. Your movement is demanding national action. A Senate seat is open in the next election, will you run?";
            } else if (window.politicalOffice === 'senator' && followers >= 2560) {
                nextOffice = 'candidate_president';
                promptTitle = "RUN FOR PRESIDENT?";
                promptText = "Your ambitions to clean up the trash have gotten you to this point. Your followers think you've got the stuff to take you to the top. A top campaign manager has approached you about running for president, will you run?";
            }
            
            if (nextOffice && localStorage.getItem('declined_nomination_' + nextOffice) !== 'true') {
                window.currentNominationTarget = nextOffice;
                const titleEl = document.getElementById('political-candidate-title');
                const textEl = document.getElementById('political-candidate-text');
                if (titleEl) titleEl.innerText = promptTitle;
                if (textEl) textEl.innerText = promptText;
                document.getElementById('political-candidate-dialog').classList.remove('hidden');
            }
        }

        if (window.electionState.startsWith('cooldown_') && window.roundsInState >= 8) {
            document.getElementById('election-loss-dialog').classList.remove('hidden');
        }
    } catch (e) {
        console.error("Failed to sync state", e);
    }
}

const STORE_ITEMS = [
    { name: 'Filthadelphia', price: 2500, desc: 'Doubles trash spawn', sprite: 'filthadelphia.png' },
    { name: 'Borrowed Time', price: 2000, desc: '+20s to timer (Key T). Warning: Using multiple times in a round may cause you to work into the night!', sprite: 'borrowed_time.png' },
    { name: 'Flashlight', price: 1500, desc: 'Equip with F key during Night Time to illuminate a 10-square radius around you.', sprite: 'flashlight.png' },
    { name: 'Mushrooms', price: 2500, desc: 'Slow timer for 20s (Key U)', sprite: 'mushrooms.png' },
    { name: 'Wings', price: 1500, desc: '1.5x speed for 15s (Key W)', sprite: 'wings.png' },
    { name: 'Protection', price: 1000, desc: '+5% posse win chance for 30s (Key P)', sprite: 'protection.png' },
    { name: 'Magic 8-Ball', price: 1500, desc: 'Score multiplied randomly at end of round', sprite: 'magic_8_ball.png' },
    { name: 'Bruno The Trash Truck', price: 10000, desc: '+2 perm posse, $1000 upkeep', sprite: 'trash_truck.png' },
    { name: 'Fertilizer', price: 100, desc: 'Plant flowers in parks (Flowers Mode)', sprite: 'fertilizer.png' },
    { name: 'Organizer', price: 1000, desc: 'Persistent item. Splits followers to collect trash across the map. Costs $1,000 per organizer per round.', sprite: 'organizer.png' },
    { name: 'Snacks', price: 1000, desc: 'A tasty treat! Increases happiness by 5% and decreases hunger by 5%. (Key K)', sprite: 'snacks.png' },
    { name: 'Parade', price: 3000, desc: '3x trash near parade route (Key R)', sprite: 'parade.png' },
    { name: 'Quinine', price: 750, desc: 'Auto-consumed when you become sick. Instantly cures sick status.', sprite: 'quinine.png' },
    { name: 'Trashpickers', price: 1000, desc: 'Doubles trash pickup for 1 round. Equips each new recruit for $20.', sprite: 'trashpickers.png' },
    { name: 'Price Fixing', price: 2000, desc: 'Trash worth 1.25x value, but 4 police chase you! Press B to bribe.', sprite: 'protection.png' },
    { name: 'Burninator', price: 1000000, desc: 'Summon the dragon! Requires 5 followers sacrificed every round. Boosts trash value as if 5 followers joined.', sprite: 'dragon.png' }
];

function updateStoreUI() {
    const balEl = document.getElementById('store-balance');
    if (balEl) balEl.innerText = `$${playerBalance.toLocaleString()}`;

    const shopBalEl = document.getElementById('shop-balance');
    if (shopBalEl) shopBalEl.innerText = `$${playerBalance.toLocaleString()}`;

    const lidsEl = document.getElementById('store-lids');
    if (lidsEl) lidsEl.innerText = (window.playerLids !== undefined ? window.playerLids : 0).toLocaleString();

    const streakEl = document.getElementById('store-streak');
    if (streakEl) streakEl.innerText = `${window.playerStreak || 0}d`;

    const streakBadgeEl = document.getElementById('streak-counter-badge');
    if (streakBadgeEl) streakBadgeEl.innerText = `🔥 ${window.playerStreak || 0} Days`;

    const streakProgressEl = document.getElementById('streak-progress-bar');
    const streakTextEl = document.getElementById('streak-progress-text');
    const streakDescEl = document.getElementById('streak-status-desc');
    const streakLidsCountEl = document.getElementById('streak-lids-count');

    if (streakLidsCountEl) streakLidsCountEl.innerText = `${(window.playerLids || 0).toLocaleString()} Lids 🥫`;

    const streakTodayGamesEl = document.getElementById('streak-today-games');
    if (streakTodayGamesEl) {
        const count = (window.todayGamesCount !== undefined ? window.todayGamesCount : 0);
        streakTodayGamesEl.innerText = `${count} game${count === 1 ? '' : 's'}`;
    }

    const curStreak = window.playerStreak || 0;
    const isQual = !!window.playerStreakQualified;
    if (streakProgressEl && streakTextEl) {
        if (isQual || curStreak >= 7) {
            streakProgressEl.style.width = '100%';
            streakProgressEl.style.background = 'linear-gradient(90deg, #00ff88, #00ffcc)';
            streakTextEl.innerText = `🔥 UNLOCKED: 1 Lid/Game (${curStreak} Days)`;
        } else {
            const pct = Math.min(100, Math.round((curStreak / 7) * 100));
            streakProgressEl.style.width = `${pct}%`;
            streakProgressEl.style.background = 'linear-gradient(90deg, #ffaa00, #00ffcc)';
            streakTextEl.innerText = `${curStreak} / 7 Days to Unlock`;
        }
    }
    if (streakDescEl) {
        if (isQual || curStreak >= 7) {
            streakDescEl.innerHTML = `✅ <strong>Reward Active!</strong> Earning 1 Lid for every game played today.`;
            streakDescEl.style.color = '#00ffcc';
        } else {
            const left = Math.max(1, 7 - curStreak);
            streakDescEl.innerHTML = `🔒 <strong>Locked:</strong> Play ${left} more consecutive day${left > 1 ? 's' : ''} to unlock retroactive payout!`;
            streakDescEl.style.color = '#ffaa00';
        }
    }

    const movEl = document.getElementById('store-movement-size');
    if (movEl) movEl.innerText = playerMovementSize.toLocaleString();

    const shopMovEl = document.getElementById('shop-followers');
    if (shopMovEl) shopMovEl.innerText = playerMovementSize.toLocaleString();

    const intlEl = document.getElementById('store-international-followers');
    if (intlEl) intlEl.innerText = (window.internationalFollowers !== undefined ? window.internationalFollowers : (window.playerInternationalFollowers || internationalFollowers || 0)).toLocaleString();

    const invEl = document.getElementById('store-inventory');
    if (invEl) {
        invEl.innerHTML = '<h3>Inventory:</h3>';
        if (playerHasTruck > 0) invEl.innerHTML += `<div>Bruno The Trash Truck (x${playerHasTruck})</div>`;
        for (const [item, count] of Object.entries(playerInventory)) {
            if (count > 0) {
                if (item === 'Goose Rewards Card') {
                    invEl.innerHTML += `<div style="display:flex;align-items:center;gap:6px;"><img src="assets/sprites/goose_card.png" style="width:20px;height:20px;image-rendering:pixelated;"/> ${item} (x${count})</div>`;
                } else if (item === 'Lids') {
                    invEl.innerHTML += `<div>🥫 ${item} (x${count})</div>`;
                } else {
                    invEl.innerHTML += `<div>${item} (x${count})</div>`;
                }
            }
        }
    }

    if (typeof renderTrophyRoom === 'function') {
        renderTrophyRoom();
    }
}

function renderStore() {
    const container = document.querySelector('.store-items');
    if (!container) return;
    container.innerHTML = '';

    // ── International Travel Unlock Panel ──
    if (!window.playerUnlockedInternational) {
        const intlPanel = document.createElement('div');
        intlPanel.style.cssText = `
            width: 100%; background: linear-gradient(135deg,rgba(0,100,200,0.95),rgba(0,50,100,0.95));
            border: 2px solid #00aaff; border-radius: 12px; padding: 16px 20px;
            margin-bottom: 18px; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center;
        `;
        intlPanel.innerHTML = `
            <div>
                <div style="font-family:'Press Start 2P',monospace; font-size:9px; color:#00aaff; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px;">
                    ✈️ INTERNATIONAL TRAVEL
                </div>
                <div style="font-family:'Press Start 2P',monospace; font-size:7px; color:#ddd; margin-bottom:12px;">
                    Unlock the Airport building. Travel to Dahgbad and Cucaracha to gain international followers!
                </div>
            </div>
            <button id="btn-unlock-international" class="btn" style="font-family:'Press Start 2P',monospace;font-size:8px;padding:10px 15px;background:#00aa66;border-color:#008844;color:#fff;cursor:pointer;">
                UNLOCK ($35,000)
            </button>
        `;
        container.appendChild(intlPanel);
        
        const unlockBtn = intlPanel.querySelector('#btn-unlock-international');
        if (playerBalance < 35000) {
            unlockBtn.disabled = true;
            unlockBtn.style.background = '#333';
            unlockBtn.style.borderColor = '#222';
            unlockBtn.style.cursor = 'not-allowed';
        }
        
        unlockBtn.addEventListener('click', async () => {
            if (!confirm('Unlock International Travel for $35,000?')) return;
            try {
                await apiCall('/api/game/unlock-international', 'POST');
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // ── Credits Unlock Panel ──
    const creditsLeft = (window.playerCredits !== undefined ? window.playerCredits : playerCredits);
    if (creditsLeft > 0) {
        const creditsPanel = document.createElement('div');
        creditsPanel.id = 'credits-unlock-panel';
        creditsPanel.style.cssText = `
            width: 100%; background: linear-gradient(135deg,rgba(20,40,80,0.95),rgba(10,20,50,0.95));
            border: 2px solid #ffaa00; border-radius: 12px; padding: 16px 20px;
            margin-bottom: 18px; box-sizing: border-box;
        `;

        const creditItems = ['Wings', 'Mushrooms', 'Organizer', 'Magic 8-Ball', 'Borrowed Time', 'Filthadelphia', 'Parade'];

        creditsPanel.innerHTML = `
            <div style="font-family:'Press Start 2P',monospace; font-size:9px; color:#ffaa00; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px;">
                🌟 Starting Credits: <span id="credits-remaining-display" style="color:#00ffcc;">${creditsLeft}</span> / 3 remaining
            </div>
            <div style="font-family:'Press Start 2P',monospace; font-size:7px; color:#aaa; margin-bottom:12px;">
                Spend credits to unlock any item for free. Each player starts with 3 credits.
            </div>
            <div id="credit-item-buttons" style="display:flex; flex-wrap:wrap; gap:8px;">
                ${creditItems.map(itemName => {
                    const owned = playerInventory[itemName] || 0;
                    const disabled = creditsLeft <= 0 ? 'disabled' : '';
                    const style = creditsLeft <= 0
                        ? 'background:#222;color:#555;border:2px solid #333;cursor:not-allowed;'
                        : 'background:linear-gradient(135deg,#1a3a6a,#0a2040);color:#00ffcc;border:2px solid #00aaff;cursor:pointer;';
                    return `<button class="btn credit-spend-btn" data-item="${itemName}" ${disabled}
                        style="font-family:\'Press Start 2P\',monospace;font-size:7px;padding:6px 10px;border-radius:6px;${style}">
                        ${itemName} ${owned > 0 ? `(x${owned})` : ''}
                    </button>`;
                }).join('')}
            </div>
        `;
        container.appendChild(creditsPanel);

        // Wire credit spend buttons
        creditsPanel.querySelectorAll('.credit-spend-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const itemName = e.target.getAttribute('data-item');
                if (!itemName) return;
                if (!confirm(`Spend 1 credit to unlock: ${itemName}?`)) return;
                try {
                    const result = await apiCall('/api/game/spend-credit', 'POST', { item_name: itemName });
                    playerCredits = result.credits_remaining;
                    window.playerCredits = playerCredits;
                    await refreshGameState();
                    renderStore();
                } catch (err) {
                    alert(err.message);
                }
            });
        });
    }

    STORE_ITEMS.forEach(item => {
        if (item.name === 'Price Fixing' && window.madeManStatus !== 'accepted') {
            return;
        }
        if (item.name === 'Burninator' && !window.playerUnlockedCult) {
            return;
        }
        const div = document.createElement('div');
        div.className = 'store-item-card';
        
        let imgHtml = '';
        if (item.sprite) {
            imgHtml = `<img src="assets/sprites/${item.sprite}" alt="${item.name}">`;
        }

        let btnDisabled = '';
        let btnText = item.isEmployee ? 'Hire' : 'Buy';
        let descOverride = item.desc;

        if (item.name === 'Bruno The Trash Truck') {
            const currentTrucks = playerHasTruck || 0;
            const truckPrice = 100000 + currentTrucks * 50000;
            item.price = truckPrice;
            const nextTruckNum = currentTrucks + 1;
            const reqs = {1: 0, 2: 27, 3: 81, 4: 343};
            if (nextTruckNum > 4) {
                btnDisabled = 'disabled style="background: #333; color: #888; border: 2px solid #222; cursor: not-allowed;"';
                btnText = 'Max Limit';
                descOverride = 'Max 4 trash trucks reached.';
            } else {
                const reqFollowers = reqs[nextTruckNum];
                descOverride = `Truck #${nextTruckNum} ($${truckPrice.toLocaleString()}) needs ${reqFollowers} followers.`;
                if (playerMovementSize < reqFollowers) {
                    btnDisabled = 'disabled style="background: #333; color: #888; border: 2px solid #222; cursor: not-allowed;"';
                    btnText = 'Locked';
                }
            }
        }

        const limitedItems = ['Mushrooms', 'Borrowed Time', 'Wings', 'Protection', 'Flashlight'];
        if (limitedItems.includes(item.name)) {
            const count = playerInventory[item.name] || 0;
            descOverride = `${item.desc} (Owned: ${count}/10)`;
            if (count >= 10) {
                btnDisabled = 'disabled style="background: #333; color: #888; border: 2px solid #222; cursor: not-allowed;"';
                btnText = 'Limit Reached';
            }
        }

        if (item.name === 'Organizer') {
            const followers = playerMovementSize || 0;
            const maxAllowed = Math.floor(followers / 50);
            const count = playerInventory['Organizer'] || 0;
            descOverride = `${item.desc} (Owned: ${count}/${maxAllowed})`;
            if (followers < 50) {
                btnDisabled = 'disabled style="background: #333; color: #888; border: 2px solid #222; cursor: not-allowed;"';
                btnText = 'Locked';
                descOverride = 'Requires 50 followers to hire organizers.';
            } else if (count >= maxAllowed) {
                btnDisabled = 'disabled style="background: #333; color: #888; border: 2px solid #222; cursor: not-allowed;"';
                btnText = 'Limit Reached';
                descOverride = `Follower limit reached! You can only hire ${maxAllowed} organizers.`;
            }
        }

        if (item.name === 'Burninator') {
            const count = playerInventory['Burninator'] || 0;
            if (count >= 1) {
                btnDisabled = 'disabled style="background: #333; color: #888; border: 2px solid #222; cursor: not-allowed;"';
                btnText = 'Owned';
            }
        }

        let sellBtnHtml = '';
        if (item.name === 'Bruno The Trash Truck' && playerHasTruck > 0) {
            sellBtnHtml = `<button class="btn sell-truck-btn" style="background: #ff4444; border-color: #cc2222; margin-top: 5px; width: 100%;">Sell for $5,000</button>`;
        }

        div.innerHTML = `
            ${imgHtml}
            <h3>${item.name}</h3>
            <p>${descOverride}</p>
            <div class="price">$${item.price.toLocaleString()}</div>
            <button class="btn buy-btn" data-name="${item.name}" ${btnDisabled}>${btnText}</button>
            ${sellBtnHtml}
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const itemName = e.target.getAttribute('data-name');
            if (itemName === 'Burninator') {
                if (!confirm("Are you sure you want to purchase 'Burninator' for $1,000,000?\n\nNote: 'Burninator' requires a 5 follower sacrifice after every round it is used. If you fail to sacrifice or lack enough followers, it will leave your inventory.")) {
                    return;
                }
            }
            try {
                await apiCall('/api/game/buy', 'POST', { item_name: itemName });
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    });

    document.querySelectorAll('.sell-truck-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm("Are you sure you want to sell 1 of your trash trucks for $5,000?")) return;
            try {
                await apiCall('/api/game/sell-truck', 'POST');
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

function openHireDialog() {
    const dialog = document.getElementById('hire-dialog');
    if (!dialog) return;

    tempHiresCount = window.employeesHired || 0;
    updateHireDialogUI();

    dialog.classList.remove('hidden');
}

function updateHireDialogUI() {
    const qtyEl = document.getElementById('hire-qty');
    const upkeepEl = document.getElementById('hire-upkeep-val');
    if (qtyEl) qtyEl.innerText = tempHiresCount;
    if (upkeepEl) upkeepEl.innerText = `$${(tempHiresCount * 200).toLocaleString()}`;
    
    // Update limit text
    const limitTextEl = document.getElementById('hire-limit-text');
    if (limitTextEl) {
        const followers = playerMovementSize || 0;
        let maxAllowed = 5;
        if (followers >= 40) {
            maxAllowed = 2 * (playerHasTruck || 0);
            limitTextEl.innerHTML = `
                Upkeep: <span id="hire-upkeep-val">$${(tempHiresCount * 200).toLocaleString()}</span>/15s<br>
                Limit: ${maxAllowed} members max (2 per truck).
            `;
        } else {
            limitTextEl.innerHTML = `
                Upkeep: <span id="hire-upkeep-val">$${(tempHiresCount * 200).toLocaleString()}</span>/15s<br>
                Limit: 5 members max.
            `;
        }
    }
}

function updateModeToggles() {
    const pirateContainer = document.getElementById('pirate-toggle-container');
    const frenzyContainer = document.getElementById('frenzy-toggle-container') || pirateContainer;
    const crimeContainer = document.getElementById('crime-toggle-container');
    const fastfoodContainer = document.getElementById('fastfood-toggle-container');

    // 1. Pirate Mode
    if (pirateContainer) {
        const pirateToggle = document.getElementById('pirate-toggle');
        const label = pirateContainer.querySelector('.toggle-label');
        if (playerMovementSize < 10) {
            if (pirateToggle) { pirateToggle.disabled = true; pirateToggle.checked = false; }
            if (label) { label.innerText = `Pirate Mode (Locked: 10 Followers)`; label.style.color = '#888'; }
        } else {
            if (pirateToggle) pirateToggle.disabled = false;
            if (label) { label.innerText = `Pirate Mode`; label.style.color = '#ffcc00'; }
        }
    }

    // 2. Fast Food Mode
    if (fastfoodContainer) {
        const fastfoodToggle = document.getElementById('fastfood-toggle');
        const label = fastfoodContainer.querySelector('.toggle-label');
        
        const oldBtn = fastfoodContainer.querySelector('.unlock-mode-btn');
        if (oldBtn) oldBtn.remove();
        
        if (playerUnlockedFastFood === 0) {
            fastfoodContainer.querySelector('.switch').style.display = 'none';
            label.style.display = 'none';
            fastfoodToggle.checked = false;
            
            const btn = document.createElement('button');
            btn.className = 'btn unlock-mode-btn';
            btn.innerText = `Unlock Fast Food ($20k + 25 Followers)`;
            btn.style.fontFamily = "'Press Start 2P', monospace";
            btn.style.fontSize = "6px";
            btn.style.padding = "6px 8px";
            btn.style.marginTop = "4px";
            btn.style.width = "100%";
            btn.style.cursor = "pointer";
            
            if (playerMovementSize >= 25 && playerBalance >= 20000) {
                btn.style.background = '#00cc66';
                btn.style.border = '2px solid #008844';
                btn.disabled = false;
                btn.addEventListener('click', async () => {
                    try {
                        await apiCall('/api/game/unlock-mode', 'POST', { mode: 'fastfood' });
                        await refreshGameState();
                    } catch (e) {
                        alert(e.message);
                    }
                });
            } else {
                btn.style.background = '#333';
                btn.style.border = '2px solid #222';
                btn.style.color = '#888';
                btn.disabled = true;
                btn.style.cursor = "not-allowed";
            }
            fastfoodContainer.appendChild(btn);
        } else {
            fastfoodContainer.querySelector('.switch').style.display = 'inline-block';
            label.style.display = 'inline-block';
            fastfoodToggle.disabled = false;
            label.innerText = `Fast Food Mode`;
            label.style.color = '#fff';
        }
    }

    // 3. Crime Mode
    if (crimeContainer) {
        const crimeToggle = document.getElementById('crime-toggle');
        const label = crimeContainer.querySelector('.toggle-label');
        
        if (window.madeManStatus !== 'accepted') {
            crimeContainer.style.display = 'none';
            crimeToggle.checked = false;
        } else {
            crimeContainer.style.display = 'block';
            crimeContainer.querySelector('.switch').style.display = 'inline-block';
            label.style.display = 'inline-block';
            crimeToggle.disabled = false;
            label.innerText = `Crime Mode`;
            label.style.color = '#fff';
        }
    }

    // 4. Politics Mode
    const politicsContainer = document.getElementById('politics-toggle-container');
    if (politicsContainer) {
        const politicsToggle = document.getElementById('politics-toggle');
        const label = politicsContainer.querySelector('.toggle-label');
        const office = window.politicalOffice || 'citizen';
        
        if (office === 'citizen') {
            politicsContainer.style.display = 'none';
            politicsToggle.checked = false;
        } else {
            politicsContainer.style.display = 'block';
            politicsToggle.disabled = false;
            
            const officeLabels = {
                'candidate_council': 'Run for Council',
                'council': 'Councilman',
                'candidate_mayor': 'Run for Mayor',
                'mayor': 'Mayor',
                'candidate_senator': 'Run for Senator',
                'senator': 'Senator',
                'candidate_president': 'Run for President',
                'president': 'President'
            };
            label.innerText = officeLabels[office] || 'Politics Mode';
            label.style.color = '#00ffcc';
        }
    }

    // 5. Cult Mode
    const cultContainer = document.getElementById('cult-toggle-container');
    if (cultContainer) {
        const cultToggle = document.getElementById('cult-toggle');
        const label = cultContainer.querySelector('.toggle-label');
        
        const oldBtn = cultContainer.querySelector('.unlock-mode-btn');
        if (oldBtn) oldBtn.remove();
        
        if (window.playerUnlockedCult === 0) {
            cultContainer.querySelector('.switch').style.display = 'none';
            label.style.display = 'none';
            cultToggle.checked = false;
            
            const btn = document.createElement('button');
            btn.className = 'btn unlock-mode-btn';
            btn.innerText = `Unlock Cult Mode ($15k + 40 Followers)`;
            btn.style.fontFamily = "'Press Start 2P', monospace";
            btn.style.fontSize = "6px";
            btn.style.padding = "6px 8px";
            btn.style.marginTop = "4px";
            btn.style.width = "100%";
            btn.style.cursor = "pointer";
            
            if (playerMovementSize >= 40 && playerBalance >= 15000) {
                btn.style.background = '#00cc66';
                btn.style.border = '2px solid #008844';
                btn.disabled = false;
                btn.addEventListener('click', async () => {
                    try {
                        await apiCall('/api/game/unlock-mode', 'POST', { mode: 'cult' });
                        await refreshGameState();
                        alert("🔓 Level Unlocked: Cult Mode!\n\nThe Church of Grimetology\n\nThe Church of Grimetology is a charismatic-led cult with a growing number of followers dedicated to cleaning up trash in their cities.\n\nAs a cult leader, you deeply believe that if they can only raise $1,000,000 you will be able to summon a dragon that will do your bidding and the bidding of the cult (picking up trash). The members of the Church of Grimetology are required to make many sacrifices.");
                    } catch (e) {
                        alert(e.message);
                    }
                });
            } else {
                btn.style.background = '#333';
                btn.style.border = '2px solid #222';
                btn.style.color = '#888';
                btn.disabled = true;
                btn.style.cursor = "not-allowed";
            }
            cultContainer.appendChild(btn);
        } else {
            cultContainer.querySelector('.switch').style.display = 'inline-block';
            label.style.display = 'inline-block';
            cultToggle.disabled = false;
            label.innerText = `Cult Mode`;
            label.style.color = '#fff';
        }
    }

    // 5.5. Dragon Mode (Burninator)
    const dragonContainer = document.getElementById('dragon-toggle-container');
    if (dragonContainer) {
        const dragonToggle = document.getElementById('dragon-toggle');
        const cultToggle = document.getElementById('cult-toggle');

        if (playerInventory['Burninator'] > 0) {
            dragonContainer.style.display = 'block';
            dragonToggle.disabled = false;
            
            // Set up change handler
            if (!dragonToggle.dataset.handlerWired) {
                dragonToggle.dataset.handlerWired = "true";
                dragonToggle.addEventListener('change', () => {
                    window.dragonMode = dragonToggle.checked;
                    if (window.dragonMode) {
                        cultToggle.checked = true;
                        cultToggle.disabled = true;
                        window.cultMode = true;
                    } else {
                        if (window.playerUnlockedCult > 0) {
                            cultToggle.disabled = false;
                        }
                        window.cultMode = cultToggle.checked;
                    }
                });
            }
            
            // Set default value based on window.dragonMode
            dragonToggle.checked = !!window.dragonMode;
            
            // If checked, ensure cultToggle is checked and disabled
            if (dragonToggle.checked) {
                cultToggle.checked = true;
                cultToggle.disabled = true;
                window.cultMode = true;
            }
        } else {
            dragonContainer.style.display = 'none';
            dragonToggle.checked = false;
            window.dragonMode = false;
        }
    }

    // 6. Builder Mode
    const builderContainer = document.getElementById('builder-toggle-container');
    if (builderContainer) {
        const builderToggle = document.getElementById('builder-toggle');
        const label = builderContainer.querySelector('.toggle-label');
        
        const oldBtn = builderContainer.querySelector('.unlock-mode-btn');
        if (oldBtn) oldBtn.remove();
        
        if (window.playerUnlockedBuilder === 0) {
            builderContainer.querySelector('.switch').style.display = 'none';
            label.style.display = 'none';
            builderToggle.checked = false;
            
            const btn = document.createElement('button');
            btn.className = 'btn unlock-mode-btn';
            btn.innerText = `Unlock Builder Mode ($25k + 60 Followers)`;
            btn.style.fontFamily = "'Press Start 2P', monospace";
            btn.style.fontSize = "6px";
            btn.style.padding = "6px 8px";
            btn.style.marginTop = "4px";
            btn.style.width = "100%";
            btn.style.cursor = "pointer";
            
            if (playerMovementSize >= 60 && playerBalance >= 25000) {
                btn.style.background = '#00cc66';
                btn.style.border = '2px solid #008844';
                btn.disabled = false;
                btn.addEventListener('click', async () => {
                    try {
                        await apiCall('/api/game/unlock-mode', 'POST', { mode: 'builder' });
                        await refreshGameState();
                    } catch (e) {
                        alert(e.message);
                    }
                });
            } else {
                btn.style.background = '#333';
                btn.style.border = '2px solid #222';
                btn.style.color = '#888';
                btn.disabled = true;
                btn.style.cursor = "not-allowed";
            }
            builderContainer.appendChild(btn);
        } else {
            builderContainer.querySelector('.switch').style.display = 'inline-block';
            label.style.display = 'inline-block';
            builderToggle.disabled = false;
            label.innerText = `Builder Mode`;
            label.style.color = '#fff';
        }
    }

    // 7. Fantasy Mode
    const fantasyContainer = document.getElementById('fantasy-toggle-container');
    if (fantasyContainer) {
        const fantasyToggle = document.getElementById('fantasy-toggle');
        const label = fantasyContainer.querySelector('.toggle-label');
        
        const oldBtn = fantasyContainer.querySelector('.unlock-mode-btn');
        if (oldBtn) oldBtn.remove();
        
        if (window.playerUnlockedFantasy === 0) {
            fantasyContainer.querySelector('.switch').style.display = 'none';
            label.style.display = 'none';
            fantasyToggle.checked = false;
            
            const btn = document.createElement('button');
            btn.className = 'btn unlock-mode-btn';
            btn.innerText = `Unlock Fantasy Mode ($30k + 75 Followers)`;
            btn.style.fontFamily = "'Press Start 2P', monospace";
            btn.style.fontSize = "6px";
            btn.style.padding = "6px 8px";
            btn.style.marginTop = "4px";
            btn.style.width = "100%";
            btn.style.cursor = "pointer";
            
            if (playerMovementSize >= 75 && playerBalance >= 30000) {
                btn.style.background = '#00cc66';
                btn.style.border = '2px solid #008844';
                btn.disabled = false;
                btn.addEventListener('click', async () => {
                    try {
                        await apiCall('/api/game/unlock-mode', 'POST', { mode: 'fantasy' });
                        await refreshGameState();
                    } catch (e) {
                        alert(e.message);
                    }
                });
            } else {
                btn.style.background = '#333';
                btn.style.border = '2px solid #222';
                btn.style.color = '#888';
                btn.disabled = true;
                btn.style.cursor = "not-allowed";
            }
            fantasyContainer.appendChild(btn);
        } else {
            fantasyContainer.querySelector('.switch').style.display = 'inline-block';
            label.style.display = 'inline-block';
            fantasyToggle.disabled = false;
            label.innerText = `Fantasy Mode`;
            label.style.color = '#fff';
        }
    }

    // 8. Chaos Mode
    const chaosContainer = document.getElementById('chaos-toggle-container');
    if (chaosContainer) {
        const chaosToggle = document.getElementById('chaos-toggle');
        const allUnlocked = (
            playerMovementSize >= 10 &&
            playerUnlockedFastFood > 0 &&
            window.madeManStatus === 'accepted' &&
            (window.politicalOffice && window.politicalOffice !== 'citizen') &&
            window.playerUnlockedCult > 0 &&
            window.playerUnlockedBuilder > 0 &&
            window.playerUnlockedFantasy > 0
        );

        if (allUnlocked || window.chaosCheatActive) {
            chaosContainer.style.display = 'block';
            chaosToggle.disabled = false;
            
            // Set up change handler
            if (!chaosToggle.dataset.handlerWired) {
                chaosToggle.dataset.handlerWired = "true";
                chaosToggle.addEventListener('change', () => {
                    window.chaosMode = chaosToggle.checked;
                    if (window.chaosMode) {
                        showChaosConfigDialog();
                    }
                });
            }
        } else {
            chaosContainer.style.display = 'none';
            chaosToggle.checked = false;
            window.chaosMode = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    if (authToken) {
        if (userRole === 'admin') showScreen('admin-screen');
        else {
            refreshGameState().then(() => {
                renderStore();
                showScreen('store-screen');
            });
        }
    } else {
        showScreen('login-screen');
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const trophyDialog = document.getElementById('trophy-dialog');
            if (trophyDialog && !trophyDialog.classList.contains('hidden')) {
                trophyDialog.classList.add('hidden');
            }
            const hireDialog = document.getElementById('hire-dialog');
            if (hireDialog && !hireDialog.classList.contains('hidden')) {
                hireDialog.classList.add('hidden');
            }
            const statsDialog = document.getElementById('stats-dialog');
            if (statsDialog && !statsDialog.classList.contains('hidden')) {
                statsDialog.classList.add('hidden');
            }
        }
    });
});

const TROPHY_CATEGORIES = [
    {
        key: 'max_single_trash',
        name: 'Single Game Trash',
        color: '#4caf50',
        badge: '🗑️',
        thresholds: [300, 500, 1000, 1750, 2500],
        names: ['Trash Collector', 'Garbage Patrol', 'Sanitation Officer', 'City Cleaner', 'Trash Overlord']
    },
    {
        key: 'cumulative_trash',
        name: 'Cumulative Trash',
        color: '#8bc34a',
        badge: '📦',
        thresholds: [50, 250, 1250, 6250, 31250],
        names: ['Litter Sweep', 'Clean Streets', 'Neighborhood Hero', 'Eco Warrior', 'Saviour of Philly']
    },
    {
        key: 'max_single_money',
        name: 'Single Round Money',
        color: '#ffeb3b',
        badge: '💵',
        thresholds: [500, 2500, 12500, 62500, 312500],
        names: ['Pennies Count', 'Dollar Bill', 'Big Earner', 'Wealth Generator', 'Money Magnet']
    },
    {
        key: 'current_balance',
        name: 'Current Balance',
        color: '#ffc107',
        badge: '💰',
        thresholds: [2000, 10000, 50000, 250000, 1250000],
        names: ['Thrifty Hustler', 'Local Business', 'Philly Tycoon', 'Billionaire Club', 'Infinite Wealth']
    },
    {
        key: 'max_single_followers',
        name: 'Single Round Followers',
        color: '#00bcd4',
        badge: '👥',
        thresholds: [5, 15, 45, 135, 400],
        names: ['Posse Spark', 'Crowd Puller', 'Local Leader', 'Trendsetter', 'Revolutionary']
    },
    {
        key: 'total_followers',
        name: 'Total Followers',
        color: '#009688',
        badge: '👑',
        thresholds: [10, 40, 160, 640, 2560],
        names: ['Small Crew', 'Active Movement', 'Rising Leader', 'Mass Movement', 'Philly Emperor']
    }
];

function renderTrophyRoom() {
    const shelvesEl = document.getElementById('trophy-case-shelves');
    if (!shelvesEl) return;
    shelvesEl.innerHTML = '';

    TROPHY_CATEGORIES.forEach(cat => {
        const shelfRow = document.createElement('div');
        shelfRow.className = 'trophy-shelf-row';

        const title = document.createElement('div');
        title.className = 'trophy-shelf-title';
        title.innerText = cat.name.toUpperCase();
        shelfRow.appendChild(title);

        let currentVal = playerStats[cat.key] || 0;
        if (cat.key === 'current_balance') {
            currentVal = playerBalance || 0;
        }

        // Find the next locked achievement
        let nextIndex = -1;
        for (let i = 0; i < cat.thresholds.length; i++) {
            if (currentVal < cat.thresholds[i]) {
                nextIndex = i;
                break;
            }
        }

        // List the next achievement requirement text
        const reqText = document.createElement('div');
        reqText.style.fontFamily = "'Press Start 2P', monospace";
        reqText.style.fontSize = "6px";
        reqText.style.marginBottom = "8px";
        
        const levelsList = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
        if (nextIndex !== -1) {
            reqText.style.color = '#00ffcc';
            reqText.innerText = `NEXT: "${cat.names[nextIndex].toUpperCase()}" (${levelsList[nextIndex]}) - NEED ${cat.badge} ${cat.thresholds[nextIndex].toLocaleString()} (CURRENT: ${currentVal.toLocaleString()})`;
        } else {
            reqText.style.color = '#ffeb3b';
            reqText.innerText = `ALL ACHIEVEMENTS UNLOCKED! 🏆`;
        }
        shelfRow.appendChild(reqText);

        const wood = document.createElement('div');
        wood.className = 'trophy-shelf-wood';

        const order = [2, 4, 5, 3, 1];
        const metalColors = ['#cd7f32', '#d0d0d8', '#ffd700', '#e5e4e2', '#b9f2ff'];
        
        order.forEach(level => {
            const index = level - 1;
            const threshold = cat.thresholds[index];
            const name = cat.names[index];
            const unlocked = currentVal >= threshold;

            const slot = document.createElement('div');
            slot.className = 'trophy-slot';

            const size = 16 + level * 8;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
            
            if (unlocked) {
                drawTrophy(canvas, level, cat.color);
            } else {
                drawSilhouetteTrophy(canvas, level);
            }

            slot.appendChild(canvas);

            const slotLabel = document.createElement('div');
            slotLabel.style.fontSize = '6px';
            slotLabel.style.fontFamily = '"Press Start 2P", monospace';
            slotLabel.style.color = metalColors[index] || '#ffaa00';
            slotLabel.style.marginTop = '4px';
            slotLabel.style.textAlign = 'center';
            slotLabel.style.textShadow = '1px 1px #000';
            slotLabel.innerText = levelsList[index] || '';
            slot.appendChild(slotLabel);

            const tooltip = document.createElement('div');
            tooltip.className = 'trophy-tooltip';
            
            tooltip.innerHTML = `
                <div style="color: #ffaa00; font-weight: bold; font-size: 8px; margin-bottom: 4px;">${name.toUpperCase()}</div>
                <div style="color: ${metalColors[index]}; font-size: 7px; margin-bottom: 4px;">${levelsList[index]} TIER</div>
                <div style="color: #fff; margin-bottom: 2px;">REQ: ${cat.badge} ${threshold.toLocaleString()}</div>
                <div style="color: #aaa; margin-bottom: 4px;">YOURS: ${cat.badge} ${currentVal.toLocaleString()}</div>
                ${unlocked 
                    ? '<div style="color: #00ff88; font-weight: bold;">✓ UNLOCKED!</div>' 
                    : `<div style="color: #ff3333; font-weight: bold;">LOCKED (${Math.max(0, threshold - currentVal).toLocaleString()} NEEDED)</div>`
                }
            `;
            slot.appendChild(tooltip);
            wood.appendChild(slot);
        });

        shelfRow.appendChild(wood);
        shelvesEl.appendChild(shelfRow);
    });
}

function drawTrophy(canvas, level, categoryColor) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const w = canvas.width;
    const h = canvas.height;
    ctx.imageRendering = 'pixelated';
    
    let metalColor = '#8c5a3c';
    let strokeColor = '#3e2417';
    let lightColor = '#b88663';
    
    if (level === 2) {
        metalColor = '#a0a0a8';
        strokeColor = '#484850';
        lightColor = '#e0e0e8';
    } else if (level === 3) {
        metalColor = '#e0a000';
        strokeColor = '#604000';
        lightColor = '#ffe060';
    } else if (level === 4) {
        metalColor = '#00b8b8';
        strokeColor = '#004c4c';
        lightColor = '#80ffff';
    } else if (level === 5) {
        metalColor = '#60a0ff';
        strokeColor = '#103080';
        lightColor = '#e0f0ff';
    }
    
    const scale = w / 16;
    
    ctx.fillStyle = strokeColor;
    ctx.fillRect(4 * scale, 11 * scale, 8 * scale, 2 * scale);
    ctx.fillRect(7 * scale, 7 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(3 * scale, 1 * scale, 10 * scale, 6 * scale);
    ctx.fillRect(1 * scale, 2 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(13 * scale, 2 * scale, 2 * scale, 4 * scale);
    
    ctx.fillStyle = metalColor;
    ctx.fillRect(5 * scale, 11 * scale, 6 * scale, 1 * scale);
    ctx.fillRect(7.5 * scale, 7 * scale, 1 * scale, 4 * scale);
    ctx.fillRect(4 * scale, 2 * scale, 8 * scale, 4.5 * scale);
    
    ctx.fillStyle = lightColor;
    ctx.fillRect(5 * scale, 2 * scale, 1 * scale, 3.5 * scale);
    ctx.fillRect(8 * scale, 11 * scale, 1 * scale, 1 * scale);
    
    ctx.fillStyle = '#0c0804';
    ctx.fillRect(2 * scale, 3 * scale, 1 * scale, 2 * scale);
    ctx.fillRect(13 * scale, 3 * scale, 1 * scale, 2 * scale);
    
    ctx.fillStyle = categoryColor || '#4caf50';
    ctx.fillRect(7 * scale, 3.5 * scale, 2 * scale, 2 * scale);
}

function drawSilhouetteTrophy(canvas, level) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageRendering = 'pixelated';

    const w = canvas.width;
    const scale = w / 16;
    
    ctx.fillStyle = '#222225';
    ctx.fillRect(4 * scale, 13 * scale, 8 * scale, 2 * scale);
    ctx.fillRect(7 * scale, 9 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(3 * scale, 2 * scale, 10 * scale, 7 * scale);
    ctx.fillRect(1 * scale, 3 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(13 * scale, 3 * scale, 2 * scale, 4 * scale);
    
    ctx.fillStyle = '#44444a';
    ctx.fillRect(5 * scale, 13 * scale, 6 * scale, 1 * scale);
    ctx.fillRect(7.5 * scale, 9 * scale, 1 * scale, 4 * scale);
    ctx.fillRect(4 * scale, 3 * scale, 8 * scale, 5 * scale);
    
    ctx.fillStyle = '#0c0804';
    ctx.fillRect(2 * scale, 4 * scale, 1 * scale, 2 * scale);
    ctx.fillRect(13 * scale, 4 * scale, 1 * scale, 2 * scale);
}

window.apiCall = apiCall;
window.refreshGameState = refreshGameState;
window.showScreen = showScreen;
window.renderStore = renderStore;
window.buyBuilding = (buildingIdx, address, cost) => apiCall('/api/game/buy-building', 'POST', { building_idx: buildingIdx, address: address, cost: cost });
window.addTenant = (buildingIdx) => apiCall('/api/game/add-tenant', 'POST', { building_idx: buildingIdx });

// ── Performance Stats Graph Custom Renderer ──
function drawStatsGraph(category, hoveredTarget = null) {
    const canvas = document.getElementById('stats-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear and set pixelated styles
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageRendering = 'pixelated';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textBaseline = 'middle';
    
    const w = canvas.width;
    const h = canvas.height;
    
    const padLeft = 60;
    const padRight = 60;
    const padTop = 30;
    const padBottom = 35;
    
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    activeGraphElements = [];

    if (!statsHistory || statsHistory.length === 0) {
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText('NO ROUNDS PLAYED YET', w / 2, h / 2);
        return;
    }

    let keyRound, keyCum, titleRound, titleCum, colorRound, colorCum, suffix = '';
    if (category === 'trash') {
        keyRound = 'trash_collected';
        keyCum = 'cumulative_trash';
        titleRound = 'Round Trash';
        titleCum = 'Total Trash';
        colorRound = '#4caf50'; // Green
        colorCum = '#00ffcc'; // Cyan
        suffix = ' pcs';
    } else if (category === 'money') {
        keyRound = 'money_earned';
        keyCum = 'cumulative_money';
        titleRound = 'Round Revenue';
        titleCum = 'Total Earnings';
        colorRound = '#ffeb3b'; // Yellow
        colorCum = '#ffaa00'; // Orange
        suffix = '';
    } else {
        keyRound = 'followers_gained';
        keyCum = 'cumulative_followers';
        titleRound = 'Round Followers';
        titleCum = 'Total Followers';
        colorRound = '#2196f3'; // Blue
        colorCum = '#ffffff'; // White
        suffix = '';
    }

    const formatVal = (v) => category === 'money' ? `$${Math.round(v).toLocaleString()}` : `${Math.round(v).toLocaleString()}${suffix}`;

    let maxRound = 0;
    let maxCum = 0;
    statsHistory.forEach(r => {
        if ((r[keyRound] || 0) > maxRound) maxRound = r[keyRound];
        if ((r[keyCum] || 0) > maxCum) maxCum = r[keyCum];
    });
    
    if (maxRound === 0) maxRound = 10;
    if (maxCum === 0) maxCum = 10;

    maxRound = Math.ceil(maxRound * 1.15);
    maxCum = Math.ceil(maxCum * 1.15);

    // Draw Grid Lines (horizontal)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
        const y = padTop + chartH - (i / gridLines) * chartH;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + chartW, y);
        ctx.stroke();

        // Left axis labels
        const leftVal = Math.round((i / gridLines) * maxRound);
        ctx.fillStyle = colorRound;
        ctx.textAlign = 'right';
        ctx.fillText(leftVal.toLocaleString(), padLeft - 10, y);

        // Right axis labels
        const rightVal = Math.round((i / gridLines) * maxCum);
        ctx.fillStyle = colorCum;
        ctx.textAlign = 'left';
        ctx.fillText(rightVal.toLocaleString(), padLeft + chartW + 10, y);
    }

    // Draw X-axis line
    ctx.strokeStyle = '#00aa66';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + chartH);
    ctx.lineTo(padLeft + chartW, padTop + chartH);
    ctx.stroke();

    const n = statsHistory.length;
    const colW = chartW / n;
    const barW = Math.max(4, colW * 0.4);

    // 1. Draw per-round bars
    statsHistory.forEach((r, idx) => {
        const val = r[keyRound] || 0;
        const barH = (val / maxRound) * chartH;
        const x = padLeft + idx * colW + (colW - barW) / 2;
        const y = padTop + chartH - barH;

        const isHovered = hoveredTarget && hoveredTarget.type === 'bar' && hoveredTarget.roundNumber === r.round_number;

        ctx.fillStyle = isHovered ? '#ffffff' : colorRound;
        ctx.fillRect(x, y, barW, barH);
        if (isHovered) {
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 2, y - 2, barW + 4, barH + 4);
        }

        activeGraphElements.push({
            type: 'bar',
            roundNumber: r.round_number,
            value: val,
            formattedVal: formatVal(val),
            x: x,
            y: y,
            w: barW,
            h: barH,
            columnLeft: padLeft + idx * colW,
            columnRight: padLeft + (idx + 1) * colW,
            label: titleRound,
            color: colorRound
        });

        // X-axis round labels
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        if (n <= 10 || idx % Math.ceil(n / 10) === 0 || idx === n - 1) {
            ctx.fillText(`R${r.round_number}`, padLeft + idx * colW + colW / 2, padTop + chartH + 12);
        }
    });

    // 2. Draw cumulative line
    ctx.strokeStyle = colorCum;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    statsHistory.forEach((r, idx) => {
        const val = r[keyCum] || 0;
        const pointX = padLeft + idx * colW + colW / 2;
        const pointY = padTop + chartH - (val / maxCum) * chartH;
        
        if (idx === 0) {
            ctx.moveTo(pointX, pointY);
        } else {
            ctx.lineTo(pointX, pointY);
        }
    });
    ctx.stroke();

    // Draw points on the line
    statsHistory.forEach((r, idx) => {
        const val = r[keyCum] || 0;
        const pointX = padLeft + idx * colW + colW / 2;
        const pointY = padTop + chartH - (val / maxCum) * chartH;
        const isHovered = hoveredTarget && hoveredTarget.type === 'point' && hoveredTarget.roundNumber === r.round_number;

        ctx.fillStyle = isHovered ? '#ffffff' : '#050805'; 
        ctx.beginPath();
        ctx.arc(pointX, pointY, isHovered ? 6 : 4, 0, Math.PI * 2);
        ctx.strokeStyle = isHovered ? '#ffaa00' : colorCum;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.fill();
        ctx.stroke();

        activeGraphElements.push({
            type: 'point',
            roundNumber: r.round_number,
            value: val,
            formattedVal: formatVal(val),
            x: pointX,
            y: pointY,
            radius: 8,
            label: titleCum,
            color: colorCum
        });
    });

    // Draw Legend
    ctx.textAlign = 'left';
    ctx.fillStyle = colorRound;
    ctx.fillRect(padLeft, 10, 8, 8);
    ctx.fillStyle = '#fff';
    ctx.fillText(titleRound, padLeft + 15, 14);

    ctx.fillStyle = colorCum;
    ctx.beginPath();
    ctx.moveTo(padLeft + 180, 14);
    ctx.lineTo(padLeft + 195, 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(padLeft + 187.5, 14, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(titleCum, padLeft + 205, 14);

    setupStatsGraphInteractivity();
}

let activeGraphElements = [];
let currentHoveredGraphTarget = null;

function setupStatsGraphInteractivity() {
    const canvas = document.getElementById('stats-canvas');
    const tooltip = document.getElementById('stats-tooltip');
    const container = document.getElementById('stats-canvas-container');
    if (!canvas || !tooltip || !container) return;

    const handleMouseMove = (e) => {
        if (!statsHistory || statsHistory.length === 0 || !activeGraphElements || activeGraphElements.length === 0) {
            tooltip.style.display = 'none';
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        let found = null;

        // 1. Check points (circular radius)
        for (const item of activeGraphElements) {
            if (item.type === 'point') {
                const dist = Math.hypot(mouseX - item.x, mouseY - item.y);
                if (dist <= 10) {
                    found = item;
                    break;
                }
            }
        }

        // 2. Check bars
        if (!found) {
            for (const item of activeGraphElements) {
                if (item.type === 'bar') {
                    if (mouseX >= item.columnLeft && mouseX <= item.columnRight) {
                        found = item;
                        break;
                    }
                }
            }
        }

        if (found) {
            if (currentHoveredGraphTarget !== found) {
                currentHoveredGraphTarget = found;
                drawStatsGraph(activeStatsCategory, found);
            }

            tooltip.innerHTML = `
                <div style="color: #ffaa00; font-size: 7px; margin-bottom: 4px; border-bottom: 1px solid #333; padding-bottom: 2px;">ROUND ${found.roundNumber}</div>
                <div style="color: ${found.color}; font-size: 7px;">${found.label}: <span style="color: #fff;">${found.formattedVal}</span></div>
            `;

            const containerRect = container.getBoundingClientRect();
            let tooltipX = e.clientX - containerRect.left + 15;
            let tooltipY = e.clientY - containerRect.top - 35;

            if (tooltipX + 180 > containerRect.width) {
                tooltipX = e.clientX - containerRect.left - 185;
            }
            if (tooltipY < 10) {
                tooltipY = e.clientY - containerRect.top + 15;
            }

            tooltip.style.left = `${tooltipX}px`;
            tooltip.style.top = `${tooltipY}px`;
            tooltip.style.display = 'block';
        } else {
            if (currentHoveredGraphTarget !== null) {
                currentHoveredGraphTarget = null;
                drawStatsGraph(activeStatsCategory, null);
            }
            tooltip.style.display = 'none';
        }
    };

    const handleMouseLeave = () => {
        if (currentHoveredGraphTarget !== null) {
            currentHoveredGraphTarget = null;
            drawStatsGraph(activeStatsCategory, null);
        }
        if (tooltip) tooltip.style.display = 'none';
    };

    if (canvas._mouseMoveHandler) canvas.removeEventListener('mousemove', canvas._mouseMoveHandler);
    if (canvas._mouseLeaveHandler) canvas.removeEventListener('mouseleave', canvas._mouseLeaveHandler);
    canvas._mouseMoveHandler = handleMouseMove;
    canvas._mouseLeaveHandler = handleMouseLeave;
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
}

function updateStatsSummary(category) {
    const summaryEl = document.getElementById('stats-summary');
    if (!summaryEl) return;

    if (!statsHistory || statsHistory.length === 0) {
        summaryEl.innerHTML = '<div style="grid-column: span 4; text-align: center; color: #888;">No rounds logged yet. Complete a round of garbage picking to build statistics!</div>';
        return;
    }

    const n = statsHistory.length;
    let keyRound, labelRound, labelCum, suffix = '';
    if (category === 'trash') {
        keyRound = 'trash_collected';
        labelRound = 'Round Trash';
        labelCum = 'Total Trash';
        suffix = ' pcs';
    } else if (category === 'money') {
        keyRound = 'money_earned';
        labelRound = 'Round Earnings';
        labelCum = 'Total Earnings';
        suffix = '';
    } else {
        keyRound = 'followers_gained';
        labelRound = 'Round Followers';
        labelCum = 'Total Followers';
    }

    let totalRoundVal = 0;
    let maxRoundVal = 0;
    statsHistory.forEach(r => {
        const val = r[keyRound] || 0;
        totalRoundVal += val;
        if (val > maxRoundVal) maxRoundVal = val;
    });
    const avgRoundVal = totalRoundVal / n;

    const finalCum = statsHistory[n - 1][category === 'trash' ? 'cumulative_trash' : (category === 'money' ? 'cumulative_money' : 'cumulative_followers')] || 0;

    const format = (v) => category === 'money' ? `$${Math.round(v).toLocaleString()}` : `${Math.round(v).toLocaleString()}${suffix}`;

    summaryEl.innerHTML = `
        <div>
            <span style="color: #888;">ROUNDS PLAYED:</span><br>
            <b style="color: #fff; font-size: 10px;">${n}</b>
        </div>
        <div>
            <span style="color: #888;">AVERAGE / ROUND:</span><br>
            <b style="color: #00ffcc; font-size: 10px;">${format(avgRoundVal)}</b>
        </div>
        <div>
            <span style="color: #888;">ROUND RECORD:</span><br>
            <b style="color: #ffaa00; font-size: 10px;">${format(maxRoundVal)}</b>
        </div>
        <div>
            <span style="color: #888;">CUMULATIVE TOTAL:</span><br>
            <b style="color: #00ffcc; font-size: 10px;">${format(finalCum)}</b>
        </div>
    `;
}

function updateStatsTabStyles() {
    document.querySelectorAll('.stats-tab-btn').forEach(btn => {
        const cat = btn.getAttribute('data-category');
        if (cat === activeStatsCategory) {
            btn.style.background = '#00ffcc';
            btn.style.borderColor = '#00aa88';
            btn.style.color = '#111';
        } else {
            btn.style.background = '#222';
            btn.style.borderColor = '#333';
            btn.style.color = '#aaa';
        }
    });
}

// ============================================================
// Snapshot Capture & 16-Slot Gallery Management
// ============================================================

window.updateEndScreenCaptionPreview = function() {
    const input = document.getElementById('end-screen-caption-input');
    const sizeSelect = document.getElementById('end-screen-caption-size');
    const colorSelect = document.getElementById('end-screen-caption-color');
    const preview = document.getElementById('end-screen-caption-preview');

    if (!preview) return;
    const text = input ? input.value.trim() : '';
    const size = sizeSelect ? sizeSelect.value : '10';
    const color = colorSelect ? colorSelect.value : '#00ffcc';

    preview.style.fontSize = `${size}px`;
    preview.style.color = color;
    preview.innerText = text ? `"${text}"` : '';
};

window.captureEndRoundSnapshot = function() {
    const trophyCanvas = document.getElementById('endRoundTrophyCanvas');
    const artCanvas = document.getElementById('defeatArtCanvas');
    const cansCanvas = document.getElementById('trashCansCountCanvas');
    const roundTrashCount = document.getElementById('round-trash-count');
    const defeatMessage = document.getElementById('defeat-message');
    const captionInput = document.getElementById('end-screen-caption-input');
    const sizeSelect = document.getElementById('end-screen-caption-size');
    const colorSelect = document.getElementById('end-screen-caption-color');

    const customCaptionText = captionInput ? captionInput.value.trim() : '';
    const fontSize = sizeSelect ? parseInt(sizeSelect.value, 10) : 10;
    const fontColor = colorSelect ? colorSelect.value : '#00ffcc';

    const cWidth = 520;
    const cHeight = customCaptionText ? 360 : 320;
    const canvas = document.createElement('canvas');
    canvas.width = cWidth;
    canvas.height = cHeight;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a0505';
    ctx.fillRect(0, 0, cWidth, cHeight);

    ctx.strokeStyle = '#441111';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, cWidth - 4, cHeight - 4);

    const topY = 20;

    // 1. Trophy Box (Top Left: 128x128)
    const trophyX = 35;
    ctx.fillStyle = '#000000';
    ctx.fillRect(trophyX, topY, 128, 128);
    if (trophyCanvas && trophyCanvas.style.display !== 'none') {
        ctx.drawImage(trophyCanvas, trophyX, topY, 128, 128);
    }
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 4;
    ctx.strokeRect(trophyX, topY, 128, 128);

    // 2. Defeat/Scene Art Box (Top Right: 256x128)
    const artX = 220;
    ctx.fillStyle = '#000000';
    ctx.fillRect(artX, topY, 256, 128);
    const gifEl = document.getElementById('defeat-gif');
    if (gifEl && gifEl.style.display !== 'none' && gifEl.complete && gifEl.naturalWidth > 0) {
        ctx.drawImage(gifEl, artX, topY, 256, 128);
    } else if (artCanvas && artCanvas.style.display !== 'none') {
        ctx.drawImage(artCanvas, artX, topY, 256, 128);
    }
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 4;
    ctx.strokeRect(artX, topY, 256, 128);

    // 3. Trash Collected Section
    const trashY = 168;
    ctx.fillStyle = '#00ffcc';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    const trashText = `Trash Collected: ${roundTrashCount ? roundTrashCount.innerText : '0'}`;
    ctx.fillText(trashText, cWidth / 2, trashY);

    if (cansCanvas) {
        const canX = (cWidth - 320) / 2;
        const canY = trashY + 10;
        ctx.fillStyle = '#000000';
        ctx.fillRect(canX, canY, 320, 40);
        ctx.drawImage(cansCanvas, canX, canY, 320, 40);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.strokeRect(canX, canY, 320, 40);
    }

    // 4. Message at bottom
    const msgY = 248;
    ctx.fillStyle = '#ff8888';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    const msg = defeatMessage ? defeatMessage.innerText : '';

    const words = msg.split(' ');
    let line = '';
    let currY = msgY;
    for (let i = 0; i < words.length; i++) {
        let testLine = line + words[i] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > 440 && i > 0) {
            ctx.fillText(line, cWidth / 2, currY);
            line = words[i] + ' ';
            currY += 15;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, cWidth / 2, currY);

    // 5. Custom End Screen Caption rendered with chosen size and color!
    if (customCaptionText) {
        currY += 25;
        ctx.fillStyle = fontColor;
        ctx.font = `${fontSize}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';

        const captionWords = customCaptionText.split(' ');
        let capLine = '';
        for (let i = 0; i < captionWords.length; i++) {
            let testLine = capLine + captionWords[i] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > 460 && i > 0) {
                ctx.fillText(capLine, cWidth / 2, currY);
                capLine = captionWords[i] + ' ';
                currY += fontSize + 4;
            } else {
                capLine = testLine;
            }
        }
        ctx.fillText(capLine, cWidth / 2, currY);
    }

    return canvas.toDataURL('image/png');
};

window.getGallerySnapshots = function() {
    try {
        const username = window.currentUsername || localStorage.getItem('trashMasterUsername') || 'default';
        const userKey = `trashMasterGallery_${username}`;
        const data = localStorage.getItem(userKey);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
};

window.saveGallerySnapshots = function(array) {
    try {
        const username = window.currentUsername || localStorage.getItem('trashMasterUsername') || 'default';
        const userKey = `trashMasterGallery_${username}`;
        localStorage.setItem(userKey, JSON.stringify(array));
    } catch (e) {
        console.error('Failed to save gallery to localStorage', e);
    }
};

let currentGalleryEditorIndex = -1;
let currentEditorBaseImg = null;
let currentEditorFilter = 'normal';
let currentEditorRotation = 0; // 0, 90, 180, 270
let currentEditorFlipH = false;
let currentEditorFlipV = false;
let doodleModeActive = false;
let selectedSticker = null;
let doodleCanvasOverlay = null;

window.renderGalleryModal = function() {
    const grid = document.getElementById('gallery-grid-container');
    const countText = document.getElementById('gallery-count-text');
    const gridView = document.getElementById('gallery-grid-view');
    const editorView = document.getElementById('gallery-editor-view');
    const titleEl = document.getElementById('gallery-dialog-title');

    if (!grid) return;

    // Show grid view by default
    if (gridView) gridView.classList.remove('hidden');
    if (editorView) editorView.classList.add('hidden');
    if (titleEl) titleEl.innerText = 'SNAPSHOT GALLERY';

    grid.innerHTML = '';
    const snapshots = window.getGallerySnapshots();
    if (countText) countText.innerText = `${snapshots.length} / 16 SLOTS USED`;

    snapshots.forEach((snap, idx) => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        const captionText = snap.caption ? `"${snap.caption}"` : 'No caption';
        card.innerHTML = `
            <img src="${snap.dataUrl}" class="gallery-card-thumb" />
            <div class="gallery-card-date">${snap.timestamp || 'SNAPSHOT'}</div>
            <div class="gallery-card-info">Trash: ${snap.trash || 0}</div>
            <div class="gallery-card-caption" style="font-size: 6px; color: #00ffcc; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; max-width: 100%; font-family: 'Press Start 2P', monospace;">${captionText}</div>
            <button class="gallery-editor-btn" style="margin-top: 6px; width: 100%; font-size: 6px; padding: 4px 0; background: #0088ff; border-color: #00aaff; color: #fff;">EDIT ✏️</button>
        `;
        card.addEventListener('click', () => {
            window.openGalleryEditor(idx);
        });
        grid.appendChild(card);
    });

    for (let i = snapshots.length; i < 16; i++) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'gallery-card-empty';
        emptyCard.innerText = `SLOT ${i + 1}\n[EMPTY]`;
        grid.appendChild(emptyCard);
    }
};

window.openSnapshotPreview = function(index) {
    window.openGalleryEditor(index);
};

window.openGalleryEditor = function(index) {
    const snapshots = window.getGallerySnapshots();
    if (index < 0 || index >= snapshots.length) return;

    currentGalleryEditorIndex = index;
    const snap = snapshots[index];

    const gridView = document.getElementById('gallery-grid-view');
    const editorView = document.getElementById('gallery-editor-view');
    const titleEl = document.getElementById('gallery-dialog-title');
    const captionInput = document.getElementById('editor-caption-input');

    if (gridView) gridView.classList.add('hidden');
    if (editorView) editorView.classList.remove('hidden');
    if (titleEl) titleEl.innerText = `EDIT SNAPSHOT #${index + 1}`;
    if (captionInput) captionInput.value = snap.caption || '';

    // Reset editor parameters
    currentEditorFilter = 'normal';
    currentEditorRotation = 0;
    currentEditorFlipH = false;
    currentEditorFlipV = false;
    doodleModeActive = false;
    selectedSticker = null;

    // Filter buttons reset
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'normal');
    });

    const togglePenBtn = document.getElementById('btn-toggle-doodle');
    if (togglePenBtn) {
        togglePenBtn.innerText = 'Pen: OFF ✏️';
        togglePenBtn.classList.remove('active');
    }

    document.querySelectorAll('.sticker-stamp-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Load base image
    const img = new Image();
    img.onload = () => {
        currentEditorBaseImg = img;
        
        // Create matching doodle canvas overlay
        doodleCanvasOverlay = document.createElement('canvas');
        doodleCanvasOverlay.width = img.width;
        doodleCanvasOverlay.height = img.height;

        window.renderGalleryEditCanvas();
    };
    img.src = snap.dataUrl;
};

window.renderGalleryEditCanvas = function() {
    const canvas = document.getElementById('gallery-edit-canvas');
    if (!canvas || !currentEditorBaseImg) return;

    const ctx = canvas.getContext('2d');
    const img = currentEditorBaseImg;

    // Set dimensions based on rotation
    const is90or270 = (currentEditorRotation % 180 !== 0);
    canvas.width = is90or270 ? img.height : img.width;
    canvas.height = is90or270 ? img.width : img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    // Filter presets
    let filterString = 'none';
    switch (currentEditorFilter) {
        case 'vintage': filterString = 'sepia(60%) hue-rotate(-20deg) contrast(120%)'; break;
        case 'neon': filterString = 'hue-rotate(180deg) saturate(220%) contrast(110%)'; break;
        case 'sepia': filterString = 'sepia(100%)'; break;
        case 'bw': filterString = 'grayscale(100%)'; break;
        case 'invert': filterString = 'invert(100%)'; break;
        case 'vivid': filterString = 'saturate(200%) contrast(120%)'; break;
        case 'hicon': filterString = 'contrast(180%) brightness(110%)'; break;
        case 'blur': filterString = 'blur(2px) saturate(140%)'; break;
        default: filterString = 'none'; break;
    }
    if (typeof ctx.filter !== 'undefined') {
        ctx.filter = filterString;
    }

    // Transform
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((currentEditorRotation * Math.PI) / 180);
    ctx.scale(currentEditorFlipH ? -1 : 1, currentEditorFlipV ? -1 : 1);

    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // Render Doodle & Sticker overlay on top
    if (doodleCanvasOverlay) {
        ctx.save();
        ctx.drawImage(doodleCanvasOverlay, 0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // Update download button link
    const downloadBtn = document.getElementById('btn-editor-download');
    if (downloadBtn) {
        downloadBtn.href = canvas.toDataURL('image/png');
        downloadBtn.download = `trashmaster_snapshot_${currentGalleryEditorIndex + 1}.png`;
    }
};

window.deleteCurrentSnapshot = function() {
    if (currentGalleryEditorIndex < 0) return;
    const snapshots = window.getGallerySnapshots();
    if (currentGalleryEditorIndex < snapshots.length) {
        snapshots.splice(currentGalleryEditorIndex, 1);
        window.saveGallerySnapshots(snapshots);
        currentGalleryEditorIndex = -1;
        window.renderGalleryModal();
    }
};

window.openReplaceSnapshotModal = function(newSnapshot) {
    const modal = document.getElementById('replace-snapshot-dialog');
    const grid = document.getElementById('replace-grid-container');
    if (!modal || !grid) return;

    grid.innerHTML = '';
    const snapshots = window.getGallerySnapshots();

    snapshots.forEach((snap, idx) => {
        const card = document.createElement('div');
        card.className = 'replace-card-choice';
        card.innerHTML = `
            <img src="${snap.dataUrl}" class="gallery-card-thumb" />
            <div class="gallery-card-date">#${idx + 1} - ${snap.timestamp}</div>
            <div style="font-size: 5px; color: #ff5555; margin-top: 4px;">CLICK TO OVERWRITE</div>
        `;
        card.addEventListener('click', () => {
            snapshots[idx] = newSnapshot;
            window.saveGallerySnapshots(snapshots);
            modal.classList.add('hidden');
            const btnSnapshot = document.getElementById('btn-defeat-snapshot');
            if (btnSnapshot) {
                btnSnapshot.innerText = 'REPLACED! 📸';
                btnSnapshot.style.background = '#008855';
                setTimeout(() => {
                    btnSnapshot.innerText = 'Snapshot 📸';
                    btnSnapshot.style.background = '#00aa66';
                }, 2000);
            }
        });
        grid.appendChild(card);
    });

    modal.classList.remove('hidden');
};

// Interactive Canvas Mouse & Touch setup for doodling and sticker stamping
function setupGalleryCanvasInteractions() {
    const canvas = document.getElementById('gallery-edit-canvas');
    if (!canvas) return;

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function onPointerDown(e) {
        if (!doodleCanvasOverlay) return;
        const coords = getCoords(e);

        if (selectedSticker) {
            // Stamp selected sticker on photo!
            const octx = doodleCanvasOverlay.getContext('2d');
            const fontSize = Math.round(doodleCanvasOverlay.height * 0.12);
            octx.font = `${fontSize}px serif`;
            octx.textAlign = 'center';
            octx.textBaseline = 'middle';
            octx.fillText(selectedSticker, coords.x, coords.y);
            window.renderGalleryEditCanvas();
            return;
        }

        if (doodleModeActive) {
            isDrawing = true;
            lastX = coords.x;
            lastY = coords.y;
        }
    }

    function onPointerMove(e) {
        if (!isDrawing || !doodleCanvasOverlay || !doodleModeActive) return;
        const coords = getCoords(e);
        const octx = doodleCanvasOverlay.getContext('2d');
        const color = document.getElementById('editor-doodle-color')?.value || '#00ffcc';
        const size = parseInt(document.getElementById('editor-brush-size')?.value || '4', 10);

        octx.strokeStyle = color;
        octx.lineWidth = size * (doodleCanvasOverlay.width / 500);
        octx.lineCap = 'round';
        octx.lineJoin = 'round';
        octx.beginPath();
        octx.moveTo(lastX, lastY);
        octx.lineTo(coords.x, coords.y);
        octx.stroke();

        lastX = coords.x;
        lastY = coords.y;
        window.renderGalleryEditCanvas();
    }

    function onPointerUp() {
        isDrawing = false;
    }

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);

    canvas.addEventListener('touchstart', (e) => { onPointerDown(e); e.preventDefault(); });
    canvas.addEventListener('touchmove', (e) => { onPointerMove(e); e.preventDefault(); });
    canvas.addEventListener('touchend', onPointerUp);
}

// Event listeners for gallery & editor dialogs
document.addEventListener('DOMContentLoaded', () => {
    const btnViewGallery = document.getElementById('btn-view-gallery');
    const btnGalleryClose = document.getElementById('btn-gallery-close');
    const btnReplaceCancel = document.getElementById('btn-replace-cancel');

    if (btnViewGallery) {
        btnViewGallery.addEventListener('click', () => {
            window.renderGalleryModal();
            document.getElementById('gallery-dialog')?.classList.remove('hidden');
        });
    }

    if (btnGalleryClose) {
        btnGalleryClose.addEventListener('click', () => {
            document.getElementById('gallery-dialog')?.classList.add('hidden');
        });
    }

    if (btnReplaceCancel) {
        btnReplaceCancel.addEventListener('click', () => {
            document.getElementById('replace-snapshot-dialog')?.classList.add('hidden');
        });
    }

    // Setup Gallery Editor Controls
    setupGalleryCanvasInteractions();

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentEditorFilter = btn.dataset.filter || 'normal';
            window.renderGalleryEditCanvas();
        });
    });

    // Rotation & Flip
    const btnRotL = document.getElementById('btn-editor-rotate-left');
    const btnRotR = document.getElementById('btn-editor-rotate-right');
    const btnFlipH = document.getElementById('btn-editor-flip-h');
    const btnFlipV = document.getElementById('btn-editor-flip-v');

    if (btnRotL) btnRotL.addEventListener('click', () => { currentEditorRotation = (currentEditorRotation + 270) % 360; window.renderGalleryEditCanvas(); });
    if (btnRotR) btnRotR.addEventListener('click', () => { currentEditorRotation = (currentEditorRotation + 90) % 360; window.renderGalleryEditCanvas(); });
    if (btnFlipH) btnFlipH.addEventListener('click', () => { currentEditorFlipH = !currentEditorFlipH; window.renderGalleryEditCanvas(); });
    if (btnFlipV) btnFlipV.addEventListener('click', () => { currentEditorFlipV = !currentEditorFlipV; window.renderGalleryEditCanvas(); });

    // Toggle Pen / Doodle mode
    const btnTogglePen = document.getElementById('btn-toggle-doodle');
    if (btnTogglePen) {
        btnTogglePen.addEventListener('click', () => {
            doodleModeActive = !doodleModeActive;
            selectedSticker = null; // deselect sticker if pen enabled
            document.querySelectorAll('.sticker-stamp-btn').forEach(b => b.classList.remove('selected'));
            btnTogglePen.classList.toggle('active', doodleModeActive);
            btnTogglePen.innerText = doodleModeActive ? 'Pen: ON ✏️' : 'Pen: OFF ✏️';
            const hint = document.getElementById('editor-hint-text');
            if (hint) hint.innerText = doodleModeActive ? '✏️ PEN ACTIVE: CLICK & DRAG ON CANVAS TO DRAW' : '💡 DRAG MOUSE TO DOODLE | CLICK STICKER EMOJI TO STAMP ON PHOTO';
        });
    }

    // Sticker Stamp selection
    document.querySelectorAll('.sticker-stamp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sticker = btn.dataset.sticker;
            if (selectedSticker === sticker) {
                selectedSticker = null;
                btn.classList.remove('selected');
            } else {
                selectedSticker = sticker;
                doodleModeActive = false; // deselect pen if sticker selected
                if (btnTogglePen) {
                    btnTogglePen.classList.remove('active');
                    btnTogglePen.innerText = 'Pen: OFF ✏️';
                }
                document.querySelectorAll('.sticker-stamp-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            }
            const hint = document.getElementById('editor-hint-text');
            if (hint) hint.innerText = selectedSticker ? `📌 STICKER "${selectedSticker}" SELECTED: CLICK ANYWHERE ON PHOTO TO STAMP!` : '💡 DRAG MOUSE TO DOODLE | CLICK STICKER EMOJI TO STAMP ON PHOTO';
        });
    });

    // Reset Edits
    const btnReset = document.getElementById('btn-editor-reset');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            currentEditorFilter = 'normal';
            currentEditorRotation = 0;
            currentEditorFlipH = false;
            currentEditorFlipV = false;
            doodleModeActive = false;
            selectedSticker = null;

            if (doodleCanvasOverlay) {
                const octx = doodleCanvasOverlay.getContext('2d');
                octx.clearRect(0, 0, doodleCanvasOverlay.width, doodleCanvasOverlay.height);
            }

            document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'normal'));
            document.querySelectorAll('.sticker-stamp-btn').forEach(b => b.classList.remove('selected'));
            if (btnTogglePen) {
                btnTogglePen.classList.remove('active');
                btnTogglePen.innerText = 'Pen: OFF ✏️';
            }
            window.renderGalleryEditCanvas();
        });
    }

    // Back to Gallery Grid
    const btnBack = document.getElementById('btn-editor-back');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.renderGalleryModal();
        });
    }

    // Delete Snapshot
    const btnEditorDelete = document.getElementById('btn-editor-delete');
    if (btnEditorDelete) {
        btnEditorDelete.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this snapshot from your gallery?')) {
                window.deleteCurrentSnapshot();
            }
        });
    }

    // Save Edits
    const btnEditorSave = document.getElementById('btn-editor-save');
    if (btnEditorSave) {
        btnEditorSave.addEventListener('click', () => {
            if (currentGalleryEditorIndex < 0) return;
            const canvas = document.getElementById('gallery-edit-canvas');
            const captionInput = document.getElementById('editor-caption-input');
            const snapshots = window.getGallerySnapshots();

            if (canvas && currentGalleryEditorIndex < snapshots.length) {
                const editedDataUrl = canvas.toDataURL('image/png');
                snapshots[currentGalleryEditorIndex].dataUrl = editedDataUrl;
                snapshots[currentGalleryEditorIndex].caption = captionInput ? captionInput.value.trim() : '';

                window.saveGallerySnapshots(snapshots);

                btnEditorSave.innerText = 'SAVED! 💾';
                btnEditorSave.style.background = '#00aa55';
                setTimeout(() => {
                    btnEditorSave.innerText = 'SAVE EDITS 💾';
                    btnEditorSave.style.background = '#0088ff';
                    window.renderGalleryModal();
                }, 800);
            }
        });
    }

    const endCapInput = document.getElementById('end-screen-caption-input');
    const endCapSize = document.getElementById('end-screen-caption-size');
    const endCapColor = document.getElementById('end-screen-caption-color');

    if (endCapInput) endCapInput.addEventListener('input', window.updateEndScreenCaptionPreview);
    if (endCapSize) endCapSize.addEventListener('change', window.updateEndScreenCaptionPreview);
    if (endCapColor) endCapColor.addEventListener('change', window.updateEndScreenCaptionPreview);
});

// Custom Maps API Frontend Helpers
window.fetchPublishedMaps = async function() {
    try {
        const res = await apiCall('/api/maps', 'GET');
        return res.maps || [];
    } catch (err) {
        console.warn('Failed to fetch published maps from backend:', err);
        return [];
    }
};

window.publishMapData = async function(title, description, restricted_mode, map_data) {
    return await apiCall('/api/maps/publish', 'POST', {
        title,
        description,
        restricted_mode,
        map_data
    });
};

window.fetchMapById = async function(mapId) {
    const res = await apiCall(`/api/maps/${mapId}`, 'GET');
    return res.map;
};

window.recordMapPlay = async function(mapId) {
    try {
        const res = await apiCall(`/api/maps/${mapId}/play`, 'POST');
        return res.map;
    } catch (err) {
        console.warn('Failed to record map play:', err);
        return null;
    }
};

window.unpublishMap = async function(mapId) {
    return await apiCall(`/api/maps/${mapId}/unpublish`, 'POST');
};

// Profile & Leaderboard API Helpers
window.fetchStickers = async function() {
    try {
        const res = await apiCall('/api/stickers', 'GET');
        return res.stickers || [];
    } catch (err) {
        console.warn('Failed to fetch stickers from backend:', err);
        return [];
    }
};

window.fetchUserProfile = async function(username = null) {
    try {
        const endpoint = username ? `/api/user/profile/${encodeURIComponent(username)}` : '/api/user/profile';
        const res = await apiCall(endpoint, 'GET');
        if (res && res.profile) return res.profile;
    } catch (err) {
        console.warn('Backend user profile fetch failed, using local profile fallback:', err);
    }

    const currentName = username || window.currentUsername || localStorage.getItem('trashMasterUsername') || 'Player';
    const isOwner = (!username || username === window.currentUsername || username === localStorage.getItem('trashMasterUsername'));
    const avatar = (isOwner ? (window.currentUserAvatar || localStorage.getItem('trashMasterAvatar')) : null) || 'ducky_sticker.png';
    const bio = (isOwner ? (window.currentUserBio || 'Ready to clean up the city!') : 'Ready to clean up the city!');

    return {
        id: 1,
        username: currentName,
        role: localStorage.getItem('trashMasterRole') || 'player',
        avatar_sticker: avatar,
        avatar_path: `assets/stickers/${avatar}`,
        chosen_sprite: window.chosenSprite || 'char2',
        bio: bio,
        title: 'City Scavenger',
        created_at: '2026-01-01',
        is_owner: isOwner,
        balance: window.playerBalance || 0,
        has_truck: !!window.playerHasTruck,
        movement_size: window.playerMovementSize || 0,
        international_followers: window.internationalFollowers || 0,
        made_man_status: window.madeManStatus || 'none',
        political_office: window.politicalOffice || 'citizen',
        completed_mafia_jobs: window.completedMafiaJobs || 0,
        stats: {
            stat_cumulative_trash: (window.playerStats && window.playerStats.stat_cumulative_trash) || 0,
            stat_max_single_trash: (window.playerStats && window.playerStats.stat_max_single_trash) || 0,
            stat_cumulative_money: (window.playerStats && window.playerStats.stat_cumulative_money) || 0,
            stat_max_single_money: (window.playerStats && window.playerStats.stat_max_single_money) || 0,
            stat_max_single_followers: (window.playerStats && window.playerStats.stat_max_single_followers) || 0,
            total_rounds_played: (window.playerStats && window.playerStats.total_rounds_played) || 0
        },
        inventory: window.playerInventory || {},
        buildings: window._serverOwnedBuildings || [],
        completed_words_count: 0,
        published_maps: [],
        trophies: window.profileManager ? window.profileManager.calculateTrophies() : [],
        trophy_stats: {
            unlocked: window.profileManager ? window.profileManager.calculateTrophies().filter(t => t.unlocked).length : 0,
            total: 14,
            percentage: window.profileManager ? Math.round((window.profileManager.calculateTrophies().filter(t => t.unlocked).length / 14) * 100) : 0
        }
    };
};

window.updateUserProfile = async function(profileData) {
    if (profileData.avatar_sticker) {
        window.currentUserAvatar = profileData.avatar_sticker;
        localStorage.setItem('trashMasterAvatar', profileData.avatar_sticker);
    }
    if (profileData.bio !== undefined) {
        window.currentUserBio = profileData.bio;
        localStorage.setItem('trashMasterBio', profileData.bio);
    }
    if (window.profileManager && typeof window.profileManager.updateMiniProfile === 'function') {
        window.profileManager.updateMiniProfile({
            username: window.currentUsername || localStorage.getItem('trashMasterUsername'),
            avatar_sticker: window.currentUserAvatar,
            bio: window.currentUserBio
        });
    }

    try {
        const res = await apiCall('/api/user/profile', 'POST', profileData);
        if (res && res.user) {
            window.currentUserAvatar = res.user.avatar_sticker || window.currentUserAvatar;
            window.currentUserBio = res.user.bio || window.currentUserBio;
            localStorage.setItem('trashMasterAvatar', window.currentUserAvatar);
        }
        return res || { success: true };
    } catch (err) {
        console.warn('Backend user profile update warning (saved locally):', err);
        return { success: true, localOnly: true };
    }
};

window.fetchLeaderboard = async function(category = 'trash') {
    try {
        const res = await apiCall(`/api/leaderboard?category=${encodeURIComponent(category)}`, 'GET');
        return res;
    } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        return { success: false, leaderboard: [] };
    }
};


