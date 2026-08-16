// ============================================================
// hud.js — HUD: timer bar, score, follower count
// ============================================================

class HUD {
    constructor() {
        this.gameDuration = (window.chaosMode && window.chaosTimeLimit) ? window.chaosTimeLimit : 120;
        this.timeRemaining = this.gameDuration;
        this.timerSpeed = 1.0;
        this.score = 0;
        this.followerCount = 0;
        this.nextFollowerAt = 10;

        // Score pop animation
        this.scorePop = 0;
        this.lastScore = 0;

        // New follower notification
        this.followerNotification = '';
        this.followerNotificationTimer = 0;
        this.roundMessages = [];
        this.medicationBtnBounds = null;
    }

    reset() {
        this.gameDuration = (window.chaosMode && window.chaosTimeLimit) ? window.chaosTimeLimit : 120;
        this.timeRemaining = this.gameDuration;
        this.timerSpeed = 1.0;
        this.score = 0;
        this.followerCount = 0;
        this.nextFollowerAt = 10;
        this.scorePop = 0;
        this.lastScore = 0;
        this.followerNotification = '';
        this.followerNotificationTimer = 0;
        this.followerNotificationPositive = true;
        this.evalTimer = 10;
        this.trashInWindow = 0;
        this.isHighScore = false;
        this.leaderboard = [];
        this.roundMessages = [];
        this.medicationBtnBounds = null;
    }

    updateScore(newScore) {
        if (newScore > this.score) {
            this.scorePop = 1;
        }
        this.score = newScore;
    }

    showFollowerNotification(text, isPositive = true) {
        this.followerNotification = text;
        this.followerNotificationTimer = 180; // ~3 seconds
        this.followerNotificationPositive = isPositive;

        this.roundMessages = this.roundMessages || [];
        const lastMsg = this.roundMessages[this.roundMessages.length - 1];
        if (!lastMsg || lastMsg.text !== text || (Date.now() - (lastMsg.timeMs || 0)) > 800) {
            this.roundMessages.push({
                text: text,
                isPositive: isPositive,
                timeRemaining: Math.ceil(this.timeRemaining),
                timeMs: Date.now()
            });
        }
    }

    update(deltaTime) {
        this.timeRemaining -= deltaTime * this.timerSpeed;
        if (this.timeRemaining < 0) this.timeRemaining = 0;

        // Animate score pop
        if (this.scorePop > 0) {
            this.scorePop -= 0.05;
            if (this.scorePop < 0) this.scorePop = 0;
        }

        // Follower notification timer
        if (this.followerNotificationTimer > 0) {
            this.followerNotificationTimer--;
        }
    }

    isTimeUp() {
        return this.timeRemaining <= 0;
    }

