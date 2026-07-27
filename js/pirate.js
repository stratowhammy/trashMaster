// ============================================================
// pirate.js — Pirate Mode, Rival Pirates, Cannons & Treasure Quest
// ============================================================

class CannonballPack {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.amount = 8;
        this.active = true;
    }
}

class Cannonball {
    constructor(x, y, dirX, dirY, isPlayer = true) {
        this.x = x;
        this.y = y;
        const speed = 450; // pixels per second
        this.vx = dirX * speed;
        this.vy = dirY * speed;
        this.isPlayer = isPlayer;
        this.lifeTimer = 2.0; // 2 seconds lifespan
        this.radius = 8;
        this.active = true;
    }

    update(dt, game) {
        if (!this.active) return;

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.lifeTimer -= dt;

        if (this.lifeTimer <= 0) {
            this.active = false;
            return;
        }

        // Wrap world coordinates
        if (typeof MAP_PIXEL_W !== 'undefined' && typeof MAP_PIXEL_H !== 'undefined') {
            this.x = ((this.x % MAP_PIXEL_W) + MAP_PIXEL_W) % MAP_PIXEL_W;
            this.y = ((this.y % MAP_PIXEL_H) + MAP_PIXEL_H) % MAP_PIXEL_H;
        }

        // Collision Checks
        if (this.isPlayer) {
            // Check collision with Rival Pirate Ship
            if (game.pirateModeManager && game.pirateModeManager.rivalShip) {
                const rival = game.pirateModeManager.rivalShip;
                if (rival.alive) {
                    const dx = this.x - rival.x;
                    const dy = this.y - rival.y;
                    if (Math.sqrt(dx * dx + dy * dy) < 32) {
                        if (rival.immunityTimer > 0) {
                            this.active = false;
                            if (game.hud) game.hud.showFollowerNotification('Rival Pirates blocked cannonball! (Immune) 🛡️', false);
                            return;
                        }
                        rival.stunTimer = 5.0; // Immobilized for 5s
                        rival.immunityTimer = 5.0; // Immune to cannon fire for 5s after hit
                        this.active = false;
                        if (game.hud) game.hud.showFollowerNotification('Rival Pirates Stunned (5s) & Immune (5s)! 💥🏴‍☠️', true);
                        return;
                    }
                }
            }

            // Check collision with NPC Pirate Crew members
            if (game.pirateModeManager && game.pirateModeManager.npcCrew) {
                for (const member of game.pirateModeManager.npcCrew.members) {
                    if (!member.alive) continue;
                    const wm = typeof nearestWrap === 'function'
                        ? nearestWrap(member.x, member.y, this.x, this.y)
                        : { x: member.x, y: member.y };
                    const dx = this.x - wm.x;
                    const dy = this.y - wm.y;
                    if (Math.sqrt(dx * dx + dy * dy) < 28) {
                        if (member.immunityTimer > 0) {
                            this.active = false;
                            if (game.hud) game.hud.showFollowerNotification(`Pirate #${member.index + 1} blocked cannonball! (Immune) 🛡️`, false);
                            return;
                        }
                        member.stunTimer = 5.0;
                        member.immunityTimer = 5.0;
                        this.active = false;
                        if (game.hud) game.hud.showFollowerNotification(`Pirate #${member.index + 1} Stunned (5s) & Immune (5s)! 💥🏴‍☠️`, true);
                        return;
                    }
                }
            }

            // Check collision with Regular Civilian NPCs -> Kills NPC, turns into Jolly Roger flag & triggers Police!
            if (game.npcManager && game.npcManager.npcs) {
                for (const npc of game.npcManager.npcs) {
                    if (npc.alive !== false && !npc.isDeadFlag) {
                        const dx = this.x - npc.x;
                        const dy = this.y - npc.y;
                        if (Math.sqrt(dx * dx + dy * dy) < 28) {
                            npc.alive = false; // Kill / stop movement
                            npc.isDeadFlag = true; // Turn into Jolly Roger flag!
                            this.active = false;
                            if (game.hud) game.hud.showFollowerNotification('Civilian hit by Cannon! Turned into Jolly Roger flag! Police alerted! 🚨🏴‍☠️', false);
                            // Trigger police chase!
                            if (game.policeManager) {
                                game.policeManager.triggerPolice(game);
                                game.policeManager.wantedLevel = Math.min(5, (game.policeManager.wantedLevel || 0) + 2);
                            }
                            return;
                        }
                    }
                }
            }
        } else {
            // Cannonball fired by Rival Pirates -> Hits Player
            if (game.player) {
                const dx = this.x - game.player.x;
                const dy = this.y - game.player.y;
                if (Math.sqrt(dx * dx + dy * dy) < 32) {
                    if (game.pirateModeManager) {
                        const pm = game.pirateModeManager;
                        if (pm.playerImmunityTimer > 0) {
                            // Player is immune to cannon fire!
                            this.active = false;
                            if (game.hud) game.hud.showFollowerNotification('🛡️ CANNONBALL BLOCKED! Immunity active!', true);
                            return;
                        }
                        pm.playerStunTimer = 5.0; // Player immobilized for 5s
                        pm.playerImmunityTimer = 5.0; // Immune to cannonball fire for 5 full seconds
                    }
                    this.active = false;
                    if (game.hud) game.hud.showFollowerNotification('PIRATE CANNON HIT YOU! Immobilized (5s) & Immune (5s)! 💥🛡️', false);
                    return;
                }
            }
        }
    }

