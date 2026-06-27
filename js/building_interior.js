// ============================================================
// building_interior.js — Building interior system for Frenzy Mode
// ============================================================

const INTERIOR_TILE = { FLOOR: 0, WALL: 1, EXIT: 2 };

class BuildingInterior {
    constructor(width = 10, height = 10) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.trashItems = [];
        this.totalPoints = 0;
        this.totalCollected = 0;
        this.playerTileX = 0;
        this.playerTileY = 0;
        this.exitTile = { x: 0, y: 0 };
        this.trashSpawnTimer = 0;
        this.tilePixelSize = 48; // render size per interior tile
        this.pickupEffects = [];

        this.generate();
    }

    generate() {
        // Build grid: walls on edges, floor inside
        this.tiles = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    row.push(INTERIOR_TILE.WALL);
                } else {
                    row.push(INTERIOR_TILE.FLOOR);
                }
            }
            this.tiles.push(row);
        }

        // Exit at bottom center
        const exitX = Math.floor(this.width / 2);
        const exitY = this.height - 1;
        this.tiles[exitY][exitX] = INTERIOR_TILE.EXIT;
        this.exitTile = { x: exitX, y: exitY };

        // Player starts near exit
        this.playerTileX = exitX;
        this.playerTileY = exitY - 1;
    }

    update(dt) {
        this.trashSpawnTimer += dt;

        // Spawn trash every 1 second
        while (this.trashSpawnTimer >= 1) {
            this.trashSpawnTimer -= 1;
            this._spawnTrash();
        }

        // Update pickup effects
        for (let i = this.pickupEffects.length - 1; i >= 0; i--) {
            this.pickupEffects[i].timer--;
            this.pickupEffects[i].y -= 0.5;
            if (this.pickupEffects[i].timer <= 0) {
                this.pickupEffects.splice(i, 1);
            }
        }
    }

    _spawnTrash() {
        // Pick a random floor tile
        const floorTiles = [];
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.tiles[y][x] === INTERIOR_TILE.FLOOR) {
                    // Check no trash already there
                    const hasTrash = this.trashItems.some(t => !t.collected && t.tileX === x && t.tileY === y);
                    if (!hasTrash) {
                        floorTiles.push({ x, y });
                    }
                }
            }
        }

        if (floorTiles.length > 0) {
            const pos = floorTiles[Math.floor(Math.random() * floorTiles.length)];
            const typeId = Math.floor(Math.random() * 4); // 0-3
            this.trashItems.push({
                tileX: pos.x,
                tileY: pos.y,
                typeId,
                collected: false
            });
        }
    }

    movePlayer(dx, dy) {
        const newX = this.playerTileX + dx;
        const newY = this.playerTileY + dy;

        if (newX < 0 || newX >= this.width || newY < 0 || newY >= this.height) return null;

        const tile = this.tiles[newY][newX];
        if (tile === INTERIOR_TILE.WALL) return null;

        this.playerTileX = newX;
        this.playerTileY = newY;

        if (tile === INTERIOR_TILE.EXIT) {
            return 'exit';
        }
        return null;
    }

    checkPickup() {
        // Player is alone inside (followerCount = 0), so base scoring
        const pointValue = Math.round(Math.pow(2, 1 + 0.25 * 0)); // = 2
        let pickedCount = 0;

        for (const item of this.trashItems) {
            if (item.collected) continue;
            if (item.tileX === this.playerTileX && item.tileY === this.playerTileY) {
                item.collected = true;
                this.totalPoints += pointValue;
                this.totalCollected++;
                pickedCount++;

                this.pickupEffects.push({
                    x: item.tileX,
                    y: item.tileY,
                    text: `+$${pointValue}`,
                    timer: 40
                });
            }
        }
        return pickedCount;
    }

    getTrashCount() {
        return this.trashItems.filter(t => !t.collected).length;
    }

    getTotalPoints() {
        return this.totalPoints;
    }

    render(ctx, canvasWidth, canvasHeight, spriteManager) {
        const ts = this.tilePixelSize;
        const totalW = this.width * ts;
        const totalH = this.height * ts;
        const offsetX = (canvasWidth - totalW) / 2;
        const offsetY = (canvasHeight - totalH) / 2;

        // Dark backdrop
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw tiles
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const px = offsetX + x * ts;
                const py = offsetY + y * ts;
                const tile = this.tiles[y][x];

                switch (tile) {
                    case INTERIOR_TILE.WALL:
                        ctx.fillStyle = '#3a3a4a';
                        ctx.fillRect(px, py, ts, ts);
                        ctx.strokeStyle = '#2a2a3a';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(px, py, ts, ts);
                        break;
                    case INTERIOR_TILE.FLOOR:
                        ctx.fillStyle = (x + y) % 2 === 0 ? '#8b7355' : '#7a6548';
                        ctx.fillRect(px, py, ts, ts);
                        break;
                    case INTERIOR_TILE.EXIT:
                        ctx.fillStyle = '#885533';
                        ctx.fillRect(px, py, ts, ts);
                        // Door icon
                        ctx.fillStyle = '#ffcc00';
                        ctx.font = 'bold 10px "Press Start 2P", monospace';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('EXIT', px + ts / 2, py + ts / 2);
                        break;
                }
            }
        }

        // Draw trash
        const trashIds = ['trash1', 'trash2', 'trash3', 'trash4'];
        for (const item of this.trashItems) {
            if (item.collected) continue;
            const px = offsetX + item.tileX * ts + ts / 2;
            const py = offsetY + item.tileY * ts + ts / 2;
            const trashImg = spriteManager.getTrashImage(trashIds[item.typeId]);
            if (trashImg && (trashImg.complete || trashImg instanceof HTMLCanvasElement)) {
                const drawSize = ts * 0.6;
                ctx.drawImage(trashImg, px - drawSize / 2, py - drawSize / 2, drawSize, drawSize);
            } else {
                ctx.fillStyle = '#ffcc00';
                ctx.fillRect(px - 6, py - 6, 12, 12);
            }
        }

        // Draw player
        const ppx = offsetX + this.playerTileX * ts + ts / 2;
        const ppy = offsetY + this.playerTileY * ts + ts / 2;
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(ppx, ppy, ts * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#008844';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('YOU', ppx, ppy);

        // Pickup effects
        for (const fx of this.pickupEffects) {
            const fxPx = offsetX + fx.x * ts + ts / 2;
            const fxPy = offsetY + fx.y * ts;
            ctx.fillStyle = `rgba(0,255,136,${fx.timer / 40})`;
            ctx.font = 'bold 10px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(fx.text, fxPx, fxPy - (40 - fx.timer));
        }

        // HUD overlay inside building
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(10, 10, 220, 50, 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Inside Building`, 20, 30);
        ctx.fillText(`Trash: ${this.getTrashCount()} | Earned: $${this.totalPoints}`, 20, 48);

        // Exit hint
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(canvasWidth - 230, 10, 220, 30, 8);
        ctx.fill();
        ctx.fillStyle = '#ffcc00';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('Walk to EXIT to leave', canvasWidth - 20, 30);
    }
}
