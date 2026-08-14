// ============================================================
// map_builder3d.js — 2D TileMap to 3D Extruded World Generator
// Converts 64x64 Tile Maps to Doom/Wolfenstein Retro 3D Geometry
// ============================================================

class MapBuilder3D {
    constructor(scene) {
        this.scene = scene;
        this.textures = {};
        this.materials = {};
        this.mapMeshGroup = new THREE.Group();
        this.scene.add(this.mapMeshGroup);

        this.TILE_SIZE_3D = 4; // 3D units per 2D tile
        this.WALL_HEIGHT = 5.5; // Height of building walls in 3D
        this.DOOR_HEIGHT = 4.0;

        this._initTextures();
    }

    _createPixelTexture(drawFn, width = 64, height = 64) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        drawFn(ctx, width, height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    _initTextures() {
        // 1. Retro Red/Brown Brick Wall (Classic Wolf3D / Doom style)
        this.textures.brick = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#8b2500';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#4a1500';
            const rows = 8;
            const rowH = h / rows;
            for (let r = 0; r < rows; r++) {
                const y = r * rowH;
                ctx.fillRect(0, y, w, 2);
                const cols = 4;
                const colW = w / cols;
                const offset = (r % 2) * (colW / 2);
                for (let c = 0; c <= cols; c++) {
                    ctx.fillRect((c * colW + offset) % w, y, 2, rowH);
                }
            }
            // Noise / texture grit
            for (let i = 0; i < 200; i++) {
                const nx = Math.floor(Math.random() * w);
                const ny = Math.floor(Math.random() * h);
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,180,120,0.1)';
                ctx.fillRect(nx, ny, 2, 2);
            }
        });

        // 2. Concrete Wall with Windows (Filthadelphia Skyline / Buildings)
        this.textures.concrete = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#3a3d45';
            ctx.fillRect(0, 0, w, h);
            // Border trims
            ctx.fillStyle = '#22252a';
            ctx.fillRect(0, 0, w, 4);
            ctx.fillRect(0, h - 4, w, 4);
            ctx.fillRect(0, 0, 4, h);
            ctx.fillRect(w - 4, 0, 4, h);
            // Windows
            const winCols = 3;
            const winRows = 3;
            for (let r = 0; r < winRows; r++) {
                for (let c = 0; c < winCols; c++) {
                    const wx = 10 + c * 16;
                    const wy = 10 + r * 16;
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(wx - 1, wy - 1, 12, 12);
                    ctx.fillStyle = (r + c) % 2 === 0 ? '#38bdf8' : '#fef08a';
                    ctx.fillRect(wx, wy, 10, 10);
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.fillRect(wx + 1, wy + 1, 4, 4);
                }
            }
        });

        // 3. Dahgbad Sandstone Wall
        this.textures.sandstone = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#d97706';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#92400e';
            for (let r = 0; r < 4; r++) {
                ctx.fillRect(0, r * 16, w, 2);
                ctx.fillRect((r % 2) * 32, r * 16, 2, 16);
                ctx.fillRect((r % 2) * 32 + 32, r * 16, 2, 16);
            }
            for (let i = 0; i < 150; i++) {
                ctx.fillStyle = 'rgba(254, 243, 199, 0.15)';
                ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
            }
        });

        // 4. Cucaracha Adobe / Colorful Wall
        this.textures.adobe = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#ea580c';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#c2410c';
            ctx.fillRect(0, h - 8, w, 8);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(0, 0, w, 4);
        });

        // 5. Asphalt Street / Road Texture
        this.textures.road = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#1e2024';
            ctx.fillRect(0, 0, w, h);
            // Asphalt grain
            for (let i = 0; i < 300; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#151618' : '#2b2e34';
                ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
            }
            // Yellow dash line down center
            ctx.fillStyle = '#eab308';
            ctx.fillRect(w / 2 - 2, 12, 4, 16);
            ctx.fillRect(w / 2 - 2, 44, 4, 16);
        });

        // 6. Sidewalk Pavement Texture
        this.textures.sidewalk = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#64748b';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#475569';
            ctx.strokeRect(1, 1, w - 2, h - 2);
            ctx.fillRect(w / 2, 0, 1, h);
            ctx.fillRect(0, h / 2, w, 1);
        });

        // 7. Grass Park Texture
        this.textures.grass = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#15803d';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 200; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#16a34a' : '#14532d';
                ctx.fillRect(Math.random() * w, Math.random() * h, 2, 3);
            }
        });

        // 8. Ocean Water Texture (Pirate Mode / Sea)
        this.textures.water = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#38bdf8';
            for (let y = 8; y < h; y += 16) {
                for (let x = 0; x < w; x += 16) {
                    ctx.fillRect(x, y, 8, 2);
                    ctx.fillRect(x + 8, y + 8, 8, 2);
                }
            }
        });

        // 9. Interactive Doorway Texture
        this.textures.door = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#00ffcc';
            ctx.strokeRect(4, 4, w - 8, h - 8);
            ctx.fillStyle = '#4338ca';
            ctx.fillRect(8, 8, w - 16, h - 16);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(w - 14, h / 2 - 2, 4, 6); // Doorknob
        });

        // 10. Dump Facility Texture
        this.textures.dump = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(0, 0, w, h);
            // Caution stripes
            ctx.fillStyle = '#facc15';
            for (let i = 0; i < w + h; i += 16) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + 8, 0);
                ctx.lineTo(i - h + 8, h);
                ctx.lineTo(i - h, h);
                ctx.fill();
            }
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(8, 12, w - 16, 24);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 8px monospace';
            ctx.fillText('DUMP', 18, 28);
        });

        // 11. Zoo Facility Texture
        this.textures.zoo = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#064e3b';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(6, 6, w - 12, 22);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('ZOO', 20, 22);
            // Cage bars
            ctx.fillStyle = '#d1d5db';
            for (let x = 10; x < w - 10; x += 8) {
                ctx.fillRect(x, 32, 3, h - 36);
            }
        });

        // Materials setup
        this.materials.brick = new THREE.MeshLambertMaterial({ map: this.textures.brick });
        this.materials.concrete = new THREE.MeshLambertMaterial({ map: this.textures.concrete });
        this.materials.sandstone = new THREE.MeshLambertMaterial({ map: this.textures.sandstone });
        this.materials.adobe = new THREE.MeshLambertMaterial({ map: this.textures.adobe });
        this.materials.road = new THREE.MeshLambertMaterial({ map: this.textures.road });
        this.materials.sidewalk = new THREE.MeshLambertMaterial({ map: this.textures.sidewalk });
        this.materials.grass = new THREE.MeshLambertMaterial({ map: this.textures.grass });
        this.materials.water = new THREE.MeshLambertMaterial({ map: this.textures.water });
        this.materials.door = new THREE.MeshLambertMaterial({ map: this.textures.door });
        this.materials.dump = new THREE.MeshLambertMaterial({ map: this.textures.dump });
        this.materials.zoo = new THREE.MeshLambertMaterial({ map: this.textures.zoo });
        this.materials.ceiling = new THREE.MeshBasicMaterial({ color: '#090a0f' });
    }

    buildMap(gameMap, theme = 'filthadelphia') {
        // Clear previous geometry
        while (this.mapMeshGroup.children.length > 0) {
            const obj = this.mapMeshGroup.children[0];
            this.mapMeshGroup.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
        }

        if (!gameMap || !gameMap.tiles) return;

        const mapW = gameMap.width || 64;
        const mapH = gameMap.height || 64;
        const S = this.TILE_SIZE_3D;
        const wallH = this.WALL_HEIGHT;

        // Choose appropriate wall material by theme
        let defaultWallMat = this.materials.concrete;
        if (theme === 'dahgbad') defaultWallMat = this.materials.sandstone;
        else if (theme === 'cucaracha') defaultWallMat = this.materials.adobe;
        else if (theme === 'pirate') defaultWallMat = this.materials.brick;

        // Shared Geometries for batching
        const wallBoxGeo = new THREE.BoxGeometry(S, wallH, S);
        const floorPlaneGeo = new THREE.PlaneGeometry(S, S);
        floorPlaneGeo.rotateX(-Math.PI / 2);

        // Building blocks mesh array
        const wallInstancedMap = new Map();
        const floorInstancedMap = new Map();

        // 1. Create Floor & Wall tiles
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                const tileType = gameMap.getTile(x, y);
                const worldX = (x - mapW / 2) * S + S / 2;
                const worldZ = (y - mapH / 2) * S + S / 2;

                // Determine Floor Type
                let floorMat = this.materials.road;
                if (tileType === TileType.SIDEWALK || tileType === TileType.CROSSWALK) {
                    floorMat = this.materials.sidewalk;
                } else if (tileType === TileType.PARK || tileType === TileType.GRASS) {
                    floorMat = this.materials.grass;
                } else if (tileType === TileType.WATER || tileType === TileType.OCEAN || window.pirateMode) {
                    floorMat = this.materials.water;
                }

                // Place floor
                const floorMesh = new THREE.Mesh(floorPlaneGeo, floorMat);
                floorMesh.position.set(worldX, 0, worldZ);
                this.mapMeshGroup.add(floorMesh);

                // Place Wall / Building if solid
                if (tileType === TileType.BUILDING || tileType === TileType.WALL || tileType === TileType.STORE) {
                    const wallMesh = new THREE.Mesh(wallBoxGeo, defaultWallMat);
                    wallMesh.position.set(worldX, wallH / 2, worldZ);
                    this.mapMeshGroup.add(wallMesh);
                } else if (tileType === TileType.DOOR) {
                    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(S, this.DOOR_HEIGHT, S), this.materials.door);
                    doorMesh.position.set(worldX, this.DOOR_HEIGHT / 2, worldZ);
                    this.mapMeshGroup.add(doorMesh);
                }
            }
        }

        // 2. Add Landmark 3D Entrance Portals & Signboards
        if (gameMap.buildings) {
            for (const bldg of gameMap.buildings) {
                if (!bldg || !bldg.doorTiles || bldg.doorTiles.length === 0) continue;
                const door = bldg.doorTiles[0];
                const dx = (door.x - mapW / 2) * S + S / 2;
                const dz = (door.y - mapH / 2) * S + S / 2;

                let specialMat = this.materials.door;
                let signLabel = bldg.type ? bldg.type.toUpperCase() : 'ENTER';

                if (bldg.type === 'dump') {
                    specialMat = this.materials.dump;
                    signLabel = '🗑️ DUMP';
                } else if (bldg.type === 'zoo') {
                    specialMat = this.materials.zoo;
                    signLabel = '🦁 ZOO';
                } else if (bldg.type === 'police') {
                    signLabel = '👮 POLICE';
                } else if (bldg.type === 'bank') {
                    signLabel = '🏦 BANK';
                } else if (bldg.type === 'airport') {
                    signLabel = '✈️ AIRPORT';
                } else if (bldg.type === 'hospital') {
                    signLabel = '🏥 HOSPITAL';
                } else if (bldg.type === 'pulp_mill') {
                    signLabel = '🪵 PULP MILL';
                } else if (bldg.type === 'black_market') {
                    signLabel = '☠️ BLACK MARKET';
                }

                // Place special doorway block
                const specialDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(S * 1.05, this.DOOR_HEIGHT, S * 1.05), specialMat);
                specialDoorMesh.position.set(dx, this.DOOR_HEIGHT / 2, dz);
                this.mapMeshGroup.add(specialDoorMesh);

                // Add 3D Floating Neon Sign above door
                const signSprite = this._createSignSprite(signLabel);
                signSprite.position.set(dx, this.DOOR_HEIGHT + 1.2, dz);
                this.mapMeshGroup.add(signSprite);
            }
        }

        // 3. Create Retro Sky Dome / Skyline
        this._createSkyDome(theme);
    }

    _createSignSprite(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Background neon box
        ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
        ctx.fillRect(4, 4, 248, 56);
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 248, 56);

        // Text
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 20px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 34);

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;

        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(4, 1, 1);
        return sprite;
    }

    _createSkyDome(theme) {
        const skyGeo = new THREE.SphereGeometry(220, 16, 16);
        let skyColor = '#0f172a'; // Night blue default
        if (theme === 'dahgbad') skyColor = '#78350f'; // Desert amber dusk
        else if (theme === 'cucaracha') skyColor = '#3b0764'; // Purple twilight
        else if (theme === 'pirate') skyColor = '#0c4a6e'; // Deep ocean blue

        const skyMat = new THREE.MeshBasicMaterial({
            color: skyColor,
            side: THREE.BackSide
        });
        const skyMesh = new THREE.Mesh(skyGeo, skyMat);
        skyMesh.position.set(0, 0, 0);
        this.mapMeshGroup.add(skyMesh);
    }

    world2DTo3D(tileX, tileY, mapW = 64, mapH = 64) {
        const S = this.TILE_SIZE_3D;
        const x3d = (tileX - mapW / 2) * S;
        const z3d = (tileY - mapH / 2) * S;
        return { x: x3d, z: z3d };
    }

    coords2DTo3D(pixelX, pixelY, mapW = 64, mapH = 64) {
        const tileX = pixelX / TILE_SIZE;
        const tileY = pixelY / TILE_SIZE;
        return this.world2DTo3D(tileX, tileY, mapW, mapH);
    }
}

window.MapBuilder3D = MapBuilder3D;
