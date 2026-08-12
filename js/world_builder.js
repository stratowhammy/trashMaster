// ============================================================
// world_builder.js — Interactive World Builder & Map Editor
// ============================================================

class WorldBuilder {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.mapW = 128;
        this.mapH = 128;
        this.tileSize = 32; // Editor canvas tile size in px

        this.camera = { x: 0, y: 0, zoom: 1 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.isMouseDown = false;

        this.currentTool = 'building'; // 'tile', 'building', 'entity', 'gallery'
        this.selectedTileType = 3; // TileType.BUILDING
        this.brushSize = 1;

        // Building Plopper state
        this.buildingSize = { w: 4, h: 4 };
        this.buildingColor = {
            base: '#6b5b73',
            dark: '#5a4d62',
            roof: '#7d6d85'
        };

        // Entity / Object Plopper state
        this.selectedEntityCategory = 'objects';
        this.selectedEntity = { id: 'dumpster', name: 'Dumpster', type: 'object', spriteId: 'dump' };

        // Gallery Filter state
        this.activeFilter = 'normal';

        // Undo / Redo history stack
        this.history = [];
        this.historyIndex = -1;

        // Map Data
        this.mapData = this.createBlankMapData();

        this.initDOM();
    }

    createBlankMapData(title = 'My Custom Map') {
        const tiles = Array.from({ length: this.mapH }, () =>
            Array.from({ length: this.mapW }, () => 2) // Grass
        );
        const buildingMeta = Array.from({ length: this.mapH }, () =>
            Array.from({ length: this.mapW }, () => -1)
        );
        return {
            title,
            description: 'Custom map built in World Builder',
            restricted_mode: 'all',
            theme: 'custom',
            tiles,
            buildingMeta,
            buildings: [],
            trees: [],
            objects: [],
            npcs: [],
            openDoors: [],
            parkBlocks: []
        };
    }

