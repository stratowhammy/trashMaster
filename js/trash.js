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
        this.isGold = false;
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
        this.maxTrashOnMap = 800;
        this.pickupEffects = [];    // Visual effects for pickup
        this.goldRushActive = false;
        this.originalItems = [];
    }

    spawnInitial(gameMap, count) {
        this.items = [];

        // Check if custom map data has pre-placed trash fields
        const customTrash = (gameMap && (gameMap.trash || gameMap.trashItems || (gameMap.data && gameMap.data.trash)));
        if (customTrash && customTrash.length > 0) {
            for (const t of customTrash) {
                const item = new TrashItem(t.tileX, t.tileY, t.type !== undefined ? t.type : Math.floor(Math.random() * 4));
                this.items.push(item);
            }
            return;
        }

        let placed = 0;
        let attempts = 0;
        const maxAttempts = count * 10;

        while (placed < count && attempts < maxAttempts) {
            const tileX = Math.floor(Math.random() * MAP_WIDTH);
            const tileY = Math.floor(Math.random() * MAP_HEIGHT);
            attempts++;

            // Only place on walkable tiles
            if (!gameMap.isWalkable(tileX, tileY)) continue;

            // Parade proximity weighting (3x density near route)
            if (window.game && window.game.paradeActive) {
                const route = window.game.paradeRoadIndex;
                const dir = window.game.paradeDirection;
                let isNear = false;
                if (dir === 'horizontal') {
                    let dy = Math.abs(tileY - route);
                    if (dy > MAP_HEIGHT / 2) dy = MAP_HEIGHT - dy;
                    isNear = (dy <= 2);
                } else {
                    let dx = Math.abs(tileX - route);
                    if (dx > MAP_WIDTH / 2) dx = MAP_WIDTH - dx;
                    isNear = (dx <= 2);
                }
                if (!isNear && Math.random() > 0.33) continue;
            }

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

            // Parade proximity weighting (3x density near route)
            if (window.game && window.game.paradeActive) {
                const route = window.game.paradeRoadIndex;
                const dir = window.game.paradeDirection;
                let isNear = false;
                if (dir === 'horizontal') {
                    let dy = Math.abs(tileY - route);
                    if (dy > MAP_HEIGHT / 2) dy = MAP_HEIGHT - dy;
                    isNear = (dy <= 2);
                } else {
                    let dx = Math.abs(tileX - route);
                    if (dx > MAP_WIDTH / 2) dx = MAP_WIDTH - dx;
                    isNear = (dx <= 2);
                }
                if (!isNear && Math.random() > 0.33) continue;
            }
            if (this.items.some(t => !t.collected && t.tileX === tileX && t.tileY === tileY)) continue;

            const type = Math.floor(Math.random() * 4);
            this.items.push(new TrashItem(tileX, tileY, type));
            placed++;
        }
    }

    spawnNear(gameMap, centerX, centerY, radius, count) {
        let placed = 0;
        let attempts = 0;
        const maxAttempts = count * 10;
        while (placed < count && attempts < maxAttempts) {
            attempts++;
            const rx = Math.floor((Math.random() * 2 - 1) * radius);
            const ry = Math.floor((Math.random() * 2 - 1) * radius);
            const tileX = centerX + rx;
            const tileY = centerY + ry;

            if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) continue;
            if (!gameMap.isWalkable(tileX, tileY)) continue;
            if (this.items.some(t => !t.collected && t.tileX === tileX && t.tileY === tileY)) continue;

            const type = Math.floor(Math.random() * 4);
            this.items.push(new TrashItem(tileX, tileY, type));
            placed++;
        }
    }

    spawnTrashAt(x, y) {
        const tileX = typeof wrapTileX === 'function' ? wrapTileX(Math.floor(x / TILE_SIZE)) : Math.floor(x / TILE_SIZE);
        const tileY = typeof wrapTileY === 'function' ? wrapTileY(Math.floor(y / TILE_SIZE)) : Math.floor(y / TILE_SIZE);
        const type = Math.floor(Math.random() * 4);
        this.items.push(new TrashItem(tileX, tileY, type));
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

    triggerGoldRush(gameMap) {
        if (!gameMap) return;
        this.goldRushActive = true;
        // Retain current uncollected original items
        this.originalItems = this.items.filter(t => !t.isGold && !t.collected);

        const goldItems = [];
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const tile = gameMap.getTile(x, y);
                const isRoadOrSidewalk = (
                    tile === TileType.SIDEWALK ||
                    tile === TileType.ROAD ||
                    tile === TileType.CROSSWALK ||
                    tile === TileType.PARK_PATH ||
                    (tile >= TileType.ROAD_UP && tile <= TileType.ROAD_RIGHT)
                );
                if (isRoadOrSidewalk && gameMap.isWalkable(x, y)) {
                    const item = new TrashItem(x, y, Math.floor(Math.random() * 4));
                    item.isGold = true;
                    goldItems.push(item);
                }
            }
        }
        this.items = this.originalItems.concat(goldItems);
    }

    endGoldRush() {
        this.goldRushActive = false;
        // Remove remaining uncollected gold items, leaving only the original uncollected items
        this.items = this.items.filter(t => !t.isGold);
        this.originalItems = [];
    }

    checkPickup(entityX, entityY, pickupRadius, followerCount = 0, maxToPick = Infinity) {
        const picked = [];
        const isPriceFixing = window.game && window.game.priceFixingActive;
        const basePointValue = Math.max(1, Math.round(Math.sqrt(16 * followerCount)));
        const pointValue = isPriceFixing ? Math.round(basePointValue * 1.25) : basePointValue;
        
        for (const item of this.items) {
            if (item.collected) continue;
            if (picked.length >= maxToPick) break;

            const wrapped = nearestWrap(item.x, item.y, entityX, entityY);
            const dx = entityX - wrapped.x;
            const dy = entityY - wrapped.y;
            
            // Fast bounding box check
            if (Math.abs(dx) > pickupRadius || Math.abs(dy) > pickupRadius) continue;
            
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < pickupRadius) {
                item.collected = true;
                this.totalCollected++;
                
                let actualPoints = pointValue;
                let text = `+${pointValue}`;
                let color = '#00ff88';

                if (item.isGold) {
                    actualPoints = Math.round(pointValue * 2.5) + 10;
                    text = `+$${actualPoints} GOLD! 🏆`;
                    color = '#ffd700';
                    if (window.soundManager && typeof window.soundManager.playGoldPickupSFX === 'function') {
                        window.soundManager.playGoldPickupSFX();
                    }
                } else if (item.isIllegalDumpTrash) {
                    actualPoints += 150;
                    text = `+$${actualPoints} Clean-up!`;
                    color = '#ffd700';
                }

                this.totalPoints += actualPoints;
                picked.push(item);

                if (!item.isGold && window.soundManager) window.soundManager.playTrashPickupSFX();

                // Create pickup effect
                this.pickupEffects.push({
                    x: wrapped.x,
                    y: wrapped.y,
                    text: text,
                    timer: 0,
                    alpha: 1,
                    color: color,
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

            const drawSize = item.size;

            if (item.isGold) {
                const pulse = 1 + Math.sin(time * 6 + item.bobOffset) * 0.15;
                ctx.save();

                // Radial golden aura
                const grad = ctx.createRadialGradient(screen.x, screen.y + bobY, 2, screen.x, screen.y + bobY, 14 * pulse);
                grad.addColorStop(0, 'rgba(255, 235, 100, 0.85)');
                grad.addColorStop(0.5, 'rgba(255, 180, 0, 0.4)');
                grad.addColorStop(1, 'rgba(255, 150, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y + bobY, 14 * pulse, 0, Math.PI * 2);
                ctx.fill();

                // Draw trash sprite with golden glow filter
                ctx.filter = 'drop-shadow(0 0 6px #ffd700) brightness(1.35) sepia(1) hue-rotate(5deg) saturate(5)';
                const trashImg = spriteManager.getTrashImage(`trash${item.type + 1}`);
                if (trashImg && (trashImg.complete || trashImg instanceof HTMLCanvasElement)) {
                    ctx.drawImage(
                        trashImg,
                        screen.x - (drawSize * pulse) / 2,
                        screen.y - (drawSize * pulse) / 2 + bobY,
                        drawSize * pulse,
                        drawSize * pulse
                    );
                } else {
                    this._drawFallbackTrash(ctx, screen.x, screen.y + bobY, item.type, true);
                }
                ctx.restore();

                // Sparkle particles
                if (Math.sin(item.sparkleTimer * 2) > 0.4) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(screen.x + (Math.sin(item.sparkleTimer) * 7), screen.y + bobY - 7, 3, 3);
                    ctx.fillStyle = '#ffd700';
                    ctx.fillRect(screen.x - (Math.cos(item.sparkleTimer) * 7), screen.y + bobY + 5, 2, 2);
                }
            } else {
                // Regular trash item
                const trashImg = spriteManager.getTrashImage(`trash${item.type + 1}`);
                if (trashImg && (trashImg.complete || trashImg instanceof HTMLCanvasElement)) {
                    ctx.drawImage(
                        trashImg,
                        screen.x - drawSize / 2,
                        screen.y - drawSize / 2 + bobY,
                        drawSize,
                        drawSize
                    );
                } else {
                    this._drawFallbackTrash(ctx, screen.x, screen.y + bobY, item.type, false);
                }

                // Normal Sparkle
                if (Math.sin(item.sparkleTimer) > 0.8) {
                    ctx.fillStyle = 'rgba(255,255,200,0.8)';
                    ctx.beginPath();
                    ctx.arc(screen.x + 6, screen.y - 6 + bobY, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
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

    _drawFallbackTrash(ctx, sx, sy, type, isGold = false) {
        const colors = isGold ? ['#ffe066', '#ffd700', '#ffcc00', '#e6b800'] : ['#e8e8e8', '#dd4444', '#aaddff', '#ffdd33'];
        const size = isGold ? 12 : 10;
        ctx.fillStyle = colors[type];
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
        ctx.strokeStyle = isGold ? '#b8860b' : '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - size / 2, sy - size / 2, size, size);
    }

    getActiveCount() {
        return this.items.filter(t => !t.collected).length;
    }
}
