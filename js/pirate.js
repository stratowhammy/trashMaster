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
        this.speed = TILE_SIZE; // 1 tile per second
        this.direction = 'down';
        this.animFrame = 0;
        this.animTimer = 0;
    }

    update(dt) {
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
        this.x += nx * this.speed * dt;
        this.y += ny * this.speed * dt;

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

    update(dt) {
        for (const pirate of this.pirates) {
            pirate.update(dt);
        }
    }

    hasArrivedPirates() {
        if (this.combatTriggered) return false;
        return this.pirates.some(p => p.alive && p.arrived);
    }

    // posseCount: total posse size
    // protectionBonus: percentage points from Protection items
    // Returns combat result object
    runCombat(posseCount, protectionBonus) {
        if (this.combatTriggered) return null;
        this.combatTriggered = true;

        let baseWinChance = 0.5;

        // Extra posse members increase win chance
        if (posseCount > 6) {
            baseWinChance += (posseCount - 6) * 0.10;
        }

        // Protection stacking
        baseWinChance += (protectionBonus || 0) / 100;

        // Cap at 95%
        if (baseWinChance > 0.95) baseWinChance = 0.95;

        const fights = [];
        let piratesKilled = 0;
        let posseKilled = 0;

        const alivePirates = this.pirates.filter(p => p.alive && p.arrived);

        for (let i = 0; i < alivePirates.length; i++) {
            const roll = Math.random();
            const posseWon = roll < baseWinChance;
            if (posseWon) {
                alivePirates[i].alive = false;
                piratesKilled++;
            } else {
                posseKilled++;
            }
            fights.push({ pirateIndex: i, posseWon, roll, winChance: baseWinChance });
        }

        this.combatResults = { piratesKilled, posseKilled, fights, winChance: baseWinChance };
        this.combatDisplayTimer = 300; // ~5 seconds to show results
        return this.combatResults;
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