    initDOM() {
        const modal = document.createElement('div');
        modal.id = 'world-builder-overlay';
        modal.className = 'custom-modal';
        modal.style.cssText = `
            display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(8, 12, 20, 0.96); backdrop-filter: blur(10px); z-index: 10000;
            color: #fff; font-family: 'Press Start 2P', monospace; flex-direction: column;
        `;

        modal.innerHTML = `
            <!-- Top Navigation Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 20px; background:linear-gradient(180deg,#151c28,#0c1018); border-bottom:2px solid #2a3b5c; flex-shrink:0;">
                <div style="display:flex; align-items:center; gap:16px;">
                    <span style="color:#00ffcc; font-size:12px; text-shadow:0 0 10px rgba(0,255,204,0.5);">🗺️ WORLD BUILDER</span>
                    <input type="text" id="builder-map-title" value="My Custom 128x128 Map" style="background:#101724; border:1px solid #3b4d70; color:#fff; font-family:inherit; font-size:9px; padding:6px 10px; border-radius:6px; width:220px;" placeholder="Map Name..." />
                    <select id="builder-restricted-mode" style="background:#101724; border:1px solid #3b4d70; color:#00ffcc; font-family:inherit; font-size:8px; padding:6px 8px; border-radius:6px;">
                        <option value="all">🌐 Restricted Mode: ALL MODES</option>
                        <option value="standard">🏙️ Standard / Trash Master</option>
                        <option value="pirate">🏴‍☠️ Pirate Mode Only</option>
                        <option value="car">🏎️ Car Mode Only</option>
                        <option value="crime">💰 Crime / Mafia Mode</option>
                        <option value="cult">👁️ Cult Mode Only</option>
                        <option value="flowers">🌸 Flowers Mode Only</option>
                    </select>
                </div>
                <div style="display:flex; gap:10px;">
                    <button id="btn-builder-new" class="btn secondary" style="font-size:8px; padding:8px 12px;">Blank Map</button>
                    <button id="btn-builder-load-preset" class="btn secondary" style="font-size:8px; padding:8px 12px;">Load Preset Map</button>
                    <button id="btn-builder-test" class="btn" style="background:linear-gradient(135deg,#00aa55,#006633); font-size:8px; padding:8px 14px;">TEST MAP 🚗</button>
                    <button id="btn-builder-publish" class="btn" style="background:linear-gradient(135deg,#ffaa00,#cc7700); font-size:8px; padding:8px 14px;">PUBLISH 🌐</button>
                    <button id="btn-builder-close" class="btn secondary" style="font-size:8px; padding:8px 12px; background:#aa2222; border-color:#881111;">EXIT</button>
                </div>
            </div>

            <!-- Main Workspace Container -->
            <div style="display:flex; flex:1; overflow:hidden; position:relative;">
                <!-- Left Sidebar: Tools & Palette -->
                <div style="width:300px; background:#0f1522; border-right:2px solid #2a3b5c; display:flex; flex-direction:column; padding:12px; overflow-y:auto; flex-shrink:0;">
                    <!-- Tool Tabs -->
                    <div style="display:flex; gap:4px; margin-bottom:12px;">
                        <button class="btn tool-tab-btn active" data-tool="building" style="flex:1; font-size:7px; padding:8px 4px;">🏢 Buildings</button>
                        <button class="btn tool-tab-btn" data-tool="tile" style="flex:1; font-size:7px; padding:8px 4px;">🎨 Tiles</button>
                        <button class="btn tool-tab-btn" data-tool="entity" style="flex:1; font-size:7px; padding:8px 4px;">📦 Objects/NPCs</button>
                        <button class="btn tool-tab-btn" data-tool="gallery" style="flex:1; font-size:7px; padding:8px 4px;">🎞️ Gallery</button>
                    </div>

                    <!-- Panel: Building Plopper -->
                    <div id="panel-building" class="tool-panel">
                        <div style="font-size:8px; color:#ffaa00; margin-bottom:8px;">BUILDING PLOPPER</div>
                        <div style="font-size:7px; color:#aaa; margin-bottom:10px; line-height:1.4;">Plop buildings anywhere on map. Overlapping is supported!</div>
                        
                        <div style="font-size:8px; color:#00ffcc; margin-bottom:6px;">Preset Dimensions:</div>
                        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-bottom:12px;">
                            <button class="btn size-btn active" data-w="2" data-h="2">2x2</button>
                            <button class="btn size-btn" data-w="3" data-h="3">3x3</button>
                            <button class="btn size-btn" data-w="4" data-h="4">4x4</button>
                            <button class="btn size-btn" data-w="5" data-h="5">5x5</button>
                            <button class="btn size-btn" data-w="6" data-h="6">6x6</button>
                            <button class="btn size-btn" data-w="8" data-h="8">8x8</button>
                        </div>

                        <div style="font-size:8px; color:#00ffcc; margin-bottom:6px;">Building Colors:</div>
                        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px; background:#162032; padding:10px; border-radius:8px;">
                            <label style="font-size:7px; display:flex; justify-content:space-between; align-items:center;">
                                Base Color: <input type="color" id="bldg-color-base" value="#6b5b73" style="border:none; cursor:pointer; width:30px; height:20px; background:none;" />
                            </label>
                            <label style="font-size:7px; display:flex; justify-content:space-between; align-items:center;">
                                Roof Color: <input type="color" id="bldg-color-roof" value="#7d6d85" style="border:none; cursor:pointer; width:30px; height:20px; background:none;" />
                            </label>
                            <label style="font-size:7px; display:flex; justify-content:space-between; align-items:center;">
                                Shadow Color: <input type="color" id="bldg-color-dark" value="#5a4d62" style="border:none; cursor:pointer; width:30px; height:20px; background:none;" />
                            </label>
                        </div>

                        <div style="font-size:8px; color:#00ffcc; margin-bottom:6px;">Color Palettes:</div>
                        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; margin-bottom:12px;">
                            <button class="btn palette-btn" data-base="#6b5b73" data-roof="#7d6d85" data-dark="#5a4d62" style="background:#6b5b73; height:24px; border:2px solid #7d6d85;"></button>
                            <button class="btn palette-btn" data-base="#5b6b73" data-roof="#6d7d85" data-dark="#4d5a62" style="background:#5b6b73; height:24px; border:2px solid #6d7d85;"></button>
                            <button class="btn palette-btn" data-base="#73655b" data-roof="#85776d" data-dark="#62574d" style="background:#73655b; height:24px; border:2px solid #85776d;"></button>
                            <button class="btn palette-btn" data-base="#5b7367" data-roof="#6d8579" data-dark="#4d6259" style="background:#5b7367; height:24px; border:2px solid #6d8579;"></button>
                            <button class="btn palette-btn" data-base="#735b5b" data-roof="#856d6d" data-dark="#624d4d" style="background:#735b5b; height:24px; border:2px solid #856d6d;"></button>
                            <button class="btn palette-btn" data-base="#5b5b73" data-roof="#6d6d85" data-dark="#4d4d62" style="background:#5b5b73; height:24px; border:2px solid #6d6d85;"></button>
                            <button class="btn palette-btn" data-base="#6b735b" data-roof="#7d856d" data-dark="#5a624d" style="background:#6b735b; height:24px; border:2px solid #7d856d;"></button>
                            <button class="btn palette-btn" data-base="#735b6b" data-roof="#856d7d" data-dark="#624d5a" style="background:#735b6b; height:24px; border:2px solid #856d7d;"></button>
                        </div>
                    </div>

                    <!-- Panel: Tile Painter -->
                    <div id="panel-tile" class="tool-panel" style="display:none;">
                        <div style="font-size:8px; color:#ffaa00; margin-bottom:8px;">TILE PAINTER</div>
                        <div style="font-size:8px; color:#00ffcc; margin-bottom:6px;">Select Tile:</div>
                        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; margin-bottom:12px;">
                            <button class="btn tile-select-btn active" data-tile="2" style="background:#4a8c3f;">🌱 Grass</button>
                            <button class="btn tile-select-btn" data-tile="0" style="background:#4a4a4a;">🛣️ Road</button>
                            <button class="btn tile-select-btn" data-tile="1" style="background:#b0a89a; color:#222;">🧱 Sidewalk</button>
                            <button class="btn tile-select-btn" data-tile="3" style="background:#6b5b73;">🏢 Building</button>
                            <button class="btn tile-select-btn" data-tile="5" style="background:#d4d4d4; color:#222;">🚸 Crosswalk</button>
                            <button class="btn tile-select-btn" data-tile="6" style="background:#c8b890; color:#222;">🌳 Park Path</button>
                            <button class="btn tile-select-btn" data-tile="water" style="background:#0f4c81;">🌊 Water</button>
                        </div>

                        <div style="font-size:8px; color:#00ffcc; margin-bottom:6px;">Brush Size:</div>
                        <div style="display:flex; gap:6px; margin-bottom:12px;">
                            <button class="btn brush-btn active" data-size="1">1x1</button>
                            <button class="btn brush-btn" data-size="2">2x2</button>
                            <button class="btn brush-btn" data-size="3">3x3</button>
                            <button class="btn brush-btn" data-size="5">5x5</button>
                            <button class="btn brush-btn" data-size="fill">🪣 Fill</button>
                        </div>
                    </div>

                    <!-- Panel: Entity & Object Plopper -->
                    <div id="panel-entity" class="tool-panel" style="display:none;">
                        <div style="font-size:8px; color:#ffaa00; margin-bottom:8px;">OBJECT & NPC PLOPPER</div>
                        <div style="display:flex; gap:4px; margin-bottom:10px;">
                            <button class="btn entity-cat-btn active" data-cat="objects" style="font-size:6px; flex:1;">Store Items</button>
                            <button class="btn entity-cat-btn" data-cat="trees" style="font-size:6px; flex:1;">Trees</button>
                            <button class="btn entity-cat-btn" data-cat="npcs" style="font-size:6px; flex:1;">NPCs / Mobs</button>
                        </div>
                        <div id="entity-list-container" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; max-height:300px; overflow-y:auto; background:#162032; padding:8px; border-radius:8px;">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <!-- Panel: Gallery Extension -->
                    <div id="panel-gallery" class="tool-panel" style="display:none;">
                        <div style="font-size:8px; color:#ffaa00; margin-bottom:8px;">GALLERY PHOTO FILTERS</div>
                        <div style="font-size:7px; color:#aaa; margin-bottom:10px; line-height:1.4;">Apply visual atmosphere shaders to your world view.</div>
                        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; margin-bottom:12px;">
                            <button class="btn filter-option-btn active" data-filter="normal">Normal</button>
                            <button class="btn filter-option-btn" data-filter="vintage">Retro 🎞️</button>
                            <button class="btn filter-option-btn" data-filter="neon">Neon ⚡</button>
                            <button class="btn filter-option-btn" data-filter="sepia">Sepia 📜</button>
                            <button class="btn filter-option-btn" data-filter="bw">B&W 🎬</button>
                            <button class="btn filter-option-btn" data-filter="vivid">Vivid 🌈</button>
                        </div>
                    </div>

                    <!-- Canvas Action Bar -->
                    <div style="margin-top:auto; padding-top:12px; border-top:1px solid #2a3b5c; display:flex; flex-direction:column; gap:6px;">
                        <div style="display:flex; gap:6px;">
                            <button id="btn-builder-undo" class="btn secondary" style="flex:1; font-size:7px;">↩️ Undo</button>
                            <button id="btn-builder-clear" class="btn secondary" style="flex:1; font-size:7px; background:#aa2222; border-color:#881111;">🗑️ Clear</button>
                        </div>
                    </div>
                </div>

                <!-- Canvas Viewport -->
                <div id="builder-viewport" style="flex:1; background:#080b12; position:relative; overflow:hidden; cursor:crosshair;">
                    <canvas id="world-builder-canvas"></canvas>
                    
                    <!-- Viewport HUD Overlay -->
                    <div style="position:absolute; bottom:16px; right:16px; background:rgba(10,16,26,0.85); padding:8px 14px; border-radius:8px; border:1px solid #2a3b5c; font-size:8px; color:#00ffcc; display:flex; gap:16px;">
                        <span id="builder-coords">Tile: (0, 0)</span>
                        <span id="builder-stats">Buildings: 0 | Entities: 0</span>
                        <span>Zoom: <span id="builder-zoom-text">100%</span></span>
                    </div>

                    <!-- Zoom Controls -->
                    <div style="position:absolute; top:16px; right:16px; display:flex; flex-direction:column; gap:6px;">
                        <button id="btn-builder-zoom-in" class="btn secondary" style="width:36px; height:36px; padding:0; font-size:14px;">+</button>
                        <button id="btn-builder-zoom-out" class="btn secondary" style="width:36px; height:36px; padding:0; font-size:14px;">-</button>
                        <button id="btn-builder-zoom-reset" class="btn secondary" style="width:36px; height:36px; padding:0; font-size:8px;">1:1</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.container = modal;

        this.canvas = modal.querySelector('#world-builder-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.bindEvents();
        this.renderEntityList();
    }

    bindEvents() {
        const modal = this.container;

        modal.querySelector('#btn-builder-close').addEventListener('click', () => this.close());
        modal.querySelector('#btn-builder-new').addEventListener('click', () => {
            if (confirm('Create new blank 128x128 map? Any unsaved edits will be cleared.')) {
                this.mapData = this.createBlankMapData(modal.querySelector('#builder-map-title').value);
                this.render();
            }
        });

        modal.querySelector('#btn-builder-load-preset').addEventListener('click', () => {
            const choice = prompt('Load Preset Map:\n1. City Map (Standard)\n2. Cucaracha Biome (Jungle)\n3. Dahgbad Biome (Desert)\n\nEnter 1, 2, or 3:');
            if (!choice) return;
            let tempMap = null;
            if (choice === '1') tempMap = new GameMap();
            else if (choice === '2') tempMap = new CucarachaMap();
            else if (choice === '3') tempMap = new DahgbadMap();

            if (tempMap) {
                this.mapData.tiles = tempMap.tiles;
                this.mapData.buildingMeta = tempMap.buildingMeta;
                this.mapData.buildings = tempMap.buildings;
                this.mapData.trees = tempMap.trees || [];
                this.render();
            }
        });

        modal.querySelector('#btn-builder-test').addEventListener('click', () => {
            this.testMap();
        });

        modal.querySelector('#btn-builder-publish').addEventListener('click', async () => {
            const title = modal.querySelector('#builder-map-title').value.trim() || 'Untitled Map';
            const mode = modal.querySelector('#builder-restricted-mode').value;
            const desc = prompt('Enter a brief description for your published map:', 'Explore my custom 128x128 map creation!');
            if (desc === null) return;

            this.mapData.title = title;
            this.mapData.restricted_mode = mode;
            this.mapData.description = desc;

            try {
                const res = await window.publishMapData(title, desc, mode, this.mapData);
                alert(`🎉 Map Published Successfully!\nMap ID: ${res.map_id}\nUsers can now play your map in Community Maps!`);
            } catch (err) {
                // Save locally if offline
                let localMaps = JSON.parse(localStorage.getItem('published_custom_maps') || '[]');
                localMaps.unshift({
                    id: Date.now(),
                    title,
                    description: desc,
                    restricted_mode: mode,
                    author_username: window.currentUsername || 'Local Builder',
                    created_at: new Date().toISOString(),
                    play_count: 0,
                    map_data: this.mapData
                });
                localStorage.setItem('published_custom_maps', JSON.stringify(localMaps));
                alert('Saved map locally to your browser drafts!');
            }
        });

        // Tab Switching
        modal.querySelectorAll('.tool-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                modal.querySelectorAll('.tool-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;

                modal.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
                const targetPanel = modal.querySelector(`#panel-${this.currentTool}`);
                if (targetPanel) targetPanel.style.display = 'block';
            });
        });

        // Building Size Buttons
        modal.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.buildingSize = { w: parseInt(btn.dataset.w), h: parseInt(btn.dataset.h) };
            });
        });

        // Palette Color Buttons
        modal.querySelectorAll('.palette-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.buildingColor = {
                    base: btn.dataset.base,
                    roof: btn.dataset.roof,
                    dark: btn.dataset.dark
                };
                modal.querySelector('#bldg-color-base').value = btn.dataset.base;
                modal.querySelector('#bldg-color-roof').value = btn.dataset.roof;
                modal.querySelector('#bldg-color-dark').value = btn.dataset.dark;
            });
        });

        // Color Inputs
        modal.querySelector('#bldg-color-base').addEventListener('input', (e) => this.buildingColor.base = e.target.value);
        modal.querySelector('#bldg-color-roof').addEventListener('input', (e) => this.buildingColor.roof = e.target.value);
        modal.querySelector('#bldg-color-dark').addEventListener('input', (e) => this.buildingColor.dark = e.target.value);

        // Tile Select Buttons
        modal.querySelectorAll('.tile-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.tile-select-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const t = btn.dataset.tile;
                this.selectedTileType = t === 'water' ? 0 : parseInt(t);
            });
        });

        // Brush Buttons
        modal.querySelectorAll('.brush-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.brushSize = btn.dataset.size === 'fill' ? 'fill' : parseInt(btn.dataset.size);
            });
        });

        // Filter Buttons
        modal.querySelectorAll('.filter-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.filter-option-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeFilter = btn.dataset.filter;
                this.render();
            });
        });

        // Entity Category Tabs
        modal.querySelectorAll('.entity-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.entity-cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedEntityCategory = btn.dataset.cat;
                this.renderEntityList();
            });
        });

        // Canvas Pan & Paint Drag Handlers
        const viewport = modal.querySelector('#builder-viewport');

        viewport.addEventListener('mousedown', (e) => {
            if (e.button === 1 || e.shiftKey) { // Middle click or shift-click to pan
                this.isDragging = true;
                this.dragStart = { x: e.clientX - this.camera.x, y: e.clientY - this.camera.y };
            } else if (e.button === 0) {
                this.isMouseDown = true;
                this.applyToolAtMouse(e);
            }
        });

        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const tileX = Math.floor((mouseX - this.camera.x) / (this.tileSize * this.camera.zoom));
            const tileY = Math.floor((mouseY - this.camera.y) / (this.tileSize * this.camera.zoom));

            modal.querySelector('#builder-coords').innerText = `Tile: (${tileX}, ${tileY})`;

            if (this.isDragging) {
                this.camera.x = e.clientX - this.dragStart.x;
                this.camera.y = e.clientY - this.dragStart.y;
                this.render();
            } else if (this.isMouseDown) {
                this.applyToolAtMouse(e);
            } else {
                this.render();
                this.renderToolPreview(tileX, tileY);
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.isMouseDown = false;
        });

        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
            this.setZoom(this.camera.zoom * zoomFactor);
        });

        modal.querySelector('#btn-builder-zoom-in').addEventListener('click', () => this.setZoom(this.camera.zoom * 1.25));
        modal.querySelector('#btn-builder-zoom-out').addEventListener('click', () => this.setZoom(this.camera.zoom * 0.8));
        modal.querySelector('#btn-builder-zoom-reset').addEventListener('click', () => this.setZoom(1));

        modal.querySelector('#btn-builder-clear').addEventListener('click', () => {
            if (confirm('Clear entire map to grass?')) {
                this.mapData = this.createBlankMapData();
                this.render();
            }
        });
    }

    setZoom(newZoom) {
        this.camera.zoom = Math.max(0.2, Math.min(4.0, newZoom));
        this.container.querySelector('#builder-zoom-text').innerText = `${Math.round(this.camera.zoom * 100)}%`;
        this.render();
    }

    renderEntityList() {
        const container = this.container.querySelector('#entity-list-container');
        if (!container) return;
        container.innerHTML = '';

        let items = [];
        if (this.selectedEntityCategory === 'objects') {
            items = [
                { id: 'dumpster', name: 'Dumpster', type: 'object', spriteId: 'dump' },
                { id: 'black_market', name: 'Black Market', type: 'object', spriteId: 'black_market' },
                { id: 'vending', name: 'Vending Machine', type: 'object', spriteId: 'item_snacks' },
                { id: 'statue', name: 'Liberty Bell', type: 'object', spriteId: 'philly_liberty_bell' },
                { id: 'fountain', name: 'Art Museum', type: 'object', spriteId: 'philly_art_museum' },
                { id: 'treasure', name: 'Treasure Chest', type: 'object', spriteId: 'treasure' },
                { id: 'shroom', name: 'Mushroom', type: 'object', spriteId: 'shroom' },
                { id: 'flower', name: 'Flower', type: 'object', spriteId: 'flower' }
            ];
        } else if (this.selectedEntityCategory === 'trees') {
            items = [
                { id: 'tree_burm', name: 'Burm Tree', type: 'tree', treeType: 'burm' },
                { id: 'tree_park', name: 'Park Tree', type: 'tree', treeType: 'park' },
                { id: 'tree_palm', name: 'Palm Tree', type: 'tree', treeType: 'palm' }
            ];
        } else if (this.selectedEntityCategory === 'npcs') {
            items = [
                { id: 'npc_citizen', name: 'Citizen NPC', type: 'npc', role: 'citizen', spriteId: 'char_npc' },
                { id: 'npc_police', name: 'Police Officer', type: 'npc', role: 'police', spriteId: 'char3' },
                { id: 'npc_mafia', name: 'Mafia Thug', type: 'npc', role: 'mafia', spriteId: 'char4' },
                { id: 'npc_cult', name: 'Cultist', type: 'npc', role: 'cult', spriteId: 'cult_white_robe' },
                { id: 'npc_truck', name: 'Trash Truck', type: 'npc', role: 'truck', spriteId: 'char_truck' },
                { id: 'npc_boat', name: 'Boat NPC', type: 'npc', role: 'boat', spriteId: 'npc_boat' },
                { id: 'npc_dragon', name: 'Dragon', type: 'npc', role: 'dragon', spriteId: 'char_dragon' }
            ];
        }

        items.forEach((item, idx) => {
            const card = document.createElement('button');
            card.className = `btn entity-card ${idx === 0 ? 'active' : ''}`;
            card.style.cssText = `
                display:flex; flex-direction:column; align-items:center; justify-content:center;
                padding:8px; font-size:6px; background:#1e2a3e; border:1px solid #3b4d70; border-radius:6px; cursor:pointer; color:#fff;
            `;
            card.innerHTML = `<span style="font-size:14px; margin-bottom:4px;">📦</span>${item.name}`;
            card.addEventListener('click', () => {
                container.querySelectorAll('.entity-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.selectedEntity = item;
            });
            container.appendChild(card);
        });

        if (items.length > 0) this.selectedEntity = items[0];
    }

    applyToolAtMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const tx = Math.floor((mouseX - this.camera.x) / (this.tileSize * this.camera.zoom));
        const ty = Math.floor((mouseY - this.camera.y) / (this.tileSize * this.camera.zoom));

        if (tx < 0 || tx >= this.mapW || ty < 0 || ty >= this.mapH) return;

        if (this.currentTool === 'tile') {
            if (this.brushSize === 'fill') {
                this.floodFillTile(tx, ty, this.selectedTileType);
            } else {
                for (let dy = 0; dy < this.brushSize; dy++) {
                    for (let dx = 0; dx < this.brushSize; dx++) {
                        const wx = tx + dx;
                        const wy = ty + dy;
                        if (wx < this.mapW && wy < this.mapH) {
                            this.mapData.tiles[wy][wx] = this.selectedTileType;
                        }
                    }
                }
            }
        } else if (this.currentTool === 'building') {
            const bw = this.buildingSize.w;
            const bh = this.buildingSize.h;
            const bldgId = this.mapData.buildings.length;
            const bldgTiles = [];

            for (let dy = 0; dy < bh; dy++) {
                for (let dx = 0; dx < bw; dx++) {
                    const wx = tx + dx;
                    const wy = ty + dy;
                    if (wx < this.mapW && wy < this.mapH) {
                        this.mapData.tiles[wy][wx] = 3; // TileType.BUILDING
                        this.mapData.buildingMeta[wy][wx] = bldgId;
                        bldgTiles.push({ x: wx, y: wy });
                    }
                }
            }

            // Door on bottom center
            const doorTile = { x: tx + Math.floor(bw / 2), y: ty + bh - 1 };
            this.mapData.tiles[doorTile.y][doorTile.x] = 4; // TileType.BUILDING_DOOR

            this.mapData.buildings.push({
                id: bldgId,
                address: `BLDG-${bldgId + 1}`,
                tiles: bldgTiles,
                doorTiles: [doorTile],
                customColors: { ...this.buildingColor },
                type: 'custom',
                x: tx * 64,
                y: ty * 64,
                width: bw * 64,
                height: bh * 64
            });
        } else if (this.currentTool === 'entity') {
            if (this.selectedEntity.type === 'tree') {
                this.mapData.trees.push({
                    id: Date.now(),
                    tileX: tx,
                    tileY: ty,
                    x: tx * 64 + 32,
                    y: ty * 64 + 32,
                    type: this.selectedEntity.treeType || 'park'
                });
            } else if (this.selectedEntity.type === 'object') {
                this.mapData.objects.push({
                    id: Date.now(),
                    tileX: tx,
                    tileY: ty,
                    x: tx * 64 + 32,
                    y: ty * 64 + 32,
                    spriteId: this.selectedEntity.spriteId,
                    name: this.selectedEntity.name
                });
            } else if (this.selectedEntity.type === 'npc') {
                this.mapData.npcs.push({
                    id: Date.now(),
                    tileX: tx,
                    tileY: ty,
                    x: tx * 64 + 32,
                    y: ty * 64 + 32,
                    role: this.selectedEntity.role,
                    spriteId: this.selectedEntity.spriteId
                });
            }
        }

        this.render();
    }

    floodFillTile(startX, startY, newTile) {
        const targetTile = this.mapData.tiles[startY][startX];
        if (targetTile === newTile) return;

        const stack = [{ x: startX, y: startY }];
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            if (x < 0 || x >= this.mapW || y < 0 || y >= this.mapH) continue;
            if (this.mapData.tiles[y][x] === targetTile) {
                this.mapData.tiles[y][x] = newTile;
                stack.push({ x: x + 1, y });
                stack.push({ x: x - 1, y });
                stack.push({ x, y: y + 1 });
                stack.push({ x, y: y - 1 });
            }
        }
    }

    resizeCanvas() {
        const viewport = this.container.querySelector('#builder-viewport');
        if (!viewport) return;
        this.canvas.width = viewport.clientWidth;
        this.canvas.height = viewport.clientHeight;
    }

    render() {
        if (!this.canvas) return;
        this.resizeCanvas();
        const ctx = this.ctx;
        const z = this.camera.zoom;
        const ts = this.tileSize * z;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply Gallery Filter Atmosphere
        ctx.save();
        if (this.activeFilter === 'vintage') ctx.filter = 'sepia(0.6) contrast(1.2)';
        else if (this.activeFilter === 'neon') ctx.filter = 'hue-rotate(180deg) saturate(2)';
        else if (this.activeFilter === 'sepia') ctx.filter = 'sepia(1)';
        else if (this.activeFilter === 'bw') ctx.filter = 'grayscale(1)';
        else if (this.activeFilter === 'vivid') ctx.filter = 'saturate(2.5)';

        // Render Map Grid
        const colors = { 0: '#4a4a4a', 1: '#b0a89a', 2: '#4a8c3f', 3: '#6b5b73', 4: '#8b7355', 5: '#d4d4d4', 6: '#c8b890' };

        for (let y = 0; y < this.mapH; y++) {
            for (let x = 0; x < this.mapW; x++) {
                const sx = this.camera.x + x * ts;
                const sy = this.camera.y + y * ts;

                if (sx + ts < 0 || sx > this.canvas.width || sy + ts < 0 || sy > this.canvas.height) continue;

                const tile = this.mapData.tiles[y][x];
                let color = colors[tile] || '#4a8c3f';

                // Check custom building colors
                const bldgIdx = this.mapData.buildingMeta[y][x];
                if (tile === 3 && bldgIdx >= 0 && this.mapData.buildings[bldgIdx] && this.mapData.buildings[bldgIdx].customColors) {
                    color = this.mapData.buildings[bldgIdx].customColors.base;
                }

                ctx.fillStyle = color;
                ctx.fillRect(sx, sy, ts, ts);

                // Subtile grid outline if zoomed in
                if (z >= 0.7) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(sx, sy, ts, ts);
                }
            }
        }

        // Draw Trees
        if (this.mapData.trees) {
            ctx.fillStyle = '#2e8b57';
            for (const tree of this.mapData.trees) {
                const sx = this.camera.x + tree.tileX * ts;
                const sy = this.camera.y + tree.tileY * ts;
                if (sx + ts >= 0 && sx <= this.canvas.width && sy + ts >= 0 && sy <= this.canvas.height) {
                    ctx.beginPath();
                    ctx.arc(sx + ts / 2, sy + ts / 2, ts * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Draw Objects & NPCs
        if (this.mapData.objects) {
            ctx.fillStyle = '#ffaa00';
            for (const obj of this.mapData.objects) {
                const sx = this.camera.x + obj.tileX * ts;
                const sy = this.camera.y + obj.tileY * ts;
                if (sx + ts >= 0 && sx <= this.canvas.width && sy + ts >= 0 && sy <= this.canvas.height) {
                    ctx.fillRect(sx + ts * 0.25, sy + ts * 0.25, ts * 0.5, ts * 0.5);
                }
            }
        }

        if (this.mapData.npcs) {
            ctx.fillStyle = '#00ffff';
            for (const npc of this.mapData.npcs) {
                const sx = this.camera.x + npc.tileX * ts;
                const sy = this.camera.y + npc.tileY * ts;
                if (sx + ts >= 0 && sx <= this.canvas.width && sy + ts >= 0 && sy <= this.canvas.height) {
                    ctx.beginPath();
                    ctx.arc(sx + ts / 2, sy + ts / 2, ts * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        ctx.restore();

        // Update Stats Display
        const statsEl = this.container.querySelector('#builder-stats');
        if (statsEl) {
            const bCount = this.mapData.buildings.length;
            const eCount = (this.mapData.trees.length || 0) + (this.mapData.objects.length || 0) + (this.mapData.npcs.length || 0);
            statsEl.innerText = `Buildings: ${bCount} | Objects/NPCs: ${eCount}`;
        }
    }

    renderToolPreview(tileX, tileY) {
        if (tileX < 0 || tileX >= this.mapW || tileY < 0 || tileY >= this.mapH) return;
        const ctx = this.ctx;
        const z = this.camera.zoom;
        const ts = this.tileSize * z;
        const sx = this.camera.x + tileX * ts;
        const sy = this.camera.y + tileY * ts;

        ctx.save();
        if (this.currentTool === 'building') {
            const pw = this.buildingSize.w * ts;
            const ph = this.buildingSize.h * ts;
            ctx.fillStyle = 'rgba(0, 255, 204, 0.3)';
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2;
            ctx.fillRect(sx, sy, pw, ph);
            ctx.strokeRect(sx, sy, pw, ph);
        } else if (this.currentTool === 'tile') {
            const pw = (this.brushSize === 'fill' ? 1 : this.brushSize) * ts;
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx, sy, pw, pw);
        } else if (this.currentTool === 'entity') {
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx, sy, ts, ts);
        }
        ctx.restore();
    }

    testMap() {
        window.customMapData = this.mapData;
        this.close();

        // Trigger game initialization with custom map
        if (window.game) {
            window.game.initCustomMap(this.mapData);
        } else {
            const playBtn = document.getElementById('btn-start-game');
            if (playBtn) playBtn.click();
        }
    }

    open(existingData = null) {
        if (existingData) {
            this.mapData = existingData;
        }
        this.container.style.display = 'flex';
        this.camera = { x: 50, y: 50, zoom: 0.8 };
        this.render();
    }

    close() {
        this.container.style.display = 'none';
    }
}

// Global Singleton Instance
window.worldBuilder = new WorldBuilder();
