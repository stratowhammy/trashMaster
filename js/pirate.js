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
        this.speed = 80 + Math.random() * 30; // 80–110 px/sec
        this.stunTimer = 0;
        this.immunityTimer = 0;
        this.ammo = 8; // Starts with 8 cannon balls
        this.alive = true;
        this.direction = 'right';
        this.animTimer = 0;
        this.shootCooldown = 3 + Math.random() * 2; // stagger initial shots
    }

    update(dt, targetLocation, game) {
        if (!this.alive) return;

        this.animTimer += dt;

        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            return;
        }

        if (this.immunityTimer > 0) this.immunityTimer -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;

        if (!targetLocation) return;

        const wTarget = typeof nearestWrap === 'function'
            ? nearestWrap(targetLocation.x, targetLocation.y, this.x, this.y)
            : { x: targetLocation.x, y: targetLocation.y };

        const dx = wTarget.x - this.x;
        const dy = wTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            const nx = dx / dist;
            const ny = dy / dist;
            this.x += nx * this.speed * dt;
            this.y += ny * this.speed * dt;

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
            if (pdist < 320 && pdist > 20) {
                this.shootCooldown = 4.0 + Math.random() * 2;
                this.ammo--;
                if (game.pirateModeManager) {
                    game.pirateModeManager.cannonballs.push(
                        new Cannonball(this.x, this.y, pdx / pdist, pdy / pdist, false)
                    );
                }
            }
        }
    }

    render(ctx, camera) {
        if (!this.alive) return;
        const wPos = typeof nearestWrap === 'function'
            ? nearestWrap(this.x, this.y, camera.getCenterX(), camera.getCenterY())
            : { x: this.x, y: this.y };

        if (!camera.isVisible(wPos.x - 40, wPos.y - 40, 80, 80)) return;
        const screen = camera.worldToScreen(wPos.x, wPos.y);

        ctx.save();

        const bob = Math.sin(this.animTimer * 3.5) * 2;

        // ── Pixel-art pirate (black coat, red bandana) ──
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
        // Bandana knot
        ctx.fillRect(s + 9, t - 22, 5, 4);

        // Eyes
        ctx.fillStyle = '#111';
        ctx.fillRect(s - 5, t - 22, 3, 3);
        ctx.fillRect(s + 2, t - 22, 3, 3);

        // Stun indicator
        if (this.stunTimer > 0) {
            ctx.fillStyle = '#ff3333';
            ctx.font = 'bold 9px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`STUNNED ${Math.ceil(this.stunTimer)}s`, s, t - 38);
        } else {
            ctx.fillStyle = '#ff4444';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`🏴‍☠️ ${this.index + 1}`, s, t - 38);
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
            const ox = (Math.random() - 0.5) * 120;
            const oy = (Math.random() - 0.5) * 120;
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
            if (Math.sqrt(dx * dx + dy * dy) < 100) return true;
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
                        game.hud.showFollowerNotification(`🏴‍☠️ Rival Pirate Crew tagged Location ${this.currentStep}/8!`, false);
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
            m.update(dt, target, game);
        }
    }

    render(ctx, camera) {
        for (const m of this.members) {
            m.render(ctx, camera);
        }
    }
}

class RivalPirateShip {

    constructor(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.speed = 110; // speed in px/sec
        this.stunTimer = 0;
        this.immunityTimer = 0;
        this.ammo = 8; // Starts with 8 cannon balls
        this.alive = true;
        this.targets = [];
        this.currentTargetIndex = 0;
        this.shootCooldown = 0;
        this.direction = 'right';
    }

    setTargets(locations) {
        this.targets = locations;
        this.currentTargetIndex = 0;
    }

    update(dt, game) {
        if (!this.alive) return;

        // Update stun timer
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            return; // Cannot move or shoot while stunned
        }

        if (this.immunityTimer > 0) {
            this.immunityTimer -= dt;
        }

