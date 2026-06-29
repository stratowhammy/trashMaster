// ============================================================
// follower.js — Follower AI (follow-the-leader chain)
// ============================================================

class Follower {
    constructor(x, y, spriteId, index) {
        this.x = x;
        this.y = y;
        this.spriteId = spriteId;
        this.index = index;          // Follower number (0-based)
        this.size = TILE_SIZE - 6;
        this.direction = 'down';
        this.animFrame = 0;
        this.animTimer = 0;
        this.moving = false;

        // Position history for the next follower
        this.positionHistory = [];
        this.historyMaxLength = 2000;

        // Spacing: how far behind the leader this follower stays
        this.followDelay = 16;       // frames of movement delay behind leader
    }

    update(leaderHistory, gameMap) {
        // Follow the leader by replaying their position history with a delay
        const delayIndex = leaderHistory.length - 1 - this.followDelay;

        if (delayIndex >= 0 && delayIndex < leaderHistory.length) {
            const target = leaderHistory[delayIndex];
            const prevX = this.x;
            const prevY = this.y;

            // Check if target is inside a building
            const targetTX = Math.floor(target.x / TILE_SIZE);
            const targetTY = Math.floor(target.y / TILE_SIZE);
            if (gameMap.getBuildingAtTile(targetTX, targetTY)) {
                // If target is inside building, just freeze (stop moving)
                this.moving = false;
            } else {
                this.x = target.x;
                this.y = target.y;

                // Determine direction from movement
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

        // Update animation
        this.animTimer++;
        if (this.animTimer >= 8) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        // Record own position history for followers behind this one
        if (this.moving) {
            this.positionHistory.push({ x: this.x, y: this.y });
            if (this.positionHistory.length > this.historyMaxLength) {
                this.positionHistory.shift();
            }
        }
    }

    getTileX() {
        return Math.floor(this.x / TILE_SIZE);
    }

    getTileY() {
        return Math.floor(this.y / TILE_SIZE);
    }

    render(ctx, camera, spriteManager) {
        if (!camera.isVisible(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2)) {
            return;
        }

        const screen = camera.worldToScreen(this.x, this.y);
        const drawSize = this.size + 4;

        const img = spriteManager.getCharacterImage(this.spriteId);

        if (img && (img.complete || img instanceof HTMLCanvasElement)) {
            let bobY = 0;
            if (this.moving) {
                bobY = Math.sin(this.animTimer * 0.8) * 1.5;
            }

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
            this._drawFallback(ctx, screen.x, screen.y);
        }

        // Follower number tag
        const charConfig = SPRITE_CONFIG.characters.find(c => c.id === this.spriteId);
        const name = charConfig ? charConfig.name : `#${this.index + 1}`;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const nameY = screen.y - drawSize / 2 - 4;
        ctx.fillText(name, screen.x, nameY);
        ctx.fillStyle = '#88ccff';
        ctx.fillText(name, screen.x - 0.5, nameY - 0.5);
    }

    _drawFallback(ctx, sx, sy) {
        const s = this.size;
        const hue = (this.index * 60 + 200) % 360;
        ctx.fillStyle = `hsl(${hue}, 60%, 50%)`;
        ctx.beginPath();
        ctx.arc(sx, sy, s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `hsl(${hue}, 60%, 30%)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.index + 1, sx, sy);
    }
}

class FollowerManager {
    constructor() {
        this.followers = [];
        this.availableSprites = [];
    }

    initialize(playerSpriteId) {
        // Set available sprites (all characters except the player's choice)
        this.availableSprites = SPRITE_CONFIG.characters
            .filter(c => c.id !== playerSpriteId)
            .map(c => c.id);
    }

    addFollower(x, y) {
        const index = this.followers.length;
        const spriteId = this.availableSprites[index % this.availableSprites.length];
        const follower = new Follower(x, y, spriteId, index);
        this.followers.push(follower);
        return follower;
    }

    removeFollower() {
        if (this.followers.length > 0) {
            this.followers.pop();
        }
    }

    removeFollowerAt(index) {
        if (index >= 0 && index < this.followers.length) {
            this.followers.splice(index, 1);
            for (let i = 0; i < this.followers.length; i++) {
                this.followers[i].index = i;
            }
        }
    }

    update(player, gameMap) {
        const pb = gameMap.getBuildingAtTile(player.getTileX(), player.getTileY());
        const isPlayerInside = pb && gameMap.openDoors.has(pb.id);

        for (let i = 0; i < this.followers.length; i++) {
            const follower = this.followers[i];
            
            if (isPlayerInside) {
                const door = pb.doorTiles[0];
                if (door) {
                    const doorX = door.x * TILE_SIZE + TILE_SIZE / 2;
                    const doorY = door.y * TILE_SIZE + TILE_SIZE / 2;
                    
                    if (i === 0) {
                        const dx = doorX - follower.x;
                        const dy = doorY - follower.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 4) {
                            follower.moving = true;
                            const nx = dx / dist;
                            const ny = dy / dist;
                            follower.x += nx * 4;
                            follower.y += ny * 4;
                            if (Math.abs(dx) > Math.abs(dy)) {
                                follower.direction = dx > 0 ? 'right' : 'left';
                            } else {
                                follower.direction = dy > 0 ? 'down' : 'up';
                            }
                            
                            follower.positionHistory.push({ x: follower.x, y: follower.y });
                            if (follower.positionHistory.length > follower.historyMaxLength) {
                                follower.positionHistory.shift();
                            }
                        } else {
                            follower.moving = false;
                        }
                    } else {
                        const leaderHistory = this.followers[i - 1].positionHistory;
                        follower.update(leaderHistory, gameMap);
                    }
                }
            } else {
                let leaderHistory;
                if (i === 0) {
                    if (window.game && window.game.truckChain && window.game.truckChain.length > 0) {
                        leaderHistory = window.game.truckChain[window.game.truckChain.length - 1].positionHistory;
                    } else {
                        leaderHistory = player.positionHistory;
                    }
                } else {
                    leaderHistory = this.followers[i - 1].positionHistory;
                }
                follower.update(leaderHistory, gameMap);
            }
        }
    }

    render(ctx, camera, spriteManager) {
        // Render in reverse order so first follower appears on top
        for (let i = this.followers.length - 1; i >= 0; i--) {
            this.followers[i].render(ctx, camera, spriteManager);
        }
    }

    getFollowerCount() {
        return this.followers.length;
    }
}
