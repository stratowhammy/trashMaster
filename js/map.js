// ============================================================
// map.js — 64×64 procedural city map with infinite wrapping
// ============================================================

const TileType = {
    ROAD: 0,
    SIDEWALK: 1,
    GRASS: 2,
    BUILDING: 3,
    BUILDING_DOOR: 4,
    CROSSWALK: 5,
    PARK_PATH: 6,
    ROAD_UP: 7,
    ROAD_DOWN: 8,
    ROAD_LEFT: 9,
    ROAD_RIGHT: 10,
    LAKE: 11,
};
window.TileType = TileType;

const TILE_SIZE = 64;
const MAP_WIDTH = 128;
const MAP_HEIGHT = 128;
const MAP_PIXEL_W = MAP_WIDTH * TILE_SIZE;
const MAP_PIXEL_H = MAP_HEIGHT * TILE_SIZE;

// ── Wrapping helpers (used by all modules) ──
function wrapTileX(x) {
    if (window.pirateMode) return Math.max(0, Math.min(MAP_WIDTH - 1, Math.floor(x)));
    return ((x % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;
}
function wrapTileY(y) {
    if (window.pirateMode) return Math.max(0, Math.min(MAP_HEIGHT - 1, Math.floor(y)));
    return ((y % MAP_HEIGHT) + MAP_HEIGHT) % MAP_HEIGHT;
}
function wrapWorldX(x) {
    if (window.pirateMode) return Math.max(0, Math.min(MAP_PIXEL_W, x));
    return ((x % MAP_PIXEL_W) + MAP_PIXEL_W) % MAP_PIXEL_W;
}
function wrapWorldY(y) {
    if (window.pirateMode) return Math.max(0, Math.min(MAP_PIXEL_H + 300, y));
    return ((y % MAP_PIXEL_H) + MAP_PIXEL_H) % MAP_PIXEL_H;
}

function wrappedDistance(x1, y1, x2, y2) {
    if (window.pirateMode) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }
    let dx = Math.abs(x1 - x2);
    let dy = Math.abs(y1 - y2);
    if (dx > MAP_PIXEL_W / 2) dx = MAP_PIXEL_W - dx;
    if (dy > MAP_PIXEL_H / 2) dy = MAP_PIXEL_H - dy;
    return Math.sqrt(dx * dx + dy * dy);
}

function nearestWrap(entityX, entityY, camCenterX, camCenterY) {
    if (window.pirateMode) {
        return { x: entityX, y: entityY };
    }
    let dx = (entityX - camCenterX) % MAP_PIXEL_W;
    if (dx > MAP_PIXEL_W / 2) dx -= MAP_PIXEL_W;
    else if (dx < -MAP_PIXEL_W / 2) dx += MAP_PIXEL_W;
    const x = camCenterX + dx;

    let dy = (entityY - camCenterY) % MAP_PIXEL_H;
    if (dy > MAP_PIXEL_H / 2) dy -= MAP_PIXEL_H;
    else if (dy < -MAP_PIXEL_H / 2) dy += MAP_PIXEL_H;
    const y = camCenterY + dy;

    return { x, y };
}

// Tile colors
const TILE_COLORS = {
    [TileType.ROAD]: '#4a4a4a', [TileType.SIDEWALK]: '#b0a89a',
    [TileType.GRASS]: '#4a8c3f', [TileType.BUILDING]: '#6b5b73',
    [TileType.BUILDING_DOOR]: '#8b7355', [TileType.CROSSWALK]: '#d4d4d4',
    [TileType.PARK_PATH]: '#c8b890', [TileType.LAKE]: '#0f5a9e',
    [TileType.ROAD_UP]: '#4a4a4a', [TileType.ROAD_DOWN]: '#4a4a4a',
    [TileType.ROAD_LEFT]: '#4a4a4a', [TileType.ROAD_RIGHT]: '#4a4a4a',
};
const TILE_DETAIL_COLORS = {
    [TileType.ROAD]: '#3d3d3d', [TileType.SIDEWALK]: '#9e978a',
    [TileType.GRASS]: '#3d7a33', [TileType.BUILDING]: '#5a4d62',
    [TileType.BUILDING_DOOR]: '#7a6348', [TileType.CROSSWALK]: '#ffffff',
    [TileType.PARK_PATH]: '#b8a880', [TileType.LAKE]: '#0a3d6b',
    [TileType.ROAD_UP]: '#3d3d3d', [TileType.ROAD_DOWN]: '#3d3d3d',
    [TileType.ROAD_LEFT]: '#3d3d3d', [TileType.ROAD_RIGHT]: '#3d3d3d',
};
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

class BaseMap {
    constructor() {
        this.width = MAP_WIDTH;
        this.height = MAP_HEIGHT;
        this.tiles = [];
        this.buildingMeta = [];
        this.buildings = []; // { id, address, tiles: [{x,y}], doorTiles: [{x,y}] }
        this.openDoors = new Set(); // Set of building IDs whose doors are open (walkable)
        this.theme = 'default';
        this.roadDirections = [];
    }

    getTileAttribute(x, y) {
        const wx = wrapTileX(x);
        const wy = wrapTileY(y);
        const tile = this.tiles[wy] ? this.tiles[wy][wx] : null;
        if (tile === null || tile === undefined) return 'sidewalk tile';

        if (window.pirateMode) {
            if (tile === TileType.ROAD) return 'water tile';
            if (tile === TileType.BUILDING_DOOR) return 'door tiles';
            return 'island tiles';
        }

        switch (tile) {
            case TileType.BUILDING_DOOR:
                return 'door tiles';
            case TileType.BUILDING:
                return 'building tile';
            case TileType.GRASS:
            case TileType.PARK_PATH:
                return 'park tile';
            case TileType.ROAD:
            case TileType.CROSSWALK:
            case TileType.ROAD_UP:
            case TileType.ROAD_DOWN:
            case TileType.ROAD_LEFT:
            case TileType.ROAD_RIGHT:
                return 'road tile';
            case TileType.SIDEWALK: {
                const neighbors = [
                    [wx, wrapTileY(wy - 1)],
                    [wx, wrapTileY(wy + 1)],
                    [wrapTileX(wx - 1), wy],
                    [wrapTileX(wx + 1), wy]
                ];
                for (const [nx, ny] of neighbors) {
                    const nt = this.tiles[ny] ? this.tiles[ny][nx] : null;
                    if (
                        nt === TileType.ROAD ||
                        nt === TileType.CROSSWALK ||
                        nt === TileType.ROAD_UP ||
                        nt === TileType.ROAD_DOWN ||
                        nt === TileType.ROAD_LEFT ||
                        nt === TileType.ROAD_RIGHT
                    ) {
                        return 'burm tile';
                    }
                }
                return 'sidewalk tile';
            }
            default:
                return 'sidewalk tile';
        }
    }

    _spawnTrees() {
        this.trees = [];
        const burmTiles = [];
        const parkTiles = [];

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const attr = this.getTileAttribute(x, y);
                if (attr === 'burm tile') {
                    burmTiles.push({ x, y });
                } else if (attr === 'park tile') {
                    parkTiles.push({ x, y });
                }
            }
        }

        const shuffle = (arr) => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        };

        shuffle(burmTiles);
        shuffle(parkTiles);

        const numBurmTrees = Math.floor(burmTiles.length / 6);
        const numParkTrees = Math.floor(parkTiles.length / 4);

        let treeId = 1;
        for (let i = 0; i < numBurmTrees; i++) {
            const t = burmTiles[i];
            this.trees.push({
                id: treeId++,
                tileX: t.x,
                tileY: t.y,
                x: t.x * TILE_SIZE + TILE_SIZE / 2,
                y: t.y * TILE_SIZE + TILE_SIZE / 2,
                cut: false,
                type: 'burm'
            });
        }
        for (let i = 0; i < numParkTrees; i++) {
            const t = parkTiles[i];
            this.trees.push({
                id: treeId++,
                tileX: t.x,
                tileY: t.y,
                x: t.x * TILE_SIZE + TILE_SIZE / 2,
                y: t.y * TILE_SIZE + TILE_SIZE / 2,
                cut: false,
                type: 'park'
            });
        }
    }

    _spawnShrooms() {
        this.shrooms = [];
        const parkTiles = [];

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.getTileAttribute(x, y) === 'park tile') {
                    parkTiles.push({ x, y });
                }
            }
        }

        for (let i = parkTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [parkTiles[i], parkTiles[j]] = [parkTiles[j], parkTiles[i]];
        }

        const numShrooms = Math.floor(parkTiles.length / 20);
        let shroomId = 1;
        for (let i = 0; i < numShrooms; i++) {
            const t = parkTiles[i];
            this.shrooms.push({
                id: shroomId++,
                tileX: t.x,
                tileY: t.y,
                x: t.x * TILE_SIZE + TILE_SIZE / 2,
                y: t.y * TILE_SIZE + TILE_SIZE / 2,
                collected: false
            });
        }
    }

    _drawShroom(ctx, x, y) {
        if (window.game && window.game.spriteManager) {
            const shroomImg = window.game.spriteManager.getImage('shroom');
            if (shroomImg && (shroomImg.complete || shroomImg instanceof HTMLCanvasElement)) {
                ctx.drawImage(shroomImg, x - 12, y - 12, 24, 24);
                return;
            }
        }
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(x - 3, y, 6, 8);
        ctx.fillStyle = '#d946ef';
        ctx.beginPath();
        ctx.arc(x, y - 2, 8, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x - 4, y - 6, 2, 2);
        ctx.fillRect(x + 2, y - 5, 2, 2);
    }

    regenerate() {
        this.generate();
        this._catalogBuildings();
        this._spawnTrees();
        this._spawnShrooms();
    }

    _placeProceduralBuildings() {
        let buildingIndex = 0;
        const sizes = [[4, 4], [3, 3], [2, 2], [2, 3], [3, 2]];
        
        for (let attempt = 0; attempt < 800; attempt++) {
            const size = sizes[Math.floor(Math.random() * sizes.length)];
            const bw = size[0];
            const bh = size[1];
            const bx = Math.floor(Math.random() * MAP_WIDTH);
            const by = Math.floor(Math.random() * MAP_HEIGHT);
            
            if (this._canPlaceBuildingAt(bx, by, bw, bh)) {
                for (let y = 0; y < bh; y++) {
                    for (let x = 0; x < bw; x++) {
                        const wx = wrapTileX(bx + x);
                        const wy = wrapTileY(by + y);
                        this.tiles[wy][wx] = TileType.BUILDING;
                        this.buildingMeta[wy][wx] = buildingIndex;
                    }
                }
                buildingIndex++;
            }
        }
    }

    _canPlaceBuildingAt(bx, by, bw, bh) {
        for (let dy = -1; dy <= bh; dy++) {
            for (let dx = -1; dx <= bw; dx++) {
                const wx = wrapTileX(bx + dx);
                const wy = wrapTileY(by + dy);
                if (this.tiles[wy][wx] !== TileType.GRASS) {
                    return false;
                }
            }
        }
        return true;
    }

    _generateSidewalks() {
        const temp = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(false));
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.tiles[y][x] === TileType.GRASS) {
                    const neighbors = [
                        [y-1, x], [y+1, x], [y, x-1], [y, x+1],
                        [y-1, x-1], [y-1, x+1], [y+1, x-1], [y+1, x+1]
                    ];
                    for (const [ny, nx] of neighbors) {
                        const wnx = wrapTileX(nx);
                        const wny = wrapTileY(ny);
                        const nt = this.tiles[wny][wnx];
                        if (nt !== TileType.GRASS && nt !== TileType.SIDEWALK && nt !== TileType.PARK_PATH) {
                            temp[y][x] = true;
                            break;
                        }
                    }
                }
            }
        }
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (temp[y][x]) {
                    this.tiles[y][x] = TileType.SIDEWALK;
                }
            }
        }
    }

    _getBlockRanges(hRoads, vRoads) {
        const blocks = [];
        const hB = [-1, ...new Set(hRoads), MAP_HEIGHT].sort((a, b) => a - b);
        const vB = [-1, ...new Set(vRoads), MAP_WIDTH].sort((a, b) => a - b);
        for (let i = 0; i < hB.length - 1; i++) {
            for (let j = 0; j < vB.length - 1; j++) {
                const y1 = hB[i]+1, y2 = hB[i+1]-1, x1 = vB[j]+1, x2 = vB[j+1]-1;
                if (y2 - y1 >= 2 && x2 - x1 >= 2) blocks.push({ x1, y1, x2, y2 });
            }
        }
        return blocks;
    }

    _fillBlock(block, colorIdx) {
        const { x1, y1, x2, y2 } = block;
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                if (this.tiles[y][x] === TileType.GRASS) {
                    if (y > y1 && y < y2 && x > x1 && x < x2) {
                        this.tiles[y][x] = TileType.BUILDING;
                        this.buildingMeta[y][x] = colorIdx;
                    } else if (this.tiles[y][x] !== TileType.SIDEWALK) {
                        this.tiles[y][x] = TileType.SIDEWALK;
                    }
                }
            }
        }
    }

    _createParks() {
        this.parkBlocks = [];
        let pId = 1;
        for (let py = 8; py < MAP_HEIGHT - 6; py += 20) {
            for (let px = 8; px < MAP_WIDTH - 6; px += 20) {
                this.parkBlocks.push({
                    id: `park_${pId++}`,
                    x1: px, y1: py, x2: px + 4, y2: py + 4
                });
            }
        }
        for (const park of this.parkBlocks) {
            for (let y = park.y1; y <= park.y2; y++)
                for (let x = park.x1; x <= park.x2; x++)
                    if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH && this.tiles[y][x] === TileType.BUILDING) {
                        this.tiles[y][x] = TileType.GRASS;
                        this.buildingMeta[y][x] = -1;
                    }
            const midY = Math.floor((park.y1+park.y2)/2), midX = Math.floor((park.x1+park.x2)/2);
            for (let x = park.x1; x <= park.x2; x++)
                if (midY >= 0 && midY < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH &&
                    this.tiles[midY][x] !== TileType.ROAD && this.tiles[midY][x] !== TileType.SIDEWALK)
                    this.tiles[midY][x] = TileType.PARK_PATH;
            for (let y = park.y1; y <= park.y2; y++)
                if (y >= 0 && y < MAP_HEIGHT && midX >= 0 && midX < MAP_WIDTH &&
                    this.tiles[y][midX] !== TileType.ROAD && this.tiles[y][midX] !== TileType.SIDEWALK)
                    this.tiles[y][midX] = TileType.PARK_PATH;
        }
    }

    isWalkable(tileX, tileY, curTX, curTY, lenient = false) {
        if (window.pirateMode || (window.cultMode && this.islandTiles && this.islandTiles.has(`${wrapTileX(tileX)},${wrapTileY(tileY)}`))) return true;
        if (tileX === undefined || tileY === undefined || isNaN(tileX) || isNaN(tileY)) return false;
        const wx = wrapTileX(tileX);
        const wy = wrapTileY(tileY);
        if (!this.tiles || !this.tiles[wy]) return false;
        const t = this.tiles[wy][wx];
        if (t === undefined) return false;
        
        // Lake tile check: acts like a building/obstacle for regular walking, but ducky can swim over!
        if (t === TileType.LAKE) {
            const isDucky = window.game && window.game.player && (
                window.game.player.characterClass === 'duck' || 
                (window.currentUserAvatar || localStorage.getItem('trashMasterAvatar') || '').toLowerCase().includes('duck')
            );
            return isDucky;
        }

        if (curTX === undefined || curTY === undefined) {
            if (t === TileType.BUILDING) return false;
            if (t === TileType.BUILDING_DOOR) {
                for (const bldg of this.buildings) {
                    if (bldg.doorTiles.some(d => d.x === wx && d.y === wy)) {
                        return this.openDoors.has(bldg.id);
                    }
                }
                return false;
            }
            return true;
        }

        const curWX = wrapTileX(curTX);
        const curWY = wrapTileY(curTY);

        const bldgA = this.getBuildingAtTile(curWX, curWY);
        const bldgB = this.getBuildingAtTile(wx, wy);

        if (!bldgA && !bldgB) {
            return t !== TileType.BUILDING && t !== TileType.BUILDING_DOOR;
        }

        if (!bldgA && bldgB) {
            const isOpen = this.openDoors.has(bldgB.id);
            if (lenient) return isOpen;
            const isDoor = bldgB.doorTiles.some(d => d.x === wx && d.y === wy) || 
                           bldgB.doorTiles.some(d => d.x === curWX && d.y === curWY);
            return isOpen && isDoor;
        }

        if (bldgA && !bldgB) {
            const isOpen = this.openDoors.has(bldgA.id);
            if (lenient) return isOpen;
            const isDoor = bldgA.doorTiles.some(d => d.x === wx && d.y === wy) || 
                           bldgA.doorTiles.some(d => d.x === curWX && d.y === curWY);
            return isOpen && isDoor;
        }

        if (bldgA && bldgB) {
            return bldgA.id === bldgB.id;
        }

        return false;
    }

    getTile(tileX, tileY) {
        return this.tiles[wrapTileY(tileY)][wrapTileX(tileX)];
    }

    getIslandGreenTiles() {
        const greenTiles = [];
        if (!this.tiles) return greenTiles;
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.tiles[y][x] === TileType.BUILDING) {
                    greenTiles.push({
                        tileX: x,
                        tileY: y,
                        x: x * TILE_SIZE + TILE_SIZE / 2,
                        y: y * TILE_SIZE + TILE_SIZE / 2
                    });
                }
            }
        }
        return greenTiles;
    }

    isParkTile(tx, ty) {
        if (!this.parkBlocks) return null;
        for (const park of this.parkBlocks) {
            if (tx >= park.x1 && tx <= park.x2 && ty >= park.y1 && ty <= park.y2) {
                return park.id;
            }
        }
        return null;
    }

    render(ctx, camera, player) {
        const startTX = Math.floor(camera.x / TILE_SIZE);
        const startTY = Math.floor(camera.y / TILE_SIZE);
        const tilesW = Math.ceil(camera.width / TILE_SIZE) + 2;
        const tilesH = Math.ceil(camera.height / TILE_SIZE) + 2;

        let playerBldgId = -1;
        if (player) {
            const pb = this.getBuildingAtTile(player.getTileX(), player.getTileY());
            if (pb && this.openDoors.has(pb.id)) {
                playerBldgId = pb.id;
            }
        }
        this._playerInsideBuildingId = playerBldgId;

        for (let dy = 0; dy < tilesH; dy++) {
            for (let dx = 0; dx < tilesW; dx++) {
                const worldTX = startTX + dx;
                const worldTY = startTY + dy;
                const sx = worldTX * TILE_SIZE - camera.x;
                const sy = worldTY * TILE_SIZE - camera.y;

                if (window.pirateMode && worldTY >= MAP_HEIGHT) {
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
                    continue;
                }

                const tx = wrapTileX(worldTX);
                const ty = wrapTileY(worldTY);
                this._drawTile(ctx, this.tiles[ty][tx], sx, sy, tx, ty);

                // Draw illegal dump park highlight overlay on main map
                if (window.game && window.game.crimeManager && window.game.crimeManager.activeTask && window.game.crimeManager.activeTask.type === 'illegal_dump' && this.parkBlocks) {
                    const targetParkId = window.game.crimeManager.activeTask.targetParkId;
                    const park = this.parkBlocks.find(p => p.id === targetParkId);
                    if (park && tx >= park.x1 && tx <= park.x2 && ty >= park.y1 && ty <= park.y2) {
                        const pulse = Math.sin(performance.now() / 200) * 0.2 + 0.3;
                        ctx.fillStyle = `rgba(255, 69, 0, ${pulse})`;
                        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }

        // Render Southern Edge Black Border & Precipice Overlay in Pirate Mode
        if (window.pirateMode) {
            const southEdgeY = MAP_PIXEL_H - camera.y;
            if (southEdgeY < camera.height) {
                ctx.save();
                // 1. Black space void below southern edge
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, Math.max(0, southEdgeY), camera.width, camera.height - Math.max(0, southEdgeY) + 500);

                // 2. Solid black border along southern edge
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 14;
                ctx.beginPath();
                ctx.moveTo(0, southEdgeY);
                ctx.lineTo(camera.width, southEdgeY);
                ctx.stroke();

                // 3. Pulsing hazard line
                const pulse = Math.sin(performance.now() / 120) * 0.4 + 0.6;
                ctx.strokeStyle = `rgba(255, 68, 0, ${pulse})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(0, southEdgeY - 2);
                ctx.lineTo(camera.width, southEdgeY - 2);
                ctx.stroke();

                // 4. Southern edge warning label
                ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
                ctx.font = 'bold 10px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('⚠️ EDGE OF THE EARTH — DO NOT SAIL PAST! 🌊☠️', camera.width / 2, southEdgeY - 14);

                ctx.restore();
            }
        }
    }

    openBuildingDoor(buildingId) {
        this.openDoors.add(buildingId);
    }

    getBuildingAtDoor(tileX, tileY) {
        const wx = wrapTileX(tileX);
        const wy = wrapTileY(tileY);
        for (const bldg of this.buildings) {
            if (bldg.doorTiles.some(d => d.x === wx && d.y === wy)) {
                return bldg;
            }
        }
        return null;
    }

    getBuildingAtTile(tileX, tileY) {
        const wx = wrapTileX(tileX);
        const wy = wrapTileY(tileY);
        for (const bldg of this.buildings) {
            if (bldg.tiles.some(t => t.x === wx && t.y === wy)) {
                return bldg;
            }
        }
        return null;
    }

    renderAddresses(ctx, camera) {
        const time = performance.now() / 1000;
        const camCenterX = camera.x + camera.width / 2;
        const camCenterY = camera.y + camera.height / 2;
        const spriteMgr = (window.game && window.game.spriteManager) ? window.game.spriteManager : null;

        // 1. Render Floating Overhead Sprites & Badges for all Specialized Buildings & Restaurants
        for (const bldg of this.buildings) {
            if (!bldg || !bldg.tiles || bldg.tiles.length === 0) continue;
            const info = window.getBuildingVisualInfo ? window.getBuildingVisualInfo(bldg.type) : null;
            if (!info) continue;

            // Calculate center of building in pixels
            let sumX = 0, sumY = 0;
            for (const t of bldg.tiles) {
                sumX += t.x;
                sumY += t.y;
            }
            const bldgCenterX = (sumX / bldg.tiles.length + 0.5) * TILE_SIZE;
            const bldgCenterY = (sumY / bldg.tiles.length + 0.5) * TILE_SIZE;

            // Toroidal wrapping relative to camera center
            let dX = bldgCenterX - camCenterX;
            let dY = bldgCenterY - camCenterY;
            if (!window.pirateMode) {
                if (dX > MAP_PIXEL_W / 2) dX -= MAP_PIXEL_W;
                else if (dX < -MAP_PIXEL_W / 2) dX += MAP_PIXEL_W;
                if (dY > MAP_PIXEL_H / 2) dY -= MAP_PIXEL_H;
                else if (dY < -MAP_PIXEL_H / 2) dY += MAP_PIXEL_H;
            }

            const screenX = camera.width / 2 + dX;
            const screenY = camera.height / 2 + dY;

            // Skip if offscreen
            if (screenX < -150 || screenX > camera.width + 150 || screenY < -150 || screenY > camera.height + 150) continue;

            ctx.save();
            const bob = Math.sin(time * 3.2 + bldg.id * 1.5) * 5;
            const floatY = screenY - 24 + bob;

            // 1a. Glowing ground/roof shadow beneath floating sprite
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(screenX, screenY + 4, 18, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // 1b. Glowing Halo / Sprite Backdrop
            ctx.fillStyle = info.borderColor || '#00ffcc';
            ctx.shadowColor = info.color || '#00ffcc';
            ctx.shadowBlur = 12;

            // 1c. Draw Sprite Image
            const spriteSize = 36;
            let img = spriteMgr && spriteMgr.images ? spriteMgr.images[info.spriteKey] : null;
            if (img && (img.complete || img.naturalWidth > 0 || img.width > 0)) {
                ctx.drawImage(img, screenX - spriteSize / 2, floatY - spriteSize / 2 - 10, spriteSize, spriteSize);
            } else {
                // Fallback Emoji / Icon
                ctx.font = '22px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(info.icon || '🏢', screenX, floatY - 10);
            }

            // 1d. Stylized Retro Nameplate Badge
            const badgeText = `${info.icon} ${info.label}`;
            ctx.font = 'bold 7px "Press Start 2P", monospace';
            const textWidth = ctx.measureText(badgeText).width;
            const badgeW = textWidth + 14;
            const badgeH = 16;
            const badgeX = screenX - badgeW / 2;
            const badgeY = floatY + 12;

            ctx.fillStyle = 'rgba(10, 15, 28, 0.92)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
            else ctx.rect(badgeX, badgeY, badgeW, badgeH);
            ctx.fill();

            ctx.strokeStyle = info.borderColor || '#00ffcc';
            ctx.lineWidth = 1.8;
            ctx.shadowBlur = 6;
            ctx.shadowColor = info.color || '#00ffcc';
            ctx.stroke();

            ctx.fillStyle = info.color || '#ffffff';
            ctx.shadowBlur = 0;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, screenX, badgeY + badgeH / 2 + 1);

            ctx.restore();
        }

        // 2. Render Door Addresses for all buildings
        for (const bldg of this.buildings) {
            if (bldg.doorTiles.length === 0) continue;
            const door = bldg.doorTiles[0];

            let dX = (door.x * TILE_SIZE + TILE_SIZE / 2) - camCenterX;
            let dY = (door.y * TILE_SIZE + TILE_SIZE / 2) - camCenterY;
            if (!window.pirateMode) {
                if (dX > MAP_PIXEL_W / 2) dX -= MAP_PIXEL_W;
                else if (dX < -MAP_PIXEL_W / 2) dX += MAP_PIXEL_W;
                if (dY > MAP_PIXEL_H / 2) dY -= MAP_PIXEL_H;
                else if (dY < -MAP_PIXEL_H / 2) dY += MAP_PIXEL_H;
            }

            const sx = camera.width / 2 + dX - TILE_SIZE / 2;
            const sy = camera.height / 2 + dY - TILE_SIZE / 2;

            if (sx < -100 || sx > camera.width + 100 || sy < -100 || sy > camera.height + 100) continue;

            let text = bldg.address;
            let color = this.openDoors.has(bldg.id) ? '#00ff88' : '#ffcc00';

            if (window.crimeMode) {
                if (bldg.id === 0) {
                    text = `BANK - ${bldg.address}`;
                    color = '#ffd700';
                } else if (bldg.id === 1) {
                    text = `POLICE - ${bldg.address}`;
                    color = '#3388ff';
                }
            }

            ctx.save();
            ctx.font = '7px "Press Start 2P", monospace';
            const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(sx - 2, sy - 14, textWidth + 8, 14, 3);
            else ctx.rect(sx - 2, sy - 14, textWidth + 8, 14);
            ctx.fill();

            ctx.fillStyle = color;
            ctx.textAlign = 'left';
            ctx.fillText(text, sx + 2, sy - 4);
            ctx.restore();
        }
    }

    _drawWaterTile(ctx, sx, sy, tx, ty, s) {
        const waveTime = performance.now() / 800;
        const waveOffset = Math.sin(waveTime + tx * 0.5 + ty * 0.3) * 3;

        // Ocean Water Deep Blue
        ctx.fillStyle = '#0f4c81';
        ctx.fillRect(sx, sy, s, s);

        // Wave lines & foam ripples
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.28)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(sx + 4, sy + s * 0.3 + waveOffset);
        ctx.bezierCurveTo(sx + s * 0.3, sy + s * 0.2 + waveOffset, sx + s * 0.6, sy + s * 0.4 + waveOffset, sx + s - 4, sy + s * 0.3 + waveOffset);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sx + 8, sy + s * 0.7 - waveOffset);
        ctx.bezierCurveTo(sx + s * 0.4, sy + s * 0.8 - waveOffset, sx + s * 0.7, sy + s * 0.6 - waveOffset, sx + s - 8, sy + s * 0.75 - waveOffset);
        ctx.stroke();

        if ((tx * 11 + ty * 17) % 7 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.fillRect(sx + ((tx * 13) % (s - 8)), sy + ((ty * 19) % (s - 8)), 4, 2);
        }
    }

    _drawBeachTile(ctx, sx, sy, tx, ty, s) {
        // Golden Sandy Beach Shoreline
        ctx.fillStyle = '#e6ca65';
        ctx.fillRect(sx, sy, s, s);

        // Sand grains
        ctx.fillStyle = '#d4b853';
        const seed = (tx * 7 + ty * 13) % 5;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(sx + ((seed + i * 13) % (s - 4)), sy + ((seed + i * 9) % (s - 4)), 2, 2);
        }

        if ((tx * 5 + ty * 11) % 13 === 0) {
            ctx.fillStyle = '#f4ebd0';
            ctx.beginPath();
            ctx.arc(sx + s * 0.4, sy + s * 0.4, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw palm trees along beach shores of islands
        if ((tx * 11 + ty * 17) % 5 === 0) {
            this._drawPalmTree(ctx, sx + s * 0.5, sy + s * 0.5);
        }
    }

    _drawIslandTile(ctx, sx, sy, tx, ty, s) {
        // Tropical Island Green
        ctx.fillStyle = '#2a9d8f';
        ctx.fillRect(sx, sy, s, s);

        ctx.fillStyle = '#218376';
        ctx.fillRect(sx + 2, sy + 2, s - 4, s - 4);

        // Draw palm trees on island tiles (ensuring every island has lush palm trees)
        if ((tx * 7 + ty * 13) % 3 === 0 || (tx + ty) % 4 === 0) {
            this._drawPalmTree(ctx, sx + s / 2, sy + s / 2);
        }
    }

    _drawPalmTree(ctx, x, y) {
        ctx.save();
        ctx.strokeStyle = '#6e4726';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y + 12);
        ctx.quadraticCurveTo(x + 4, y, x + 2, y - 10);
        ctx.stroke();

        ctx.fillStyle = '#1b4332';
        const topX = x + 2;
        const topY = y - 10;

        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            ctx.beginPath();
            ctx.arc(topX + Math.cos(angle) * 10, topY + Math.sin(angle) * 8, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _drawIceWallTile(ctx, sx, sy, tx, ty, s) {
        ctx.save();
        const iceGrad = ctx.createLinearGradient(sx, sy, sx, sy + s);
        iceGrad.addColorStop(0, '#a5f3fc');
        iceGrad.addColorStop(0.5, '#38bdf8');
        iceGrad.addColorStop(1, '#0284c7');
        ctx.fillStyle = iceGrad;
        ctx.fillRect(sx, sy, s, s);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(sx, sy + s);
        ctx.lineTo(sx + 10, sy + 12);
        ctx.lineTo(sx + 22, sy + s * 0.7);
        ctx.lineTo(sx + 35, sy + 4);
        ctx.lineTo(sx + 50, sy + s * 0.8);
        ctx.lineTo(sx + s, sy + 16);
        ctx.lineTo(sx + s, sy + s);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
        ctx.beginPath();
        ctx.moveTo(sx + 8, sy + s);
        ctx.lineTo(sx + 14, sy + s + 12);
        ctx.lineTo(sx + 20, sy + s);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(sx + 38, sy + s);
        ctx.lineTo(sx + 44, sy + s + 16);
        ctx.lineTo(sx + 50, sy + s);
        ctx.fill();

        if (tx === 31 || tx === 32) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🧊 GIANT ICE WALL 🧊', sx + s / 2, sy + s / 2);
        }
        ctx.restore();
    }

    _drawTile(ctx, tile, sx, sy, tx, ty) {
        const s = TILE_SIZE;

        if (this.islandTiles && this.islandTiles.has(`${tx},${ty}`) && !window.pirateMode) {
            const bldg = this.getBuildingAtTile(tx, ty);
            if (bldg && (bldg.type === 'fast_food' || bldg.type === 'goose' || bldg.type === 'zippy_ds' || bldg.type === 'chinos_steaks' || bldg.type === 'rats_steaks')) {
                if (tile === TileType.BUILDING_DOOR) {
                    ctx.fillStyle = '#ffaa00';
                    ctx.fillRect(sx, sy, s, s);
                    ctx.fillStyle = '#000';
                    ctx.font = 'bold 8px "Press Start 2P", monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('DOOR', sx + s/2, sy + s/2 + 3);
                    return;
                }
                ctx.fillStyle = '#d97706';
                ctx.fillRect(sx, sy, s, s);
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 2;
                ctx.strokeRect(sx + 1, sy + 1, s - 2, s - 2);
                return;
            }
            switch (tile) {
                case TileType.ROAD:
                case TileType.ROAD_UP:
                case TileType.ROAD_DOWN:
                case TileType.ROAD_LEFT:
                case TileType.ROAD_RIGHT:
                case TileType.CROSSWALK:
                    this._drawWaterTile(ctx, sx, sy, tx, ty, s);
                    return;
                case TileType.SIDEWALK:
                    this._drawBeachTile(ctx, sx, sy, tx, ty, s);
                    return;
                case TileType.BUILDING:
                case TileType.BUILDING_DOOR:
                    this._drawIslandTile(ctx, sx, sy, tx, ty, s);
                    return;
                default:
                    this._drawWaterTile(ctx, sx, sy, tx, ty, s);
                    return;
            }
        }

        if (window.pirateMode) {
            if (ty === 0) {
                this._drawIceWallTile(ctx, sx, sy, tx, ty, s);
                return;
            }

            const bldg = this.getBuildingAtTile(tx, ty);
            if (bldg && bldg.type === 'dump') {
                this._drawWaterTile(ctx, sx, sy, tx, ty, s);
                // Draw Floating Sea Dump Dock / Wooden Barge
                ctx.save();
                ctx.fillStyle = '#6e4726';
                ctx.fillRect(sx + 2, sy + 2, s - 4, s - 4);
                ctx.strokeStyle = '#4a2f18';
                ctx.lineWidth = 3;
                ctx.strokeRect(sx + 2, sy + 2, s - 4, s - 4);

                const dumpImg = (window.game && window.game.spriteManager) ? window.game.spriteManager.getImage('dump') : null;
                if (dumpImg && (dumpImg.complete || dumpImg instanceof HTMLCanvasElement)) {
                    ctx.drawImage(dumpImg, sx + s / 2 - 16, sy + s / 2 - 20, 32, 32);
                } else {
                    ctx.fillStyle = '#222222';
                    ctx.fillRect(sx + 12, sy + 12, s - 24, s - 24);
                }

                ctx.fillStyle = '#00ff88';
                ctx.font = 'bold 9px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('🗑️ DUMP', sx + s / 2, sy + s - 5);

                const pulse = Math.sin(performance.now() / 150) * 3;
                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(sx + s / 2, sy + s / 2, 28 + pulse, 0, Math.PI * 2);
                ctx.stroke();

                ctx.restore();
                return;
            }
            switch (tile) {
                case TileType.ROAD:
                case TileType.ROAD_UP:
                case TileType.ROAD_DOWN:
                case TileType.ROAD_LEFT:
                case TileType.ROAD_RIGHT:
                case TileType.CROSSWALK:
                    this._drawWaterTile(ctx, sx, sy, tx, ty, s);
                    return;
                case TileType.SIDEWALK:
                    this._drawBeachTile(ctx, sx, sy, tx, ty, s);
                    return;
                case TileType.BUILDING:
                case TileType.BUILDING_DOOR:
                    this._drawIslandTile(ctx, sx, sy, tx, ty, s);
                    return;
                default:
                    this._drawWaterTile(ctx, sx, sy, tx, ty, s);
                    return;
            }
        }

        switch (tile) {
            case TileType.ROAD:
            case TileType.ROAD_UP:
            case TileType.ROAD_DOWN:
            case TileType.ROAD_LEFT:
            case TileType.ROAD_RIGHT:
                let roadColor = TILE_COLORS[tile];
                ctx.fillStyle = roadColor; ctx.fillRect(sx,sy,s,s);
                if ((tx+ty)%4<2) { ctx.fillStyle='#666';
                    if(ty%2===0) ctx.fillRect(sx+s/2-1,sy+2,2,s-4);
                    else ctx.fillRect(sx+2,sy+s/2-1,s-4,2);
                } break;
            case TileType.SIDEWALK:
                let sidewalkColor = TILE_COLORS[TileType.SIDEWALK];
                let sidewalkDetail = TILE_DETAIL_COLORS[TileType.SIDEWALK];
                ctx.fillStyle = sidewalkColor; ctx.fillRect(sx,sy,s,s);
                ctx.strokeStyle=sidewalkDetail; ctx.lineWidth=0.5;
                ctx.strokeRect(sx+1,sy+1,s-2,s-2);
                if((tx+ty)%3===0) ctx.strokeRect(sx+s/4,sy+s/4,s/2,s/2);
                if (this.trees && this.trees.length > 0) {
                    const tree = this.trees.find(tr => tr.tileX === tx && tr.tileY === ty && !tr.cut);
                    if (tree) {
                        this._drawTree(ctx, sx + s/2, sy + s/2, this.theme);
                    }
                }
                break;
            case TileType.GRASS:
                let grassColor = TILE_COLORS[TileType.GRASS];
                let grassDetail = TILE_DETAIL_COLORS[TileType.GRASS];
                ctx.fillStyle = grassColor; ctx.fillRect(sx,sy,s,s);
                ctx.fillStyle=grassDetail;
                const seed=(tx*7+ty*13)%5;
                for(let i=0;i<3;i++){ctx.fillRect(sx+((seed+i*11)%s),sy+((seed+i*7)%s),1,3);}
                if((tx*3+ty*7)%17===0){ctx.fillStyle='#e8d44d';ctx.fillRect(sx+10,sy+12,3,3);}
                else if((tx*5+ty*11)%19===0){ctx.fillStyle='#d46a6a';ctx.fillRect(sx+20,sy+8,3,3);}
                if (this.trees && this.trees.length > 0) {
                    const tree = this.trees.find(tr => tr.tileX === tx && tr.tileY === ty && !tr.cut);
                    if (tree) {
                        this._drawTree(ctx, sx + s/2, sy + s/2, this.theme);
                    }
                }
                if (this.shrooms && this.shrooms.length > 0) {
                    const shroom = this.shrooms.find(sh => sh.tileX === tx && sh.tileY === ty && !sh.collected);
                    if (shroom) {
                        this._drawShroom(ctx, sx + s/2, sy + s/2);
                    }
                }
                break;
            case TileType.BUILDING: {
                const bldg = this.getBuildingAtTile(tx, ty);
                if (bldg && this._playerInsideBuildingId === bldg.id) {
                    ctx.fillStyle = '#8b7355'; ctx.fillRect(sx,sy,s,s);
                    ctx.strokeStyle = '#7a6548'; ctx.lineWidth = 1; ctx.strokeRect(sx,sy,s,s);
                    break;
                }
                
                if (window.crimeMode && bldg) {
                    if (bldg.id === 0) {
                        ctx.fillStyle = '#d4af37';
                        ctx.fillRect(sx, sy, s, s);
                        ctx.strokeStyle = '#aa8800';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(sx + 0.5, sy + 0.5, s - 1, s - 1);
                        ctx.fillStyle = '#ffd700';
                        ctx.fillRect(sx + 4, sy + 4, 8, 4);
                        ctx.fillRect(sx + 16, sy + 16, 8, 4);
                        break;
                    } else if (bldg.id === 1) {
                        ctx.fillStyle = '#0f2b5c';
                        ctx.fillRect(sx, sy, s, s);
                        ctx.strokeStyle = '#05132d';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(sx + 0.5, sy + 0.5, s - 1, s - 1);
                        ctx.fillStyle = '#1c4280';
                        ctx.fillRect(sx + 4, sy + 4, 8, 4);
                        ctx.fillRect(sx + 16, sy + 16, 8, 4);
                        break;
                    }
                }

                const ci = (this.buildingMeta && this.buildingMeta[ty]) ? this.buildingMeta[ty][tx] : -1;
                let c = BUILDING_COLORS[(ci !== undefined && ci >= 0) ? ci : 0] || BUILDING_COLORS[0];
                let isHospital = bldg && bldg.type === 'hospital';
                let isAirport = bldg && bldg.type === 'airport';
                let isPulpMill = bldg && bldg.type === 'pulp_mill';
                let isBlackMarket = bldg && bldg.type === 'black_market';
                
                if (isHospital) {
                    ctx.fillStyle = '#e8e8e8';
                } else if (isAirport) {
                    ctx.fillStyle = '#b0b8c0';
                } else if (isPulpMill) {
                    ctx.fillStyle = '#8b5a2b';
                } else if (isBlackMarket) {
                    ctx.fillStyle = '#12061c';
                } else {
                    ctx.fillStyle = c.base;
                }
                ctx.fillRect(sx, sy, s, s);
                ctx.fillStyle='#2a2a3a';
                for(let wy=4;wy<s-4;wy+=8) for(let wx=4;wx<s-4;wx+=8){
                    ctx.fillRect(sx+wx,sy+wy,4,4);
                    if((tx+ty+wx+wy)%3!==0){ctx.fillStyle='#ffd86e44';ctx.fillRect(sx+wx,sy+wy,4,4);ctx.fillStyle='#2a2a3a';}
                }
                ctx.strokeStyle=c.dark;ctx.lineWidth=1;ctx.strokeRect(sx+.5,sy+.5,s-1,s-1);
                break; }
            case TileType.BUILDING_DOOR: {
                const bldg2 = this.getBuildingAtTile(tx, ty);
                if (bldg2 && this._playerInsideBuildingId === bldg2.id) {
                    ctx.fillStyle = '#8b7355'; ctx.fillRect(sx,sy,s,s);
                    ctx.strokeStyle = '#7a6548'; ctx.lineWidth = 1; ctx.strokeRect(sx,sy,s,s);
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
                    ctx.fillStyle = TILE_COLORS[TileType.BUILDING_DOOR];
                    ctx.fillRect(sx, sy, s, s);
                    ctx.strokeStyle = '#5a4530';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(sx + 1, sy + 1, s - 2, s - 2);
                    ctx.fillStyle = '#ffd700';
                    ctx.beginPath();
                    ctx.arc(sx + s - 16, sy + s / 2, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#b59300';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                break; }
            case TileType.CROSSWALK:
                ctx.fillStyle = TILE_COLORS[TileType.CROSSWALK]; ctx.fillRect(sx,sy,s,s);
                ctx.fillStyle = TILE_DETAIL_COLORS[TileType.CROSSWALK];
                ctx.fillRect(sx+4,sy+s/2-2,s-8,4);
                break;
            case TileType.PARK_PATH:
                ctx.fillStyle = TILE_COLORS[TileType.PARK_PATH]; ctx.fillRect(sx,sy,s,s);
                ctx.fillStyle = TILE_DETAIL_COLORS[TileType.PARK_PATH];
                ctx.fillRect(sx+2,sy+2,s-4,1);
                ctx.fillRect(sx+2,sy+s-3,s-4,1);
                break;
            case TileType.LAKE: {
                ctx.fillStyle = TILE_COLORS[TileType.LAKE];
                ctx.fillRect(sx, sy, s, s);
                // Sparkling ripples
                const wave = Math.sin((performance.now() / 600) + (tx * 0.8) + (ty * 1.1));
                ctx.fillStyle = 'rgba(120, 210, 255, 0.3)';
                ctx.fillRect(sx + 6, sy + 14 + wave * 4, s - 12, 3);
                ctx.fillRect(sx + 14, sy + 38 - wave * 3, s - 28, 2.5);
                break;
            }
        }
    }

    _drawTree(ctx, x, y, theme) {
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(x - 2, y, 4, 12); // Trunk
        ctx.fillStyle = '#2e8b57';
        ctx.beginPath(); ctx.arc(x, y - 4, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3cb371';
        ctx.beginPath(); ctx.arc(x - 4, y - 8, 8, 0, Math.PI * 2); ctx.fill();
    }

    _catalogBuildings() {
        this.buildings = [];
        const visited = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(false));
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let letterIdx = 0;
        let numCounter = 100;

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (visited[y][x]) continue;
                if (this.tiles[y][x] !== TileType.BUILDING && this.tiles[y][x] !== TileType.BUILDING_DOOR) continue;

                const tiles = [];
                const stack = [{ x, y }];
                while (stack.length > 0) {
                    const p = stack.pop();
                    if (p.x < 0 || p.x >= MAP_WIDTH || p.y < 0 || p.y >= MAP_HEIGHT) continue;
                    if (visited[p.y][p.x]) continue;
                    const t = this.tiles[p.y][p.x];
                    if (t !== TileType.BUILDING && t !== TileType.BUILDING_DOOR) continue;
                    visited[p.y][p.x] = true;
                    tiles.push({ x: p.x, y: p.y });
                    stack.push({ x: p.x + 1, y: p.y });
                    stack.push({ x: p.x - 1, y: p.y });
                    stack.push({ x: p.x, y: p.y + 1 });
                    stack.push({ x: p.x, y: p.y - 1 });
                }

                if (tiles.length > 0) {
                    const letter = letters[letterIdx % letters.length];
                    const address = letter + numCounter;
                    
                    let doorTile = null;
                    for (const tile of tiles) {
                        const neighbors = [
                            { x: tile.x + 1, y: tile.y },
                            { x: tile.x - 1, y: tile.y },
                            { x: tile.x, y: tile.y + 1 },
                            { x: tile.x, y: tile.y - 1 }
                        ];
                        let isAdjToSidewalk = false;
                        for (const n of neighbors) {
                            const nwx = wrapTileX(n.x);
                            const nwy = wrapTileY(n.y);
                            if (this.tiles[nwy][nwx] === TileType.SIDEWALK) {
                                isAdjToSidewalk = true;
                                break;
                            }
                        }
                        if (isAdjToSidewalk) {
                            doorTile = tile;
                            break;
                        }
                    }

                    if (!doorTile) {
                        doorTile = tiles[0];
                    }

                    this.tiles[doorTile.y][doorTile.x] = TileType.BUILDING_DOOR;

                    let minTileX = Infinity, minTileY = Infinity, maxTileX = -Infinity, maxTileY = -Infinity;
                    for (const t of tiles) {
                        if (t.x < minTileX) minTileX = t.x;
                        if (t.x > maxTileX) maxTileX = t.x;
                        if (t.y < minTileY) minTileY = t.y;
                        if (t.y > maxTileY) maxTileY = t.y;
                    }
                    const bx = minTileX * TILE_SIZE;
                    const by = minTileY * TILE_SIZE;
                    const bw = (maxTileX - minTileX + 1) * TILE_SIZE;
                    const bh = (maxTileY - minTileY + 1) * TILE_SIZE;

                    this.buildings.push({
                        id: this.buildings.length,
                        address,
                        tiles,
                        doorTiles: [doorTile],
                        type: 'default',
                        x: bx,
                        y: by,
                        width: bw,
                        height: bh
                    });
                    numCounter += Math.floor(Math.random() * 20) + 10;
                    if (numCounter > 999) { numCounter = 100; letterIdx++; }
                    if (numCounter % 100 === 0) numCounter++;
                }
            }
        }
        
        const count = this.buildings.length;
        if (count > 0) {
            this.buildings[0].type = 'bank';
            if (count > 1) this.buildings[1].type = 'police';
            
            let availableIds = [];
            for (let i = 2; i < count; i++) availableIds.push(i);
            
            let centerBldg = null;
            let minDist = Infinity;
            for (const bldg of this.buildings) {
                let cx = 0, cy = 0;
                for (const t of bldg.tiles) { cx += t.x; cy += t.y; }
                cx /= bldg.tiles.length;
                cy /= bldg.tiles.length;
                const dist = Math.sqrt((cx - 32)**2 + (cy - 32)**2);
                if (dist < minDist) {
                    minDist = dist;
                    centerBldg = bldg;
                }
            }
            let centerBuildingType = 'cityhall';
            let landmarksToAssign = ['art_museum', 'liberty_bell', 'one_liberty', 'franklin_institute', 'station'];
            
            if (this.theme === 'dahgbad') {
                centerBuildingType = 'burj_khalifa';
                landmarksToAssign = ['petra', 'dome_of_rock', 'pyramids', 'burj_al_arab', 'kingdom_centre'];
            } else if (this.theme === 'cucaracha') {
                centerBuildingType = 'christ_redeemer';
                landmarksToAssign = ['machu_picchu', 'obelisco_ba', 'torre_entel', 'palacio_salvo', 'congresso_nacional'];
            }

            if (centerBldg) {
                centerBldg.type = centerBuildingType;
                availableIds = availableIds.filter(id => id !== centerBldg.id);
            }
            
            for (let i = availableIds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availableIds[i], availableIds[j]] = [availableIds[j], availableIds[i]];
            }
            
            for (const type of landmarksToAssign) {
                if (availableIds.length > 0) {
                    this.buildings[availableIds.pop()].type = type;
                }
            }
            
            if (availableIds.length > 0) {
                this.buildings[availableIds.pop()].type = 'hospital';
            }
            if (availableIds.length > 0) {
                this.buildings[availableIds.pop()].type = 'airport';
            }
            if (availableIds.length > 0) {
                this.buildings[availableIds.pop()].type = 'dump';
            }
            if (availableIds.length > 0) {
                this.buildings[availableIds.pop()].type = 'pulp_mill';
            }
            if (availableIds.length > 0) {
                this.buildings[availableIds.pop()].type = 'black_market';
            }
            if (availableIds.length > 0) {
                this.buildings[availableIds.pop()].type = 'zoo';
            }
            // Assign Chino's Steaks and Rats Steaks directly across from each other at an intersection
            this._assignChinosAndRats(availableIds);

            // Assign Zippy D's (Tier 1, 1 location) and Goose (Tier 2, 1 location)
            // Exactly 4 restaurants total on the map: 1 Zippy D's, 1 Goose, 1 Chino's Steaks, 1 Rats Steaks
            if (availableIds.length > 0) {
                const nextId = availableIds.pop();
                const b = this.buildings.find(x => x.id === nextId);
                if (b) {
                    b.type = 'zippy_ds';
                    b.address = "ZIPPY D'S";
                }
            }
            if (availableIds.length > 0) {
                const nextId = availableIds.pop();
                const b = this.buildings.find(x => x.id === nextId);
                if (b) {
                    b.type = 'goose';
                    b.address = "GOOSE";
                }
            }
            
            // Guarantee a dump building exists on every map
            if (this.buildings.length > 0 && !this.buildings.some(b => b.type === 'dump')) {
                const availableBldg = this.buildings.find(b => b.type === 'default' || b.type === 'normal');
                if (availableBldg) availableBldg.type = 'dump';
                else this.buildings[this.buildings.length - 1].type = 'dump';
            }

            // Guarantee a zoo building exists on every map
            if (this.buildings.length > 0 && !this.buildings.some(b => b.type === 'zoo')) {
                const candidates = this.buildings.filter(b => b.type === 'default' || b.type === 'normal');
                if (candidates.length > 0) {
                    candidates[0].type = 'zoo';
                } else if (this.buildings.length > 3) {
                    this.buildings[this.buildings.length - 2].type = 'zoo';
                } else {
                    this.buildings[0].type = 'zoo';
                }
            }
            // Guarantee a pulp_mill building exists on every map
            if (this.buildings.length > 1 && !this.buildings.some(b => b.type === 'pulp_mill')) {
                const nonDump = this.buildings.find(b => b.type === 'default' || b.type === 'normal' || (!['dump', 'chinos_steaks', 'rats_steaks', 'zippy_ds', 'goose', 'fast_food'].includes(b.type)));
                if (nonDump) nonDump.type = 'pulp_mill';
            }
            // Guarantee a black_market building exists on every map
            if (this.buildings.length > 2 && !this.buildings.some(b => b.type === 'black_market')) {
                const availableBldg = this.buildings.find(b => b.type === 'default' || b.type === 'normal' || (!['dump', 'pulp_mill', 'chinos_steaks', 'rats_steaks', 'zippy_ds', 'goose', 'fast_food', 'bank', 'police', 'hospital', 'airport', 'zoo'].includes(b.type)));
                if (availableBldg) availableBldg.type = 'black_market';
            }
        }
    }

    _assignChinosAndRats(availableIds) {
        if (!this.buildings || this.buildings.length < 2) return;

        // Find all crosswalk intersections
        const intersections = [];
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.tiles[y][x] === TileType.CROSSWALK) {
                    if (y === 0 || this.tiles[y - 1][x] !== TileType.CROSSWALK) {
                        if (x === 0 || this.tiles[y][x - 1] !== TileType.CROSSWALK) {
                            intersections.push({ x: x + 1, y: y + 1 });
                        }
                    }
                }
            }
        }

        let bestPair = null;
        let bestScore = Infinity;

        // Try intersections to find two opposing or adjacent corner buildings across the street
        for (const inter of intersections) {
            const ix = inter.x;
            const iy = inter.y;

            // Quadrants around intersection
            const quads = { nw: null, ne: null, sw: null, se: null };

            for (const bId of availableIds) {
                const b = this.buildings.find(x => x.id === bId);
                if (!b || !b.tiles || b.tiles.length === 0) continue;

                let minD = Infinity;
                let closestTile = null;
                for (const t of b.tiles) {
                    const d = Math.hypot(t.x - ix, t.y - iy);
                    if (d < minD) {
                        minD = d;
                        closestTile = t;
                    }
                }

                if (minD <= 10 && closestTile) {
                    const qKey = (closestTile.y < iy ? 'n' : 's') + (closestTile.x < ix ? 'w' : 'e');
                    if (!quads[qKey] || minD < quads[qKey].minD) {
                        quads[qKey] = { bldg: b, minD, closestTile };
                    }
                }
            }

            // Check pairs across intersection (diagonals, horizontal across street, vertical across street)
            const pairs = [
                [quads.nw, quads.se],
                [quads.ne, quads.sw],
                [quads.nw, quads.ne],
                [quads.sw, quads.se],
                [quads.nw, quads.sw],
                [quads.ne, quads.se]
            ];

            for (const [p1, p2] of pairs) {
                if (p1 && p2 && p1.bldg.id !== p2.bldg.id) {
                    const score = p1.minD + p2.minD;
                    if (score < bestScore) {
                        bestScore = score;
                        bestPair = { b1: p1.bldg, b2: p2.bldg, inter };
                    }
                }
            }
        }

        // Fallback if no intersection pairs found
        if (!bestPair) {
            let minPairDist = Infinity;
            for (let i = 0; i < availableIds.length; i++) {
                for (let j = i + 1; j < availableIds.length; j++) {
                    const b1 = this.buildings.find(x => x.id === availableIds[i]);
                    const b2 = this.buildings.find(x => x.id === availableIds[j]);
                    if (!b1 || !b2) continue;
                    const d = Math.hypot(b1.x - b2.x, b1.y - b2.y) / TILE_SIZE;
                    if (d < minPairDist) {
                        minPairDist = d;
                        bestPair = { b1, b2, inter: { x: (b1.x + b2.x) / (2 * TILE_SIZE), y: (b1.y + b2.y) / (2 * TILE_SIZE) } };
                    }
                }
            }
        }

        if (bestPair) {
            const { b1, b2, inter } = bestPair;
            b1.type = 'chinos_steaks';
            b1.address = "CHINO'S STEAKS";
            b2.type = 'rats_steaks';
            b2.address = "RATS STEAKS";

            const orientDoor = (bldg) => {
                let bestTile = null;
                let minDist = Infinity;
                for (const tile of bldg.tiles) {
                    const neighbors = [
                        { x: tile.x + 1, y: tile.y },
                        { x: tile.x - 1, y: tile.y },
                        { x: tile.x, y: tile.y + 1 },
                        { x: tile.x, y: tile.y - 1 }
                    ];
                    const isAdj = neighbors.some(n => {
                        const wx = wrapTileX(n.x);
                        const wy = wrapTileY(n.y);
                        return this.tiles[wy][wx] === TileType.SIDEWALK || this.tiles[wy][wx] === TileType.CROSSWALK;
                    });
                    if (isAdj) {
                        const d = Math.hypot(tile.x - inter.x, tile.y - inter.y);
                        if (d < minDist) {
                            minDist = d;
                            bestTile = tile;
                        }
                    }
                }
                if (bestTile) {
                    if (bldg.doorTiles) {
                        for (const od of bldg.doorTiles) {
                            this.tiles[od.y][od.x] = TileType.BUILDING;
                        }
                    }
                    this.tiles[bestTile.y][bestTile.x] = TileType.BUILDING_DOOR;
                    bldg.doorTiles = [bestTile];
                }
            };

            orientDoor(b1);
            orientDoor(b2);

            const idx1 = availableIds.indexOf(b1.id);
            if (idx1 !== -1) availableIds.splice(idx1, 1);
            const idx2 = availableIds.indexOf(b2.id);
            if (idx2 !== -1) availableIds.splice(idx2, 1);
        }
    }
}

class GameMap extends BaseMap {
    constructor() {
        if (window.customMapData) {
            return new CustomMap(window.customMapData);
        }
        const theme = (window.travelDestination) ? window.travelDestination.toLowerCase() : 'default';
        if (theme === 'dahgbad') {
            return new DahgbadMap();
        } else if (theme === 'cucaracha') {
            return new CucarachaMap();
        }
        super();
        this.theme = 'default';
        this.regenerate();
    }

    generate() {
        if (!this.islandTiles) this.islandTiles = new Set();
        if (window.pirateMode) {
            this._generatePirateMap();
            if (window.cultMode || window.fastFoodMode) {
                this._ensureGooseFastFoodOnPirateIsland();
            }
            return;
        }

        this.tiles = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => TileType.GRASS)
        );
        this.buildingMeta = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => -1)
        );
        this.roadDirections = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => null)
        );

        const hRoads = [];
        for (let r = 4; r < MAP_HEIGHT - 2; r += 10) { hRoads.push(r, r + 1); }
        const vRoads = [];
        for (let c = 4; c < MAP_WIDTH - 2; c += 10) { vRoads.push(c, c + 1); }

        for (const ry of hRoads) {
            const type = (ry % 2 === 0) ? TileType.ROAD_LEFT : TileType.ROAD_RIGHT;
            for (let x = 0; x < MAP_WIDTH; x++) {
                this.tiles[ry][x] = type;
                this.roadDirections[ry][x] = (ry % 2 === 0) ? [-1, 0] : [1, 0];
            }
        }
        for (const rx of vRoads) {
            const type = (rx % 2 === 0) ? TileType.ROAD_DOWN : TileType.ROAD_UP;
            for (let y = 0; y < MAP_HEIGHT; y++) {
                this.tiles[y][rx] = type;
                this.roadDirections[y][rx] = (rx % 2 === 0) ? [0, 1] : [0, -1];
            }
        }
        for (const ry of hRoads) {
            for (const rx of vRoads) {
                this.tiles[ry][rx] = TileType.CROSSWALK;
                this.roadDirections[ry][rx] = (ry % 2 === 0) ? [-1, 0] : [1, 0];
            }
        }

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.tiles[y][x] !== TileType.ROAD && this.tiles[y][x] !== TileType.ROAD_UP && this.tiles[y][x] !== TileType.ROAD_DOWN && this.tiles[y][x] !== TileType.ROAD_LEFT && this.tiles[y][x] !== TileType.ROAD_RIGHT && this.tiles[y][x] !== TileType.CROSSWALK) {
                    const neighbors = [[y-1,x],[y+1,x],[y,x-1],[y,x+1]];
                    for (const [ny, nx] of neighbors) {
                        if (ny >= 0 && ny < MAP_HEIGHT && nx >= 0 && nx < MAP_WIDTH) {
                            const nt = this.tiles[ny][nx];
                            if (nt === TileType.ROAD || nt === TileType.ROAD_UP || nt === TileType.ROAD_DOWN || nt === TileType.ROAD_LEFT || nt === TileType.ROAD_RIGHT || nt === TileType.CROSSWALK) {
                                this.tiles[y][x] = TileType.SIDEWALK;
                                break;
                            }
                        }
                    }
                }
            }
        }

        let buildingIndex = 0;
        const blockRanges = this._getBlockRanges(hRoads, vRoads);
        for (const block of blockRanges) {
            this._fillBlock(block, buildingIndex % BUILDING_COLORS.length);
            buildingIndex++;
        }
        this._createParks();

        if (window.cultMode) {
            this._generateCultModeIsland();
        }
    }

    _generateCultModeIsland() {
        if (!this.islandTiles) this.islandTiles = new Set();

        const startX = 36;
        const startY = 16;
        const w = 9;
        const h = 9;

        // 1. Water Moat Ring (perimeter)
        for (let y = startY; y < startY + h; y++) {
            for (let x = startX; x < startX + w; x++) {
                const wx = wrapTileX(x);
                const wy = wrapTileY(y);
                const isEdge = (x === startX || x === startX + w - 1 || y === startY || y === startY + h - 1);
                if (isEdge) {
                    this.tiles[wy][wx] = TileType.ROAD;
                    this.islandTiles.add(`${wx},${wy}`);
                }
            }
        }

        // 2. Sandy Beach Perimeter (7x7)
        for (let y = startY + 1; y < startY + h - 1; y++) {
            for (let x = startX + 1; x < startX + w - 1; x++) {
                const wx = wrapTileX(x);
                const wy = wrapTileY(y);
                const isBeachEdge = (x === startX + 1 || x === startX + w - 2 || y === startY + 1 || y === startY + h - 2);
                if (isBeachEdge) {
                    this.tiles[wy][wx] = TileType.SIDEWALK;
                    this.islandTiles.add(`${wx},${wy}`);
                }
            }
        }

        // 3. Tropical Island Core Landmass (5x5)
        for (let y = startY + 2; y < startY + h - 2; y++) {
            for (let x = startX + 2; x < startX + w - 2; x++) {
                const wx = wrapTileX(x);
                const wy = wrapTileY(y);
                this.tiles[wy][wx] = TileType.BUILDING;
                this.islandTiles.add(`${wx},${wy}`);
            }
        }

        // 4. Goose Fast Food Restaurant Building on Island (center 2x2)
        const bldgTiles = [];
        for (let y = startY + 3; y <= startY + 4; y++) {
            for (let x = startX + 3; x <= startX + 4; x++) {
                const wx = wrapTileX(x);
                const wy = wrapTileY(y);
                bldgTiles.push({ x: wx, y: wy });
            }
        }

        const doorWX = wrapTileX(startX + 4);
        const doorWY = wrapTileY(startY + 4);
        this.tiles[doorWY][doorWX] = TileType.BUILDING_DOOR;

        const gooseIslandBldg = {
            id: 888,
            address: 'GOOSE ISLAND FAST FOOD',
            tiles: bldgTiles,
            doorTiles: [{ x: doorWX, y: doorWY }],
            type: 'fast_food',
            x: (startX + 3) * TILE_SIZE,
            y: (startY + 3) * TILE_SIZE,
            width: 2 * TILE_SIZE,
            height: 2 * TILE_SIZE
        };

        this.buildings.push(gooseIslandBldg);
        this.openDoors.add(888);
    }

    _ensureGooseFastFoodOnPirateIsland() {
        if (this.buildings.some(b => b.type === 'fast_food' && b.id === 887)) return;
        const island = (this.pirateIslands && this.pirateIslands.length > 0) ? this.pirateIslands[0] : { startX: 6, startY: 6, w: 4, h: 4 };
        const startX = island.startX;
        const startY = island.startY;

        const bldgTiles = [];
        for (let y = startY; y <= startY + 1; y++) {
            for (let x = startX; x <= startX + 1; x++) {
                const wx = wrapTileX(x);
                const wy = wrapTileY(y);
                bldgTiles.push({ x: wx, y: wy });
                this.tiles[wy][wx] = TileType.BUILDING;
                if (this.islandTiles) this.islandTiles.add(`${wx},${wy}`);
            }
        }

        const doorWX = wrapTileX(startX + 1);
        const doorWY = wrapTileY(startY + 1);
        this.tiles[doorWY][doorWX] = TileType.BUILDING_DOOR;
        const gooseIslandBldg = {
            id: 887,
            address: 'GOOSE PIRATE ISLAND FAST FOOD',
            tiles: bldgTiles,
            doorTiles: [{ x: doorWX, y: doorWY }],
            type: 'fast_food',
            x: startX * TILE_SIZE,
            y: startY * TILE_SIZE,
            width: 2 * TILE_SIZE,
            height: 2 * TILE_SIZE
        };
        this.buildings.push(gooseIslandBldg);
        this.openDoors.add(887);
    }

    _generatePirateMap() {
        if (!this.islandTiles) this.islandTiles = new Set();
        // Initialize 64x64 grid to ocean water (TileType.ROAD)
        this.tiles = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => TileType.ROAD)
        );
        this.buildingMeta = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => -1)
        );
        this.roadDirections = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => null)
        );

        // Generate exactly 12 non-overlapping islands across the map
        const cols = 4;
        const rows = 3;
        const colSpacing = Math.floor(MAP_WIDTH / cols); // 16 tiles
        const rowSpacing = Math.floor(MAP_HEIGHT / rows); // 21 tiles

        let islandIndex = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (islandIndex >= 12) break;

                const baseCx = Math.floor(c * colSpacing + colSpacing / 2);
                const baseCy = Math.floor(r * rowSpacing + rowSpacing / 2);
                const offsetX = Math.floor((Math.random() - 0.5) * 4);
                const offsetY = Math.floor((Math.random() - 0.5) * 4);

                const cx = Math.max(4, Math.min(MAP_WIDTH - 5, baseCx + offsetX));
                const cy = Math.max(4, Math.min(MAP_HEIGHT - 5, baseCy + offsetY));

                // Island dimensions (3x3 to 5x5 core landmass)
                const w = Math.floor(Math.random() * 3) + 3;
                const h = Math.floor(Math.random() * 3) + 3;

                const startX = Math.floor(cx - w / 2);
                const startY = Math.floor(cy - h / 2);

                if (!this.pirateIslands) this.pirateIslands = [];
                this.pirateIslands.push({ startX, startY, w, h, cx, cy });

                // 1. Shoreline perimeter (Sandy Beach / SIDEWALK)
                for (let y = startY - 1; y <= startY + h; y++) {
                    for (let x = startX - 1; x <= startX + w; x++) {
                        const wx = wrapTileX(x);
                        const wy = wrapTileY(y);
                        this.tiles[wy][wx] = TileType.SIDEWALK;
                        this.islandTiles.add(`${wx},${wy}`);
                    }
                }

                // 2. Island Core Landmass (BUILDING)
                for (let y = startY; y < startY + h; y++) {
                    for (let x = startX; x < startX + w; x++) {
                        const wx = wrapTileX(x);
                        const wy = wrapTileY(y);
                        this.tiles[wy][wx] = TileType.BUILDING;
                        this.buildingMeta[wy][wx] = islandIndex % BUILDING_COLORS.length;
                        this.islandTiles.add(`${wx},${wy}`);
                    }
                }

                islandIndex++;
            }
        }

        // Ensure there is a Sea Dump Dock accessible on water for ships
        const dumpTX = 3;
        const dumpTY = 3;

        // Clear 3x3 surrounding tiles to open water
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const wx = wrapTileX(dumpTX + dx);
                const wy = wrapTileY(dumpTY + dy);
                this.tiles[wy][wx] = TileType.ROAD;
            }
        }

        this.tiles[dumpTY][dumpTX] = TileType.BUILDING_DOOR;
        this.buildings.push({
            id: 999,
            address: 'SEA DUMP DOCK',
            tiles: [{ x: dumpTX, y: dumpTY }],
            doorTiles: [{ x: dumpTX, y: dumpTY }],
            type: 'dump',
            x: dumpTX * TILE_SIZE,
            y: dumpTY * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE
        });
    }
}

class CustomMap extends BaseMap {
    constructor(data) {
        super();
        this.theme = (data && data.theme) || 'custom';
        this.data = data;
        if (data) this.loadData(data);
    }

    loadData(data) {
        if (!data) return;
        this.title = data.title || 'Custom Map';
        this.restrictedMode = data.restricted_mode || 'all';

        if (data.tiles) {
            this.tiles = data.tiles;
            this.height = data.tiles.length;
            this.width = data.tiles[0] ? data.tiles[0].length : MAP_WIDTH;
        }
        if (data.buildingMeta) this.buildingMeta = data.buildingMeta;
        if (data.buildings) this.buildings = data.buildings;
        if (data.trees) this.trees = data.trees;
        if (data.objects) this.objects = data.objects;
        if (data.npcs) this.npcs = data.npcs;
        if (data.trash) {
            this.trash = data.trash;
            this.trashItems = data.trash;
        }
        if (data.openDoors) this.openDoors = new Set(data.openDoors);
        if (data.parkBlocks) this.parkBlocks = data.parkBlocks;

        if (!this.buildings || this.buildings.length === 0) {
            this._catalogBuildings();
        }
    }
}
