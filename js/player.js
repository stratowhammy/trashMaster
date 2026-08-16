// ============================================================
// player.js — Player movement (no edge clamping, infinite world)
// ============================================================

class Player {
    constructor(tileX, tileY, spriteId) {
        this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
        this.y = tileY * TILE_SIZE + TILE_SIZE / 2;
        const chosen = window.chosenSprite || window.playerChosenSprite || spriteId || 'char2';
        this.spriteId = chosen;
        
        // Base original speeds: Athlete=8, Standard=6. Default speed is now 0.8x of baseline.
        this.rawBaselineSpeed = (chosen === 'char4') ? 8 : 6;
        this.walkSpeed = this.rawBaselineSpeed * 0.8;
        this.sprintSpeed = this.rawBaselineSpeed * 1.2;
        this.speed = this.walkSpeed;

        this.size = TILE_SIZE - 4;
        this.direction = 'down';
        this.moving = false;
        this.animFrame = 0;
        this.animTimer = 0;
        this.positionHistory = [];
        this.historyMaxLength = 2000;
        this.keys = { up: false, down: false, left: false, right: false, space: false, sprint: false, k: false };

        // Stamina & Sprint state
        this.maxStamina = 100;
        this.stamina = 100;
        this.isSprinting = false;
        this.staminaDepletionRate = 22; // ~4.5s of continuous sprinting
        this.staminaRecoveryRate = 16;   // ~6.25s to fully recover (+25% longer recovery time)

        // Jumping state
        this.isJumping = false;
        this.jumpHeight = 0;
        this.jumpVelocity = 0;

        // Character class & Phase 1 state
        this.characterClass = spriteId; // e.g. 'char1' through 'char6'
        this.sick = false;              // Quinine auto-consumes when true
        this.fertilizers = 0;           // Scientist gets 10; does not count vs inventory slots
        this.capturedAnimals = [];      // Ranger: captured animal objects
        this.speedMultiplier = 1.0;     // Can be overridden by character class or items
        this.onFoot = false;            // Pirate Mode: false when sailing in boat, true when disembarked on island
        this.dockedBoat = null;         // Pirate Mode: { x, y, direction } of anchored boat on shore
    }

    jump() {
        if (!this.isJumping && this.jumpHeight <= 0.01) {
            this.isJumping = true;
            this.jumpVelocity = 5.6; // Upward jump velocity
            if (window.soundManager && typeof window.soundManager.playJumpSFX === 'function') {
                window.soundManager.playJumpSFX();
            }
        }
    }

