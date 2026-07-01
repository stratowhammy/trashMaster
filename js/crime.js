// ============================================================
// crime.js — Crime Mode logic, Mafia tasks, police, bank robbery
// ============================================================

class MafiaDon {
    constructor(id, name, tx, ty, color) {
        this.id = id;
        this.name = name;
        this.tx = tx;
        this.ty = ty;
        this.x = tx * TILE_SIZE + TILE_SIZE / 2;
        this.y = ty * TILE_SIZE + TILE_SIZE / 2;
        this.color = color;
        this.size = 32;
        this.alive = true;
        this.robbed = false;
    }

    render(ctx, camera) {
        if (!this.alive) return;
        const wrapped = typeof nearestWrap === 'function' ? nearestWrap(this.x, this.y, camera.getCenterX(), camera.getCenterY()) : {x: this.x, y: this.y};
        const screen = camera.worldToScreen(wrapped.x, wrapped.y);
        if (!camera.isVisible(wrapped.x - 20, wrapped.y - 20, 40, 40)) return;

        ctx.save();
        // Draw Mafia Don (black suit, white shirt, red tie)
        ctx.fillStyle = '#111';
        ctx.fillRect(screen.x - 12, screen.y - 16, 24, 32);
        
        ctx.fillStyle = '#fff';
        ctx.fillRect(screen.x - 4, screen.y - 12, 8, 8); // shirt
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(screen.x - 1, screen.y - 12, 2, 8); // tie

        // Head
        ctx.fillStyle = '#ffdbac';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 20, 8, 0, Math.PI * 2);
        ctx.fill();

        // Fedora hat
        ctx.fillStyle = this.color;
        ctx.fillRect(screen.x - 14, screen.y - 26, 28, 4);
        ctx.fillRect(screen.x - 8, screen.y - 32, 16, 6);

        ctx.restore();
    }
}

class PoliceOfficer {
    constructor(tx, ty, temporary = false) {
        this.x = tx * TILE_SIZE + TILE_SIZE / 2;
        this.y = ty * TILE_SIZE + TILE_SIZE / 2;
        this.size = 32;
        this.speed = TILE_SIZE * 2.025; // move 50% faster
        this.alive = true;
        this.temporary = temporary;
        this.ttl = temporary ? 30.0 : Infinity;
    }

    update(dt, playerX, playerY, gameMap) {
        if (!this.alive) return;

        // TTL countdown for temporary police
        if (this.temporary) {
            this.ttl -= dt;
            if (this.ttl <= 0) {
                this.alive = false;
                return;
            }
        }

        const wrappedPX = wrapWorldX(playerX);
        const wrappedPY = wrapWorldY(playerY);
        const dx = wrappedPX - this.x;
        const dy = wrappedPY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            const nx = dx / dist;
            const ny = dy / dist;
            const nextX = this.x + nx * this.speed * dt;
            const nextY = this.y + ny * this.speed * dt;

            // police collision sliding
            if (this._canMoveTo(nextX, this.y, gameMap)) {
                this.x = nextX;
            }
            if (this._canMoveTo(this.x, nextY, gameMap)) {
                this.y = nextY;
            }
        }
    }

    _canMoveTo(newX, newY, gameMap) {
        const hs = this.size / 2 - 4;
        const corners = [
            { x: newX - hs, y: newY - hs }, { x: newX + hs, y: newY - hs },
            { x: newX - hs, y: newY + hs }, { x: newX + hs, y: newY + hs },
        ];
        for (const c of corners) {
            const tx = Math.floor(c.x / TILE_SIZE);
            const ty = Math.floor(c.y / TILE_SIZE);
            const tile = gameMap.getTile(tx, ty);
            if (tile === TileType.BUILDING) return false;
        }
        return true;
    }

    render(ctx, camera) {
        if (!this.alive) return;
        const wrapped = typeof nearestWrap === 'function' ? nearestWrap(this.x, this.y, camera.getCenterX(), camera.getCenterY()) : {x: this.x, y: this.y};
        const screen = camera.worldToScreen(wrapped.x, wrapped.y);
        if (!camera.isVisible(wrapped.x - 16, wrapped.y - 16, 32, 32)) return;

        ctx.save();
        // Blue uniform
        ctx.fillStyle = '#0f2b5c';
        ctx.fillRect(screen.x - 10, screen.y - 14, 20, 28);

        // Gold badge
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(screen.x - 2, screen.y - 8, 4, 4);

        // Head
        ctx.fillStyle = '#ffdbac';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 18, 7, 0, Math.PI * 2);
        ctx.fill();

        // Police Cap
        ctx.fillStyle = '#0f2b5c';
        ctx.fillRect(screen.x - 10, screen.y - 24, 20, 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(screen.x - 12, screen.y - 22, 24, 2);

        ctx.restore();
    }
}

