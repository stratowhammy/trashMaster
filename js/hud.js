// ============================================================
// hud.js — HUD: timer bar, score, follower count
// ============================================================

class HUD {
    constructor() {
        this.gameDuration = 120;  // 120 seconds in seconds
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
    }

    reset() {
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
    }

    updateScore(newScore) {
        if (newScore > this.score) {
            this.scorePop = 1;
        }
        this.score = newScore;
    }

    showFollowerNotification(name, isPositive = true) {
        if (isPositive) {
            this.followerNotification = `${name} joined your posse!`;
        } else {
            this.followerNotification = name;
        }
        this.followerNotificationTimer = 180; // ~3 seconds
        this.followerNotificationPositive = isPositive;
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

        // ── Follower Count (top-left) ──
        const fX = 20;
        const fY = 20;

        ctx.fillStyle = 'rgba(10,15,25,0.75)';
        ctx.beginPath();
        ctx.roundRect(fX - 10, fY - 10, 160, 40, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,200,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(fX - 10, fY - 10, 160, 40, 8);
        ctx.stroke();

        ctx.fillStyle = '#68f';
        ctx.font = '16px serif';
        ctx.textAlign = 'left';
        ctx.fillText('👥', fX, fY + 12);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Posse: ${this.followerCount}`, fX + 28, fY + 12);

        // ── Politics Mode Votes Display (top-left, below Posse) ──
        if (window.politicsMode && window.game) {
            const pvX = 20;
            const pvY = 70;
            ctx.fillStyle = 'rgba(10,15,25,0.75)';
            ctx.beginPath();
            ctx.roundRect(pvX - 10, pvY - 10, 160, 40, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,255,200,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(pvX - 10, pvY - 10, 160, 40, 8);
            ctx.stroke();

            ctx.fillStyle = '#ff8844';
            ctx.font = '16px serif';
            ctx.textAlign = 'left';
            ctx.fillText('🤝', pvX, pvY + 12);

            const office = window.politicalOffice || 'citizen';
            let targetVotes = 25;
            if (office === 'candidate_mayor') targetVotes = 40;
            else if (office === 'candidate_senator') targetVotes = 60;
            else if (office === 'candidate_president') targetVotes = 100;
            
            const count = window.game.handshakesShaken || 0;

            ctx.fillStyle = '#00ffcc';
            ctx.font = 'bold 10px "Press Start 2P", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`Votes:${count}/${targetVotes}`, pvX + 28, pvY + 12);
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

        let nextBarY = canvasHeight - 24;

        // ── Trash Truck Capacity Bar (Bottom Center) ──
        if (window.playerHasTruck > 0 && window.game) {
            const currentTrash = window.game.trashCollectedInTruck || 0;
            const maxTrash = window.playerHasTruck * 50;
            const fillPct = Math.max(0, Math.min(1, currentTrash / maxTrash));

            const barW = Math.min(400, canvasWidth * 0.5);
            const barH = 16;
            const barX = canvasWidth / 2 - barW / 2;
            const barY = nextBarY;
            nextBarY -= 20;

            // Draw background
            ctx.fillStyle = 'rgba(50, 30, 10, 0.6)';
            ctx.fillRect(barX, barY, barW, barH);

            // Fill (brown color)
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(barX, barY, barW * fillPct, barH);

            // Border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barW, barH);

            // Text
            ctx.fillStyle = '#fff';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`TRUCK: ${currentTrash}/${maxTrash}`, barX + barW / 2, barY + barH / 2 + 1);
        }

        // ── Hunger Bar (Bottom Center) ──
        if (window.fastFoodMode && window.game) {
            const hTimer = window.game.hungerTimer || 0;
            const maxHunger = 45.0; // The starting hunger time
            const fillPct = Math.max(0, Math.min(1, hTimer / maxHunger));
            
            const barW = Math.min(400, canvasWidth * 0.5);
            const barH = 16;
            const barX = canvasWidth / 2 - barW / 2;
            const barY = nextBarY;
            
            // Bar Background
            ctx.fillStyle = 'rgba(10,15,25,0.8)';
            ctx.fillRect(barX, barY, barW, barH);
            
            // Fill color (green to red based on time)
            let fillColor = '#00ff00';
            if (fillPct < 0.25) fillColor = '#ff0000';
            else if (fillPct < 0.5) fillColor = '#ffaa00';
            
            ctx.fillStyle = fillColor;
            ctx.fillRect(barX, barY, barW * fillPct, barH);
            
            // Border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barW, barH);
            
            // Label
            ctx.fillStyle = '#fff';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('HUNGER', canvasWidth / 2, barY + barH / 2 + 1);
        }
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
}
