// ============================================================
// camera.js — Viewport camera (no clamping for infinite scroll)
// ============================================================

class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.smoothing = 0.1;
    }

    follow(targetX, targetY) {
        const desiredX = targetX - this.width / 2;
        const desiredY = targetY - this.height / 2;
        this.x += (desiredX - this.x) * this.smoothing;
        this.y += (desiredY - this.y) * this.smoothing;
        // No clamping — infinite scroll
    }

    snapTo(targetX, targetY) {
        this.x = targetX - this.width / 2;
        this.y = targetY - this.height / 2;
    }

    resize(width, height) { this.width = width; this.height = height; }

    worldToScreen(worldX, worldY) {
        return { x: worldX - this.x, y: worldY - this.y };
    }

    getCenterX() { return this.x + this.width / 2; }
    getCenterY() { return this.y + this.height / 2; }

    isVisible(worldX, worldY, w, h) {
        return worldX + w > this.x && worldX < this.x + this.width &&
               worldY + h > this.y && worldY < this.y + this.height;
    }
}
