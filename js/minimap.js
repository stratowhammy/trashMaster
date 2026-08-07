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
                let color = miniColors[tile] || '#333';

                if (window.pirateMode) {
                    if (tile === TileType.SIDEWALK) {
                        color = '#e6ca65'; // Sandy Beach Gold
                    } else if (tile === TileType.BUILDING || tile === TileType.BUILDING_DOOR) {
                        color = '#2a9d8f'; // Island Land Green
                    } else {
                        color = '#1b4965'; // Ocean Water Blue
                    }
                } else if (window.crimeMode) {
                    const bldg = gameMap.getBuildingAtTile(x, y);
                    if (bldg) {
                        if (bldg.type === 'bank') {
                            color = '#ffd700'; // Bank: Yellow
                        } else if (bldg.type === 'police') {
                            color = '#3388ff'; // Police Station: Blue
                        }
                    }
                }

                const bldg = gameMap.getBuildingAtTile(x, y);
                if (bldg) {
                    if (bldg.type === 'dump') {
                        color = '#8b5a2b'; // Dump: Brown
                    } else if (!window.pirateMode) {
                        if (bldg.type === 'fast_food') {
                            color = '#ffaa00'; // Fast Food: Orange
                        } else if (bldg.type === 'hospital') {
                            color = '#ffffff'; // Hospital: White
                        } else if (bldg.type === 'city_hall' || bldg.type === 'cityhall') {
                            color = '#00ffff'; // City Hall: Cyan
                        }
                    }
                }
                
                ctx.fillStyle = color;
                ctx.fillRect(x * s, y * s, s, s);
            }
        }

        // Draw prominent red cross for Hospital anytime it exists in the map
        const hospital = gameMap.buildings.find(b => b.type === 'hospital');
        if (hospital && hospital.tiles.length > 0) {
            let hx = 0, hy = 0;
            for (const t of hospital.tiles) { hx += t.x; hy += t.y; }
            hx /= hospital.tiles.length;
            hy /= hospital.tiles.length;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(hx * s - s, hy * s - 3 * s, 2 * s, 6 * s);
            ctx.fillRect(hx * s - 3 * s, hy * s - s, 6 * s, 2 * s);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(hx * s - 0.5 * s, hy * s - 0.5 * s, s, s);
        }

        this.staticDirty = false;
    }

    render(ctx, canvasWidth, canvasHeight, camera, player, followers, trashItems, gameMap) {
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
        if (this.staticDirty && gameMap) {
            this.buildStatic(gameMap);
        }

        // 1/3 Map Viewport Calculation
        const viewTiles = MAP_WIDTH / 3; // ~66.66 tiles (1/3 of 200)
        const playerTileX = (player ? player.x : MAP_PIXEL_W / 2) / TILE_SIZE;
        const playerTileY = (player ? player.y : MAP_PIXEL_H / 2) / TILE_SIZE;

        const startTileX = Math.max(0, Math.min(MAP_WIDTH - viewTiles, playerTileX - viewTiles / 2));
        const startTileY = Math.max(0, Math.min(MAP_HEIGHT - viewTiles, playerTileY - viewTiles / 2));

        const srcX = (startTileX / MAP_WIDTH) * this.staticCanvas.width;
        const srcY = (startTileY / MAP_HEIGHT) * this.staticCanvas.height;
        const srcW = (viewTiles / MAP_WIDTH) * this.staticCanvas.width;
        const srcH = (viewTiles / MAP_HEIGHT) * this.staticCanvas.height;

        ctx.drawImage(this.staticCanvas, srcX, srcY, srcW, srcH, mapX, mapY, this.width, this.height);

        const toMinimapPos = (wx, wy) => {
            const tx = wx / TILE_SIZE;
            const ty = wy / TILE_SIZE;
            const mx = mapX + ((tx - startTileX) / viewTiles) * this.width;
            const my = mapY + ((ty - startTileY) / viewTiles) * this.height;
            return { x: mx, y: my };
        };

        // Draw viewport camera outline relative to 1/3 viewport
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1;
        const camPos = toMinimapPos(camera.x, camera.y);
        const camW = (camera.width / MAP_PIXEL_W) * (MAP_WIDTH / viewTiles) * this.width;
        const camH = (camera.height / MAP_PIXEL_H) * (MAP_HEIGHT / viewTiles) * this.height;
        ctx.strokeRect(camPos.x, camPos.y, camW, camH);

        // Draw NPCs
        if (window.game && window.game.npcManager && window.game.npcManager.npcs) {
            ctx.fillStyle = '#00ffff';
            for (const npc of window.game.npcManager.npcs) {
                if (npc.npcType !== 'flower') {
                    const pos = toMinimapPos(npc.x, npc.y);
                    if (pos.x >= mapX && pos.x <= mapX + this.width && pos.y >= mapY && pos.y <= mapY + this.height) {
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // Draw followers
        if (followers) {
            ctx.fillStyle = '#68f';
            for (const f of followers.followers) {
                const pos = toMinimapPos(f.x, f.y);
                if (pos.x >= mapX && pos.x <= mapX + this.width && pos.y >= mapY && pos.y <= mapY + this.height) {
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Draw player
        const pPos = toMinimapPos(player.x, player.y);
        const pulse = Math.sin(performance.now() / 300) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(0,255,136,${pulse})`;
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f8';
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, 3.5, 0, Math.PI * 2);
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
