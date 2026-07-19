// ============================================================
// main.js — Game loop, state machine, boot
// ============================================================

const GameState = {
    LOADING: 'loading',
    CHARACTER_SELECT: 'character_select',
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    UI_OVERLAY: 'ui_overlay', // when looking at store
};

// Phase 1 Global State
if (typeof window.internationalFollowers === 'undefined') {
    window.internationalFollowers = 0;
}

class GarbageTruckFollower {
    constructor(x, y, index) {
        this.x = x;
        this.y = y;
        this.index = index;
        this.size = TILE_SIZE; // 64
        this.direction = 'down';
        this.moving = false;
        this.followDelay = 24; // delay behind leader
        this.positionHistory = [];
        this.historyMaxLength = 2000;
    }
    
    update(leaderHistory, gameMap) {
        if (!leaderHistory || leaderHistory.length === 0) return;
        
        const delayIndex = leaderHistory.length - 1 - this.followDelay;
        if (delayIndex >= 0 && delayIndex < leaderHistory.length) {
            const target = leaderHistory[delayIndex];
            const prevX = this.x;
            const prevY = this.y;
            
            // Check if target is inside a building
            const targetTX = Math.floor(target.x / TILE_SIZE);
            const targetTY = Math.floor(target.y / TILE_SIZE);
            if (gameMap.getBuildingAtTile(targetTX, targetTY)) {
                this.moving = false;
            } else {
                this.x = target.x;
                this.y = target.y;
                const dx = this.x - prevX;
                const dy = this.y - prevY;
                this.moving = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;
                if (this.moving) {
                    if (Math.abs(dx) > Math.abs(dy)) {
                        this.direction = dx > 0 ? 'right' : 'left';
                    } else {
                        this.direction = dy > 0 ? 'down' : 'up';
                    }
                }
            }
        }
        
        if (this.moving) {
            this.positionHistory.push({ x: this.x, y: this.y });
            if (this.positionHistory.length > this.historyMaxLength) {
                this.positionHistory.shift();
            }
        }
    }
    
    render(ctx, camera, spriteManager) {
        if (!camera.isVisible(this.x - 50, this.y - 50, 100, 100)) return;
        const screen = camera.worldToScreen(this.x, this.y);
        const img = spriteManager.getCharacterImage('char_truck'); // original green truck
        if (img) {
            ctx.save();
            const scaledSize = 64;
            if (this.direction === 'left') {
                ctx.translate(screen.x, screen.y);
                ctx.scale(-1, 1);
                ctx.drawImage(img, -scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize);
            } else {
                ctx.drawImage(img, screen.x - scaledSize / 2, screen.y - scaledSize / 2, scaledSize, scaledSize);
            }
            ctx.restore();
        }
    }
}

class Game {
    get rivalCandidate() {
        if (this.rivalCandidates && this.rivalCandidates.length > 0) {
            return this.rivalCandidates.reduce((max, r) => r.votes > max.votes ? r : max, this.rivalCandidates[0]);
        }
        return null;
    }
    set rivalCandidate(val) {
        // Do nothing/allow setter to prevent errors
    }

    resetKeys() {
        if (this.player && this.player.keys) {
            this.player.keys.up = false;
            this.player.keys.down = false;
            this.player.keys.left = false;
            this.player.keys.right = false;
            this.player.keys.k = false;
            this.player.moving = false;
        }
    }

    constructor(canvas) {
        if (window.gameLog) window.gameLog("Game class instantiation starting");
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.state = GameState.LOADING;

        // Core systems
        this.spriteManager = new SpriteManager();
        this.gameMap = new GameMap();
        this.camera = new Camera(canvas.width, canvas.height);
        this.miniMap = new MiniMap();
        this.hud = new HUD();
        this.trashManager = new TrashManager();
        this.followerManager = new FollowerManager();
        this.carManager = new CarManager();
        this.crimeManager = new CrimeManager();
        this.player = null;

        // Word Game State
        this.wordList = [
            'GARBAGE', 'PLASTIC', 'RECYCLE', 'COMPOST', 'LANDFILL',
            'POLLUTION', 'LITTER', 'DEBRIS', 'REFUSE', 'WASTE'
        ];
        this.loadWordGameState();
        this.letterSpawnPool = [
            'A','A','A','A','A',
            'B','B',
            'C','C','C','C',
            'D','D',
            'E','E','E','E','E','E','E','E',
            'F','F',
            'G','G',
            'I','I','I','I','I',
            'L','L','L','L','L','L','L','L',
            'M',
            'N','N',
            'O','O','O','O',
            'P','P','P',
            'R','R','R','R','R',
            'S','S','S','S','S',
            'T','T','T','T','T','T',
            'U','U',
            'W',
            'Y'
        ];

        // Timing
        this.lastTime = 0;

        // Character select state
        this.selectedCharIndex = -1;
        this.hoverCharIndex = -1;

        // Input
        this.mouseX = 0;
        this.mouseY = 0;

        // Follower milestone tracking
        this.lastFollowerMilestone = 0;

        // Near-trash flag for HUD prompt
        this.playerNearTrash = false;

        // Debug info
        this.debugKeys = '';
        this.errorLog = [];

        this._bindEvents();
        this._resizeCanvas();

        // Start loading
        this._load();
    }

    async _load() {
        this.state = GameState.LOADING;
        if (window.gameLog) window.gameLog("Game._load() starting spriteManager.loadAll()");
        try {
            await this.spriteManager.loadAll();
            if (window.gameLog) window.gameLog("Game._load() sprite loading finished successfully");
        } catch (e) {
            console.error('Sprite loading failed:', e);
            if (window.gameLog) window.gameLog("Game._load() sprite loading threw error: " + e.message);
        }
        this.miniMap.buildStatic(this.gameMap);
        this.state = GameState.CHARACTER_SELECT;
        if (window.gameLog) window.gameLog("Game._load() state set to CHARACTER_SELECT, starting animation loop");
        this._startLoop();
    }

