// ============================================================
// minimap.js — Mini-map renderer (bottom-left corner)
// ============================================================

class MiniMap {
    constructor() {
        this.width = 192;
        this.height = 192;
        this.padding = 16;
        this.pixelPerTile = this.width / MAP_WIDTH;  // 3px per tile

        // Pre-render the static map background
        this.staticCanvas = document.createElement('canvas');
        this.staticCanvas.width = this.width;
        this.staticCanvas.height = this.height;
        this.staticDirty = true;
    }

    buildStatic(gameMap) {
        const ctx = this.staticCanvas.getContext('2d');
        const s = this.pixelPerTile;

        ctx.clearRect(0, 0, this.width, this.height);

        // Mini-map tile colors (simplified)
        const miniColors = {
            [TileType.ROAD]:          '#555',
            [TileType.SIDEWALK]:      '#998',
            [TileType.GRASS]:         '#4a8',
            [TileType.BUILDING]:      '#665',
            [TileType.BUILDING_DOOR]: '#885',
            [TileType.CROSSWALK]:     '#777',
            [TileType.PARK_PATH]:     '#ba9',
        };

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const tile = gameMap.tiles[y][x];
                ctx.fillStyle = miniColors[tile] || '#333';
                ctx.fillRect(x * s, y * s, s, s);
            }
        }

        this.staticDirty = false;
    }

    render(ctx, canvasWidth, canvasHeight, camera, player, followers, trashItems, gameMap) {
        const s = this.pixelPerTile;
        const mapX = this.padding;
        const mapY = canvasHeight - this.height - this.padding;

        // Background panel with glassmorphism
        ctx.save();

        // Outer glow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(10,15,25,0.75)';
        ctx.beginPath();
        ctx.roundRect(mapX - 4, mapY - 4, this.width + 8, this.height + 8, 8);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = 'rgba(100,200,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(mapX - 4, mapY - 4, this.width + 8, this.height + 8, 8);
        ctx.stroke();

        // Clip to mini-map area
        ctx.beginPath();
        ctx.roundRect(mapX, mapY, this.width, this.height, 4);
        ctx.clip();

        // Draw static map
        if (this.staticDirty) return;
        ctx.drawImage(this.staticCanvas, mapX, mapY);

        // Highlight open frenzy buildings
        if (gameMap && gameMap.openDoors) {
            const pulse = Math.sin(performance.now() / 150) * 0.4 + 0.6;
            ctx.fillStyle = `rgba(255, 68, 0, ${pulse})`;
            for (const bldgId of gameMap.openDoors) {
                const bldg = gameMap.buildings.find(b => b.id === bldgId);
                if (bldg) {
                    for (const tile of bldg.tiles) {
                        const tx = mapX + tile.x * s;
                        const ty = mapY + tile.y * s;
                        ctx.fillRect(tx, ty, s, s);
                    }
                }
            }
        }

        // Draw trash as tiny dots
        if (trashItems) {
            ctx.fillStyle = '#ff6';
            for (const item of trashItems) {
                if (item.collected) continue;
                const tx = mapX + item.tileX * s;
                const ty = mapY + item.tileY * s;
                ctx.fillRect(tx, ty, 1.5, 1.5);
            }
        }

        // Draw viewport rectangle (use wrapped coordinates)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        const wrappedCamX = ((camera.x % MAP_PIXEL_W) + MAP_PIXEL_W) % MAP_PIXEL_W;
        const wrappedCamY = ((camera.y % MAP_PIXEL_H) + MAP_PIXEL_H) % MAP_PIXEL_H;
        const vx = mapX + (wrappedCamX / MAP_PIXEL_W) * this.width;
        const vy = mapY + (wrappedCamY / MAP_PIXEL_H) * this.height;
        const vw = (camera.width / MAP_PIXEL_W) * this.width;
        const vh = (camera.height / MAP_PIXEL_H) * this.height;
        ctx.strokeRect(vx, vy, vw, vh);

        // Draw followers as blue dots
        if (followers) {
            ctx.fillStyle = '#68f';
            for (const f of followers.followers) {
                const fx = mapX + (f.x / MAP_PIXEL_W) * this.width;
                const fy = mapY + (f.y / MAP_PIXEL_H) * this.height;
                ctx.beginPath();
                ctx.arc(fx, fy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw player as bright green dot (use wrapped coordinates for infinite map)
        const wrappedPx = player.getWrappedX ? player.getWrappedX() : player.x;
        const wrappedPy = player.getWrappedY ? player.getWrappedY() : player.y;
        const px = mapX + (wrappedPx / MAP_PIXEL_W) * this.width;
        const py = mapY + (wrappedPy / MAP_PIXEL_H) * this.height;

        // Pulsing glow
        const pulse = Math.sin(performance.now() / 300) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(0,255,136,${pulse})`;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f8';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Label
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = 'bold 9px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('MAP', mapX + 2, mapY - 8);
        ctx.fillStyle = '#8cf';
        ctx.fillText('MAP', mapX + 1.5, mapY - 8.5);
    }
}
