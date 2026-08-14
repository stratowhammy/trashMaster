// ============================================================
// fps_viewmodel.js — 2.5D Retro Animated First-Person Viewmodel
// Renders Hands, Trash Claw, Vacuum & Tools with Walking Bobbing
// ============================================================

class FPSViewmodel {
    constructor() {
        this.currentTool = 'claw'; // 'claw', 'vacuum', 'net', 'cannon', 'fist'
        this.bobTime = 0;
        this.bobAmountX = 0;
        this.bobAmountY = 0;

        this.actionTimer = 0;
        this.isActing = false;

        this.viewmodelCanvases = {};
        this._initToolGraphics();
    }

    _initToolGraphics() {
        // 1. Mechanical Trash Grabber Claw (Classic Green & Steel)
        this.viewmodelCanvases.claw_idle = this._renderClawCanvas(false);
        this.viewmodelCanvases.claw_grab = this._renderClawCanvas(true);

        // 2. Heavy-Duty Turbo Trash Vacuum (Yellow Industrial)
        this.viewmodelCanvases.vacuum = this._renderVacuumCanvas();

        // 3. Ranger Animal Capture Net
        this.viewmodelCanvases.net = this._renderNetCanvas();

        // 4. Fist / Intimidation Hand
        this.viewmodelCanvases.fist = this._renderFistCanvas();
    }

    _renderClawCanvas(isGrabbing) {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Arm / Pole (Steel Gray)
        ctx.fillStyle = '#475569';
        ctx.fillRect(95, 120, 50, 120);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(100, 120, 20, 120);
        ctx.fillStyle = '#334155';
        ctx.fillRect(130, 120, 15, 120);

        // Red/Yellow Warning Band
        ctx.fillStyle = '#eab308';
        ctx.fillRect(95, 110, 50, 15);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(95, 110, 15, 15);
        ctx.fillRect(130, 110, 15, 15);

        // Claw Base Hub (Green)
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(120, 100, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Mechanical Claws (Left and Right pincers)
        const spread = isGrabbing ? 15 : 45;

        // Left Pincer
        ctx.save();
        ctx.translate(100, 90);
        ctx.rotate((-spread * Math.PI) / 180);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-12, -60, 20, 60);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, -60, 8, 60);
        // Claw hook tip
        ctx.beginPath();
        ctx.moveTo(8, -60);
        ctx.lineTo(25, -50);
        ctx.lineTo(8, -40);
        ctx.fill();
        ctx.restore();

        // Right Pincer
        ctx.save();
        ctx.translate(140, 90);
        ctx.rotate((spread * Math.PI) / 180);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-8, -60, 20, 60);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(4, -60, 8, 60);
        // Claw hook tip
        ctx.beginPath();
        ctx.moveTo(-8, -60);
        ctx.lineTo(-25, -50);
        ctx.lineTo(-8, -40);
        ctx.fill();
        ctx.restore();

        return canvas;
    }

    _renderVacuumCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Industrial Vacuum Nozzle
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.moveTo(60, 240);
        ctx.lineTo(180, 240);
        ctx.lineTo(150, 80);
        ctx.lineTo(90, 80);
        ctx.closePath();
        ctx.fill();

        // Suction Ring Rim
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(75, 65, 90, 20);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(80, 70, 80, 10);

        return canvas;
    }

    _renderNetCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Wooden Handle
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(110, 120, 20, 120);

        // Net Hoop
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(120, 80, 60, 45, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Mesh lines
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        for (let x = 70; x <= 170; x += 15) {
            ctx.beginPath();
            ctx.moveTo(x, 40);
            ctx.lineTo(x, 120);
            ctx.stroke();
        }
        for (let y = 45; y <= 115; y += 15) {
            ctx.beginPath();
            ctx.moveTo(65, y);
            ctx.lineTo(175, y);
            ctx.stroke();
        }

        return canvas;
    }

    _renderFistCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Arm
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(80, 130, 80, 110);
        // Fist Glove
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(120, 100, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(90, 80, 60, 15);

        return canvas;
    }

    triggerAction() {
        this.isActing = true;
        this.actionTimer = 0.25; // 250ms action grab
    }

    update(dt, isMoving, speed = 1.0) {
        if (isMoving) {
            this.bobTime += dt * 10 * speed;
            this.bobAmountX = Math.cos(this.bobTime) * 12;
            this.bobAmountY = Math.abs(Math.sin(this.bobTime)) * 14;
        } else {
            // Smoothly return to center
            this.bobAmountX *= 0.85;
            this.bobAmountY *= 0.85;
        }

        if (this.isActing) {
            this.actionTimer -= dt;
            if (this.actionTimer <= 0) {
                this.isActing = false;
            }
        }
    }

    render(ctx, screenWidth, screenHeight) {
        let toolImg = this.viewmodelCanvases.claw_idle;
        if (this.currentTool === 'claw') {
            toolImg = this.isActing ? this.viewmodelCanvases.claw_grab : this.viewmodelCanvases.claw_idle;
        } else if (this.currentTool === 'vacuum') {
            toolImg = this.viewmodelCanvases.vacuum;
        } else if (this.currentTool === 'net') {
            toolImg = this.viewmodelCanvases.net;
        } else if (this.currentTool === 'fist') {
            toolImg = this.viewmodelCanvases.fist;
        }

        if (!toolImg) return;

        const size = Math.min(screenWidth, screenHeight) * 0.55;
        const x = screenWidth / 2 - size / 2 + this.bobAmountX;
        const y = screenHeight - size + 20 + this.bobAmountY + (this.isActing ? -15 : 0);

        ctx.drawImage(toolImg, x, y, size, size);
    }
}

window.FPSViewmodel = FPSViewmodel;