    render(ctx, camera, spriteManager) {
        if (!this.active) return;
        const screen = camera.worldToScreen(this.x, this.y);

        const img = spriteManager ? spriteManager.getImage('cannonball') : null;
        if (img && (img.complete || img instanceof HTMLCanvasElement)) {
            ctx.drawImage(img, screen.x - 16, screen.y - 16, 32, 32);
        } else {
            ctx.fillStyle = this.isPlayer ? '#ffcc00' : '#ff3333';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

// ── NPC Pirate Crew (compete independently for the treasure) ──────────────────

class NpcPirateMember {
    constructor(startX, startY, index) {
        this.x = startX;
        this.y = startY;
        this.index = index;
        this.speedBoat = 180 + (index * 10); // Faster boat speed ~180-210 px/sec
        this.speedFoot = 135 + (index * 5);  // Faster foot speed ~135-150 px/sec
        this.stunTimer = 0;
        this.immunityTimer = 0;
        this.ammo = 8; // Starts with 8 cannon balls
        this.alive = true;
        this.direction = 'right';
        this.animTimer = 0;
        this.shootCooldown = 2 + Math.random() * 2;
        this.onFoot = false;
        // Unique offset per pirate member when disembarked on foot so they separate on islands
        const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        const angle = angles[index % 4];
        this.targetOffset = {
            x: Math.cos(angle) * 35,
            y: Math.sin(angle) * 35
        };
    }

    update(dt, targetLocation, game, allMembers = []) {
        if (!this.alive) return;

        this.animTimer += dt;

        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            return;
        }

        if (this.immunityTimer > 0) this.immunityTimer -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;

        // Check if pirate is on foot (disembarked on island) or on boat (water)
        if (game && game.gameMap) {
            const tx = wrapTileX(Math.floor(this.x / TILE_SIZE));
            const ty = wrapTileY(Math.floor(this.y / TILE_SIZE));
            const tile = game.gameMap.getTile(tx, ty);
            this.onFoot = (tile === TileType.SIDEWALK || tile === TileType.BUILDING || tile === TileType.BUILDING_DOOR);
        }

        if (!targetLocation) return;

        let tX = targetLocation.x;
        let tY = targetLocation.y;

        // Apply separation offset when disembarked on foot
        if (this.onFoot) {
            tX += this.targetOffset.x;
            tY += this.targetOffset.y;
        }

        const wTarget = typeof nearestWrap === 'function'
            ? nearestWrap(tX, tY, this.x, this.y)
            : { x: tX, y: tY };

        let dx = wTarget.x - this.x;
        let dy = wTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Repulsion force to separate rival pirates when disembarked on foot
        let moveDirX = dist > 0.001 ? dx / dist : 0;
        let moveDirY = dist > 0.001 ? dy / dist : 0;

        if (this.onFoot && allMembers && allMembers.length > 1) {
            let repelX = 0, repelY = 0;
            for (const other of allMembers) {
                if (other === this || !other.alive || !other.onFoot) continue;
                const oDx = this.x - other.x;
                const oDy = this.y - other.y;
                const oDist = Math.sqrt(oDx * oDx + oDy * oDy);
                if (oDist < 40 && oDist > 0.1) {
                    const force = (40 - oDist) / 40;
                    repelX += (oDx / oDist) * force;
                    repelY += (oDy / oDist) * force;
                }
            }
            moveDirX += repelX * 0.7;
            moveDirY += repelY * 0.7;
            const moveLen = Math.sqrt(moveDirX * moveDirX + moveDirY * moveDirY);
            if (moveLen > 0.001) {
                moveDirX /= moveLen;
                moveDirY /= moveLen;
            }
        }

        const currentSpeed = this.onFoot ? this.speedFoot : this.speedBoat;

        if (dist > 5 || (this.onFoot && Math.sqrt(dx * dx + dy * dy) > 10)) {
            this.x += moveDirX * currentSpeed * dt;
            this.y += moveDirY * currentSpeed * dt;

            // Wrap
            if (typeof MAP_PIXEL_W !== 'undefined') {
                this.x = ((this.x % MAP_PIXEL_W) + MAP_PIXEL_W) % MAP_PIXEL_W;
                this.y = ((this.y % MAP_PIXEL_H) + MAP_PIXEL_H) % MAP_PIXEL_H;
            }

            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? 'right' : 'left';
            } else {
                this.direction = dy > 0 ? 'down' : 'up';
            }
        }

        // Shoot at player when in range (requires ammo > 0)
        if (game && game.player && this.shootCooldown <= 0 && this.ammo > 0) {
            const pw = typeof nearestWrap === 'function'
                ? nearestWrap(game.player.x, game.player.y, this.x, this.y)
                : { x: game.player.x, y: game.player.y };
            const pdx = pw.x - this.x;
            const pdy = pw.y - this.y;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pdist < 340 && pdist > 20) {
                this.shootCooldown = 3.0 + Math.random() * 2;
                this.ammo--;
                if (game.pirateModeManager) {
                    game.pirateModeManager.cannonballs.push(
                        new Cannonball(this.x, this.y, pdx / pdist, pdy / pdist, false)
                    );
                }
            }
        }
    }

