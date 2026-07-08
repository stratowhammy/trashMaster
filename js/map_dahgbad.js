// ============================================================
// map_dahgbad.js — Dahgbad Biome Map (Desert Theme)
// ============================================================

class DahgbadMap extends BaseMap {
    constructor() {
        super();
        this.theme = 'dahgbad';
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

        // Circular centers connected by grid
        const centers = [
            { cx: 16, cy: 16 },
            { cx: 16, cy: 48 },
            { cx: 48, cy: 16 },
            { cx: 48, cy: 48 }
        ];

        // Draw concentric circles
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                for (const center of centers) {
                    let dx = x - center.cx;
                    if (dx > MAP_WIDTH / 2) dx -= MAP_WIDTH;
                    else if (dx < -MAP_WIDTH / 2) dx += MAP_WIDTH;
                    let dy = y - center.cy;
                    if (dy > MAP_HEIGHT / 2) dy -= MAP_HEIGHT;
                    else if (dy < -MAP_HEIGHT / 2) dy += MAP_HEIGHT;

                    const dist = Math.sqrt(dx * dx + dy * dy);
                    // Radius 6.5 and 12.5 roads
                    if (Math.abs(dist - 6.5) <= 1.0 || Math.abs(dist - 12.5) <= 1.0) {
                        this.tiles[y][x] = TileType.ROAD;
                        if (dist > 0.1) {
                            // Circular movement directions
                            this.roadDirections[y][x] = [-dy / dist, dx / dist];
                        }
                    }
                }
            }
        }

        // Connecting grid lines
        const hLines = [15, 16, 47, 48];
        const vLines = [15, 16, 47, 48];

        for (const ry of hLines) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const isCrosswalk = vLines.includes(x);
                this.tiles[ry][x] = isCrosswalk ? TileType.CROSSWALK : TileType.ROAD;
                this.roadDirections[ry][x] = (ry % 2 === 0) ? [1, 0] : [-1, 0];
            }
        }

        for (const rx of vLines) {
            for (let y = 0; y < MAP_HEIGHT; y++) {
                const isCrosswalk = hLines.includes(y);
                this.tiles[y][rx] = isCrosswalk ? TileType.CROSSWALK : TileType.ROAD;
                this.roadDirections[y][rx] = (rx % 2 === 0) ? [0, 1] : [0, -1];
            }
        }

        this._placeProceduralBuildings();
        this._generateSidewalks();
    }

    _drawTile(ctx, tile, sx, sy, tx, ty) {
        const s = TILE_SIZE;
        switch (tile) {
            case TileType.ROAD:
            case TileType.ROAD_UP:
            case TileType.ROAD_DOWN:
            case TileType.ROAD_LEFT:
            case TileType.ROAD_RIGHT:
                // Arid cracked brown pavement
                ctx.fillStyle = '#8c7058'; 
                ctx.fillRect(sx, sy, s, s);
                ctx.strokeStyle = '#6e543f'; 
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                if ((tx + ty) % 3 === 0) {
                    ctx.moveTo(sx, sy + 10); 
                    ctx.lineTo(sx + 20, sy + 30); 
                    ctx.lineTo(sx + 35, sy + 20); 
                    ctx.lineTo(sx + s, sy + 40);
                } else if ((tx + ty) % 3 === 1) {
                    ctx.moveTo(sx + 20, sy); 
                    ctx.lineTo(sx + 15, sy + 25); 
                    ctx.lineTo(sx + 40, sy + 50);
                }
                ctx.stroke();
                break;

            case TileType.SIDEWALK:
                // Peach-tan sand mosaics
                ctx.fillStyle = '#dcb88f'; 
                ctx.fillRect(sx, sy, s, s);
                ctx.strokeStyle = '#b88a59'; 
                ctx.lineWidth = 1;
                ctx.strokeRect(sx + 2, sy + 2, s - 4, s - 4);
                // Draw geometric cross/diamond patterns
                ctx.beginPath();
                ctx.moveTo(sx + s/2, sy + 2); ctx.lineTo(sx + s/2, sy + s - 2);
                ctx.moveTo(sx + 2, sy + s/2); ctx.lineTo(sx + s - 2, sy + s/2);
                ctx.moveTo(sx + s/2, sy + 6);
                ctx.lineTo(sx + s - 6, sy + s/2);
                ctx.lineTo(sx + s/2, sy + s - 6);
                ctx.lineTo(sx + 6, sy + s/2);
                ctx.closePath();
                ctx.stroke();
                break;

            case TileType.GRASS:
                // Arid sand ground
                ctx.fillStyle = '#e3c29b'; 
                ctx.fillRect(sx, sy, s, s);
                ctx.strokeStyle = '#cda275'; 
                ctx.lineWidth = 1;
                const seed = (tx * 7 + ty * 13) % 5;
                ctx.beginPath();
                if (seed === 0) {
                    // Sand ripples
                    ctx.moveTo(sx + 5, sy + 15); ctx.quadraticCurveTo(sx + 20, sy + 25, sx + 40, sy + 15);
                    ctx.moveTo(sx + 15, sy + 35); ctx.quadraticCurveTo(sx + 30, sy + 45, sx + 50, sy + 35);
                    ctx.stroke();
                } else if (seed === 1) {
                    // Dry cracked sand lines
                    ctx.moveTo(sx + 10, sy + 10); ctx.lineTo(sx + 30, sy + 25); ctx.lineTo(sx + 50, sy + 20);
                    ctx.moveTo(sx + 30, sy + 25); ctx.lineTo(sx + 25, sy + 50);
                    ctx.stroke();
                } else if (seed === 2) {
                    // Small terracotta jug decorations
                    ctx.fillStyle = '#b87d4b';
                    ctx.fillRect(sx + 28, sy + 28, 8, 10);
                    ctx.fillStyle = '#8f5c33';
                    ctx.fillRect(sx + 30, sy + 26, 4, 2);
                }
                
                // Draw trees if selected
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
                const dbColors = [
                    { base: '#cfa276', dark: '#a6774e' },
                    { base: '#bfa080', dark: '#917355' },
                    { base: '#b58c63', dark: '#8a6540' }
                ];
                const c = dbColors[ci >= 0 ? (ci % dbColors.length) : 0];
                
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

                // Draw mashrabiya/wooden arched windows instead of standard squares
                if (!isHospital && !isAirport) {
                    ctx.fillStyle = '#4a2f1b';
                    if ((tx + ty) % 2 === 0) {
                        ctx.fillRect(sx + 16, sy + 12, 32, 28);
                        ctx.fillStyle = '#8b5a2b';
                        ctx.fillRect(sx + 20, sy + 16, 10, 20);
                        ctx.fillRect(sx + 34, sy + 16, 10, 20);
                    } else {
                        ctx.fillRect(sx + 12, sy + 16, 40, 6);
                        ctx.fillRect(sx + 12, sy + 28, 40, 6);
                    }
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
                    ctx.fillStyle = '#8b7355';
                    ctx.fillRect(sx, sy, s, s);
                    ctx.strokeStyle = '#5a4530';
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
                ctx.fillStyle = '#8c7058'; ctx.fillRect(sx, sy, s, s);
                ctx.fillStyle = '#dcb88f';
                ctx.fillRect(sx + 4, sy + s / 2 - 2, s - 8, 4);
                break;

            case TileType.PARK_PATH:
                ctx.fillStyle = '#dcb88f'; ctx.fillRect(sx, sy, s, s);
                ctx.fillStyle = '#b88a59';
                ctx.fillRect(sx + 2, sy + 2, s - 4, 1);
                ctx.fillRect(sx + 2, sy + s - 3, s - 4, 1);
                break;
        }
    }

    _drawTree(ctx, x, y, theme) {
        // Date Palms & Cypress Trees
        const seed = (x * 3 + y * 7) % 2;
        if (seed === 0) {
            // Date Palm
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(x - 2, y, 4, 16); // Trunk
            ctx.fillStyle = '#228b22';
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI, true);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 12, y + 4, x - 16, y + 10);
            ctx.quadraticCurveTo(x - 8, y + 6, x, y);
            ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 12, y + 4, x + 16, y + 10);
            ctx.quadraticCurveTo(x + 8, y + 6, x, y);
            ctx.fill();
        } else {
            // Tall Cypress Tree
            ctx.fillStyle = '#5c4033';
            ctx.fillRect(x - 1, y + 4, 2, 12); // Trunk
            ctx.fillStyle = '#1e3f20';
            ctx.beginPath();
            ctx.ellipse(x, y + 2, 4, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2d5e30';
            ctx.beginPath();
            ctx.ellipse(x - 1, y, 3, 10, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
