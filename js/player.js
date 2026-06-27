// ============================================================
// player.js — Player movement, collision, input handling
// ============================================================

class Player {
    constructor(tileX, tileY, spriteId) {
        this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
        this.y = tileY * TILE_SIZE + TILE_SIZE / 2;
        this.spriteId = spriteId;
        this.speed = 4;         // pixels per frame
        this.size = TILE_SIZE - 4;  // Slightly smaller than a tile for smoother collision
        this.direction = 'down';
        this.moving = false;
        this.animFrame = 0;
        this.animTimer = 0;

        // Position history for followers to replay
        this.positionHistory = [];
        this.historyMaxLength = 2000;

        // Input state
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
        };
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowUp':    case 'w': case 'W': this.keys.up = true; break;
            case 'ArrowDown':  case 's': case 'S': this.keys.down = true; break;
            case 'ArrowLeft':  case 'a': case 'A': this.keys.left = true; break;
            case 'ArrowRight': case 'd': case 'D': this.keys.right = true; break;
        }
    }

    handleKeyUp(e) {
        switch (e.key) {
            case 'ArrowUp':    case 'w': case 'W': this.keys.up = false; break;
            case 'ArrowDown':  case 's': case 'S': this.keys.down = false; break;
            case 'ArrowLeft':  case 'a': case 'A': this.keys.left = false; break;
            case 'ArrowRight': case 'd': case 'D': this.keys.right = false; break;
        }
    }

    update(gameMap) {
        let dx = 0;
        let dy = 0;

        if (this.keys.up)    dy -= 1;
        if (this.keys.down)  dy += 1;
        if (this.keys.left)  dx -= 1;
        if (this.keys.right) dx += 1;

        this.moving = dx !== 0 || dy !== 0;

        if (this.moving) {
            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                const len = Math.sqrt(dx * dx + dy * dy);
                dx /= len;
                dy /= len;
            }

            // Update direction
            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? 'right' : 'left';
            } else {
                this.direction = dy > 0 ? 'down' : 'up';
            }

            // Try to move with collision
            const newX = this.x + dx * this.speed;
            const newY = this.y + dy * this.speed;

            // Check X axis separately for wall sliding
            if (this._canMoveTo(newX, this.y, gameMap)) {
                this.x = newX;
            }
            if (this._canMoveTo(this.x, newY, gameMap)) {
                this.y = newY;
            }

            // Clamp to map bounds
            this.x = Math.max(this.size / 2, Math.min(this.x, MAP_PIXEL_W - this.size / 2));
            this.y = Math.max(this.size / 2, Math.min(this.y, MAP_PIXEL_H - this.size / 2));
        }

        // Update animation
        this.animTimer++;
        if (this.animTimer >= 8) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        // Record position history
        this.positionHistory.push({ x: this.x, y: this.y });
        if (this.positionHistory.length > this.historyMaxLength) {
            this.positionHistory.shift();
        }
    }

    _canMoveTo(newX, newY, gameMap) {
        const halfSize = this.size / 2 - 2;

        // Check four corners of the player bounding box
        const corners = [
            { x: newX - halfSize, y: newY - halfSize },
            { x: newX + halfSize, y: newY - halfSize },
            { x: newX - halfSize, y: newY + halfSize },
            { x: newX + halfSize, y: newY + halfSize },
        ];

        for (const corner of corners) {
            const tileX = Math.floor(corner.x / TILE_SIZE);
            const tileY = Math.floor(corner.y / TILE_SIZE);
            if (!gameMap.isWalkable(tileX, tileY)) {
                return false;
            }
        }
        return true;
    }

    getTileX() {
        return Math.floor(this.x / TILE_SIZE);
    }

    getTileY() {
        return Math.floor(this.y / TILE_SIZE);
    }

    render(ctx, camera, spriteManager) {
        const screen = camera.worldToScreen(this.x, this.y);
        const drawSize = this.size + 8;  // Draw slightly larger for visual appeal

        // Get sprite image
        const img = spriteManager.getCharacterImage(this.spriteId);

        if (img && (img.complete || img instanceof HTMLCanvasElement)) {
            // Draw sprite with bob animation when moving
            let bobY = 0;
            if (this.moving) {
                bobY = Math.sin(this.animTimer * 0.8) * 2;
            }

            ctx.save();
            // Flip sprite for left direction
            if (this.direction === 'left') {
                ctx.translate(screen.x, screen.y + bobY);
                ctx.scale(-1, 1);
                ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            } else {
                ctx.drawImage(img, screen.x - drawSize / 2, screen.y - drawSize / 2 + bobY, drawSize, drawSize);
            }
            ctx.restore();
        } else {
            // Fallback rendering
            this._drawFallback(ctx, screen.x, screen.y);
        }

        // Player name tag
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const nameY = screen.y - drawSize / 2 - 6;
        ctx.fillText('YOU', screen.x, nameY);
        ctx.fillStyle = '#00ff88';
        ctx.fillText('YOU', screen.x - 0.5, nameY - 0.5);
    }

    _drawFallback(ctx, sx, sy) {
        const s = this.size;
        ctx.fillStyle = '#00cc66';
        ctx.beginPath();
        ctx.arc(sx, sy, s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#004d26';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Direction indicator
        ctx.fillStyle = '#fff';
        const eyeOffset = 4;
        let ex = 0, ey = 0;
        switch (this.direction) {
            case 'up':    ey = -eyeOffset; break;
            case 'down':  ey = eyeOffset; break;
            case 'left':  ex = -eyeOffset; break;
            case 'right': ex = eyeOffset; break;
        }
        ctx.beginPath();
        ctx.arc(sx + ex - 3, sy + ey - 2, 3, 0, Math.PI * 2);
        ctx.arc(sx + ex + 3, sy + ey - 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
