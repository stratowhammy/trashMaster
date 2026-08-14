// ============================================================
// map_builder3d.js — 16-Bit Retro Texture & 3D Map Extrusion Engine
// Authentic Swatch-Based 16-Bit Textures for Buildings & Streets
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
        this.DOOR_HEIGHT = 4.2;

        this._initSwatchTextures();
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

    _initSwatchTextures() {
        // ============================================================
        // 🧱 SWATCH 1: 16-BIT RETRO BRICK TEXTURES
        // ============================================================

        // 1. Terra Cotta Brick (Warm Red-Orange)
        this.textures.brick_terra_cotta = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#b44322';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#6e230f'; // Dark mortar
            this._drawBrickMortar(ctx, w, h, 8, 4);
            // Texture noise & highlight
            for (let i = 0; i < 180; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(235, 110, 75, 0.25)' : 'rgba(70, 20, 10, 0.2)';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
            }
        });

        // 2. Sienna Brick (Deep Earthy Red)
        this.textures.brick_sienna = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#7a281e';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#3d120c';
            this._drawBrickMortar(ctx, w, h, 8, 4);
            for (let i = 0; i < 150; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(165, 65, 50, 0.2)' : 'rgba(30, 8, 5, 0.25)';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
            }
        });

        // 3. Buff Brick (Pale Cream Limestone)
        this.textures.brick_buff = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#d4c19c';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#8c7b5e';
            this._drawBrickMortar(ctx, w, h, 8, 4);
            for (let i = 0; i < 120; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 245, 220, 0.3)' : 'rgba(90, 75, 55, 0.15)';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
            }
        });

        // 4. Umber Brick (Dark Roasted Brown)
        this.textures.brick_umber = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#42281a';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#21120a';
            this._drawBrickMortar(ctx, w, h, 8, 4);
            for (let i = 0; i < 150; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(110, 70, 45, 0.25)' : 'rgba(15, 8, 4, 0.3)';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
            }
        });

        // 5. Painted Navy Brick
        this.textures.brick_painted_navy = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#1e3a5f';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#0f1f33';
            this._drawBrickMortar(ctx, w, h, 8, 4);
            // Paint distress flecks
            for (let i = 0; i < 100; i++) {
                ctx.fillStyle = 'rgba(70, 130, 190, 0.25)';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 1);
            }
        });

        // 6. Painted Green Brick
        this.textures.brick_painted_green = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#2d5a3c';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#162e1e';
            this._drawBrickMortar(ctx, w, h, 8, 4);
            for (let i = 0; i < 120; i++) {
                ctx.fillStyle = 'rgba(80, 160, 100, 0.25)';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
            }
        });

        // 7. Aged Red Brick (Historic Weathered)
        this.textures.brick_aged_red = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#8f3326';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#40140e';
            this._drawBrickMortar(ctx, w, h, 8, 4);
            // Darker age stains
            ctx.fillStyle = 'rgba(20, 10, 5, 0.3)';
            ctx.fillRect(4, 8, 20, 16);
            ctx.fillRect(36, 32, 24, 20);
        });

        // 8. Cracked Brick Wall
        this.textures.brick_cracked = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#9e382b';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#4a150e';
            this._drawBrickMortar(ctx, w, h, 8, 4);
            // Dark jagged fracture crack line
            ctx.fillStyle = '#1a0503';
            const crackPoints = [[10, 0], [18, 16], [14, 28], [28, 42], [32, 54], [44, 64]];
            for (let p = 0; p < crackPoints.length - 1; p++) {
                this._drawPixelLine(ctx, crackPoints[p][0], crackPoints[p][1], crackPoints[p+1][0], crackPoints[p+1][1], 2);
            }
        });

        // ============================================================
        // 🏢 SWATCH 2: 16-BIT MODERN BUILDING FAÇADES
        // ============================================================

        // 9. Corten Steel (Rusted Oxidized Metal)
        this.textures.facade_corten_steel = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#9c441a';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#6b2d10';
            ctx.fillRect(0, 0, w, 2);
            ctx.fillRect(0, h/2, w, 2);
            ctx.fillRect(w/2, 0, 2, h);
            for (let i = 0; i < 300; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(215, 110, 45, 0.2)' : 'rgba(50, 20, 5, 0.25)';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
            }
        });

        // 10. Aluminum Composite (Sleek Silver Panels)
        this.textures.facade_aluminum = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(0, 0, w, h);
            // Panel seam grid
            ctx.fillStyle = '#64748b';
            ctx.fillRect(0, 0, w, 2);
            ctx.fillRect(0, 32, w, 2);
            ctx.fillRect(0, 0, 2, h);
            ctx.fillRect(32, 0, 2, h);
            // Metallic gradient sheen
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(4, 4, 24, 6);
            ctx.fillRect(36, 4, 24, 6);
            ctx.fillRect(4, 36, 24, 6);
            ctx.fillRect(36, 36, 24, 6);
        });

        // 11. Spider Glass (Glass Curtain Wall with Corner Fittings)
        this.textures.facade_spider_glass = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(2, 2, 28, 28);
            ctx.fillRect(34, 2, 28, 28);
            ctx.fillRect(2, 34, 28, 28);
            ctx.fillRect(34, 34, 28, 28);
            // Glass shine glare
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.moveTo(2, 20); ctx.lineTo(20, 2); ctx.lineTo(26, 2); ctx.lineTo(2, 26);
            ctx.fill();
            // Center Spider Fitting (Stainless Steel '+')
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(30, 28, 4, 8);
            ctx.fillRect(28, 30, 8, 4);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(31, 31, 2, 2);
        });

        // 12. Reflective Blue Skyscraper Glass
        this.textures.facade_reflective_blue = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#0369a1';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(4, 4, 56, 56);
            // Diagonal cloud reflection streak
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.beginPath();
            ctx.moveTo(0, 48); ctx.lineTo(48, 0); ctx.lineTo(64, 0); ctx.lineTo(0, 64);
            ctx.fill();
            // Window Mullions
            ctx.fillStyle = '#082f49';
            ctx.fillRect(0, 0, w, 2);
            ctx.fillRect(0, h - 2, w, 2);
            ctx.fillRect(0, 0, 2, h);
            ctx.fillRect(w - 2, 0, 2, h);
        });

        // 13. Timber Cladding (Vertical Wood Slats)
        this.textures.facade_timber = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#854d0e';
            ctx.fillRect(0, 0, w, h);
            const slatW = 8;
            for (let x = 0; x < w; x += slatW) {
                ctx.fillStyle = x % 16 === 0 ? '#a16207' : '#713f12';
                ctx.fillRect(x + 1, 0, slatW - 2, h);
                ctx.fillStyle = '#3f2206';
                ctx.fillRect(x + slatW - 1, 0, 1, h); // Slat shadow
            }
        });

        // 14. Louver Panel (Horizontal Dark Ventilation Slats)
        this.textures.facade_louver = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, w, h);
            for (let y = 0; y < h; y += 6) {
                ctx.fillStyle = '#475569';
                ctx.fillRect(2, y, w - 4, 3);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(2, y + 3, w - 4, 3);
            }
        });

        // 15. Exposed Concrete (Architectural Concrete Panels)
        this.textures.facade_exposed_concrete = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#64748b';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#475569';
            ctx.strokeRect(1, 1, w - 2, h - 2);
            ctx.fillRect(0, 32, w, 2);
            ctx.fillRect(32, 0, 2, h);
            // Form-tie tie holes (4 circular pits)
            const holes = [[8, 8], [56, 8], [8, 56], [56, 56], [8, 38], [56, 38], [38, 8], [38, 56]];
            ctx.fillStyle = '#1e293b';
            holes.forEach(([hx, hy]) => {
                ctx.beginPath();
                ctx.arc(hx, hy, 2, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        // 16. Green Living Wall (Dense Foliage & Vines)
        this.textures.facade_green_wall = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#14532d';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 350; i++) {
                const rx = Math.floor(Math.random() * w);
                const ry = Math.floor(Math.random() * h);
                ctx.fillStyle = Math.random() > 0.4 ? '#16a34a' : (Math.random() > 0.5 ? '#22c55e' : '#15803d');
                ctx.fillRect(rx, ry, 3, 3);
            }
        });

        // ============================================================
        // 🛣️ SWATCH 3: 16-BIT RETRO-CITY STREETS & PAVEMENT
        // ============================================================

        // 17. Cracked Asphalt Street (with Dashed Yellow Line)
        this.textures.street_cracked_asphalt = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#1e2024';
            ctx.fillRect(0, 0, w, h);
            // Asphalt grain
            for (let i = 0; i < 400; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#131417' : '#2b2e35';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
            }
            // Fine crack
            ctx.fillStyle = '#0d0e10';
            ctx.beginPath();
            ctx.moveTo(8, 4); ctx.lineTo(24, 18); ctx.lineTo(38, 14); ctx.lineTo(52, 28);
            ctx.stroke();
            // Dashed yellow centerline
            ctx.fillStyle = '#eab308';
            ctx.fillRect(w / 2 - 2, 8, 4, 16);
            ctx.fillRect(w / 2 - 2, 40, 4, 16);
        });

        // 18. Polished Cobblestone
        this.textures.street_cobblestone = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#334155'; // Dark mortar
            ctx.fillRect(0, 0, w, h);
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    const cx = c * 16 + (r % 2) * 8;
                    const cy = r * 16;
                    ctx.fillStyle = (r + c) % 3 === 0 ? '#64748b' : ((r + c) % 2 === 0 ? '#475569' : '#526071');
                    ctx.beginPath();
                    ctx.roundRect(cx + 1, cy + 1, 14, 14, 4);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.fillRect(cx + 3, cy + 3, 5, 4);
                }
            }
        });

        // 19. Blok-Pavers (Herringbone Red & Gray Pavers)
        this.textures.street_blok_pavers = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#475569';
            ctx.fillRect(0, 0, w, h);
            for (let y = 0; y < h; y += 16) {
                for (let x = 0; x < w; x += 16) {
                    // Horizontal paver
                    ctx.fillStyle = '#9e382b';
                    ctx.fillRect(x + 1, y + 1, 14, 6);
                    // Vertical paver
                    ctx.fillStyle = '#64748b';
                    ctx.fillRect(x + 1, y + 8, 6, 7);
                    ctx.fillStyle = '#b44322';
                    ctx.fillRect(x + 8, y + 8, 7, 7);
                }
            }
        });

        // 20. Sidewalk with Drainage Grate
        this.textures.street_sidewalk = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#64748b';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#475569';
            ctx.strokeRect(1, 1, w - 2, h - 2);
            ctx.fillRect(w / 2, 0, 1, h);
            ctx.fillRect(0, h / 2, w, 1);
            // Concrete grain
            for (let i = 0; i < 150; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#78889b' : '#3d4856';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
            }
        });

        // 21. Manhole Cover Pavement ("CITY SEWER")
        this.textures.street_manhole = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#1e2024';
            ctx.fillRect(0, 0, w, h);
            // Outer rim
            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.arc(32, 32, 22, 0, Math.PI * 2);
            ctx.fill();
            // Inner cast iron
            ctx.fillStyle = '#1f2937';
            ctx.beginPath();
            ctx.arc(32, 32, 18, 0, Math.PI * 2);
            ctx.fill();
            // Crosshatch
            ctx.fillStyle = '#4b5563';
            for (let x = 18; x <= 46; x += 4) {
                ctx.fillRect(x, 18, 1, 28);
            }
            for (let y = 18; y <= 46; y += 4) {
                ctx.fillRect(18, y, 28, 1);
            }
            ctx.fillStyle = '#e5e7eb';
            ctx.font = 'bold 5px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('SEWER', 32, 34);
        });

        // 22. Park Grass Lawn
        this.textures.park_grass = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#15803d';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 300; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#16a34a' : '#14532d';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 3);
            }
        });

        // 23. Ocean Water
        this.textures.ocean_water = this._createPixelTexture((ctx, w, h) => {
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

        // 24. Dump Facility Texture
        this.textures.facility_dump = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#facc15'; // Caution stripes
            for (let i = 0; i < w + h; i += 16) {
                ctx.beginPath();
                ctx.moveTo(i, 0); ctx.lineTo(i + 8, 0); ctx.lineTo(i - h + 8, h); ctx.lineTo(i - h, h);
                ctx.fill();
            }
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(8, 16, w - 16, 32);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('DUMP', 18, 36);
        });

        // 25. Zoo Facility Texture
        this.textures.facility_zoo = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#064e3b';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(6, 6, w - 12, 22);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('ZOO', 20, 22);
            ctx.fillStyle = '#d1d5db';
            for (let x = 10; x < w - 10; x += 8) {
                ctx.fillRect(x, 32, 3, h - 36);
            }
        });

        // 26. Interactive Door
        this.textures.door = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#00ffcc';
            ctx.strokeRect(4, 4, w - 8, h - 8);
            ctx.fillStyle = '#4338ca';
            ctx.fillRect(8, 8, w - 16, h - 16);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(w - 14, h / 2 - 2, 4, 6);
        });

        // Compile Mesh Materials
        this.materials = {};
        for (const [key, tex] of Object.entries(this.textures)) {
            this.materials[key] = new THREE.MeshLambertMaterial({ map: tex });
        }
    }

    _drawBrickMortar(ctx, w, h, rows = 8, cols = 4) {
        const rowH = h / rows;
        for (let r = 0; r < rows; r++) {
            const y = r * rowH;
            ctx.fillRect(0, y, w, 2);
            const colW = w / cols;
            const offset = (r % 2) * (colW / 2);
            for (let c = 0; c <= cols; c++) {
                ctx.fillRect((c * colW + offset) % w, y, 2, rowH);
            }
        }
    }

    _drawPixelLine(ctx, x0, y0, x1, y1, width = 1) {
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }

    buildMap(gameMap, theme = 'filthadelphia') {
        // Clear previous meshes
        while (this.mapMeshGroup.children.length > 0) {
            const obj = this.mapMeshGroup.children[0];
            this.mapMeshGroup.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
        }

        if (!gameMap || !gameMap.tiles) return;

        const mapW = gameMap.width || 128;
        const mapH = gameMap.height || 128;
        const S = this.TILE_SIZE_3D;
        const wallH = this.WALL_HEIGHT;

        // Building Materials Palette from Swatches
        const buildingMaterials = [
            this.materials.brick_terra_cotta,
            this.materials.brick_sienna,
            this.materials.brick_buff,
            this.materials.brick_umber,
            this.materials.brick_painted_navy,
            this.materials.brick_painted_green,
            this.materials.brick_aged_red,
            this.materials.brick_cracked,
            this.materials.facade_corten_steel,
            this.materials.facade_aluminum,
            this.materials.facade_spider_glass,
            this.materials.facade_reflective_blue,
            this.materials.facade_timber,
            this.materials.facade_louver,
            this.materials.facade_exposed_concrete,
            this.materials.facade_green_wall
        ];

        // Coordinate collection maps for InstancedMesh Batching
        const floorBuckets = new Map();
        const wallBuckets = new Map();

        const getFloorMatKey = (tileType, x, y) => {
            if (window.pirateMode || tileType === (window.TileType ? TileType.WATER : 99) || tileType === 99) {
                return 'ocean_water';
            }
            if (tileType === (window.TileType ? TileType.PARK_PATH : 6) || tileType === (window.TileType ? TileType.GRASS : 2)) {
                return (x + y) % 7 === 0 ? 'street_cobblestone' : 'park_grass';
            }
            if (tileType === (window.TileType ? TileType.SIDEWALK : 1) || tileType === (window.TileType ? TileType.CROSSWALK : 5)) {
                return (x * y) % 9 === 0 ? 'street_blok_pavers' : 'street_sidewalk';
            }
            // Road tiles
            if ((x + y) % 31 === 0) return 'street_manhole';
            return 'street_cracked_asphalt';
        };

        const getWallMatKey = (x, y) => {
            // Assign varied 16-bit building swatch based on block coordinates
            const blockId = Math.floor(x / 4) * 31 + Math.floor(y / 4);
            const index = Math.abs(blockId) % buildingMaterials.length;
            return index;
        };

        const dummy = new THREE.Object3D();

        // 1. Classify all map tiles into batch buckets
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                const tileType = gameMap.getTile(x, y);
                const worldX = (x - mapW / 2) * S + S / 2;
                const worldZ = (y - mapH / 2) * S + S / 2;

                // Floor
                const floorKey = getFloorMatKey(tileType, x, y);
                if (!floorBuckets.has(floorKey)) floorBuckets.set(floorKey, []);
                floorBuckets.get(floorKey).push({ x: worldX, z: worldZ });

                // Wall / Building
                const isBuilding = tileType === (window.TileType ? TileType.BUILDING : 3) ||
                                   tileType === (window.TileType ? TileType.WALL : 98) ||
                                   tileType === 3;

                const isDoor = tileType === (window.TileType ? TileType.BUILDING_DOOR : 4) ||
                               tileType === 4;

                if (isBuilding) {
                    const wallIdx = getWallMatKey(x, y);
                    if (!wallBuckets.has(wallIdx)) wallBuckets.set(wallIdx, []);
                    wallBuckets.get(wallIdx).push({ x: worldX, z: worldZ, height: wallH });
                } else if (isDoor) {
                    if (!wallBuckets.has('door')) wallBuckets.set('door', []);
                    wallBuckets.get('door').push({ x: worldX, z: worldZ, height: this.DOOR_HEIGHT });
                }
            }
        }

        // 2. Create InstancedMesh for Floor Buckets (4-6 draw calls total!)
        const floorPlaneGeo = new THREE.PlaneGeometry(S, S);
        floorPlaneGeo.rotateX(-Math.PI / 2);

        floorBuckets.forEach((coords, floorKey) => {
            const mat = this.materials[floorKey] || this.materials.street_cracked_asphalt;
            const count = coords.length;
            const instMesh = new THREE.InstancedMesh(floorPlaneGeo, mat, count);

            coords.forEach((coord, i) => {
                dummy.position.set(coord.x, 0, coord.z);
                dummy.rotation.set(0, 0, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                instMesh.setMatrixAt(i, dummy.matrix);
            });

            instMesh.instanceMatrix.needsUpdate = true;
            this.mapMeshGroup.add(instMesh);
        });

        // 3. Create InstancedMesh for Wall Buckets (15 draw calls total!)
        const wallBoxGeo = new THREE.BoxGeometry(S, wallH, S);
        const doorBoxGeo = new THREE.BoxGeometry(S, this.DOOR_HEIGHT, S);

        wallBuckets.forEach((coords, key) => {
            let mat = this.materials.door;
            let geo = doorBoxGeo;

            if (key !== 'door') {
                mat = buildingMaterials[key];
                geo = wallBoxGeo;
            }

            const count = coords.length;
            const instMesh = new THREE.InstancedMesh(geo, mat, count);

            coords.forEach((coord, i) => {
                dummy.position.set(coord.x, coord.height / 2, coord.z);
                dummy.rotation.set(0, 0, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                instMesh.setMatrixAt(i, dummy.matrix);
            });

            instMesh.instanceMatrix.needsUpdate = true;
            this.mapMeshGroup.add(instMesh);
        });

        // 4. Add Landmark 3D Entrance Portals & Signboards
        if (gameMap.buildings) {
            for (const bldg of gameMap.buildings) {
                if (!bldg || !bldg.doorTiles || bldg.doorTiles.length === 0) continue;
                const door = bldg.doorTiles[0];
                const dx = (door.x - mapW / 2) * S + S / 2;
                const dz = (door.y - mapH / 2) * S + S / 2;

                let specialMat = this.materials.door;
                let signLabel = bldg.type ? bldg.type.toUpperCase() : 'ENTER';

                if (bldg.type === 'dump') {
                    specialMat = this.materials.facility_dump;
                    signLabel = '🗑️ DUMP';
                } else if (bldg.type === 'zoo') {
                    specialMat = this.materials.facility_zoo;
                    signLabel = '🦁 ZOO';
                } else if (bldg.type === 'police') {
                    specialMat = this.materials.facade_aluminum;
                    signLabel = '👮 POLICE';
                } else if (bldg.type === 'bank') {
                    specialMat = this.materials.brick_buff;
                    signLabel = '🏦 BANK';
                } else if (bldg.type === 'airport') {
                    specialMat = this.materials.facade_spider_glass;
                    signLabel = '✈️ AIRPORT';
                } else if (bldg.type === 'hospital') {
                    specialMat = this.materials.brick_sienna;
                    signLabel = '🏥 HOSPITAL';
                } else if (bldg.type === 'pulp_mill') {
                    specialMat = this.materials.facade_timber;
                    signLabel = '🪵 PULP MILL';
                } else if (bldg.type === 'black_market') {
                    specialMat = this.materials.brick_cracked;
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

        // 5. Create Retro Sky Dome / Horizon
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
        ctx.font = 'bold 18px "Press Start 2P", monospace';
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
        const skyGeo = new THREE.SphereGeometry(300, 16, 16);
        let skyColor = '#1e3a8a'; // Bright 16-bit city daylight/dusk
        if (theme === 'dahgbad') skyColor = '#9a3412'; // Desert sunset
        else if (theme === 'cucaracha') skyColor = '#581c87'; // Purple twilight
        else if (theme === 'pirate') skyColor = '#0369a1'; // Caribbean blue

        const skyMat = new THREE.MeshBasicMaterial({
            color: skyColor,
            side: THREE.BackSide
        });
        const skyMesh = new THREE.Mesh(skyGeo, skyMat);
        skyMesh.position.set(0, 0, 0);
        this.mapMeshGroup.add(skyMesh);
    }

    world2DTo3D(tileX, tileY, mapW = 128, mapH = 128) {
        const S = this.TILE_SIZE_3D;
        const x3d = (tileX - mapW / 2) * S;
        const z3d = (tileY - mapH / 2) * S;
        return { x: x3d, z: z3d };
    }

    coords2DTo3D(pixelX, pixelY, mapW = 128, mapH = 128) {
        const tileX = pixelX / TILE_SIZE;
        const tileY = pixelY / TILE_SIZE;
        return this.world2DTo3D(tileX, tileY, mapW, mapH);
    }
}

window.MapBuilder3D = MapBuilder3D;
