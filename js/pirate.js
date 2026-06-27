// ============================================================
// pirate.js — Pirate spawning, movement & combat system
// ============================================================

class Pirate {
    constructor(tileX, tileY, targetTileX, targetTileY) {
        this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
        this.y = tileY * TILE_SIZE + TILE_SIZE / 2;
        this.targetX = targetTileX * TILE_SIZE + TILE_SIZE / 2;
        this.targetY = targetTileY * TILE_SIZE + TILE_SIZE / 2;
        this.spriteId = 'char_pirate';
        this.alive = true;
        this.arrived = false;
        this.size = TILE_SIZE - 6;
        this.speed = TILE_SIZE / 3; // 1/3 tile per second
        this.direction = 'down';
        this.animFrame = 0;
        this.animTimer = 0;
    }

    update(dt, gameMap) {
        if (!this.alive || this.arrived) return;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < TILE_SIZE / 2) {
            this.arrived = true;
            return;
        }

        // Normalize and move
        const nx = dx / dist;
        const ny = dy / dist;
        
        const nextX = this.x + nx * this.speed * dt;
        const nextY = this.y + ny * this.speed * dt;

        // Wall collision slide
        if (gameMap) {
            if (this._canMoveTo(nextX, this.y, gameMap)) {
                this.x = nextX;
            }
            if (this._canMoveTo(this.x, nextY, gameMap)) {
                this.y = nextY;
            }
        } else {
            this.x = nextX;
            this.y = nextY;
        }

        // Direction for rendering
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? 'right' : 'left';
        } else {
            this.direction = dy > 0 ? 'down' : 'up';
        }

        this.animTimer++;
        if (this.animTimer >= 8) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }
    }

    _canMoveTo(newX, newY, gameMap) {
        const hs = this.size / 2 - 4; // collision box for pirate
        const corners = [
            { x: newX - hs, y: newY - hs }, { x: newX + hs, y: newY - hs },
            { x: newX - hs, y: newY + hs }, { x: newX + hs, y: newY + hs },
        ];
        for (const c of corners) {
            const tx = Math.floor(c.x / TILE_SIZE);
            const ty = Math.floor(c.y / TILE_SIZE);
            // Since pirates are outside, call isWalkable without player curTX/curTY
            if (!gameMap.isWalkable(tx, ty))
                return false;
        }
        return true;
    }

    render(ctx, camera, spriteManager) {
        if (!this.alive) return;

        const screen = camera.worldToScreen(this.x, this.y);
        const drawSize = this.size + 4;
        const img = spriteManager.getCharacterImage(this.spriteId);

        if (img && (img.complete || img instanceof HTMLCanvasElement)) {
            const bobY = Math.sin(this.animTimer * 0.8) * 1.5;
            ctx.save();
            if (this.direction === 'left') {
                ctx.translate(screen.x, screen.y + bobY);
                ctx.scale(-1, 1);
                ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            } else {
                ctx.drawImage(img, screen.x - drawSize / 2, screen.y - drawSize / 2 + bobY, drawSize, drawSize);
            }
            ctx.restore();
        } else {
            // Fallback red circle
            ctx.fillStyle = '#cc2222';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Skull indicator
        ctx.font = '12px serif';
        ctx.textAlign = 'center';
        ctx.fillText('☠️', screen.x, screen.y - drawSize / 2 - 6);
    }
}

class PirateManager {
    constructor() {
        this.pirates = [];
        this.combatTriggered = false;
        this.combatResults = null;
        this.combatDisplayTimer = 0;
    }