class MafiaThug {
    constructor(tx, ty) {
        this.x = tx * TILE_SIZE + TILE_SIZE / 2;
        this.y = ty * TILE_SIZE + TILE_SIZE / 2;
        this.size = 32;
        this.speed = TILE_SIZE * 0.4;
        this.alive = true;
    }

    update(dt, playerX, playerY, gameMap) {
        if (!this.alive) return;
        const wrappedPX = wrapWorldX(playerX);
        const wrappedPY = wrapWorldY(playerY);
        const dx = wrappedPX - this.x;
        const dy = wrappedPY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
            const nx = dx / dist;
            const ny = dy / dist;
            const nextX = this.x + nx * this.speed * dt;
            const nextY = this.y + ny * this.speed * dt;
            if (this._canMoveTo(nextX, this.y, gameMap)) this.x = nextX;
            if (this._canMoveTo(this.x, nextY, gameMap)) this.y = nextY;
        }
    }

    _canMoveTo(newX, newY, gameMap) {
        const hs = this.size / 2 - 4;
        const corners = [
            { x: newX - hs, y: newY - hs }, { x: newX + hs, y: newY - hs },
            { x: newX - hs, y: newY + hs }, { x: newX + hs, y: newY + hs },
        ];
        for (const c of corners) {
            const tx = Math.floor(c.x / TILE_SIZE);
            const ty = Math.floor(c.y / TILE_SIZE);
            const tile = gameMap.getTile(tx, ty);
            if (tile === TileType.BUILDING) return false;
        }
        return true;
    }

    render(ctx, camera) {
        if (!this.alive) return;
        const screen = camera.worldToScreen(this.x, this.y);
        if (!camera.isVisible(this.x - 20, this.y - 20, 40, 40)) return;
        ctx.save();
        // Dark suit mafia thug
        ctx.fillStyle = '#222';
        ctx.fillRect(screen.x - 10, screen.y - 14, 20, 28);
        // Red shirt
        ctx.fillStyle = '#880000';
        ctx.fillRect(screen.x - 4, screen.y - 8, 8, 6);
        // Head
        ctx.fillStyle = '#ffdbac';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 18, 7, 0, Math.PI * 2);
        ctx.fill();
        // Dark fedora
        ctx.fillStyle = '#111';
        ctx.fillRect(screen.x - 10, screen.y - 24, 20, 4);
        ctx.fillRect(screen.x - 7, screen.y - 28, 14, 4);
        ctx.restore();
    }
}

class GoldBag {
    constructor(tx, ty) {
        this.tx = tx;
        this.ty = ty;
        this.x = tx * TILE_SIZE + TILE_SIZE / 2;
        this.y = ty * TILE_SIZE + TILE_SIZE / 2;
        this.size = 20;
        this.collected = false;
    }

