// ============================================================
// hud.js — HUD: timer bar, score, follower count
// ============================================================

class HUD {
    constructor() {
        this.gameDuration = 180;  // 3 minutes in seconds
        this.timeRemaining = this.gameDuration;
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
        this.score = 0;
        this.followerCount = 0;
        this.nextFollowerAt = 10;
        this.scorePop = 0;
        this.lastScore = 0;
        this.followerNotification = '';
        this.followerNotificationTimer = 0;
    }

    updateScore(newScore) {
        if (newScore > this.score) {
            this.scorePop = 1;
        }
        this.score = newScore;
    }

    showFollowerNotification(name) {
        this.followerNotification = `${name} joined your crew!`;
        this.followerNotificationTimer = 180; // ~3 seconds
    }

    update(deltaTime) {
        this.timeRemaining -= deltaTime;
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
        const barWidth = 300;
        const barHeight = 24;
        const barX = (canvasWidth - barWidth) / 2;
        const barY = 14;

        // ── Timer Bar ──
        // Background
        ctx.fillStyle = 'rgba(10,15,25,0.75)';
        ctx.beginPath();
        ctx.roundRect(barX - 6, barY - 6, barWidth + 12, barHeight + 12, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,200,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX - 6, barY - 6, barWidth + 12, barHeight + 12, 8);
        ctx.stroke();

        // Timer fill
        const ratio = this.timeRemaining / this.gameDuration;
        const fillWidth = barWidth * ratio;

        // Color gradient: green → yellow → red
        let barColor;
        if (ratio > 0.5) {
            barColor = `hsl(${120 * (ratio - 0.5) * 2 + 60}, 80%, 50%)`;
        } else if (ratio > 0.2) {
            barColor = `hsl(${60 * ((ratio - 0.2) / 0.3)}, 90%, 50%)`;
        } else {
            barColor = `hsl(0, 90%, ${50 + Math.sin(performance.now() / 200) * 15}%)`;
        }

        const gradient = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
        gradient.addColorStop(0, barColor);
        gradient.addColorStop(1, barColor + '88');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(barX, barY, Math.max(0, fillWidth), barHeight, 4);
        ctx.fill();

        // Timer bar outline
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 4);
        ctx.stroke();

        // Timer text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.getTimeString(), barX + barWidth / 2, barY + barHeight / 2 + 1);

        // ── Score Display (top-right) ──
        const scoreX = canvasWidth - 20;
        const scoreY = 20;

        // Score panel
        ctx.fillStyle = 'rgba(10,15,25,0.75)';
        ctx.beginPath();
        ctx.roundRect(scoreX - 170, scoreY - 10, 180, 50, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,200,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(scoreX - 170, scoreY - 10, 180, 50, 8);
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
        ctx.fillText(this.score.toString(), 0, 0);
        ctx.restore();

        // Next follower progress
        const trashToNext = this.nextFollowerAt - (this.score % 10 === 0 && this.score > 0 ? 10 : this.score % 10);
        ctx.fillStyle = '#888';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Next helper: ${trashToNext > 10 ? 10 : trashToNext}`, scoreX - 5, scoreY + 30);

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
        ctx.fillText(`Crew: ${this.followerCount}`, fX + 28, fY + 12);

        // ── Follower Notification ──
        if (this.followerNotificationTimer > 0) {
            const notifAlpha = Math.min(1, this.followerNotificationTimer / 30);
            const notifY = canvasHeight / 2 - 60;
            const notifScale = this.followerNotificationTimer > 150 ?
                1 + (180 - this.followerNotificationTimer) * 0.01 : 1;

            ctx.save();
            ctx.globalAlpha = notifAlpha;
            ctx.translate(canvasWidth / 2, notifY);
            ctx.scale(notifScale, notifScale);

            // Background
            ctx.fillStyle = 'rgba(0,50,100,0.85)';
            const tw = ctx.measureText(this.followerNotification).width + 40;
            ctx.beginPath();
            ctx.roundRect(-tw / 2 - 10, -18, tw + 20, 40, 10);
            ctx.fill();
            ctx.strokeStyle = '#0af';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-tw / 2 - 10, -18, tw + 20, 40, 10);
            ctx.stroke();

            ctx.fillStyle = '#0f8';
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
    }

    renderGameOver(ctx, canvasWidth, canvasHeight) {
        // Darken screen
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        // Panel
        const panelW = 400;
        const panelH = 320;
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
        ctx.fillText("TIME'S UP!", centerX, centerY - 110);

        // Score
        ctx.fillStyle = '#0f8';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.fillText('TRASH COLLECTED', centerX, centerY - 60);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px "Press Start 2P", monospace';
        ctx.fillText(this.score.toString(), centerX, centerY - 20);

        // Followers earned
        ctx.fillStyle = '#68f';
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.fillText(`Crew Members Earned: ${this.followerCount}`, centerX, centerY + 30);

        // Rating
        let rating = '🌟';
        let ratingText = 'Beginner';
        if (this.score >= 100) { rating = '🌟🌟🌟🌟🌟'; ratingText = 'Trash Master!'; }
        else if (this.score >= 75) { rating = '🌟🌟🌟🌟'; ratingText = 'Expert Cleaner'; }
        else if (this.score >= 50) { rating = '🌟🌟🌟'; ratingText = 'Great Job!'; }
        else if (this.score >= 25) { rating = '🌟🌟'; ratingText = 'Good Start'; }

        ctx.fillStyle = '#ffd700';
        ctx.font = '20px serif';
        ctx.fillText(rating, centerX, centerY + 70);
        ctx.fillStyle = '#ccc';
        ctx.font = 'bold 11px "Press Start 2P", monospace';
        ctx.fillText(ratingText, centerX, centerY + 95);

        // Restart prompt
        const pulse = Math.sin(performance.now() / 400) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255,255,255,${pulse})`;
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.fillText('Press SPACE or Click to Play Again', centerX, centerY + 135);
    }
}
