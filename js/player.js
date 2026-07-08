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
            this.speed = 6;
        }
        this.size = TILE_SIZE - 4;
        this.direction = 'down';
        this.moving = false;
        this.animFrame = 0;
        this.animTimer = 0;
        this.positionHistory = [];
        this.historyMaxLength = 2000;
        this.keys = { up: false, down: false, left: false, right: false, k: false };

        // Character class & Phase 1 state
        this.characterClass = spriteId; // e.g. 'char1' through 'char6'
        this.sick = false;              // Quinine auto-consumes when true
        this.fertilizers = 0;           // Scientist gets 10; does not count vs inventory slots
        this.capturedAnimals = [];      // Ranger: captured animal objects
        this.speedMultiplier = 1.0;     // Can be overridden by character class or items
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowUp': this.keys.up = true; break;
            case 'ArrowDown': this.keys.down = true; break;
            case 'ArrowLeft': this.keys.left = true; break;
            case 'ArrowRight': this.keys.right = true; break;
            case 'k': case 'K': this.keys.k = true; break;
        }
    }

    handleKeyUp(e) {
        switch (e.key) {
            case 'ArrowUp': this.keys.up = false; break;
            case 'ArrowDown': this.keys.down = false; break;
            case 'ArrowLeft': this.keys.left = false; break;
            case 'ArrowRight': this.keys.right = false; break;
            case 'k': case 'K': this.keys.k = false; break;
        }
    }

    update(gameMap, dt) {
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

            // Athlete (+10% speed) applies only when NOT driving a truck.
            // All other multipliers (Wings, etc.) apply regardless of mode.
            let effectiveMultiplier = this.speedMultiplier || 1.0;
            if (this.characterClass === 'char4' && window.playerHasTruck) {
                // Strip out only the Athlete base +10% bonus (factor 1.1); keep item bonuses.
                // We do this by dividing out 1.1 from effectiveMultiplier if it was set to 1.1
                // by the class init (no item bonuses active).
                // Safe approach: Athlete base speed is stored separately.
                effectiveMultiplier = effectiveMultiplier / (this.athleteBaseMultiplier || 1.0);
            }
            const currentSpeed = this.speed * effectiveMultiplier;
            const newX = this.x + dx * currentSpeed * 60 * dt;
            const newY = this.y + dy * currentSpeed * 60 * dt;

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
        const hs = this.size / 2 - 12; // Inset collision bounds by 12px for smooth door/corridor entry
        const corners = [
            { x: newX - hs, y: newY - hs }, { x: newX + hs, y: newY - hs },
            { x: newX - hs, y: newY + hs }, { x: newX + hs, y: newY + hs },
        ];
        const curTX = this.getTileX();
        const curTY = this.getTileY();

        const curWX = wrapTileX(this.getTileX());
        const curWY = wrapTileY(this.getTileY());
        const targetWX = wrapTileX(Math.floor(newX / TILE_SIZE));
        const targetWY = wrapTileY(Math.floor(newY / TILE_SIZE));
        
        const bldgA = gameMap.getBuildingAtTile(curWX, curWY);
        const bldgB = gameMap.getBuildingAtTile(targetWX, targetWY);
        
        if (!bldgA && bldgB) {
            // Trying to enter building B
            if (window.game && window.game.followerManager.getFollowerCount() < 6) {
                // Throttle the notification to avoid spamming every frame
                if (!this.lastEntryDenyTime || Date.now() - this.lastEntryDenyTime > 2000) {
                    window.game.hud.showFollowerNotification('You need a posse of 6+ to enter this building!', false);
                    this.lastEntryDenyTime = Date.now();
                }
                return false;
            }
        }

        // 1. Check center tile transition strictly!
        if (!gameMap.isWalkable(targetWX, targetWY, curTX, curTY, false)) {
            return false;
        }

        // 2. Check corners transition leniently!
        for (const c of corners) {
            const targetTX = Math.floor(c.x / TILE_SIZE);
            const targetTY = Math.floor(c.y / TILE_SIZE);
            if (!gameMap.isWalkable(targetTX, targetTY, curTX, curTY, true))
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
        let drawSize = this.size + 8;
        
        let imgId = this.spriteId;
        if (window.crimeMode) {
            imgId = 'black_cadillac';
            drawSize = 48; // Compact car size fitting the tiles
        } else if (window.politicsMode) {
            imgId = 'black_suv';
            drawSize = 48;
        }
        
        const img = spriteManager.getImage(imgId);

        if (img && (img.complete || img instanceof HTMLCanvasElement)) {
            let bobY = this.moving ? Math.sin(this.animTimer * 0.8) * 1.5 : 0;
            ctx.save();
            ctx.translate(screen.x, screen.y + bobY);
            
            if (window.crimeMode || window.politicsMode) {
                let angle = 0;
                if (this.direction === 'down') angle = Math.PI;
                else if (this.direction === 'left') angle = -Math.PI / 2;
                else if (this.direction === 'right') angle = Math.PI / 2;
                ctx.rotate(angle);
            } else {
                if (this.direction === 'left') {
                    ctx.scale(-1, 1);
                }
            }
            
            ctx.drawImage(img, -drawSize/2, -drawSize/2, drawSize, drawSize);
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
