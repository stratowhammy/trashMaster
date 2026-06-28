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
};

const TILE_SIZE = 64;
const MAP_WIDTH = 64;
const MAP_HEIGHT = 64;
const MAP_PIXEL_W = MAP_WIDTH * TILE_SIZE;
const MAP_PIXEL_H = MAP_HEIGHT * TILE_SIZE;

// ── Wrapping helpers (used by all modules) ──
function wrapTileX(x) { return ((x % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH; }
function wrapTileY(y) { return ((y % MAP_HEIGHT) + MAP_HEIGHT) % MAP_HEIGHT; }
function wrapWorldX(x) { return ((x % MAP_PIXEL_W) + MAP_PIXEL_W) % MAP_PIXEL_W; }
function wrapWorldY(y) { return ((y % MAP_PIXEL_H) + MAP_PIXEL_H) % MAP_PIXEL_H; }

function wrappedDistance(x1, y1, x2, y2) {
    let dx = Math.abs(x1 - x2);
    let dy = Math.abs(y1 - y2);
    if (dx > MAP_PIXEL_W / 2) dx = MAP_PIXEL_W - dx;
    if (dy > MAP_PIXEL_H / 2) dy = MAP_PIXEL_H - dy;
    return Math.sqrt(dx * dx + dy * dy);
}

function nearestWrap(entityX, entityY, camCenterX, camCenterY) {
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
    [TileType.PARK_PATH]: '#c8b890',
};
const TILE_DETAIL_COLORS = {
    [TileType.ROAD]: '#3d3d3d', [TileType.SIDEWALK]: '#9e978a',
    [TileType.GRASS]: '#3d7a33', [TileType.BUILDING]: '#5a4d62',
    [TileType.BUILDING_DOOR]: '#7a6348', [TileType.CROSSWALK]: '#ffffff',
    [TileType.PARK_PATH]: '#b8a880',
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

class GameMap {
    constructor() {
        this.tiles = [];
        this.buildingMeta = [];
        this.buildings = []; // { id, address, tiles: [{x,y}], doorTiles: [{x,y}] }
        this.openDoors = new Set(); // Set of building IDs whose doors are open (walkable)
        this.generate();
        this._catalogBuildings();
    }

    generate() {
        this.tiles = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => TileType.GRASS)
        );
        this.buildingMeta = Array.from({ length: MAP_HEIGHT }, () =>
            Array.from({ length: MAP_WIDTH }, () => -1)
        );

        const hRoads = [4, 5, 14, 15, 24, 25, 34, 35, 44, 45, 54, 55];
        const vRoads = [4, 5, 14, 15, 24, 25, 34, 35, 44, 45, 54, 55];

        for (const ry of hRoads) for (let x = 0; x < MAP_WIDTH; x++) this.tiles[ry][x] = TileType.ROAD;
        for (const rx of vRoads) for (let y = 0; y < MAP_HEIGHT; y++) this.tiles[y][rx] = TileType.ROAD;
        for (const ry of hRoads) for (const rx of vRoads) this.tiles[ry][rx] = TileType.CROSSWALK;

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.tiles[y][x] !== TileType.ROAD && this.tiles[y][x] !== TileType.CROSSWALK) {
                    const neighbors = [[y-1,x],[y+1,x],[y,x-1],[y,x+1]];
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

        let buildingIndex = 0;
        const blockRanges = this._getBlockRanges(hRoads, vRoads);
        for (const block of blockRanges) {
            this._fillBlock(block, buildingIndex % BUILDING_COLORS.length);
            buildingIndex++;
        }
        this._createParks();
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
        const parkBlocks = [
            {x1:8,y1:8,x2:12,y2:12},{x1:28,y1:28,x2:32,y2:32},
            {x1:48,y1:8,x2:52,y2:12},{x1:8,y1:48,x2:12,y2:52},
            {x1:38,y1:48,x2:42,y2:52},{x1:18,y1:18,x2:22,y2:22},
        ];
        for (const park of parkBlocks) {
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

    // ── Wrapping tile access ──
    isWalkable(tileX, tileY, curTX, curTY) {
        const wx = wrapTileX(tileX);
        const wy = wrapTileY(tileY);
        const t = this.tiles[wy][wx];
        
        // If current position isn't specified (e.g. spawn checks, pathfinding initial steps), use default walkability
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

        // Scenario 1: Both outside
        if (!bldgA && !bldgB) {
            return t !== TileType.BUILDING && t !== TileType.BUILDING_DOOR;
        }

        // Scenario 2: Outside trying to enter building B
        if (!bldgA && bldgB) {
            const isOpen = this.openDoors.has(bldgB.id);
            const isDoor = bldgB.doorTiles.some(d => d.x === wx && d.y === wy);
            return isOpen && isDoor;
        }

        // Scenario 3: Inside building A trying to exit
        if (bldgA && !bldgB) {
            const isOpen = this.openDoors.has(bldgA.id);
            const isDoor = bldgA.doorTiles.some(d => d.x === curWX && d.y === curWY);
            return isOpen && isDoor;
        }

        // Scenario 4: Inside building A moving to tile B
        if (bldgA && bldgB) {
            return bldgA.id === bldgB.id;
        }

        return false;
    }

    getTile(tileX, tileY) {
        return this.tiles[wrapTileY(tileY)][wrapTileX(tileX)];
    }

    // ── Wrapping renderer ──
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
                const tx = wrapTileX(worldTX);
                const ty = wrapTileY(worldTY);
                const sx = worldTX * TILE_SIZE - camera.x;
                const sy = worldTY * TILE_SIZE - camera.y;
                this._drawTile(ctx, this.tiles[ty][tx], sx, sy, tx, ty);
            }
        }
    }

    _drawTile(ctx, tile, sx, sy, tx, ty) {
        const s = TILE_SIZE;
        switch (tile) {
            case TileType.ROAD:
                ctx.fillStyle = TILE_COLORS[TileType.ROAD]; ctx.fillRect(sx,sy,s,s);
                if ((tx+ty)%4<2) { ctx.fillStyle='#666';
                    if(ty%2===0) ctx.fillRect(sx+s/2-1,sy+2,2,s-4);
                    else ctx.fillRect(sx+2,sy+s/2-1,s-4,2);
                } break;
            case TileType.SIDEWALK:
                ctx.fillStyle = TILE_COLORS[TileType.SIDEWALK]; ctx.fillRect(sx,sy,s,s);
                ctx.strokeStyle=TILE_DETAIL_COLORS[TileType.SIDEWALK]; ctx.lineWidth=0.5;
                ctx.strokeRect(sx+1,sy+1,s-2,s-2);
                if((tx+ty)%3===0) ctx.strokeRect(sx+s/4,sy+s/4,s/2,s/2);
                break;
            case TileType.GRASS:
                ctx.fillStyle = TILE_COLORS[TileType.GRASS]; ctx.fillRect(sx,sy,s,s);
                ctx.fillStyle=TILE_DETAIL_COLORS[TileType.GRASS];
                const seed=(tx*7+ty*13)%5;
                for(let i=0;i<3;i++){ctx.fillRect(sx+((seed+i*11)%s),sy+((seed+i*7)%s),1,3);}
                if((tx*3+ty*7)%17===0){ctx.fillStyle='#e8d44d';ctx.fillRect(sx+10,sy+12,3,3);}
                else if((tx*5+ty*11)%19===0){ctx.fillStyle='#d46a6a';ctx.fillRect(sx+20,sy+8,3,3);}
                break;
            case TileType.BUILDING: {
                const bldg = this.getBuildingAtTile(tx, ty);
                if (bldg && this._playerInsideBuildingId === bldg.id) {
                    // Draw interior floor
                    ctx.fillStyle = '#8b7355'; ctx.fillRect(sx,sy,s,s);
                    ctx.strokeStyle = '#7a6548'; ctx.lineWidth = 1; ctx.strokeRect(sx,sy,s,s);
                    break;
                }
                const ci=this.buildingMeta[ty][tx]; const c=BUILDING_COLORS[ci>=0?ci:0];
                ctx.fillStyle=c.base; ctx.fillRect(sx,sy,s,s);
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
                    // Draw interior floor for door tile when inside
                    ctx.fillStyle = '#8b7355'; ctx.fillRect(sx,sy,s,s);
                    ctx.strokeStyle = '#7a6548'; ctx.lineWidth = 1; ctx.strokeRect(sx,sy,s,s);
                    break;
                }
                const isOpen = bldg2 && this.openDoors.has(bldg2.id);
                if (isOpen) {
                    // Open door - black doorway with golden glowing frame
                    ctx.fillStyle = '#111111';
                    ctx.fillRect(sx, sy, s, s);
                    ctx.strokeStyle = '#ffaa00';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(sx + 2, sy + 2, s - 4, s - 4);
                } else {
                    // Closed door - fills the whole tile
                    ctx.fillStyle = TILE_COLORS[TileType.BUILDING_DOOR];
                    ctx.fillRect(sx, sy, s, s);
                    ctx.strokeStyle = '#5a4530';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(sx + 1, sy + 1, s - 2, s - 2);
                    
                    // Golden doorknob
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
                ctx.fillStyle=TILE_COLORS[TileType.ROAD];ctx.fillRect(sx,sy,s,s);
                ctx.fillStyle=TILE_COLORS[TileType.CROSSWALK];
                for(let i=2;i<s-2;i+=6) ctx.fillRect(sx+i,sy+2,4,s-4);
                break;
            case TileType.PARK_PATH:
                ctx.fillStyle=TILE_COLORS[TileType.PARK_PATH];ctx.fillRect(sx,sy,s,s);
                ctx.strokeStyle=TILE_DETAIL_COLORS[TileType.PARK_PATH];ctx.lineWidth=0.5;
                ctx.beginPath();ctx.moveTo(sx+s/3,sy);ctx.lineTo(sx+s/3,sy+s);
                ctx.moveTo(sx+2*s/3,sy);ctx.lineTo(sx+2*s/3,sy+s);
                ctx.moveTo(sx,sy+s/2);ctx.lineTo(sx+s,sy+s/2);ctx.stroke();
                break;
        }
    }

    _catalogBuildings() {
        // Flood-fill to find connected building clusters and assign addresses
        const visited = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(false));
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let letterIdx = 0;
        let numCounter = 100;

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (visited[y][x]) continue;
                if (this.tiles[y][x] !== TileType.BUILDING && this.tiles[y][x] !== TileType.BUILDING_DOOR) continue;

                // Flood fill this building cluster
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
                    
                    // Find a sidewalk-adjacent building tile to serve as the door
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

                    // Fallback
                    if (!doorTile) {
                        doorTile = tiles[0];
                    }

                    // Convert this tile on the map to be the building door
                    this.tiles[doorTile.y][doorTile.x] = TileType.BUILDING_DOOR;

                    this.buildings.push({
                        id: this.buildings.length,
                        address,
                        tiles,
                        doorTiles: [doorTile]
                    });
                    numCounter += Math.floor(Math.random() * 20) + 10;
                    if (numCounter > 999) { numCounter = 100; letterIdx++; }
                    if (numCounter % 100 === 0) numCounter++;
                }
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
        // Render building addresses near their first door tile
        for (const bldg of this.buildings) {
            if (bldg.doorTiles.length === 0) continue;
            const door = bldg.doorTiles[0];
            const sx = door.x * TILE_SIZE - camera.x;
            const sy = door.y * TILE_SIZE - camera.y;

            // Only render if on screen
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

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            ctx.roundRect(sx - 2, sy - 14, ctx.measureText(text).width + 8 || 40, 14, 3);
            ctx.fill();

            ctx.fillStyle = color;
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(text, sx, sy - 4);
        }
    }
}