    render(ctx, camera) {
        if (this.collected) return;
        const wrapped = typeof nearestWrap === 'function' ? nearestWrap(this.x, this.y, camera.getCenterX(), camera.getCenterY()) : {x: this.x, y: this.y};
        const screen = camera.worldToScreen(wrapped.x, wrapped.y);
        if (!camera.isVisible(wrapped.x - 16, wrapped.y - 16, 32, 32)) return;

        ctx.save();
        // Draw Gold Sack
        ctx.fillStyle = '#d4af37'; // gold
        ctx.beginPath();
        ctx.arc(screen.x, screen.y + 4, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#aa8800';
        ctx.fillRect(screen.x - 4, screen.y - 6, 8, 4); // collar of sack

        // Dollar sign
        ctx.fillStyle = '#111';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', screen.x, screen.y + 4);

        ctx.restore();
    }
}

class CrimeManager {
    constructor() {
        this.dons = [];
        this.policeChief = null;
        this.police = [];
        this.goldBags = [];
        this.thugs = [];
        this.thugsActive = false;
        
        this.madeMan = false;
        this.activeFamily = -1; // 0: Salieri, 1: Morello
        
        this.activeTask = null;
        this.completedJobsCount = 0;
        this.taskStartClock = 0;
        this.taskTimeElapsed = 0;
        
        this.bankRobbed = false;
        this.policeActive = false;
        this.policeActiveTimer = 0;
        this.policeSpawnTimer = 0;
        this.policeSpawnInterval = 10.0; // seconds
        this.policeKilledCount = 0;
        this.baseArrestChance = 0.8; // 80%
        
        this.chiefBribeTarget = 1000;
        this.bribeOptionMultiplier = 1.0;
    }

    initialize(gameMap) {
        // Find walkable tile near (6,6)
        let don1Tile = { x: 6, y: 6 };
        let found1 = false;
        for (let r = 0; r < 12 && !found1; r++) {
            for (let dy = -r; dy <= r && !found1; dy++) {
                for (let dx = -r; dx <= r && !found1; dx++) {
                    const tx = wrapTileX(6 + dx);
                    const ty = wrapTileY(6 + dy);
                    const tile = gameMap.getTile(tx, ty);
                    if (tile === TileType.ROAD || tile === TileType.SIDEWALK || tile === TileType.CROSSWALK) {
                        don1Tile = { x: tx, y: ty };
                        found1 = true;
                    }
                }
            }
        }

        // Find walkable tile near (58,58)
        let don2Tile = { x: 58, y: 58 };
        let found2 = false;
        for (let r = 0; r < 12 && !found2; r++) {
            for (let dy = -r; dy <= r && !found2; dy++) {
                for (let dx = -r; dx <= r && !found2; dx++) {
                    const tx = wrapTileX(58 + dx);
                    const ty = wrapTileY(58 + dy);
                    const tile = gameMap.getTile(tx, ty);
                    if (tile === TileType.ROAD || tile === TileType.SIDEWALK || tile === TileType.CROSSWALK) {
                        don2Tile = { x: tx, y: ty };
                        found2 = true;
                    }
                }
            }
        }

        this.dons = [
            new MafiaDon(0, "Don Salieri", don1Tile.x, don1Tile.y, '#000000'), // Salieri (Black)
            new MafiaDon(1, "Don Morello", don2Tile.x, don2Tile.y, '#ffffff') // Morello (White)
        ];

        // Police Chief spawns near Police Station (building ID 1)
        const policeStation = gameMap.buildings[1];
        if (policeStation && policeStation.doorTiles.length > 0) {
            const door = policeStation.doorTiles[0];
            
            // Find a walkable tile near the door
            let chiefTile = { x: door.x, y: door.y };
            let found = false;
            for (let r = 1; r < 5 && !found; r++) {
                for (let dy = -r; dy <= r && !found; dy++) {
                    for (let dx = -r; dx <= r && !found; dx++) {
                        const tx = wrapTileX(door.x + dx);
                        const ty = wrapTileY(door.y + dy);
                        const tile = gameMap.getTile(tx, ty);
                        if (tile === TileType.ROAD || tile === TileType.SIDEWALK || tile === TileType.CROSSWALK) {
                            chiefTile = { x: tx, y: ty };
                            found = true;
                        }
                    }
                }
            }

            this.policeChief = {
                x: chiefTile.x * TILE_SIZE + TILE_SIZE / 2,
                y: chiefTile.y * TILE_SIZE + TILE_SIZE / 2,
                size: 32
            };
        }

        this.madeMan = false;
        this.activeFamily = -1;
        this.activeTask = null;
        this.completedJobsCount = 0;
        this.bankRobbed = false;
        this.policeActive = false;
        this.police = [];
        this.goldBags = [];
        this.thugs = [];
        this.thugsActive = false;
        this.policeSpawnTimer = 0;
        this.policeSpawnInterval = 10.0;
        this.policeKilledCount = 0;
        this.baseArrestChance = 0.8;
        this.chiefBribeTarget = 800 + Math.floor(Math.random() * 800); // 800 to 1600 target
        this.bribeOptionMultiplier = 1.0;
    }

