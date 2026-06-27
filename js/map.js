// ============================================================
// map.js — 64×64 procedural city map generator & renderer
// ============================================================

const TileType = {
    ROAD: 0,
    SIDEWALK: 1,
    GRASS: 2,
    BUILDING: 3,
    BUILDING_DOOR: 4,
    CROSSWALK: 5,
    PARK_PATH: 6,
};

const TILE_SIZE = 32;
const MAP_WIDTH = 64;
const MAP_HEIGHT = 64;
const MAP_PIXEL_W = MAP_WIDTH * TILE_SIZE;
const MAP_PIXEL_H = MAP_HEIGHT * TILE_SIZE;

// Color palette for tiles
const TILE_COLORS = {
    [TileType.ROAD]:          '#4a4a4a',
    [TileType.SIDEWALK]:      '#b0a89a',
    [TileType.GRASS]:         '#4a8c3f',
    [TileType.BUILDING]:      '#6b5b73',
    [TileType.BUILDING_DOOR]: '#8b7355',
    [TileType.CROSSWALK]:     '#d4d4d4',
    [TileType.PARK_PATH]:     '#c8b890',
};

// Secondary colors for tile details
const TILE_DETAIL_COLORS = {
    [TileType.ROAD]:          '#3d3d3d',
    [TileType.SIDEWALK]:      '#9e978a',
    [TileType.GRASS]:         '#3d7a33',
    [TileType.BUILDING]:      '#5a4d62',
    [TileType.BUILDING_DOOR]: '#7a6348',
    [TileType.CROSSWALK]:     '#ffffff',
    [TileType.PARK_PATH]:     '#b8a880',
};

// Building roof colors — varied per building block
const BUILDING_COLORS = [
    { base: '#6b5b73', dark: '#5a4d62', roof: '#7d6d85' },
    { base: '#5b6b73', dark: '#4d5a62', roof: '#6d7d85' },
    { base: '#73655b', dark: '#62574d', roof: '#85776d' },
    { base: '#5b7367', dark: '#4d6259', roof: '#6d8579' },
    { base: '#735b5b', dark: '#624d4d', roof: '#856d6d' },
    { base: '#5b5b73', dark: '#4d4d62', roof: '#6d6d85' },
    { base: '#6b735b', dark: '#5a624d', roof: '#7d856d' },
    { base: '#735b6b', dark: '#624d5a', roof: '#856d7d' },
];

class GameMap {
    constructor() {
        this.tiles = [];
        this.buildingMeta = [];   // Per-tile building color index
        this.generate();
    }

