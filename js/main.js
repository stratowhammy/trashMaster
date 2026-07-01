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
        const img = spriteManager.getImage('red_truck'); // Parade truck / chained truck is red!
        if (img) {
            ctx.save();
            if (this.direction === 'left') {
                ctx.translate(screen.x, screen.y);
                ctx.scale(-1, 1);
                ctx.drawImage(img, -this.size / 2, -this.size / 2, this.size, this.size);
            } else {
                ctx.drawImage(img, screen.x - this.size / 2, screen.y - this.size / 2, this.size, this.size);
            }
            ctx.restore();
        }
    }
}

class Game {
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
                            const dist = Math.sqrt((px - don.x)**2 + (py - don.y)**2);
                            if (dist < TILE_SIZE * 1.5) {
                                nearDon = don;
                                break;
                            }
                        }
                        if (nearDon) {
                            if (this.crimeManager.activeTask && this.crimeManager.activeTask.type === 'talk_don' && nearDon.id === this.crimeManager.activeTask.targetDonId) {
                                this.crimeManager.completeTask(this);
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

                    if (window.frenzyMode || window.flowersMode) {
                        const result = this.npcManager.interactWithNearest(this.player.x, this.player.y);
                        if (result) {
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
                                    this.followerManager.addFollower(this.player.x, this.player.y);
                                    this.hud.showFollowerNotification('Recruited a new posse member from the green car!', true);
                                    return; // Stop processing 'E' if recruited from a car
                                }
                            }
                        }
                    }


                    // Fast Food & Hospital interaction
                    if (window.fastFoodMode) {
                        const px = wrapWorldX(this.player.x);
                        const py = wrapWorldY(this.player.y);
                        
                        // Check Hospital
                        if (!this.hasHealthInsurance) {
                            const hospital = this.gameMap.buildings.find(b => b.type === 'hospital');
                            if (hospital && hospital.doorTiles.length > 0) {
                                const hDoor = hospital.doorTiles[0];
                                const dist = Math.sqrt((px - (hDoor.x*TILE_SIZE + TILE_SIZE/2))**2 + (py - (hDoor.y*TILE_SIZE + TILE_SIZE/2))**2);
                                if (dist < TILE_SIZE * 1.5) {
                                    window.triggerHospitalOffer();
                                    return;
                                }
                            }
                        }

                        // Check Fast Food
                        const ffBuildings = this.gameMap.buildings.filter(b => b.type === 'fast_food');
                        for (const ffBldg of ffBuildings) {
                            if (ffBldg && ffBldg.doorTiles.length > 0) {
                                const door = ffBldg.doorTiles[0];
                                const dist = Math.sqrt((px - (door.x*TILE_SIZE + TILE_SIZE/2))**2 + (py - (door.y*TILE_SIZE + TILE_SIZE/2))**2);
                                if (dist < TILE_SIZE * 1.5) {
                                    window.triggerFastFoodOffer(this.followerManager.getFollowerCount());
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
                                        this.crimeManager.spawnThugs(this.gameMap);
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
                        // Check Don intimidate first
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
                    if (window.crimeMode) {
                        let targetCar = null;
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

                        if (targetCar) {
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
                        }
                    } else if (window.politicsMode) {
                        const npc = this.npcManager.checkInteraction(this.player.x, this.player.y);
                        if (npc && !npc.shaken) {
                            npc.shaken = true;
                            this.handshakesShaken = (this.handshakesShaken || 0) + 1;
                            this.hud.showFollowerNotification(`Shook hands with ${npc.name}! (+1 Vote)`, true);
                            
                            // Remove the shaken NPC from list and spawn a new one
                            this.npcManager.npcs = this.npcManager.npcs.filter(n => n !== npc);
                            this.npcManager.spawnSingleNPC(this.gameMap);
                        }
                    }
                }

                // Hotkeys for Consumables
                if (e.key === 't' || e.key === 'T') this.useConsumable('Borrowed Time');
                if (e.key === 'm' || e.key === 'M') this.useConsumable('Mushrooms');
                if (e.key === 'w' || e.key === 'W') this.useConsumable('Wings');
                if (e.key === 'p' || e.key === 'P') this.useConsumable('Protection');

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

    pickupTrash() {
        if (this.state !== GameState.PLAYING || !this.player) return;

        let maxToPick = Infinity;
        if (window.playerHasTruck > 0) {
            const maxCap = window.playerHasTruck * 50;
            maxToPick = Math.max(0, maxCap - this.trashCollectedInTruck);
            if (maxToPick <= 0) {
                if (!this.lastCapacityNotificationTime || Date.now() - this.lastCapacityNotificationTime > 3000) {
                    this.hud.showFollowerNotification("Garbage truck full! Unload at the Dump.", false);
                    this.lastCapacityNotificationTime = Date.now();
                }
                return;
            }
        }

        const pickupRadius = TILE_SIZE * 0.8;
        const picked = this.trashManager.checkPickup(this.player.x, this.player.y, pickupRadius, this.followerManager.getFollowerCount(), maxToPick);

        if (picked.length > 0) {
            if (window.playerHasTruck > 0) {
                this.trashCollectedInTruck += picked.length;
                if (this.trashCollectedInTruck >= window.playerHasTruck * 50) {
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

    _update(dt) {
        if (this.state !== GameState.PLAYING) return;

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
            this._showSplashGameOver("TIME'S UP!", `Your shift is over! You earned $${this.trashManager.totalPoints}.`, false);
            return;
        }

        // Frenzy/Politics/Flowers Mode updates
        if (window.frenzyMode || window.flowersMode || window.politicsMode) {
            this.npcManager.update();
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
        if ((window.crimeMode || (window.politicsMode && this.acceptedMafiaVotes)) && this.crimeManager) {
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
            for (let i = 0; i < this.truckChain.length; i++) {
                const truck = this.truckChain[i];
                let leaderHistory;
                if (i === 0) {
                    leaderHistory = this.player.positionHistory;
                } else {
                    leaderHistory = this.truckChain[i - 1].positionHistory;
                }
                truck.update(leaderHistory, this.gameMap);
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
                    const count = this.followerManager.getFollowerCount();
                    if (count > 0) {
                        this.followerManager.removeFollower();
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
                const maxCap = window.playerHasTruck * 50;
                maxToPick = Math.max(0, maxCap - (this.trashCollectedInTruck + followerPicked.length));
            }
            if (maxToPick <= 0) {
                if (window.playerHasTruck > 0 && (!this.lastCapacityNotificationTime || Date.now() - this.lastCapacityNotificationTime > 3000)) {
                    this.hud.showFollowerNotification("Garbage truck full! Unload at the Dump.", false);
                    this.lastCapacityNotificationTime = Date.now();
                }
                break; // Stop loop since truck is completely full
            }
            const picked = this.trashManager.checkPickup(follower.x, follower.y, pickupRadius * 0.8, this.followerManager.getFollowerCount(), maxToPick);
            followerPicked = followerPicked.concat(picked);
        }

        if (followerPicked.length > 0) {
            if (window.playerHasTruck > 0) {
                this.trashCollectedInTruck += followerPicked.length;
                if (this.trashCollectedInTruck >= window.playerHasTruck * 50) {
                    this.hud.showFollowerNotification("Garbage truck full! Unload at the Dump.", false);
                }
            }
            this.hud.updateScore(this.trashManager.totalPoints);
            this.trashCollectedInWindow += followerPicked.length;
            this.trashCollectedInRound = (this.trashCollectedInRound || 0) + followerPicked.length;
            this.trashManager.spawnMore(this.gameMap, followerPicked.length);
        }

        if (window.fastFoodMode) {
            // Hunger timer
            this.hungerTimer -= dt;
            if (this.hungerTimer <= 0) {
                this.hungerTimer = 45.0;
                const count = this.followerManager.getFollowerCount();
                const toLose = Math.floor(count / 2);
                for (let i = 0; i < toLose; i++) {
                    this.followerManager.removeFollower();
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
                    const count = this.followerManager.getFollowerCount();
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

        // Follower economy logic (10-second window)
        this.followerCheckTimer += dt;
        if (this.followerCheckTimer >= 10) {
            this.followerCheckTimer -= 10;
            const baseFollowers = (window.playerHasTruck ? 2 : 0) + (window.employeesHired || 0);
            if (this.trashCollectedInWindow >= 7) {
                // Add follower
                const newFollower = this.followerManager.addFollower(this.player.x, this.player.y);
                const charConfig = SPRITE_CONFIG.characters.find(c => c.id === newFollower.spriteId);
                this.hud.showFollowerNotification(charConfig ? charConfig.name : 'New posse member!', true);
            } else if (this.trashCollectedInWindow < 5) {
                // Lose follower
                if (this.followerManager.getFollowerCount() > baseFollowers) {
                    if (window.fastFoodMode && this.fastFoodSuspensionTimer > 0) {
                        // Trash requirement suspended!
                    } else {
                        this.followerManager.removeFollower();
                        this.hud.showFollowerNotification('A posse member left!', false);
                    }
                }
            }
            this.trashCollectedInWindow = 0;
            this.hud.followerCount = this.followerManager.getFollowerCount();
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
    }

    _render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        if (this.lastLoggedState !== this.state) {
            this.lastLoggedState = this.state;
            if (window.gameLog) window.gameLog(`_render: state is now: ${this.state}`);
        }

        // Clear
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
        ctx.fillStyle = '#0f8';
        ctx.font = 'bold 36px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TRASH MASTER', w / 2, 80);

        // Subtitle glow
        ctx.fillStyle = '#68f';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillText('Choose Your Character', w / 2, 120);

        // Character cards
        const cardW = 140;
        const cardH = 190;
        const cardGap = 20;
        const totalW = SPRITE_CONFIG.characters.length * (cardW + cardGap) - cardGap;
        const startX = (w - totalW) / 2;
        const startY = (h - cardH) / 2 - 10;

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
        this.hud.followerCount = this.followerManager.getFollowerCount();
        
        this.npcManager = new NPCManager();
        this.npcManager.spawnNPCs(this.gameMap, this.gameMap.buildings, window.frenzyMode);
        this.pirateManager = new PirateManager();
        this.carManager.spawnCars();
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

        // Fast Food Mode State
        this.hungerTimer = 45.0;
        this.fastFoodSuspensionTimer = 0.0;
        this.hasHealthInsurance = false;
        this.insurancePaymentTimer = 10.0;

        // Snap camera to player
        if (window.gameLog) window.gameLog(`_startGame: snapping camera to player x=${this.player.x}, y=${this.player.y}`);
        this.camera.snapTo(this.player.x, this.player.y);
        if (window.gameLog) window.gameLog(`_startGame: camera snapped to x=${this.camera.x}, y=${this.camera.y}, size: w=${this.camera.width}, h=${this.camera.height}`);

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
        try {
            const result = await window.apiCall('/api/game/end-round', 'POST', { 
                earned, 
                employee_cost: this.totalEmployeeCost,
                employees_killed: this.employeesKilledThisRound,
                followers: this.followerManager.getFollowerCount(),
                trash_collected: this.trashCollectedInRound || 0,
                handshakes: this.handshakesShaken || 0
            });
            window.employeesHired = 0;
            await window.refreshGameState();
            window.renderStore();
            window.showScreen('store-screen');
            this.state = GameState.UI_OVERLAY;
            
            if (result && result.multiplier && result.multiplier > 1) {
                alert(`🎱 Magic 8-Ball Activated! Your score was multiplied by ${result.multiplier}x!`);
            }
        } catch(e) {
            console.error("End round sync failed:", e);
        }
    }

    _restartGame() {
        this.gameMap = new GameMap();
        this.miniMap.buildStatic(this.gameMap);
        this.player = null;
        this.state = GameState.CHARACTER_SELECT;
    }

    _renderGame(ctx, w, h) {
        if (!this.hasLoggedRender) {
            this.hasLoggedRender = true;
            if (window.gameLog) {
                window.gameLog(`_renderGame FIRST call: w=${w}, h=${h}, player.x=${this.player ? this.player.x : 'null'}, camera.x=${this.camera ? this.camera.x : 'null'}, camera size: w=${this.camera ? this.camera.width : 'null'}, h=${this.camera ? this.camera.height : 'null'}`);
            }
        }
        // Render map
        this.gameMap.render(ctx, this.camera, this.player);

        // Draw Fast Food & Hospital markers
        if (window.fastFoodMode && this.spriteManager) {
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
                'city_hall': { img: 'philly_city_hall', label: 'CITY HALL' },
                'art_museum': { img: 'philly_art_museum', label: 'ART MUSEUM' },
                'liberty_bell': { img: 'philly_liberty_bell', label: 'INDEPENDENCE HALL' },
                'one_liberty': { img: 'philly_one_liberty', label: 'ONE LIBERTY' },
                'franklin_institute': { img: 'philly_franklin_inst', label: 'FRANKLIN INST.' },
                'station': { img: 'philly_station', label: '30TH ST STATION' }
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
        
        if (window.frenzyMode || window.flowersMode || window.politicsMode) {
            this.npcManager.render(ctx, this.camera, this.spriteManager);
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

        if (window.crimeMode || (window.politicsMode && this.acceptedMafiaVotes)) {
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

        // Render HUD
        this.hud.render(ctx, w, h);

        if (window.frenzyMode || window.politicsMode) {
            this.npcManager.renderDialogue(ctx, w, h);
            if (window.frenzyMode) {
                this.pirateManager.renderCombatResults(ctx, w, h);
            }
        }

        if (window.crimeMode) {
            this.npcManager.renderDialogue(ctx, w, h);
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
            } else {
                const img = this.spriteManager.getCharacterImage('char_student');
                if (img) {
                    ctx.drawImage(img, screen.x - 16, screen.y - 16, 32, 32);
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

        // Always show the GIF on the splash screen as requested
        const gifEl = document.getElementById('defeat-gif');
        if (gifEl) gifEl.style.display = 'block';

        // Draw pixel art to defeat canvas
        const artCanvas = document.getElementById('defeatArtCanvas');
        if (artCanvas) {
            document.getElementById('defeat-art-container').style.display = 'block';
            const ctx = artCanvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 256, 128);

            const pirateImg = this.spriteManager.getCharacterImage('char_pirate');
            const truckImg = this.spriteManager.getCharacterImage('char_truck');
            
            if (isPirateDefeat) {
                // Ground
                ctx.fillStyle = '#222222';
                ctx.fillRect(0, 96, 256, 32);

                if (hadTruck && truckImg && pirateImg) {
                    // Draw road lines
                    ctx.strokeStyle = '#444';
                    ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(0, 108); ctx.lineTo(256, 108); ctx.stroke();
    
                    // Draw trash truck driving away
                    ctx.drawImage(truckImg, 96, 36, 64, 64);
                    
                    // Draw pirate driving
                    ctx.drawImage(pirateImg, 112, 24, 32, 32);
                    // Draw another pirate waving from the back
                    ctx.drawImage(pirateImg, 140, 28, 32, 32);
                } else {
                    // Draw ground red blob for shapeless body
                    ctx.fillStyle = '#aa2222';
                    ctx.fillRect(96, 90, 48, 10);
                    ctx.fillStyle = '#666666';
                    ctx.fillRect(104, 84, 16, 6);
                    ctx.fillRect(124, 86, 10, 4);
    
                    if (pirateImg) {
                        // Two pirates standing triumphantly over body
                        ctx.drawImage(pirateImg, 90, 52, 32, 32);
                        ctx.drawImage(pirateImg, 130, 50, 32, 32);
                    }
                }
            } else {
                // Time's Up art
                // Draw night sky
                ctx.fillStyle = '#111122';
                ctx.fillRect(0, 0, 256, 128);
                
                // Draw moon
                ctx.fillStyle = '#ffeeaa';
                ctx.beginPath();
                ctx.arc(200, 30, 15, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw city skyline silhouette
                ctx.fillStyle = '#000000';
                ctx.fillRect(20, 60, 40, 68);
                ctx.fillRect(65, 40, 30, 88);
                ctx.fillRect(100, 70, 50, 58);
                ctx.fillRect(155, 50, 35, 78);
                ctx.fillRect(195, 80, 45, 48);
                
                // Draw ground
                ctx.fillStyle = '#221100';
                ctx.fillRect(0, 110, 256, 18);
            }
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
                            await window.apiCall('/api/game/end-round', 'POST', {
                                earned: 0,
                                employee_cost: this.totalEmployeeCost,
                                employees_killed: this.employeesKilledThisRound,
                                lose_truck: hadTruck,
                                followers: this.followerManager.getFollowerCount(),
                                handshakes: this.handshakesShaken || 0
                            });
                            window.employeesHired = 0;
                            await window.refreshGameState();
                            window.renderStore();
                            
                            // Hide defeat screen, show store screen
                            if (screenEl) screenEl.classList.add('hidden');
                            window.showScreen('store-screen');
                            this._restartGame();
                        } catch (e) {
                            console.error("Return from defeat error:", e);
                        }
                    }
                } else {
                    // Time's up scenario - use normal end round
                    if (screenEl) screenEl.classList.add('hidden');
                    await this._endRoundAndReturnToStore();
                    this._restartGame();
                }
            });
        }
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
                        await window.apiCall('/api/game/end-round', 'POST', {
                            earned: 0,
                            employee_cost: this.totalEmployeeCost,
                            employees_killed: this.employeesKilledThisRound,
                            lose_truck: false, // they do NOT lose their truck from car accident!
                            followers: this.followerManager.getFollowerCount(),
                            handshakes: this.handshakesShaken || 0
                        });
                        window.employeesHired = 0;
                        await window.refreshGameState();
                        window.renderStore();
                        
                        if (screenEl) screenEl.classList.add('hidden');
                        window.showScreen('store-screen');
                        this._restartGame();
                    } catch (e) {
                        console.error("Return from defeat error:", e);
                    }
                }
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

        if (isMafiaArrest) {
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

        // Draw pixel art to defeat canvas: player behind bars (jail) if not mafia arrest
        if (!isMafiaArrest) {
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
                        await window.apiCall('/api/game/end-round', 'POST', {
                            earned: 0,
                            employee_cost: this.totalEmployeeCost,
                            employees_killed: this.employeesKilledThisRound,
                            lose_truck: isMafiaArrest, 
                            followers: 0, // lost anyway
                            handshakes: this.handshakesShaken || 0,
                            mafia_arrest: isMafiaArrest
                        });
                        window.employeesHired = 0;
                        await window.refreshGameState();
                        window.renderStore();
                        
                        // Restore overlays
                        if (gifEl) {
                            gifEl.src = "assets/sprites/defeat_animation.gif";
                            gifEl.style.width = "128px";
                            gifEl.style.height = "128px";
                        }
                        if (artContainer) artContainer.style.display = "block";
                        if (titleEl) titleEl.innerText = "WASTED BY PIRATES";

                        if (screenEl) screenEl.classList.add('hidden');
                        window.showScreen('store-screen');
                        this._restartGame();
                    } catch (e) {
                        console.error("Return from defeat error:", e);
                    }
                }
            });
        }
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
    if (dialog && costText) {
        const trashWorth = Math.max(1, Math.round(Math.sqrt(8 * posseCount)));
        const cost = posseCount * trashWorth;
        costText.innerText = `Cost: $${cost.toLocaleString()}`;
        window.currentFastFoodCost = cost;
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
            window.game.fastFoodSuspensionTimer = 10.0;
            
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
                window.game.hud.showFollowerNotification(`Fed posse for $${cost}! Trash requirement suspended for 10s.`, true);
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
                
                // Spawn 4 police officers at the station
                if (window.game.crimeManager) {
                    // Clear out old police just in case
                    window.game.crimeManager.police = [];
                    const station = window.game.gameMap.buildings[1];
                    if (station && station.doorTiles.length > 0) {
                        const door = station.doorTiles[0];
                        for (let i = 0; i < 4; i++) {
                            window.game.crimeManager.police.push(new PoliceOfficer(door.x, door.y));
                        }
                    }
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
});