    render(ctx, camera, spriteManager) {
        if (!this.alive) return;
        const wPos = typeof nearestWrap === 'function'
            ? nearestWrap(this.x, this.y, camera.getCenterX(), camera.getCenterY())
            : { x: this.x, y: this.y };

        if (!camera.isVisible(wPos.x - 50, wPos.y - 50, 100, 100)) return;
        const screen = camera.worldToScreen(wPos.x, wPos.y);

        ctx.save();

        if (!this.onFoot) {
            // ── In Water: Each rival pirate travels in their OWN pirate boat with RED OUTLINE ──
            const boatImg = spriteManager ? spriteManager.getImage('pirate_ship') : null;
            const drawSize = 64;

            ctx.save();
            ctx.translate(screen.x, screen.y);
            if (this.direction === 'left') {
                ctx.scale(-1, 1);
            }

            // Flashing Red Outline Glow around Rival Pirate Ship
            const rPulse = Math.sin(performance.now() / 100) * 0.4 + 0.6;
            ctx.strokeStyle = `rgba(255, 0, 0, ${rPulse})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 32, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(-drawSize / 2 - 2, -drawSize / 2 - 2, drawSize + 4, drawSize + 4);

            if (boatImg && (boatImg.complete || boatImg instanceof HTMLCanvasElement)) {
                ctx.drawImage(boatImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            } else {
                ctx.fillStyle = '#8b0000';
                ctx.fillRect(-24, -16, 48, 32);
            }
            ctx.restore();

            if (this.stunTimer > 0) {
                ctx.fillStyle = '#ff3333';
                ctx.font = 'bold 9px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`STUNNED (${Math.ceil(this.stunTimer)}s)`, screen.x, screen.y - 38);
            } else {
                ctx.fillStyle = '#ff3333';
                ctx.font = 'bold 9px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`🏴‍☠️ Rival Ship #${this.index + 1}`, screen.x, screen.y - 38);
            }
            return;
        }

        // ── Disembarked on Island: Render individual pirate on foot ──
        const bob = Math.sin(this.animTimer * 4.0) * 2;
        const s = screen.x;
        const t = screen.y + bob;

        // Legs
        ctx.fillStyle = '#111';
        ctx.fillRect(s - 9, t + 10, 8, 14);
        ctx.fillRect(s + 1, t + 10, 8, 14);

        // Boots
        ctx.fillStyle = '#4a3000';
        ctx.fillRect(s - 10, t + 20, 9, 6);
        ctx.fillRect(s + 1, t + 20, 9, 6);

        // Body (black coat)
        ctx.fillStyle = '#111';
        ctx.fillRect(s - 13, t - 12, 26, 24);

        // Coat trim (dark gold)
        ctx.fillStyle = '#7a5c00';
        ctx.fillRect(s - 13, t - 12, 3, 24);
        ctx.fillRect(s + 10, t - 12, 3, 24);

        // Head
        ctx.fillStyle = '#f4c47a';
        ctx.beginPath();
        ctx.arc(s, t - 20, 10, 0, Math.PI * 2);
        ctx.fill();

        // Red bandana
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(s - 11, t - 28, 22, 8);
        ctx.fillRect(s + 9, t - 22, 5, 4);

        // Eyes
        ctx.fillStyle = '#111';
        ctx.fillRect(s - 5, t - 22, 3, 3);
        ctx.fillRect(s + 2, t - 22, 3, 3);

        // Stun indicator or pirate label
        if (this.stunTimer > 0) {
            ctx.fillStyle = '#ff3333';
            ctx.font = 'bold 9px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`STUNNED ${Math.ceil(this.stunTimer)}s`, s, t - 38);
        } else {
            ctx.fillStyle = '#ff4444';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`🏴‍☠️ Pirate #${this.index + 1}`, s, t - 38);
        }

        ctx.restore();
    }
}

class NpcPirateCrew {
    constructor() {
        this.members = [];
        this.locations = [];
        this.currentStep = 0;
        this.rivalWon = false;
    }

    init(rivalLocations, startX, startY) {
        this.locations = rivalLocations;
        this.currentStep = 0;
        this.rivalWon = false;
        this.members = [];
        const count = 4;
        for (let i = 0; i < count; i++) {
            const ox = (Math.random() - 0.5) * 80;
            const oy = (Math.random() - 0.5) * 80;
            this.members.push(new NpcPirateMember(startX + ox, startY + oy, i));
        }
    }

    _isAnyMemberNearTarget(target) {
        if (!target) return false;
        for (const m of this.members) {
            if (!m.alive) continue;
            const wt = typeof nearestWrap === 'function'
                ? nearestWrap(target.x, target.y, m.x, m.y)
                : { x: target.x, y: target.y };
            const dx = m.x - wt.x;
            const dy = m.y - wt.y;
            if (Math.sqrt(dx * dx + dy * dy) < 90) return true;
        }
        return false;
    }

    update(dt, game) {
        if (this.rivalWon) return;

        const currentTarget = this.locations[Math.min(this.currentStep, this.locations.length - 1)];
        if (currentTarget && this._isAnyMemberNearTarget(currentTarget)) {
            if (this.currentStep < this.locations.length - 1) {
                this.currentStep++;
                if (this.currentStep < 8) {
                    if (game && game.hud) {
                        game.hud.showFollowerNotification(`🏴‍☠️ Rival Pirates tagged Location ${this.currentStep}/8!`, false);
                    }
                } else if (this.currentStep === 8) {
                    if (game && game.hud) {
                        game.hud.showFollowerNotification('⚠️ RIVAL PIRATES REVEALED THE TREASURE LOCATION! HURRY! 🏴‍☠️', false);
                    }
                }
            } else {
                if (game && game.pirateModeManager && !game.pirateModeManager.treasureClaimed) {
                    this.rivalWon = true;
                    game.pirateModeManager.rivalWon = true;
                    if (game.hud) {
                        game.hud.showFollowerNotification('☠️ RIVAL PIRATES FOUND THE TREASURE FIRST! 🏴‍☠️', false);
                    }
                }
            }
        }

        const target = this.rivalWon ? null : this.locations[Math.min(this.currentStep, this.locations.length - 1)];
        for (const m of this.members) {
            m.update(dt, target, game, this.members);
        }
    }

