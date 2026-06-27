// ============================================================
// player.js — Player movement (no edge clamping, infinite world)
// ============================================================

class Player {
    constructor(tileX, tileY, spriteId) {
        this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
        this.y = tileY * TILE_SIZE + TILE_SIZE / 2;
        if (window.playerHasTruck) {
            this.spriteId = 'char_truck';
            this.speed = 8;
        } else {
            this.spriteId = spriteId;
            this.speed = 4;
        }
        this.size = TILE_SIZE - 4;
        this.direction = 'down';
        this.moving = false;
        this.animFrame = 0;
        this.animTimer = 0;
        this.positionHistory = [];
        this.historyMaxLength = 2000;
        this.keys = { up: false, down: false, left: false, right: false };
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowUp': this.keys.up = true; break;
            case 'ArrowDown': this.keys.down = true; break;
            case 'ArrowLeft': this.keys.left = true; break;
            case 'ArrowRight': this.keys.right = true; break;
        }
    }

    handleKeyUp(e) {
        switch (e.key) {
            case 'ArrowUp': this.keys.up = false; break;
            case 'ArrowDown': this.keys.down = false; break;
            case 'ArrowLeft': this.keys.left = false; break;
            case 'ArrowRight': this.keys.right = false; break;
        }
    }

    update(gameMap) {
        let dx = 0, dy = 0;
        if (this.keys.up) dy -= 1;
        if (this.keys.down) dy += 1;
        if (this.keys.left) dx -= 1;
        if (this.keys.right) dx += 1;

        this.moving = dx !== 0 || dy !== 0;

        if (this.moving) {
            if (dx !== 0 && dy !== 0) { const l = Math.SQRT2; dx /= l; dy /= l; }
            if (Math.abs(dx) > Math.abs(dy)) this.direction = dx > 0 ? 'right' : 'left';
            else this.direction = dy > 0 ? 'down' : 'up';

            const currentSpeed = this.speed * (this.speedMultiplier || 1.0);
            const newX = this.x + dx * currentSpeed;
            const newY = this.y + dy * currentSpeed;

            // Collision uses wrapping tile lookups — works for infinite world
            if (this._canMoveTo(newX, this.y, gameMap)) this.x = newX;
            if (this._canMoveTo(this.x, newY, gameMap)) this.y = newY;
            // NO edge clamping — player walks forever
        }

        this.animTimer++;
        if (this.animTimer >= 8) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }

        if (this.moving) {
            this.positionHistory.push({ x: this.x, y: this.y });
            if (this.positionHistory.length > this.historyMaxLength) this.positionHistory.shift();
        }
    }

    _canMoveTo(newX, newY, gameMap) {
        const hs = this.size / 2 - 2;
        const corners = [
            { x: newX - hs, y: newY - hs }, { x: newX + hs, y: newY - hs },
            { x: newX - hs, y: newY + hs }, { x: newX + hs, y: newY + hs },
        ];
        for (const c of corners) {
            if (!gameMap.isWalkable(Math.floor(c.x / TILE_SIZE), Math.floor(c.y / TILE_SIZE)))
                return false;
        }
        return true;
    }

    getWrappedX() { return wrapWorldX(this.x); }
    getWrappedY() { return wrapWorldY(this.y); }
    getTileX() { return wrapTileX(Math.floor(this.x / TILE_SIZE)); }
    getTileY() { return wrapTileY(Math.floor(this.y / TILE_SIZE)); }

    render(ctx, camera, spriteManager) {
        const screen = camera.worldToScreen(this.x, this.y);
        const drawSize = this.size + 8;
        const img = spriteManager.getCharacterImage(this.spriteId);

        if (img && (img.complete || img instanceof HTMLCanvasElement)) {
            let bobY = this.moving ? Math.sin(this.animTimer * 0.8) * 2 : 0;
            ctx.save();
            if (this.direction === 'left') {
                ctx.translate(screen.x, screen.y + bobY);
                ctx.scale(-1, 1);
                ctx.drawImage(img, -drawSize/2, -drawSize/2, drawSize, drawSize);
            } else {
                ctx.drawImage(img, screen.x-drawSize/2, screen.y-drawSize/2+bobY, drawSize, drawSize);
            }
            ctx.restore();
        } else {
            this._drawFallback(ctx, screen.x, screen.y);
        }

        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', screen.x, screen.y - drawSize/2 - 6);
    }

    _drawFallback(ctx, sx, sy) {
        ctx.fillStyle = '#00cc66';
        ctx.beginPath(); ctx.arc(sx, sy, this.size/2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#004d26'; ctx.lineWidth = 2; ctx.stroke();
    }
}
