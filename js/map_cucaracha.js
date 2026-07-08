// ============================================================
// map_cucaracha.js — Cucaracha Biome Map (Jungle Theme)
// ============================================================

class CucarachaMap extends BaseMap {
    constructor() {
        super();
        this.theme = 'cucaracha';
        this.regenerate();
    }

    generate() {
        // Initialize roads and building arrays
        this.tiles = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => TileType.GRASS)
        );
        this.buildingMeta = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => -1)
        );
        this.roadDirections = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => null)
        );

        // Diagonal lines for organic jungle paths
        const lines = [
            { x1: 0, y1: 0, x2: 64, y2: 64 },
            { x1: 0, y1: 64, x2: 64, y2: 0 },
            { x1: 0, y1: 32, x2: 64, y2: 96 },
            { x1: 0, y1: 32, x2: 64, y2: -32 },
            { x1: 16, y1: 0, x2: 80, y2: 64 },
            { x1: 48, y1: 0, x2: 112, y2: 64 },
            { x1: 16, y1: 64, x2: 80, y2: 0 },
            { x1: 48, y1: 64, x2: 112, y2: 0 }
        ];

        for (const line of lines) {
            this._drawDiagonalRoad(line.x1, line.y1, line.x2, line.y2);
        }

        this._placeProceduralBuildings();
        this._generateSidewalks();
    }

    _drawDiagonalRoad(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 3;
        
        const len = Math.sqrt(dx*dx + dy*dy);
        const dir = len > 0.1 ? [dx / len, dy / len] : [1, 0];
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const rx = x1 + dx * t;
            const ry = y1 + dy * t;
            
            const px = -dir[1];
            const py = dir[0];
            
            const w1x = wrapTileX(Math.round(rx));
            const w1y = wrapTileY(Math.round(ry));
            const w2x = wrapTileX(Math.round(rx + px));
            const w2y = wrapTileY(Math.round(ry + py));
            
            this.tiles[w1y][w1x] = TileType.ROAD;
            this.roadDirections[w1y][w1x] = dir;
            
            this.tiles[w2y][w2x] = TileType.ROAD;
            this.roadDirections[w2y][w2x] = dir;
        }
    }

    _drawTile(ctx, tile, sx, sy, tx, ty) {
        const s = TILE_SIZE;
        switch (tile) {
            case TileType.ROAD:
            case TileType.ROAD_UP:
            case TileType.ROAD_DOWN:
            case TileType.ROAD_LEFT:
            case TileType.ROAD_RIGHT:
                // Muddy overgrown dark stone path
                ctx.fillStyle = '#3c453c'; 
                ctx.fillRect(sx, sy, s, s);
                // Draw grass patches in road cracks
                ctx.fillStyle = '#1e4a1e';
                if ((tx + ty) % 2 === 0) {
                    ctx.fillRect(sx + 4, sy + 12, 12, 2);
                    ctx.fillRect(sx + 8, sy + 10, 4, 6);
                } else {
                    ctx.fillRect(sx + 32, sy + 40, 16, 2);
                    ctx.fillRect(sx + 36, sy + 38, 4, 6);
                }
                break;

            case TileType.SIDEWALK:
                // Stacked river stones
                ctx.fillStyle = '#4a5746'; 
                ctx.fillRect(sx, sy, s, s);
                ctx.strokeStyle = '#2d382b'; 
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                // Draw circular stones inside tile
                ctx.arc(sx + 16, sy + 16, 12, 0, Math.PI * 2);
                ctx.arc(sx + 48, sy + 16, 12, 0, Math.PI * 2);
                ctx.arc(sx + 16, sy + 48, 12, 0, Math.PI * 2);
                ctx.arc(sx + 48, sy + 48, 12, 0, Math.PI * 2);
                ctx.stroke();
                break;

            case TileType.GRASS:
                // Deep rainforest forest floor
                ctx.fillStyle = '#194219'; 
                ctx.fillRect(sx, sy, s, s);
                ctx.strokeStyle = '#0f2b0f'; 
                ctx.lineWidth = 1.5;
                const seed = (tx * 3 + ty * 7) % 5;
                ctx.beginPath();
                if (seed === 0) {
                    // Fern sprig
                    ctx.moveTo(sx + 12, sy + 48); ctx.lineTo(sx + 48, sy + 12);
                    ctx.moveTo(sx + 20, sy + 40); ctx.lineTo(sx + 12, sy + 32);
                    ctx.moveTo(sx + 30, sy + 30); ctx.lineTo(sx + 20, sy + 20);
                    ctx.moveTo(sx + 40, sy + 20); ctx.lineTo(sx + 32, sy + 12);
                    ctx.stroke();
                } else if (seed === 1) {
                    // Leaf clusters
                    ctx.arc(sx + 20, sy + 20, 6, 0, Math.PI * 2);
                    ctx.arc(sx + 32, sy + 20, 6, 0, Math.PI * 2);
                    ctx.arc(sx + 26, sy + 30, 6, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                // Draw jungle canopy trees
                if ((tx * 17 + ty * 5) % 11 === 0 || (tx * 7 + ty * 3) % 13 === 0) {
                    this._drawTree(ctx, sx + s/2, sy + s/2, this.theme);
                }
                break;

            case TileType.BUILDING: {
                const bldg = this.getBuildingAtTile(tx, ty);
                if (bldg && this._playerInsideBuildingId === bldg.id) {
                    // Interior floor
                    ctx.fillStyle = '#8b7355'; ctx.fillRect(sx, sy, s, s);
                    ctx.strokeStyle = '#7a6548'; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, s, s);
                    break;
                }

                const ci = this.buildingMeta[ty][tx];
                const ccColors = [
                    { base: '#2b3b2b', dark: '#141f14' }, // Stone block
                    { base: '#8c4f35', dark: '#5c301d' }, // Overgrown red brick
                    { base: '#826f4f', dark: '#544630' }  // Woven fiber hut
                ];
                const c = ccColors[ci >= 0 ? (ci % ccColors.length) : 0];
                
                let isHospital = bldg && bldg.type === 'hospital';
                let isAirport = bldg && bldg.type === 'airport';
                
                if (isHospital) {
                    ctx.fillStyle = '#e8e8e8';
                } else if (isAirport) {
                    ctx.fillStyle = '#b0b8c0';
                } else {
                    ctx.fillStyle = c.base;
                }
                ctx.fillRect(sx, sy, s, s);

                // Draw hanging vines/ivy creeping down the building walls
                if (!isHospital && !isAirport) {
                    ctx.fillStyle = '#1b4a1b'; 
                    ctx.fillRect(sx + 4, sy, 6, 20);
                    ctx.fillRect(sx + 24, sy, 8, 30);
                    ctx.fillRect(sx + 48, sy, 6, 15);
                    
                    ctx.fillStyle = '#2b6e2b'; 
                    ctx.fillRect(sx + 6, sy + 8, 2, 8);
                    ctx.fillRect(sx + 27, sy + 12, 2, 15);
                }
                
                ctx.strokeStyle = c.dark; 
                ctx.lineWidth = 2; 
                ctx.strokeRect(sx + 0.5, sy + 0.5, s - 1, s - 1);
                break;
            }

            case TileType.BUILDING_DOOR: {
                const bldg2 = this.getBuildingAtTile(tx, ty);
                if (bldg2 && this._playerInsideBuildingId === bldg2.id) {
                    ctx.fillStyle = '#8b7355'; ctx.fillRect(sx, sy, s, s);
                    ctx.strokeStyle = '#7a6548'; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, s, s);
                    break;
                }
                const isOpen = bldg2 && this.openDoors.has(bldg2.id);
                if (isOpen) {
                    ctx.fillStyle = '#111111';
                    ctx.fillRect(sx, sy, s, s);
                    ctx.strokeStyle = '#ffaa00';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(sx + 2, sy + 2, s - 4, s - 4);
                } else {
                    ctx.fillStyle = '#5c4530';
                    ctx.fillRect(sx, sy, s, s);
                    ctx.strokeStyle = '#3a2b1f';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(sx + 1, sy + 1, s - 2, s - 2);
                    ctx.fillStyle = '#ffd700';
                    ctx.beginPath();
                    ctx.arc(sx + s - 16, sy + s / 2, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }

            case TileType.CROSSWALK:
                ctx.fillStyle = '#3c453c'; ctx.fillRect(sx, sy, s, s);
                ctx.fillStyle = '#4a5746';
                ctx.fillRect(sx + 4, sy + s / 2 - 2, s - 8, 4);
                break;

            case TileType.PARK_PATH:
                ctx.fillStyle = '#4a5746'; ctx.fillRect(sx, sy, s, s);
                ctx.fillStyle = '#2d382b';
                ctx.fillRect(sx + 2, sy + 2, s - 4, 1);
                ctx.fillRect(sx + 2, sy + s - 3, s - 4, 1);
                break;
        }
    }

    _drawTree(ctx, x, y, theme) {
        // Jungle Canopy trees
        ctx.fillStyle = '#4a2f1d';
        ctx.fillRect(x - 3, y - 8, 6, 24); // Trunk
        ctx.fillStyle = '#0a3d0a';
        ctx.beginPath(); ctx.arc(x, y - 10, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#115511';
        ctx.beginPath(); ctx.arc(x - 8, y - 6, 12, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 8, y - 6, 12, 0, Math.PI * 2); ctx.fill();
    }
}
