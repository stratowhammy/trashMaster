// ============================================================
// map_builder3d.js — 16-Bit Retro Texture & 3D Map Extrusion Engine
// Infinite Toroidal 3x3 Repeating World Architecture
// ============================================================

class MapBuilder3D {
    constructor(scene) {
        this.scene = scene;
        this.textures = {};
        this.materials = {};
        this.mapMeshGroup = new THREE.Group();
        this.scene.add(this.mapMeshGroup);
        this.skyMesh = null;

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
            ctx.fillStyle = '#6e230f';
            this._drawBrickMortar(ctx, w, h, 8, 4);
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
            ctx.fillStyle = '#1a0503';
            const crackPoints = [[10, 0], [18, 16], [14, 28], [28, 42], [32, 54], [44, 64]];
            for (let p = 0; p < crackPoints.length - 1; p++) {
                this._drawPixelLine(ctx, crackPoints[p][0], crackPoints[p][1], crackPoints[p+1][0], crackPoints[p+1][1], 2);
            }
        });

        // ============================================================
        // 🏢 SWATCH 2: 16-BIT MODERN BUILDING FAÇADES
        // ============================================================

        // 9. Corten Steel
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
            ctx.fillStyle = '#64748b';
            ctx.fillRect(0, 0, w, 2);
            ctx.fillRect(0, 32, w, 2);
            ctx.fillRect(0, 0, 2, h);
            ctx.fillRect(32, 0, 2, h);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(4, 4, 24, 6);
            ctx.fillRect(36, 4, 24, 6);
            ctx.fillRect(4, 36, 24, 6);
            ctx.fillRect(36, 36, 24, 6);
        });

        // 11. Spider Glass (Glass Curtain Wall)
        this.textures.facade_spider_glass = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(2, 2, 28, 28);
            ctx.fillRect(34, 2, 28, 28);
            ctx.fillRect(2, 34, 28, 28);
            ctx.fillRect(34, 34, 28, 28);
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.beginPath();
            ctx.moveTo(2, 20); ctx.lineTo(20, 2); ctx.lineTo(26, 2); ctx.lineTo(2, 26);
            ctx.fill();
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(30, 28, 4, 8);
            ctx.fillRect(28, 30, 8, 4);
        });

        // 12. Reflective Blue Skyscraper Glass
        this.textures.facade_reflective_blue = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#0369a1';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(4, 4, 56, 56);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.moveTo(0, 48); ctx.lineTo(48, 0); ctx.lineTo(64, 0); ctx.lineTo(0, 64);
            ctx.fill();
            ctx.fillStyle = '#082f49';
            ctx.fillRect(0, 0, w, 2);
            ctx.fillRect(0, h - 2, w, 2);
            ctx.fillRect(0, 0, 2, h);
            ctx.fillRect(w - 2, 0, 2, h);
        });

        // 13. Timber Cladding
        this.textures.facade_timber = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#854d0e';
            ctx.fillRect(0, 0, w, h);
            const slatW = 8;
            for (let x = 0; x < w; x += slatW) {
                ctx.fillStyle = x % 16 === 0 ? '#a16207' : '#713f12';
                ctx.fillRect(x + 1, 0, slatW - 2, h);
                ctx.fillStyle = '#3f2206';
                ctx.fillRect(x + slatW - 1, 0, 1, h);
            }
        });

        // 14. Louver Panel
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

        // 15. Exposed Concrete
        this.textures.facade_exposed_concrete = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#64748b';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#475569';
            ctx.strokeRect(1, 1, w - 2, h - 2);
            ctx.fillRect(0, 32, w, 2);
            ctx.fillRect(32, 0, 2, h);
            const holes = [[8, 8], [56, 8], [8, 56], [56, 56], [8, 38], [56, 38], [38, 8], [38, 56]];
            ctx.fillStyle = '#1e293b';
            holes.forEach(([hx, hy]) => {
                ctx.beginPath();
                ctx.arc(hx, hy, 2, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        // 16. Green Living Wall
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

        // Fast Food Restaurant Facade
        this.textures.building_fast_food = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#b45309';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(4, 4, w - 8, h - 8);
            for (let x = 0; x < w; x += 8) {
                ctx.fillStyle = (x % 16 === 0) ? '#dc2626' : '#ffffff';
                ctx.fillRect(x, 4, 8, 12);
            }
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(8, 22, w - 16, h - 28);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(10, 24, 18, 6);
        });

        // Roof Surface
        this.textures.roof_surface = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#0f172a';
            ctx.strokeRect(1, 1, w - 2, h - 2);
            for (let i = 0; i < 200; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#334155' : '#111827';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
            }
        });

        // ============================================================
        // 🛣️ SWATCH 3: STREETS, SIDEWALKS & SURFACES
        // ============================================================

        // 17. Clean Asphalt Road (Standard)
        this.textures.road_asphalt = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#26292e';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 300; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#1b1d22' : '#32363d';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
            }
        });

        // 18. Horizontal Road (Dashed Center Yellow Line along X)
        this.textures.road_h = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#26292e';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 250; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#1b1d22' : '#32363d';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
            }
            ctx.fillStyle = '#eab308';
            ctx.fillRect(8, h / 2 - 2, 18, 4);
            ctx.fillRect(38, h / 2 - 2, 18, 4);
        });

        // 19. Vertical Road (Dashed Center Yellow Line along Y)
        this.textures.road_v = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#26292e';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 250; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#1b1d22' : '#32363d';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
            }
            ctx.fillStyle = '#eab308';
            ctx.fillRect(w / 2 - 2, 8, 4, 18);
            ctx.fillRect(w / 2 - 2, 38, 4, 18);
        });

        // 20. Road Crosswalk (Zebra Stripes)
        this.textures.road_crosswalk = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#26292e';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#e2e8f0';
            for (let x = 6; x < w - 6; x += 14) {
                ctx.fillRect(x, 4, 8, h - 8);
            }
        });

        // 21. Sidewalk (Clean Concrete Paving)
        this.textures.sidewalk = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#8c98a8';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#64748b';
            ctx.strokeRect(1, 1, w - 2, h - 2);
            ctx.fillRect(w / 2, 0, 1, h);
            ctx.fillRect(0, h / 2, w, 1);
            for (let i = 0; i < 120; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#a0aec0' : '#718096';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
            }
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

        // 23. Park Path (Pea Gravel)
        this.textures.park_path = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#b45309';
            ctx.fillRect(0, 0, w, h);
            for (let y = 0; y < h; y += 16) {
                for (let x = 0; x < w; x += 16) {
                    ctx.fillStyle = (x + y) % 32 === 0 ? '#d97706' : '#92400e';
                    ctx.fillRect(x + 1, y + 1, 14, 14);
                }
            }
        });

        // 24. Beach Sand
        this.textures.beach_sand = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#eab308';
            ctx.fillRect(2, 2, w - 4, h - 4);
            for (let i = 0; i < 200; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fef08a' : '#a16207';
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
            }
        });

        // 25. Ocean Water
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

        // 26. Dump Facility Texture
        this.textures.facility_dump = this._createPixelTexture((ctx, w, h) => {
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#facc15';
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

        // 27. Zoo Facility Texture
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

        // 28. Interactive Door
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

        const mapW = (gameMap && gameMap.width) ? gameMap.width : (typeof MAP_WIDTH !== 'undefined' ? MAP_WIDTH : 128);
        const mapH = (gameMap && gameMap.height) ? gameMap.height : (typeof MAP_HEIGHT !== 'undefined' ? MAP_HEIGHT : 128);
        const S = this.TILE_SIZE_3D;
        const wallH = this.WALL_HEIGHT;

        // Building Materials Palette
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
        const roofBuckets = [];

        const getFloorMatKey = (tileType, x, y) => {
            if (window.pirateMode || tileType === (window.TileType ? TileType.WATER : 99) || tileType === 99) {
                return 'ocean_water';
            }
            if (gameMap.islandTiles && gameMap.islandTiles.has(`${x},${y}`)) {
                if (tileType === (window.TileType ? TileType.SIDEWALK : 1)) return 'beach_sand';
                return 'ocean_water';
            }
            if (tileType === (window.TileType ? TileType.PARK_PATH : 6)) {
                return 'park_path';
            }
            if (tileType === (window.TileType ? TileType.GRASS : 2)) {
                return 'park_grass';
            }
            if (tileType === (window.TileType ? TileType.SIDEWALK : 1)) {
                return 'sidewalk';
            }
            if (tileType === (window.TileType ? TileType.CROSSWALK : 5)) {
                return 'road_crosswalk';
            }
            if (tileType === (window.TileType ? TileType.ROAD_UP : 7) || tileType === (window.TileType ? TileType.ROAD_DOWN : 8)) {
                return 'road_v';
            }
            if (tileType === (window.TileType ? TileType.ROAD_LEFT : 9) || tileType === (window.TileType ? TileType.ROAD_RIGHT : 10)) {
                return 'road_h';
            }
            if (tileType === (window.TileType ? TileType.ROAD : 0)) {
                return (y % 2 === 0 || y % 2 === 1) ? 'road_h' : 'road_v';
            }
            return 'road_asphalt';
        };

        const getBuildingMaterial = (x, y) => {
            const bldg = gameMap.getBuildingAtTile ? gameMap.getBuildingAtTile(x, y) : null;
            if (bldg && bldg.type) {
                if (['fast_food', 'goose', 'zippy_ds', 'chinos_steaks', 'rats_steaks'].includes(bldg.type)) return this.materials.building_fast_food;
                if (bldg.type === 'dump') return this.materials.facility_dump;
                if (bldg.type === 'zoo') return this.materials.facility_zoo;
                if (bldg.type === 'bank') return this.materials.brick_buff;
                if (bldg.type === 'hospital') return this.materials.facade_aluminum;
                if (bldg.type === 'police') return this.materials.brick_painted_navy;
                if (bldg.type === 'airport') return this.materials.facade_spider_glass;
                if (bldg.type === 'pulp_mill') return this.materials.facade_timber;
                if (bldg.type === 'black_market') return this.materials.brick_cracked;
            }

            let bldgId = 0;
            if (bldg && bldg.id !== undefined) {
                bldgId = bldg.id;
            } else if (gameMap.buildingMeta && gameMap.buildingMeta[y] && gameMap.buildingMeta[y][x] >= 0) {
                bldgId = gameMap.buildingMeta[y][x];
            } else {
                bldgId = Math.floor(x / 10) * 13 + Math.floor(y / 10);
            }
            const wallIdx = Math.abs(bldgId) % buildingMaterials.length;
            return buildingMaterials[wallIdx];
        };

        const dummy = new THREE.Object3D();

        // 3x3 Infinite Toroidal Chunks (9 seamless adjacent replicas)
        const chunks = window.pirateMode ? [{ cx: 0, cz: 0 }] : [
            { cx: -1, cz: -1 }, { cx: 0, cz: -1 }, { cx: 1, cz: -1 },
            { cx: -1, cz:  0 }, { cx: 0, cz:  0 }, { cx: 1, cz:  0 },
            { cx: -1, cz:  1 }, { cx: 0, cz:  1 }, { cx: 1, cz:  1 }
        ];

        // 1. Classify all map tiles into batch buckets across all 3x3 chunks
        chunks.forEach(({ cx, cz }) => {
            const offsetX = cx * mapW * S;
            const offsetZ = cz * mapH * S;

            for (let y = 0; y < mapH; y++) {
                for (let x = 0; x < mapW; x++) {
                    const tileType = gameMap.getTile ? gameMap.getTile(x, y) : 0;
                    const worldX = (x - mapW / 2) * S + S / 2 + offsetX;
                    const worldZ = (y - mapH / 2) * S + S / 2 + offsetZ;

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
                        const mat = getBuildingMaterial(x, y);
                        if (!wallBuckets.has(mat)) wallBuckets.set(mat, []);
                        wallBuckets.get(mat).push({ x: worldX, z: worldZ, height: wallH });

                        // Roof tile on top of building
                        roofBuckets.push({ x: worldX, z: worldZ });
                    } else if (isDoor) {
                        if (!wallBuckets.has(this.materials.door)) wallBuckets.set(this.materials.door, []);
                        wallBuckets.get(this.materials.door).push({ x: worldX, z: worldZ, height: this.DOOR_HEIGHT });
                    }
                }
            }

            // Place Landmark 3D Entrance Portals & Signboards for this chunk
            if (gameMap.buildings) {
                for (const bldg of gameMap.buildings) {
                    if (!bldg || !bldg.doorTiles || bldg.doorTiles.length === 0) continue;
                    const door = bldg.doorTiles[0];
                    const dx = (door.x - mapW / 2) * S + S / 2 + offsetX;
                    const dz = (door.y - mapH / 2) * S + S / 2 + offsetZ;

                    let signLabel = '🚪 ENTRANCE';
                    if (bldg.type === 'dump') signLabel = '🗑️ DUMP';
                    else if (bldg.type === 'zoo') signLabel = '🦁 ZOO';
                    else if (bldg.type === 'police') signLabel = '👮 POLICE';
                    else if (bldg.type === 'bank') signLabel = '🏦 BANK';
                    else if (bldg.type === 'zippy_ds') signLabel = '🌯 ZIPPY D\'S';
                    else if (bldg.type === 'goose' || bldg.type === 'fast_food') signLabel = '🥪 GOOSE';
                    else if (bldg.type === 'chinos_steaks') signLabel = '🥩 CHINO\'S STEAKS';
                    else if (bldg.type === 'rats_steaks') signLabel = '🥩 RATS STEAKS';
                    else if (bldg.type === 'airport') signLabel = '✈️ AIRPORT';
                    else if (bldg.type === 'hospital') signLabel = '🏥 HOSPITAL';
                    else if (bldg.type === 'pulp_mill') signLabel = '🪵 PULP MILL';
                    else if (bldg.type === 'black_market') signLabel = '☠️ BLACK MARKET';

                    const signSprite = this._createSignSprite(signLabel);
                    signSprite.position.set(dx, this.DOOR_HEIGHT + 1.2, dz);
                    this.mapMeshGroup.add(signSprite);
                }
            }
        });

        // 2. Create InstancedMesh for Floor Buckets
        const floorPlaneGeo = new THREE.PlaneGeometry(S, S);
        floorPlaneGeo.rotateX(-Math.PI / 2);

        floorBuckets.forEach((coords, floorKey) => {
            const mat = this.materials[floorKey] || this.materials.road_asphalt;
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

        // 3. Create InstancedMesh for Wall Buckets
        const wallBoxGeo = new THREE.BoxGeometry(S, wallH, S);
        const doorBoxGeo = new THREE.BoxGeometry(S, this.DOOR_HEIGHT, S);

        wallBuckets.forEach((coords, mat) => {
            const isDoorMat = (mat === this.materials.door);
            const geo = isDoorMat ? doorBoxGeo : wallBoxGeo;
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

        // 4. Create InstancedMesh for Building Roofs
        if (roofBuckets.length > 0) {
            const roofPlaneGeo = new THREE.PlaneGeometry(S, S);
            roofPlaneGeo.rotateX(-Math.PI / 2);
            const roofInstMesh = new THREE.InstancedMesh(roofPlaneGeo, this.materials.roof_surface, roofBuckets.length);

            roofBuckets.forEach((coord, i) => {
                dummy.position.set(coord.x, wallH, coord.z);
                dummy.rotation.set(0, 0, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                roofInstMesh.setMatrixAt(i, dummy.matrix);
            });

            roofInstMesh.instanceMatrix.needsUpdate = true;
            this.mapMeshGroup.add(roofInstMesh);
        }

        // 5. Create Retro Sky Dome
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
        ctx.font = 'bold 16px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 34);

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;

        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.1 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(4, 1, 1);
        return sprite;
    }

    _createSkyDome(theme) {
        let skyHex = 0x1e3a8a; // Bright 16-bit city daylight/dusk
        if (theme === 'dahgbad') skyHex = 0x9a3412; // Desert sunset
        else if (theme === 'cucaracha') skyHex = 0x581c87; // Purple twilight
        else if (theme === 'pirate') skyHex = 0x0369a1; // Caribbean blue

        if (this.scene) {
            this.scene.background = new THREE.Color(skyHex);
            if (this.scene.fog) {
                this.scene.fog.color.setHex(skyHex);
                this.scene.fog.near = 120;
                this.scene.fog.far = 420;
            }
        }

        const skyGeo = new THREE.SphereGeometry(900, 16, 16);
        const skyMat = new THREE.MeshBasicMaterial({
            color: skyHex,
            side: THREE.BackSide
        });
        this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
        this.skyMesh.position.set(0, 0, 0);
        this.mapMeshGroup.add(this.skyMesh);
    }
}

window.MapBuilder3D = MapBuilder3D;