    spawnPirates(buildingDoorTileX, buildingDoorTileY) {
        this.pirates = [];
        this.combatTriggered = false;
        this.combatResults = null;

        for (let i = 0; i < 6; i++) {
            // Random position within 20-tile radius
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 10; // 10-20 tiles away
            const spawnTX = Math.round(buildingDoorTileX + Math.cos(angle) * radius);
            const spawnTY = Math.round(buildingDoorTileY + Math.sin(angle) * radius);
            // Wrap to map bounds
            const wrappedTX = ((spawnTX % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;
            const wrappedTY = ((spawnTY % MAP_HEIGHT) + MAP_HEIGHT) % MAP_HEIGHT;

            this.pirates.push(new Pirate(wrappedTX, wrappedTY, buildingDoorTileX, buildingDoorTileY));
        }
    }

    update(dt, game) {
        for (const pirate of this.pirates) {
            pirate.update(dt);
        }

        if (!game) return;

        // Check if any pirate arrived at the door and we have posse members
        const arrivedPirates = this.pirates.filter(p => p.alive && p.arrived);
        const posseCount = game.followerManager.getFollowerCount();

        if (arrivedPirates.length > 0 && posseCount > 0) {
            const totalPosse = posseCount + 1; // player counts as a posse member
            let baseWinChance = 0.5;
            if (totalPosse < 6) {
                baseWinChance -= (6 - totalPosse) * 0.05;
            } else {
                baseWinChance += (totalPosse - 6) * 0.10;
            }
            baseWinChance += (game.protectionBonus || 0) / 100;
            
            // Clamp win chance
            if (baseWinChance > 0.95) baseWinChance = 0.95;
            if (baseWinChance < 0.05) baseWinChance = 0.05;

            let piratesKilled = 0;
            let posseKilled = 0;

            for (const pirate of arrivedPirates) {
                if (game.followerManager.getFollowerCount() === 0) break;

                const roll = Math.random();
                const posseWon = roll < baseWinChance;

                if (posseWon) {
                    pirate.alive = false;
                    piratesKilled++;
                } else {
                    posseKilled++;
                    game.followerManager.removeFollower();
                }
            }

            if (piratesKilled > 0 || posseKilled > 0) {
                this.combatResults = {
                    piratesKilled,
                    posseKilled,
                    winChance: baseWinChance
                };
                this.combatDisplayTimer = 180; // 3 seconds overlay
                game.employeesKilledThisRound += posseKilled;
                game.hud.followerCount = game.followerManager.getFollowerCount();
            }
        }
    }

    allDead() {
        return this.pirates.every(p => !p.alive);
    }

    getAlivePirateCount() {
        return this.pirates.filter(p => p.alive).length;
    }

    render(ctx, camera, spriteManager) {
        for (const pirate of this.pirates) {
            if (pirate.alive && camera.isVisible(pirate.x - pirate.size, pirate.y - pirate.size, pirate.size * 2, pirate.size * 2)) {
                pirate.render(ctx, camera, spriteManager);
            }
        }
    }

    renderCombatResults(ctx, canvasWidth, canvasHeight) {
        if (!this.combatResults || this.combatDisplayTimer <= 0) return;
        this.combatDisplayTimer--;

        const alpha = Math.min(1, this.combatDisplayTimer / 30);
        const r = this.combatResults;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Combat results panel
        const boxW = 340;
        const boxH = 100;
        const boxX = (canvasWidth - boxW) / 2;
        const boxY = 80;

        ctx.fillStyle = 'rgba(40,0,0,0.9)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();

        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.stroke();

        ctx.fillStyle = '#ff8844';
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚔️ PIRATE BATTLE ⚔️', canvasWidth / 2, boxY + 22);

        ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillStyle = '#00ff88';
        ctx.fillText(`Pirates defeated: ${r.piratesKilled}`, canvasWidth / 2, boxY + 48);

        ctx.fillStyle = '#ff4444';
        ctx.fillText(`Posse lost: ${r.posseKilled}`, canvasWidth / 2, boxY + 68);

        ctx.fillStyle = '#888';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText(`Win chance: ${Math.round(r.winChance * 100)}%`, canvasWidth / 2, boxY + 88);

        ctx.restore();
    }
}