    getTimeString() {
        const mins = Math.floor(this.timeRemaining / 60);
        const secs = Math.floor(this.timeRemaining % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    render(ctx, canvasWidth, canvasHeight) {
        // ── Timer Display (top-right) ──
        const timerX = canvasWidth - 20;
        const timerY = 20;
        
        let boxHeight = 60;
        let susTimer = 0;
        let hTimer = 0;
        if (window.fastFoodMode && window.game) {
            hTimer = Math.ceil(window.game.hungerTimer || 0);
            susTimer = Math.ceil(window.game.fastFoodSuspensionTimer || 0);
            boxHeight = susTimer > 0 ? 70 : 60;
        }
        
        ctx.fillStyle = 'rgba(10,15,25,0.75)';
        ctx.beginPath();
        ctx.roundRect(timerX - 140, timerY - 10, 150, boxHeight, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,200,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(timerX - 140, timerY - 10, 150, boxHeight, 8);
        ctx.stroke();

        ctx.fillStyle = '#ff4444';
        ctx.font = '16px serif';
        ctx.textAlign = 'left';
        ctx.fillText('⏱️', timerX - 130, timerY + 12);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(Math.ceil(this.timeRemaining).toString() + 's', timerX - 10, timerY + 12);
        
        ctx.fillStyle = '#888';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText('TIMER', timerX - 10, timerY + 32);
        
        if (window.fastFoodMode && window.game) {
            if (susTimer > 0) {
                ctx.fillStyle = '#00ff88';
                ctx.fillText(`No Trash Req: ${susTimer}s`, timerX - 10, timerY + 45);
            }
        }
        
        if (window.flowersMode) {
            const fert = (window.playerInventory && window.playerInventory['Fertilizer']) || 0;
            ctx.fillStyle = '#ff66b2';
            ctx.fillText(`Fertilizer: ${fert}`, timerX - 10, timerY + (window.fastFoodMode && susTimer > 0 ? 55 : 45));
        }

        // ── Messages Icon Button (Directly Under Timer) ──
        const msgBtnX = timerX - 140;
        const msgBtnY = timerY - 10 + boxHeight + 6;
        const msgBtnW = 150;
        const msgBtnH = 30;

        this.messagesBtnBounds = { x: msgBtnX, y: msgBtnY, width: msgBtnW, height: msgBtnH };

        ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
        ctx.beginPath();
        ctx.roundRect(msgBtnX, msgBtnY, msgBtnW, msgBtnH, 6);
        ctx.fill();
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(msgBtnX, msgBtnY, msgBtnW, msgBtnH, 6);
        ctx.stroke();

        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const msgCount = (this.roundMessages || []).length;
        ctx.fillText(`💬 MESSAGES (${msgCount})`, msgBtnX + msgBtnW / 2, msgBtnY + 19);

        // ── Score Display (to the left of Timer) ──
        const scoreX = canvasWidth - 160;
        const scoreY = 20;

        // Score panel
        ctx.fillStyle = 'rgba(10,15,25,0.75)';
        ctx.beginPath();
        ctx.roundRect(scoreX - 170, scoreY - 10, 180, 60, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,200,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(scoreX - 170, scoreY - 10, 180, 60, 8);
        ctx.stroke();

        // Trash icon
        ctx.fillStyle = '#ff8844';
        ctx.font = '16px serif';
        ctx.textAlign = 'left';
        ctx.fillText('🗑️', scoreX - 160, scoreY + 10);

        // Score number with pop animation
        const popScale = 1 + this.scorePop * 0.3;
        ctx.save();
        ctx.translate(scoreX - 80, scoreY + 8);
        ctx.scale(popScale, popScale);
        ctx.fillStyle = this.scorePop > 0 ? '#00ff88' : '#fff';
        ctx.font = 'bold 16px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('$' + this.score.toString(), 0, 0);
        ctx.restore();

        // Next follower progress
        const evalTime = Math.ceil(this.evalTimer || 0);
        ctx.fillStyle = '#888';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Next eval: ${evalTime}s`, scoreX - 5, scoreY + 28);
        
        ctx.fillStyle = (this.trashInWindow >= 7) ? '#0f8' : (this.trashInWindow >= 5 ? '#ffcc00' : '#f44');
        ctx.fillText(`Trash: ${this.trashInWindow || 0}/7`, scoreX - 5, scoreY + 40);

        // ── Player Avatar & Posse Card (top-left) ──
        const pCardX = 20;
        const pCardY = 20;
        const pCardW = 210;
        const pCardH = 46;

        this.profileBtnBounds = { x: pCardX - 10, y: pCardY - 10, width: pCardW, height: pCardH };

        ctx.fillStyle = 'rgba(10,15,25,0.85)';
        ctx.beginPath();
        ctx.roundRect(pCardX - 10, pCardY - 10, pCardW, pCardH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,255,204,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(pCardX - 10, pCardY - 10, pCardW, pCardH, 8);
        ctx.stroke();

        // Draw Avatar Sticker image
        if (!this.avatarImg || this.avatarSrc !== (window.currentUserAvatar || 'ducky_sticker.png')) {
            this.avatarSrc = window.currentUserAvatar || 'ducky_sticker.png';
            this.avatarImg = new Image();
            this.avatarImg.src = `assets/stickers/${this.avatarSrc}`;
        }

        if (this.avatarImg.complete && this.avatarImg.naturalWidth > 0) {
            ctx.drawImage(this.avatarImg, pCardX - 4, pCardY - 4, 34, 34);
        } else {
            ctx.fillStyle = '#00ffcc';
            ctx.font = '16px serif';
            ctx.fillText('👤', pCardX - 4, pCardY + 20);
        }

        const currentName = window.currentUsername || 'Player';
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 8px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(currentName.slice(0, 10), pCardX + 36, pCardY + 10);

        const curLids = (window.playerLids !== undefined ? window.playerLids : ((window.playerInventory && window.playerInventory['Lids']) || 0));
        ctx.fillStyle = '#00ffcc';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText(`🥫 ${curLids}`, pCardX + 125, pCardY + 10);

        ctx.fillStyle = '#f59e0b';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText(`Posse: ${this.followerCount}`, pCardX + 36, pCardY + 26);

        ctx.fillStyle = '#64748b';
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillText('[TAB] Match', pCardX + 125, pCardY + 26);

        // ── Map GPS Coordinates Box (top-left, below Player Card) ──
        if (window.game && window.game.gameMap) {
            const gpsX = pCardX - 10;
            const gpsY = pCardY + pCardH + 4;
            const gpsW = pCardW;
            const gpsH = 34;

            ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(gpsX, gpsY, gpsW, gpsH, 6);
            else ctx.rect(gpsX, gpsY, gpsW, gpsH);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 255, 204, 0.3)';
            ctx.lineWidth = 1;
            if (ctx.roundRect) ctx.roundRect(gpsX, gpsY, gpsW, gpsH, 6);
            else ctx.strokeRect(gpsX, gpsY, gpsW, gpsH);
            ctx.stroke();

            const getBldgCoords = (type) => {
                if (!window.game || !window.game.gameMap || !window.game.gameMap.buildings) return '??,??';
                const b = window.game.gameMap.buildings.find(bldg => {
                    if (!bldg || !bldg.type) return false;
                    const bt = bldg.type.toLowerCase();
                    if (type === 'pulp_mill') return bt === 'pulp_mill' || bt === 'pulp mill';
                    if (type === 'goose') return bt === 'goose' || bt === 'fast_food';
                    if (type === 'zippy_ds') return bt === 'zippy_ds' || bt === 'zippy ds';
                    if (type === 'chinos_steaks') return bt === 'chinos_steaks' || bt === 'chinos';
                    if (type === 'rats_steaks') return bt === 'rats_steaks' || bt === 'rats';
                    return bt === type;
                });
                if (!b) return '??,??';
                let tx = 0, ty = 0;
                if (b.doorTiles && b.doorTiles.length > 0) {
                    tx = b.doorTiles[0].x;
                    ty = b.doorTiles[0].y;
                } else if (b.tiles && b.tiles.length > 0) {
                    tx = b.tiles[0].x;
                    ty = b.tiles[0].y;
                } else {
                    tx = Math.floor(b.x / TILE_SIZE);
                    ty = Math.floor(b.y / TILE_SIZE);
                }
                return `${wrapTileX(tx)},${wrapTileY(ty)}`;
            };

            const playerTX = window.game.player ? wrapTileX(Math.floor(window.game.player.x / TILE_SIZE)) : 0;
            const playerTY = window.game.player ? wrapTileY(Math.floor(window.game.player.y / TILE_SIZE)) : 0;
            const dumpCoord = getBldgCoords('dump');
            const hospCoord = getBldgCoords('hospital');
            const airpCoord = getBldgCoords('airport');
            const pulpCoord = getBldgCoords('pulp_mill');

            ctx.textAlign = 'left';
            ctx.fillStyle = '#00ffcc';
            ctx.font = '6px "Press Start 2P", monospace';
            ctx.fillText(`📍 YOU: (${playerTX}, ${playerTY})`, gpsX + 6, gpsY + 11);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '5.5px "Press Start 2P", monospace';
            ctx.fillText(`🗑️DUMP:${dumpCoord}  🏥HOSP:${hospCoord}`, gpsX + 6, gpsY + 22);
            ctx.fillText(`✈️AIRP:${airpCoord}  🪵PULP:${pulpCoord}`, gpsX + 6, gpsY + 31);
        }

        // ── Politics/El Presidente Mode Votes Display (top-left, below Player Card) ──
        if ((window.politicsMode || window.elPresidenteElection) && window.game) {
            const pvX = 20;
            const pvY = 76;
            ctx.fillStyle = 'rgba(10,15,25,0.75)';
            ctx.beginPath();
            ctx.roundRect(pvX - 10, pvY - 10, 220, 40, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,255,200,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(pvX - 10, pvY - 10, 220, 40, 8);
            ctx.stroke();

            ctx.fillStyle = '#ff8844';
            ctx.font = '16px serif';
            ctx.textAlign = 'left';
            ctx.fillText(window.elPresidenteElection ? '😡' : '🤝', pvX, pvY + 12);
            
            const playerVotes = window.game.handshakesShaken || 0;
            const rivalVotes = (window.game.rivalCandidate && window.game.rivalCandidate.votes) || 0;

            ctx.fillStyle = '#00ffcc';
            ctx.font = 'bold 8px "Press Start 2P", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(window.elPresidenteElection ? `You:${playerVotes} VS Rival:${rivalVotes} (Intimidate)` : `You:${playerVotes} VS Rival:${rivalVotes}`, pvX + 28, pvY + 12);
        }

        // ── Builder Mode: Vacancies panel (top-left, below posse/politics) ──
        if (window.builderMode && window.game) {
            const vacX = 20;
            const ownedCount = (window.game.ownedBuildings || []).length;
            const vacancies = window.game.totalVacancies || 0;
            const bvY = (window.politicsMode || window.elPresidenteElection) ? 126 : 76;
            ctx.fillStyle = 'rgba(10,15,25,0.75)';
            ctx.beginPath();
            ctx.roundRect(vacX - 10, bvY - 10, 230, 40, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(100,220,100,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(vacX - 10, bvY - 10, 230, 40, 8);
            ctx.stroke();
            ctx.fillStyle = '#88ff88';
            ctx.font = '16px serif';
            ctx.textAlign = 'left';
            ctx.fillText('🏢', vacX, bvY + 12);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 8px "Press Start 2P", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`Buildings: ${ownedCount}  Vac: ${vacancies}`, vacX + 28, bvY + 12);
        }

        // ── Follower Notification ──
        if (this.followerNotificationTimer > 0) {
            const notifAlpha = Math.min(1, this.followerNotificationTimer / 30);
            const notifY = 80;
            const notifScale = this.followerNotificationTimer > 150 ?
                1 + (180 - this.followerNotificationTimer) * 0.01 : 1;

            ctx.save();
            ctx.globalAlpha = notifAlpha;
            ctx.translate(canvasWidth / 2, notifY);
            ctx.scale(notifScale, notifScale);

            // Background
            ctx.fillStyle = this.followerNotificationPositive ? 'rgba(0,50,100,0.85)' : 'rgba(100,20,20,0.85)';
            const tw = ctx.measureText(this.followerNotification).width + 40;
            ctx.beginPath();
            ctx.roundRect(-tw / 2 - 10, -18, tw + 20, 40, 10);
            ctx.fill();
            ctx.strokeStyle = this.followerNotificationPositive ? '#0af' : '#f44';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-tw / 2 - 10, -18, tw + 20, 40, 10);
            ctx.stroke();

            ctx.fillStyle = this.followerNotificationPositive ? '#0f8' : '#f44';
            ctx.font = 'bold 12px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.followerNotification, 0, 2);

            ctx.restore();
        }

        // ── Controls hint (bottom-right) ──
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('WASD / Arrow Keys to move', canvasWidth - 16, canvasHeight - 16);

        // ── Render Status and Timer Bars (Happiness, Hunger, Animals, Buffs, etc.) ──
        this.renderStatusAndTimerBars(ctx, canvasWidth, canvasHeight, 0, false);

        // ── On-Screen Inventory UI (Middle Right) ──
        this.renderInventoryUI(ctx, canvasWidth, canvasHeight);
    }

    renderStatusAndTimerBars(ctx, canvasWidth, canvasHeight, bottomOffset = 0, is3D = false) {
        let nextBarY = canvasHeight - 24 - bottomOffset;
        const game = window.game;
        if (!game) return;

        // 0. Stamina Bar (Appears when sprinting or when depleted/recovering)
        if (game.player && (game.player.isSprinting || (game.player.stamina !== undefined && game.player.stamina < game.player.maxStamina))) {
            const stamina = Math.max(0, Math.min(game.player.maxStamina || 100, game.player.stamina));
            const fillPct = stamina / (game.player.maxStamina || 100);

            const barW = Math.min(420, canvasWidth * 0.52);
            const barH = 16;
            const barX = canvasWidth / 2 - barW / 2;
            const barY = nextBarY;
            nextBarY -= 22;

            ctx.save();
            ctx.fillStyle = 'rgba(10, 20, 30, 0.88)';
            ctx.fillRect(barX, barY, barW, barH);

            let stamColor = '#00ffcc'; // Vibrant Cyan / Electric Green
            if (fillPct < 0.25) stamColor = '#ff3344'; // Red when critical
            else if (fillPct < 0.55) stamColor = '#ffcc00'; // Yellow when medium

            ctx.fillStyle = stamColor;
            ctx.fillRect(barX, barY, barW * fillPct, barH);

            ctx.strokeStyle = game.player.isSprinting ? '#00ffff' : '#00aa88';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(barX, barY, barW, barH);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const statusText = game.player.isSprinting ? '⚡ SPRINTING (1.2x)' : '⚡ RECOVERING...';
            ctx.fillText(`${statusText} ${Math.round(fillPct * 100)}%`, canvasWidth / 2, barY + barH / 2 + 1);
            ctx.restore();
        }

        // 1. Animal Capacity Bar (Ranger char1 mode)
        if (game.player && game.player.characterClass === 'char1') {
            const animalCount = (game.player.capturedAnimals || []).length;
            const hasTruck = !!(window.playerHasTruck);
            const maxAnimals = hasTruck ? 10 : 1;
            const fillPct = Math.max(0, Math.min(1, animalCount / Math.max(1, maxAnimals)));

            const barW = Math.min(420, canvasWidth * 0.52);
            const barH = 16;
            const barX = canvasWidth / 2 - barW / 2;
            const barY = nextBarY;
            nextBarY -= 22;

            ctx.save();
            ctx.fillStyle = 'rgba(10, 40, 20, 0.85)';
            ctx.fillRect(barX, barY, barW, barH);

            const fillColor = fillPct > 0.7 ? '#ffaa00' : '#44dd88';
            ctx.fillStyle = fillColor;
            ctx.fillRect(barX, barY, barW * fillPct, barH);

            ctx.strokeStyle = '#44dd88';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(barX, barY, barW, barH);

            ctx.fillStyle = '#ffffff';
            ctx.font = '7.5px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const capacityReduction = animalCount * 10;
            ctx.fillText(`🦁 ANIMALS: ${animalCount} | CARGO -${capacityReduction}`, barX + barW / 2, barY + barH / 2 + 1);
            ctx.restore();
        }

        // 2. Trash / Hold Capacity Bar (2D Mode Only - 3D has it in Doom Status Bar)
        if (!is3D) {
            const currentTrash = game.trashCollectedInTruck || 0;
            const animalPenalty = game.player ? (game.player.capturedAnimals || []).length * 10 : 0;
            const trucks = Math.max(0, window.playerHasTruck || 0);
            const totalCap = window.pirateMode ? 100 : Math.max(0, 100 + (trucks * 200) - animalPenalty);
            const treesCarried = game.treesCarried || 0;
            const treeUnits = treesCarried * 100;
            const trashUnits = currentTrash;
            const usedCap = treeUnits + trashUnits;

            const barW = Math.min(420, canvasWidth * 0.52);
            const barH = 16;
            const barX = canvasWidth / 2 - barW / 2;
            const barY = nextBarY;
            nextBarY -= 22;

            ctx.save();
            ctx.fillStyle = 'rgba(50, 30, 10, 0.75)';
            ctx.fillRect(barX, barY, barW, barH);

            if (totalCap > 0) {
                const greenPct = Math.min(1, treeUnits / totalCap);
                const greenW = barW * greenPct;
                if (greenW > 0) {
                    ctx.fillStyle = '#2e8b57';
                    ctx.fillRect(barX, barY, greenW, barH);
                }

                const trashPct = Math.min(1 - greenPct, trashUnits / totalCap);
                const brownW = barW * trashPct;
                if (brownW > 0) {
                    ctx.fillStyle = '#8b5a2b';
                    ctx.fillRect(barX + greenW, barY, brownW, barH);
                }
            }

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(barX, barY, barW, barH);

            ctx.fillStyle = '#ffffff';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const labelStr = trucks > 0 ? `TRUCK: ${usedCap}/${totalCap}` : `TRASH: ${usedCap}/${totalCap}`;
            ctx.fillText(labelStr, barX + barW / 2, barY + barH / 2 + 1);
            ctx.restore();
        }

        // 3. Hunger Timer Bar (Fast Food Mode)
        if (window.fastFoodMode) {
            const hTimer = Math.max(0, game.hungerTimer || 0);
            const maxHunger = 45.0;
            const fillPct = Math.max(0, Math.min(1, hTimer / maxHunger));

            const barW = Math.min(420, canvasWidth * 0.52);
            const barH = 16;
            const barX = canvasWidth / 2 - barW / 2;
            const barY = nextBarY;
            nextBarY -= 22;

            ctx.save();
            ctx.fillStyle = 'rgba(10, 15, 25, 0.88)';
            ctx.fillRect(barX, barY, barW, barH);

            let fillColor = '#00ff88';
            if (fillPct < 0.25) fillColor = '#ff2244';
            else if (fillPct < 0.5) fillColor = '#ffaa00';

            ctx.fillStyle = fillColor;
            ctx.fillRect(barX, barY, barW * fillPct, barH);

            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(barX, barY, barW, barH);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let hungerLabel = `🍔 HUNGER ${Math.ceil(hTimer)}s (${Math.round(fillPct * 100)}%)`;
            if (game.fastFoodSuspensionTimer > 0) {
                hungerLabel = `🚫 SUSPENDED: ${Math.ceil(game.fastFoodSuspensionTimer)}s`;
            }
            ctx.fillText(hungerLabel, canvasWidth / 2, barY + barH / 2 + 1);
            ctx.restore();
        }

        // 4. Happiness Bar (Cult Mode)
        if (window.cultMode) {
            const happiness = Math.max(0, Math.min(100, game.happiness !== undefined ? game.happiness : 100));
            const fillPct = happiness / 100;

            const barW = Math.min(420, canvasWidth * 0.52);
            const barH = 16;
            const barX = canvasWidth / 2 - barW / 2;
            const barY = nextBarY;
            nextBarY -= 22;

            ctx.save();
            ctx.fillStyle = 'rgba(20, 5, 40, 0.88)';
            ctx.fillRect(barX, barY, barW, barH);

            let hapColor = '#cc44ff';
            if (fillPct < 0.25) hapColor = '#ff2244';
            else if (fillPct < 0.5) hapColor = '#ff66aa';
            ctx.fillStyle = hapColor;
            ctx.fillRect(barX, barY, barW * fillPct, barH);

            ctx.strokeStyle = '#cc66ff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(barX, barY, barW, barH);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let label = `❤️ HAPPINESS ${Math.round(happiness)}%`;
            if (game.cultHappinessBufferTimer > 0) {
                label = `DIGESTING... +${game.pendingHappinessBoost}% IN ${Math.ceil(game.cultHappinessBufferTimer)}s`;
            }
            ctx.fillText(label, canvasWidth / 2, barY + barH / 2 + 1);
            ctx.restore();
        }

        // 5. Active Powerups, Buffs & Status Timers Bar
        const activeBuffs = [];
        if (game.wingsTimer > 0) activeBuffs.push(`🪽 WINGS: ${Math.ceil(game.wingsTimer)}s`);
        if (game.protectionTimer > 0) activeBuffs.push(`🛡️ PROTECTION: ${Math.ceil(game.protectionTimer)}s`);
        if (game.shroomTimer > 0) activeBuffs.push(`🍄 SLOW TIME: ${Math.ceil(game.shroomTimer)}s`);
        if (game.poisonPoliceChaseTimer > 0) activeBuffs.push(`🚨 RAID CHASE: ${Math.ceil(game.poisonPoliceChaseTimer)}s`);
        if (game.isSick) activeBuffs.push(`🤢 SICK (Find Quinine/Hospital)`);

        if (activeBuffs.length > 0) {
            const barW = Math.min(420, canvasWidth * 0.52);
            const barH = 14;
            const barX = canvasWidth / 2 - barW / 2;
            const barY = nextBarY;
            nextBarY -= 20;

            ctx.save();
            ctx.fillStyle = 'rgba(8, 16, 32, 0.88)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(barX, barY, barW, barH);

            ctx.fillStyle = '#00ffcc';
            ctx.font = '7px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(activeBuffs.join('  |  '), canvasWidth / 2, barY + barH / 2 + 1);
            ctx.restore();
        }
    }

    renderInventoryUI(ctx, canvasWidth, canvasHeight) {
        if (!window.game || window.game.state !== GameState.PLAYING) return;
        const inv = window.playerInventory || {};
        const items = [
            { name: 'Wings', icon: '🪽', count: inv['Wings'] || 0 },
            { name: 'Shrooms', icon: '🍄', count: inv['Shrooms'] || inv['Mushrooms'] || 0 },
            { name: 'Paper', icon: '📄', count: inv['Paper'] || 0 },
            { name: 'Cannonballs', icon: '💣', count: inv['Cannonballs'] !== undefined ? inv['Cannonballs'] : 20 },
            { name: 'Portal Gun', icon: '🌀', count: inv['Portal Gun'] || 0 },
            { name: 'Trash Bomb', icon: '💥', count: inv['Trash Bomb'] || 0 },
            { name: 'Bottomless Pit', icon: '🕳️', count: inv['Bottomless Pit'] || 0 },
            { name: 'Flashlight', icon: '🔦', count: inv['Flashlight'] || 0 },
            { name: 'Borrowed Time', icon: '⏳', count: inv['Borrowed Time'] || 0 },
            { name: 'Snacks', icon: '🍿', count: inv['Snacks'] || 0 }
        ];

        if (window.flowersMode) {
            items.push({ name: 'Fertilizer', icon: '🌸', count: inv['Fertilizer'] || 0 });
        }
        items.push({ name: 'Quinine', icon: '💊', count: inv['Quinine'] || 0 });

        const rowH = 18;
        const boxW = 160;
        const boxH = 28 + items.length * rowH;
        const boxX = canvasWidth - boxW - 15;
        const boxY = Math.max(80, canvasHeight / 2 - boxH / 2);

        ctx.save();
        // Background Panel
        ctx.fillStyle = 'rgba(12, 18, 34, 0.85)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Header Title
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 8px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('📦 INVENTORY', boxX + 10, boxY + 8);

        // Separator Line
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(boxX + 8, boxY + 20);
        ctx.lineTo(boxX + boxW - 8, boxY + 20);
        ctx.stroke();

        // Items List
        ctx.font = '7px "Press Start 2P", monospace';
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemY = boxY + 26 + i * rowH;
            ctx.fillStyle = item.count > 0 ? '#ffffff' : '#888888';
            ctx.fillText(`${item.icon} ${item.name}:`, boxX + 8, itemY);
            ctx.textAlign = 'right';
            ctx.fillStyle = item.count > 0 ? '#00ffaa' : '#666666';
            ctx.fillText(`${item.count}`, boxX + boxW - 10, itemY);
            ctx.textAlign = 'left';
        }
        ctx.restore();
    }

    renderGameOver(ctx, canvasWidth, canvasHeight) {
        // Darken screen
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        // Panel
        const panelW = 400;
        const panelH = 380;
        ctx.fillStyle = 'rgba(10,20,40,0.95)';
        ctx.beginPath();
        ctx.roundRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH, 16);
        ctx.fill();

        // Glowing border
        ctx.strokeStyle = '#0af';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH, 16);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 24px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText("TIME'S UP!", centerX, centerY - 80);

        // Score
        ctx.fillStyle = '#0f8';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.fillText('TOTAL EARNED', centerX, centerY - 40);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px "Press Start 2P", monospace';
        ctx.fillText('$' + this.score.toString(), centerX, centerY + 10);

        if (window.game.totalEmployeeCost > 0) {
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 10px "Press Start 2P", monospace';
            ctx.fillText(`Posse Upkeep: $${window.game.totalEmployeeCost}`, centerX, centerY + 40);
        }

        // Return button
        const btnW = 200;
        const btnH = 40;
        const btnX = centerX - btnW / 2;
        const btnY = centerY + 145;
        
        const pulse = Math.sin(performance.now() / 300) * 0.1 + 0.9;
        ctx.fillStyle = `rgba(0, 136, 255, ${pulse})`; // Blue store button
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Return to Store', centerX, btnY + btnH / 2);
    }

    renderNotifications(ctx, canvasWidth, canvasHeight) {
        if (this.followerNotificationTimer > 0) {
            const notifAlpha = Math.min(1, this.followerNotificationTimer / 30);
            const notifY = 80;
            const notifScale = this.followerNotificationTimer > 150 ?
                1 + (180 - this.followerNotificationTimer) * 0.01 : 1;

            ctx.save();
            ctx.globalAlpha = notifAlpha;
            ctx.translate(canvasWidth / 2, notifY);
            ctx.scale(notifScale, notifScale);

            // Background
            ctx.fillStyle = this.followerNotificationPositive ? 'rgba(0,50,100,0.85)' : 'rgba(100,20,20,0.85)';
            ctx.font = 'bold 10px "Press Start 2P", monospace';
            const tw = ctx.measureText(this.followerNotification).width + 40;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-tw / 2 - 10, -18, tw + 20, 40, 10);
            else ctx.fillRect(-tw / 2 - 10, -18, tw + 20, 40);
            ctx.fill();
            ctx.strokeStyle = this.followerNotificationPositive ? '#00ccff' : '#ff4444';
            ctx.lineWidth = 2;
            if (ctx.roundRect) ctx.roundRect(-tw / 2 - 10, -18, tw + 20, 40, 10);
            else ctx.strokeRect(-tw / 2 - 10, -18, tw + 20, 40);
            ctx.stroke();

            ctx.fillStyle = this.followerNotificationPositive ? '#00ff88' : '#ff4444';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.followerNotification, 0, 2);

            ctx.restore();
        }
    }

    renderFloatingTexts(ctx) {
        // Floating texts hook
    }

    renderDoomStatusBar(ctx, w, h, game) {
        const barH = 78;
        const barY = h - barH;

        ctx.save();
        // Full width bottom bar background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, barY, w, barH);
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, barY, w, 3); // Top highlight border
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, barY + barH - 2, w, 2); // Bottom shadow

        // Calculate panel dimensions
        const maxBarWidth = Math.min(w - 20, 960);
        const startX = (w - maxBarWidth) / 2;

        const pFaceW = 64;
        const remainingW = maxBarWidth - pFaceW - 24;
        const p1W = Math.floor(remainingW * 0.33); // Trash Load
        const p3W = Math.floor(remainingW * 0.42); // Bank Balance, Posse & GPS Coordinates
        const p4W = remainingW - p1W - p3W;        // Time & Mode

        let currX = startX;

        // 1. TRASH LOAD PANEL
        const panelMargin = 5;
        const panelY = barY + panelMargin;
        const panelH = barH - panelMargin * 2;

        ctx.fillStyle = '#090d16';
        ctx.fillRect(currX, panelY, p1W, panelH);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(currX, panelY, p1W, panelH);

        const currentTrash = (game && game.trashCollectedInTruck !== undefined) ? game.trashCollectedInTruck : 0;
        const animalPenalty = (game && game.player && game.player.capturedAnimals) ? (game.player.capturedAnimals.length * 10) : 0;
        const trucks = Math.max(0, (window.playerHasTruck || 0));
        const totalCap = window.pirateMode ? 100 : Math.max(0, 100 + (trucks * 200) - animalPenalty);
        const treesCarried = (game && game.treesCarried !== undefined) ? game.treesCarried : 0;
        const treeUnits = treesCarried * 100;
        const trashUnits = currentTrash;
        const usedCap = treeUnits + trashUnits;
        const fillPct = totalCap > 0 ? Math.min(1.0, usedCap / totalCap) : 0;

        ctx.fillStyle = '#94a3b8';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        const panelTitle = window.pirateMode ? 'SHIP HOLD' : (trucks > 0 ? 'TRUCK LOAD' : 'TRASH LOAD');
        ctx.fillText(panelTitle, currX + 8, panelY + 14);

        // Progress Bar
        const barW = p1W - 16;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(currX + 8, panelY + 22, barW, 14);

        if (totalCap > 0) {
            // Green fill for trees (100 capacity per tree)
            const greenPct = Math.min(1, treeUnits / totalCap);
            const greenW = barW * greenPct;
            if (greenW > 0) {
                ctx.fillStyle = '#2e8b57';
                ctx.fillRect(currX + 8, panelY + 22, greenW, 14);
            }

            // Brown/Gold fill for regular trash
            const trashFillPct = Math.min(1 - greenPct, trashUnits / totalCap);
            const brownW = barW * trashFillPct;
            if (brownW > 0) {
                let trashColor = '#8b5a2b';
                if (fillPct >= 1.0) trashColor = '#ef4444';
                else if (fillPct > 0.75) trashColor = '#eab308';
                ctx.fillStyle = trashColor;
                ctx.fillRect(currX + 8 + greenW, panelY + 22, brownW, 14);
            }
        }

        ctx.strokeStyle = '#334155';
        ctx.strokeRect(currX + 8, panelY + 22, barW, 14);

        const totalRoundTrash = (game && game.trashCollectedInRound !== undefined) ? game.trashCollectedInRound : 0;
        const evalTrash = (game && game.trashCollectedInWindow !== undefined) ? game.trashCollectedInWindow : 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`HOLD:${usedCap}/${totalCap}`, currX + 8, panelY + 44);

        ctx.fillStyle = '#00ffcc';
        ctx.textAlign = 'right';
        ctx.fillText(`TRASH:${totalRoundTrash}`, currX + p1W - 8, panelY + 44);

        ctx.fillStyle = (evalTrash >= 7) ? '#00ff88' : (evalTrash >= 5 ? '#facc15' : '#f87171');
        ctx.font = '6.5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`EVAL: ${evalTrash}/7`, currX + p1W / 2, panelY + 58);

        currX += p1W + 8;

        // 2. PLAYER PROFILE STICKER AVATAR PORTRAIT
        ctx.fillStyle = '#090d16';
        ctx.fillRect(currX, panelY, pFaceW, panelH);
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.strokeRect(currX, panelY, pFaceW, panelH);

        this.avatarPortraitBounds3D = { x: currX, y: panelY, width: pFaceW, height: panelH };

        // Cache and load selected avatar sticker image
        const currentAvatarFile = window.currentUserAvatar || localStorage.getItem('trashMasterAvatar') || 'ducky_sticker.png';
        if (!this.avatarImg3D || this.avatarSrc3D !== currentAvatarFile) {
            this.avatarSrc3D = currentAvatarFile;
            this.avatarImg3D = new Image();
            this.avatarImg3D.src = `assets/stickers/${this.avatarSrc3D}`;
        }

        const facePad = 8;
        const faceSize = Math.min(pFaceW - facePad * 2, panelH - facePad * 2);
        const faceX = currX + (pFaceW - faceSize) / 2;
        const faceY = panelY + (panelH - faceSize) / 2;

        if (this.avatarImg3D.complete && this.avatarImg3D.naturalWidth > 0) {
            ctx.drawImage(this.avatarImg3D, faceX, faceY, faceSize, faceSize);
        } else {
            ctx.fillStyle = '#00ffcc';
            ctx.font = '20px serif';
            ctx.textAlign = 'center';
            ctx.fillText('👤', currX + pFaceW / 2, panelY + panelH / 2 + 7);
        }

        currX += pFaceW + 8;

        // 3. BANK, POSSE & MAP COORDINATES PANEL
        ctx.fillStyle = '#090d16';
        ctx.fillRect(currX, panelY, p3W, panelH);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(currX, panelY, p3W, panelH);

        // Header: Bank Balance & Posse count
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`$${this.score || 0}`, currX + 8, panelY + 14);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`👥 POSSE: ${this.followerCount || 0}`, currX + p3W - 8, panelY + 14);

        // Small Coordinates Box under the Posse count
        const getBldgCoords = (type) => {
            if (!game || !game.gameMap || !game.gameMap.buildings) return '??,??';
            const b = game.gameMap.buildings.find(bldg => {
                if (!bldg || !bldg.type) return false;
                const bt = bldg.type.toLowerCase();
                if (type === 'pulp_mill') return bt === 'pulp_mill' || bt === 'pulp mill';
                return bt === type;
            });
            if (!b) return '??,??';
            let tx = 0, ty = 0;
            if (b.doorTiles && b.doorTiles.length > 0) {
                tx = b.doorTiles[0].x;
                ty = b.doorTiles[0].y;
            } else if (b.tiles && b.tiles.length > 0) {
                tx = b.tiles[0].x;
                ty = b.tiles[0].y;
            } else {
                tx = Math.floor(b.x / TILE_SIZE);
                ty = Math.floor(b.y / TILE_SIZE);
            }
            return `${wrapTileX(tx)},${wrapTileY(ty)}`;
        };

        const playerTX = (game && game.player) ? wrapTileX(Math.floor(game.player.x / TILE_SIZE)) : 0;
        const playerTY = (game && game.player) ? wrapTileY(Math.floor(game.player.y / TILE_SIZE)) : 0;

        const dumpCoord = getBldgCoords('dump');
        const hospCoord = getBldgCoords('hospital');
        const airpCoord = getBldgCoords('airport');
        const pulpCoord = getBldgCoords('pulp_mill');

        const boxX = currX + 6;
        const boxY = panelY + 22;
        const boxW = p3W - 12;
        const boxH = panelH - 26;

        ctx.fillStyle = '#030712';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Coordinates Text inside box
        ctx.textAlign = 'left';
        ctx.fillStyle = '#00ffcc';
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillText(`📍 YOU: (${playerTX}, ${playerTY})`, boxX + 5, boxY + 10);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '5.5px "Press Start 2P", monospace';
        ctx.fillText(`🗑️DUMP:${dumpCoord}  🏥HOSP:${hospCoord}`, boxX + 5, boxY + 22);
        ctx.fillText(`✈️AIRP:${airpCoord}  🪵PULP:${pulpCoord}`, boxX + 5, boxY + 34);

        currX += p3W + 8;

        // 4. TIME LEFT & MODE PANEL
        ctx.fillStyle = '#090d16';
        ctx.fillRect(currX, panelY, p4W, panelH);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(currX, panelY, p4W, panelH);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('TIME LEFT', currX + 8, panelY + 14);

        const timeLeft = (this.timeRemaining !== undefined ? this.timeRemaining : 120);
        const m = Math.floor(Math.max(0, timeLeft) / 60);
        const s = Math.floor(Math.max(0, timeLeft) % 60);
        const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        ctx.fillStyle = timeLeft < 30 ? '#ef4444' : '#facc15';
        ctx.font = 'bold 10.5px "Press Start 2P", monospace';
        ctx.fillText(`${timeStr} (${Math.ceil(timeLeft)}s)`, currX + 8, panelY + 30);

        let modeLabel = '🏙️ CLEANING';
        if (window.pirateMode) modeLabel = '🏴‍☠️ PIRATE';
        else if (window.crimeMode) modeLabel = '🕵️ CRIME';
        else if (window.cultMode) modeLabel = '🧹 CULT';
        else if (window.politicsMode) modeLabel = '🏛️ POLITICS';

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText(modeLabel, currX + 8, panelY + 50);

        ctx.restore();

        // Render Medication Alert Banner / Status
        this.renderMedicationAlert(ctx, canvasWidth, canvasHeight);
    }

    renderMedicationAlert(ctx, w, h) {
        if (!window.game) return;

        if (window.game.medicationAlertActive) {
            ctx.save();
            const pulse = Math.abs(Math.sin(Date.now() / 160));
            const bannerW = Math.min(420, w - 40);
            const bannerH = 54;
            const bannerX = (w - bannerW) / 2;
            const bannerY = 22;

            this.medicationBtnBounds = { x: bannerX, y: bannerY, width: bannerW, height: bannerH };

            // Glowing Card Background
            ctx.fillStyle = 'rgba(15, 5, 25, 0.94)';
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 8);
            else ctx.rect(bannerX, bannerY, bannerW, bannerH);
            ctx.fill();

            // Pulsing Neon Cyan/Magenta Border
            ctx.strokeStyle = pulse > 0.5 ? '#ff0055' : '#00ffcc';
            ctx.lineWidth = 3;
            if (typeof ctx.roundRect === 'function') ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 8);
            else ctx.rect(bannerX, bannerY, bannerW, bannerH);
            ctx.stroke();

            // Header Banner Text
            ctx.fillStyle = '#ff0055';
            ctx.font = 'bold 9px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('💊 TAKE YOUR MEDS! [PRESS X / M] 💊', bannerX + bannerW / 2, bannerY + 18);

            // Countdown timer & progress bar
            const timerLeft = Math.max(0, window.game.medicationAlertTimer || 0);
            const maxTime = window.game.medicationAlertMaxDuration || 12;
            const progress = timerLeft / maxTime;

            const barW = bannerW - 32;
            const barH = 6;
            const barX = bannerX + 16;
            const barY = bannerY + 26;

            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = (timerLeft < 4) ? '#ef4444' : '#00ffcc';
            ctx.fillRect(barX, barY, barW * progress, barH);

            ctx.fillStyle = '#fef08a';
            ctx.font = '7px "Press Start 2P", monospace';
            ctx.fillText(`⏱️ ${Math.ceil(timerLeft)}s remaining — CLICK TO TAKE!`, bannerX + bannerW / 2, bannerY + 45);

            ctx.restore();
        } else if (window.game.medsMissed) {
            this.medicationBtnBounds = null;
            ctx.save();
            const badgeW = 320;
            const badgeH = 22;
            const badgeX = (w - badgeW) / 2;
            const badgeY = 16;

            ctx.fillStyle = 'rgba(40, 0, 0, 0.9)';
            ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

            ctx.fillStyle = '#f87171';
            ctx.font = 'bold 6.5px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('😵‍💫 MISSED MEDS: INVERTED & 90° ROTATED', badgeX + badgeW / 2, badgeY + 15);
            ctx.restore();
        } else {
            this.medicationBtnBounds = null;
        }
    }
}