    triggerMadeManOffer(familyId) {
        const dialog = document.getElementById('made-man-dialog');
        const donAvatar = document.getElementById('made-man-don-avatar');
        if (donAvatar) {
            donAvatar.innerHTML = `<div style="width:100%; height:100%; background:${familyId === 0 ? '#111' : '#eee'}; border:3px solid #ff3333; display:flex; align-items:center; justify-content:center; color:${familyId === 0 ? '#fff' : '#000'}; font-family:'Press Start 2P', monospace; font-size:16px;">${familyId === 0 ? 'S' : 'M'}</div>`;
        }
        if (dialog) {
            dialog.classList.remove('hidden');
        }
        
        // YES/NO setup
        const btnYes = document.getElementById('btn-made-man-yes');
        const btnNo = document.getElementById('btn-made-man-no');
        
        const yesClone = btnYes.cloneNode(true);
        btnYes.parentNode.replaceChild(yesClone, btnYes);
        const noClone = btnNo.cloneNode(true);
        btnNo.parentNode.replaceChild(noClone, btnNo);

        yesClone.addEventListener('click', () => {
            this.madeMan = true;
            this.activeFamily = familyId;
            dialog.classList.add('hidden');
            this.assignNextTask(window.game.gameMap);
        });

        noClone.addEventListener('click', () => {
            dialog.classList.add('hidden');
        });
    }

    assignNextTask(gameMap) {
        const alliedDonId = this.activeFamily;
        const rivalDonId = 1 - this.activeFamily;
        const rivalName = rivalDonId === 0 ? "Don Salieri" : "Don Morello";
        const alliedName = alliedDonId === 0 ? "Don Salieri" : "Don Morello";

        const tasks = [
            { type: 'collect_gold', desc: 'Collect gold from the target building.', targetBldgId: 2 + Math.floor(Math.random() * 8) },
            { type: 'intimidate', desc: 'Find and Intimidate [I] the rival mafia NPC.', targetNPCIndex: Math.floor(Math.random() * 10) },
            { type: 'rob_npc', desc: 'Find and Rob [R] the target citizen NPC.', targetNPCIndex: Math.floor(Math.random() * 10) },
            { type: 'steal_car', desc: 'Steal [S] a car at any street intersection.' },
            { type: 'rob_bank', desc: 'Rob the city BANK. Get to the entrance!' },
            { type: 'hit_npc_indoor', desc: 'Eliminate the target hiding inside the building.' },
            { type: 'talk_don', desc: `Deliver a briefcase to ${alliedName} [E].`, targetDonId: alliedDonId },
            { type: 'kill_don', desc: `Locate and Eliminate [K] rival ${rivalName}.`, targetDonId: rivalDonId }
        ];

        this.activeTask = tasks[Math.floor(Math.random() * tasks.length)];
        this.taskStartClock = window.game.hud.timer; // current time
        this.taskTimeElapsed = 0;

        // Show Mafia HUD Popup
        const popup = document.getElementById('mafia-task-popup');
        const donNameHud = document.getElementById('mafia-don-name-hud');
        const taskTextHud = document.getElementById('mafia-task-text-hud');
        const avatarHud = document.getElementById('mafia-don-avatar-hud');

        if (donNameHud) donNameHud.innerText = this.activeFamily === 0 ? "Don Salieri" : "Don Morello";
        if (taskTextHud) taskTextHud.innerText = this.activeTask.desc;
        if (avatarHud) {
            avatarHud.innerHTML = `<div style="width:100%; height:100%; background:${this.activeFamily === 0 ? '#111' : '#eee'}; border:2px solid #ff3333; display:flex; align-items:center; justify-content:center; color:${this.activeFamily === 0 ? '#fff' : '#000'}; font-family:'Press Start 2P', monospace; font-size:12px;">${this.activeFamily === 0 ? 'S' : 'M'}</div>`;
        }

        if (popup) {
            popup.classList.remove('hidden');
            setTimeout(() => { popup.classList.add('hidden'); }, 6000); // hide after 6s
        }

        // If robbing a bank, open the bank door!
        if (this.activeTask.type === 'rob_bank') {
            gameMap.openBuildingDoor(0); // Bank door open
            // Spawn gold bags inside bank
            this.goldBags = [];
            const bank = gameMap.buildings[0];
            if (bank) {
                // Spawn up to 18 bags inside bank interior tiles
                const spawnTiles = bank.tiles.filter(t => !bank.doorTiles.some(d => d.x === t.x && d.y === t.y));
                const count = Math.min(18, spawnTiles.length);
                for (let i = 0; i < count; i++) {
                    this.goldBags.push(new GoldBag(spawnTiles[i].x, spawnTiles[i].y));
                }
            }
        }
        
        // If hitting NPC indoor
        if (this.activeTask.type === 'hit_npc_indoor') {
            this.activeTask.targetBldgId = 2 + Math.floor(Math.random() * 8);
            gameMap.openBuildingDoor(this.activeTask.targetBldgId);
            const bldg = gameMap.buildings.find(b => b.id === this.activeTask.targetBldgId);
            if (bldg) {
                const spawnTiles = bldg.tiles.filter(t => !bldg.doorTiles.some(d => d.x === t.x && d.y === t.y));
                if (spawnTiles.length > 0) {
                    const tile = spawnTiles[Math.floor(Math.random() * spawnTiles.length)];
                    this.indoorTarget = { x: tile.x * TILE_SIZE + TILE_SIZE / 2, y: tile.y * TILE_SIZE + TILE_SIZE / 2, alive: true };
                }
            }
        }
    }