        // Shoot cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown -= dt;
        }

        if (!this.targets || this.targets.length === 0) return;

        const currentTarget = this.targets[Math.min(this.currentTargetIndex, this.targets.length - 1)];
        if (!currentTarget || isNaN(currentTarget.x) || isNaN(currentTarget.y)) return;

        if (isNaN(this.x) || isNaN(this.y)) {
            this.x = currentTarget.x;
            this.y = currentTarget.y;
        }

        const wTarget = typeof nearestWrap === 'function'
            ? nearestWrap(currentTarget.x, currentTarget.y, this.x, this.y)
            : { x: currentTarget.x, y: currentTarget.y };

        const dx = wTarget.x - this.x;
        const dy = wTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (isNaN(dist)) return;

        if (dist < 60) {
            // Tagged current location, advance to next
            if (this.currentTargetIndex < this.targets.length - 1) {
                this.currentTargetIndex++;
                if (this.currentTargetIndex < 8) {
                    if (game.hud) {
                        game.hud.showFollowerNotification(`🏴‍☠️ Rival Pirate Ship visited Location ${this.currentTargetIndex}/8!`, false);
                    }
                } else if (this.currentTargetIndex === 8) {
                    if (game.hud) {
                        game.hud.showFollowerNotification(`🚨 Rival Pirate Ship revealed the Treasure & is racing for it! 🏁🏴‍☠️`, false);
                    }
                }
            } else {
                // Reached final treasure building!
                if (game.pirateModeManager && !game.pirateModeManager.treasureClaimed && !game.pirateModeManager.rivalWon) {
                    game.pirateModeManager.rivalWon = true;
                    if (game.hud) {
                        game.hud.showFollowerNotification(`☠️ RIVAL PIRATES FOUND THE TREASURE FIRST! 🏴‍☠️`, false);
                    }
                }
            }
        } else if (dist > 0.001) {
            // Politics-mode style smooth navigation toward currentTarget
            const vx = (dx / dist) * this.speed;
            const vy = (dy / dist) * this.speed;
            const nextX = this.x + vx * dt;
            const nextY = this.y + vy * dt;

            if (isNaN(nextX) || isNaN(nextY)) return;

            if (game.gameMap && typeof game.gameMap.isWalkable === 'function') {
                const tx = Math.floor(nextX / TILE_SIZE);
                const ty = Math.floor(nextY / TILE_SIZE);
                const curTX = Math.floor(this.x / TILE_SIZE);
                const curTY = Math.floor(this.y / TILE_SIZE);

                if (game.gameMap.isWalkable(tx, ty, curTX, curTY)) {
                    this.x = nextX;
                    this.y = nextY;
                } else {
                    const txX = Math.floor(nextX / TILE_SIZE);
                    const tyX = Math.floor(this.y / TILE_SIZE);
                    if (game.gameMap.isWalkable(txX, tyX, curTX, curTY)) {
                        this.x = nextX;
                    } else {
                        const txY = Math.floor(this.x / TILE_SIZE);
                        const tyY = Math.floor(nextY / TILE_SIZE);
                        if (game.gameMap.isWalkable(tyY, txY, curTX, curTY)) {
                            this.y = nextY;
                        } else {
                            // Slide forward if obstacle
                            this.x = nextX;
                            this.y = nextY;
                        }
                    }
                }
            } else {
                this.x = nextX;
                this.y = nextY;
            }

            // Wrap map bounds
            if (typeof MAP_PIXEL_W !== 'undefined' && typeof MAP_PIXEL_H !== 'undefined') {
                this.x = ((this.x % MAP_PIXEL_W) + MAP_PIXEL_W) % MAP_PIXEL_W;
                this.y = ((this.y % MAP_PIXEL_H) + MAP_PIXEL_H) % MAP_PIXEL_H;
            }

            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? 'right' : 'left';
            } else {
                this.direction = dy > 0 ? 'down' : 'up';
            }
        }

        // Periodically shoot at player if within range (requires ammo > 0)
        if (game.player && this.shootCooldown <= 0 && this.ammo > 0) {
            const pw = typeof nearestWrap === 'function' ? nearestWrap(game.player.x, game.player.y, this.x, this.y) : { x: game.player.x, y: game.player.y };
            const pdx = pw.x - this.x;
            const pdy = pw.y - this.y;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

            if (pdist < 320 && pdist > 20) {
                this.shootCooldown = 3.5; // Shoot every 3.5 seconds
                this.ammo--;
                const dirX = pdx / pdist;
                const dirY = pdy / pdist;
                game.pirateModeManager.cannonballs.push(new Cannonball(this.x, this.y, dirX, dirY, false));
            }
        }
    }

    render(ctx, camera, spriteManager) {
        if (!this.alive) return;
        const screen = camera.worldToScreen(this.x, this.y);

        ctx.save();
        const img = spriteManager ? spriteManager.getImage('pirate_ship') : null;
        const drawSize = 64;

        if (img && (img.complete || img instanceof HTMLCanvasElement)) {
            if (this.direction === 'left') {
                ctx.translate(screen.x, screen.y);
                ctx.scale(-1, 1);
                ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            } else {
                ctx.drawImage(img, screen.x - drawSize / 2, screen.y - drawSize / 2, drawSize, drawSize);
            }
        } else {
            ctx.fillStyle = '#8b0000';
            ctx.fillRect(screen.x - 24, screen.y - 16, 48, 32);
        }

        ctx.restore();

        // Stun indicator
        if (this.stunTimer > 0) {
            ctx.fillStyle = '#ff3333';
            ctx.font = 'bold 12px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`STUNNED! (${Math.ceil(this.stunTimer)}s)`, screen.x, screen.y - 38);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px serif';
            ctx.textAlign = 'center';
            ctx.fillText('🏴‍☠️ Rival Pirates', screen.x, screen.y - 36);
        }
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
        this.initialized = false;
    }

    spawnCannonballPack(game) {
        const MAP_W = typeof MAP_PIXEL_W !== 'undefined' ? MAP_PIXEL_W : 4096;
        const MAP_H = typeof MAP_PIXEL_H !== 'undefined' ? MAP_PIXEL_H : 4096;
        let px = Math.random() * MAP_W;
        let py = Math.random() * MAP_H;

        if (game && game.gameMap && typeof game.gameMap.isWalkable === 'function') {
            for (let attempt = 0; attempt < 25; attempt++) {
                const rx = Math.random() * MAP_W;
                const ry = Math.random() * MAP_H;
                const tx = Math.floor(rx / TILE_SIZE);
                const ty = Math.floor(ry / TILE_SIZE);
                if (game.gameMap.isWalkable(tx, ty)) {
                    px = rx;
                    py = ry;
                    break;
                }
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

        // Spawn 12 packs of 8 cannonballs across the map
        for (let i = 0; i < 12; i++) {
            this.spawnCannonballPack(game);
        }

        const allBuildings = game.gameMap ? game.gameMap.buildings : [];
        const EXCLUDED_TYPES = new Set([
            'hospital', 'fast_food', 'fastfood', 'dump', 'city_hall', 'cityhall', 'bank', 'police',
            'airport', 'station', 'art_museum', 'liberty_bell', 'one_liberty', 'franklin_institute',
            'burj_khalifa', 'petra', 'dome_of_rock', 'pyramids', 'burj_al_arab', 'kingdom_centre',
            'christ_redeemer', 'machu_picchu', 'obelisco_ba', 'torre_entel', 'palacio_salvo', 'congresso_nacional'
        ]);

        // Filter out functional and landmark buildings
        const standardBuildings = allBuildings.filter(b => {
            if (!b || !b.tiles || b.tiles.length === 0) return false;
            const typeStr = (b.type || '').toLowerCase();
            const nameStr = (b.name || '').toLowerCase();
            if (EXCLUDED_TYPES.has(typeStr) || EXCLUDED_TYPES.has(nameStr)) return false;
            if (b.isLandmark || b.isFunctional) return false;
            return true;
        });

        // Gather valid standard building locations on map
        let pool = [];
        if (standardBuildings && standardBuildings.length > 0) {
            pool = pool.concat(standardBuildings.map(b => {
                let bx = b.x, by = b.y, bw = b.width, bh = b.height;
                if ((bx === undefined || isNaN(bx)) && b.tiles && b.tiles.length > 0) {
                    let minTileX = Infinity, minTileY = Infinity, maxTileX = -Infinity, maxTileY = -Infinity;
                    for (const t of b.tiles) {
                        if (t.x < minTileX) minTileX = t.x;
                        if (t.x > maxTileX) maxTileX = t.x;
                        if (t.y < minTileY) minTileY = t.y;
                        if (t.y > maxTileY) maxTileY = t.y;
                    }
                    bx = minTileX * TILE_SIZE;
                    by = minTileY * TILE_SIZE;
                    bw = (maxTileX - minTileX + 1) * TILE_SIZE;
                    bh = (maxTileY - minTileY + 1) * TILE_SIZE;
                }
                const centerX = (bx !== undefined && bw !== undefined && !isNaN(bx) && !isNaN(bw)) ? bx + bw / 2 : 1500;
                const centerY = (by !== undefined && bh !== undefined && !isNaN(by) && !isNaN(bh)) ? by + bh / 2 : 1500;
                return {
                    x: centerX,
                    y: centerY,
                    name: b.name || 'Standard Building',
                    type: 'building',
                    id: b.id,
                    buildingObj: b
                };
            }));
        }

        // Fallback random non-functional points if pool is small
        while (pool.length < 16) {
            const rx = Math.random() * (typeof MAP_PIXEL_W !== 'undefined' ? MAP_PIXEL_W : 3000);
            const ry = Math.random() * (typeof MAP_PIXEL_H !== 'undefined' ? MAP_PIXEL_H : 3000);
            pool.push({ x: rx, y: ry, name: 'Secret Waypoint', type: 'point' });
        }

        // Shuffle pool
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        this.playerLocations = shuffled.slice(0, 8);
        this.rivalLocations = shuffled.slice(8, 16);

        // Target 8 is the treasure building
        this.treasureBuilding = this.playerLocations[7];

        // Rival targets: 8 waypoints + final race to treasure building!
        const rivalTargets = [...this.rivalLocations.slice(0, 8), this.treasureBuilding];

        // Create rival ship starting near location 1
        const startLoc = rivalTargets[0];
        this.rivalShip = new RivalPirateShip(startLoc.x - 100, startLoc.y - 100);
        this.rivalShip.setTargets(rivalTargets);

        // Create NPC pirate crew (4 members) on their own route
        this.npcCrew = new NpcPirateCrew();
        this.npcCrew.init(rivalTargets, startLoc.x + 200, startLoc.y + 200);

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


    update(dt, game) {
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