    _bindEvents() {
        window.addEventListener('resize', () => this._resizeCanvas());

        // Use both document and window for maximum compatibility
        const keyHandler = (e) => {
            if (this.state === GameState.PLAYING && this.player) {
                this.player.handleKeyDown(e);

                // Q or q key to pick up trash
                if (e.key === 'q' || e.key === 'Q') {
                    this.pickupTrash();
                }

                // E or e key to interact with NPC or green cars, Dons or Chief
                if (e.key === 'e' || e.key === 'E') {
                    // Crime Mode checks
                    if (window.crimeMode && this.crimeManager) {
                        const px = ((this.player.x % MAP_PIXEL_W) + MAP_PIXEL_W) % MAP_PIXEL_W;
                        const py = ((this.player.y % MAP_PIXEL_H) + MAP_PIXEL_H) % MAP_PIXEL_H;
                        let nearDon = null;
                        for (const don of this.crimeManager.dons) {
                            const wrappedDon = typeof nearestWrap === 'function' ? nearestWrap(don.x, don.y, this.player.x, this.player.y) : {x: don.x, y: don.y};
                            const dist = Math.sqrt((this.player.x - wrappedDon.x)**2 + (this.player.y - wrappedDon.y)**2);
                            if (dist < TILE_SIZE * 1.5) {
                                nearDon = don;
                                break;
                            }
                        }
                        if (nearDon) {
                            if (!this.crimeManager.madeMan) {
                                this.crimeManager.triggerMadeManOffer(nearDon.id);
                            } else if (!this.crimeManager.activeTask && (this.crimeManager.activeFamily === nearDon.id || this.crimeManager.activeFamily === -1)) {
                                if (this.crimeManager.activeFamily === -1) {
                                    this.crimeManager.activeFamily = nearDon.id;
                                }
                                this.crimeManager.assignNextTask(this.gameMap);
                            } else if (this.crimeManager.activeTask && this.crimeManager.activeTask.type === 'talk_don' && nearDon.id === this.crimeManager.activeTask.targetDonId) {
                                this.crimeManager.completeTask(this);
                            } else if (this.crimeManager.activeTask && this.crimeManager.activeTask.type === 'illegal_dump' && this.crimeManager.activeFamily === nearDon.id) {
                                if (!this.crimeManager.activeTask.dumped) {
                                    alert("Don: 'What are you doing back? Get out there and dump the trash in the highlighted park!'");
                                } else {
                                    this.crimeManager.completeTask(this);
                                }
                            }
                            return;
                        }

                        // Check Police Chief bribe
                        if (this.crimeManager.madeMan && this.crimeManager.policeChief) {
                            const chiefDist = Math.sqrt((px - this.crimeManager.policeChief.x)**2 + (py - this.crimeManager.policeChief.y)**2);
                            if (chiefDist < TILE_SIZE * 1.5) {
                                this.crimeManager.triggerBribeChief();
                                return;
                            }
                        }
                    }

                    if (window.frenzyMode || window.flowersMode || window.crimeMode || window.cultMode || window.builderMode) {
                        const result = this.npcManager.interactWithNearest(this.player.x, this.player.y);
                        if (result) {
                            if (window.crimeMode && this.crimeManager && !this.crimeManager.madeMan) {
                                this.crimeManager.triggerMadeManOffer(Math.floor(Math.random() * 2));
                            }
                            if (window.frenzyMode && result.isInformant) {
                                // Open door!
                                this.gameMap.openBuildingDoor(result.buildingId);
                                // Spawn pirates!
                                const bldg = this.gameMap.buildings.find(b => b.id === result.buildingId);
                                if (bldg && bldg.doorTiles.length > 0) {
                                    const door = bldg.doorTiles[0];
                                    this.pirateManager.spawnPirates(door.x, door.y);
                                }
                            }
                            if (window.flowersMode && result.npcType === 'flower') {
                                window.targetParkId = result.targetParkId;
                                this.hud.showFollowerNotification(`Target Park Set to ${result.targetParkId}!`, true);
                            }
                            return; // Stop processing 'E' if interacted with an NPC
                        }
                    }

                    // Green car interaction check
                    if (this.carManager && this.carManager.cars) {
                        for (const car of this.carManager.cars) {
                            if (car.active && car.color === 'green') {
                                const dx = this.player.x - car.x;
                                const dy = this.player.y - car.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist < TILE_SIZE * 1.2) {
                                    car.active = false;
                                    const newFollower = this.followerManager.addFollower(this.player.x, this.player.y);
                                    const charConfig = SPRITE_CONFIG.characters.find(c => c.id === newFollower.spriteId);
                                    this.hud.showFollowerNotification(charConfig ? `${charConfig.name} joined your posse!` : 'New posse member joined your posse!', true);
                                    return; // Stop processing 'E' if recruited from a car
                                }
                            }
                        }
                    }


                    // Fast Food, Hospital, & Airport interaction
                    if (window.fastFoodMode || window.playerUnlockedInternational || window.cultMode) {
                        const px = wrapWorldX(this.player.x);
                        const py = wrapWorldY(this.player.y);
                        
                        // Check Hospital
                        if ((window.fastFoodMode || window.playerUnlockedInternational || window.cultMode) && !this.hasHealthInsurance) {
                            const hospitals = this.gameMap.buildings.filter(b => b.type === 'hospital');
                            for (const hospital of hospitals) {
                                if (hospital.doorTiles.length > 0) {
                                    const hDoor = hospital.doorTiles[0];
                                    const dist = Math.sqrt((px - (hDoor.x*TILE_SIZE + TILE_SIZE/2))**2 + (py - (hDoor.y*TILE_SIZE + TILE_SIZE/2))**2);
                                    if (dist < TILE_SIZE * 1.5) {
                                        window.triggerHospitalOffer();
                                        return;
                                    }
                                }
                            }
                        }

                        // Check Fast Food
                        if (window.fastFoodMode || window.cultMode) {
                            const ffBuildings = this.gameMap.buildings.filter(b => b.type === 'fast_food');
                            for (const ffBldg of ffBuildings) {
                                if (ffBldg && ffBldg.doorTiles.length > 0) {
                                    const door = ffBldg.doorTiles[0];
                                    const dist = Math.sqrt((px - (door.x*TILE_SIZE + TILE_SIZE/2))**2 + (py - (door.y*TILE_SIZE + TILE_SIZE/2))**2);
                                    if (dist < TILE_SIZE * 1.5) {
                                        if (window.cultMode) {
                                            if (this.lastEatenFastFoodId !== null && this.lastEatenFastFoodId !== ffBldg.id) {
                                                this.visitedDifferentRestaurantSinceLastEat = true;
                                            }
                                        }
                                        this.pendingFastFoodId = ffBldg.id;
                                        window.triggerFastFoodOffer(this.getRoundTotalFollowers());
                                        return;
                                    }
                                }
                            }
                        }
                        
                        // Check Airport
                        if (window.playerUnlockedInternational) {
                            const airport = this.gameMap.buildings.find(b => b.type === 'airport');
                            if (airport && airport.doorTiles.length > 0) {
                                const aDoor = airport.doorTiles[0];
                                const dist = Math.sqrt((px - (aDoor.x*TILE_SIZE + TILE_SIZE/2))**2 + (py - (aDoor.y*TILE_SIZE + TILE_SIZE/2))**2);
                                if (dist < TILE_SIZE * 1.5) {
                                const t = this.gameMap && this.gameMap.theme ? this.gameMap.theme.toLowerCase() : 'default';
                                if (t === 'default' || t === 'filthadelphia') {
                                    document.getElementById('btn-travel-filthadelphia').style.display = 'none';
                                    document.getElementById('btn-travel-dahgbad').style.display = 'inline-block';
                                    document.getElementById('btn-travel-cucaracha').style.display = 'inline-block';
                                } else if (t === 'dahgbad') {
                                    document.getElementById('btn-travel-filthadelphia').style.display = 'inline-block';
                                    document.getElementById('btn-travel-dahgbad').style.display = 'none';
                                    document.getElementById('btn-travel-cucaracha').style.display = 'inline-block';
                                } else if (t === 'cucaracha') {
                                    document.getElementById('btn-travel-filthadelphia').style.display = 'inline-block';
                                    document.getElementById('btn-travel-dahgbad').style.display = 'inline-block';
                                    document.getElementById('btn-travel-cucaracha').style.display = 'none';
                                }
                                document.getElementById('airport-dialog').classList.remove('hidden');
                                this.hud.showFollowerNotification("Welcome to the Airport!", true);
                                    return;
                                }
                            }
                        }
                    }

                    // Dump interaction
                    if (window.playerHasTruck > 0) {
                        const px = wrapWorldX(this.player.x);
                        const py = wrapWorldY(this.player.y);
                        const dumpBldg = this.gameMap.buildings.find(b => b.type === 'dump');
                        if (dumpBldg && dumpBldg.doorTiles.length > 0) {
                            const door = dumpBldg.doorTiles[0];
                            const dist = Math.sqrt((px - (door.x*TILE_SIZE + TILE_SIZE/2))**2 + (py - (door.y*TILE_SIZE + TILE_SIZE/2))**2);
                            if (dist < TILE_SIZE * 1.5) {
                                if (this.trashCollectedInTruck > 0) {
                                    this.trashCollectedInTruck = 0;
                                    this.hud.showFollowerNotification("Unloaded garbage at the Dump!", true);
                                } else {
                                    this.hud.showFollowerNotification("Garbage truck is already empty.", true);
                                }
                                return;
                            }
                        }
                    }
                }

                // ── Phase 3 E-key interactions (always run if E pressed) ──
                if (e.key === 'e' || e.key === 'E') {


                    // Lost Child Quest: check parent delivery first, then child pickup
                    if (this.npcManager && this.npcManager.childNPC && !this.npcManager.childDelivered) {
                        const parentNear = this.npcManager.checkParentInteraction(this.player.x, this.player.y);
                        if (parentNear) {
                            this.npcManager.childDelivered = true;
                            this.npcManager.childFollowing = false;
                            for (let i = 0; i < 10; i++) this.followerManager.addFollower(this.player.x, this.player.y);
                            this.hud.followerCount = this.getRoundTotalFollowers();
                            this.npcManager.activeDialogue = { lines: ["Our child is home! Thank you so much!", "+10 Followers!"], lineIndex: 0, timer: 240 };
                            this.hud.showFollowerNotification('\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc66 Child delivered! +10 Followers!', true);
                        } else {
                            const childNear = this.npcManager.checkChildInteraction(this.player.x, this.player.y);
                            if (childNear && !this.npcManager.childFollowing) {
                                this.npcManager.childFollowing = true;
                                this.npcManager.activeDialogue = { lines: ["I am looking for my parents."], lineIndex: 0, timer: 180 };
                                this.hud.showFollowerNotification('\ud83d\udc66 The child is following you! Find their parents!', true);
                                if (this.npcManager.childQuestBuilding) {
                                    this._childQuestHighlightBuilding = this.npcManager.childQuestBuilding.id;
                                }
                            }
                        }
                    }

                    // Builder Mode: buy building at door
                    if (window.builderMode) {
                        const bpx = wrapWorldX(this.player.x);
                        const bpy = wrapWorldY(this.player.y);
                        for (let idx = 0; idx < this.gameMap.buildings.length; idx++) {
                            const bldg = this.gameMap.buildings[idx];
                            if (!bldg || bldg.doorTiles.length === 0) continue;
                            if (['bank','police','airport','hospital','dump'].includes(bldg.type)) continue;
                            const door = bldg.doorTiles[0];
                            const dist = Math.sqrt((bpx - (door.x*TILE_SIZE + TILE_SIZE/2))**2 + (bpy - (door.y*TILE_SIZE + TILE_SIZE/2))**2);
                            if (dist < TILE_SIZE * 1.5) {
                                const alreadyOwned = this.ownedBuildings.find(b => b.building_idx === idx);
                                if (alreadyOwned) {
                                    this.hud.showFollowerNotification(`\ud83c\udfe2 Owned: ${bldg.address || 'Building'} (${alreadyOwned.tenants || 0} tenants)`, true);
                                } else {
                                    if (!this.buildingPriceCache.has(idx)) {
                                        this.buildingPriceCache.set(idx, 2000 + Math.floor(Math.random() * 1501));
                                    }
                                    const price = this.buildingPriceCache.get(idx);
                                    const addr = bldg.address || `Bldg #${idx}`;
                                    const canAfford = (window.playerBalance || 0) >= price;
                                    if (!canAfford) {
                                        this.hud.showFollowerNotification(`\ud83c\udfe2 ${addr}: $${price.toLocaleString()} (Need $${(price - (window.playerBalance||0)).toLocaleString()} more)`, false);
                                    } else {
                                        this.resetKeys();
                                        if (confirm(`Buy ${addr} for $${price.toLocaleString()}?\nEarns $1,000/tenant/round. Max 5 tenants.`)) {
                                            window.apiCall('/api/game/buy-building', 'POST', { building_idx: idx, address: addr, cost: price })
                                                .then(res => {
                                                    if (res.success) {
                                                        window.playerBalance = res.balance;
                                                        this.ownedBuildings.push({ building_idx: idx, address: addr, tenants: 0 });
                                                        this.totalVacancies = (this.totalVacancies || 0) + 5;
                                                        this.buildingPriceCache.delete(idx);
                                                        this.hud.showFollowerNotification(`\ud83c\udfe2 Bought ${addr}! 5 vacancies open.`, true);
                                                    }
                                                }).catch(err => this.hud.showFollowerNotification(`\u274c Buy failed`, false));
                                        }
                                    }
                                }
                                break;
                            }
                        }
                    }
                }

                // A or a key: Builder mode — offer apartment to nearby NPC
                if (e.key === 'a' || e.key === 'A') {
                    if (window.builderMode && this.totalVacancies > 0) {
                        const nearNPC = this.npcManager.checkInteraction(this.player.x, this.player.y);
                        if (nearNPC && nearNPC.npcType !== 'child' && nearNPC.npcType !== 'parent' && nearNPC.npcType !== 'cult_family') {
                            const roll = Math.random();
                            if (roll < 0.5) {
                                // NPC accepts tenancy — find building with vacancy
                                const bldgWithVacancy = this.ownedBuildings.find(b => (b.tenants || 0) < 5);
                                if (bldgWithVacancy) {
                                    bldgWithVacancy.tenants = (bldgWithVacancy.tenants || 0) + 1;
                                    this.totalVacancies = Math.max(0, this.totalVacancies - 1);
                                    this.npcManager.npcs = this.npcManager.npcs.filter(n => n !== nearNPC);
                                    this.npcManager.spawnSingleNPC(this.gameMap);
                                    window.apiCall('/api/game/add-tenant', 'POST', { building_idx: bldgWithVacancy.building_idx })
                                        .catch(e => console.error('add-tenant error:', e));
                                    this.hud.showFollowerNotification(`\ud83d\udeaa ${nearNPC.name} moved into ${bldgWithVacancy.address}!`, true);
                                }
                            } else {
                                this.hud.showFollowerNotification(`${nearNPC.name} declined your offer.`, false);
                            }
                        }
                    }
                }

                // F or f to plant fertilizer
                if (e.key === 'f' || e.key === 'F') {
                    if (window.flowersMode) {
                        const px = wrapWorldX(this.player.x);
                        const py = wrapWorldY(this.player.y);
                        const tileX = Math.floor(px / TILE_SIZE);
                        const tileY = Math.floor(py / TILE_SIZE);
                        const parkId = this.gameMap.isParkTile(tileX, tileY);
                        
                        // Check if fertilizer is already here
                        const existingFlower = this.flowers.find(f => f.x === tileX && f.y === tileY);
                        if (!existingFlower) {
                            if (window.playerInventory && window.playerInventory['Fertilizer'] > 0) {
                                window.playerInventory['Fertilizer']--; // consume fertilizer
                                // Roll 80% success chance AND must be in a park
                                if (Math.random() < 0.8 && parkId) {
                                    this.flowers.push({
                                        x: tileX,
                                        y: tileY,
                                        parkId: parkId,
                                        isMud: false,
                                        plantedAtElapsed: this.hud.gameDuration - this.hud.timeRemaining,
                                        growTimeRemaining: 90
                                    });
                                    this.hud.showFollowerNotification(`Planted flower!`, true);
                                } else {
                                    // Mud pile
                                    this.flowers.push({
                                        x: tileX,
                                        y: tileY,
                                        parkId: parkId,
                                        isMud: true,
                                        plantedAtElapsed: this.hud.gameDuration - this.hud.timeRemaining,
                                        growTimeRemaining: 90
                                    });
                                    this.hud.showFollowerNotification(`Fertilized ground.`, parkId ? false : true);
                                }
                            } else {
                                this.hud.showFollowerNotification(`You need Fertilizer!`, false);
                            }
                        } else {
                            this.hud.showFollowerNotification(`Already fertilized here!`, false);
                        }
                    }
                }

                // K or k to kill NPC
                if (e.key === 'k' || e.key === 'K') {
                    if (window.crimeMode) {
                        // Check if near a Don first
                        if (window.crimeMode && this.crimeManager) {
                            const px = wrapWorldX(this.player.x);
                            const py = wrapWorldY(this.player.y);
                            // Check if near a Don
                            for (const don of this.crimeManager.dons) {
                                if (don.alive) {
                                    const dist = Math.sqrt((px - don.x)**2 + (py - don.y)**2);
                                    if (dist < TILE_SIZE * 1.5) {
                                        don.alive = false;
                                        this.hud.showFollowerNotification(`${don.name} has been killed!`, true);
                                        
                                        this.crimeManager.policeActive = true;
                                        this.crimeManager.policeActiveTimer = 30.0;
                                        const station = this.gameMap.buildings[1];
                                        if (station && station.doorTiles.length > 0) {
                                            const door = station.doorTiles[0];
                                            this.crimeManager.police.push(new PoliceOfficer(door.x, door.y, true));
                                            this.hud.showFollowerNotification('👮 Police officer dispatched for murder! They will chase for 30s!', true);
                                        }

                                        this.crimeManager.spawnThugs(this.gameMap);
                                        
                                        if (this.crimeManager.activeTask && this.crimeManager.activeTask.type === 'kill_don' && don.id === this.crimeManager.activeTask.targetDonId) {
                                            this.crimeManager.completeTask(this);
                                        }

                                        return;
                                    }
                                }
                            }
                        }

                        const npc = this.npcManager.checkInteraction(this.player.x, this.player.y);
                        if (npc) {
                            const idx = this.npcManager.npcs.indexOf(npc);
                            if (idx >= 0) {
                                this.npcManager.npcs.splice(idx, 1);
                                this.hud.showFollowerNotification('NPC killed!', true);
                                
                                // Spawn police officer from the station!
                                if (this.crimeManager) {
                                    this.crimeManager.policeActive = true;
                                    this.crimeManager.policeActiveTimer = 30.0;
                                    const station = this.gameMap.buildings[1];
                                    if (station && station.doorTiles.length > 0) {
                                        const door = station.doorTiles[0];
                                        this.crimeManager.police.push(new PoliceOfficer(door.x, door.y, true));
                                        this.hud.showFollowerNotification('👮 Police officer dispatched for murder! They will chase for 30s!', true);
                                    }
                                }

                                if (this.crimeManager.activeTask && 
                                    (this.crimeManager.activeTask.type === 'collect_gold' || this.crimeManager.activeTask.type === 'intimidate' || this.crimeManager.activeTask.type === 'rob_npc')) {
                                    this.crimeManager.completeTask(this);
                                }
                            }
                        }
                    }
                }

                // I or i to intimidate NPC or Don
                if (e.key === 'i' || e.key === 'I') {
                    if (window.crimeMode) {
                        if (window.elPresidenteElection) {
                            const npc = this.npcManager.checkInteraction(this.player.x, this.player.y);
                            if (npc && !npc.shaken) {
                                if (npc.isRedRivalOnly) {
                                    this.hud.showFollowerNotification("This supporter only votes for your rival!", false);
                                } else {
                                    npc.shaken = true;
                                    this.handshakesShaken = (this.handshakesShaken || 0) + 1;
                                    this.hud.showFollowerNotification(`Intimidated ${npc.name}! (+1 Intimidation)`, true);
                                    
                                    this.npcManager.activeDialogue = {
                                        lines: ["Please don't hurt me!", "I'll support you, boss!"],
                                        lineIndex: 0,
                                        timer: 120
                                    };

                                    this.npcManager.npcs = this.npcManager.npcs.filter(n => n !== npc);
                                    this.npcManager.spawnSingleNPC(this.gameMap);
                                }
                            }
                        } else {
                            if (this.crimeManager && this.crimeManager.activeTask && this.crimeManager.activeTask.type === 'intimidate_don') {
                                const px = wrapWorldX(this.player.x);
                                const py = wrapWorldY(this.player.y);
                                const don = this.crimeManager.dons.find(d => d.id === this.crimeManager.activeTask.targetDonId);
                                if (don && don.alive) {
                                    const dist = Math.sqrt((px - don.x)**2 + (py - don.y)**2);
                                    if (dist < TILE_SIZE * 1.5) {
                                        this.crimeManager.completeTask(this);
                                        return;
                                    }
                                }
                            }

                            const npc = this.npcManager.checkInteraction(this.player.x, this.player.y);
                            if (npc) {
                                this.npcManager.activeDialogue = {
                                    lines: ["Please don't hurt me!", "I'll do whatever you say!"],
                                    lineIndex: 0,
                                    timer: 120
                                };
                                this.hud.showFollowerNotification('NPC Intimidated!', true);
                                if (this.crimeManager.activeTask && this.crimeManager.activeTask.type === 'intimidate') {
                                    this.crimeManager.completeTask(this);
                                }
                            }
                        }
                    }
                }

                // R or r to rob NPC
                if (e.key === 'r' || e.key === 'R') {
                    if (window.crimeMode) {
                        // Check Don rob first
                        if (window.crimeMode && this.crimeManager) {
                            const px = wrapWorldX(this.player.x);
                            const py = wrapWorldY(this.player.y);
                            for (const don of this.crimeManager.dons) {
                                if (don.alive && !don.robbed) {
                                    const dist = Math.sqrt((px - don.x)**2 + (py - don.y)**2);
                                    if (dist < TILE_SIZE * 1.5) {
                                        don.robbed = true;
                                        const robbedAmount = 500 + Math.floor(Math.random() * 1501);
                                        this.trashManager.totalPoints += robbedAmount;
                                        this.hud.showFollowerNotification(`Robbed ${don.name} for $${robbedAmount}!`, true);
                                        this.crimeManager.spawnThugs(this.gameMap);
                                        return;
                                    }
                                }
                            }
                        }

                        const npc = this.npcManager.checkInteraction(this.player.x, this.player.y);
                        if (npc && !npc.robbed) {
                            npc.robbed = true;
                            const robbedAmount = 100 + Math.floor(Math.random() * 701);
                            this.trashManager.totalPoints += robbedAmount;
                            this.hud.showFollowerNotification(`Robbed NPC for $${robbedAmount}!`, true);
                            
                            // 50% chance police are called
                            if (Math.random() < 0.5 && this.crimeManager) {
                                const station = this.gameMap.buildings[1];
                                if (station && station.doorTiles.length > 0) {
                                    const door = station.doorTiles[0];
                                    this.crimeManager.police.push(new PoliceOfficer(door.x, door.y, true)); // temporary=true, 30s TTL
                                    this.hud.showFollowerNotification('👮 Police called! They\'ll chase you for 30 seconds!', true);
                                }
                            }
                            
                            if (this.crimeManager.activeTask && this.crimeManager.activeTask.type === 'rob_npc') {
                                this.crimeManager.completeTask(this);
                            }
                        } else if (npc && npc.robbed) {
                            this.hud.showFollowerNotification('This NPC has already been robbed!', false);
                        }
                    }
                }

                // S or s to steal car (Crime) or shake hands (Politics)
                if (e.key === 's' || e.key === 'S') {
                    let targetCar = null;
                    if (window.crimeMode) {
                        for (const car of this.carManager.cars) {
                            if (car.active) {
                                const dx = this.player.x - car.x;
                                const dy = this.player.y - car.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist < TILE_SIZE * 0.8) {
                                    targetCar = car;
                                    break;
                                }
                            }
                        }
                    }

                    if (targetCar && window.crimeMode) {
                        const curTX = this.player.getTileX();
                        const curTY = this.player.getTileY();
                        const tile = this.gameMap.getTile(curTX, curTY);
                        
                        if (tile === TileType.ROAD || tile === TileType.CROSSWALK || tile === TileType.SIDEWALK) {
                            if (this.followerManager.getFollowerCount() > 0) {
                                targetCar.active = false;
                                this.followerManager.removeFollower();
                                this.trashManager.totalPoints += 1000;
                                this.hud.showFollowerNotification('Car stolen! Posse member drove off. +$1,000', true);

                                if (this.crimeManager.activeTask && this.crimeManager.activeTask.type === 'steal_car') {
                                    this.crimeManager.completeTask(this);
                                }
                            } else {
                                this.hud.showFollowerNotification('You need a posse member to drive off with the stolen car!', true);
                            }
                        } else {
                            this.hud.showFollowerNotification('You can only steal cars on roads or intersections!', true);
                        }
                    } else if (window.politicsMode) {
                        const npc = this.npcManager.checkInteraction(this.player.x, this.player.y);
                        if (npc && !npc.shaken) {
                            if (npc.isRedRivalOnly) {
                                this.hud.showFollowerNotification("This supporter only votes for your rival!", false);
                            } else {
                                npc.shaken = true;
                                this.handshakesShaken = (this.handshakesShaken || 0) + 1;
                                this.hud.showFollowerNotification(`Shook hands with ${npc.name}! (+1 Vote)`, true);
                                
                                // Remove the shaken NPC from list and spawn a new one
                                this.npcManager.npcs = this.npcManager.npcs.filter(n => n !== npc);
                                this.npcManager.spawnSingleNPC(this.gameMap);
                            }
                        }
                    }
                }

                // Hotkeys for Consumables
                if (e.key === 't' || e.key === 'T') this.useConsumable('Borrowed Time');
                if (e.key === 'm' || e.key === 'M') this.useConsumable('Mushrooms');
                if (e.key === 'w' || e.key === 'W') this.useConsumable('Wings');
                if (e.key === 'p' || e.key === 'P') this.useConsumable('Protection');
                if (e.key === 'b' || e.key === 'B') {
                    if (this.priceFixingActive) {
                        this.triggerPriceFixingBribe();
                    }
                }
                if (e.key === 'd' || e.key === 'D') {
                    if (this.crimeManager && this.crimeManager.activeTask && this.crimeManager.activeTask.type === 'illegal_dump') {
                        this.performIllegalDump();
                    }
                }

                // C key: Ranger animal capture (if near an animal node)
                if ((e.key === 'c' || e.key === 'C') && this.player && this.player.characterClass === 'char1') {
                    this._rangerTryCaptureAnimal();
                }

                // Prevent scrolling with arrow keys
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                    e.preventDefault();
                }
            }

            if (this.state === GameState.GAME_OVER && e.key === ' ') {
                this._restartGame();
            }
        };

        const keyUpHandler = (e) => {
            if (this.player) {
                this.player.handleKeyUp(e);
            }
        };

        document.addEventListener('keydown', keyHandler);
        document.addEventListener('keyup', keyUpHandler);

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            this.mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

            if (this.state === GameState.CHARACTER_SELECT) {
                this._updateCharHover();
            }
        });

        this.canvas.addEventListener('click', (e) => {
            this.canvas.focus();
            if (this.state === GameState.CHARACTER_SELECT) {
                this._handleCharSelect(e);
            } else if (this.state === GameState.GAME_OVER) {
                // Return to store handled in render button click
                const rect = this.canvas.getBoundingClientRect();
                const clickX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
                const clickY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const btnW = 200;
                const btnH = 40;
                const btnX = centerX - btnW / 2;
                const btnY = centerY + 145;
                if (clickX >= btnX && clickX <= btnX + btnW && clickY >= btnY && clickY <= btnY + btnH) {
                    this._endRoundAndReturnToStore();
                }
            }
        });
    }

    _resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.camera) {
            this.camera.resize(this.canvas.width, this.canvas.height);
        }
    }

    _startLoop() {
        if (window.gameLog) window.gameLog("Game._startLoop() starting requestAnimationFrame loop");
        this.lastTime = performance.now();
        const loop = (timestamp) => {
            try {
                const delta = timestamp - this.lastTime;
                this.lastTime = timestamp;
                // Cap delta to prevent huge jumps (e.g., tab was hidden)
                const clampedDt = Math.min(delta / 1000, 0.1);
                this._update(clampedDt);
                this._render();
            } catch (e) {
                console.error('Game loop error:', e);
                if (window.gameLog) window.gameLog(`GAME LOOP EXCEPTION: ${e.message}\nStack: ${e.stack}`);
                this.errorLog.push(e.message);
                if (window.onerror) {
                    window.onerror('Game loop error: ' + e.message, 'js/main.js', 0, 0, e);
                }
                try { this._renderError(); } catch (_) {}
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    triggerCultLeavingEvent() {
        const dialog = document.getElementById('cult-leaving-dialog');
        const textEl = document.getElementById('cult-leaving-text');
        if (!dialog || !textEl) return;

        // Stop time / game update loop
        const oldState = this.state;
        this.state = GameState.UI_OVERLAY;
        this.player.keys = { up: false, down: false, left: false, right: false };

        const xVal = this.cultLeavesCumulative || 0;
        const loss = Math.ceil(Math.pow(1.1, xVal) * 10);
        
        const narratives = [
            "A member of the Church has been talking to others about leaving, what do you do?",
            "An elder of the temple is questioning our sacred purification mission and sharing doubts. What do you do?",
            "A group of followers was overheard whispering about escaping back to their families. What do you do?",
            "A loyal disciple reports that a member is secretly hoarding personal belongings and planning to flee. What do you do?",
            "A member of the flock claims they received a vision calling them away from the Church. What do you do?"
        ];
        const randomNarrative = narratives[Math.floor(Math.random() * narratives.length)];

        textEl.innerHTML = `${randomNarrative}<br><br><span style="color:#ff3333; font-size: 7px; line-height: 1.4;">Allowing them to leave will cause ${loss} follower(s) to leave with them.</span>`;

        dialog.classList.remove('hidden');

        // Setup button / key listeners
        const cleanup = () => {
            dialog.classList.add('hidden');
            window.removeEventListener('keydown', keyHandler);
            this.state = oldState;
            const canvas = document.getElementById('gameCanvas');
            if (canvas) canvas.focus();
        };

        const stayAction = () => {
            cleanup();
            this.happiness = Math.max(0, (this.happiness || 100) - 15);
            this.hud.showFollowerNotification('😈 You convinced them. -15% Happiness.', false);
        };

        const leaveAction = () => {
            cleanup();
            const currentX = this.cultLeavesCumulative || 0;
            const lossVal = Math.ceil(Math.pow(1.1, currentX) * 10);
            const actualLoss = Math.min(this.getRoundTotalFollowers(), lossVal);
            for (let i = 0; i < actualLoss; i++) {
                this._removeSequentialFollower();
            }
            this.hud.followerCount = this.getRoundTotalFollowers();
            this.cultLeavesCumulative = currentX + 1;
            this.hud.showFollowerNotification(`🚶 Allowed to leave. -${actualLoss} Followers.`, false);
        };

        const keyHandler = (e) => {
            if (e.key === 'c' || e.key === 'C') {
                stayAction();
            } else if (e.key === 'l' || e.key === 'L') {
                leaveAction();
            }
        };

        window.addEventListener('keydown', keyHandler);

        // Bind buttons
        const btnStay = document.getElementById('btn-cult-stay');
        const btnLeave = document.getElementById('btn-cult-leave');
        
        // Remove previous event listeners by cloning
        const newBtnStay = btnStay.cloneNode(true);
        btnStay.parentNode.replaceChild(newBtnStay, btnStay);
        const newBtnLeave = btnLeave.cloneNode(true);
        btnLeave.parentNode.replaceChild(newBtnLeave, btnLeave);

        newBtnStay.addEventListener('click', stayAction);
        newBtnLeave.addEventListener('click', leaveAction);
    }

    pickupTrash() {
        if (this.state !== GameState.PLAYING || !this.player) return;

        let maxToPick = Infinity;
        if (window.playerHasTruck > 0) {
            // Reduce max truck capacity by 10 per captured animal (Ranger)
            const animalPenalty = this.player.capturedAnimals ? this.player.capturedAnimals.length * 10 : 0;
            const maxCap = Math.max(0, window.playerHasTruck * 100 - animalPenalty);
            maxToPick = Math.max(0, maxCap - this.trashCollectedInTruck);
            if (maxToPick <= 0) {
                if (!this.lastCapacityNotificationTime || Date.now() - this.lastCapacityNotificationTime > 3000) {
                    this.hud.showFollowerNotification("Garbage truck full! Unload at the Dump.", false);
                    this.lastCapacityNotificationTime = Date.now();
                }
                return;
            }
        }

        // Trashpickers: double the effective pickup radius for the player
        const baseRadius = TILE_SIZE * 0.8;
        const pickupRadius = this.doubleTrashPickup ? baseRadius * 2 : baseRadius;
        const picked = this.trashManager.checkPickup(this.player.x, this.player.y, pickupRadius, this.getRoundTotalFollowersForValue(), maxToPick);

        if (picked.length > 0) {
            if (window.playerHasTruck > 0) {
                this.trashCollectedInTruck += picked.length;
                if (this.trashCollectedInTruck >= window.playerHasTruck * 100) {
                    this.hud.showFollowerNotification("Garbage truck full! Unload at the Dump.", false);
                }
            }
            this.hud.updateScore(this.trashManager.totalPoints);
            this.trashCollectedInWindow += picked.length;
            this.trashCollectedInRound = (this.trashCollectedInRound || 0) + picked.length;
            this.trashManager.spawnMore(this.gameMap, picked.length);
        }
    }

    async useConsumable(itemName) {
        if (!window.playerInventory || !window.playerInventory[itemName] || window.playerInventory[itemName] <= 0) {
            this.hud.showFollowerNotification(`No ${itemName} in inventory!`, false);
            return;
        }
        
        try {
            await window.apiCall('/api/game/consume', 'POST', { item_name: itemName });
            window.playerInventory[itemName] -= 1;
            
            if (itemName === 'Borrowed Time') {
                this.hud.timeRemaining += 20;
                this.hud.showFollowerNotification('+20s Timer Added!', true);
            } else if (itemName === 'Mushrooms') {
                this.hud.timerSpeed = 0.5;
                this.mushroomTimer = 20;
                this.hud.showFollowerNotification('Timer Slowed!', true);
            } else if (itemName === 'Wings') {
                if (this.player) this.player.speedMultiplier = 1.5;
                this.wingsTimer = 15;
                this.hud.showFollowerNotification('Super Speed!', true);
            }
        } catch (e) {
            console.error("Consume error:", e);
        }
    }

    triggerPriceFixingBribe() {
        if (!this.priceFixingActive) return;
        
        const opt1 = Math.floor(200 + Math.random() * 200);
        const opt2 = Math.floor(500 + Math.random() * 300);
        const opt3 = Math.floor(1000 + Math.random() * 500);
        
        const dialog = document.getElementById('bribe-dialog');
        if (!dialog) return;
        
        const oldState = this.state;
        this.state = GameState.UI_OVERLAY;
        
        dialog.classList.remove('hidden');
        
        const titleEl = document.querySelector('#bribe-dialog h2');
        const oldTitle = titleEl ? titleEl.innerText : "BRIBE POLICE CHIEF";
        if (titleEl) titleEl.innerText = "BRIBE THE POLICE";
        
        const btn1 = document.getElementById('btn-bribe-1');
        const btn2 = document.getElementById('btn-bribe-2');
        const btn3 = document.getElementById('btn-bribe-3');
        const btnCancel = document.getElementById('btn-bribe-cancel');
        
        if (btn1) btn1.innerText = `Offer $${opt1} (15s)`;
        if (btn2) btn2.innerText = `Offer $${opt2} (30s)`;
        if (btn3) btn3.innerText = `Offer $${opt3} (60s)`;
        
        const setupBtn = (btn, amount, time) => {
            const clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
            clone.addEventListener('click', async () => {
                if (window.playerBalance < amount) {
                    alert("Insufficient balance to bribe police!");
                    dialog.classList.add('hidden');
                    if (titleEl) titleEl.innerText = oldTitle;
                    this.state = oldState;
                    return;
                }
                
                try {
                    const response = await window.apiCall('/api/game/bribe', 'POST', { amount });
                    window.playerBalance = response.balance;
                    window.renderStore();
                    
                    this.policeBribeCooldown = time;
                    this.hud.showFollowerNotification(`Police paid off! Chasing stopped for ${time}s.`, true);
                    
                    if (this.crimeManager) {
                        this.crimeManager.police = [];
                    }
                } catch (e) {
                    alert("Bribe failed: " + e.message);
                }
                
                dialog.classList.add('hidden');
                if (titleEl) titleEl.innerText = oldTitle;
                this.state = oldState;
            });
        };
        
        setupBtn(btn1, opt1, 15);
        setupBtn(btn2, opt2, 30);
        setupBtn(btn3, opt3, 60);
        
        const cancelClone = btnCancel.cloneNode(true);
        btnCancel.parentNode.replaceChild(cancelClone, btnCancel);
        cancelClone.addEventListener('click', () => {
            dialog.classList.add('hidden');
            if (titleEl) titleEl.innerText = oldTitle;
            this.state = oldState;
        });
    }

    performIllegalDump() {
        const task = this.crimeManager.activeTask;
        if (!task || task.type !== 'illegal_dump') return;

        if (task.dumped) {
            this.hud.showFollowerNotification("You have already dumped the trash!", false);
            return;
        }

        const playerTX = this.player.getTileX();
        const playerTY = this.player.getTileY();

        const park = this.gameMap.parkBlocks.find(p => p.id === task.targetParkId);
        if (!park) return;

        if (playerTX < park.x1 || playerTX > park.x2 || playerTY < park.y1 || playerTY > park.y2) {
            this.hud.showFollowerNotification("Must be inside the target park to dump!", false);
            return;
        }

        task.dumped = true;

        let totalParkTiles = 0;
        let coveredParkTiles = 0;

        for (let ty = park.y1; ty <= park.y2; ty++) {
            for (let tx = park.x1; tx <= park.x2; tx++) {
                totalParkTiles++;
                const dx = Math.abs(tx - playerTX);
                const dy = Math.abs(ty - playerTY);
                if (dx <= 3 && dy <= 3) {
                    coveredParkTiles++;
                    this.trashManager.items.push({
                        x: tx * TILE_SIZE + TILE_SIZE / 2,
                        y: ty * TILE_SIZE + TILE_SIZE / 2,
                        collected: false,
                        isIllegalDumpTrash: true
                    });
                }
            }
        }

        if (coveredParkTiles >= totalParkTiles) {
            task.completed = true;
            this.hud.showFollowerNotification("Park fully covered! Talk to Don to get paid.", true);
        } else {
            task.completed = false;
            this.hud.showFollowerNotification("Dump incomplete! Missed areas. Don won't pay.", false);
        }
    }

    _update(dt) {
        if (this.dragonSplashTimer > 0) {
            this.dragonSplashTimer -= dt;
            if (this.dragonSplashTimer <= 0) {
                this.dragonSplashTimer = 0;
            }
            return;
        }

        if (this.state !== GameState.PLAYING) return;

        // Price fixing bribe timer
        if (this.policeBribeCooldown > 0) {
            this.policeBribeCooldown -= dt;
            if (this.policeBribeCooldown < 0) this.policeBribeCooldown = 0;
        }

        // Consumable timers
        if (this.mushroomTimer > 0) {
            this.mushroomTimer -= dt;
            if (this.mushroomTimer <= 0) {
                this.hud.timerSpeed = 1.0;
                this.mushroomTimer = 0;
            }
        }
        if (this.wingsTimer > 0) {
            this.wingsTimer -= dt;
            if (this.wingsTimer <= 0) {
                if (this.player) this.player.speedMultiplier = 1.0;
                // Restore Athlete base bonus if applicable
                if (this.player && this.player.characterClass === 'char4' && !window.playerHasTruck) {
                    this.player.speedMultiplier = 1.1;
                    this.player.athleteBaseMultiplier = 1.1;
                }
                this.wingsTimer = 0;
            }
        }
        if (this.protectionTimer > 0) {
            this.protectionTimer -= dt;
            if (this.protectionTimer <= 0) {
                this.protectionTimer = 0;
                this.protectionBonus = 0;
                this.hud.showFollowerNotification('Protection Expired!', false);
            }
        }

        // ── Quinine auto-consume: if player is sick and has Quinine, auto-cure ──
        if (this.player && this.player.sick &&
            window.playerInventory && (window.playerInventory['Quinine'] || 0) > 0) {
            this.player.sick = false;
            window.playerInventory['Quinine'] -= 1;
            window.apiCall('/api/game/consume', 'POST', { item_name: 'Quinine' })
                .then(() => { console.log('Quinine auto-consumed: sick status cured.'); })
                .catch(e => console.error('Quinine consume error:', e));
            this.hud.showFollowerNotification('🧪 Quinine auto-consumed! Sickness cured!', true);
        }

        // Employee upkeep timer ($200 every 15s per hired employee, excluding Bruno)
        this.employeeUpkeepTimer += dt;
        if (this.employeeUpkeepTimer >= 15) {
            this.employeeUpkeepTimer -= 15;
            const hired = window.employeesHired || 0;
            if (hired > 0) {
                const cost = hired * 200;
                this.totalEmployeeCost += cost;
                this.hud.showFollowerNotification(`-$${cost} for posse upkeep`, false);
            }
        }

        // ── Phase 3: Lost Child — move child toward player ──
        if (this.npcManager && this.npcManager.childFollowing && !this.npcManager.childDelivered) {
            this.npcManager.updateChildFollow(this.player.x, this.player.y, this.gameMap);
        }

        // ── Phase 3: Cult Mode — happiness decay + family miss timer ──
        if (window.cultMode) {
            // Gradual happiness decay (1 point per 5s)
            this.happinessDecayTimer = (this.happinessDecayTimer || 0) + dt;
            if (this.happinessDecayTimer >= 5) {
                this.happinessDecayTimer -= 5;
                this.happiness = Math.max(0, (this.happiness || 100) - 1);
            }

            // Happiness hits 0: halve the posse
            if ((this.happiness || 0) <= 0 && !this._happinessPenaltyTriggered) {
                this._happinessPenaltyTriggered = true;
                const totalF = this.getRoundTotalFollowers();
                const toLose = Math.floor(totalF / 2);
                for (let i = 0; i < toLose; i++) this._removeSequentialFollower();
                this.hud.followerCount = this.getRoundTotalFollowers();
                this.happiness = 50; // reset to 50
                this._happinessPenaltyTriggered = false;
                this.hud.showFollowerNotification('💔 Mass exodus! Unhappy followers left! (-50% Posse)', false);
            }

            if (this.cultHappinessBufferTimer > 0) {
                this.cultHappinessBufferTimer -= dt;
                if (this.cultHappinessBufferTimer <= 0) {
                    this.cultHappinessBufferTimer = 0;
                    const boost = this.pendingHappinessBoost || 20;
                    this.happiness = Math.min(100, (this.happiness || 100) + boost);
                    this.hud.showFollowerNotification(`😇 Posse digested fast food! +${boost}% Happiness!`, true);
                }
            }

            // Leaving event timer — show dialog periodically
            this.cultLeavingTimer = (this.cultLeavingTimer || (20.0 + Math.random() * 15.0)) - dt;
            if (this.cultLeavingTimer <= 0 && this.getRoundTotalFollowers() > 0) {
                this.cultLeavingTimer = 20.0 + Math.random() * 15.0;
                this.resetKeys();
                this.triggerCultLeavingEvent();
            }
        }

        // Update timer
        this.hud.update(dt);
        
        // Update flowers
        if (window.flowersMode) {
            for (const flower of this.flowers) {
                if (flower.growTimeRemaining > 0) {
                    flower.growTimeRemaining -= dt;
                    if (flower.growTimeRemaining <= 0) {
                        flower.growTimeRemaining = 0;
                        this.hud.showFollowerNotification(`A flower has bloomed!`, true);
                    }
                }
            }
        }
        this.hud.evalTimer = 10 - this.followerCheckTimer;
        this.hud.trashInWindow = this.trashCollectedInWindow;

        if (this.hud.isTimeUp()) {
            this.state = GameState.UI_OVERLAY;
            if (window.politicsMode || window.elPresidenteElection) {
                const playerVotes = this.handshakesShaken || 0;
                const rivalVotes = this.rivalCandidate ? this.rivalCandidate.votes : 0;
                const isWin = playerVotes > rivalVotes;
                const title = isWin ? "CONGRATULATIONS!" : "BETTER LUCK NEXT TIME!";
                const actionVerb = window.elPresidenteElection ? "intimidations" : "votes";
                const campaignTitle = window.elPresidenteElection ? "El Presidente campaign" : "campaign";
                const message = isWin 
                    ? `You won the ${campaignTitle}! You got ${playerVotes} ${actionVerb} against the rival's ${rivalVotes}!` 
                    : `Campaign failed! The rival won with ${rivalVotes} ${actionVerb} against your ${playerVotes}.`;
                this._showSplashGameOver(title, message, false);
            } else {
                this._showSplashGameOver("TIME'S UP!", `Your shift is over! You earned $${this.trashManager.totalPoints}.`, false);
            }
            return;
        }

        // Frenzy/Politics/Flowers/Crime/Cult/Builder Mode updates
        if (window.frenzyMode || window.flowersMode || window.politicsMode || window.elPresidenteElection || window.cultMode || window.crimeMode || window.builderMode) {
            this.npcManager.update();
        }

        // Rival Candidate update logic
        if ((window.politicsMode || window.elPresidenteElection) && this.rivalCandidates && this.rivalCandidates.length > 0) {
            for (const rival of this.rivalCandidates) {
                if (!rival.targetNPC || !this.npcManager.npcs.includes(rival.targetNPC) || rival.targetNPC.shaken) {
                    let nearest = null;
                    let minDist = Infinity;
                    for (const npc of this.npcManager.npcs) {
                        if (!npc.shaken) {
                            const dx = npc.x - rival.x;
                            const dy = npc.y - rival.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < minDist) {
                                minDist = dist;
                                nearest = npc;
                            }
                        }
                    }
                    rival.targetNPC = nearest;
                }

                if (rival.targetNPC) {
                    const target = rival.targetNPC;
                    const dx = target.x - rival.x;
                    const dy = target.y - rival.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 5) {
                        const rSpeed = rival.speed;
                        const vx = (dx / dist) * rSpeed;
                        const vy = (dy / dist) * rSpeed;
                        
                        const nextX = rival.x + vx * 60 * dt;
                        const nextY = rival.y + vy * 60 * dt;
                        
                        // Collision check for rivals
                        const tx = Math.floor(nextX / TILE_SIZE);
                        const ty = Math.floor(nextY / TILE_SIZE);
                        const curTX = Math.floor(rival.x / TILE_SIZE);
                        const curTY = Math.floor(rival.y / TILE_SIZE);
                        
                        if (this.gameMap.isWalkable(tx, ty, curTX, curTY)) {
                            rival.x = nextX;
                            rival.y = nextY;
                        } else {
                            const txX = Math.floor(nextX / TILE_SIZE);
                            const tyX = Math.floor(rival.y / TILE_SIZE);
                            if (this.gameMap.isWalkable(txX, tyX, curTX, curTY)) {
                                rival.x = nextX;
                            } else {
                                const txY = Math.floor(rival.x / TILE_SIZE);
                                const tyY = Math.floor(nextY / TILE_SIZE);
                                if (this.gameMap.isWalkable(txY, tyY, curTX, curTY)) {
                                    rival.y = nextY;
                                }
                            }
                        }
                    } else {
                        rival.votes++;
                        if (window.elPresidenteElection) {
                            this.hud.showFollowerNotification(`Rival intimidated ${target.name}! (+1 Rival Intimidation)`, false);
                        } else {
                            this.hud.showFollowerNotification(`Rival shook hands with ${target.name}! (+1 Rival Vote)`, false);
                        }
                        this.npcManager.npcs = this.npcManager.npcs.filter(n => n !== target);
                        this.npcManager.spawnSingleNPC(this.gameMap);
                        rival.targetNPC = null;
                    }
                }
            }
        }
        
        if (window.frenzyMode) {
            this.pirateManager.update(dt, this);

            // Check if player intersects with any alive pirate
            if (this.player) {
                for (const pirate of this.pirateManager.pirates) {
                    if (pirate.alive) {
                        const dx = this.player.x - pirate.x;
                        const dy = this.player.y - pirate.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < TILE_SIZE * 0.6) {
                            // Player fights the pirate!
                            const posseCount = this.followerManager.getFollowerCount();
                            const totalPosse = posseCount + 1; // player counts as a posse member
                            let winChance = 0.5;
                            if (totalPosse < 6) {
                                winChance -= (6 - totalPosse) * 0.05;
                            } else {
                                winChance += (totalPosse - 6) * 0.10;
                            }
                            winChance += (this.protectionBonus || 0) / 100;
                            
                            // Clamp win chance
                            if (winChance > 0.95) winChance = 0.95;
                            if (winChance < 0.05) winChance = 0.05;

                            const roll = Math.random();
                            const playerWon = roll < winChance;

                            if (playerWon) {
                                pirate.alive = false;
                                this.hud.showFollowerNotification('Defeated pirate!', true);
                            } else {
                                const hadTruck = !!window.playerHasTruck;
                                const msg = hadTruck 
                                    ? "The pirates defeated you and drove off with Bruno the Trash Truck! All earnings this round were lost."
                                    : "The pirates defeated you! All earnings this round were lost.";
                                this._showSplashGameOver("WASTED BY PIRATES", msg, true);
                                return;
                            }
                        }
                    }
                }
            }
        }

        // Crime or Politics (with mafia votes) updates
        if ((window.crimeMode || (window.politicsMode && this.acceptedMafiaVotes) || this.priceFixingActive) && this.crimeManager) {
            if (window.crimeMode) {
                this.npcManager.update();
                this.npcManager.checkInteraction(this.player.x, this.player.y);
            }
            this.crimeManager.update(dt, this);

            // Check gold bags interaction
            if (this.crimeManager.activeTask && this.crimeManager.activeTask.type === 'rob_bank') {
                for (const bag of this.crimeManager.goldBags) {
                    if (!bag.collected) {
                        const dx = this.player.x - bag.x;
                        const dy = this.player.y - bag.y;
                        if (Math.sqrt(dx * dx + dy * dy) < TILE_SIZE * 0.6) {
                            bag.collected = true;
                            this.trashManager.totalPoints += 1000;
                            this.hud.updateScore(this.trashManager.totalPoints);
                            this.hud.showFollowerNotification('+$1,000 Gold Bag!', true);
                            
                            // Spawn police on first bag
                            if (!this.crimeManager.policeActive) {
                                this.crimeManager.policeActive = true;
                                this.crimeManager.policeSpawnTimer = 0;
                                const station = this.gameMap.buildings[1];
                                if (station && station.doorTiles.length > 0) {
                                    const door = station.doorTiles[0];
                                    for (let i = 0; i < 3; i++) {
                                        this.crimeManager.police.push(new PoliceOfficer(door.x, door.y));
                                    }
                                }
                                this.hud.showFollowerNotification('🚨 ALARM! Police dispatched!', true);
                            }

                            // Check complete
                            const remaining = this.crimeManager.goldBags.filter(b => !b.collected).length;
                            if (remaining === 0) {
                                this.crimeManager.completeTask(this);
                            }
                        }
                    }
                }
            }

            // Check if player is near any Don or Police Chief to show HUD prompt
            let nearDon = false;
            const px = ((this.player.x % MAP_PIXEL_W) + MAP_PIXEL_W) % MAP_PIXEL_W;
            const py = ((this.player.y % MAP_PIXEL_H) + MAP_PIXEL_H) % MAP_PIXEL_H;
            for (const don of this.crimeManager.dons) {
                const dist = Math.sqrt((px - don.x)**2 + (py - don.y)**2);
                if (dist < TILE_SIZE * 1.5) {
                    nearDon = true;
                    this.hud.showFollowerNotification(`Press [E] to talk to ${don.name}`, false);
                    break;
                }
            }

            if (!nearDon && this.crimeManager.madeMan && this.crimeManager.policeChief) {
                const chiefDist = Math.sqrt((px - this.crimeManager.policeChief.x)**2 + (py - this.crimeManager.policeChief.y)**2);
                if (chiefDist < TILE_SIZE * 1.5) {
                    this.hud.showFollowerNotification('Press [E] to Bribe Police Chief', false);
                }
            }
        }

        // Update player
        this.player.update(this.gameMap, dt);

        // Update traffic cars
        if (this.carManager) {
            this.carManager.update(dt, this);
        }

        // Check if player enters/exits building for notifications and interior trash spawn
        const curTX = this.player.getTileX();
        const curTY = this.player.getTileY();
        const curBldg = this.gameMap.getBuildingAtTile(curTX, curTY);
        const isCurrentlyInside = curBldg && this.gameMap.openDoors.has(curBldg.id);
        
        if (isCurrentlyInside && !this._playerInsideBuildingLastFrame) {
            this.hud.showFollowerNotification('Entered building! Posse stays outside.', true);
        } else if (!isCurrentlyInside && this._playerInsideBuildingLastFrame) {
            this.hud.showFollowerNotification('Exited building! Posse reconnected.', true);
        }
        this._playerInsideBuildingLastFrame = isCurrentlyInside;

        // Interior trash spawning
        if (isCurrentlyInside) {
            this.buildingTrashTimer = (this.buildingTrashTimer || 0) + dt;
            if (this.buildingTrashTimer >= 1.0) {
                this.buildingTrashTimer -= 1.0;
                
                const tiles = curBldg.tiles.filter(t => {
                    const isDoor = curBldg.doorTiles.some(d => d.x === t.x && d.y === t.y);
                    const hasTrash = this.trashManager.items.some(item => !item.collected && item.tileX === t.x && item.tileY === t.y);
                    return !isDoor && !hasTrash;
                });
                
                if (tiles.length > 0) {
                    const t = tiles[Math.floor(Math.random() * tiles.length)];
                    const trashType = Math.floor(Math.random() * 4); // 0-3
                    this.trashManager.items.push(new TrashItem(t.x, t.y, trashType));
                }
            }
        }

        // Update truck chain
        if (this.truckChain && this.truckChain.length > 0) {
            let possibleLeaders = [this.player];
            if (this.organizers && this.organizers.length > 0) {
                possibleLeaders.push(...this.organizers);
            }
            let tails = [...possibleLeaders];
            
            for (let i = 0; i < this.truckChain.length; i++) {
                const truck = this.truckChain[i];
                const leaderIndex = i % possibleLeaders.length;
                let leaderHistory = tails[leaderIndex].positionHistory;
                truck.update(leaderHistory, this.gameMap);
                tails[leaderIndex] = truck;
            }
        }

        // Update parade
        if (this.paradeActive && this.paradeSegments && this.paradeSegments.length > 0) {
            const mapPixelMax = this.paradeDirection === 'horizontal' ? MAP_PIXEL_W : MAP_PIXEL_H;
            this.paradePosition = (this.paradePosition + this.paradeSpeed * dt) % mapPixelMax;

            // Cooldown check for collisions
            if (!this.paradeHitCooldown || this.paradeHitCooldown <= 0) {
                const px = this.player.x;
                const py = this.player.y;
                let collided = false;

                for (const seg of this.paradeSegments) {
                    let sx, sy;
                    if (this.paradeDirection === 'horizontal') {
                        sx = ((this.paradePosition - seg.offset) % MAP_PIXEL_W + MAP_PIXEL_W) % MAP_PIXEL_W;
                        sy = this.paradeRoadIndex * TILE_SIZE + TILE_SIZE / 2;
                    } else {
                        sx = this.paradeRoadIndex * TILE_SIZE + TILE_SIZE / 2;
                        sy = ((this.paradePosition - seg.offset) % MAP_PIXEL_H + MAP_PIXEL_H) % MAP_PIXEL_H;
                    }

                    const dx = px - sx;
                    const dy = py - sy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < TILE_SIZE * 0.8) {
                        collided = true;
                        break;
                    }
                }

                if (collided) {
                    const count = this.getRoundTotalFollowers();
                    if (count > 0) {
                        this._removeSequentialFollower();
                        this.hud.showFollowerNotification("A posse member was run over by the parade!", false);
                    }
                    this.paradeHitCooldown = 1.5; // 1.5s invincibility
                }
            } else {
                this.paradeHitCooldown -= dt;
            }
        }

        // Update followers
        this.followerManager.update(this.player, this.gameMap);

        // Check trash pickup — followers automatically clean up trash
        const pickupRadius = TILE_SIZE * 0.7;
        let followerPicked = [];
        for (const follower of this.followerManager.followers) {
            let maxToPick = Infinity;
            if (window.playerHasTruck > 0) {
                const maxCap = window.playerHasTruck * 100;
                maxToPick = Math.max(0, maxCap - (this.trashCollectedInTruck + followerPicked.length));
            }
            if (maxToPick <= 0) {
                if (window.playerHasTruck > 0 && (!this.lastCapacityNotificationTime || Date.now() - this.lastCapacityNotificationTime > 3000)) {
                    this.hud.showFollowerNotification("Garbage truck full! Unload at the Dump.", false);
                    this.lastCapacityNotificationTime = Date.now();
                }
                break; // Stop loop since truck is completely full
            }
            const picked = this.trashManager.checkPickup(follower.x, follower.y, pickupRadius * 0.8, this.getRoundTotalFollowersForValue(), maxToPick);
            followerPicked = followerPicked.concat(picked);
        }

        if (followerPicked.length > 0) {
            if (window.playerHasTruck > 0) {
                this.trashCollectedInTruck += followerPicked.length;
                if (this.trashCollectedInTruck >= window.playerHasTruck * 100) {
                    this.hud.showFollowerNotification("Garbage truck full! Unload at the Dump.", false);
                }
            }
            this.hud.updateScore(this.trashManager.totalPoints);
            this.trashCollectedInWindow += followerPicked.length;
            this.trashCollectedInRound = (this.trashCollectedInRound || 0) + followerPicked.length;
            this.trashManager.spawnMore(this.gameMap, followerPicked.length);
        }

        // Update Organizers and their followers' autonomous trash pickup
        if (this.organizers) {
            for (const org of this.organizers) {
                org.update(dt);
                
                let maxToPick = Infinity;
                if (window.playerHasTruck > 0) {
                    const animalPenalty = this.player.capturedAnimals ? this.player.capturedAnimals.length * 10 : 0;
                    const maxCap = Math.max(0, window.playerHasTruck * 100 - animalPenalty);
                    maxToPick = Math.max(0, maxCap - this.trashCollectedInTruck);
                }
                
                let orgFollowerPicked = [];
                for (const follower of org.followerManager.followers) {
                    if (maxToPick <= 0) {
                        break;
                    }
                    const picked = this.trashManager.checkPickup(follower.x, follower.y, pickupRadius * 0.8, this.getRoundTotalFollowersForValue(), maxToPick);
                    orgFollowerPicked = orgFollowerPicked.concat(picked);
                    if (window.playerHasTruck > 0) {
                        maxToPick = Math.max(0, maxToPick - picked.length);
                    }
                }
                
                if (orgFollowerPicked.length > 0) {
                    if (window.playerHasTruck > 0) {
                        this.trashCollectedInTruck += orgFollowerPicked.length;
                        if (this.trashCollectedInTruck >= window.playerHasTruck * 100) {
                            this.hud.showFollowerNotification("Garbage truck full! Unload at the Dump.", false);
                        }
                    }
                    this.hud.updateScore(this.trashManager.totalPoints);
                    this.trashCollectedInWindow += orgFollowerPicked.length;
                    this.trashCollectedInRound = (this.trashCollectedInRound || 0) + orgFollowerPicked.length;
                    this.trashManager.spawnMore(this.gameMap, orgFollowerPicked.length);
                }
            }
        }

        // Update Dragons and their followers' autonomous trash pickup
        if (this.dragons) {
            for (const drag of this.dragons) {
                drag.update(dt);
                
                let dragFollowerPicked = [];
                for (const follower of drag.followerManager.followers) {
                    const picked = this.trashManager.checkPickup(follower.x, follower.y, pickupRadius * 0.8, this.getRoundTotalFollowersForValue(), Infinity);
                    dragFollowerPicked = dragFollowerPicked.concat(picked);
                }
                
                if (dragFollowerPicked.length > 0) {
                    const totalFollowers = this.getRoundTotalFollowersForValue();
                    const pointValue = Math.max(1, Math.round(Math.sqrt(16 * totalFollowers))) * dragFollowerPicked.length;
                    this.trashManager.totalPoints += pointValue;
                    
                    dragFollowerPicked.forEach(item => {
                        const wrapped = nearestWrap(item.x, item.y, this.camera.getCenterX(), this.camera.getCenterY());
                        this.trashManager.pickupEffects.push({
                            x: wrapped.x,
                            y: wrapped.y,
                            text: `🔥 +$${Math.max(1, Math.round(Math.sqrt(16 * totalFollowers)))}`,
                            timer: 0,
                            alpha: 1,
                            color: '#ff6600',
                        });
                    });
                    
                    this.hud.updateScore(this.trashManager.totalPoints);
                    this.trashCollectedInWindow += dragFollowerPicked.length;
                    this.trashCollectedInRound = (this.trashCollectedInRound || 0) + dragFollowerPicked.length;
                    this.trashManager.spawnMore(this.gameMap, dragFollowerPicked.length);
                }
            }
        }

        if (window.fastFoodMode) {
            // Hunger timer
            this.hungerTimer -= dt;
            
            const hungerPct = (this.hungerTimer / 45.0) * 100;
            if (hungerPct <= 25 && !this.hungerWarned25) {
                this.hungerWarned25 = true;
                this.hud.showFollowerNotification("Warning: hunger at 25%!", false);
            }
            if (hungerPct <= 10 && !this.hungerWarned10) {
                this.hungerWarned10 = true;
                this.hud.showFollowerNotification("Danger: hunger at 10%! Your posse is starving!", false);
            }

            if (this.hungerTimer <= 0) {
                this.hungerTimer = 45.0;
                this.hungerWarned25 = false;
                this.hungerWarned10 = false;
                const count = this.getRoundTotalFollowers();
                const toLose = Math.floor(count / 2);
                for (let i = 0; i < toLose; i++) {
                    this._removeSequentialFollower();
                }
                if (toLose > 0) {
                    this.hud.showFollowerNotification(`Starved! Lost ${toLose} posse members!`, false);
                }
            }

            // Health Insurance timer
            if (this.hasHealthInsurance) {
                this.insurancePaymentTimer -= dt;
                if (this.insurancePaymentTimer <= 0) {
                    this.insurancePaymentTimer = 10.0;
                    const count = this.getRoundTotalFollowers();
                    if (count > 0) {
                        const insCost = 10 * Math.max(1, window.playerHasTruck || 0) * count;
                        this.trashManager.totalPoints = Math.max(0, this.trashManager.totalPoints - insCost);
                        this.hud.showFollowerNotification(`Paid $${insCost} for health insurance.`, false);
                        this.hud.updateScore(this.trashManager.totalPoints);
                    }
                }
            }

            // Fast Food Suspension Timer
            if (this.fastFoodSuspensionTimer > 0) {
                this.fastFoodSuspensionTimer -= dt;
            }
        }
        
        // International Travel Sickness Timer & Logic
        if (window.travelDestination) {
            // Sickness slows down the player
            this.player.speedMultiplier = this.sick ? 0.5 : 1.0;
            
            // Check if player has Quinine to cure sickness
            if (this.sick) {
                if (this.hasHealthInsurance) {
                    this.sick = false;
                    this.hud.showFollowerNotification("Health insurance covered your sickness!", true);
                    this.player.speedMultiplier = 1.0;
                } else if (window.playerInventory && window.playerInventory['Quinine'] > 0) {
                    this.sick = false;
                    window.playerInventory['Quinine'] -= 1;
                    window.apiCall('/api/game/consume', 'POST', { item_name: 'Quinine' }).catch(e => console.error(e));
                    this.hud.showFollowerNotification("Automatically consumed Quinine! Sickness cured.", true);
                    this.player.speedMultiplier = 1.0;
                }
            }
            
            if (!this.sick) {
                this.sicknessTimer -= dt;
                if (this.sicknessTimer <= 0) {
                    this.sicknessTimer = 30.0;
                    const chance = 0.25; // 25% chance for all countries
                    if (Math.random() < chance) {
                        this.sick = true;
                        this.hud.showFollowerNotification("You've fallen sick! Movement speed halved. Buy Quinine!", false);
                    }
                }
            }
            
            // Check stranded condition
            if (window.playerBalance < 0) {
                document.getElementById('stranded-screen').classList.remove('hidden');
                this.state = GameState.UI_OVERLAY;
                return;
            }
        }

        // Follower economy logic (10-second window)
        this.followerCheckTimer += dt;
        if (this.followerCheckTimer >= 10) {
            this.followerCheckTimer -= 10;
            const baseFollowers = (window.playerHasTruck ? (window.playerHasTruck * 2) : 0) + (window.employeesHired || 0);
            if (this.trashCollectedInWindow >= 7) {
                this._addSequentialFollower();
            } else if (this.trashCollectedInWindow < 5) {
                const totalCurrent = this.getRoundTotalFollowers();
                if (totalCurrent > baseFollowers) {
                    if (window.fastFoodMode && this.fastFoodSuspensionTimer > 0) {
                        // Trash requirement suspended!
                    } else {
                        this._removeSequentialFollower();
                    }
                }
            }
            this.trashCollectedInWindow = 0;
            this.hud.followerCount = this.getRoundTotalFollowers();
        }

        // Check if player is near any trash to display a "Press P" hint
        this.playerNearTrash = false;
        for (const item of this.trashManager.items) {
            if (item.collected) continue;
            const dx = this.player.x - item.x;
            const dy = this.player.y - item.y;
            if (Math.sqrt(dx * dx + dy * dy) < TILE_SIZE * 0.9) {
                this.playerNearTrash = true;
                break;
            }
        }

        // Update trash (respawning, effects)
        this.trashManager.update(this.gameMap);

        // Update camera
        this.camera.follow(this.player.x, this.player.y);

        // ── Phase 3: Builder Mode — building price cache viewport invalidation ──
        if (window.builderMode && this.buildingPriceCache && this.buildingPriceCache.size > 0) {
            for (const [idx, price] of this.buildingPriceCache.entries()) {
                const bldg = this.gameMap.buildings[idx];
                if (bldg && bldg.tiles.length > 0) {
                    let cx = 0, cy = 0;
                    for (const t of bldg.tiles) { cx += t.x; cy += t.y; }
                    cx = (cx / bldg.tiles.length) * TILE_SIZE + TILE_SIZE / 2;
                    cy = (cy / bldg.tiles.length) * TILE_SIZE + TILE_SIZE / 2;
                    const wrapped = nearestWrap(cx, cy, this.camera.getCenterX(), this.camera.getCenterY());
                    if (!this.camera.isVisible(wrapped.x - 200, wrapped.y - 200, 400, 400)) {
                        this.buildingPriceCache.delete(idx);
                    }
                }
            }
        }
    }

    _render() {
        const btnWordGame = document.getElementById('btn-open-word-game');
        if (btnWordGame) {
            btnWordGame.style.display = (this.state === GameState.PLAYING) ? 'block' : 'none';
        }

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        if (this.lastLoggedState !== this.state) {
            this.lastLoggedState = this.state;
            if (window.gameLog) window.gameLog(`_render: state is now: ${this.state}`);
        }

        // Clear
        ctx.filter = 'none';
        
        // Apply grayscale CSS filter to the canvas element for Questlove mode (hardware-accelerated)
        if (window.chaosMode && window.chaosLevel === 3) {
            this.canvas.style.filter = 'grayscale(100%)';
        } else {
            this.canvas.style.filter = 'none';
        }

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        switch (this.state) {
            case GameState.LOADING:
                this._renderLoading(ctx, w, h);
                break;
            case GameState.CHARACTER_SELECT:
                this._renderCharacterSelect(ctx, w, h);
                break;
            case GameState.PLAYING:
                this._renderGame(ctx, w, h);
                break;
            case GameState.GAME_OVER:
                this._renderGame(ctx, w, h);
                this.hud.renderGameOver(ctx, w, h);
                break;
        }
    }

    _renderError() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(200,0,0,0.8)';
        ctx.fillRect(10, 10, 500, 80);
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('ERROR: ' + (this.errorLog[this.errorLog.length - 1] || 'Unknown'), 20, 35);
        ctx.fillText('Check browser console (F12) for details.', 20, 55);
    }

    _renderLoading(ctx, w, h) {
        ctx.fillStyle = '#0f8';
        ctx.font = 'bold 20px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LOADING...', w / 2, h / 2);

        const progress = this.spriteManager.getLoadingProgress();
        const barW = 300;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(w / 2 - barW / 2, h / 2 + 20, barW, 20);
        ctx.fillStyle = '#0f8';
        ctx.fillRect(w / 2 - barW / 2, h / 2 + 20, barW * progress, 20);
    }

    _renderCharacterSelect(ctx, w, h) {
        // Background — subtle gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0a0e1a');
        bgGrad.addColorStop(0.5, '#1a1a3e');
        bgGrad.addColorStop(1, '#0a1a2a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Animated particles in background
        const time = performance.now() / 1000;
        ctx.fillStyle = 'rgba(100,200,255,0.1)';
        for (let i = 0; i < 30; i++) {
            const px = (Math.sin(time + i * 2.1) * 0.5 + 0.5) * w;
            const py = (Math.cos(time * 0.7 + i * 1.7) * 0.5 + 0.5) * h;
            ctx.beginPath();
            ctx.arc(px, py, 2 + Math.sin(time + i) * 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Title
        const splashImg = this.spriteManager.getImage('splash');
        if (splashImg && (splashImg.complete || splashImg instanceof HTMLCanvasElement)) {
            const splashW = 400;
            const splashH = 225;
            ctx.drawImage(splashImg, w / 2 - splashW / 2, 10, splashW, splashH);
        } else {
            ctx.fillStyle = '#0f8';
            ctx.font = 'bold 36px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('TRASH MASTER', w / 2, 80);
        }

        // Subtitle glow
        ctx.fillStyle = '#68f';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillText('Choose Your Character', w / 2, 260);

        // Character cards
        const cardW = 140;
        const cardH = 190;
        const cardGap = 20;
        const totalW = SPRITE_CONFIG.characters.length * (cardW + cardGap) - cardGap;
        const startX = (w - totalW) / 2;
        const startY = (h - cardH) / 2 + 80;

        for (let i = 0; i < SPRITE_CONFIG.characters.length; i++) {
            const char = SPRITE_CONFIG.characters[i];
            const cx = startX + i * (cardW + cardGap);
            const cy = startY;
            const isHover = this.hoverCharIndex === i;

            // Card background
            const cardAlpha = isHover ? 0.9 : 0.6;
            ctx.fillStyle = `rgba(20,30,50,${cardAlpha})`;
            ctx.beginPath();
            ctx.roundRect(cx, cy, cardW, cardH, 12);
            ctx.fill();

            // Card border
            ctx.strokeStyle = isHover ? '#0f8' : 'rgba(100,200,255,0.3)';
            ctx.lineWidth = isHover ? 2.5 : 1;
            ctx.beginPath();
            ctx.roundRect(cx, cy, cardW, cardH, 12);
            ctx.stroke();

            // Hover glow effect
            if (isHover) {
                ctx.shadowColor = '#0f8';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.roundRect(cx, cy, cardW, cardH, 12);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // Character sprite
            const img = this.spriteManager.getCharacterImage(char.id);
            const spriteSize = 90;
            const spriteX = cx + (cardW - spriteSize) / 2;
            const spriteY = cy + 15;

            if (img && (img.complete || img instanceof HTMLCanvasElement)) {
                const bob = isHover ? Math.sin(time * 3) * 3 : 0;
                ctx.drawImage(img, spriteX, spriteY + bob, spriteSize, spriteSize);
            }

            // Character name
            ctx.fillStyle = isHover ? '#fff' : '#aaa';
            ctx.font = 'bold 10px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(char.name, cx + cardW / 2, cy + cardH - 40);

            // Color indicator dot
            ctx.fillStyle = char.color;
            ctx.beginPath();
            ctx.arc(cx + cardW / 2, cy + cardH - 20, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Instructions
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Click a character to begin!', w / 2, startY + cardH + 40);
        ctx.fillText('Collect trash • Earn followers • Beat the clock!', w / 2, startY + cardH + 60);

        // Store card positions for click detection
        this._charCards = SPRITE_CONFIG.characters.map((_, i) => ({
            x: startX + i * (cardW + cardGap),
            y: startY,
            w: cardW,
            h: cardH,
        }));
    }

    _updateCharHover() {
        this.hoverCharIndex = -1;
        if (!this._charCards) return;

        for (let i = 0; i < this._charCards.length; i++) {
            const card = this._charCards[i];
            if (
                this.mouseX >= card.x && this.mouseX <= card.x + card.w &&
                this.mouseY >= card.y && this.mouseY <= card.y + card.h
            ) {
                this.hoverCharIndex = i;
                break;
            }
        }
    }

    _handleCharSelect(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        if (!this._charCards) return;

        for (let i = 0; i < this._charCards.length; i++) {
            const card = this._charCards[i];
            if (
                clickX >= card.x && clickX <= card.x + card.w &&
                clickY >= card.y && clickY <= card.y + card.h
            ) {
                this.selectedCharIndex = i;
                this._startGame(SPRITE_CONFIG.characters[i].id);
                break;
            }
        }
    }

    _startGame(spriteId) {
        if (window.gameLog) window.gameLog(`Game._startGame() called with spriteId: ${spriteId}`);
        if (window.travelDestination) {
            window.playerHasTruck = false; // Disable truck abroad
        }
        this.gameMap = new GameMap();
        this.miniMap.buildStatic(this.gameMap);
        // Find a walkable spawn point — start on a road near center
        let spawnX = 5, spawnY = 5; // Default to first road intersection area
        // Search for a walkable road tile near center
        for (let r = 0; r < 20; r++) {
            let found = false;
            for (let dy = -r; dy <= r && !found; dy++) {
                for (let dx = -r; dx <= r && !found; dx++) {
                    const tx = 32 + dx;
                    const ty = 32 + dy;
                    if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
                        const tile = this.gameMap.getTile(tx, ty);
                        // Prefer spawning on roads or sidewalks
                        if (tile === TileType.ROAD || tile === TileType.SIDEWALK || tile === TileType.CROSSWALK) {
                            spawnX = tx;
                            spawnY = ty;
                            found = true;
                        }
                    }
                }
            }
            if (found) break;
        }

        console.log(`Spawning player at tile (${spawnX}, ${spawnY}), world (${spawnX * TILE_SIZE}, ${spawnY * TILE_SIZE}), tile type: ${this.gameMap.getTile(spawnX, spawnY)}`);

        this.player = new Player(spawnX, spawnY, spriteId);
        this.followerManager = new FollowerManager();
        this.followerManager.initialize(spriteId);
        
        // Add Truck base followers + Hired employees
        const baseFollowers = (window.playerHasTruck ? (window.playerHasTruck * 2) : 0) + (window.employeesHired || 0);
        for(let i=0; i<baseFollowers; i++) {
            this.followerManager.addFollower(this.player.x, this.player.y);
        }

        // Initialize truck chain & capacity tracking
        this.truckChain = [];
        this.trashCollectedInTruck = 0;
        this.trashCollectedInRound = 0;
        if (window.playerHasTruck > 1) {
            for (let i = 0; i < window.playerHasTruck - 1; i++) {
                this.truckChain.push(new GarbageTruckFollower(this.player.x, this.player.y, i));
            }
        }

        this.trashManager = new TrashManager();
        let initialTrash = 150; // Spawn 25% more trash (was 120)
        
        // Check Filthadelphia
        if (window.playerInventory && window.playerInventory['Filthadelphia'] > 0) {
            initialTrash *= 2;
            window.apiCall('/api/game/consume', 'POST', { item_name: 'Filthadelphia' }).then(() => {
                window.playerInventory['Filthadelphia'] -= 1;
                console.log("Consumed Filthadelphia!");
            }).catch(e => console.error(e));
        }

        // Check Parade Mode
        this.paradeActive = false;
        this.paradeSegments = [];
        this.paradeHitCooldown = 0;
        if (window.playerInventory && window.playerInventory['Parade'] > 0) {
            this.paradeActive = true;
            initialTrash *= 2; // stack spawning with Filthadelphia
            window.apiCall('/api/game/consume', 'POST', { item_name: 'Parade' }).then(() => {
                window.playerInventory['Parade'] -= 1;
                console.log("Consumed Parade!");
            }).catch(e => console.error(e));

            // Select route
            const hRoads = [2, 3, 12, 13, 22, 23, 32, 33, 42, 43, 52, 53];
            const vRoads = [4, 5, 14, 15, 24, 25, 34, 35, 44, 45, 54, 55];
            this.paradeDirection = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            if (this.paradeDirection === 'horizontal') {
                this.paradeRoadIndex = hRoads[Math.floor(Math.random() * hRoads.length)];
            } else {
                this.paradeRoadIndex = vRoads[Math.floor(Math.random() * vRoads.length)];
            }
            this.paradePosition = 0;
            this.paradeSpeed = 120; // pixels per second

            // Create segments
            for (let i = 0; i < 40; i++) {
                let type = 'npc';
                if (i % 6 === 0) type = 'red_truck';
                else if (i % 3 === 0) type = 'balloon';
                this.paradeSegments.push({
                    type: type,
                    offset: i * TILE_SIZE
                });
            }
        }

        this.trashManager.spawnInitial(this.gameMap, initialTrash);
        this.trashManager.spawnNear(this.gameMap, spawnX, spawnY, 8, Math.floor(initialTrash * 0.5));
        
        this.hud.reset();
        this.hud.followerCount = this.getRoundTotalFollowers ? this.getRoundTotalFollowers() : this.followerManager.getFollowerCount();
        
        this.npcManager = new NPCManager();
        this.npcManager.spawnNPCs(this.gameMap, this.gameMap.buildings, window.frenzyMode);

        // ── Phase 3: Lost Child Quest ──
        this.npcManager.spawnChildQuest(this.gameMap, this.gameMap.buildings);

        // ── Phase 3: Cult Mode ──
        this.loadWordGameState();
        this.happiness = (window.playerHappiness !== undefined ? window.playerHappiness : 100.0);
        this.cultLeavingTimer = 20.0 + Math.random() * 15.0; // first leaving dialog after 20-35s
        this.cultHappinessBufferTimer = 0;
        this.lastEatenFastFoodId = null;
        this.visitedDifferentRestaurantSinceLastEat = false;
        this.cultLeavesCumulative = window.cultLeavesCumulative || 0;
        if (window.cultMode) {
            this.hud.showFollowerNotification('⛪ Cult Mode: Church of Grimetology is active!', true);
        }

        // ── Phase 3: Builder Mode ──
        this.ownedBuildings = window._serverOwnedBuildings || [];
        this.buildingPriceCache = new Map(); // bldgIdx -> price
        this.totalVacancies = this.ownedBuildings.reduce((sum, b) => sum + Math.max(0, 5 - (b.tenants || 0)), 0);
        if (window.builderMode) {
            this.hud.showFollowerNotification('🏗️ Builder Mode: Press E at building doors to buy!', true);
        }
        this.pirateManager = new PirateManager();
        this.carManager.spawnCars(this.gameMap);
        // Retrieve and spawn organizers
        this.organizers = [];
        this.dragons = [];
        this.dragonMasterFollower = null;
        this.dragonSplashTimer = 0;
        let organizersCount = window.playerInventory ? (window.playerInventory['Organizer'] || 0) : 0;
        
        // Grant free organizers based on political rank
        const office = window.politicalOffice || 'citizen';
        let freeOrganizers = 0;
        if (office.includes('council')) freeOrganizers = 1;
        else if (office.includes('mayor')) freeOrganizers = 2;
        else if (office.includes('senator')) freeOrganizers = 4;
        else if (office.includes('president')) freeOrganizers = 8;
        
        organizersCount += freeOrganizers;
        
        for (let i = 0; i < organizersCount; i++) {
            this.organizers.push(new GameOrganizer(this, i));
        }

        // Split starting followers!
        const totalFollowersCount = this.followerManager.getFollowerCount();
        if (organizersCount > 0 && totalFollowersCount > 0) {
            const allStarting = [...this.followerManager.followers];
            this.followerManager.followers = [];
            
            let gIdx = 0;
            const totalGroups = organizersCount + 1;
            allStarting.forEach((f) => {
                if (gIdx === 0) {
                    f.index = this.followerManager.followers.length;
                    this.followerManager.followers.push(f);
                } else {
                    const org = this.organizers[gIdx - 1];
                    f.index = org.followerManager.followers.length;
                    org.followerManager.followers.push(f);
                }
                gIdx = (gIdx + 1) % totalGroups;
            });
        }
        this.nextFollowerGroupIndex = 0;
        this.rivalCandidates = [];
        window.elPresidenteElection = window.politicalOffice && window.politicalOffice.startsWith('candidate_el_presidente_') && window.travelDestination && window.politicalOffice.endsWith(window.travelDestination.toLowerCase());
        if (window.politicsMode || window.elPresidenteElection) {
            const office = window.politicalOffice || 'citizen';
            let numRivals = 1;
            let speed = 4.0; // Council (slow)
            
            if (window.elPresidenteElection) {
                numRivals = 2;
                speed = 7.0;
            } else if (office === 'candidate_mayor' || office === 'mayor') {
                numRivals = 2;
                speed = 8.0;
            } else if (office === 'candidate_senator' || office === 'senator') {
                numRivals = 3;
                speed = 11.0;
            } else if (office === 'candidate_president' || office === 'president') {
                numRivals = 4;
                speed = 14.0;
            } else {
                numRivals = 1;
                speed = 4.0;
            }

            for (let i = 0; i < numRivals; i++) {
                this.rivalCandidates.push({
                    id: i + 1,
                    x: (20 + i * 2) * TILE_SIZE + TILE_SIZE / 2,
                    y: (20 + i * 2) * TILE_SIZE + TILE_SIZE / 2,
                    speed: speed,
                    votes: 0,
                    targetNPC: null,
                });
            }
        }
        if (this.crimeManager) {
            this.crimeManager.initialize(this.gameMap);
        }
        this.buildingInterior = null;
        this.handshakesShaken = 0;
        this.protectionTimer = 0;
        this.protectionBonus = 0;
        this.employeesKilledThisRound = 0;
        
        this.followerCheckTimer = 0;
        this.employeeUpkeepTimer = 0;
        this.totalEmployeeCost = 0;
        this.flowers = [];
        this.trashCollectedInWindow = 0;
        this.playerNearTrash = false;
        
        this.mushroomTimer = 0;
        this.wingsTimer = 0;
        if (this.player) this.player.speedMultiplier = 1.0;

        // ── Trashpickers: check inventory, set flag for this round ──
        this.doubleTrashPickup = false;
        if (window.playerInventory && (window.playerInventory['Trashpickers'] || 0) > 0) {
            this.doubleTrashPickup = true;
            // Consume Trashpickers for this round
            window.apiCall('/api/game/consume', 'POST', { item_name: 'Trashpickers' }).then(() => {
                window.playerInventory['Trashpickers'] -= 1;
                console.log('Trashpickers consumed: doubleTrashPickup active for this round.');
            }).catch(e => console.error(e));
            this.hud.showFollowerNotification('🧹 Trashpickers active! Double pickup this round!', true);
        }

        // ── Price Fixing check inventory (Crime Mode only) ──
        this.priceFixingActive = false;
        this.policeBribeCooldown = 0;
        if (window.playerInventory && (window.playerInventory['Price Fixing'] || 0) > 0) {
            if (!window.crimeMode) {
                this.hud.showFollowerNotification('🚫 Price Fixing only works in Crime Mode!', false);
            } else {
                this.priceFixingActive = true;
                window.apiCall('/api/game/consume', 'POST', { item_name: 'Price Fixing' }).then(() => {
                    window.playerInventory['Price Fixing'] -= 1;
                    console.log('Price Fixing consumed: active for this round.');
                }).catch(e => console.error(e));
                this.hud.showFollowerNotification('🕶️ Price Fixing active! 1.25x trash value, but police are chasing!', true);
                
                if (this.crimeManager) {
                    this.crimeManager.police = [];
                    this.crimeManager.policeActive = true;
                    const station = this.gameMap.buildings[1];
                    let spawnX = 0, spawnY = 0;
                    if (station && station.doorTiles.length > 0) {
                        spawnX = station.doorTiles[0].x;
                        spawnY = station.doorTiles[0].y;
                    }
                    for (let i = 0; i < 12; i++) {
                        this.crimeManager.police.push(new PoliceOfficer(spawnX, spawnY, false));
                    }
                }
            }
        }

        // ── Chaos Mode Police Spawn ──
        if (window.chaosMode && window.chaosLevel >= 2) {
            if (this.crimeManager) {
                this.crimeManager.police = [];
                this.crimeManager.policeActive = true;
                const station = this.gameMap.buildings[1];
                let spawnX = 0, spawnY = 0;
                if (station && station.doorTiles.length > 0) {
                    spawnX = station.doorTiles[0].x;
                    spawnY = station.doorTiles[0].y;
                }
                for (let i = 0; i < 12; i++) {
                    this.crimeManager.police.push(new PoliceOfficer(spawnX, spawnY, false));
                }
            }
        }

        // Fast Food Mode State
        this.hungerTimer = 45.0;
        this.hungerWarned25 = false;
        this.hungerWarned10 = false;
        this.fastFoodSuspensionTimer = 0.0;
        this.hasHealthInsurance = false;
        this.insurancePaymentTimer = 10.0;
        
        this.internationalFollowersCollected = 0;
        this.sick = false;
        this.sicknessTimer = 30.0;

        // ── Character Class Initialization Rules ──
        const charClass = this.player ? this.player.characterClass : spriteId;
        this._applyCharacterClassInit(charClass);

        // Snap camera to player
        if (window.gameLog) window.gameLog(`_startGame: snapping camera to player x=${this.player.x}, y=${this.player.y}`);
        this.camera.snapTo(this.player.x, this.player.y);
        if (window.gameLog) window.gameLog(`_startGame: camera snapped to x=${this.camera.x}, y=${this.camera.y}, size: w=${this.camera.width}, h=${this.camera.height}`);

        if (window.dragonHoCheat || window.dragonMode) {
            const isCheat = window.dragonHoCheat;
            window.dragonHoCheat = false;
            if (!this.dragons) this.dragons = [];
            const dragon = new GameDragon(this, this.player.x + 32, this.player.y + 32);
            this.dragons.push(dragon);
            this.hud.showFollowerNotification(isCheat ? '🐲 Cheat active: Dragon spawned!' : '🐲 Burninator is active!', true);
        }

        if (window.politicsMode) {
            this.state = GameState.UI_OVERLAY;
            this.acceptedMafiaVotes = false;
            const dialog = document.getElementById('mafia-votes-dialog');
            if (dialog) dialog.classList.remove('hidden');
            if (window.gameLog) window.gameLog(`_startGame: politics mode active, pausing for mafia bribe dialog`);
        } else {
            this.state = GameState.PLAYING;
            if (window.gameLog) window.gameLog(`_startGame: state set to ${this.state}. Canvas size: w=${this.canvas.width}, h=${this.canvas.height}`);
        }
        console.log('Game state set. Player:', this.player);
    }

    // ── CHARACTER CLASS INITIALIZATION ──
    _applyCharacterClassInit(charClass) {
        if (!this.player) return;

        switch (charClass) {
            case 'char1': // Ranger
                // Default inventory: 1 animal slot (empty). Spawn random animal nodes on map.
                this.player.capturedAnimals = [];
                this._spawnAnimalNodes(8);
                this.hud.showFollowerNotification('🦊 Ranger: Press [C] near an animal to capture it!', true);
                break;

            case 'char2': // Student
                // Starts with 2 extra followers
                this.followerManager.addFollower(this.player.x, this.player.y);
                this.followerManager.addFollower(this.player.x, this.player.y);
                this.hud.followerCount = this.getRoundTotalFollowers();
                this.hud.showFollowerNotification('📚 Student: +2 starting followers!', true);
                break;

            case 'char3': // Scientist
                // 10 fertilizers, does not count toward inventory grid
                this.player.fertilizers = 10;
                // Expose to window.playerInventory ONLY for display; does not consume grid slots
                if (!window.playerInventory) window.playerInventory = {};
                window.playerInventory['Fertilizer'] = (window.playerInventory['Fertilizer'] || 0) + 10;
                this.hud.showFollowerNotification('🔬 Scientist: +10 Fertilizers loaded!', true);
                break;

            case 'char4': // Athlete
                // +10% speed. Suppressed in truck mode (handled in player.js update()).
                this.player.athleteBaseMultiplier = 1.1;
                if (!window.playerHasTruck) {
                    this.player.speedMultiplier = 1.1;
                } else {
                    // Truck mode: keep speedMultiplier at 1.0; bonus is zeroed in player.update()
                    this.player.speedMultiplier = 1.0;
                }
                this.hud.showFollowerNotification('🏃 Athlete: +10% movement speed active!', true);
                break;

            case 'char5': // Robot
                // +30 seconds to round timer
                this.hud.timeRemaining += 30;
                this.hud.showFollowerNotification('🤖 Robot: +30 seconds added to timer!', true);
                break;

            case 'char6': // Superhero
                // Grant 2 Wings instances directly to active utility slots (bypass inventory)
                // Activates Wings speed boost for 2 × 15s = 30s stacked.
                this.player.speedMultiplier = 1.5;
                this.wingsTimer = 30; // 2 × 15s stacked
                // Track the 2 Wings separately so they show in HUD
                this.superheroWingsCharges = 2;
                this.hud.showFollowerNotification('🦸 Superhero: 2x Wings activated (30s boost)!', true);
                break;

            default:
                break;
        }
    }

    // ── RANGER: Spawn animal nodes across the map ──
    _spawnAnimalNodes(count) {
        this.animalNodes = [];
        const animalTypes = ['fox', 'raccoon', 'squirrel', 'pigeon', 'cat'];
        let attempts = 0;
        while (this.animalNodes.length < count && attempts < count * 20) {
            attempts++;
            const tx = Math.floor(Math.random() * MAP_WIDTH);
            const ty = Math.floor(Math.random() * MAP_HEIGHT);
            const tile = this.gameMap.getTile(tx, ty);
            if (tile === TileType.ROAD || tile === TileType.SIDEWALK) {
                this.animalNodes.push({
                    x: tx * TILE_SIZE + TILE_SIZE / 2,
                    y: ty * TILE_SIZE + TILE_SIZE / 2,
                    type: animalTypes[Math.floor(Math.random() * animalTypes.length)],
                    captured: false
                });
            }
        }
    }

    // ── RANGER: Try to capture a nearby animal ──
    _rangerTryCaptureAnimal() {
        if (!this.player || !this.animalNodes) return;
        const px = this.player.x;
        const py = this.player.y;
        const maxAnimals = window.playerHasTruck ? 99 : 1;

        for (const node of this.animalNodes) {
            if (node.captured) continue;
            const dx = px - node.x;
            const dy = py - node.y;
            if (Math.sqrt(dx * dx + dy * dy) < TILE_SIZE * 1.2) {
                if (this.player.capturedAnimals.length >= maxAnimals) {
                    this.hud.showFollowerNotification(
                        window.playerHasTruck
                            ? 'Animal cargo full!'
                            : '🦊 Can only hold 1 animal without a Garbage Truck!',
                        false
                    );
                    return;
                }
                node.captured = true;
                this.player.capturedAnimals.push({ type: node.type });
                const cargoReduction = this.player.capturedAnimals.length * 10;
                this.hud.showFollowerNotification(
                    `🦊 Captured a ${node.type}! Cargo capacity -10 (total -${cargoReduction}).`, true
                );
                return;
            }
        }
        this.hud.showFollowerNotification('No animal nearby to capture.', false);
    }

    async _endRoundAndReturnToStore() {
        if (!window.apiCall) return; // Not logged in
        
        let earned = this.trashManager.totalPoints;

        if (window.flowersMode && window.targetParkId) {
            let flowerPayout = 0;
            for (const f of this.flowers) {
                if (!f.isMud && f.parkId === window.targetParkId && f.growTimeRemaining <= 0) {
                    if (f.plantedAtElapsed <= 60) {
                        flowerPayout += 250;
                    } else {
                        flowerPayout += 200;
                    }
                }
            }
            earned += flowerPayout;
        }
        const sacrifice_dragon = window.dragonMode ? confirm("Do you sacrifice 5 followers at the altar of the Burninator?") : false;
        try {
            const result = await window.apiCall('/api/game/end-round', 'POST', { 
                earned, 
                employee_cost: this.totalEmployeeCost,
                employees_killed: this.employeesKilledThisRound,
                followers: this.getRoundTotalFollowers(),
                trash_collected: this.trashCollectedInRound || 0,
                handshakes: this.handshakesShaken || 0,
                rival_handshakes: this.rivalCandidate ? this.rivalCandidate.votes : 0,
                international_followers_collected: this.internationalFollowersCollected || 0,
                cult_mode_active: !!window.cultMode,
                dragon_mode_active: !!window.dragonMode,
                sacrifice_dragon: sacrifice_dragon,
                happiness: parseFloat(this.happiness !== undefined ? this.happiness : 100.0),
                cult_leaves_cumulative: this.cultLeavesCumulative || 0
            });
            if (result && result.dragon_lost) {
                alert("🐉 Burninator has left your posse because you did not make the 5 follower sacrifice!");
            }
            window.employeesHired = 0;
            // Reset Trashpickers & Chaos Mode at round end
            this.doubleTrashPickup = false;
            window.chaosCheatActive = false;
            window.chaosMode = false;
            const chaosToggle = document.getElementById('chaos-toggle');
            if (chaosToggle) chaosToggle.checked = false;
            await window.refreshGameState();
            window.renderStore();

            if (result && result.multiplier && result.multiplier > 1) {
                alert(`🎱 Magic 8-Ball Activated! Your score was multiplied by ${result.multiplier}x!`);
            }
        } catch(e) {
            console.error("End round sync failed:", e);
        }
        window.showScreen('store-screen');
        this.state = GameState.UI_OVERLAY;
    }

    triggerDragonTransformation(masterFollower) {
        // Remove the dragon master follower from follower list
        this.followerManager.followers = this.followerManager.followers.filter(f => f !== masterFollower);
        this.dragonMasterFollower = null;
        
        // Re-index remaining followers
        for (let i = 0; i < this.followerManager.followers.length; i++) {
            this.followerManager.followers[i].index = i;
        }
        this.hud.followerCount = this.getRoundTotalFollowers();
        
        // Spawn a GameDragon at the location of the master follower
        if (!this.dragons) this.dragons = [];
        const dragon = new GameDragon(this, masterFollower.x, masterFollower.y);
        this.dragons.push(dragon);
        
        // Play the splash screen for 3.5 seconds
        this.dragonSplashTimer = 3.5;
        this.hud.showFollowerNotification('🐲 A Dragon has joined your posse!', true);
    }

    _renderDragonSplash(ctx, w, h) {
        ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
        ctx.fillRect(0, 0, w, h);

        // Draw a double retro border
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 6;
        ctx.strokeRect(10, 10, w - 20, h - 20);
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, w - 32, h - 32);

        // Center position
        const cx = w / 2;
        const cy = h / 2 - 20;

        // Draw retro pixel-art dragon in the center holding a trash bag in its talons!
        // Body (Green)
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(cx - 30, cy - 30, 60, 60);
        // Belly (Yellow)
        ctx.fillStyle = '#facc15';
        ctx.fillRect(cx - 10, cy - 10, 20, 40);
        // Head
        ctx.fillStyle = '#15803d';
        ctx.fillRect(cx - 20, cy - 65, 40, 35);
        // Snout
        ctx.fillRect(cx - 10, cy - 38, 35, 12);
        // Horns
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(cx - 25, cy - 75, 10, 10);
        ctx.fillRect(cx + 15, cy - 75, 10, 10);
        // Glowing Yellow Eyes
        ctx.fillStyle = '#facc15';
        ctx.fillRect(cx - 10, cy - 55, 6, 6);
        ctx.fillRect(cx + 4, cy - 55, 6, 6);
        // Wings (Red/orange)
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(cx - 65, cy - 20, 35, 25);
        ctx.fillRect(cx + 30, cy - 20, 35, 25);
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(cx - 55, cy - 10, 25, 15);
        ctx.fillRect(cx + 30, cy - 10, 25, 15);

        // Talons holding a trash bag
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(cx - 20, cy + 30, 12, 12);
        ctx.fillRect(cx + 8, cy + 30, 12, 12);

        // Trash bag in talons
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.arc(cx, cy + 45, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.fillRect(cx - 4, cy + 32, 8, 4); // bag tie

        // Text
        ctx.fillStyle = '#ffaa00';
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText("A DRAGON HAS JOINED", cx, cy + 90);
        ctx.fillText("YOUR POSSE!", cx, cy + 115);

        ctx.fillStyle = '#a855f7';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText("Incinerates trash with hot fire!", cx, cy + 145);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText("Posse members will follow it!", cx, cy + 160);
    }

    _restartGame() {
        this.gameMap = new GameMap();
        this.miniMap.buildStatic(this.gameMap);
        this.player = null;
        this.state = GameState.CHARACTER_SELECT;
    }

    _renderGame(ctx, w, h) {
        if (this.dragonSplashTimer > 0) {
            this._renderDragonSplash(ctx, w, h);
            return;
        }

        if (!this.hasLoggedRender) {
            this.hasLoggedRender = true;
            if (window.gameLog) {
                window.gameLog(`_renderGame FIRST call: w=${w}, h=${h}, player.x=${this.player ? this.player.x : 'null'}, camera.x=${this.camera ? this.camera.x : 'null'}, camera size: w=${this.camera ? this.camera.width : 'null'}, h=${this.camera ? this.camera.height : 'null'}`);
            }
        }

        const rotateWorld = (window.chaosMode && window.chaosLevel >= 4);

        if (rotateWorld) {
            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.rotate(Math.PI / 2);
            ctx.translate(-w / 2, -h / 2);
        }

        // Render map
        this.gameMap.render(ctx, this.camera, this.player);

        // Draw Fast Food & Hospital markers
        if ((window.fastFoodMode || window.cultMode) && this.spriteManager) {
            const ffImg = this.spriteManager.getImage('fast_food_sign');
            for (const bldg of this.gameMap.buildings) {
                if (!bldg || bldg.tiles.length === 0) continue;
                
                let cx = 0, cy = 0;
                for (const t of bldg.tiles) { cx += t.x; cy += t.y; }
                cx = (cx / bldg.tiles.length) * TILE_SIZE + TILE_SIZE/2;
                cy = (cy / bldg.tiles.length) * TILE_SIZE + TILE_SIZE/2;
                
                // Wrap the marker coordinates to the camera
                const wrapped = nearestWrap(cx, cy, this.camera.getCenterX(), this.camera.getCenterY());
                
                if (!this.camera.isVisible(wrapped.x - 100, wrapped.y - 100, 200, 200)) continue;
                const screen = this.camera.worldToScreen(wrapped.x, wrapped.y);
                
                if (bldg.type === 'hospital') {
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(screen.x - 6, screen.y - 20, 12, 40);
                    ctx.fillRect(screen.x - 20, screen.y - 6, 40, 12);
                } else if (bldg.type === 'fast_food' && ffImg) {
                    // Draw it much larger and centered
                    ctx.drawImage(ffImg, screen.x - 64, screen.y - 64, 128, 128);
                } else if (bldg.type === 'airport' && this.spriteManager) {
                    const aptImg = this.spriteManager.getImage('airport');
                    if (aptImg) {
                        ctx.drawImage(aptImg, screen.x - 128, screen.y - 128, 256, 256);
                    }
                }
            }
        }

        // Draw Dump marker
        if (window.playerHasTruck > 0 && this.spriteManager) {
            const dumpImg = this.spriteManager.getImage('dump');
            const dumpBldg = this.gameMap.buildings.find(b => b.type === 'dump');
            if (dumpBldg && dumpBldg.doorTiles && dumpBldg.doorTiles.length > 0) {
                const door = dumpBldg.doorTiles[0];
                const cx = door.x * TILE_SIZE + TILE_SIZE / 2;
                const cy = door.y * TILE_SIZE + TILE_SIZE / 2;
                const wrapped = nearestWrap(cx, cy, this.camera.getCenterX(), this.camera.getCenterY());
                if (this.camera.isVisible(wrapped.x - 100, wrapped.y - 100, 200, 200)) {
                    const screen = this.camera.worldToScreen(wrapped.x, wrapped.y);
                    if (dumpImg) {
                        ctx.drawImage(dumpImg, screen.x - 32, screen.y - 64, 64, 64);
                    }
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 8px "Press Start 2P", monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('DUMP', screen.x, screen.y - 70);
                }
            }
        }

        // Draw Philadelphia Landmark buildings (visible at all times)
        if (this.spriteManager) {
            const landmarks = {
                'cityhall': { img: 'philly_city_hall', label: 'CITY HALL' },
                'art_museum': { img: 'philly_art_museum', label: 'ART MUSEUM' },
                'liberty_bell': { img: 'philly_liberty_bell', label: 'LIBERTY BELL' },
                'one_liberty': { img: 'philly_one_liberty', label: 'ONE LIBERTY' },
                'franklin_institute': { img: 'philly_franklin_inst', label: 'FRANKLIN INST.' },
                'station': { img: 'philly_station', label: '30TH ST STATION' },
                'airport': { img: 'airport', label: 'AIRPORT' },
                'hospital': { img: 'hospital_landmark', label: 'HOSPITAL' },
                // Dahgbad Landmarks
                'burj_khalifa': { img: 'burj_khalifa', label: 'BURJ KHALIFA' },
                'petra': { img: 'petra', label: 'PETRA' },
                'dome_of_rock': { img: 'dome_of_rock', label: 'DOME OF THE ROCK' },
                'pyramids': { img: 'pyramids', label: 'PYRAMIDS' },
                'burj_al_arab': { img: 'burj_al_arab', label: 'BURJ AL ARAB' },
                'kingdom_centre': { img: 'kingdom_centre', label: 'KINGDOM CENTRE' },
                // Cucaracha Landmarks
                'christ_redeemer': { img: 'christ_redeemer', label: 'CHRIST REDEEMER' },
                'machu_picchu': { img: 'machu_picchu', label: 'MACHU PICCHU' },
                'obelisco_ba': { img: 'obelisco_ba', label: 'OBELISCO' },
                'torre_entel': { img: 'torre_entel', label: 'TORRE ENTEL' },
                'palacio_salvo': { img: 'palacio_salvo', label: 'PALACIO SALVO' },
                'congresso_nacional': { img: 'congresso_nacional', label: 'CONGRESSO NACIONAL' }
            };

            for (const bldg of this.gameMap.buildings) {
                if (!bldg || bldg.tiles.length === 0) continue;
                const config = landmarks[bldg.type];
                if (!config) continue;

                let cx = 0, cy = 0;
                for (const t of bldg.tiles) { cx += t.x; cy += t.y; }
                cx = (cx / bldg.tiles.length) * TILE_SIZE + TILE_SIZE / 2;
                cy = (cy / bldg.tiles.length) * TILE_SIZE + TILE_SIZE / 2;

                const wrapped = nearestWrap(cx, cy, this.camera.getCenterX(), this.camera.getCenterY());
                if (!this.camera.isVisible(wrapped.x - 120, wrapped.y - 120, 240, 240)) continue;
                const screen = this.camera.worldToScreen(wrapped.x, wrapped.y);

                const img = this.spriteManager.getImage(config.img);
                if (img) {
                    ctx.drawImage(img, screen.x - 64, screen.y - 64, 128, 128);
                }
                
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 8px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(config.label, screen.x, screen.y - 70);
            }
        }

        if (window.frenzyMode) {
            this.gameMap.renderAddresses(ctx, this.camera);
            this.pirateManager.render(ctx, this.camera, this.spriteManager);
        }
        
        if (window.frenzyMode || window.flowersMode || window.politicsMode || window.elPresidenteElection || window.cultMode || window.crimeMode || window.builderMode) {
            this.npcManager.render(ctx, this.camera, this.spriteManager);
        }

        // ── Phase 3: Lost Child Quest building highlight ──
        if (this.npcManager && this.npcManager.childQuestBuilding && this.npcManager.childFollowing && !this.npcManager.childDelivered) {
            const qBldg = this.npcManager.childQuestBuilding;
            if (qBldg.tiles.length > 0) {
                let minTX = Infinity, minTY = Infinity, maxTX = -Infinity, maxTY = -Infinity;
                for (const t of qBldg.tiles) {
                    if (t.x < minTX) minTX = t.x;
                    if (t.y < minTY) minTY = t.y;
                    if (t.x > maxTX) maxTX = t.x;
                    if (t.y > maxTY) maxTY = t.y;
                }
                const wx = minTX * TILE_SIZE;
                const wy = minTY * TILE_SIZE;
                const ww = (maxTX - minTX + 1) * TILE_SIZE;
                const wh = (maxTY - minTY + 1) * TILE_SIZE;
                const wrapped = nearestWrap(wx + ww/2, wy + wh/2, this.camera.getCenterX(), this.camera.getCenterY());
                const screen = this.camera.worldToScreen(wrapped.x - ww/2, wrapped.y - wh/2);
                const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
                ctx.strokeStyle = `rgba(255, 220, 50, ${pulse})`;
                ctx.lineWidth = 4;
                ctx.strokeRect(screen.x, screen.y, ww, wh);
                ctx.fillStyle = `rgba(255, 220, 50, ${pulse * 0.15})`;
                ctx.fillRect(screen.x, screen.y, ww, wh);
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 8px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('👨‍👩 PARENTS HERE', screen.x + ww/2, screen.y - 8);
            }
        }

        // ── Phase 3: Cult Mode search-for-family building highlight ──

        // ── Phase 3: Render Child + Parent NPCs ──
        if (this.npcManager) {
            this.npcManager.renderChildAndParents(ctx, this.camera, this.spriteManager);
        }

        // ── Phase 3: Builder Mode — owned building badges ──
        if (window.builderMode && this.ownedBuildings && this.ownedBuildings.length > 0) {
            for (const owned of this.ownedBuildings) {
                const bldg = this.gameMap.buildings[owned.building_idx];
                if (!bldg || bldg.tiles.length === 0) continue;
                let cx = 0, cy = 0;
                for (const t of bldg.tiles) { cx += t.x; cy += t.y; }
                cx = (cx / bldg.tiles.length) * TILE_SIZE + TILE_SIZE / 2;
                cy = (cy / bldg.tiles.length) * TILE_SIZE + TILE_SIZE / 2;
                const wrapped = nearestWrap(cx, cy, this.camera.getCenterX(), this.camera.getCenterY());
                if (!this.camera.isVisible(wrapped.x - 60, wrapped.y - 60, 120, 120)) continue;
                const screen = this.camera.worldToScreen(wrapped.x, wrapped.y);
                ctx.fillStyle = 'rgba(0,180,80,0.85)';
                ctx.font = 'bold 7px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`🏢 OWNED`, screen.x, screen.y - 30);
                ctx.fillStyle = '#fff';
                ctx.font = '6px "Press Start 2P", monospace';
                ctx.fillText(`${owned.tenants || 0}/5 tenants`, screen.x, screen.y - 18);
            }
        }

        // Render rival Candidates in politics/el presidente mode
        if ((window.politicsMode || window.elPresidenteElection) && this.rivalCandidates && this.rivalCandidates.length > 0) {
            for (const rival of this.rivalCandidates) {
                const screen = this.camera.worldToScreen(rival.x, rival.y);
                if (this.camera.isVisible(rival.x - 20, rival.y - 20, 40, 40)) {
                    ctx.save();
                    // Draw rival body
                    ctx.fillStyle = '#cc0000'; // Red suit
                    ctx.fillRect(screen.x - 10, screen.y - 14, 20, 28);
                    // Head
                    ctx.fillStyle = '#ffdbac';
                    ctx.beginPath();
                    ctx.arc(screen.x, screen.y - 18, 7, 0, Math.PI * 2);
                    ctx.fill();
                    // Hair/Tie
                    ctx.fillStyle = '#00ffff';
                    ctx.fillRect(screen.x - 5, screen.y - 24, 10, 4);
                    // Label
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '8px "Press Start 2P", monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(`RIVAL ${rival.id}`, screen.x, screen.y - 28);
                    ctx.restore();
                }
            }
        }

        if (window.flowersMode) {
            const flowerImg = this.spriteManager ? this.spriteManager.getImage('flower') : null;
            const mudImg = this.spriteManager ? this.spriteManager.getImage('mud') : null;

            for (const flower of this.flowers) {
                const wx = flower.x * TILE_SIZE + TILE_SIZE / 2;
                const wy = flower.y * TILE_SIZE + TILE_SIZE / 2;
                const wrapped = nearestWrap(wx, wy, this.camera.getCenterX(), this.camera.getCenterY());
                if (!this.camera.isVisible(wrapped.x - 20, wrapped.y - 20, 40, 40)) continue;
                const screen = this.camera.worldToScreen(wrapped.x, wrapped.y);
                
                if (flower.isMud || flower.growTimeRemaining > 0) {
                    if (mudImg) {
                        ctx.drawImage(mudImg, screen.x - 16, screen.y - 16, 32, 32);
                    } else {
                        // Mud pile fallback
                        ctx.fillStyle = '#4a3018';
                        ctx.beginPath();
                        ctx.ellipse(screen.x, screen.y + 4, 12, 6, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else {
                    if (flowerImg) {
                        ctx.drawImage(flowerImg, screen.x - 16, screen.y - 16, 32, 32);
                    } else {
                        // Grown flower fallback
                        ctx.fillStyle = '#ff66b2';
                        ctx.beginPath();
                        ctx.arc(screen.x, screen.y, 10, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#ffff00';
                        ctx.beginPath();
                        ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        if (window.crimeMode || (window.politicsMode && this.acceptedMafiaVotes) || this.priceFixingActive) {
            if (window.crimeMode) {
                this.gameMap.renderAddresses(ctx, this.camera);
                this.npcManager.render(ctx, this.camera, this.spriteManager);
            }
            if (this.crimeManager) {
                this.crimeManager.render(ctx, this.camera);
            }
        }

        // Render parade
        if (this.paradeActive) {
            this._renderParade(ctx, this.camera);
        }

        // Render traffic cars
        if (this.carManager) {
            this.carManager.render(ctx, this.camera);
        }

        // Render trash
        this.trashManager.render(ctx, this.camera, this.spriteManager);

        // Render Ranger animal nodes (only for Ranger class)
        if (this.animalNodes && this.player && this.player.characterClass === 'char1') {
            const time = performance.now() / 1000;
            for (const node of this.animalNodes) {
                if (node.captured) continue;
                const wrapped = nearestWrap(node.x, node.y, this.camera.getCenterX(), this.camera.getCenterY());
                if (!this.camera.isVisible(wrapped.x - 32, wrapped.y - 32, 64, 64)) continue;
                const screen = this.camera.worldToScreen(wrapped.x, wrapped.y);

                // Pulsing circle background
                const pulse = 1 + Math.sin(time * 3 + node.x * 0.01) * 0.08;
                ctx.save();
                ctx.globalAlpha = 0.85;
                ctx.fillStyle = '#2d6b2d';
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, 14 * pulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#88ff88';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, 14 * pulse, 0, Math.PI * 2);
                ctx.stroke();

                // Paw icon text
                ctx.font = '14px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.globalAlpha = 1.0;
                ctx.fillText('🐾', screen.x, screen.y);

                // Animal type label
                ctx.fillStyle = '#ffffff';
                ctx.font = '6px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(node.type.toUpperCase(), screen.x, screen.y + 16);
                ctx.restore();
            }
        }

        // Render followers (behind player)
        this.followerManager.render(ctx, this.camera, this.spriteManager);

        // Render truck chain (between followers and player)
        if (this.truckChain && this.truckChain.length > 0) {
            for (let i = this.truckChain.length - 1; i >= 0; i--) {
                this.truckChain[i].render(ctx, this.camera, this.spriteManager);
            }
        }

        // Render player
        if (this.player) {
            this.player.render(ctx, this.camera, this.spriteManager);
        }

        // Render Organizers
        if (this.organizers) {
            this.organizers.forEach(org => org.render(ctx, this.camera));
        }

        // Render Dragons
        if (this.dragons) {
            this.dragons.forEach(drag => drag.render(ctx, this.camera));
        }

        // Render HUD
        if (window.chaosMode && window.chaosLevel >= 4) {
            ctx.restore();
        }
        this.hud.render(ctx, w, h);

        if (window.frenzyMode || window.politicsMode || window.elPresidenteElection) {
            this.npcManager.renderDialogue(ctx, w, h);
            if (window.frenzyMode) {
                this.pirateManager.renderCombatResults(ctx, w, h);
            }
        }

        if (window.crimeMode) {
            if (!window.elPresidenteElection) {
                this.npcManager.renderDialogue(ctx, w, h);
            }
        }

        // Render pickup hint if near trash
        if (this.playerNearTrash) {
            ctx.save();
            ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
            ctx.beginPath();
            ctx.roundRect(w / 2 - 150, h - 100, 300, 36, 8);
            ctx.fill();
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(w / 2 - 150, h - 100, 300, 36, 8);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Press [Q] to Pick Up Trash!', w / 2, h - 82);
            ctx.restore();
        }

        // Render mini-map
        this.miniMap.render(ctx, w, h, this.camera, this.player, this.followerManager, this.trashManager.items, this.gameMap);

        // Debug overlay: show player position and key state
        if (this.player) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(w - 280, h - 80, 270, 70);
            ctx.fillStyle = '#0f8';
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            const k = this.player.keys;
            ctx.fillText(`Pos: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`, w - 270, h - 62);
            ctx.fillText(`Tile: (${this.player.getTileX()}, ${this.player.getTileY()})`, w - 270, h - 48);
            ctx.fillText(`Keys: U:${k.up} D:${k.down} L:${k.left} R:${k.right}`, w - 270, h - 34);
            ctx.fillText(`Arrows to move, Q to pickup`, w - 270, h - 20);
        }
    }

    _renderParade(ctx, camera) {
        if (!this.paradeActive || !this.paradeSegments) return;
        
        for (const seg of this.paradeSegments) {
            let sx, sy;
            if (this.paradeDirection === 'horizontal') {
                sx = ((this.paradePosition - seg.offset) % MAP_PIXEL_W + MAP_PIXEL_W) % MAP_PIXEL_W;
                sy = this.paradeRoadIndex * TILE_SIZE + TILE_SIZE / 2;
            } else {
                sx = this.paradeRoadIndex * TILE_SIZE + TILE_SIZE / 2;
                sy = ((this.paradePosition - seg.offset) % MAP_PIXEL_H + MAP_PIXEL_H) % MAP_PIXEL_H;
            }
            
            const wrapped = nearestWrap(sx, sy, camera.getCenterX(), camera.getCenterY());
            if (!camera.isVisible(wrapped.x - 50, wrapped.y - 50, 100, 100)) continue;
            
            const screen = camera.worldToScreen(wrapped.x, wrapped.y);
            
            if (seg.type === 'red_truck') {
                const img = this.spriteManager.getImage('red_truck');
                if (img) {
                    ctx.save();
                    ctx.drawImage(img, screen.x - 24, screen.y - 24, 48, 48);
                    ctx.restore();
                } else {
                    ctx.save();
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(screen.x - 24, screen.y - 12, 48, 24);
                    ctx.restore();
                }
            } else if (seg.type === 'balloon') {
                const img = this.spriteManager.getImage('red_balloon');
                if (img) {
                    ctx.drawImage(img, screen.x - 16, screen.y - 24, 32, 48);
                } else {
                    ctx.save();
                    ctx.fillStyle = '#ff3333';
                    ctx.beginPath();
                    ctx.arc(screen.x, screen.y - 10, 10, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }
    }

    async _showSplashGameOver(title, message, isPirateDefeat) {
        const hadTruck = title === "WASTED BY PIRATES" && message.includes("Bruno");
        
        if (isPirateDefeat) {
            this.trashManager.totalPoints = 0; // Lose all points
            if (window.playerHasTruck) {
                window.playerHasTruck = false;
                window.playerInventory['Bruno The Trash Truck'] = 0;
            }
        }

        this.state = GameState.UI_OVERLAY;
        if (this.player) this.player.keys = { up: false, down: false, left: false, right: false };

        const titleEl = document.getElementById('defeat-title');
        if (titleEl) titleEl.innerText = title;

        const msgEl = document.getElementById('defeat-message');
        if (msgEl) msgEl.innerText = message;

        // Hide game canvas and show defeat screen
        if (window.showScreen) {
            window.showScreen('pirate-defeat-screen');
        } else {
            this.canvas.classList.add('hidden');
            const screenEl = document.getElementById('pirate-defeat-screen');
            if (screenEl) screenEl.classList.remove('hidden');
        }
        const screenEl = document.getElementById('pirate-defeat-screen');

        // Always show the GIF on the splash screen as requested (except in Politics Mode)
        const gifEl = document.getElementById('defeat-gif');
        if (gifEl) {
            if (window.politicsMode) {
                gifEl.style.display = 'none';
            } else {
                if (!isPirateDefeat && title === "TIME'S UP!") {
                    gifEl.src = "assets/sprites/defeat_animation.gif";
                } else {
                    gifEl.src = "assets/sprites/defeat_animation.gif";
                }
                gifEl.style.display = 'block';
            }
        }

        // Render trash cans count based on trashCollectedInRound
        const totalTrash = this.trashCollectedInRound || 0;
        const roundTrashCount = document.getElementById('round-trash-count');
        if (roundTrashCount) roundTrashCount.innerText = totalTrash;

        const cansCanvas = document.getElementById('trashCansCountCanvas');
        if (cansCanvas) {
            const cctx = cansCanvas.getContext('2d');
            cctx.fillStyle = '#000';
            cctx.fillRect(0, 0, cansCanvas.width, cansCanvas.height);

            const cansCount = totalTrash / 10;
            const canW = 20;
            const canH = 26;
            const gap = 6;
            const startX = 10;
            const startY = 7;

            for (let i = 0; i < Math.ceil(cansCount); i++) {
                const fraction = Math.min(1.0, cansCount - i);
                this.drawTrashCan(cctx, startX + i * (canW + gap), startY, canW, canH, fraction);
            }
        }

        // Cancel previous animation loop if active
        if (window.defeatAnimationId) {
            cancelAnimationFrame(window.defeatAnimationId);
            window.defeatAnimationId = null;
        }

        const beatPrevious = (this.trashCollectedInRound || 0) > (window.lastRoundTrash || 0);
        window.lastRoundTrash = this.trashCollectedInRound || 0;

        // Draw animated pixel art to defeat canvas
        const artCanvas = document.getElementById('defeatArtCanvas');
        if (artCanvas) {
            document.getElementById('defeat-art-container').style.display = 'block';
            const ctx = artCanvas.getContext('2d');
            const playerImg = this.spriteManager.getCharacterImage(this.player ? this.player.spriteId : 'char1');
            const pirateImg = this.spriteManager.getCharacterImage('char_pirate');
            const truckImg = this.spriteManager.getCharacterImage('char_truck');

            let startTime = performance.now();
            const animateDefeat = (timestamp) => {
                const elapsed = timestamp - startTime;
                
                // Clear
                ctx.fillStyle = '#0a0e1a';
                ctx.fillRect(0, 0, 256, 128);

                if (isPirateDefeat) {
                    ctx.fillStyle = '#222222';
                    ctx.fillRect(0, 96, 256, 32);

                    if (hadTruck && truckImg && pirateImg) {
                        ctx.strokeStyle = '#444';
                        ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.moveTo(0, 108); ctx.lineTo(256, 108); ctx.stroke();
        
                        ctx.drawImage(truckImg, 96, 36, 64, 64);
                        ctx.drawImage(pirateImg, 112, 24, 32, 32);
                        ctx.drawImage(pirateImg, 140, 28, 32, 32);
                    } else {
                        ctx.fillStyle = '#aa2222';
                        ctx.fillRect(96, 90, 48, 10);
                        ctx.fillStyle = '#666666';
                        ctx.fillRect(104, 84, 16, 6);
                        ctx.fillRect(124, 86, 10, 4);
        
                        if (pirateImg) {
                            ctx.drawImage(pirateImg, 90, 52, 32, 32);
                            ctx.drawImage(pirateImg, 130, 50, 32, 32);
                        }
                    }
                } else {
                    ctx.fillStyle = '#333333';
                    ctx.fillRect(0, 100, 256, 28);
                    ctx.fillStyle = '#555555';
                    ctx.fillRect(0, 96, 256, 4);

                    if (beatPrevious) {
                        const jumpY = 96 - 48 - Math.abs(Math.sin(elapsed * 0.005) * 35);
                        
                        const shadowW = Math.max(8, 24 - Math.abs(Math.sin(elapsed * 0.005) * 16));
                        ctx.fillStyle = 'rgba(0,0,0,0.4)';
                        ctx.fillRect(128 - shadowW/2, 98, shadowW, 4);

                        if (playerImg && playerImg.complete) {
                            ctx.save();
                            const scaleY = 1 + Math.sin(elapsed * 0.005) * 0.1;
                            ctx.drawImage(playerImg, 128 - 16, jumpY, 32, 32 * scaleY);
                            ctx.restore();
                        }
                        
                        ctx.fillStyle = '#ffcc00';
                        for (let i = 0; i < 6; i++) {
                            const sx = 128 + Math.sin(elapsed * 0.002 + i) * 40;
                            const sy = 40 + Math.cos(elapsed * 0.003 + i * 1.5) * 20;
                            ctx.fillRect(sx, sy, 2, 2);
                        }
                    } else {
                        if (playerImg && playerImg.complete) {
                            ctx.save();
                            ctx.translate(128, 96 - 12);
                            ctx.rotate(0.12 * Math.sin(elapsed * 0.001));
                            ctx.drawImage(playerImg, -16, -16, 32, 32);
                            ctx.restore();
                        }
                        
                        const tearY = 96 - 16 + (elapsed * 0.025) % 18;
                        if (tearY < 96) {
                            ctx.fillStyle = '#00ffff';
                            ctx.fillRect(133, tearY, 2, 3);
                        }
                    }
                }

                const checkEl = document.getElementById('pirate-defeat-screen');
                if (checkEl && checkEl.classList.contains('hidden')) {
                    return;
                }
                window.defeatAnimationId = requestAnimationFrame(animateDefeat);
            };
            window.defeatAnimationId = requestAnimationFrame(animateDefeat);
        }

        // Setup the return button listener
        const btnReturn = document.getElementById('btn-defeat-return');
        if (btnReturn) {
            // Remove previous listeners by replacing the button clone
            const newBtn = btnReturn.cloneNode(true);
            btnReturn.parentNode.replaceChild(newBtn, btnReturn);

            newBtn.addEventListener('click', async () => {
                if (isPirateDefeat) {
                    if (window.apiCall) {
                        try {
                            const sacrifice_dragon = window.dragonMode ? confirm("Do you sacrifice 5 followers at the altar of the Burninator?") : false;
                            const result = await window.apiCall('/api/game/end-round', 'POST', {
                                earned: 0,
                                employee_cost: this.totalEmployeeCost,
                                employees_killed: this.employeesKilledThisRound,
                                lose_truck: hadTruck,
                                followers: this.getRoundTotalFollowers(),
                                handshakes: this.handshakesShaken || 0,
                                dragon_mode_active: !!window.dragonMode,
                                sacrifice_dragon: sacrifice_dragon,
                                happiness: parseFloat(this.happiness !== undefined ? this.happiness : 100.0),
                                cult_leaves_cumulative: this.cultLeavesCumulative || 0
                            });
                            if (result && result.dragon_lost) {
                                alert("🐉 Burninator has left your posse because you did not make the 5 follower sacrifice!");
                            }
                            window.employeesHired = 0;
                            await window.refreshGameState();
                            window.renderStore();
                            
                            // Hide defeat screen, show store screen
                            if (screenEl) screenEl.classList.add('hidden');
                            if (gifEl) gifEl.style.display = 'block';
                            window.showScreen('store-screen');
                            this._restartGame();
                        } catch (e) {
                            console.error("Return from defeat error:", e);
                        }
                    }
                } else {
                    // Time's up scenario - use normal end round
                    if (screenEl) screenEl.classList.add('hidden');
                    if (gifEl) gifEl.style.display = 'block';
                    await this._endRoundAndReturnToStore();
                    this._restartGame();
                }
            });
        }
    }

    drawTrashCan(ctx, x, y, width, height, fraction) {
        ctx.save();
        
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#222222';
        
        ctx.beginPath();
        ctx.moveTo(x + width * 0.1, y + height * 0.2);
        ctx.lineTo(x + width * 0.9, y + height * 0.2);
        ctx.lineTo(x + width * 0.8, y + height * 0.9);
        ctx.lineTo(x + width * 0.2, y + height * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + width * 0.35, y + height * 0.25);
        ctx.lineTo(x + width * 0.35, y + height * 0.85);
        ctx.moveTo(x + width * 0.5, y + height * 0.25);
        ctx.lineTo(x + width * 0.5, y + height * 0.85);
        ctx.moveTo(x + width * 0.65, y + height * 0.25);
        ctx.lineTo(x + width * 0.65, y + height * 0.85);
        ctx.stroke();

        if (fraction > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x + width * 0.1, y + height * 0.2);
            ctx.lineTo(x + width * 0.9, y + height * 0.2);
            ctx.lineTo(x + width * 0.8, y + height * 0.9);
            ctx.lineTo(x + width * 0.2, y + height * 0.9);
            ctx.closePath();
            ctx.clip();

            const fillHeight = height * 0.7 * fraction;
            const fillY = y + height * 0.9 - fillHeight;
            
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(x, fillY, width, fillHeight);
            
            ctx.fillStyle = '#d97706';
            for (let i = 0; i < 5; i++) {
                const rx = x + width * 0.2 + (i * 2.3) % (width * 0.5);
                const ry = fillY + (i * 3.7) % fillHeight;
                ctx.fillRect(rx, ry, 2, 2);
            }
            ctx.restore();
        }

        ctx.strokeStyle = '#aaaaaa';
        ctx.fillStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.fillRect(x + width * 0.05, y + height * 0.12, width * 0.9, height * 0.08);
        ctx.strokeRect(x + width * 0.05, y + height * 0.12, width * 0.9, height * 0.08);
        ctx.fillRect(x + width * 0.4, y + height * 0.04, width * 0.2, height * 0.08);
        ctx.strokeRect(x + width * 0.4, y + height * 0.04, width * 0.2, height * 0.08);

        ctx.restore();
    }

    async _triggerCarDefeat() {
        this.state = GameState.UI_OVERLAY;
        if (this.player) this.player.keys = { up: false, down: false, left: false, right: false };

        const msgEl = document.getElementById('defeat-message');
        if (msgEl) {
            msgEl.innerText = "You were run over by a red car! All earnings this round were lost.";
        }

        // Hide game canvas and show defeat screen
        if (window.showScreen) {
            window.showScreen('pirate-defeat-screen');
        } else {
            this.canvas.classList.add('hidden');
            const screenEl = document.getElementById('pirate-defeat-screen');
            if (screenEl) screenEl.classList.remove('hidden');
        }
        const screenEl = document.getElementById('pirate-defeat-screen');

        // Draw pixel art to defeat canvas: player run over by car
        const artCanvas = document.getElementById('defeatArtCanvas');
        if (artCanvas) {
            const ctx = artCanvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 256, 128);

            // Ground
            ctx.fillStyle = '#222222';
            ctx.fillRect(0, 96, 256, 32);

            // Draw a red car
            ctx.fillStyle = '#ed1c24';
            ctx.beginPath();
            ctx.roundRect(120, 72, 40, 24, 6);
            ctx.fill();
            
            // Windshield
            ctx.fillStyle = '#aaddff';
            ctx.fillRect(126, 76, 5, 16);

            // Draw shapeless body on ground (red/gray blob)
            ctx.fillStyle = '#aa2222';
            ctx.fillRect(70, 92, 32, 8);
            ctx.fillStyle = '#666666';
            ctx.fillRect(76, 88, 12, 4);
        }

        // Setup the return button listener (no lose_truck!)
        const btnReturn = document.getElementById('btn-defeat-return');
        if (btnReturn) {
            const newBtn = btnReturn.cloneNode(true);
            btnReturn.parentNode.replaceChild(newBtn, btnReturn);

            newBtn.addEventListener('click', async () => {
                if (window.apiCall) {
                    try {
                        const sacrifice_dragon = window.dragonMode ? confirm("Do you sacrifice 5 followers at the altar of the Burninator?") : false;
                        const result = await window.apiCall('/api/game/end-round', 'POST', {
                            earned: 0,
                            employee_cost: this.totalEmployeeCost,
                            employees_killed: this.employeesKilledThisRound,
                            lose_truck: false, 
                            followers: this.getRoundTotalFollowers(),
                            handshakes: this.handshakesShaken || 0,
                            dragon_mode_active: !!window.dragonMode,
                            sacrifice_dragon: sacrifice_dragon,
                            happiness: parseFloat(this.happiness !== undefined ? this.happiness : 100.0),
                            cult_leaves_cumulative: this.cultLeavesCumulative || 0
                        });
                        if (result && result.dragon_lost) {
                            alert("🐉 Burninator has left your posse because you did not make the 5 follower sacrifice!");
                        }
                        window.employeesHired = 0;
                        await window.refreshGameState();
                        window.renderStore();
                    } catch (e) {
                        console.error("Return from defeat error:", e);
                    }
                }
                
                if (screenEl) screenEl.classList.add('hidden');
                window.showScreen('store-screen');
                this._restartGame();
            });
        }
    }

    async _triggerArrestDefeat(isMafiaArrest = false) {
        this.state = GameState.UI_OVERLAY;
        if (this.player) this.player.keys = { up: false, down: false, left: false, right: false };

        const msgEl = document.getElementById('defeat-message');
        const titleEl = document.getElementById('defeat-title');
        const gifEl = document.getElementById('defeat-gif');
        const artContainer = document.getElementById('defeat-art-container');

        const isPoliticsArrest = window.politicsMode;

        if (isPoliticsArrest) {
            if (titleEl) titleEl.innerText = "BUSTED BY THE POLICE";
            if (gifEl) {
                gifEl.src = "assets/sprites/arrest_crying.gif";
                gifEl.style.width = "256px";
                gifEl.style.height = "256px";
            }
            if (artContainer) artContainer.style.display = "none";
            if (msgEl) {
                msgEl.innerText = "You were caught by the police in politics mode! All campaign progress was lost and you are permanently banned from running for office.";
            }
        } else if (isMafiaArrest) {
            if (titleEl) titleEl.innerText = "BUSTED BY THE FEDS";
            if (gifEl) {
                gifEl.src = "assets/sprites/arrest_crying.gif";
                gifEl.style.width = "256px";
                gifEl.style.height = "256px";
            }
            if (artContainer) artContainer.style.display = "none";
            if (msgEl) {
                msgEl.innerText = "You were caught by the police for accepting bribe votes from the mafia! All trash trucks were confiscated, you lost 75% of your followers, and you paid a scaling fine.";
            }
        } else {
            if (titleEl) titleEl.innerText = "WASTED BY POLICE";
            if (gifEl) {
                gifEl.src = "assets/sprites/defeat_animation.gif";
                gifEl.style.width = "128px";
                gifEl.style.height = "128px";
            }
            if (artContainer) artContainer.style.display = "block";
            if (msgEl) {
                msgEl.innerText = "You were arrested by the police! All earnings this round were lost.";
            }
        }

        // Hide game canvas and show defeat screen
        if (window.showScreen) {
            window.showScreen('pirate-defeat-screen');
        } else {
            this.canvas.classList.add('hidden');
            const screenEl = document.getElementById('pirate-defeat-screen');
            if (screenEl) screenEl.classList.remove('hidden');
        }
        const screenEl = document.getElementById('pirate-defeat-screen');

        // Draw pixel art to defeat canvas: player behind bars (jail) if not mafia/politics arrest
        if (!isMafiaArrest && !isPoliticsArrest) {
            const artCanvas = document.getElementById('defeatArtCanvas');
            if (artCanvas) {
                const ctx = artCanvas.getContext('2d');
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, 256, 128);

                // Draw prison bars
                ctx.strokeStyle = '#888888';
                ctx.lineWidth = 4;
                for (let x = 20; x < 256; x += 30) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, 128);
                    ctx.stroke();
                }

                // Draw player head looking sad through bars
                ctx.fillStyle = '#ffdbac';
                ctx.beginPath();
                ctx.arc(128, 64, 16, 0, Math.PI * 2);
                ctx.fill();

                // Sad eyes
                ctx.fillStyle = '#000';
                ctx.font = '12px Arial';
                ctx.fillText('o', 120, 62);
                ctx.fillText('o', 132, 62);
                // Sad mouth
                ctx.beginPath();
                ctx.arc(128, 76, 6, Math.PI, 0, false);
                ctx.stroke();
            }
        }

        // Setup the return button listener
        const btnReturn = document.getElementById('btn-defeat-return');
        if (btnReturn) {
            const newBtn = btnReturn.cloneNode(true);
            btnReturn.parentNode.replaceChild(newBtn, btnReturn);

            newBtn.addEventListener('click', async () => {
                if (window.apiCall) {
                    try {
                        const sacrifice_dragon = window.dragonMode ? confirm("Do you sacrifice 5 followers at the altar of the Burninator?") : false;
                        const result = await window.apiCall('/api/game/end-round', 'POST', {
                            earned: 0,
                            employee_cost: this.totalEmployeeCost,
                            employees_killed: this.employeesKilledThisRound,
                            lose_truck: isMafiaArrest || isPoliticsArrest, 
                            followers: 0,
                            handshakes: this.handshakesShaken || 0,
                            rival_handshakes: this.rivalCandidate ? this.rivalCandidate.votes : 0,
                            mafia_arrest: isMafiaArrest,
                            politics_arrest: isPoliticsArrest,
                            dragon_mode_active: !!window.dragonMode,
                            sacrifice_dragon: sacrifice_dragon,
                            happiness: parseFloat(this.happiness !== undefined ? this.happiness : 100.0),
                            cult_leaves_cumulative: this.cultLeavesCumulative || 0
                        });
                        if (result && result.dragon_lost) {
                            alert("🐉 Burninator has left your posse because you did not make the 5 follower sacrifice!");
                        }
                        window.employeesHired = 0;
                        await window.refreshGameState();
                        window.renderStore();
                    } catch (e) {
                        console.error("Return from defeat error:", e);
                    }
                }
                
                // Restore overlays and show store screen anyway to avoid black screen freeze
                if (gifEl) {
                    gifEl.src = "assets/sprites/thumbs_up_animation.gif";
                    gifEl.style.width = "128px";
                    gifEl.style.height = "128px";
                    gifEl.style.display = "block";
                }
                if (artContainer) artContainer.style.display = "block";
                if (titleEl) titleEl.innerText = "WASTED BY POLICE";

                if (screenEl) screenEl.classList.add('hidden');
                
                if (isPoliticsArrest) {
                    window.politicsMode = false;

                    const dialog = document.getElementById('made-man-dialog');
                    const donText = document.querySelector('#made-man-dialog p');
                    const donTitle = document.querySelector('#made-man-dialog h2');
                    if (donTitle) donTitle.innerText = "OUT OF THE SLAMMER";
                    if (donText) donText.innerText = "After getting out of slammer, the Don has some work for you to get you on your feet. Do you want to join the mafia or not?";

                    if (dialog) dialog.classList.remove('hidden');

                    const btnYes = document.getElementById('btn-made-man-yes');
                    const btnNo = document.getElementById('btn-made-man-no');

                    const yesClone = btnYes.cloneNode(true);
                    btnYes.parentNode.replaceChild(yesClone, btnYes);
                    const noClone = btnNo.cloneNode(true);
                    btnNo.parentNode.replaceChild(noClone, btnNo);

                    yesClone.addEventListener('click', async () => {
                        try {
                            await window.apiCall('/api/game/made-man-choice', 'POST', { choice: 'accepted' });
                            dialog.classList.add('hidden');
                            alert("Welcome to the family. Crime Mode is now unlocked!");
                            await window.refreshGameState();
                            window.renderStore();
                        } catch (err) {
                            alert(err.message);
                        }
                        window.showScreen('store-screen');
                        this._restartGame();
                    });

                    noClone.addEventListener('click', async () => {
                        try {
                            await window.apiCall('/api/game/made-man-choice', 'POST', { choice: 'declined' });
                            dialog.classList.add('hidden');
                            alert("You declined the Don's offer.");
                            await window.refreshGameState();
                            window.renderStore();
                        } catch (err) {
                            alert(err.message);
                        }
                        window.showScreen('store-screen');
                        this._restartGame();
                    });
                } else {
                    window.showScreen('store-screen');
                    this._restartGame();
                }
            });
        }
    }

    getRoundTotalFollowers() {
        let total = this.followerManager.getFollowerCount();
        if (this.organizers) {
            this.organizers.forEach(org => {
                total += org.followerManager.getFollowerCount();
            });
        }
        if (this.dragons) {
            this.dragons.forEach(drag => {
                total += drag.followerManager.getFollowerCount();
            });
        }
        return total;
    }

    getRoundTotalFollowersForValue() {
        return this.getRoundTotalFollowers() + (window.dragonMode ? 5 : 0);
    }

    _addSequentialFollower() {
        const organizersCount = this.organizers ? this.organizers.length : 0;
        const dragonsCount = this.dragons ? this.dragons.length : 0;
        const totalGroups = organizersCount + dragonsCount + 1;
        
        let newFollower;
        if (this.nextFollowerGroupIndex === 0) {
            newFollower = this.followerManager.addFollower(this.player.x, this.player.y);
            
            // Fantasy Mode: Dragon Master rolls
            if (window.fantasyMode && !this.dragonMasterFollower && (!this.dragons || this.dragons.length === 0)) {
                if (Math.random() < 0.10) {
                    newFollower.spriteId = 'char_dragon_master';
                    newFollower.isDragonMaster = true;
                    this.dragonMasterFollower = newFollower;
                    this.hud.showFollowerNotification('🧙‍♂️ A Dragon Master has joined your posse!', true);
                }
            } else if (window.fantasyMode && this.dragonMasterFollower) {
                if (Math.random() < 0.10) {
                    this.triggerDragonTransformation(this.dragonMasterFollower);
                }
            }
            
            const charConfig = SPRITE_CONFIG.characters.find(c => c.id === newFollower.spriteId);
            this.hud.showFollowerNotification(charConfig ? `${charConfig.name} joined your posse!` : 'New posse member joined your posse!', true);
        } else if (this.nextFollowerGroupIndex <= organizersCount) {
            const org = this.organizers[this.nextFollowerGroupIndex - 1];
            newFollower = org.followerManager.addFollower(org.x, org.y);
            
            // Fantasy Mode: Dragon Master rolls for organizer recruits
            if (window.fantasyMode && !this.dragonMasterFollower && (!this.dragons || this.dragons.length === 0)) {
                if (Math.random() < 0.10) {
                    newFollower.spriteId = 'char_dragon_master';
                    newFollower.isDragonMaster = true;
                    this.dragonMasterFollower = newFollower;
                    this.hud.showFollowerNotification('🧙‍♂️ A Dragon Master has joined your posse!', true);
                }
            } else if (window.fantasyMode && this.dragonMasterFollower) {
                if (Math.random() < 0.10) {
                    this.triggerDragonTransformation(this.dragonMasterFollower);
                }
            }
            
            const charConfig = SPRITE_CONFIG.characters.find(c => c.id === newFollower.spriteId);
            this.hud.showFollowerNotification(charConfig ? `${charConfig.name} joined Organizer ${this.nextFollowerGroupIndex}'s posse!` : `New member joined Organizer ${this.nextFollowerGroupIndex}'s posse!`, true);
        } else {
            const drag = this.dragons[this.nextFollowerGroupIndex - organizersCount - 1];
            newFollower = drag.followerManager.addFollower(drag.x, drag.y);
            
            const charConfig = SPRITE_CONFIG.characters.find(c => c.id === newFollower.spriteId);
            this.hud.showFollowerNotification(charConfig ? `${charConfig.name} joined Dragon's posse!` : `New member joined Dragon's posse!`, true);
        }
        this.nextFollowerGroupIndex = (this.nextFollowerGroupIndex + 1) % totalGroups;

        // Phase 1: Track international followers globally if not abroad, else track locally
        if (window.travelDestination) {
            this.internationalFollowersCollected = (this.internationalFollowersCollected || 0) + 1;
        } else {
            window.internationalFollowers = (window.internationalFollowers || 0) + 1;
        }

        // Trashpickers: deduct $20 from bank balance to equip the new recruit
        if (this.doubleTrashPickup) {
            this.trashManager.totalPoints = Math.max(0, this.trashManager.totalPoints - 20);
            this.hud.updateScore(this.trashManager.totalPoints);
            if (!this._lastTrashpickersNotify || Date.now() - this._lastTrashpickersNotify > 3000) {
                this.hud.showFollowerNotification('-$20 to equip new recruit (Trashpickers)', false);
                this._lastTrashpickersNotify = Date.now();
            }
        }
    }

    loadWordGameState() {
        const state = window.wordGameState || {
            collected_letters: {},
            completed_words: [],
            word_slots_state: {}
        };
        this.collectedLetters = state.collected_letters || {};
        this.completedWords = state.completed_words || [];
        this.wordSlotsState = state.word_slots_state || {};
        
        // Ensure all words are represented in slots state
        this.wordList.forEach(w => {
            if (!this.wordSlotsState[w]) {
                this.wordSlotsState[w] = Array(w.length).fill('');
            }
        });
    }

    async saveWordGameState() {
        // Sync global copy
        window.wordGameState = {
            collected_letters: this.collectedLetters,
            completed_words: this.completedWords,
            word_slots_state: this.wordSlotsState
        };
        // Save to backend
        try {
            if (window.apiCall) {
                await window.apiCall('/api/game/save-word-game', 'POST', window.wordGameState);
            }
        } catch (e) {
            console.error("Failed to save word game state", e);
        }
    }

    openWordGameDialog() {
        this.preDialogState = this.state;
        this.state = GameState.UI_OVERLAY;
        this.resetKeys();

        this.wordSlotsState = this.wordSlotsState || {};
        this.wordList.forEach(w => {
            if (!this.wordSlotsState[w]) {
                this.wordSlotsState[w] = Array(w.length).fill('');
            }
        });

        this.renderWordGameDialog();
        document.getElementById('trash-word-game-dialog').classList.remove('hidden');
    }

    renderWordGameDialog() {
        const uniqueLetters = ['A','B','C','D','E','F','G','I','L','M','N','O','P','R','S','T','U','W','Y'];
        const invDisplay = document.getElementById('letter-inventory-display');
        invDisplay.innerHTML = '';

        uniqueLetters.forEach(letter => {
            const count = this.collectedLetters[letter] || 0;
            
            const tile = document.createElement('div');
            tile.style.width = '36px';
            tile.style.height = '36px';
            tile.style.background = count > 0 ? '#1b102e' : '#222';
            tile.style.border = count > 0 ? '2px solid #b55fe6' : '2px solid #444';
            tile.style.borderRadius = '6px';
            tile.style.display = 'flex';
            tile.style.alignItems = 'center';
            tile.style.justifyContent = 'center';
            tile.style.position = 'relative';
            tile.style.fontFamily = '"Press Start 2P", monospace';
            tile.style.fontSize = '10px';
            tile.style.color = count > 0 ? '#fff' : '#555';
            tile.style.boxSizing = 'border-box';
            tile.innerText = letter;

            if (count > 0) {
                tile.draggable = true;
                tile.style.cursor = 'grab';
                tile.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', letter);
                });
            }

            const badge = document.createElement('span');
            badge.style.position = 'absolute';
            badge.style.right = '2px';
            badge.style.bottom = '2px';
            badge.style.fontSize = '6px';
            badge.style.fontFamily = '"Press Start 2P", monospace';
            badge.style.color = count > 0 ? '#ccff00' : '#444';
            badge.innerText = `x${count}`;
            tile.appendChild(badge);

            invDisplay.appendChild(tile);
        });

        const PRIZES = {
            'WASTE': { name: '$15,000 Cash', type: 'cash', val: 15000 },
            'LITTER': { name: 'Quinine + $10,000 Cash', type: 'quinine_cash', val: 10000 },
            'DEBRIS': { name: 'Flower + $10,000 Cash', type: 'flower_cash', val: 10000 },
            'REFUSE': { name: 'Protection + $10,000 Cash', type: 'protection_cash', val: 10000 },
            'GARBAGE': { name: '$50,000 Cash', type: 'cash', val: 50000 },
            'PLASTIC': { name: '$50,000 Cash', type: 'cash', val: 50000 },
            'RECYCLE': { name: '$60,000 Cash', type: 'cash', val: 60000 },
            'COMPOST': { name: '$60,000 Cash', type: 'cash', val: 60000 },
            'LANDFILL': { name: 'Bruno Trash Truck + $30,000 Cash', type: 'truck_cash', val: 30000 },
            'POLLUTION': { name: '$150,000 Cash', type: 'cash', val: 150000 }
        };

        const container = document.getElementById('word-game-slots-container');
        container.innerHTML = '';

        const CLUES = {
            'WASTE': "Discarded materials; garbage or trash.",
            'LITTER': "Trash left lying in a public place.",
            'DEBRIS': "Scattered waste or wreckage remains.",
            'REFUSE': "Worthless matter thrown away.",
            'GARBAGE': "Spoiled food and kitchen waste.",
            'PLASTIC': "Polymer pollutant threatening oceans.",
            'RECYCLE': "Convert waste into reusable materials.",
            'COMPOST': "Decayed organic matter used as fertilizer.",
            'LANDFILL': "A place where waste is buried in soil.",
            'POLLUTION': "Harmful contaminants in the environment."
        };

        this.wordList.forEach((word, wordIndex) => {
            const isCompleted = this.completedWords.includes(word);
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.padding = '8px 0';
            row.style.borderBottom = '1px solid #333';

            const leftSide = document.createElement('div');
            leftSide.style.display = 'flex';
            leftSide.style.flexDirection = 'column';
            leftSide.style.gap = '4px';

            const slotsRow = document.createElement('div');
            slotsRow.style.display = 'flex';
            slotsRow.style.alignItems = 'center';
            slotsRow.style.gap = '15px';

            const numLabel = document.createElement('span');
            numLabel.style.fontSize = '8px';
            numLabel.style.color = '#888';
            numLabel.style.width = '25px';
            numLabel.innerText = `${wordIndex + 1}.`;
            slotsRow.appendChild(numLabel);

            const slotsDiv = document.createElement('div');
            slotsDiv.style.display = 'flex';

            for (let i = 0; i < word.length; i++) {
                const input = document.createElement('input');
                input.type = 'text';
                input.maxLength = 1;
                input.style.width = '22px';
                input.style.height = '22px';
                input.style.textAlign = 'center';
                input.style.fontFamily = '"Press Start 2P", monospace';
                input.style.fontSize = '9px';
                input.style.marginRight = '4px';
                input.style.boxSizing = 'border-box';
                
                input.setAttribute('data-word', word);
                input.setAttribute('data-index', i);

                const currentVal = this.wordSlotsState[word][i];

                if (isCompleted) {
                    input.value = word[i];
                    input.disabled = true;
                    input.style.background = '#1b4a22';
                    input.style.border = '2px solid #00ff55';
                    input.style.color = '#00ff55';
                } else if (currentVal !== '') {
                    input.value = currentVal;
                    input.disabled = true;
                    input.style.background = '#2a2a2a';
                    input.style.border = '2px solid #888';
                    input.style.color = '#ccc';
                } else {
                    input.value = '';
                    input.style.background = '#222';
                    input.style.border = '2px solid #555';
                    input.style.color = '#fff';

                    const submitLetter = (char) => {
                        const targetLetter = word[i];
                        const statusEl = document.getElementById('word-game-status-text');

                        if (!char.match(/^[A-Z]$/)) return;

                        if (char !== targetLetter) {
                            statusEl.innerText = `Incorrect letter for this slot! Expected: ${targetLetter}`;
                            return;
                        }

                        if ((this.collectedLetters[char] || 0) <= 0) {
                            statusEl.innerText = `You do not have letter "${char}" in your inventory!`;
                            return;
                        }

                        statusEl.innerText = '';
                        this.collectedLetters[char]--;
                        this.wordSlotsState[word][i] = char;

                        if (this.wordSlotsState[word].join('') === word) {
                            this.completedWords.push(word);
                            const prize = PRIZES[word];
                            this.awardWordGamePrize(prize);
                        }

                        this.saveWordGameState();
                        this.renderWordGameDialog();

                        setTimeout(() => {
                            const nextIndex = i + 1;
                            const nextInput = document.querySelector(`input[data-word="${word}"][data-index="${nextIndex}"]`);
                            if (nextInput && !nextInput.disabled) {
                                nextInput.focus();
                            } else {
                                const firstEmptyIdx = this.wordSlotsState[word].findIndex(c => c === '');
                                if (firstEmptyIdx !== -1) {
                                    const emptyInput = document.querySelector(`input[data-word="${word}"][data-index="${firstEmptyIdx}"]`);
                                    if (emptyInput) emptyInput.focus();
                                }
                            }
                        }, 50);
                    };

                    input.addEventListener('input', (e) => {
                        const char = e.target.value.toUpperCase();
                        e.target.value = '';
                        submitLetter(char);
                    });

                    input.addEventListener('dragover', (e) => {
                        e.preventDefault();
                    });

                    input.addEventListener('drop', (e) => {
                        e.preventDefault();
                        const char = e.dataTransfer.getData('text/plain').toUpperCase();
                        submitLetter(char);
                    });
                }

                slotsDiv.appendChild(input);
            }
            slotsRow.appendChild(slotsDiv);
            leftSide.appendChild(slotsRow);

            const clueLabel = document.createElement('div');
            clueLabel.style.fontSize = '7px';
            clueLabel.style.color = '#777';
            clueLabel.style.paddingLeft = '40px';
            clueLabel.style.fontStyle = 'italic';
            clueLabel.innerText = `Clue: ${CLUES[word]}`;
            leftSide.appendChild(clueLabel);

            row.appendChild(leftSide);

            const prizeLabel = document.createElement('span');
            prizeLabel.style.fontSize = '7px';
            if (isCompleted) {
                prizeLabel.style.color = '#00ff55';
                prizeLabel.innerText = `[COMPLETED] ${PRIZES[word].name}`;
            } else {
                prizeLabel.style.color = '#aaa';
                prizeLabel.innerText = `Prize: ${PRIZES[word].name}`;
            }
            row.appendChild(prizeLabel);

            container.appendChild(row);
        });
    }

    async awardWordGamePrize(prize) {
        if (prize.val > 0) {
            this.trashManager.totalPoints += prize.val;
            this.hud.updateScore(this.trashManager.totalPoints);
        }

        if (prize.type === 'quinine_cash') {
            window.playerInventory = window.playerInventory || {};
            window.playerInventory['Quinine'] = (window.playerInventory['Quinine'] || 0) + 1;
            await window.apiCall('/api/game/award-prize', 'POST', { prize_type: 'quinine' });
        } else if (prize.type === 'flower_cash') {
            window.playerInventory = window.playerInventory || {};
            window.playerInventory['Flower'] = (window.playerInventory['Flower'] || 0) + 1;
            await window.apiCall('/api/game/award-prize', 'POST', { prize_type: 'flower' });
        } else if (prize.type === 'protection_cash') {
            window.playerInventory = window.playerInventory || {};
            window.playerInventory['Protection'] = (window.playerInventory['Protection'] || 0) + 1;
            await window.apiCall('/api/game/award-prize', 'POST', { prize_type: 'protection' });
        } else if (prize.type === 'truck_cash') {
            window.playerHasTruck = (window.playerHasTruck || 0) + 1;
            window.playerInventory = window.playerInventory || {};
            window.playerInventory['Bruno The Trash Truck'] = (window.playerInventory['Bruno The Trash Truck'] || 0) + 1;
            await window.apiCall('/api/game/award-prize', 'POST', { prize_type: 'truck' });
        }

        this.hud.showFollowerNotification(`🎉 Word Completed! Unlocked: ${prize.name}`, true);
    }

    _removeSequentialFollower() {
        const organizersCount = this.organizers ? this.organizers.length : 0;
        const dragonsCount = this.dragons ? this.dragons.length : 0;
        if (this.followerManager.followers.length > 0) {
            const removed = this.followerManager.followers[this.followerManager.followers.length - 1];
            if (removed === this.dragonMasterFollower) {
                this.dragonMasterFollower = null;
            }
            this.followerManager.removeFollower();
            this.hud.showFollowerNotification('A posse member left you!', false);
        } else if (organizersCount > 0) {
            for (let i = 0; i < organizersCount; i++) {
                const org = this.organizers[i];
                if (org.followerManager.followers.length > 0) {
                    org.followerManager.removeFollower();
                    this.hud.showFollowerNotification(`A posse member left Organizer ${i + 1}!`, false);
                    return;
                }
            }
        } else if (dragonsCount > 0) {
            for (let i = 0; i < dragonsCount; i++) {
                const drag = this.dragons[i];
                if (drag.followerManager.followers.length > 0) {
                    drag.followerManager.removeFollower();
                    this.hud.showFollowerNotification(`A posse member left the Dragon!`, false);
                    return;
                }
            }
        }
    }
}

class GameOrganizer {
    constructor(game, index) {
        this.game = game;
        this.index = index;
        // Spawn near the player
        this.x = game.player.x + (Math.random() - 0.5) * TILE_SIZE * 3;
        this.y = game.player.y + (Math.random() - 0.5) * TILE_SIZE * 3;
        this.speed = 4.5;
        this.followerManager = new FollowerManager();
        this.followerManager.initialize(game.player.spriteId);
        
        this.targetTrash = null;
        this.direction = 'down';
        this.animFrame = 0;
        this.animTimer = 0;
        this.moving = false;
        
        // Position history for followers
        this.positionHistory = [{ x: this.x, y: this.y }];
    }

    getTileX() {
        return Math.floor(this.x / TILE_SIZE);
    }

    getTileY() {
        return Math.floor(this.y / TILE_SIZE);
    }

    update(dt) {
        // Collect timer
        if (this.collectTimer === undefined) this.collectTimer = 0;
        this.collectTimer += dt;
        if (this.collectTimer >= 2.0) {
            this.collectTimer -= 2.0;
            
            let canPick = true;
            if (window.playerHasTruck > 0) {
                const animalPenalty = this.game.player.capturedAnimals ? this.game.player.capturedAnimals.length * 10 : 0;
                const maxCap = Math.max(0, window.playerHasTruck * 100 - animalPenalty);
                if (this.game.trashCollectedInTruck >= maxCap) {
                    canPick = false;
                }
            }
            
            if (canPick) {
                // Find nearest uncollected trash
                let nearest = null;
                let minDist = Infinity;
                for (const item of this.game.trashManager.items) {
                    if (!item.collected) {
                        const dx = item.x - this.x;
                        const dy = item.y - this.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < minDist) {
                            minDist = dist;
                            nearest = item;
                        }
                    }
                }
                
                if (nearest) {
                    nearest.collected = true;
                    this.game.trashManager.totalCollected++;
                    
                    const totalFollowers = this.game.getRoundTotalFollowersForValue();
                    const isPriceFixing = this.game.priceFixingActive;
                    const basePointValue = Math.max(1, Math.round(Math.sqrt(16 * totalFollowers)));
                    let pointValue = isPriceFixing ? Math.round(basePointValue * 1.25) : basePointValue;
                    
                    let text = `+${pointValue}`;
                    let color = '#00ff88';
                    if (nearest.isIllegalDumpTrash) {
                        pointValue += 150;
                        text = `+$${pointValue} Clean-up!`;
                        color = '#ffd700';
                    }
                    this.game.trashManager.totalPoints += pointValue;
                    
                    // Create pickup effect
                    const wrapped = nearestWrap(nearest.x, nearest.y, this.game.camera.getCenterX(), this.game.camera.getCenterY());
                    this.game.trashManager.pickupEffects.push({
                        x: wrapped.x,
                        y: wrapped.y,
                        text: text,
                        timer: 0,
                        alpha: 1,
                        color: color,
                    });
                    
                    if (window.playerHasTruck > 0) {
                        this.game.trashCollectedInTruck++;
                        if (this.game.trashCollectedInTruck >= window.playerHasTruck * 100) {
                            this.game.hud.showFollowerNotification("Garbage truck full! Unload at the Dump.", false);
                        }
                    }
                    
                    this.game.trashCollectedInWindow++;
                    this.game.trashCollectedInRound = (this.game.trashCollectedInRound || 0) + 1;
                    this.game.hud.updateScore(this.game.trashManager.totalPoints);
                    this.game.trashManager.spawnMore(this.game.gameMap, 1);
                    
                    // Clear target so we pick a new one
                    this.targetTrash = null;
                }
            }
        }

        // Find nearest uncollected trash for visual pathing
        if (!this.targetTrash || this.targetTrash.collected) {
            let nearest = null;
            let minDist = Infinity;
            for (const item of this.game.trashManager.items) {
                if (!item.collected) {
                    const dx = item.x - this.x;
                    const dy = item.y - this.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = item;
                    }
                }
            }
            this.targetTrash = nearest;
        }

        if (this.targetTrash) {
            const target = this.targetTrash;
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 5) {
                this.moving = true;
                const vx = (dx / dist) * this.speed;
                const vy = (dy / dist) * this.speed;
                
                const nextX = this.x + vx * 60 * dt;
                const nextY = this.y + vy * 60 * dt;
                
                // Simple wall collision check
                const tx = Math.floor(nextX / TILE_SIZE);
                const ty = Math.floor(nextY / TILE_SIZE);
                const curTX = this.getTileX();
                const curTY = this.getTileY();
                if (this.game.gameMap.isWalkable(tx, ty, curTX, curTY)) {
                    this.x = nextX;
                    this.y = nextY;
                } else {
                    const txX = Math.floor(nextX / TILE_SIZE);
                    const tyX = Math.floor(this.y / TILE_SIZE);
                    if (this.game.gameMap.isWalkable(txX, tyX, curTX, curTY)) {
                        this.x = nextX;
                    } else {
                        const txY = Math.floor(this.x / TILE_SIZE);
                        const tyY = Math.floor(nextY / TILE_SIZE);
                        if (this.game.gameMap.isWalkable(txY, tyY, curTX, curTY)) {
                            this.y = nextY;
                        }
                    }
                }

                // Determine direction
                if (Math.abs(vx) > Math.abs(vy)) {
                    this.direction = vx > 0 ? 'right' : 'left';
                } else {
                    this.direction = vy > 0 ? 'down' : 'up';
                }
            } else {
                this.moving = false;
            }
        } else {
            this.moving = false;
        }

        // Animation update
        if (this.moving) {
            this.animTimer++;
            if (this.animTimer >= 8) {
                this.animTimer = 0;
                this.animFrame = (this.animFrame + 1) % 4;
            }
        }

        // Record history for followers
        this.positionHistory.push({ x: this.x, y: this.y });
        if (this.positionHistory.length > 1000) {
            this.positionHistory.shift();
        }

        // Update followers
        this.followerManager.update(this, this.game.gameMap);
    }

    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        if (!camera.isVisible(this.x - 32, this.y - 32, 64, 64)) return;

        if (window.cultMode) {
            const img = this.game.spriteManager.getCharacterImage('cult_white_robe');
            if (img && (img.complete || img instanceof HTMLCanvasElement)) {
                let bobY = 0;
                if (this.moving) {
                    bobY = Math.sin(this.animTimer * 0.8) * 1.5;
                }
                ctx.save();
                const drawSize = 64;
                if (this.direction === 'left') {
                    ctx.translate(screen.x, screen.y + bobY);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
                } else {
                    ctx.drawImage(img, screen.x - drawSize / 2, screen.y - drawSize / 2 + bobY, drawSize, drawSize);
                }
                ctx.restore();
                
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.font = '6px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`ORG ${this.index + 1}`, screen.x, screen.y - 36);
                ctx.restore();
                
                this.followerManager.render(ctx, camera, this.game.spriteManager);
                return;
            }
        }

        ctx.save();
        // Body (Blue shirt) - matching 64px height, centered
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(screen.x - 20, screen.y - 22, 40, 44);
        
        // Head
        ctx.fillStyle = '#ffdbac';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 30, 12, 0, Math.PI * 2);
        ctx.fill();

        // Hair/Cap (distinct gold/orange cap)
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(screen.x - 10, screen.y - 42, 20, 6);

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`ORG ${this.index + 1}`, screen.x, screen.y - 48);
        ctx.restore();

        // Render its followers
        this.followerManager.render(ctx, camera, this.game.spriteManager);
    }
}

// ── Boot ──


window.triggerHospitalOffer = function() {
    if (window.game) {
        window.game.state = GameState.UI_OVERLAY;
        window.game.player.keys = { up: false, down: false, left: false, right: false };
    }
    const costPerMember = 10 * Math.max(1, window.playerHasTruck || 0);
    const textEl = document.getElementById('hospital-insurance-text');
    if (textEl) {
        textEl.innerText = `It costs $${costPerMember} per posse member every 10 seconds.`;
    }
    const dialog = document.getElementById('hospital-dialog');
    if (dialog) dialog.classList.remove('hidden');
};

window.triggerFastFoodOffer = function(posseCount) {
    if (window.game) {
        window.game.state = GameState.UI_OVERLAY;
        window.game.player.keys = { up: false, down: false, left: false, right: false };
    }
    const dialog = document.getElementById('fast-food-dialog');
    const costText = document.getElementById('fast-food-cost-text');
    const warnText = document.getElementById('fast-food-warning-text');
    const btnYes = document.getElementById('btn-fast-food-yes');
    const btnNo = document.getElementById('btn-fast-food-no');
    
    if (dialog) {
        let isBlocked = false;
        if (window.cultMode && window.game) {
            const lastEaten = window.game.lastEatenFastFoodId;
            const pending = window.game.pendingFastFoodId;
            if (lastEaten !== undefined && lastEaten !== null && lastEaten === pending && !window.game.visitedDifferentRestaurantSinceLastEat) {
                isBlocked = true;
            }
        }

        if (isBlocked) {
            if (btnYes) btnYes.style.display = 'none';
            if (btnNo) btnNo.innerText = 'Close';
            if (costText) costText.style.display = 'none';
            if (warnText) {
                warnText.innerText = 'You cannot eat here two times in a row without going to a different restaurant first!';
                warnText.style.display = 'block';
            }
        } else {
            if (btnYes) btnYes.style.display = 'inline-block';
            if (btnNo) btnNo.innerText = 'No';
            if (costText) {
                const trashWorth = Math.max(1, Math.round(Math.sqrt(16 * posseCount)));
                const cost = posseCount * trashWorth;
                costText.innerText = `Cost: $${cost.toLocaleString()}`;
                window.currentFastFoodCost = cost;
                costText.style.display = 'block';
            }
            if (warnText) {
                warnText.style.display = 'none';
            }
        }
        dialog.classList.remove('hidden');
    }
};

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Game canvas not found!');
        return;
    }
    // Make canvas focusable
    canvas.setAttribute('tabindex', '0');
    window.game = new Game(canvas);
    
    // Expose start game function to api.js UI logic
    window.startGameFromStore = () => {
        if (window.gameLog) window.gameLog(`window.startGameFromStore invoked. playerHasTruck=${window.playerHasTruck}`);
        if (!window.game.gameMap) {
            if (window.gameLog) window.gameLog("GameMap not defined, calling _restartGame()");
            window.game._restartGame();
        }
        if (window.playerHasTruck) {
            if (window.gameLog) window.gameLog("Starting game with truck ('char_truck')");
            window.game._startGame('char_truck');
        } else {
            if (window.gameLog) window.gameLog("Setting state to CHARACTER_SELECT");
            window.game.state = GameState.CHARACTER_SELECT;
        }
        canvas.focus();
        if (window.gameLog) window.gameLog(`startGameFromStore finished. Game state: ${window.game.state}`);
    };

    // Fast Food Mode Event Listeners
    const btnFFYes = document.getElementById('btn-fast-food-yes');
    if (btnFFYes) btnFFYes.addEventListener('click', () => {
        document.getElementById('fast-food-dialog').classList.add('hidden');
        if (window.game) {
            window.game.state = GameState.PLAYING;
            const cost = window.currentFastFoodCost || 0;
            window.game.trashManager.totalPoints = Math.max(0, window.game.trashManager.totalPoints - cost);
            window.game.hud.updateScore(window.game.trashManager.totalPoints);
            
            window.game.hungerTimer = 45.0;
            window.game.hungerWarned25 = false;
            window.game.hungerWarned10 = false;
            window.game.fastFoodSuspensionTimer = 15.0;
            
            if (Math.random() < 0.20) {
                if (window.game.hasHealthInsurance) {
                    window.game.mushroomTimer = 20.0; // Same as mushroom
                    window.game.hud.timerSpeed = 0.5; // Actually apply the slow down
                    window.game.hud.showFollowerNotification('Food poisoning! Luckily you had insurance. (Speed reduced)', false);
                } else {
                    const count = window.game.followerManager.getFollowerCount();
                    for (let i = 0; i < count; i++) {
                        window.game.followerManager.removeFollower();
                    }
                    window.game.hud.showFollowerNotification('Food poisoning! Entire posse died without insurance!', false);
                }
            } else {
                if (window.cultMode) {
                    window.game.lastEatenFastFoodId = window.game.pendingFastFoodId;
                    window.game.visitedDifferentRestaurantSinceLastEat = false;
                    
                    const currentH = window.game.happiness || 0;
                    const totalBoost = Math.round(15 + (1 - (currentH / 100)) * 20);
                    
                    // Immediate boost of 5%
                    const immediateBoost = 5;
                    window.game.happiness = Math.min(100, currentH + immediateBoost);
                    
                    // Pending boost stacked
                    const remainingBoost = Math.max(0, totalBoost - immediateBoost);
                    window.game.pendingHappinessBoost = (window.game.pendingHappinessBoost || 0) + remainingBoost;
                    window.game.cultHappinessBufferTimer = 10.0;
                    
                    window.game.hud.showFollowerNotification(`Fed posse! +5% Happiness instantly! Digesting remainder (+${remainingBoost}%) in 10s!`, true);
                } else {
                    window.game.hud.showFollowerNotification(`Fed posse for $${cost}! Trash requirement suspended for 15s.`, true);
                }
            }
        }
        canvas.focus();
    });

    const btnFFNo = document.getElementById('btn-fast-food-no');
    if (btnFFNo) btnFFNo.addEventListener('click', () => {
        document.getElementById('fast-food-dialog').classList.add('hidden');
        if (window.game) {
            window.game.state = GameState.PLAYING;
            window.game.followerManager.removeFollower();
            window.game.hud.showFollowerNotification('Posse member left because they were hungry!', false);
        }
        canvas.focus();
    });

    const btnHospYes = document.getElementById('btn-hospital-yes');
    if (btnHospYes) btnHospYes.addEventListener('click', () => {
        document.getElementById('hospital-dialog').classList.add('hidden');
        if (window.game) {
            window.game.state = GameState.PLAYING;
            window.game.hasHealthInsurance = true;
            window.game.hud.showFollowerNotification('Health insurance purchased! Paying $10/person every 10s.', true);
        }
        canvas.focus();
    });

    const btnHospNo = document.getElementById('btn-hospital-no');
    if (btnHospNo) btnHospNo.addEventListener('click', () => {
        document.getElementById('hospital-dialog').classList.add('hidden');
        if (window.game) {
            window.game.state = GameState.PLAYING;
        }
        canvas.focus();
    });

    const btnMafiaVotesYes = document.getElementById('btn-mafia-votes-yes');
    if (btnMafiaVotesYes) {
        btnMafiaVotesYes.addEventListener('click', () => {
            document.getElementById('mafia-votes-dialog').classList.add('hidden');
            if (window.game) {
                window.game.state = GameState.PLAYING;
                window.game.acceptedMafiaVotes = true;
                
                // Determine requirements based on current political office
                let required = 25;
                const office = window.politicalOffice || 'citizen';
                if (office === 'candidate_council' || office === 'citizen') required = 25;
                else if (office === 'candidate_mayor' || office === 'council') required = 40;
                else if (office === 'candidate_senator' || office === 'mayor') required = 60;
                else if (office === 'candidate_president' || office === 'senator') required = 100;
                
                const minPct = 0.20;
                const maxPct = 0.60;
                const pct = minPct + Math.random() * (maxPct - minPct);
                const boost = Math.floor(required * pct);
                
                window.game.handshakesShaken = (window.game.handshakesShaken || 0) + boost;
                window.game.hud.showFollowerNotification(`Mafia delivered ${boost} votes! Police are now chasing you!`, true);
                
                // Spawn 4 police officers at all four corners of the map
                if (window.game.crimeManager) {
                    // Clear out old police just in case
                    window.game.crimeManager.police = [];
                    const corners = [
                        {x: 0, y: 0},
                        {x: MAP_WIDTH - 1, y: 0},
                        {x: 0, y: MAP_HEIGHT - 1},
                        {x: MAP_WIDTH - 1, y: MAP_HEIGHT - 1}
                    ];
                    corners.forEach(c => {
                        window.game.crimeManager.police.push(new PoliceOfficer(c.x, c.y));
                    });
                }
            }
            canvas.focus();
        });
    }

    const btnMafiaVotesNo = document.getElementById('btn-mafia-votes-no');
    if (btnMafiaVotesNo) {
        btnMafiaVotesNo.addEventListener('click', () => {
            document.getElementById('mafia-votes-dialog').classList.add('hidden');
            if (window.game) {
                window.game.state = GameState.PLAYING;
                window.game.acceptedMafiaVotes = false;
            }
            canvas.focus();
        });
    }

    // Word Game Modal Event Listeners
    const btnOpenWordGame = document.getElementById('btn-open-word-game');
    if (btnOpenWordGame) {
        btnOpenWordGame.addEventListener('click', () => {
            if (window.game) {
                window.game.openWordGameDialog();
            }
        });
    }

    const btnStoreViewInventory = document.getElementById('btn-store-view-inventory');
    if (btnStoreViewInventory) {
        btnStoreViewInventory.addEventListener('click', () => {
            if (window.game) {
                window.game.openWordGameDialog();
            }
        });
    }

    const btnWordGameClose = document.getElementById('btn-word-game-close');
    if (btnWordGameClose) {
        btnWordGameClose.addEventListener('click', () => {
            document.getElementById('trash-word-game-dialog').classList.add('hidden');
            if (window.game) {
                window.game.state = window.game.preDialogState || GameState.PLAYING;
            }
            canvas.focus();
        });
    }

    window.addEventListener('blur', () => {
        if (window.game) {
            window.game.resetKeys();
        }
    });
});