    completeTask(game) {
        const reward = 2000 * Math.pow(2, this.completedJobsCount);
        this.completedJobsCount++;
        game.trashManager.totalPoints += reward;
        game.hud.updateScore(game.trashManager.totalPoints);
        game.hud.showFollowerNotification(`Favor completed! Earned $${reward.toLocaleString()}!`, true);
        this.assignNextTask(game.gameMap);
    }

    triggerBribeChief() {
        const dialog = document.getElementById('bribe-dialog');
        if (dialog) dialog.classList.remove('hidden');

        // Bribe options based on multiplier
        const opt1 = Math.round(500 * this.bribeOptionMultiplier);
        const opt2 = Math.round(1000 * this.bribeOptionMultiplier);
        const opt3 = Math.round(2000 * this.bribeOptionMultiplier);

        const btn1 = document.getElementById('btn-bribe-1');
        const btn2 = document.getElementById('btn-bribe-2');
        const btn3 = document.getElementById('btn-bribe-3');
        const btnCancel = document.getElementById('btn-bribe-cancel');

        if (btn1) btn1.innerText = `Offer $${opt1}`;
        if (btn2) btn2.innerText = `Offer $${opt2}`;
        if (btn3) btn3.innerText = `Offer $${opt3}`;

        const setupBtn = (btn, amount) => {
            const clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
            clone.addEventListener('click', async () => {
                // Check if permanent account balance has enough
                if (window.playerBalance < amount) {
                    alert("Insufficient permanent account balance to bribe!");
                    dialog.classList.add('hidden');
                    return;
                }

                // Check against chief target threshold
                if (amount < this.chiefBribeTarget) {
                    // Declined!
                    alert("Police Chief: 'Not enough, kid. Try harder.'");
                    this.bribeOptionMultiplier *= 1.10; // increase option prices by 10%
                    dialog.classList.add('hidden');
                } else {
                    // Accepted!
                    try {
                        const response = await window.apiCall('/api/game/bribe', 'POST', { amount });
                        window.playerBalance = response.balance;
                        window.renderStore();
                        this.baseArrestChance = 0.40; // drop chance to 40%
                        alert(`Police Chief: 'Deal. The boys will look the other way.' (Arrest chance dropped to 40%)`);
                    } catch (e) {
                        alert("Bribe failed: " + e.message);
                    }
                    dialog.classList.add('hidden');
                }
            });
        };

        setupBtn(btn1, opt1);
        setupBtn(btn2, opt2);
        setupBtn(btn3, opt3);

        const cancelClone = btnCancel.cloneNode(true);
        btnCancel.parentNode.replaceChild(cancelClone, btnCancel);
        cancelClone.addEventListener('click', () => {
            dialog.classList.add('hidden');
        });
    }

