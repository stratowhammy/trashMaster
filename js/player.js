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
        this.onFoot = false;            // Pirate Mode: false when sailing in boat, true when disembarked on island
        this.dockedBoat = null;         // Pirate Mode: { x, y, direction } of anchored boat on shore
    }

    handleKeyDown(e) {
        let key = e.key;
        if (window.chaosMode && window.chaosLevel >= 5) {
            if (key === 'ArrowUp') key = 'ArrowDown';
            else if (key === 'ArrowDown') key = 'ArrowUp';
            else if (key === 'ArrowLeft') key = 'ArrowRight';
            else if (key === 'ArrowRight') key = 'ArrowLeft';
        }
        switch (key) {
            case 'ArrowUp': this.keys.up = true; break;
            case 'ArrowDown': this.keys.down = true; break;
            case 'ArrowLeft': this.keys.left = true; break;
            case 'ArrowRight': this.keys.right = true; break;
            case 'k': case 'K': this.keys.k = true; break;
        }
    }

    handleKeyUp(e) {
        let key = e.key;
        if (window.chaosMode && window.chaosLevel >= 5) {
            if (key === 'ArrowUp') key = 'ArrowDown';
            else if (key === 'ArrowDown') key = 'ArrowUp';
            else if (key === 'ArrowLeft') key = 'ArrowRight';
            else if (key === 'ArrowRight') key = 'ArrowLeft';
        }
        switch (key) {
            case 'ArrowUp': this.keys.up = false; break;
            case 'ArrowDown': this.keys.down = false; break;
            case 'ArrowLeft': this.keys.left = false; break;
            case 'ArrowRight': this.keys.right = false; break;
            case 'k': case 'K': this.keys.k = false; break;
        }
    }

    update(gameMap, dt) {
        if (window.game && window.game.pirateModeManager && window.game.pirateModeManager.playerStunTimer > 0) {
            this.moving = false;
            return; // Immobilized by cannonball!
        }

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

            let effectiveMultiplier = this.speedMultiplier || 1.0;
            if (this.characterClass === 'char4' && window.playerHasTruck) {
                effectiveMultiplier = effectiveMultiplier / (this.athleteBaseMultiplier || 1.0);
            }
            const currentSpeed = (window.pirateMode ? 8.5 : this.speed) * effectiveMultiplier;
            let newX = this.x + dx * currentSpeed * 60 * dt;
            let newY = this.y + dy * currentSpeed * 60 * dt;

            if (window.pirateMode) {
                // Left and right ocean boundaries
                newX = Math.max(32, Math.min(MAP_PIXEL_W - 32, newX));
                // Top Giant Ice Wall boundary (y <= 32 blocked!)
                newY = Math.max(32, newY);

                // Bottom edge: Sail off the edge of the Earth!
                if (this.y + dy * currentSpeed * 60 * dt >= MAP_PIXEL_H + 30) {
                    this.y = MAP_PIXEL_H + 40;
                    if (window.game && window.game.pirateModeManager) {
                        window.game.pirateModeManager.triggerSailedOffEarth(window.game);
                    }
                    return;
                }
            }

            newX = Math.max(16, Math.min(MAP_PIXEL_W - 16, newX));
            newY = Math.max(16, Math.min(MAP_PIXEL_H - 16, newY));

            if (this._canMoveTo(newX, this.y, gameMap)) this.x = newX;
            if (this._canMoveTo(this.x, newY, gameMap)) this.y = newY;
        }

        this.animTimer++;
        if (this.animTimer >= 8) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }

        if (this.moving) {
            this.positionHistory.push({ x: this.x, y: this.y });
            if (this.positionHistory.length > this.historyMaxLength) this.positionHistory.shift();
        }

        if (window.pirateMode && gameMap) {
            const curTX = this.getTileX();
            const curTY = this.getTileY();
            const curTile = gameMap.getTile(curTX, curTY);

            const wasOnFoot = this.onFoot;
            const isIslandLand = (curTile === TileType.SIDEWALK || curTile === TileType.BUILDING || curTile === TileType.BUILDING_DOOR);
            if (isIslandLand && !wasOnFoot) {
                this.onFoot = true;
                if (window.game && window.game.hud) {
                    window.game.hud.showFollowerNotification('⚓ DISEMBARKED ONTO ISLAND! Exploring on foot! 🏝️', true);
                }
            } else if (!isIslandLand && wasOnFoot) {
                this.onFoot = false;
                if (window.game && window.game.hud) {
                    window.game.hud.showFollowerNotification('⛵ EMBARKED ONTO PIRATE SHIP! Sailing open waters! 🌊', true);
                }
            }
        }
    }

    _canMoveTo(newX, newY, gameMap) {
        if (!gameMap) return true;
        if (window.pirateMode) return true;

        const hs = this.size / 2 - 4;
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
            if (window.game && window.game.followerManager.getFollowerCount() < 6) {
                if (!this.lastEntryDenyTime || Date.now() - this.lastEntryDenyTime > 2000) {
                    window.game.hud.showFollowerNotification('You need a posse of 6+ to enter this building!', false);
                    this.lastEntryDenyTime = Date.now();
                }
                return false;
            }
        }

        if (!gameMap.isWalkable(targetWX, targetWY, curTX, curTY, false)) {
            return false;
        }

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
        if (window.pirateMode && this.onFoot && this.dockedBoat) {
            const bScreen = camera.worldToScreen(this.dockedBoat.x, this.dockedBoat.y);
            const boatImg = spriteManager.getImage('pirate_ship_blue') || spriteManager.getImage('pirate_ship');
            if (boatImg && (boatImg.complete || boatImg instanceof HTMLCanvasElement)) {
                ctx.save();
                ctx.translate(bScreen.x, bScreen.y);
                if (this.dockedBoat.direction === 'left') ctx.scale(-1, 1);
                ctx.drawImage(boatImg, -32, -32, 64, 64);
                ctx.restore();
            }
            ctx.fillStyle = '#ffea00';
            ctx.font = 'bold 8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('⚓ DOCKED BOAT', bScreen.x, bScreen.y - 36);
        }

        const screen = camera.worldToScreen(this.x, this.y);
        let drawSize = Math.round(TILE_SIZE * 0.8);
        
        if (this.direction === 'left') {
            this.lastFacingDir = 'left';
        } else if (this.direction === 'right') {
            this.lastFacingDir = 'right';
        }

        let imgId = this.spriteId;
        if (window.duckyModeActive) {
            imgId = (this.direction === 'left' || this.lastFacingDir === 'left') ? 'ducky_left' : 'ducky_right';
        } else if (window.pirateMode) {
            imgId = this.onFoot ? (this.spriteId || 'char1') : 'pirate_ship_blue';
        } else if (window.crimeMode) {
            imgId = 'black_cadillac';
        } else if (window.politicsMode) {
            imgId = 'black_suv';
        }
        
        const img = (window.duckyModeActive || (window.pirateMode && this.onFoot)) ? spriteManager.getCharacterImage(imgId) : spriteManager.getImage(imgId);

        if (img && (img.complete || img instanceof HTMLCanvasElement)) {
            let bobY = this.moving ? Math.sin(this.animTimer * 0.8) * 1.5 : 0;
            ctx.save();
            ctx.translate(screen.x, screen.y + bobY);
            
            if (window.duckyModeActive) {
                // ducky_left and ducky_right pre-oriented
            } else if (window.pirateMode) {
                if (this.direction === 'left') {
                    ctx.scale(-1, 1);
                }
            } else if (window.crimeMode || window.politicsMode) {
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
