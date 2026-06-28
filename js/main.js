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

class Game {
    constructor(canvas) {
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
        try {
            await this.spriteManager.loadAll();
        } catch (e) {
            console.error('Sprite loading failed:', e);
        }
        this.miniMap.buildStatic(this.gameMap);
        this.state = GameState.CHARACTER_SELECT;
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
                        let nearDon = null;
                        for (const don of this.crimeManager.dons) {
                            const dist = Math.sqrt((this.player.x - don.x)**2 + (this.player.y - don.y)**2);
                            if (dist < TILE_SIZE * 0.8) {
                                nearDon = don;
                                break;
                            }
                        }
                        if (nearDon) {
                            this.crimeManager.triggerMadeManOffer(nearDon.id);
                            return;
                        }

                        // Check Police Chief bribe
                        if (this.crimeManager.madeMan && this.crimeManager.policeChief) {
                            const chiefDist = Math.sqrt((this.player.x - this.crimeManager.policeChief.x)**2 + (this.player.y - this.crimeManager.policeChief.y)**2);
                            if (chiefDist < TILE_SIZE * 0.8) {
                                this.crimeManager.triggerBribeChief();
                                return;
                            }
                        }
                    }

                    if (window.frenzyMode) {
                        const result = this.npcManager.interactWithNearest(this.player.x, this.player.y);
                        if (result && result.isInformant) {
                            // Open door!
                            this.gameMap.openBuildingDoor(result.buildingId);
                            // Spawn pirates!
                            const bldg = this.gameMap.buildings.find(b => b.id === result.buildingId);
                            if (bldg && bldg.doorTiles.length > 0) {
                                const door = bldg.doorTiles[0];
                                this.pirateManager.spawnPirates(door.x, door.y);
                            }
                        }
                    }