    generate() {
        // Initialize all tiles as grass
        this.tiles = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => TileType.GRASS)
        );
        this.buildingMeta = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => -1)
        );

        // Define road positions (every ~8-10 tiles)
        const hRoads = [4, 5, 14, 15, 24, 25, 34, 35, 44, 45, 54, 55];
        const vRoads = [4, 5, 14, 15, 24, 25, 34, 35, 44, 45, 54, 55];

        // Place horizontal roads
        for (const ry of hRoads) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                this.tiles[ry][x] = TileType.ROAD;
            }
        }

        // Place vertical roads
        for (const rx of vRoads) {
            for (let y = 0; y < MAP_HEIGHT; y++) {
                this.tiles[y][rx] = TileType.ROAD;
            }
        }

        // Place crosswalks at intersections
        for (const ry of hRoads) {
            for (const rx of vRoads) {
                this.tiles[ry][rx] = TileType.CROSSWALK;
            }
        }

        // Road lane markings (center dashes) — stored as metadata, drawn in render
        // Place sidewalks adjacent to roads
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.tiles[y][x] !== TileType.ROAD && this.tiles[y][x] !== TileType.CROSSWALK) {
                    // Check if adjacent to road
                    const neighbors = [
                        [y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]
                    ];
                    for (const [ny, nx] of neighbors) {
                        if (ny >= 0 && ny < MAP_HEIGHT && nx >= 0 && nx < MAP_WIDTH) {
                            if (this.tiles[ny][nx] === TileType.ROAD || this.tiles[ny][nx] === TileType.CROSSWALK) {
                                this.tiles[y][x] = TileType.SIDEWALK;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Fill building blocks (areas between roads that aren't sidewalk)
        let buildingIndex = 0;
        const roadSet = new Set(hRoads.concat(vRoads));

        // Identify city blocks and fill with buildings
        const blockRanges = this._getBlockRanges(hRoads, vRoads);
        for (const block of blockRanges) {
            const colorIdx = buildingIndex % BUILDING_COLORS.length;
            this._fillBlock(block, colorIdx);
            buildingIndex++;
        }

        // Create parks (replace some building blocks with grass + paths)
        this._createParks();

        // Place building doors
        this._placeDoors();
    }

    _getBlockRanges(hRoads, vRoads) {
        const blocks = [];
        const hBoundaries = [-1, ...new Set(hRoads), MAP_HEIGHT].sort((a, b) => a - b);
        const vBoundaries = [-1, ...new Set(vRoads), MAP_WIDTH].sort((a, b) => a - b);

        for (let i = 0; i < hBoundaries.length - 1; i++) {
            for (let j = 0; j < vBoundaries.length - 1; j++) {
                const y1 = hBoundaries[i] + 1;
                const y2 = hBoundaries[i + 1] - 1;
                const x1 = vBoundaries[j] + 1;
                const x2 = vBoundaries[j + 1] - 1;
                if (y2 - y1 >= 2 && x2 - x1 >= 2) {
                    blocks.push({ x1, y1, x2, y2 });
                }
            }
        }
        return blocks;
    }

    _fillBlock(block, colorIdx) {
        const { x1, y1, x2, y2 } = block;
        // Leave a 1-tile sidewalk border, fill inner area with building
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                if (this.tiles[y][x] === TileType.GRASS) {
                    // Inner building area (leave outer ring as sidewalk if already set)
                    if (y > y1 && y < y2 && x > x1 && x < x2) {
                        this.tiles[y][x] = TileType.BUILDING;
                        this.buildingMeta[y][x] = colorIdx;
                    } else {
                        // Keep as sidewalk border around building
                        if (this.tiles[y][x] !== TileType.SIDEWALK) {
                            this.tiles[y][x] = TileType.SIDEWALK;
                        }
                    }
                }
            }
        }
    }

    _createParks() {
        // Convert some building blocks to parks
        const parkBlocks = [
            { x1: 8, y1: 8, x2: 12, y2: 12 },    // Small park
            { x1: 28, y1: 28, x2: 32, y2: 32 },   // Central park
            { x1: 48, y1: 8, x2: 52, y2: 12 },    // East park
            { x1: 8, y1: 48, x2: 12, y2: 52 },    // South park
            { x1: 38, y1: 48, x2: 42, y2: 52 },   // SE park
            { x1: 18, y1: 18, x2: 22, y2: 22 },   // Inner park
        ];

        for (const park of parkBlocks) {
            for (let y = park.y1; y <= park.y2; y++) {
                for (let x = park.x1; x <= park.x2; x++) {
                    if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
                        if (this.tiles[y][x] === TileType.BUILDING) {
                            this.tiles[y][x] = TileType.GRASS;
                            this.buildingMeta[y][x] = -1;
                        }
                    }
                }
            }
            // Add park paths (cross pattern)
            const midY = Math.floor((park.y1 + park.y2) / 2);
            const midX = Math.floor((park.x1 + park.x2) / 2);
            for (let x = park.x1; x <= park.x2; x++) {
                if (midY >= 0 && midY < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
                    if (this.tiles[midY][x] !== TileType.ROAD && this.tiles[midY][x] !== TileType.SIDEWALK) {
                        this.tiles[midY][x] = TileType.PARK_PATH;
                    }
                }
            }
            for (let y = park.y1; y <= park.y2; y++) {
                if (y >= 0 && y < MAP_HEIGHT && midX >= 0 && midX < MAP_WIDTH) {
                    if (this.tiles[y][midX] !== TileType.ROAD && this.tiles[y][midX] !== TileType.SIDEWALK) {
                        this.tiles[y][midX] = TileType.PARK_PATH;
                    }
                }
            }
        }
    }

    _placeDoors() {
        // Place doors on building edges facing sidewalks
        for (let y = 1; y < MAP_HEIGHT - 1; y++) {
            for (let x = 1; x < MAP_WIDTH - 1; x++) {
                if (this.tiles[y][x] !== TileType.BUILDING) continue;

                // Check if this building tile is on an edge (adjacent to sidewalk)
                const adjacentSidewalk = (
                    (this.tiles[y - 1][x] === TileType.SIDEWALK) ||
                    (this.tiles[y + 1][x] === TileType.SIDEWALK) ||
                    (this.tiles[y][x - 1] === TileType.SIDEWALK) ||
                    (this.tiles[y][x + 1] === TileType.SIDEWALK)
                );

                if (adjacentSidewalk && Math.random() < 0.03) {
                    this.tiles[y][x] = TileType.BUILDING_DOOR;
                    this.buildingMeta[y][x] = this.buildingMeta[y][x]; // Keep color
                }
            }
        }
    }

    isWalkable(tileX, tileY) {
        if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
            return false;
        }
        const tile = this.tiles[tileY][tileX];
        return tile !== TileType.BUILDING && tile !== TileType.BUILDING_DOOR;
    }

    getTile(tileX, tileY) {
        if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
            return TileType.BUILDING;
        }
        return this.tiles[tileY][tileX];
    }

    render(ctx, camera) {
        const startTileX = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
        const startTileY = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
        const endTileX = Math.min(MAP_WIDTH - 1, Math.ceil((camera.x + camera.width) / TILE_SIZE) + 1);
        const endTileY = Math.min(MAP_HEIGHT - 1, Math.ceil((camera.y + camera.height) / TILE_SIZE) + 1);

        for (let y = startTileY; y <= endTileY; y++) {
            for (let x = startTileX; x <= endTileX; x++) {
                const screenX = x * TILE_SIZE - camera.x;
                const screenY = y * TILE_SIZE - camera.y;
                const tile = this.tiles[y][x];

                this._drawTile(ctx, tile, screenX, screenY, x, y);
            }
        }
    }

    _drawTile(ctx, tile, sx, sy, tx, ty) {
        const s = TILE_SIZE;

        switch (tile) {
            case TileType.ROAD:
                ctx.fillStyle = TILE_COLORS[TileType.ROAD];
                ctx.fillRect(sx, sy, s, s);
                // Lane markings
                if ((tx + ty) % 4 < 2) {
                    ctx.fillStyle = '#666';
                    if (ty % 2 === 0) {
                        ctx.fillRect(sx + s / 2 - 1, sy + 2, 2, s - 4);
                    } else {
                        ctx.fillRect(sx + 2, sy + s / 2 - 1, s - 4, 2);
                    }
                }
                break;

            case TileType.SIDEWALK:
                ctx.fillStyle = TILE_COLORS[TileType.SIDEWALK];
                ctx.fillRect(sx, sy, s, s);
                // Grid pattern
                ctx.strokeStyle = TILE_DETAIL_COLORS[TileType.SIDEWALK];
                ctx.lineWidth = 0.5;
                ctx.strokeRect(sx + 1, sy + 1, s - 2, s - 2);
                if ((tx + ty) % 3 === 0) {
                    ctx.strokeRect(sx + s / 4, sy + s / 4, s / 2, s / 2);
                }
                break;

            case TileType.GRASS:
                ctx.fillStyle = TILE_COLORS[TileType.GRASS];
                ctx.fillRect(sx, sy, s, s);
                // Grass blades
                ctx.fillStyle = TILE_DETAIL_COLORS[TileType.GRASS];
                const seed = (tx * 7 + ty * 13) % 5;
                for (let i = 0; i < 3; i++) {
                    const gx = sx + ((seed + i * 11) % s);
                    const gy = sy + ((seed + i * 7) % s);
                    ctx.fillRect(gx, gy, 1, 3);
                }
                // Occasional flowers
                if ((tx * 3 + ty * 7) % 17 === 0) {
                    ctx.fillStyle = '#e8d44d';
                    ctx.fillRect(sx + 10, sy + 12, 3, 3);
                } else if ((tx * 5 + ty * 11) % 19 === 0) {
                    ctx.fillStyle = '#d46a6a';
                    ctx.fillRect(sx + 20, sy + 8, 3, 3);
                }
                break;

            case TileType.BUILDING: {
                const colorIdx = this.buildingMeta[ty][tx];
                const colors = BUILDING_COLORS[colorIdx >= 0 ? colorIdx : 0];
                ctx.fillStyle = colors.base;
                ctx.fillRect(sx, sy, s, s);
                // Window pattern
                ctx.fillStyle = '#2a2a3a';
                const windowSize = 4;
                const windowGap = 8;
                for (let wy = 4; wy < s - 4; wy += windowGap) {
                    for (let wx = 4; wx < s - 4; wx += windowGap) {
                        ctx.fillRect(sx + wx, sy + wy, windowSize, windowSize);
                        // Window glow
                        if ((tx + ty + wx + wy) % 3 !== 0) {
                            ctx.fillStyle = '#ffd86e44';
                            ctx.fillRect(sx + wx, sy + wy, windowSize, windowSize);
                            ctx.fillStyle = '#2a2a3a';
                        }
                    }
                }
                // Border
                ctx.strokeStyle = colors.dark;
                ctx.lineWidth = 1;
                ctx.strokeRect(sx + 0.5, sy + 0.5, s - 1, s - 1);
                break;
            }

            case TileType.BUILDING_DOOR: {
                const colorIdx2 = this.buildingMeta[ty][tx];
                const colors2 = BUILDING_COLORS[colorIdx2 >= 0 ? colorIdx2 : 0];
                ctx.fillStyle = colors2.base;
                ctx.fillRect(sx, sy, s, s);
                // Door
                ctx.fillStyle = TILE_COLORS[TileType.BUILDING_DOOR];
                ctx.fillRect(sx + 8, sy + 6, 16, 20);
                ctx.strokeStyle = '#5a4530';
                ctx.lineWidth = 1;
                ctx.strokeRect(sx + 8, sy + 6, 16, 20);
                // Door handle
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(sx + 20, sy + 16, 2, 2);
                // "LOCKED" indicator
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(sx + 14, sy + 2, 4, 3);
                break;
            }

            case TileType.CROSSWALK:
                ctx.fillStyle = TILE_COLORS[TileType.ROAD];
                ctx.fillRect(sx, sy, s, s);
                ctx.fillStyle = TILE_COLORS[TileType.CROSSWALK];
                for (let i = 2; i < s - 2; i += 6) {
                    ctx.fillRect(sx + i, sy + 2, 4, s - 4);
                }
                break;

            case TileType.PARK_PATH:
                ctx.fillStyle = TILE_COLORS[TileType.PARK_PATH];
                ctx.fillRect(sx, sy, s, s);
                // Subtle stone pattern
                ctx.strokeStyle = TILE_DETAIL_COLORS[TileType.PARK_PATH];
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(sx + s / 3, sy);
                ctx.lineTo(sx + s / 3, sy + s);
                ctx.moveTo(sx + 2 * s / 3, sy);
                ctx.lineTo(sx + 2 * s / 3, sy + s);
                ctx.moveTo(sx, sy + s / 2);
                ctx.lineTo(sx + s, sy + s / 2);
                ctx.stroke();
                break;
        }
    }
}