    update(dt, game) {
        if (!window.crimeMode && !(window.politicsMode && game.acceptedMafiaVotes)) return;

        // If robbing the bank, decay gold bags over time
        if (this.activeTask && this.activeTask.type === 'rob_bank' && this.goldBags.length > 0) {
            const timeElapsed = game.hud.timer - this.taskStartClock;
            const expectedBags = Math.max(0, 18 - Math.floor(timeElapsed / 10));
            if (this.goldBags.filter(b => !b.collected).length > expectedBags) {
                const uncoll = this.goldBags.find(b => !b.collected);
                if (uncoll) uncoll.collected = true;
            }
        }

        // Update ALL alive police officers (always, not gated by policeActive)
        for (const cop of this.police) {
            if (cop.alive) {
                cop.update(dt, game.player.x, game.player.y, game.gameMap);
            }
        }
        // Remove dead temporary police
        this.police = this.police.filter(c => c.alive || !c.temporary);

        // Update thugs
        for (const thug of this.thugs) {
            if (thug.alive) {
                thug.update(dt, game.player.x, game.player.y, game.gameMap);
            }
        }
        this.thugs = this.thugs.filter(t => t.alive);

        // Spawn police from station periodically during active chase
        if (this.policeActive) {
            this.policeSpawnTimer += dt;
            if (this.policeSpawnTimer >= this.policeSpawnInterval) {
                this.policeSpawnTimer = 0;
                const station = game.gameMap.buildings[1];
                if (station && station.doorTiles.length > 0) {
                    const door = station.doorTiles[0];
                    const isTemp = this.policeActiveTimer > 0;
                    this.police.push(new PoliceOfficer(door.x, door.y, isTemp));
                }
            }
            if (this.policeActiveTimer > 0) {
                this.policeActiveTimer -= dt;
                if (this.policeActiveTimer <= 0) {
                    this.policeActive = false;
                }
            }
        }

        // Wrapped player coords for combat checks
        const wpx = wrapWorldX(game.player.x);
        const wpy = wrapWorldY(game.player.y);

        // Police combat
        const arrivedCops = this.police.filter(c => c.alive && Math.sqrt((c.x - wpx)**2 + (c.y - wpy)**2) < TILE_SIZE * 0.6);
        if (arrivedCops.length > 0) {
            for (const cop of arrivedCops) {
                if (window.politicsMode && game.acceptedMafiaVotes) {
                    game._triggerArrestDefeat(true);
                    return;
                }
                const posseCount = game.followerManager.getFollowerCount();
                if (posseCount > 0) {
                    const roll = Math.random();
                    const copWins = roll < this.baseArrestChance;
                    if (copWins) {
                        game.followerManager.removeFollower();
                        game.hud.showFollowerNotification('Posse member arrested by police!', true);
                        cop.alive = false;
                    } else {
                        cop.alive = false;
                        this.policeKilledCount++;
                        this.baseArrestChance = Math.min(0.95, this.baseArrestChance + 0.10);
                        this.policeSpawnInterval = Math.max(2.0, 10.0 - this.policeKilledCount);
                        game.hud.showFollowerNotification('Posse member killed the cop!', true);
                    }
                } else {
                    game._triggerArrestDefeat();
                    return;
                }
            }
        }

        // Thug combat
        const arrivedThugs = this.thugs.filter(t => t.alive && Math.sqrt((t.x - wpx)**2 + (t.y - wpy)**2) < TILE_SIZE * 0.6);
        if (arrivedThugs.length > 0) {
            for (const thug of arrivedThugs) {
                const posseCount = game.followerManager.getFollowerCount();
                if (posseCount > 0) {
                    const roll = Math.random();
                    if (roll < 0.6) { // thugs are tough
                        game.followerManager.removeFollower();
                        game.hud.showFollowerNotification('Posse member killed by mafia thug!', true);
                        thug.alive = false;
                    } else {
                        thug.alive = false;
                        game.hud.showFollowerNotification('Posse member took out a mafia thug!', true);
                    }
                } else {
                    game._triggerArrestDefeat();
                    return;
                }
            }
        }

        // Indoor Hit Check
        if (this.activeTask && this.activeTask.type === 'hit_npc_indoor' && this.indoorTarget && this.indoorTarget.alive) {
            const dist = Math.sqrt((this.indoorTarget.x - wpx)**2 + (this.indoorTarget.y - wpy)**2);
            if (dist < TILE_SIZE * 1.5 && game.player.keys.k) {
                this.indoorTarget.alive = false;
                game.hud.showFollowerNotification('Target eliminated!', true);
                this.completeTask(game);
                // Turn off k so it doesn't trigger multiple times in one frame
                game.player.keys.k = false;
            }
        }
    }

