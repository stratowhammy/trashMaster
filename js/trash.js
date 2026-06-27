// ============================================================
// trash.js — Trash spawning, pickup, respawn logic
// ============================================================

class TrashItem {
    constructor(tileX, tileY, type) {
        this.tileX = tileX;
        this.tileY = tileY;
        this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
        this.y = tileY * TILE_SIZE + TILE_SIZE / 2;
        this.type = type;    // 0-3 maps to trash1-trash4
        this.collected = false;
        this.size = 18;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.sparkleTimer = Math.random() * 100;
    }
}

class TrashManager {
    constructor() {
        this.items = [];
        this.totalCollected = 0;
        this.totalPoints = 0;
        this.respawnTimer = 0;
        this.respawnInterval = 180; // frames (~3 seconds at 60fps)
        this.maxTrashOnMap = 150;
        this.pickupEffects = [];    // Visual effects for pickup
    }

    spawnInitial(gameMap, count) {
        this.items = [];
        let placed = 0;
        let attempts = 0;
        const maxAttempts = count * 10;

        while (placed < count && attempts < maxAttempts) {
            const tileX = Math.floor(Math.random() * MAP_WIDTH);
            const tileY = Math.floor(Math.random() * MAP_HEIGHT);
            attempts++;

            // Only place on walkable tiles
            if (!gameMap.isWalkable(tileX, tileY)) continue;

            // Don't stack trash
            if (this.items.some(t => t.tileX === tileX && t.tileY === tileY)) continue;

            const type = Math.floor(Math.random() * 4);
            this.items.push(new TrashItem(tileX, tileY, type));
            placed++;
        }
    }

    spawnMore(gameMap, count) {
        const activeTrash = this.items.filter(t => !t.collected).length;
        if (activeTrash >= this.maxTrashOnMap) return;

        let placed = 0;
        let attempts = 0;
        while (placed < count && attempts < count * 10) {
            const tileX = Math.floor(Math.random() * MAP_WIDTH);
            const tileY = Math.floor(Math.random() * MAP_HEIGHT);
            attempts++;

            if (!gameMap.isWalkable(tileX, tileY)) continue;
            if (this.items.some(t => !t.collected && t.tileX === tileX && t.tileY === tileY)) continue;

            const type = Math.floor(Math.random() * 4);
            this.items.push(new TrashItem(tileX, tileY, type));
            placed++;
        }
    }

    update(gameMap) {
        // Periodic respawn
        this.respawnTimer++;
        if (this.respawnTimer >= this.respawnInterval) {
            this.respawnTimer = 0;
            this.spawnMore(gameMap, 5);
        }

        // Update pickup effects
        this.pickupEffects = this.pickupEffects.filter(e => {
            e.timer++;
            e.y -= 1.5;
            e.alpha -= 0.03;
            return e.alpha > 0;
        });

        // Clean up collected items periodically
        if (this.items.length > this.maxTrashOnMap * 2) {
            this.items = this.items.filter(t => !t.collected);
        }
    }

    checkPickup(entityX, entityY, pickupRadius, followerCount = 0) {
        const picked = [];
        const pointValue = Math.pow(2, followerCount);
        for (const item of this.items) {
            if (item.collected) continue;

            const wrapped = nearestWrap(item.x, item.y, entityX, entityY);
            const dx = entityX - wrapped.x;
            const dy = entityY - wrapped.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < pickupRadius) {
                item.collected = true;
                this.totalCollected++;
                this.totalPoints += pointValue;
                picked.push(item);

                // Create pickup effect
                this.pickupEffects.push({
                    x: wrapped.x,
                    y: wrapped.y,
                    text: `+${pointValue}`,
                    timer: 0,
                    alpha: 1,
                    color: '#00ff88',
                });
            }
        }
        return picked;
    }

    render(ctx, camera, spriteManager) {
        const time = performance.now() / 1000;
        const camCX = camera.getCenterX();
        const camCY = camera.getCenterY();

        for (const item of this.items) {
            if (item.collected) continue;
            
            const wrapped = nearestWrap(item.x, item.y, camCX, camCY);
            if (!camera.isVisible(wrapped.x - 16, wrapped.y - 16, 32, 32)) continue;

            const screen = camera.worldToScreen(wrapped.x, wrapped.y);

            // Gentle bob animation
            const bobY = Math.sin(time * 2 + item.bobOffset) * 2;

            // Sparkle effect
            item.sparkleTimer += 0.05;

            // Draw trash sprite
            const trashImg = spriteManager.getTrashImage(`trash${item.type + 1}`);
            const drawSize = item.size;

            if (trashImg && (trashImg.complete || trashImg instanceof HTMLCanvasElement)) {
                ctx.drawImage(
                    trashImg,
                    screen.x - drawSize / 2,
                    screen.y - drawSize / 2 + bobY,
                    drawSize,
                    drawSize
                );
            } else {
                // Fallback
                this._drawFallbackTrash(ctx, screen.x, screen.y + bobY, item.type);
            }

            // Sparkle
            if (Math.sin(item.sparkleTimer) > 0.8) {
                ctx.fillStyle = 'rgba(255,255,200,0.8)';
                ctx.beginPath();
                ctx.arc(screen.x + 6, screen.y - 6 + bobY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Render pickup effects
        for (const effect of this.pickupEffects) {
            const screen = camera.worldToScreen(effect.x, effect.y);
            ctx.globalAlpha = effect.alpha;
            ctx.fillStyle = effect.color;
            ctx.font = 'bold 14px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(effect.text, screen.x, screen.y);
            ctx.globalAlpha = 1;
        }
    }

    _drawFallbackTrash(ctx, sx, sy, type) {
        const colors = ['#e8e8e8', '#dd4444', '#aaddff', '#ffdd33'];
        const size = 10;
        ctx.fillStyle = colors[type];
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - size / 2, sy - size / 2, size, size);
    }

    getActiveCount() {
        return this.items.filter(t => !t.collected).length;
    }
}
