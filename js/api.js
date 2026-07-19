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
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'API Error');
        return data;
    } catch (e) {
        throw e;
    }
}


// ── UI Management ──
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.remove('hidden');
    
    if (screenId === 'game-layer') {
        document.getElementById('ui-layer').classList.add('hidden');
        document.getElementById('gameCanvas').classList.remove('hidden');
    } else {
        document.getElementById('ui-layer').classList.remove('hidden');
        document.getElementById('gameCanvas').classList.add('hidden');
    }
}

function showChaosConfigDialog() {
    const dialog = document.getElementById('chaos-dialog');
    if (dialog) {
        dialog.classList.remove('hidden');
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
                localStorage.setItem('trashMasterToken', authToken);
                localStorage.setItem('trashMasterRole', userRole);
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
        localStorage.removeItem('trashMasterToken');
        localStorage.removeItem('trashMasterRole');
        showScreen('login-screen');
    };

    if (btnAdminLogout) btnAdminLogout.addEventListener('click', logout);
    if (btnStoreLogout) btnStoreLogout.addEventListener('click', logout);

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
                        if (cmdLower === 'dragon ho!') {
                            window.dragonHoCheat = true;
                            terminalHistory.innerHTML += `\n<span style="color: #ffff00;">Dragon Ho! Activated!</span>`;
                        } else if (cmdLower === 'chaos' || cmdLower === 'chaos mode' || cmdLower === 'chaos ho!') {
                            window.chaosCheatActive = true;
                            updateModeToggles();
                            terminalHistory.innerHTML += `\n<span style="color: #ff0055; text-shadow: 0 0 3px #ff0055;">Chaos Mode Unlocked for this round! Check the toggle.</span>`;
                        } else {
                            terminalHistory.innerHTML += `\n<span style="color: #ff0055;">Unknown command.</span>`;
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

        let controlsHtml = "";
        if (slide.controls && slide.controls.length > 0) {
            controlsHtml = `
                <ul style="text-align: left; font-size: 8px; color: #00ffcc; line-height: 1.8; margin-top: 15px; padding-left: 15px; list-style-type: square; width: 100%; box-sizing: border-box;">
                    ${slide.controls.map(ctrl => `<li style="margin-bottom: 8px;">${ctrl}</li>`).join('')}
                </ul>
            `;
        }

        container.innerHTML = `
            <h2 style="color: #ffaa00; font-size: 10px; margin-bottom: 15px; text-shadow: 2px 2px #000; letter-spacing: 1px;">${slide.title}</h2>
            <p style="color: #ddd; font-size: 8px; line-height: 1.6; margin-bottom: 15px; text-align: justify; word-break: break-word;">${slide.desc}</p>
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
    };

    const showInstructionsDialog = () => {
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
            title: "WELCOME TO FILTHADELPHIA!",
            desc: "Use the arrow keys to move. (WASD does not work)",
            controls: [
                "When you're on your own, use Q to pick up trash.",
                "When you've got followers, they'll pick up the trash, you lead!",
                "If playing with a trash truck, find the brown tile on the minimap, this is the dump. Your truck is fast, but it fills up fast, press 'e' at the entrance to empty your load."
            ]
        });

        if (window.fantasyMode) {
            activeSlides.push({
                title: "FANTASY MODE",
                desc: "Welcome to a world of wonder! Posse members have a chance to be Dragon Masters, who can transform into giant Flying Dragons!",
                controls: [
                    "Incineration: Dragons incinerate trash using fire, earning money directly without clogging your inventory!",
                    "Organizers: Dragons act as massive flying organizers that posse members will follow."
                ]
            });
        }

        // Mode explanations
        if (window.frenzyMode) {
            activeSlides.push({
                title: "FRENZY MODE",
                desc: "The city has gone into a cleaning frenzy! Trash generates at a double rate, and Informants are scattered around the streets.",
                controls: [
                    "Informants: Speak with them to receive random bonus rewards!"
                ]
            });
        }

        if (window.crimeMode) {
            activeSlides.push({
                title: "CRIME MODE",
                desc: "You agreed to work with the mafia. Run mafia tasks from the store for massive payouts, but watch out for the law!",
                controls: [
                    "Police Patrols: 4 fast-moving police officers spawn at all corners of the map and actively hunt you down!",
                    "Arrests: Slashes posse size by 75%, slashes 1 truck, and levies a scaling fine of $50,000 + $50,000 per subsequent arrest."
                ]
            });
        }

        if (window.fastFoodMode) {
            activeSlides.push({
                title: "FAST FOOD MODE",
                desc: "At the door of a fast food restaurant press 'e' to get munchies for your muchachos. When you feed your crew, they'll do more for you!",
                controls: [
                    "Greasy food will fill you up, but it can also bring you down.",
                    "Find the hospital and get healthcare for your posse or your next meal might be their last."
                ]
            });
        }

        if (window.politicsMode) {
            activeSlides.push({
                title: "POLITICS MODE",
                desc: "Campaign to win political office! Nominate yourself in the store, then shake hands with NPCs around the city.",
                controls: [
                    "Votes: Shake hands with NPCs around the city to win their votes.",
                    "Rival Candidate: A rival candidate is going around shaking hands; shake more than them to win the round!",
                    "Mafia Votes Bribe: Accepting delivers votes, but police are instantly dispatched after you!"
                ]
            });
        }

        if (window.flowersMode) {
            activeSlides.push({
                title: "FLOWERS MODE",
                desc: "Beautify Filthadelphia's local parks by planting flowers!",
                controls: [
                    "Key F: Plant flowers while standing in park zones.",
                    "Fertilizer: Purchase from the store to plant flowers. Fully planted parks reward big money payouts!"
                ]
            });
        }

        if (window.cultMode) {
            activeSlides.push({
                title: "THE CHURCH OF GRIMETOLOGY",
                desc: "The Church of Grimetology is a charismatic-led cult dedicated to cleaning up trash. As its leader, you believe that raising $1,000,000 will summon a dragon (Burninator) to do your bidding. The path of Grimetology demands many sacrifices...",
                controls: [
                    "Reunite Families: Interacting with separated members rolls 75% join / 25% leave chance.",
                    "Happiness Bar: Keep followers happy. Proximity, reunions, and food boost happiness. If it hits 0, half of your posse leaves!",
                    "Follower Multiplier: Clean round yields a 1.5x multiplier on followers gained!",
                    "Summon the Dragon: Once cult mode is unlocked, 'Burninator' (the dragon) is added to the store for $1,000,000. It requires a 5-follower sacrifice every round."
                ]
            });
        }

        if (window.builderMode) {
            activeSlides.push({
                title: "BUILDER MODE",
                desc: "Invest your hard-earned cash in real estate! Purchase buildings on the map, recruit tenants, and collect rent.",
                controls: [
                    "Buy Buildings: Stand near a building door and press E to purchase it. Ownership persists across rounds!",
                    "Rent & Revenue: Stand near a street NPC and press A to offer them an apartment (50% chance). Earn $1,000 per tenant per round!",
                    "Taxes: A property tax of $750 per building is assessed every 4 rounds. Don't go bankrupt, or your properties will be seized!"
                ]
            });
        }

        // Keys & Items Summary
        activeSlides.push({
            title: "KEYS & KEYBINDINGS",
            desc: "Press 'E' for Everything! Q to pick up trash.",
            controls: [
                "E: Interact with anything (Dump, Fast Food joints, Hospital, NPCs, Cars, Mafia Don)",
                "Q: Pick up trash (when alone on foot)",
                "F: Plant Flower (Flowers Mode)",
                "A: Offer apartment to street NPC (Builder Mode)",
                "T: Use Borrowed Time (+20s to timer)",
                "M: Use Mushrooms (Slow timer for 20s)",
                "W: Use Wings (1.5x speed boost for 15s)",
                "P: Use Protection (+5% posse win chance for 30s)",
                "R: Use Parade Route (3x trash near route)"
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
            document.getElementById('trophy-dialog').classList.remove('hidden');
        });
    }
    if (btnTrophyClose) {
        btnTrophyClose.addEventListener('click', () => {
            document.getElementById('trophy-dialog').classList.add('hidden');
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
        if (confirm(`Fly to ${destination} for $${totalCost}?`)) {
            apiCall('/api/game/travel', 'POST', { destination: destination, cost: totalCost })
                .then(data => {
                    window.playerBalance = data.balance;
                    const isFilth = destination.toLowerCase() === 'filthadelphia';
                    
                    if (window.game) {
                        if (!isFilth) {
                            if (!window.travelDestination) {
                                window.game.savedPhillyFollowers = [...window.game.followerManager.followers];
                                window.game.followerManager.followers = [];
                                if (window.game.organizers) {
                                    window.game.savedOrganizerFollowers = window.game.organizers.map(org => [...org.followerManager.followers]);
                                    window.game.organizers.forEach(org => org.followerManager.followers = []);
                                }
                            } else {
                                window.game.followerManager.followers = [];
                                if (window.game.organizers) {
                                    window.game.organizers.forEach(org => org.followerManager.followers = []);
                                }
                            }
                        } else {
                            window.game.followerManager.followers = window.game.savedPhillyFollowers || [];
                            window.game.savedPhillyFollowers = null;
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
                    
                    // Create a completely new map instance for the destination
                    // The GameMap constructor checks window.travelDestination and
                    // returns a DahgbadMap, CucarachaMap, or default Philly map.
                    if (window.game) {
                        window.game.gameMap = new GameMap();
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
                            alert(`Welcome to ${destination}! Garbage Truck is disabled.`);
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
        btnTravelDahgbad.addEventListener('click', () => handleTravel('Dahgbad', 1000));
    }
    if (btnTravelCucaracha) {
        btnTravelCucaracha.addEventListener('click', () => handleTravel('Cucaracha', 500));
    }
    if (btnTravelCancel) {
        btnTravelCancel.addEventListener('click', () => {
            document.getElementById('airport-dialog').classList.add('hidden');
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
        window.playerStats = playerStats;
        playerCredits = data.credits !== undefined ? data.credits : 3;
        window.playerCredits = playerCredits;
        internationalFollowers = data.international_followers || 0;
        window.internationalFollowers = internationalFollowers;
        window.playerUnlockedInternational = data.unlocked_international || 0;
        window.electionState = data.election_state || 'idle';
        window.roundsInState = data.rounds_in_state || 0;
        window.travelDestination = data.travel_destination && data.travel_destination.toLowerCase() !== 'filthadelphia' ? data.travel_destination : null;
        
        window.playerUnlockedCult = data.unlocked_cult || 0;
        window.playerUnlockedBuilder = data.unlocked_builder || 0;
        window.playerUnlockedFantasy = data.unlocked_fantasy || 0;
        window.playerHappiness = data.happiness !== undefined ? data.happiness : 100.0;
        window.cultLeavesCumulative = data.cult_leaves_cumulative || 0;
        window.wordGameState = data.word_game_state || {
            collected_letters: {},
            completed_words: [],
            word_slots_state: {}
        };
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
    { name: 'Borrowed Time', price: 2000, desc: '+20s to timer (Key T)', sprite: 'borrowed_time.png' },
    { name: 'Mushrooms', price: 2500, desc: 'Slow timer for 20s (Key M)', sprite: 'mushrooms.png' },
    { name: 'Wings', price: 1500, desc: '1.5x speed for 15s (Key W)', sprite: 'wings.png' },
    { name: 'Protection', price: 1000, desc: '+5% posse win chance for 30s (Key P)', sprite: 'protection.png' },
    { name: 'Magic 8-Ball', price: 1500, desc: 'Score multiplied randomly at end of round', sprite: 'magic_8_ball.png' },
    { name: 'Bruno The Trash Truck', price: 10000, desc: '+2 perm posse, $1000 upkeep', sprite: 'trash_truck.png' },
    { name: 'Fertilizer', price: 100, desc: 'Plant flowers in parks (Flowers Mode)', sprite: 'fertilizer.png' },
    { name: 'Organizer', price: 250, desc: 'Splits followers to collect trash simultaneously across the map. Costs $250/round.', sprite: 'employee.png' },
    { name: 'Parade', price: 3000, desc: '3x trash near parade route (Key R)', sprite: 'parade.png' },
    { name: 'Quinine', price: 750, desc: 'Auto-consumed when you become sick. Instantly cures sick status.', sprite: 'mushrooms.png' },
    { name: 'Trashpickers', price: 1000, desc: 'Doubles trash pickup for 1 round. Equips each new recruit for $20.', sprite: 'employee.png' },
    { name: 'Price Fixing', price: 2000, desc: 'Trash worth 1.25x value, but 4 police chase you! Press B to bribe.', sprite: 'protection.png' },
    { name: 'Burninator', price: 1000000, desc: 'Summon the dragon! Requires 5 followers sacrificed every round. Boosts trash value as if 5 followers joined.', sprite: 'dragon.png' }
];

function updateStoreUI() {
    const balEl = document.getElementById('store-balance');
    if (balEl) balEl.innerText = `$${playerBalance.toLocaleString()}`;

    const movEl = document.getElementById('store-movement-size');
    if (movEl) movEl.innerText = playerMovementSize.toLocaleString();

    const invEl = document.getElementById('store-inventory');
    if (invEl) {
        invEl.innerHTML = '<h3>Inventory:</h3>';
        if (playerHasTruck > 0) invEl.innerHTML += `<div>Bruno The Trash Truck (x${playerHasTruck})</div>`;
        for (const [item, count] of Object.entries(playerInventory)) {
            if (count > 0) invEl.innerHTML += `<div>${item} (x${count})</div>`;
        }
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
            const nextTruckNum = (playerHasTruck || 0) + 1;
            const reqs = {1: 0, 2: 27, 3: 81, 4: 343};
            if (nextTruckNum > 4) {
                btnDisabled = 'disabled style="background: #333; color: #888; border: 2px solid #222; cursor: not-allowed;"';
                btnText = 'Max Limit';
                descOverride = 'Max 4 trash trucks reached.';
            } else {
                const reqFollowers = reqs[nextTruckNum];
                descOverride = `Truck #${nextTruckNum} needs ${reqFollowers} followers.`;
                if (playerMovementSize < reqFollowers) {
                    btnDisabled = 'disabled style="background: #333; color: #888; border: 2px solid #222; cursor: not-allowed;"';
                    btnText = 'Locked';
                }
            }
        }

        const limitedItems = ['Mushrooms', 'Borrowed Time', 'Wings', 'Protection'];
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
    const frenzyContainer = document.getElementById('frenzy-toggle-container');
    const crimeContainer = document.getElementById('crime-toggle-container');
    const fastfoodContainer = document.getElementById('fastfood-toggle-container');

    // 1. Frenzy Mode
    if (frenzyContainer) {
        const frenzyToggle = document.getElementById('frenzy-toggle');
        const label = frenzyContainer.querySelector('.toggle-label');
        if (playerMovementSize < 10) {
            frenzyToggle.disabled = true;
            frenzyToggle.checked = false;
            label.innerText = `Frenzy (Locked: 10 Followers)`;
            label.style.color = '#888';
        } else {
            frenzyToggle.disabled = false;
            label.innerText = `Frenzy Mode`;
            label.style.color = '#fff';
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
        thresholds: [10, 30, 100, 300, 1000],
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

            const tooltip = document.createElement('div');
            tooltip.className = 'trophy-tooltip';
            
            if (unlocked) {
                tooltip.innerHTML = `
                    <div style="color: #ffaa00; font-weight: bold; font-size: 8px; margin-bottom: 4px;">${name.toUpperCase()}</div>
                    <div style="color: #00ff88; font-weight: bold;">UNLOCKED!</div>
                `;
            } else if (index === nextIndex) {
                tooltip.innerHTML = `
                    <div style="color: #ffaa00; font-weight: bold; font-size: 8px; margin-bottom: 4px;">${name.toUpperCase()}</div>
                    <div>LEVEL: ${levelsList[index]}</div>
                    <div>REQ: ${cat.badge} ${threshold.toLocaleString()}</div>
                    <div>YOURS: ${currentVal.toLocaleString()}</div>
                    <div style="margin-top: 4px; color: #ff3333; font-weight: bold;">LOCKED (NEXT TARGET)</div>
                `;
            } else {
                tooltip.innerHTML = `
                    <div style="color: #888; font-weight: bold; font-size: 8px; margin-bottom: 4px;">???</div>
                    <div style="color: #ff3333; font-weight: bold;">LOCKED</div>
                `;
            }
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
    ctx.fillRect(4 * scale, 13 * scale, 8 * scale, 2 * scale);
    ctx.fillRect(7 * scale, 9 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(3 * scale, 2 * scale, 10 * scale, 7 * scale);
    ctx.fillRect(1 * scale, 3 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(13 * scale, 3 * scale, 2 * scale, 4 * scale);
    
    ctx.fillStyle = metalColor;
    ctx.fillRect(5 * scale, 13 * scale, 6 * scale, 1 * scale);
    ctx.fillRect(7.5 * scale, 9 * scale, 1 * scale, 4 * scale);
    ctx.fillRect(4 * scale, 3 * scale, 8 * scale, 5 * scale);
    
    ctx.fillStyle = lightColor;
    ctx.fillRect(5 * scale, 3 * scale, 1 * scale, 4 * scale);
    ctx.fillRect(8 * scale, 13 * scale, 1 * scale, 1 * scale);
    
    ctx.fillStyle = '#0c0804';
    ctx.fillRect(2 * scale, 4 * scale, 1 * scale, 2 * scale);
    ctx.fillRect(13 * scale, 4 * scale, 1 * scale, 2 * scale);
    
    ctx.fillStyle = categoryColor;
    ctx.fillRect(7 * scale, 5 * scale, 2 * scale, 2 * scale);
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
function drawStatsGraph(category) {
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

    if (!statsHistory || statsHistory.length === 0) {
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText('NO ROUNDS PLAYED YET', w / 2, h / 2);
        return;
    }

    let keyRound, keyCum, titleRound, titleCum, colorRound, colorCum;
    if (category === 'trash') {
        keyRound = 'trash_collected';
        keyCum = 'cumulative_trash';
        titleRound = 'Round Trash';
        titleCum = 'Total Trash';
        colorRound = '#4caf50'; // Green
        colorCum = '#00ffcc'; // Cyan
    } else if (category === 'money') {
        keyRound = 'money_earned';
        keyCum = 'cumulative_money';
        titleRound = 'Round Revenue';
        titleCum = 'Total Earnings';
        colorRound = '#ffeb3b'; // Yellow
        colorCum = '#ffaa00'; // Orange
    } else if (category === 'bank') {
        keyRound = 'bank_balance';
        keyCum = 'bank_balance';
        titleRound = 'Round End Cash';
        titleCum = 'Bank Account';
        colorRound = '#00ff44'; // Lime green
        colorCum = '#00ffff'; // Cyan
    } else {
        keyRound = 'followers_gained';
        keyCum = 'cumulative_followers';
        titleRound = 'Round Followers';
        titleCum = 'Total Followers';
        colorRound = '#2196f3'; // Blue
        colorCum = '#ffffff'; // White
    }

    let maxRound = 0;
    let maxCum = 0;
    statsHistory.forEach(r => {
        if (r[keyRound] > maxRound) maxRound = r[keyRound];
        if (r[keyCum] > maxCum) maxCum = r[keyCum];
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
        const val = r[keyRound];
        const barH = (val / maxRound) * chartH;
        const x = padLeft + idx * colW + (colW - barW) / 2;
        const y = padTop + chartH - barH;

        ctx.fillStyle = colorRound;
        ctx.fillRect(x, y, barW, barH);

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
        const val = r[keyCum];
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
    ctx.fillStyle = '#050805'; 
    statsHistory.forEach((r, idx) => {
        const val = r[keyCum];
        const pointX = padLeft + idx * colW + colW / 2;
        const pointY = padTop + chartH - (val / maxCum) * chartH;
        
        ctx.beginPath();
        ctx.arc(pointX, pointY, 4, 0, Math.PI * 2);
        ctx.strokeStyle = colorCum;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
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
    } else if (category === 'bank') {
        keyRound = 'bank_balance';
        labelRound = 'End Balance';
        labelCum = 'Current Cash';
        suffix = '';
    } else {
        keyRound = 'followers_gained';
        labelRound = 'Round Followers';
        labelCum = 'Total Followers';
    }

    let totalRoundVal = 0;
    let maxRoundVal = 0;
    statsHistory.forEach(r => {
        totalRoundVal += r[keyRound];
        if (r[keyRound] > maxRoundVal) maxRoundVal = r[keyRound];
    });
    const avgRoundVal = totalRoundVal / n;

    const finalCum = statsHistory[n - 1][category === 'trash' ? 'cumulative_trash' : (category === 'money' ? 'cumulative_money' : (category === 'bank' ? 'bank_balance' : 'cumulative_followers'))];

    const format = (v) => (category === 'money' || category === 'bank') ? `$${Math.round(v).toLocaleString()}` : `${Math.round(v).toLocaleString()}${suffix}`;

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