class GameDragon {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.speed = 5.5;
        this.followerManager = new FollowerManager();
        this.followerManager.initialize('char_dragon');
        
        this.targetTrash = null;
        this.direction = 'down';
        this.animFrame = 0;
        this.animTimer = 0;
        this.moving = false;
        this.positionHistory = [{ x: this.x, y: this.y }];
        this.fireTimer = 0;
        this.fireX = 0;
        this.fireY = 0;
    }

    getTileX() { return Math.floor(this.x / TILE_SIZE); }
    getTileY() { return Math.floor(this.y / TILE_SIZE); }

    update(dt) {
        if (this.collectTimer === undefined) this.collectTimer = 0;
        this.collectTimer += dt;
        if (this.collectTimer >= 0.5) {
            this.collectTimer -= 0.5;
            let nearest = null;
            let minDist = TILE_SIZE * 10;
            for (const item of this.game.trashManager.items) {
                if (!item.collected) {
                    const dx = item.x - this.x;
                    const dy = item.y - this.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = item;
                    }
                }
            }
            if (nearest) {
                nearest.collected = true;
                this.game.trashManager.totalCollected++;
                this.fireTimer = 0.25;
                this.fireX = nearest.x;
                this.fireY = nearest.y;
                const totalFollowers = this.game.getRoundTotalFollowersForValue();
                const pointValue = Math.max(1, Math.round(Math.sqrt(16 * totalFollowers)));
                this.game.trashManager.totalPoints += pointValue;
                
                const wrapped = nearestWrap(nearest.x, nearest.y, this.game.camera.getCenterX(), this.game.camera.getCenterY());
                this.game.trashManager.pickupEffects.push({
                    x: wrapped.x,
                    y: wrapped.y,
                    text: `🔥 +$${pointValue}`,
                    timer: 0,
                    alpha: 1,
                    color: '#ff6600',
                });
                
                this.game.trashCollectedInWindow++;
                this.game.trashCollectedInRound = (this.game.trashCollectedInRound || 0) + 1;
                this.game.hud.updateScore(this.game.trashManager.totalPoints);
                this.game.trashManager.spawnMore(this.game.gameMap, 1);
                this.targetTrash = null;
            }
        }

        if (!this.targetTrash || this.targetTrash.collected) {
            let nearest = null;
            let minDist = Infinity;
            for (const item of this.game.trashManager.items) {
                if (!item.collected) {
                    const dx = item.x - this.x;
                    const dy = item.y - this.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = item;
                    }
                }
            }
            this.targetTrash = nearest;
        }

        if (this.targetTrash) {
            const target = this.targetTrash;
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 5) {
                this.moving = true;
                const vx = (dx / dist) * this.speed;
                const vy = (dy / dist) * this.speed;
                this.x += vx * 60 * dt;
                this.y += vy * 60 * dt;
                if (Math.abs(vx) > Math.abs(vy)) {
                    this.direction = vx > 0 ? 'right' : 'left';
                } else {
                    this.direction = vy > 0 ? 'down' : 'up';
                }
            } else {
                this.moving = false;
            }
        } else {
            this.moving = false;
        }

        if (this.fireTimer > 0) {
            this.fireTimer -= dt;
        }

        this.positionHistory.push({ x: this.x, y: this.y });
        if (this.positionHistory.length > 1000) {
            this.positionHistory.shift();
        }
        this.followerManager.update(this, this.game.gameMap);
    }

    render(ctx, camera) {
        const wrapped = nearestWrap(this.x, this.y, camera.getCenterX(), camera.getCenterY());
        const screen = camera.worldToScreen(wrapped.x, wrapped.y);
        
        if (this.fireTimer > 0 && this.game.spriteManager) {
            const fireImg = this.game.spriteManager.getImage('dragon_fire');
            if (fireImg) {
                const wFire = nearestWrap(this.fireX, this.fireY, camera.getCenterX(), camera.getCenterY());
                const screenFire = camera.worldToScreen(wFire.x, wFire.y);
                ctx.drawImage(fireImg, screenFire.x - 16, screenFire.y - 16, 32, 32);
                
                ctx.strokeStyle = 'rgba(255, 100, 0, 0.6)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(screen.x, screen.y);
                ctx.lineTo(screenFire.x, screenFire.y);
                ctx.stroke();
            }
        }

        if (this.game.spriteManager) {
            const dragImg = this.game.spriteManager.getCharacterImage('char_dragon');
            if (dragImg) {
                ctx.drawImage(dragImg, screen.x - 72, screen.y - 72, 144, 144);
            }
        }
        
        ctx.fillStyle = '#16a34a';
        ctx.font = 'bold 6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText("🐲 DRAGON", screen.x, screen.y - 78);
        this.followerManager.render(ctx, camera, this.game.spriteManager);
    }
}