    render(ctx, camera, spriteManager) {
        for (const m of this.members) {
            m.render(ctx, camera, spriteManager);
        }
    }
}

class RivalPirateShip {
    constructor(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.speed = 180;
        this.stunTimer = 0;
        this.immunityTimer = 0;
        this.ammo = 16;
        this.alive = true;
        this.targets = [];
        this.currentTargetIndex = 0;
        this.direction = 'right';
    }

    setTargets(locations) {
        this.targets = locations;
    }

    update(dt, game) {
        if (game && game.pirateModeManager && game.pirateModeManager.npcCrew && game.pirateModeManager.npcCrew.members.length > 0) {
            const leader = game.pirateModeManager.npcCrew.members[0];
            this.x = leader.x;
            this.y = leader.y;
            this.stunTimer = leader.stunTimer;
            this.immunityTimer = leader.immunityTimer;
            this.ammo = leader.ammo;
            this.direction = leader.direction;
        }
    }

    render(ctx, camera, spriteManager) {
        // Individual boat rendering handled per member inside NpcPirateMember
    }
}

class PirateModeManager {
    constructor() {
        this.playerLocations = [];
        this.rivalLocations = [];
        this.playerStep = 0; // 0 to 7 (8 locations total)
        this.treasureBuilding = null;
        this.treasureClaimed = false;
        this.rivalShip = null;
        this.npcCrew = null;   // NpcPirateCrew instance
        this.cannonballs = [];
        this.cannonballPacks = [];
        this.playerStunTimer = 0;
        this.playerImmunityTimer = 0;
        this.playerCannonAmmo = 8; // Starts with 8 cannon balls
        this.cannonCooldown = 0;
        this.sailedOffEarth = false;
        this.offEarthTimer = 0;
        this.initialized = false;
    }

    spawnCannonballPack(game) {
        const MAP_W = typeof MAP_PIXEL_W !== 'undefined' ? MAP_PIXEL_W : 4096;
        const MAP_H = typeof MAP_PIXEL_H !== 'undefined' ? MAP_PIXEL_H : 4096;
        let px = Math.random() * MAP_W;
        let py = Math.random() * MAP_H;

        if (game && game.gameMap && typeof game.gameMap.getIslandGreenTiles === 'function') {
            const greenTiles = game.gameMap.getIslandGreenTiles();
            if (greenTiles.length > 0) {
                const randomTile = greenTiles[Math.floor(Math.random() * greenTiles.length)];
                px = randomTile.x;
                py = randomTile.y;
            }
        }
        this.cannonballPacks.push(new CannonballPack(px, py));
    }

    init(game) {
        this.playerStep = 0;
        this.treasureClaimed = false;
        this.cannonballs = [];
        this.cannonballPacks = [];
        this.playerStunTimer = 0;
        this.playerImmunityTimer = 0;
        this.playerCannonAmmo = 8; // Starts with 8 cannon balls
        this.cannonCooldown = 0;
        this.sailedOffEarth = false;
        this.offEarthTimer = 0;

        // Spawn 12 packs of 8 cannonballs strictly on green tiles on islands
        for (let i = 0; i < 12; i++) {
            this.spawnCannonballPack(game);
        }

        // Gather all green tiles on islands
        const greenTiles = (game && game.gameMap && typeof game.gameMap.getIslandGreenTiles === 'function')
            ? game.gameMap.getIslandGreenTiles()
            : [];

        let pool = [];
        if (greenTiles.length > 0) {
            const shuffledGreen = [...greenTiles].sort(() => 0.5 - Math.random());
            pool = shuffledGreen.map((gt, idx) => ({
                x: gt.x,
                y: gt.y,
                tileX: gt.tileX,
                tileY: gt.tileY,
                name: `Island Green #${idx + 1}`,
                type: 'green_tile'
            }));
        }

        while (pool.length < 16) {
            const rx = Math.random() * (typeof MAP_PIXEL_W !== 'undefined' ? MAP_PIXEL_W : 3000);
            const ry = Math.random() * (typeof MAP_PIXEL_H !== 'undefined' ? MAP_PIXEL_H : 3000);
            pool.push({ x: rx, y: ry, name: 'Island Green Fallback', type: 'green_tile' });
        }

        const selectedPool = pool.slice(0, 16);
        this.playerLocations = selectedPool.slice(0, 8);
        this.rivalLocations = selectedPool.slice(8, 16);

        // Target 8 is the final treasure island location on a green tile
        this.treasureBuilding = this.playerLocations[7];

        // Rival targets: 8 waypoints + final race to treasure building!
        const rivalTargets = [...this.rivalLocations.slice(0, 8), this.treasureBuilding];

        const startLoc = rivalTargets[0];

        // Create NPC pirate crew (4 members) each sailing in their own boat on water
        this.npcCrew = new NpcPirateCrew();
        this.npcCrew.init(rivalTargets, startLoc.x, startLoc.y);

        this.rivalShip = new RivalPirateShip(startLoc.x, startLoc.y);
        this.rivalShip.setTargets(rivalTargets);

        this.initialized = true;
        if (game.hud) {
            game.hud.showFollowerNotification('PIRATE MODE STARTED! Check your Treasure Map 🗺️🏴‍☠️', true);
        }
    }