                    // Green car interaction check
                    if (this.carManager && this.carManager.cars) {
                        for (const car of this.carManager.cars) {
                            if (car.active && car.color === 'green') {
                                const dx = this.player.x - car.x;
                                const dy = this.player.y - car.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist < TILE_SIZE * 0.8) {
                                    car.active = false;
                                    this.followerManager.addFollower(this.player.x, this.player.y);
                                    this.hud.showFollowerNotification('Recruited a new posse member from the green car!', true);
                                    break;
                                }
                            }
                        }
                    }
                }

                // K or k to kill NPC
                if (e.key === 'k' || e.key === 'K') {
                    if (window.crimeMode) {
                        const npc = this.npcManager.checkInteraction(this.player.x, this.player.y);
                        if (npc) {
                            const idx = this.npcManager.npcs.indexOf(npc);
                            if (idx >= 0) {
                                this.npcManager.npcs.splice(idx, 1);
                                this.hud.showFollowerNotification('NPC killed!', true);
                                
                                if (this.crimeManager.activeTask && 
                                    (this.crimeManager.activeTask.type === 'collect_gold' || this.crimeManager.activeTask.type === 'intimidate' || this.crimeManager.activeTask.type === 'rob_npc')) {
                                    this.hud.showFollowerNotification('Favor completed for the Don!', true);
                                    this.crimeManager.assignNextTask(this.gameMap);
                                }
                            }
                        }
                    }
                }

                // I or i to intimidate NPC
                if (e.key === 'i' || e.key === 'I') {
                    if (window.crimeMode) {
                        const npc = this.npcManager.checkInteraction(this.player.x, this.player.y);
                        if (npc) {
                            this.npcManager.activeDialogue = {
                                lines: ["Please don't hurt me!", "I'll do whatever you say!"],
                                lineIndex: 0,
                                timer: 120
                            };
                            this.hud.showFollowerNotification('NPC Intimidated!', true);
                            if (this.crimeManager.activeTask && this.crimeManager.activeTask.type === 'intimidate') {
                                this.hud.showFollowerNotification('Favor completed for the Don!', true);
                                this.crimeManager.assignNextTask(this.gameMap);
                            }
                        }
                    }
                }

                // R or r to rob NPC
                if (e.key === 'r' || e.key === 'R') {
                    if (window.crimeMode) {
                        const npc = this.npcManager.checkInteraction(this.player.x, this.player.y);
                        if (npc) {
                            const robbedAmount = 100 + Math.floor(Math.random() * 701); // 100 to 800
                            this.trashManager.totalPoints += robbedAmount;
                            this.hud.showFollowerNotification(`Robbed NPC for $${robbedAmount}!`, true);
                            if (this.crimeManager.activeTask && this.crimeManager.activeTask.type === 'rob_npc') {
                                this.hud.showFollowerNotification('Favor completed for the Don!', true);
                                this.crimeManager.assignNextTask(this.gameMap);
                            }
                        }
                    }
                }

                // S or s to steal car
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
                                        this.hud.showFollowerNotification('Favor completed for the Don!', true);
                                        this.crimeManager.assignNextTask(this.gameMap);
                                    }
                                } else {
                                    this.hud.showFollowerNotification('You need a posse member to drive off with the stolen car!', true);
                                }
                            } else {
                                this.hud.showFollowerNotification('You can only steal cars on roads or intersections!', true);
                            }
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
                this.errorLog.push(e.message);
                // Still render error overlay even if game crashes
                try { this._renderError(); } catch (_) {}
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    pickupTrash() {
        if (this.state !== GameState.PLAYING || !this.player) return;

        const pickupRadius = TILE_SIZE * 0.8;
        const picked = this.trashManager.checkPickup(this.player.x, this.player.y, pickupRadius, this.followerManager.getFollowerCount());

        if (picked.length > 0) {
            this.hud.updateScore(this.trashManager.totalPoints);
            this.trashCollectedInWindow += picked.length;
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
        this.hud.evalTimer = 10 - this.followerCheckTimer;
        this.hud.trashInWindow = this.trashCollectedInWindow;

        if (this.hud.isTimeUp()) {
            this.state = GameState.GAME_OVER;
            return;
        }

        // Frenzy Mode updates
        if (window.frenzyMode) {
            this.npcManager.update();
            this.pirateManager.update(dt, this);

            // Trigger NPC interaction checks
            this.npcManager.checkInteraction(this.player.x, this.player.y);

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
                                this._triggerPlayerDefeat();
                                return;
                            }
                        }
                    }
                }
            }
        }

        // Crime Mode updates
        if (window.crimeMode && this.crimeManager) {
            this.npcManager.update();
            this.npcManager.checkInteraction(this.player.x, this.player.y);
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
                                this.hud.showFollowerNotification('Favor completed for the Don!', true);
                                this.crimeManager.assignNextTask(this.gameMap);
                            }
                        }
                    }
                }
            }

            // Check if player is near any Don or Police Chief to show HUD prompt
            let nearDon = false;
            for (const don of this.crimeManager.dons) {
                const dist = Math.sqrt((this.player.x - don.x)**2 + (this.player.y - don.y)**2);
                if (dist < TILE_SIZE * 0.8) {
                    nearDon = true;
                    this.hud.showFollowerNotification(`Press [E] to talk to ${don.name}`, false);
                    break;
                }
            }

            if (!nearDon && this.crimeManager.madeMan && this.crimeManager.policeChief) {
                const chiefDist = Math.sqrt((this.player.x - this.crimeManager.policeChief.x)**2 + (this.player.y - this.crimeManager.policeChief.y)**2);
                if (chiefDist < TILE_SIZE * 0.8) {
                    this.hud.showFollowerNotification('Press [E] to Bribe Police Chief', false);
                }
            }
        }

        // Update player
        this.player.update(this.gameMap);

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

        // Update followers
        this.followerManager.update(this.player, this.gameMap);

        // Check trash pickup — followers automatically clean up trash
        const pickupRadius = TILE_SIZE * 0.7;
        let followerPicked = [];
        for (const follower of this.followerManager.followers) {
            const picked = this.trashManager.checkPickup(follower.x, follower.y, pickupRadius * 0.8, this.followerManager.getFollowerCount());
            followerPicked = followerPicked.concat(picked);
        }

        if (followerPicked.length > 0) {
            this.hud.updateScore(this.trashManager.totalPoints);
            this.trashCollectedInWindow += followerPicked.length;
            this.trashManager.spawnMore(this.gameMap, followerPicked.length);
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
                    this.followerManager.removeFollower();
                    this.hud.showFollowerNotification('A posse member left!', false);
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
        const baseFollowers = (window.playerHasTruck ? 2 : 0) + (window.employeesHired || 0);
        for(let i=0; i<baseFollowers; i++) {
            this.followerManager.addFollower(this.player.x, this.player.y);
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
        
        this.trashManager.spawnInitial(this.gameMap, initialTrash);
        
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
        this.protectionTimer = 0;
        this.protectionBonus = 0;
        this.employeesKilledThisRound = 0;
        
        this.followerCheckTimer = 0;
        this.employeeUpkeepTimer = 0;
        this.totalEmployeeCost = 0;
        this.trashCollectedInWindow = 0;
        this.playerNearTrash = false;
        
        this.mushroomTimer = 0;
        this.wingsTimer = 0;
        if (this.player) this.player.speedMultiplier = 1.0;

        // Snap camera to player
        this.camera.snapTo(this.player.x, this.player.y);

        this.state = GameState.PLAYING;
        console.log('Game state set to PLAYING. Player:', this.player);
    }

    async _endRoundAndReturnToStore() {
        if (!window.apiCall) return; // Not logged in
        
        const earned = this.trashManager.totalPoints;
        try {
            await window.apiCall('/api/game/end-round', 'POST', { 
                earned, 
                employee_cost: this.totalEmployeeCost,
                employees_killed: this.employeesKilledThisRound
            });
            window.employeesHired = 0;
            await window.refreshGameState();
            window.renderStore();
            window.showScreen('store-screen');
            this.state = GameState.UI_OVERLAY;
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
        // Render map
        this.gameMap.render(ctx, this.camera, this.player);

        if (window.frenzyMode) {
            this.gameMap.renderAddresses(ctx, this.camera);
            this.npcManager.render(ctx, this.camera, this.spriteManager);
            this.pirateManager.render(ctx, this.camera, this.spriteManager);
        }

        if (window.crimeMode) {
            this.gameMap.renderAddresses(ctx, this.camera);
            this.npcManager.render(ctx, this.camera, this.spriteManager);
            if (this.crimeManager) {
                this.crimeManager.render(ctx, this.camera);
            }
        }

        // Render traffic cars
        if (this.carManager) {
            this.carManager.render(ctx, this.camera);
        }

        // Render trash
        this.trashManager.render(ctx, this.camera, this.spriteManager);

        // Render followers (behind player)
        this.followerManager.render(ctx, this.camera, this.spriteManager);

        // Render player
        if (this.player) {
            this.player.render(ctx, this.camera, this.spriteManager);
        }

        // Render HUD
        this.hud.render(ctx, w, h);

        if (window.frenzyMode) {
            this.npcManager.renderDialogue(ctx, w, h);
            this.pirateManager.renderCombatResults(ctx, w, h);
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

    async _triggerPlayerDefeat() {
        this.state = GameState.UI_OVERLAY;
        if (this.player) this.player.keys = { up: false, down: false, left: false, right: false };

        const hadTruck = !!window.playerHasTruck;
        const msgEl = document.getElementById('defeat-message');
        if (msgEl) {
            if (hadTruck) {
                msgEl.innerText = "The pirates defeated you and drove off with Bruno the Trash Truck! All earnings this round were lost.";
            } else {
                msgEl.innerText = "The pirates defeated you! All earnings this round were lost.";
            }
        }

        // Hide game canvas and show defeat screen
        this.canvas.classList.add('hidden');
        const screenEl = document.getElementById('pirate-defeat-screen');
        if (screenEl) screenEl.classList.remove('hidden');

        // Draw pixel art to defeat canvas
        const artCanvas = document.getElementById('defeatArtCanvas');
        if (artCanvas) {
            const ctx = artCanvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 256, 128);

            // Ground
            ctx.fillStyle = '#222222';
            ctx.fillRect(0, 96, 256, 32);

            const pirateImg = this.spriteManager.getCharacterImage('char_pirate');
            const truckImg = this.spriteManager.getCharacterImage('char_truck');

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
                    ctx.drawImage(pirateImg, 120, 52, 32, 32);
                }
            }
        }

        // Setup the return button listener
        const btnReturn = document.getElementById('btn-defeat-return');
        if (btnReturn) {
            // Remove previous listeners by replacing the button clone
            const newBtn = btnReturn.cloneNode(true);
            btnReturn.parentNode.replaceChild(newBtn, btnReturn);

            newBtn.addEventListener('click', async () => {
                if (window.apiCall) {
                    try {
                        await window.apiCall('/api/game/end-round', 'POST', {
                            earned: 0,
                            employee_cost: this.totalEmployeeCost,
                            employees_killed: this.employeesKilledThisRound,
                            lose_truck: hadTruck
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
        this.canvas.classList.add('hidden');
        const screenEl = document.getElementById('pirate-defeat-screen');
        if (screenEl) screenEl.classList.remove('hidden');

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
                            lose_truck: false // they do NOT lose their truck from car accident!
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

    async _triggerArrestDefeat() {
        this.state = GameState.UI_OVERLAY;
        if (this.player) this.player.keys = { up: false, down: false, left: false, right: false };

        const msgEl = document.getElementById('defeat-message');
        if (msgEl) {
            msgEl.innerText = "You were arrested by the police! All earnings this round were lost.";
        }

        // Hide game canvas and show defeat screen
        this.canvas.classList.add('hidden');
        const screenEl = document.getElementById('pirate-defeat-screen');
        if (screenEl) screenEl.classList.remove('hidden');

        // Draw pixel art to defeat canvas: player behind bars (jail)
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
                            lose_truck: false // they do NOT lose their truck from arrest!
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
}

// ── Boot ──
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
        if (!window.game.gameMap) {
            window.game._restartGame();
        }
        if (window.playerHasTruck) {
            window.game._startGame('char_truck');
        } else {
            window.game.state = GameState.CHARACTER_SELECT;
        }
    };
});
