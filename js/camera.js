// ============================================================
// camera.js — Viewport camera that follows the player
// ============================================================

class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.smoothing = 0.1;   // Lerp factor for smooth following
    }

    follow(targetX, targetY) {
        // Center camera on target
        const desiredX = targetX - this.width / 2;
        const desiredY = targetY - this.height / 2;

        // Smooth interpolation
        this.x += (desiredX - this.x) * this.smoothing;
        this.y += (desiredY - this.y) * this.smoothing;

        // Clamp to map bounds
        this.x = Math.max(0, Math.min(this.x, MAP_PIXEL_W - this.width));
        this.y = Math.max(0, Math.min(this.y, MAP_PIXEL_H - this.height));
    }

    snapTo(targetX, targetY) {
        this.x = targetX - this.width / 2;
        this.y = targetY - this.height / 2;
        this.x = Math.max(0, Math.min(this.x, MAP_PIXEL_W - this.width));
        this.y = Math.max(0, Math.min(this.y, MAP_PIXEL_H - this.height));
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }

    isVisible(worldX, worldY, w, h) {
        return (
            worldX + w > this.x &&
            worldX < this.x + this.width &&
            worldY + h > this.y &&
            worldY < this.y + this.height
        );
    }
}