    firePlayerCannon(game) {
        if (this.cannonCooldown > 0 || this.playerStunTimer > 0) return;
        if (this.playerCannonAmmo <= 0) {
            if (game.hud) {
                game.hud.showFollowerNotification('OUT OF CANNONBALLS! Press [E] near Cannonball Packs on map! 📦💣', false);
            }
            return;
        }

        this.cannonCooldown = 0.5; // 0.5 sec cooldown between shots
        this.playerCannonAmmo--;

        const player = game.player;
        if (!player) return;

        // Determine facing vector
        let dirX = 1;
        let dirY = 0;
        if (player.direction === 'left') { dirX = -1; dirY = 0; }
        else if (player.direction === 'right') { dirX = 1; dirY = 0; }
        else if (player.direction === 'up') { dirX = 0; dirY = -1; }
        else if (player.direction === 'down') { dirX = 0; dirY = 1; }
        else if (player.angle !== undefined) {
            dirX = Math.cos(player.angle);
            dirY = Math.sin(player.angle);
        }

        this.cannonballs.push(new Cannonball(player.x, player.y, dirX, dirY, true));
        if (window.soundManager && window.soundManager.playEngageSFX) {
            window.soundManager.playEngageSFX();
        }
        if (game.hud) {
            game.hud.showFollowerNotification(`💣 FIRED CANNON! (${this.playerCannonAmmo}/16 left)`, true);
        }
    }

    isPlayerNearTarget(target, player, gameMap) {
        if (!target || !player) return false;

        const px = player.x;
        const py = player.y;
        const pTileX = typeof player.getTileX === 'function' ? player.getTileX() : Math.floor(px / TILE_SIZE);
        const pTileY = typeof player.getTileY === 'function' ? player.getTileY() : Math.floor(py / TILE_SIZE);

        // Compute wrapped target position relative to player
        const wTarget = typeof nearestWrap === 'function' ? nearestWrap(target.x, target.y, px, py) : { x: target.x, y: target.y };

        let bldg = target.buildingObj;
        if (!bldg && gameMap && gameMap.buildings) {
            bldg = gameMap.buildings.find(b => b.id === target.id) || (gameMap.getBuildingAtTile ? gameMap.getBuildingAtTile(Math.floor(wTarget.x / TILE_SIZE), Math.floor(wTarget.y / TILE_SIZE)) : null);
        }

        if (bldg) {
            // 1. Check tile proximity (within 3 tiles of any building tile)
            if (bldg.tiles) {
                for (const t of bldg.tiles) {
                    const dTileX = Math.abs(pTileX - t.x);
                    const dTileY = Math.abs(pTileY - t.y);
                    if (dTileX <= 3 && dTileY <= 3) return true;
                }
            }

            // 2. Bounding box distance check with wrap
            if (typeof bldg.x === 'number' && typeof bldg.width === 'number' && !isNaN(bldg.x) && !isNaN(bldg.width)) {
                const wCenter = typeof nearestWrap === 'function' ? nearestWrap(bldg.x + bldg.width / 2, bldg.y + bldg.height / 2, px, py) : { x: bldg.x + bldg.width / 2, y: bldg.y + bldg.height / 2 };
                const minX = wCenter.x - bldg.width / 2;
                const minY = wCenter.y - bldg.height / 2;
                const maxX = wCenter.x + bldg.width / 2;
                const maxY = wCenter.y + bldg.height / 2;

                const closestX = Math.max(minX, Math.min(px, maxX));
                const closestY = Math.max(minY, Math.min(py, maxY));

                const dx = px - closestX;
                const dy = py - closestY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) return true;
            }

            // 3. Check door tiles
            if (bldg.doorTiles) {
                for (const door of bldg.doorTiles) {
                    const doorPos = typeof nearestWrap === 'function' ? nearestWrap(door.x * TILE_SIZE + TILE_SIZE / 2, door.y * TILE_SIZE + TILE_SIZE / 2, px, py) : { x: door.x * TILE_SIZE + TILE_SIZE / 2, y: door.y * TILE_SIZE + TILE_SIZE / 2 };
                    const ddx = px - doorPos.x;
                    const ddy = py - doorPos.y;
                    if (Math.sqrt(ddx * ddx + ddy * ddy) < 120) return true;
                }
            }
        }