    handleKeyDown(e) {
        if (!e || !e.key) return;
        if (window.isKey && window.isKey(e, 'moveUp') || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = true;
        if (window.isKey && window.isKey(e, 'moveDown') || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = true;
        if (window.isKey && window.isKey(e, 'moveLeft') || e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
        if (window.isKey && window.isKey(e, 'moveRight') || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
        if ((window.isKey && window.isKey(e, 'jump')) || e.code === 'Space' || e.key === ' ') {
            this.keys.space = true;
            this.jump();
        }
        if ((window.isKey && window.isKey(e, 'sprint')) || e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            this.keys.sprint = true;
        }
    }

    handleKeyUp(e) {
        if (!e || !e.key) return;
        if (window.isKey && window.isKey(e, 'moveUp') || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = false;
        if (window.isKey && window.isKey(e, 'moveDown') || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = false;
        if (window.isKey && window.isKey(e, 'moveLeft') || e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
        if (window.isKey && window.isKey(e, 'moveRight') || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
        if ((window.isKey && window.isKey(e, 'jump')) || e.code === 'Space' || e.key === ' ') {
            this.keys.space = false;
        }
        if ((window.isKey && window.isKey(e, 'sprint')) || e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            this.keys.sprint = false;
        }
    }

    update(gameMap, dt) {
        // Vertical jump physics update
        if (this.isJumping || this.jumpHeight > 0) {
            this.jumpHeight += this.jumpVelocity * 60 * dt;
            this.jumpVelocity -= 26 * dt; // Gravity
            if (this.jumpHeight <= 0) {
                this.jumpHeight = 0;
                this.jumpVelocity = 0;
                this.isJumping = false;
            }
        }

        if (window.game && window.game.pirateModeManager && window.game.pirateModeManager.playerStunTimer > 0) {
            this.moving = false;
            return; // Immobilized by cannonball!
        }

        let dx = 0, dy = 0;

        if (window.game && window.game.engine3D && window.game.engine3D.enabled) {
            const yaw = window.game.engine3D.yaw;
            let forward = 0;
            let strafe = 0;
            if (this.keys.up) forward += 1;
            if (this.keys.down) forward -= 1;
            if (this.keys.left) strafe -= 1;
            if (this.keys.right) strafe += 1;

            if (forward !== 0 || strafe !== 0) {
                const sinY = Math.sin(yaw);
                const cosY = Math.cos(yaw);
                dx = (-sinY * forward + cosY * strafe);
                dy = (-cosY * forward - sinY * strafe);
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 0) {
                    dx /= len;
                    dy /= len;
                }
            }
        } else {
            if (this.keys.up) dy -= 1;
            if (this.keys.down) dy += 1;
            if (this.keys.left) dx -= 1;
            if (this.keys.right) dx += 1;
        }

        this.moving = dx !== 0 || dy !== 0;

        // Stamina & Sprint Logic
        const wantsSprint = this.keys.sprint && this.moving && this.stamina > 0;
        if (wantsSprint) {
            this.isSprinting = true;
            this.stamina = Math.max(0, this.stamina - this.staminaDepletionRate * dt);
            if (this.stamina <= 0) {
                this.isSprinting = false;
            }
        } else {
            this.isSprinting = false;
            if (this.stamina < this.maxStamina) {
                this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRecoveryRate * dt);
            }
        }

        // Base speed is 0.8x baseline when walking, 1.2x baseline when sprinting
        const rawBaseline = window.pirateMode ? 8.5 : ((this.spriteId === 'char4' || this.characterClass === 'char4') ? 8 : 6);
        const sprintOrWalkMultiplier = this.isSprinting ? 1.2 : 0.8;
        this.speed = rawBaseline * sprintOrWalkMultiplier;

        if (this.moving) {
            if (!window.game || !window.game.engine3D || !window.game.engine3D.enabled) {
                if (dx !== 0 && dy !== 0) { const l = Math.SQRT2; dx /= l; dy /= l; }
            }
            if (Math.abs(dx) > Math.abs(dy)) this.direction = dx > 0 ? 'right' : 'left';
            else this.direction = dy > 0 ? 'down' : 'up';

            let effectiveMultiplier = this.speedMultiplier || 1.0;
            if (this.characterClass === 'char4' && window.playerHasTruck) {
                effectiveMultiplier = effectiveMultiplier / (this.athleteBaseMultiplier || 1.0);
            }
            const currentSpeed = this.speed * effectiveMultiplier;
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
            this.onFoot = isIslandLand;

            if (!wasOnFoot && this.onFoot) {
                if (window.game && window.game.hud) {
                    window.game.hud.showFollowerNotification('⚓ DISEMBARKED ONTO ISLAND! Exploring on foot! 🏝️', true);
                }
            } else if (wasOnFoot && !this.onFoot) {
                if (window.game && window.game.hud) {
                    window.game.hud.showFollowerNotification('⛵ EMBARKED ONTO PIRATE SHIP! Sailing open waters! 🌊', true);
                }
            }
        }
    }

    _canMoveTo(newX, newY, gameMap) {
        const targetWX = wrapTileX(Math.floor(newX / TILE_SIZE));
        const targetWY = wrapTileY(Math.floor(newY / TILE_SIZE));
        if (window.pirateMode || (window.cultMode && gameMap && gameMap.islandTiles && gameMap.islandTiles.has(`${targetWX},${targetWY}`))) return true; // Completely smooth & seamless island entry/exit

        const hs = this.size / 2 - 12; // Inset collision bounds by 12px for smooth door/corridor entry
        const corners = [
            { x: newX - hs, y: newY - hs }, { x: newX + hs, y: newY - hs },
            { x: newX - hs, y: newY + hs }, { x: newX + hs, y: newY + hs },
        ];
        const curTX = this.getTileX();
        const curTY = this.getTileY();

        const curWX = wrapTileX(this.getTileX());
        const curWY = wrapTileY(this.getTileY());
        
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
        // Render docked boat on shore if player is exploring island on foot
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
        let drawSize = 64;
        const jHeight = this.jumpHeight || 0;

        // Ground shadow when in the air
        if (jHeight > 0) {
            const shadowScale = Math.max(0.3, 1 - (jHeight / 60));
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(screen.x, screen.y + 18, 16 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
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
            ctx.translate(screen.x, screen.y + bobY - jHeight);
            
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
            this._drawFallback(ctx, screen.x, screen.y - jHeight);
        }

        // Overhead Stamina Bar (Visible when sprinting or recovering)
        if (this.isSprinting || (this.stamina !== undefined && this.stamina < this.maxStamina)) {
            const barW = 48;
            const barH = 5;
            const barX = screen.x - barW / 2;
            const barY = screen.y - jHeight - drawSize / 2 - 20;
            const fillPct = Math.max(0, Math.min(1, this.stamina / this.maxStamina));

            ctx.save();
            ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

            let barColor = '#00ffcc';
            if (fillPct < 0.25) barColor = '#ff3344';
            else if (fillPct < 0.55) barColor = '#ffcc00';

            ctx.fillStyle = barColor;
            ctx.fillRect(barX, barY, barW * fillPct, barH);

            ctx.strokeStyle = this.isSprinting ? '#00ffff' : '#00aa88';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);
            ctx.restore();
        }

        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', screen.x, screen.y - jHeight - drawSize/2 - 6);
    }

    _drawFallback(ctx, sx, sy) {
        ctx.fillStyle = '#00cc66';
        ctx.beginPath(); ctx.arc(sx, sy, this.size/2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#004d26'; ctx.lineWidth = 2; ctx.stroke();
    }
}