    render(ctx, camera) {
        if (!window.crimeMode && !(window.politicsMode && window.game && window.game.acceptedMafiaVotes)) return;

        // Render alive Mafia Dons if they are the current task targets
        for (const don of this.dons) {
            if (don.alive) {
                let shouldRender = false;
                if (this.activeTask) {
                    if ((this.activeTask.type === 'talk_don' || this.activeTask.type === 'kill_don' || this.activeTask.type === 'intimidate_don') && this.activeTask.targetDonId === don.id) {
                        shouldRender = true;
                    }
                }
                if (shouldRender) don.render(ctx, camera);
            }
        }

        // Render Police Chief
        if (this.madeMan && this.policeChief) {
            const wrapped = typeof nearestWrap === 'function' ? nearestWrap(this.policeChief.x, this.policeChief.y, camera.getCenterX(), camera.getCenterY()) : {x: this.policeChief.x, y: this.policeChief.y};
            const screen = camera.worldToScreen(wrapped.x, wrapped.y);
            if (camera.isVisible(wrapped.x - 20, wrapped.y - 20, 40, 40)) {
                ctx.save();
                ctx.fillStyle = '#1c2e4a';
                ctx.fillRect(screen.x - 10, screen.y - 14, 20, 28);
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(screen.x - 2, screen.y - 8, 4, 4);
                ctx.fillStyle = '#ffdbac';
                ctx.beginPath();
                ctx.arc(screen.x, screen.y - 18, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1c2e4a';
                ctx.fillRect(screen.x - 10, screen.y - 24, 20, 4);
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(screen.x - 4, screen.y - 23, 8, 2);
                ctx.restore();
            }
        }

        // Render Gold Bags inside Bank
        if (this.activeTask && this.activeTask.type === 'rob_bank') {
            for (const bag of this.goldBags) {
                bag.render(ctx, camera);
            }
        }

        // Render ALL alive Police Officers (no policeActive gate)
        for (const cop of this.police) {
            cop.render(ctx, camera);
        }

        // Render mafia thugs
        for (const thug of this.thugs) {
            thug.render(ctx, camera);
        }

        // Render indoor hit target
        if (this.activeTask && this.activeTask.type === 'hit_npc_indoor' && this.indoorTarget && this.indoorTarget.alive) {
            const screen = camera.worldToScreen(this.indoorTarget.x, this.indoorTarget.y);
            if (camera.isVisible(this.indoorTarget.x - 20, this.indoorTarget.y - 20, 40, 40)) {
                ctx.save();
                // Red suit
                ctx.fillStyle = '#cc0000';
                ctx.fillRect(screen.x - 10, screen.y - 14, 20, 28);
                // Head
                ctx.fillStyle = '#ffdbac';
                ctx.beginPath();
                ctx.arc(screen.x, screen.y - 18, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    spawnThugs(gameMap) {
        this.thugsActive = true;
        // Spawn 4 thugs from random road positions
        for (let i = 0; i < 4; i++) {
            let tx, ty;
            for (let attempt = 0; attempt < 100; attempt++) {
                tx = Math.floor(Math.random() * MAP_WIDTH);
                ty = Math.floor(Math.random() * MAP_HEIGHT);
                const tile = gameMap.getTile(tx, ty);
                if (tile === TileType.ROAD || tile === TileType.SIDEWALK) break;
            }
            this.thugs.push(new MafiaThug(tx, ty));
        }
    }
}