        // Distance to wrapped target point or NPC
        const dx = px - wTarget.x;
        const dy = py - wTarget.y;
        return Math.sqrt(dx * dx + dy * dy) < 120;
    }

    handlePlayerEngage(game) {
        if (!game || !game.player) return false;

        const px = game.player.x;
        const py = game.player.y;

        // 1. Check engagement with Cannonball Packs
        for (const pack of this.cannonballPacks) {
            if (!pack.active) continue;
            const wPack = typeof nearestWrap === 'function' ? nearestWrap(pack.x, pack.y, px, py) : { x: pack.x, y: pack.y };
            const dx = px - wPack.x;
            const dy = py - wPack.y;
            if (Math.sqrt(dx * dx + dy * dy) < 70) {
                if (this.playerCannonAmmo >= 16) {
                    if (game.hud) game.hud.showFollowerNotification('Cannonball Inventory Full! (16/16 max) 💣', false);
                    return true;
                }
                pack.active = false;
                this.playerCannonAmmo = Math.min(16, this.playerCannonAmmo + 8);
                if (window.soundManager && window.soundManager.playEngageSFX) {
                    window.soundManager.playEngageSFX();
                }
                if (game.hud) {
                    game.hud.showFollowerNotification(`💣 LOADED +8 CANNONBALLS! Inventory: ${this.playerCannonAmmo}/16 🏴‍☠️`, true);
                }
                return true;
            }
        }

        if (this.playerStep < 8 && !this.treasureClaimed) {
            const currentTarget = this.playerLocations[this.playerStep];
            if (this.isPlayerNearTarget(currentTarget, game.player, game.gameMap)) {
                this.playerStep++;
                if (window.soundManager && window.soundManager.playEngageSFX) {
                    window.soundManager.playEngageSFX();
                }
                if (this.playerStep < 8) {
                    if (game.hud) {
                        game.hud.showFollowerNotification(`TREASURE MAP: Location ${this.playerStep}/8 Visited! 🗺️✨`, true);
                    }
                } else {
                    if (game.hud) {
                        game.hud.showFollowerNotification(`TREASURE LOCATION REVEALED! Go to the marked building! 🪙🏴‍☠️`, true);
                    }
                }
                return true;
            }
        } else if (this.playerStep >= 8 && !this.treasureClaimed) {
            const treasureLoc = this.treasureBuilding;
            if (this.isPlayerNearTarget(treasureLoc, game.player, game.gameMap)) {
                this.treasureClaimed = true;
                game.playerEarnings = (game.playerEarnings || 0) + 25000;
                
                // Grant 4 Goose Gift Cards / Goose Rewards Cards to inventory
                if (!window.playerInventory) window.playerInventory = {};
                window.playerInventory['Goose Gift Card'] = (window.playerInventory['Goose Gift Card'] || 0) + 4;
                window.playerInventory['Goose Rewards Card'] = (window.playerInventory['Goose Rewards Card'] || 0) + 4;

                if (window.soundManager && window.soundManager.playEngageSFX) {
                    window.soundManager.playEngageSFX();
                }
                if (game.hud) {
                    game.hud.showFollowerNotification('🏴‍☠️ TREASURE CLAIMED! 100 Gold Doubloons + 4 Goose Gift Cards! 🪙🎟️', true);
                }
                return true;
            }
        }
        return false;
    }


    triggerSailedOffEarth(game) {
        if (this.sailedOffEarth) return;
        this.sailedOffEarth = true;
        this.offEarthTimer = 2.5;
        if (window.soundManager && window.soundManager.playEngageSFX) {
            window.soundManager.playEngageSFX();
        }
    }

    update(dt, game) {
        if (this.sailedOffEarth) {
            this.offEarthTimer -= dt;
            if (this.offEarthTimer <= 0) {
                this.sailedOffEarth = false;
                if (typeof showScreen === 'function') {
                    showScreen('store-screen');
                }
            }
            return;
        }

        if (!this.initialized) {
            this.init(game);
        }

        if (this.cannonCooldown > 0) {
            this.cannonCooldown -= dt;
        }

        if (this.playerStunTimer > 0) {
            this.playerStunTimer -= dt;
        }

        if (this.playerImmunityTimer > 0) {
            this.playerImmunityTimer -= dt;
        }

        // Maintain active cannonball packs count
        const activePacks = this.cannonballPacks.filter(p => p.active);
        if (activePacks.length < 6) {
            this.spawnCannonballPack(game);
        }

        // Check Rival Ship picking up ammo packs when nearby
        if (this.rivalShip && this.rivalShip.alive && this.rivalShip.ammo < 16) {
            for (const pack of this.cannonballPacks) {
                if (!pack.active) continue;
                const wPack = typeof nearestWrap === 'function' ? nearestWrap(pack.x, pack.y, this.rivalShip.x, this.rivalShip.y) : { x: pack.x, y: pack.y };
                const dx = this.rivalShip.x - wPack.x;
                const dy = this.rivalShip.y - wPack.y;
                if (Math.sqrt(dx * dx + dy * dy) < 60) {
                    pack.active = false;
                    this.rivalShip.ammo = Math.min(16, this.rivalShip.ammo + 8);
                    if (game.hud) game.hud.showFollowerNotification(`🏴‍☠️ Rival Pirates loaded +8 Cannonballs! (${this.rivalShip.ammo}/16) 💣`, false);
                    break;
                }
            }
        }

        // Check NPC Pirate Crew picking up ammo packs
        if (this.npcCrew && this.npcCrew.members) {
            for (const member of this.npcCrew.members) {
                if (!member.alive || member.ammo >= 16) continue;
                for (const pack of this.cannonballPacks) {
                    if (!pack.active) continue;
                    const wPack = typeof nearestWrap === 'function' ? nearestWrap(pack.x, pack.y, member.x, member.y) : { x: pack.x, y: pack.y };
                    const dx = member.x - wPack.x;
                    const dy = member.y - wPack.y;
                    if (Math.sqrt(dx * dx + dy * dy) < 50) {
                        pack.active = false;
                        member.ammo = Math.min(16, member.ammo + 8);
                        if (game.hud) game.hud.showFollowerNotification(`🏴‍☠️ Pirate #${member.index + 1} loaded +8 Cannonballs! (${member.ammo}/16) 💣`, false);
                        break;
                    }
                }
            }
        }

        // Update rival pirate ship
        if (this.rivalShip) {
            this.rivalShip.update(dt, game);
        }

        // Update cannonballs
        for (let i = this.cannonballs.length - 1; i >= 0; i--) {
            const ball = this.cannonballs[i];
            ball.update(dt, game);
            if (!ball.active) {
                this.cannonballs.splice(i, 1);
            }
        }

        // Check player progression through 8 locations
        if (game.player && this.playerStep < 8 && !this.treasureClaimed) {
            const currentTarget = this.playerLocations[this.playerStep];
            if (this.isPlayerNearTarget(currentTarget, game.player, game.gameMap)) {
                this.playerStep++;
                if (this.playerStep < 8) {
                    if (game.hud) {
                        game.hud.showFollowerNotification(`TREASURE MAP: Location ${this.playerStep}/8 Visited! 🗺️✨`, true);
                    }
                } else {
                    if (game.hud) {
                        game.hud.showFollowerNotification(`TREASURE LOCATION REVEALED! Go to the marked building! 🪙🏴‍☠️`, true);
                    }
                }
            }
        }

        // Check if player reaches final Treasure (Step 8)
        if (this.playerStep >= 8 && !this.treasureClaimed && game.player) {
            const treasureLoc = this.treasureBuilding;
            if (this.isPlayerNearTarget(treasureLoc, game.player, game.gameMap)) {
                this.treasureClaimed = true;
                game.playerEarnings = (game.playerEarnings || 0) + 25000;

                // Grant 4 Goose Gift Cards / Goose Rewards Cards to inventory
                if (!window.playerInventory) window.playerInventory = {};
                window.playerInventory['Goose Gift Card'] = (window.playerInventory['Goose Gift Card'] || 0) + 4;
                window.playerInventory['Goose Rewards Card'] = (window.playerInventory['Goose Rewards Card'] || 0) + 4;

                if (window.soundManager && window.soundManager.playEngageSFX) {
                    window.soundManager.playEngageSFX();
                }
                if (game.hud) {
                    game.hud.showFollowerNotification('🏴‍☠️ TREASURE CLAIMED! 100 Gold Doubloons + 4 Goose Gift Cards! 🪙🎟️', true);
                }
            }
        }

        // Update NPC pirate crew
        if (this.npcCrew) {
            this.npcCrew.update(dt, game);
        }
    }

    render(ctx, camera, spriteManager, canvasW, canvasH) {
        // Render Flat Earth Sailing-Off-The-Edge Black Screen Overlay
        if (this.sailedOffEarth) {
            ctx.save();
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvasW, canvasH);

            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 14px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🌊☠️ YOU HAVE SAILED OFF THE EDGE OF THE EARTH! ☠️🌊', canvasW / 2, canvasH / 2 - 20);

            ctx.fillStyle = '#ffffff';
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillText('Your ship has plunged into the cosmic void...', canvasW / 2, canvasH / 2 + 20);

            ctx.fillStyle = '#888888';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillText('Returning to Store...', canvasW / 2, canvasH / 2 + 60);

            ctx.restore();
            return;
        }

        // Render Cannonball Packs on map
        for (const pack of this.cannonballPacks) {
            if (!pack.active) continue;
            const wPos = typeof nearestWrap === 'function' ? nearestWrap(pack.x, pack.y, camera.getCenterX(), camera.getCenterY()) : { x: pack.x, y: pack.y };
            if (!camera.isVisible(wPos.x - 30, wPos.y - 30, 60, 60)) continue;
            const screen = camera.worldToScreen(wPos.x, wPos.y);

            const packImg = spriteManager ? spriteManager.getImage('cannonball_pack') : null;
            ctx.save();
            if (packImg && (packImg.complete || packImg instanceof HTMLCanvasElement)) {
                ctx.drawImage(packImg, screen.x - 24, screen.y - 24, 48, 48);
            } else {
                ctx.fillStyle = '#111111';
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, 16, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            const pulse = Math.sin(Date.now() / 150) * 3;
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, 24 + pulse, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('💣 +8 AMMO', screen.x, screen.y - 28);
            ctx.restore();
        }

        // Render cannonballs
        for (const ball of this.cannonballs) {
            ball.render(ctx, camera, spriteManager);
        }

        // Render rival ship
        if (this.rivalShip) {
            this.rivalShip.render(ctx, camera, spriteManager);
        }

        // Render NPC pirate crew (4 pirates walking the board)
        if (this.npcCrew) {
            this.npcCrew.render(ctx, camera);
        }

        // Highlight current player target location on map & building
        if (this.playerStep < 8) {
            const target = this.playerLocations[this.playerStep];
            if (target) {
                const screen = camera.worldToScreen(target.x, target.y);
                const pulse = Math.sin(Date.now() / 100) * 0.4 + 0.6; // Rapid flash

                ctx.save();

                // Draw flashing highlight box around target building if available
                let bldg = target.buildingObj;
                if (!bldg && game && game.gameMap && game.gameMap.buildings) {
                    bldg = game.gameMap.buildings.find(b => b.id === target.id);
                }
                if (bldg && typeof bldg.x === 'number' && typeof bldg.width === 'number' && !isNaN(bldg.x) && !isNaN(bldg.width)) {
                    const bScreen = camera.worldToScreen(bldg.x, bldg.y);
                    ctx.fillStyle = `rgba(255, 235, 0, ${pulse * 0.35})`;
                    ctx.fillRect(bScreen.x, bScreen.y, bldg.width, bldg.height);
                    ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
                    ctx.lineWidth = 5;
                    ctx.strokeRect(bScreen.x, bScreen.y, bldg.width, bldg.height);
                }

                // Pulsing target beacon & ring
                ctx.strokeStyle = '#ffea00';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, 35 + pulse * 10, 0, Math.PI * 2);
                ctx.stroke();

                const mapImg = spriteManager ? spriteManager.getImage('treasure_map') : null;
                if (mapImg && (mapImg.complete || mapImg instanceof HTMLCanvasElement)) {
                    ctx.drawImage(mapImg, screen.x - 24, screen.y - 55 - pulse * 5, 48, 48);
                }

                ctx.fillStyle = '#ffea00';
                ctx.font = 'bold 12px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`🏝️ ISLAND #${this.playerStep + 1}`, screen.x, screen.y - 65 - pulse * 5);
                ctx.restore();
            }
        } else if (this.treasureBuilding && !this.treasureClaimed) {
            // Render Treasure Chest highlight with treasure.png
            const screen = camera.worldToScreen(this.treasureBuilding.x, this.treasureBuilding.y);
            const pulse = Math.sin(Date.now() / 150) * 10;
            ctx.save();
            const treasureImg = spriteManager ? spriteManager.getImage('treasure') : null;
            if (treasureImg && (treasureImg.complete || treasureImg instanceof HTMLCanvasElement)) {
                ctx.drawImage(treasureImg, screen.x - 32, screen.y - 70 + pulse, 64, 64);
            }
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 14px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🪙 TREASURE ISLAND HERE! 🏴‍☠️', screen.x, screen.y - 80 + pulse);
            ctx.restore();
        }

        // Render Player Stun overlay if hit by cannon
        if (this.playerStunTimer > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvasW, canvasH);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`SHIP IMMOBILIZED! STUNNED (${Math.ceil(this.playerStunTimer)}s) 💥`, canvasW / 2, canvasH / 2 - 50);
            ctx.restore();
        }

        // Render Treasure Claim Victory Popup Overlay displaying treasure.png
        if (this.treasureClaimed) {
            ctx.save();
            const cx = canvasW / 2;
            const cy = canvasH / 2;
            const pW = 440;
            const pH = 260;

            // Dimmed background backdrop
            ctx.fillStyle = 'rgba(10, 15, 25, 0.75)';
            ctx.fillRect(0, 0, canvasW, canvasH);

            // Modal card
            ctx.fillStyle = 'rgba(25, 20, 15, 0.95)';
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(cx - pW/2, cy - pH/2, pW, pH, 16);
            ctx.fill();
            ctx.stroke();

            // Treasure.png image
            const treasureImg = spriteManager ? spriteManager.getImage('treasure') : null;
            if (treasureImg && (treasureImg.complete || treasureImg instanceof HTMLCanvasElement)) {
                ctx.drawImage(treasureImg, cx - 48, cy - pH/2 + 20, 96, 96);
            }

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 14px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🏴‍☠️ TREASURE CLAIMED! 🪙', cx, cy + 25);

            ctx.fillStyle = '#ffffff';
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillText('100 Gold Doubloons ($25,000)!', cx, cy + 55);

            const gooseCardImg = spriteManager ? spriteManager.getImage('item_goose_card') : null;
            if (gooseCardImg && (gooseCardImg.complete || gooseCardImg instanceof HTMLCanvasElement)) {
                ctx.drawImage(gooseCardImg, cx - 125, cy + 70, 24, 24);
            }
            ctx.fillStyle = '#ff9900';
            ctx.fillText('+4 Goose Gift Cards Added!', cx + 10, cy + 86);

            ctx.fillStyle = '#888888';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillText('(Used immediately at Fast Food for 25% OFF)', cx, cy + 112);

            ctx.restore();
        }

        // Render Treasure Map HUD Widget
        this.renderHUD(ctx, canvasW, canvasH, spriteManager);
    }

    renderHUD(ctx, canvasW, canvasH, spriteManager) {
        ctx.save();
        const boxW = 270;
        const boxH = 72;
        const boxX = 20;
        const boxY = 80;

        ctx.fillStyle = 'rgba(20, 15, 10, 0.88)';
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        const mapImg = spriteManager ? spriteManager.getImage('treasure_map') : null;
        if (mapImg && (mapImg.complete || mapImg instanceof HTMLCanvasElement)) {
            ctx.drawImage(mapImg, boxX + 8, boxY + 8, 36, 36);
        }

        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('TREASURE MAP', boxX + 52, boxY + 18);

        ctx.fillStyle = '#ffffff';
        ctx.font = '8px "Press Start 2P", monospace';
        if (this.treasureClaimed) {
            ctx.fillStyle = '#00ff88';
            ctx.fillText('TREASURE CLAIMED! 🪙', boxX + 52, boxY + 34);
        } else if (this.playerStep >= 8) {
            ctx.fillStyle = '#ffd700';
            ctx.fillText('FINAL TREASURE REVEALED!', boxX + 52, boxY + 34);
        } else {
            ctx.fillText(`Location: ${this.playerStep}/8 Visited`, boxX + 52, boxY + 34);
        }

        // Ammo counter
        ctx.fillStyle = this.playerCannonAmmo > 0 ? '#ffea00' : '#ff4444';
        ctx.fillText(`💣 Cannonballs: ${this.playerCannonAmmo}/16`, boxX + 52, boxY + 50);

        if (this.playerImmunityTimer > 0) {
            ctx.fillStyle = '#00ffff';
            ctx.fillText(`🛡️ IMMUNE (${Math.ceil(this.playerImmunityTimer)}s)`, boxX + 165, boxY + 50);
        }

        ctx.restore();
    }
}

// Preserve backwards-compatible class stubs for existing callers if any
class Pirate {
    constructor(tileX, tileY, targetTileX, targetTileY) {
        this.x = tileX * 32 + 16;
        this.y = tileY * 32 + 16;
        this.alive = true;
        this.size = 26;
    }
    update() {}
    render() {}
}

class PirateManager {
    constructor() {
        this.pirates = [];
        this.combatResults = null;
    }
    spawnPirates() {}
    update() {}
    render() {}
    renderCombatResults() {}
    allDead() { return true; }
    getAlivePirateCount() { return 0; }
}
