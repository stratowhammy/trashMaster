// ============================================================
// world_builder.js — Interactive World Builder & Map Editor
// ============================================================

const SPECIAL_BUILDINGS = [
    // 🍔 Restaurants
    { type: 'chinos_steaks', category: 'restaurants', name: "Chino's Steaks", icon: '🥩', w: 4, h: 4, color: '#ff3333', borderColor: '#ff6666', desc: 'Rival Cheesesteak (+90-100% Hunger, +45-70% Happiness)' },
    { type: 'rats_steaks', category: 'restaurants', name: "Rats Steaks", icon: '🥩', w: 4, h: 4, color: '#3399ff', borderColor: '#66b2ff', desc: 'Rival Cheesesteak (+90-100% Hunger, +45-70% Happiness)' },
    { type: 'zippy_ds', category: 'restaurants', name: "Zippy D's", icon: '🌯', w: 3, h: 3, color: '#ffcc00', borderColor: '#ffe066', desc: 'SnackRap Stand (+25-45% Hunger, +8-18% Happiness)' },
    { type: 'goose', category: 'restaurants', name: "Goose", icon: '🥪', w: 4, h: 4, color: '#ffaa00', borderColor: '#ffcc44', desc: 'Classic Hoagies (+55-80% Hunger, +20-35% Happiness)' },
    { type: 'fast_food', category: 'restaurants', name: "Fast Food Joint", icon: '🍔', w: 3, h: 3, color: '#ff8800', borderColor: '#ffaa44', desc: 'Fast Food Burgers & Fries' },

    // 🏥 Infrastructure & Facilities
    { type: 'dump', category: 'facilities', name: "City Dump", icon: '🗑️', w: 5, h: 5, color: '#00ff88', borderColor: '#44ffaa', desc: 'Trash Compact Yard & Payout Point' },
    { type: 'airport', category: 'facilities', name: "City Airport", icon: '✈️', w: 6, h: 6, color: '#00ccff', borderColor: '#66e0ff', desc: 'Flight Terminal & Global Biome Travel' },
    { type: 'black_market', category: 'facilities', name: "Black Market", icon: '☠️', w: 3, h: 3, color: '#ff0055', borderColor: '#ff4488', desc: 'Underground Vault & Lid Trading ($250/ea)' },
    { type: 'hospital', category: 'facilities', name: "City Hospital", icon: '🏥', w: 4, h: 4, color: '#ff4444', borderColor: '#ff8888', desc: 'Emergency Ward, Quinine & Cure Sickness' },
    { type: 'police', category: 'facilities', name: "Police Dept", icon: '👮', w: 4, h: 4, color: '#3388ff', borderColor: '#66a3ff', desc: 'Law Enforcement Precinct & Inspector Bribes' },
    { type: 'bank', category: 'facilities', name: "First Bank", icon: '🏦', w: 4, h: 4, color: '#ffd700', borderColor: '#ffe666', desc: 'National Bank & Cash Reserves Vault' },
    { type: 'zoo', category: 'facilities', name: "City Zoo", icon: '🦁', w: 6, h: 6, color: '#ffaa00', borderColor: '#ffcc44', desc: 'Wild Animal Reserve & Ranger Cargo Depot' },
    { type: 'pulp_mill', category: 'facilities', name: "Pulp Mill", icon: '🪵', w: 5, h: 5, color: '#e08a44', borderColor: '#f0aa77', desc: 'Lumber & Paper Processing Plant' },
    { type: 'cityhall', category: 'facilities', name: "City Hall", icon: '🏛️', w: 6, h: 6, color: '#00ffcc', borderColor: '#66ffea', desc: 'Government Seat, Elections & Politics' },

    // 🔔 Philly Landmarks
    { type: 'art_museum', category: 'philly', name: "Art Museum", icon: '🎨', w: 6, h: 6, color: '#ff77bb', borderColor: '#ff99cc', desc: 'Famous Rocky Steps & Cultural Center' },
    { type: 'liberty_bell', category: 'philly', name: "Liberty Bell", icon: '🔔', w: 4, h: 4, color: '#ffd700', borderColor: '#ffe57f', desc: 'Historic Cracked Liberty Bell Pavilion' },
    { type: 'one_liberty', category: 'philly', name: "One Liberty", icon: '🏙️', w: 5, h: 5, color: '#00d2ff', borderColor: '#66e3ff', desc: 'Iconic Skyscraper Observation Tower' },
    { type: 'franklin_institute', category: 'philly', name: "Franklin Inst", icon: '⚡', w: 5, h: 5, color: '#00ff88', borderColor: '#66ffb2', desc: 'Hands-on Science Museum & Heart Walk' },
    { type: 'station', category: 'philly', name: "30th St Station", icon: '🚆', w: 6, h: 6, color: '#ffaa44', borderColor: '#ffc577', desc: 'Historic Grand Transit Hub' },

    // 🏜️ Dahgbad & Cucaracha Biomes
    { type: 'burj_khalifa', category: 'biomes', name: "Burj Khalifa", icon: '🏙️', w: 5, h: 5, color: '#00e5ff', borderColor: '#66efff', desc: 'Dahgbad Desert Spire' },
    { type: 'petra', category: 'biomes', name: "Petra Ruins", icon: '🏛️', w: 5, h: 5, color: '#ff8844', borderColor: '#ffaa77', desc: 'Rock-Cut Treasury of Dahgbad' },
    { type: 'dome_of_rock', category: 'biomes', name: "Dome of Rock", icon: '🕌', w: 5, h: 5, color: '#ffd700', borderColor: '#ffe57f', desc: 'Golden Shrine of Dahgbad' },
    { type: 'pyramids', category: 'biomes', name: "Great Pyramids", icon: '🔺', w: 6, h: 6, color: '#ffaa00', borderColor: '#ffcc44', desc: 'Ancient Dahgbad Monument' },
    { type: 'burj_al_arab', category: 'biomes', name: "Burj Al Arab", icon: '⛵', w: 5, h: 5, color: '#00bcd4', borderColor: '#4dd0e1', desc: 'Sail Hotel Landmark' },
    { type: 'kingdom_centre', category: 'biomes', name: "Kingdom Centre", icon: '🏢', w: 5, h: 5, color: '#7c4dff', borderColor: '#b388ff', desc: 'Skyscraper Landmark' },
    { type: 'christ_redeemer', category: 'biomes', name: "Christ Redeemer", icon: '🗽', w: 5, h: 5, color: '#00e676', borderColor: '#69f0ae', desc: 'Cucaracha Jungle Mountain Statue' },
    { type: 'machu_picchu', category: 'biomes', name: "Machu Picchu", icon: '⛰️', w: 6, h: 6, color: '#8d6e63', borderColor: '#bcaaa4', desc: 'Ancient Mountain Citadel' },
    { type: 'obelisco_ba', category: 'biomes', name: "Obelisco BA", icon: '🏛️', w: 4, h: 4, color: '#29b6f6', borderColor: '#81d4fa', desc: 'Cucaracha Boulevard Obelisk' },
    { type: 'torre_entel', category: 'biomes', name: "Torre Entel", icon: '🗼', w: 4, h: 4, color: '#ab47bc', borderColor: '#ce93d8', desc: 'Cucaracha Comm Tower' },
    { type: 'palacio_salvo', category: 'biomes', name: "Palacio Salvo", icon: '🏰', w: 5, h: 5, color: '#ffa726', borderColor: '#ffcc80', desc: 'Gothic Palace Landmark' },
    { type: 'congresso_nacional', category: 'biomes', name: "Congresso", icon: '🏛️', w: 6, h: 6, color: '#26a69a', borderColor: '#80cbc4', desc: 'National Assembly Landmark' }
];

class WorldBuilder {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.mapW = 128;
        this.mapH = 128;
        this.tileSize = 32;

        this.camera = { x: 0, y: 0, zoom: 1 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.isMouseDown = false;

        this.currentTool = 'building';
        this.buildingPlopperMode = 'special';
        this.selectedSpecialBuilding = SPECIAL_BUILDINGS[0];
        this.specialBldgCategoryFilter = 'all';

        this.selectedTileType = 0;
        this.brushSize = 1;

        // Trash Field Brush State
        this.trashFieldRadius = 3;
        this.trashFieldDensity = 0.5;
        this.trashFieldType = 'random';

        // Custom Building Plopper state
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

        // Draft ID tracking
        this.currentDraftId = null;
        this.autoSaveTimer = null;

        // Map Data & Undo Stack (20 steps)
        this.mapData = this.createBlankMapData();
        this.undoStack = [];
        this.drawStartTile = null;
        this.lastTile = null;

        this.initDOM();
    }

    createBlankMapData(title = 'My Custom Map') {
        const tiles = Array.from({ length: this.mapH }, () =>
            Array.from({ length: this.mapW }, () => 2) // Grass
        );
        const buildingMeta = Array.from({ length: this.mapH }, () =>
            Array.from({ length: this.mapW }, () => -1)
        );
        this.currentDraftId = `draft_${Date.now()}`;
        return {
            id: this.currentDraftId,
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
            trash: [],
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
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="color:#00ffcc; font-size:11px; text-shadow:0 0 10px rgba(0,255,204,0.5);">🗺️ WORLD BUILDER</span>
                    <input type="text" id="builder-map-title" value="My Custom 128x128 Map" style="background:#101724; border:1px solid #3b4d70; color:#fff; font-family:inherit; font-size:8px; padding:6px 10px; border-radius:6px; width:200px;" placeholder="Map Name..." />
                    <select id="builder-restricted-mode" style="background:#101724; border:1px solid #3b4d70; color:#00ffcc; font-family:inherit; font-size:7px; padding:6px 8px; border-radius:6px;">
                        <option value="all">🌐 Mode: ALL</option>
                        <option value="standard">🏙️ Standard</option>
                        <option value="pirate">🏴‍☠️ Pirate Mode</option>
                        <option value="car">🏎️ Car Mode</option>
                        <option value="crime">💰 Crime Mode</option>
                        <option value="cult">👁️ Cult Mode</option>
                        <option value="flowers">🌸 Flowers Mode</option>
                    </select>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button id="btn-builder-undo" class="btn secondary" style="font-size:7px; padding:8px 10px; background:#442266; border-color:#8844cc; opacity:0.5;" disabled>UNDO ↩️</button>
                    <button id="btn-builder-save-draft" class="btn" style="background:linear-gradient(135deg,#0088ff,#0044aa); font-size:7px; padding:8px 10px;">SAVE DRAFT 💾</button>
                    <button id="btn-builder-my-drafts" class="btn secondary" style="font-size:7px; padding:8px 10px;">MY DRAFTS 📂</button>
                    <button id="btn-builder-new" class="btn secondary" style="font-size:7px; padding:8px 10px;">Blank Map</button>
                    <button id="btn-builder-load-preset" class="btn secondary" style="font-size:7px; padding:8px 10px;">Preset Map</button>
                    <button id="btn-builder-test" class="btn" style="background:linear-gradient(135deg,#00aa55,#006633); font-size:7px; padding:8px 12px;">TEST MAP 🚗</button>
                    <button id="btn-builder-publish" class="btn" style="background:linear-gradient(135deg,#ffaa00,#cc7700); font-size:7px; padding:8px 12px;">PUBLISH 🌐</button>
                    <button id="btn-builder-close" class="btn secondary" style="font-size:7px; padding:8px 10px; background:#aa2222; border-color:#881111;">EXIT</button>
                </div>
            </div>

            <!-- Main Workspace Container -->
            <div style="display:flex; flex:1; overflow:hidden; position:relative;">
                <!-- Left Sidebar: Tools & Palette -->
                <div style="width:330px; background:#0f1522; border-right:2px solid #2a3b5c; display:flex; flex-direction:column; padding:12px; overflow-y:auto; flex-shrink:0;">
                    <!-- Tool Tabs -->
                    <div style="display:flex; gap:3px; margin-bottom:12px;">
                        <button class="btn tool-tab-btn active" data-tool="building" style="flex:1; font-size:6px; padding:8px 2px;">🏢 Buildings</button>
                        <button class="btn tool-tab-btn" data-tool="tile" style="flex:1; font-size:6px; padding:8px 2px;">🎨 Tiles</button>
                        <button class="btn tool-tab-btn" data-tool="trash_field" style="flex:1; font-size:6px; padding:8px 2px;">🗑️ Trash</button>
                        <button class="btn tool-tab-btn" data-tool="entity" style="flex:1; font-size:6px; padding:8px 2px;">📦 Objects</button>
                        <button class="btn tool-tab-btn" data-tool="gallery" style="flex:1; font-size:6px; padding:8px 2px;">🎞️ Look</button>
                    </div>

                    <!-- Panel: Building Plopper -->
                    <div id="panel-building" class="tool-panel">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="font-size:8px; color:#ffaa00;">BUILDINGS PLOPPER</span>
                        </div>

                        <!-- Mode toggle: Specialized vs Custom -->
                        <div style="display:flex; gap:4px; margin-bottom:10px;">
                            <button id="btn-bldg-mode-special" class="btn bldg-mode-btn active" style="flex:1; font-size:6.5px; padding:6px 2px; background:linear-gradient(135deg,#0088ff,#0044aa);">🌟 Specialized</button>
                            <button id="btn-bldg-mode-custom" class="btn bldg-mode-btn secondary" style="flex:1; font-size:6.5px; padding:6px 2px;">🧱 Custom / Res</button>
                        </div>

                        <!-- Specialized Buildings Subpanel -->
                        <div id="subpanel-bldg-special">
                            <div style="display:flex; gap:3px; margin-bottom:8px; overflow-x:auto; padding-bottom:4px;">
                                <button class="btn bldg-cat-filter active" data-cat="all" style="font-size:5.5px; padding:4px 6px;">All</button>
                                <button class="btn bldg-cat-filter" data-cat="restaurants" style="font-size:5.5px; padding:4px 6px;">🍔 Food</button>
                                <button class="btn bldg-cat-filter" data-cat="facilities" style="font-size:5.5px; padding:4px 6px;">🏥 Facilities</button>
                                <button class="btn bldg-cat-filter" data-cat="philly" style="font-size:5.5px; padding:4px 6px;">🔔 Philly</button>
                                <button class="btn bldg-cat-filter" data-cat="biomes" style="font-size:5.5px; padding:4px 6px;">🏜️ Biomes</button>
                            </div>

                            <div id="special-buildings-list" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; max-height:300px; overflow-y:auto; background:#162032; padding:8px; border-radius:8px; margin-bottom:10px;">
                                <!-- Populated dynamically -->
                            </div>
                        </div>

                        <!-- Custom Buildings Subpanel -->
                        <div id="subpanel-bldg-custom" style="display:none;">
                            <div style="font-size:7px; color:#aaa; margin-bottom:8px; line-height:1.4;">Custom sized building with custom exterior colors.</div>
                            
                            <div style="font-size:7.5px; color:#00ffcc; margin-bottom:6px;">Dimensions:</div>
                            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-bottom:12px;">
                                <button class="btn size-btn active" data-w="2" data-h="2">2x2</button>
                                <button class="btn size-btn" data-w="3" data-h="3">3x3</button>
                                <button class="btn size-btn" data-w="4" data-h="4">4x4</button>
                                <button class="btn size-btn" data-w="5" data-h="5">5x5</button>
                                <button class="btn size-btn" data-w="6" data-h="6">6x6</button>
                                <button class="btn size-btn" data-w="8" data-h="8">8x8</button>
                            </div>

                            <div style="font-size:7.5px; color:#00ffcc; margin-bottom:6px;">Colors:</div>
                            <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px; background:#162032; padding:8px; border-radius:8px;">
                                <label style="font-size:6.5px; display:flex; justify-content:space-between; align-items:center;">
                                    Base: <input type="color" id="bldg-color-base" value="#6b5b73" style="border:none; cursor:pointer; width:30px; height:18px; background:none;" />
                                </label>
                                <label style="font-size:6.5px; display:flex; justify-content:space-between; align-items:center;">
                                    Roof: <input type="color" id="bldg-color-roof" value="#7d6d85" style="border:none; cursor:pointer; width:30px; height:18px; background:none;" />
                                </label>
                                <label style="font-size:6.5px; display:flex; justify-content:space-between; align-items:center;">
                                    Shadow: <input type="color" id="bldg-color-dark" value="#5a4d62" style="border:none; cursor:pointer; width:30px; height:18px; background:none;" />
                                </label>
                            </div>

                            <div style="font-size:7.5px; color:#00ffcc; margin-bottom:6px;">Quick Palettes:</div>
                            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; margin-bottom:12px;">
                                <button class="btn palette-btn" data-base="#6b5b73" data-roof="#7d6d85" data-dark="#5a4d62" style="background:#6b5b73; height:20px; border:2px solid #7d6d85;"></button>
                                <button class="btn palette-btn" data-base="#5b6b73" data-roof="#6d7d85" data-dark="#4d5a62" style="background:#5b6b73; height:20px; border:2px solid #6d7d85;"></button>
                                <button class="btn palette-btn" data-base="#73655b" data-roof="#85776d" data-dark="#62574d" style="background:#73655b; height:20px; border:2px solid #85776d;"></button>
                                <button class="btn palette-btn" data-base="#5b7367" data-roof="#6d8579" data-dark="#4d6259" style="background:#5b7367; height:20px; border:2px solid #6d8579;"></button>
                                <button class="btn palette-btn" data-base="#735b5b" data-roof="#856d6d" data-dark="#624d4d" style="background:#735b5b; height:20px; border:2px solid #856d6d;"></button>
                                <button class="btn palette-btn" data-base="#5b5b73" data-roof="#6d6d85" data-dark="#4d4d62" style="background:#5b5b73; height:20px; border:2px solid #6d6d85;"></button>
                                <button class="btn palette-btn" data-base="#6b735b" data-roof="#7d856d" data-dark="#5a624d" style="background:#6b735b; height:20px; border:2px solid #7d856d;"></button>
                                <button class="btn palette-btn" data-base="#735b6b" data-roof="#856d7d" data-dark="#624d5a" style="background:#735b6b; height:20px; border:2px solid #856d7d;"></button>
                            </div>
                        </div>
                    </div>

                    <!-- Panel: Tile Painter -->
                    <div id="panel-tile" class="tool-panel" style="display:none;">
                        <div style="font-size:8px; color:#ffaa00; margin-bottom:8px;">TILE PAINTER</div>
                        <div style="font-size:7.5px; color:#00ffcc; margin-bottom:6px;">Select Surface:</div>
                        <div id="tile-options-container" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; margin-bottom:12px;">
                            <!-- Populated dynamically based on Pirate mode vs Non-Pirate mode -->
                        </div>

                        <div id="lake-tile-hint" style="font-size:6.5px; color:#38bdf8; background:#0c1a2e; border:1px solid #1e3a8a; border-radius:6px; padding:6px; margin-bottom:10px; line-height:1.4;">
                            🌊 <strong>Lake Tiles:</strong> Blue water obstacles that block normal walking & cars, but <strong>Ducky avatar can swim right across!</strong>
                        </div>

                        <div style="font-size:7.5px; color:#00ffcc; margin-bottom:6px;">Brush Size:</div>
                        <div style="display:flex; gap:6px; margin-bottom:12px;">
                            <button class="btn brush-btn active" data-size="1">1x1</button>
                            <button class="btn brush-btn" data-size="2">2x2</button>
                            <button class="btn brush-btn" data-size="3">3x3</button>
                            <button class="btn brush-btn" data-size="5">5x5</button>
                            <button class="btn brush-btn" data-size="fill">🪣 Fill</button>
                        </div>
                    </div>

                    <!-- Panel: Trash Field Generator -->
                    <div id="panel-trash-field" class="tool-panel" style="display:none;">
                        <div style="font-size:8px; color:#ffaa00; margin-bottom:8px;">🗑️ TRASH FIELD BRUSH</div>
                        <div style="font-size:6.8px; color:#aaa; margin-bottom:10px; line-height:1.4;">
                            Place randomized trash fields across the map. Trash is only placed on roads, sidewalks, grass, and water — <strong>never inside buildings!</strong>
                        </div>

                        <div style="font-size:7.5px; color:#00ffcc; margin-bottom:6px;">Field Radius:</div>
                        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-bottom:10px;">
                            <button class="btn trash-rad-btn" data-r="1">1 Tile</button>
                            <button class="btn trash-rad-btn" data-r="2">3x3 (R=2)</button>
                            <button class="btn trash-rad-btn active" data-r="3">5x5 (R=3)</button>
                            <button class="btn trash-rad-btn" data-r="5">9x9 (R=5)</button>
                            <button class="btn trash-rad-btn" data-r="8">15x15 (R=8)</button>
                            <button class="btn trash-rad-btn" data-r="12">23x23 (R=12)</button>
                        </div>

                        <div style="font-size:7.5px; color:#00ffcc; margin-bottom:6px;">Density:</div>
                        <div style="display:flex; gap:4px; margin-bottom:10px;">
                            <button class="btn trash-dens-btn" data-d="0.25" style="flex:1; font-size:6px; padding:6px 2px;">25% (Light)</button>
                            <button class="btn trash-dens-btn active" data-d="0.50" style="flex:1; font-size:6px; padding:6px 2px;">50% (Std)</button>
                            <button class="btn trash-dens-btn" data-d="0.75" style="flex:1; font-size:6px; padding:6px 2px;">75% (Dense)</button>
                            <button class="btn trash-dens-btn" data-d="1.00" style="flex:1; font-size:6px; padding:6px 2px;">100% (Solid)</button>
                        </div>

                        <div style="font-size:7.5px; color:#00ffcc; margin-bottom:6px;">Trash Variety:</div>
                        <select id="trash-field-type-select" style="width:100%; background:#101724; border:1px solid #3b4d70; color:#fff; font-family:inherit; font-size:7px; padding:6px 8px; border-radius:6px; margin-bottom:12px;">
                            <option value="random">🎲 Random Trash Mix</option>
                            <option value="0">🥫 Cans / Tins</option>
                            <option value="1">📄 Paper / Newsprint</option>
                            <option value="2">🥤 Plastic Bottles</option>
                            <option value="3">🍌 Banana Peels</option>
                            <option value="4">☣️ Radioactive Sludge</option>
                            <option value="5">🛞 Used Tires</option>
                            <option value="6">💰 Treasure & Gold</option>
                        </select>

                        <button id="btn-clear-all-trash" class="btn secondary" style="width:100%; font-size:7px; padding:6px 10px; background:#662222; border-color:#883333;">🗑️ Clear Placed Trash</button>
                    </div>

                    <!-- Panel: Entity & Object Plopper -->
                    <div id="panel-entity" class="tool-panel" style="display:none;">
                        <div style="font-size:8px; color:#ffaa00; margin-bottom:8px;">OBJECT & NPC PLOPPER</div>
                        <div style="display:flex; gap:3px; margin-bottom:10px;">
                            <button class="btn entity-cat-btn active" data-cat="objects" style="font-size:5.5px; flex:1; padding:6px 2px;">Items</button>
                            <button class="btn entity-cat-btn" data-cat="trees" style="font-size:5.5px; flex:1; padding:6px 2px;">Nature</button>
                            <button class="btn entity-cat-btn" data-cat="npcs" style="font-size:5.5px; flex:1; padding:6px 2px;">NPCs/Mobs</button>
                        </div>
                        <div id="entity-list-container" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; max-height:280px; overflow-y:auto; background:#162032; padding:8px; border-radius:8px;">
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
                            <button id="btn-builder-clear" class="btn secondary" style="flex:1; font-size:7px; background:#aa2222; border-color:#881111;">🗑️ Clear Grid</button>
                        </div>
                    </div>
                </div>

                <!-- Canvas Viewport -->
                <div id="builder-viewport" style="flex:1; background:#080b12; position:relative; overflow:hidden; cursor:crosshair;">
                    <canvas id="world-builder-canvas"></canvas>
                    
                    <!-- Save Draft Status Notification Badge -->
                    <div id="builder-save-badge" style="display:none; position:absolute; top:16px; left:16px; background:rgba(0,170,85,0.9); color:#fff; font-size:8px; padding:8px 14px; border-radius:6px; border:1px solid #00ffcc; box-shadow:0 4px 12px rgba(0,0,0,0.5); z-index:10;">
                        Draft Saved! 💾
                    </div>

                    <!-- Viewport HUD Overlay -->
                    <div style="position:absolute; bottom:16px; right:16px; background:rgba(10,16,26,0.85); padding:8px 14px; border-radius:8px; border:1px solid #2a3b5c; font-size:8px; color:#00ffcc; display:flex; gap:16px;">
                        <span id="builder-coords">Tile: (0, 0)</span>
                        <span id="builder-stats">Buildings: 0 | Entities: 0 | Trash: 0</span>
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

        this.initDraftsModal();
        this.renderSpecialBuildingsList();
        this.updateTileOptions();
        this.renderEntityList();
        this.bindEvents();
    }

    initDraftsModal() {
        const modal = document.createElement('div');
        modal.id = 'builder-drafts-modal';
        modal.className = 'custom-modal';
        modal.style.cssText = `
            display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(4, 6, 12, 0.95); backdrop-filter: blur(10px); z-index: 10005;
            color: #fff; font-family: 'Press Start 2P', monospace; justify-content: center; align-items: center;
        `;

        modal.innerHTML = `
            <div style="width: 540px; max-width: 90vw; background: #0f1522; border: 2px solid #2a3b5c; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); display:flex; flex-direction:column; gap:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #2a3b5c; padding-bottom:12px;">
                    <span style="color:#00ffcc; font-size:12px;">📂 MY SAVED MAP DRAFTS</span>
                    <button id="btn-drafts-modal-close" class="btn secondary" style="font-size:8px; padding:6px 10px;">✕ CLOSE</button>
                </div>

                <div id="drafts-list-container" style="display:flex; flex-direction:column; gap:10px; max-height:360px; overflow-y:auto; padding-right:4px;">
                </div>

                <div style="display:flex; justify-content:space-between; border-top:1px solid #2a3b5c; padding-top:12px;">
                    <button id="btn-drafts-create-new" class="btn" style="background:linear-gradient(135deg,#00aa55,#006633); font-size:8px; padding:8px 14px;">+ NEW BLANK DRAFT</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#btn-drafts-modal-close').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.querySelector('#btn-drafts-create-new').addEventListener('click', () => {
            modal.style.display = 'none';
            this.mapData = this.createBlankMapData('New Saved Draft');
            this.render();
            this.saveDraft(true);
        });
    }

    renderSpecialBuildingsList() {
        const container = this.container.querySelector('#special-buildings-list');
        if (!container) return;
        container.innerHTML = '';

        const filter = this.specialBldgCategoryFilter;
        const list = SPECIAL_BUILDINGS.filter(b => filter === 'all' || b.category === filter);

        list.forEach((bldg) => {
            const isSelected = this.selectedSpecialBuilding && this.selectedSpecialBuilding.type === bldg.type;
            const card = document.createElement('button');
            card.className = `btn special-bldg-card ${isSelected ? 'active' : ''}`;
            card.style.cssText = `
                display:flex; flex-direction:column; align-items:flex-start; justify-content:center;
                padding:8px 6px; font-size:6px; background:#1e2a3e; border:1px solid ${isSelected ? '#00ffcc' : '#3b4d70'};
                border-radius:6px; cursor:pointer; color:#fff; text-align:left; line-height:1.3;
            `;
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:4px; margin-bottom:3px;">
                    <span style="font-size:12px;">${bldg.icon}</span>
                    <strong style="color:${bldg.color}; font-size:6.5px;">${bldg.name}</strong>
                </div>
                <div style="font-size:5.5px; color:#88a0c0;">Size: ${bldg.w}x${bldg.h}</div>
            `;
            card.addEventListener('click', () => {
                container.querySelectorAll('.special-bldg-card').forEach(c => {
                    c.classList.remove('active');
                    c.style.borderColor = '#3b4d70';
                });
                card.classList.add('active');
                card.style.borderColor = '#00ffcc';
                this.selectedSpecialBuilding = bldg;
            });
            container.appendChild(card);
        });
    }

    updateTileOptions() {
        const container = this.container.querySelector('#tile-options-container');
        const hintEl = this.container.querySelector('#lake-tile-hint');
        if (!container) return;
        container.innerHTML = '';

        const mode = this.container.querySelector('#builder-restricted-mode').value;
        const isPirate = (mode === 'pirate');

        let tileOptions = [];
        if (isPirate) {
            tileOptions = [
                { tile: 2, name: '🌱 Grass', color: '#4a8c3f' },
                { tile: 0, name: '🌊 Water (Navigable)', color: '#0f4c81' },
                { tile: 1, name: '🏖️ Sand Shore', color: '#d4b36a', textColor: '#222' },
                { tile: 3, name: '🏢 Building', color: '#6b5b73' },
                { tile: 5, name: '🚸 Pier / Bridge', color: '#d4d4d4', textColor: '#222' },
                { tile: 6, name: '🌴 Jungle Path', color: '#c8b890', textColor: '#222' }
            ];
            if (hintEl) hintEl.style.display = 'none';
        } else {
            tileOptions = [
                { tile: 2, name: '🌱 Grass', color: '#4a8c3f' },
                { tile: 0, name: '🛣️ Road', color: '#4a4a4a' },
                { tile: 1, name: '🧱 Sidewalk', color: '#b0a89a', textColor: '#222' },
                { tile: 3, name: '🏢 Building', color: '#6b5b73' },
                { tile: 5, name: '🚸 Crosswalk', color: '#d4d4d4', textColor: '#222' },
                { tile: 6, name: '🌳 Park Path', color: '#c8b890', textColor: '#222' },
                { tile: 11, name: '🌊 Lake (Ducky Swims)', color: '#0f5a9e' }
            ];
            if (hintEl) hintEl.style.display = 'block';
        }

        tileOptions.forEach(opt => {
            const btn = document.createElement('button');
            const isActive = (this.selectedTileType === opt.tile);
            btn.className = `btn tile-select-btn ${isActive ? 'active' : ''}`;
            btn.dataset.tile = opt.tile;
            btn.style.cssText = `background:${opt.color}; ${opt.textColor ? 'color:'+opt.textColor+';' : ''} font-size:6.5px; padding:8px 4px;`;
            btn.innerText = opt.name;
            btn.addEventListener('click', () => {
                container.querySelectorAll('.tile-select-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedTileType = parseInt(opt.tile);
            });
            container.appendChild(btn);
        });
    }

    bindEvents() {
        const modal = this.container;

        modal.querySelector('#btn-builder-close').addEventListener('click', () => this.close());
        modal.querySelector('#btn-builder-save-draft').addEventListener('click', () => this.saveDraft(false));
        modal.querySelector('#btn-builder-my-drafts').addEventListener('click', () => this.showDraftsModal());

        modal.querySelector('#builder-restricted-mode').addEventListener('change', () => {
            this.updateTileOptions();
            this.saveDraft(true);
        });

        modal.querySelector('#btn-builder-new').addEventListener('click', () => {
            if (confirm('Create new blank 128x128 map? Any unsaved edits will be saved as draft.')) {
                this.saveDraft(true);
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
                this.saveDraft(true);
            }
        });

        modal.querySelector('#btn-builder-test').addEventListener('click', () => {
            this.saveDraft(true);
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
            this.saveDraft(true);

            try {
                const res = await window.publishMapData(title, desc, mode, this.mapData);
                alert(`🎉 Map Published Successfully!\nMap ID: ${res.map_id}\nUsers can now play your map in Community Maps!`);
            } catch (err) {
                alert('Saved map locally to your browser drafts!');
            }
        });

        // Tab Switching
        modal.querySelectorAll('.tool-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.tool-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;

                modal.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
                const targetPanel = modal.querySelector(`#panel-${this.currentTool}`);
                if (targetPanel) targetPanel.style.display = 'block';
            });
        });

        // Building Mode Toggle (Specialized vs Custom)
        modal.querySelector('#btn-bldg-mode-special').addEventListener('click', () => {
            modal.querySelector('#btn-bldg-mode-special').classList.add('active');
            modal.querySelector('#btn-bldg-mode-special').classList.remove('secondary');
            modal.querySelector('#btn-bldg-mode-custom').classList.remove('active');
            modal.querySelector('#btn-bldg-mode-custom').classList.add('secondary');
            modal.querySelector('#subpanel-bldg-special').style.display = 'block';
            modal.querySelector('#subpanel-bldg-custom').style.display = 'none';
            this.buildingPlopperMode = 'special';
        });

        modal.querySelector('#btn-bldg-mode-custom').addEventListener('click', () => {
            modal.querySelector('#btn-bldg-mode-custom').classList.add('active');
            modal.querySelector('#btn-bldg-mode-custom').classList.remove('secondary');
            modal.querySelector('#btn-bldg-mode-special').classList.remove('active');
            modal.querySelector('#btn-bldg-mode-special').classList.add('secondary');
            modal.querySelector('#subpanel-bldg-custom').style.display = 'block';
            modal.querySelector('#subpanel-bldg-special').style.display = 'none';
            this.buildingPlopperMode = 'custom';
        });

        // Specialized Buildings Category Filters
        modal.querySelectorAll('.bldg-cat-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.bldg-cat-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.specialBldgCategoryFilter = btn.dataset.cat;
                this.renderSpecialBuildingsList();
            });
        });

        // Trash Field Radius Buttons
        modal.querySelectorAll('.trash-rad-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.trash-rad-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.trashFieldRadius = parseInt(btn.dataset.r);
            });
        });

        // Trash Field Density Buttons
        modal.querySelectorAll('.trash-dens-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.trash-dens-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.trashFieldDensity = parseFloat(btn.dataset.d);
            });
        });

        // Trash Field Variety Select
        const trashTypeSelect = modal.querySelector('#trash-field-type-select');
        if (trashTypeSelect) {
            trashTypeSelect.addEventListener('change', (e) => {
                this.trashFieldType = e.target.value;
            });
        }

        // Clear All Trash
        modal.querySelector('#btn-clear-all-trash').addEventListener('click', () => {
            if (confirm('Clear all placed trash items from map?')) {
                this.saveUndoState();
                this.mapData.trash = [];
                this.render();
                this.saveDraft(true);
            }
        });

        // Custom Building Size Buttons
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
            if (e.button === 1) {
                this.isDragging = true;
                this.dragStart = { x: e.clientX - this.camera.x, y: e.clientY - this.camera.y };
            } else if (e.button === 0) {
                this.saveUndoState();
                this.isMouseDown = true;
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const tx = Math.floor((mouseX - this.camera.x) / (this.tileSize * this.camera.zoom));
                const ty = Math.floor((mouseY - this.camera.y) / (this.tileSize * this.camera.zoom));
                this.drawStartTile = { x: tx, y: ty };
                this.lastTile = { x: tx, y: ty };
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
            this.drawStartTile = null;
            this.lastTile = null;
        });

        window.addEventListener('keydown', (e) => {
            const overlay = document.getElementById('world-builder-overlay');
            if (overlay && overlay.style.display !== 'none' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                this.undo();
            }
        });

        modal.querySelector('#btn-builder-undo').addEventListener('click', () => this.undo());

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
                this.saveUndoState();
                this.mapData = this.createBlankMapData();
                this.render();
                this.saveDraft(true);
            }
        });
    }

    // ── Undo History Methods (Max 20 steps) ──

    saveUndoState() {
        if (!this.mapData) return;
        const snapshot = JSON.stringify(this.mapData);
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === snapshot) {
            return;
        }
        this.undoStack.push(snapshot);
        if (this.undoStack.length > 20) {
            this.undoStack.shift();
        }
        this.updateUndoButtonState();
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const snapshot = this.undoStack.pop();
        try {
            this.mapData = JSON.parse(snapshot);
        } catch (e) {
            console.error("Failed to restore undo state:", e);
        }
        this.updateUndoButtonState();
        this.render();
    }

    updateUndoButtonState() {
        const btn = this.container ? this.container.querySelector('#btn-builder-undo') : null;
        if (btn) {
            if (this.undoStack.length > 0) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.innerText = `UNDO (${this.undoStack.length}) ↩️`;
            } else {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.innerText = `UNDO ↩️`;
            }
        }
    }

    drawLine(x0, y0, x1, y1, callback) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;
        let currX = x0;
        let currY = y0;

        while (true) {
            if (currX >= 0 && currX < this.mapW && currY >= 0 && currY < this.mapH) {
                callback(currX, currY);
            }
            if (currX === x1 && currY === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                currX += sx;
            }
            if (e2 < dx) {
                err += dx;
                currY += sy;
            }
        }
    }

    // ── Save & Resume Draft Methods ──

    saveDraft(silent = false) {
        if (!this.mapData) return;

        const title = this.container.querySelector('#builder-map-title').value.trim() || 'Untitled Draft';
        const mode = this.container.querySelector('#builder-restricted-mode').value;

        this.mapData.title = title;
        this.mapData.restricted_mode = mode;
        this.mapData.updatedAt = new Date().toISOString();

        if (!this.currentDraftId) {
            this.currentDraftId = `draft_${Date.now()}`;
        }
        this.mapData.id = this.currentDraftId;

        let drafts = this.getDrafts();
        const existingIdx = drafts.findIndex(d => d.id === this.currentDraftId);

        const draftRecord = {
            id: this.currentDraftId,
            title,
            restricted_mode: mode,
            updatedAt: this.mapData.updatedAt,
            buildingCount: this.mapData.buildings ? this.mapData.buildings.length : 0,
            entityCount: (this.mapData.trees ? this.mapData.trees.length : 0) + (this.mapData.objects ? this.mapData.objects.length : 0) + (this.mapData.npcs ? this.mapData.npcs.length : 0),
            trashCount: this.mapData.trash ? this.mapData.trash.length : 0,
            mapData: this.mapData
        };

        if (existingIdx >= 0) {
            drafts[existingIdx] = draftRecord;
        } else {
            drafts.unshift(draftRecord);
        }

        try {
            localStorage.setItem('world_builder_drafts', JSON.stringify(drafts));
            localStorage.setItem('world_builder_active_draft_id', this.currentDraftId);

            if (!silent) {
                const badge = this.container.querySelector('#builder-save-badge');
                if (badge) {
                    badge.style.display = 'block';
                    setTimeout(() => badge.style.display = 'none', 1600);
                }
            }
        } catch (e) {
            console.warn('Failed to save draft to localStorage:', e);
        }
    }

    getDrafts() {
        try {
            return JSON.parse(localStorage.getItem('world_builder_drafts') || '[]');
        } catch (e) {
            return [];
        }
    }

    loadDraft(draftId) {
        const drafts = this.getDrafts();
        const draft = drafts.find(d => d.id === draftId);
        if (draft && draft.mapData) {
            this.currentDraftId = draft.id;
            this.mapData = draft.mapData;

            const titleInput = this.container.querySelector('#builder-map-title');
            if (titleInput) titleInput.value = draft.title || 'Untitled Map';

            const modeSelect = this.container.querySelector('#builder-restricted-mode');
            if (modeSelect) {
                modeSelect.value = draft.restricted_mode || 'all';
                this.updateTileOptions();
            }

            this.render();
            const badge = this.container.querySelector('#builder-save-badge');
            if (badge) {
                badge.innerText = 'Draft Loaded! 📂';
                badge.style.display = 'block';
                setTimeout(() => {
                    badge.innerText = 'Draft Saved! 💾';
                    badge.style.display = 'none';
                }, 1600);
            }
        }
    }

    deleteDraft(draftId) {
        let drafts = this.getDrafts();
        drafts = drafts.filter(d => d.id !== draftId);
        localStorage.setItem('world_builder_drafts', JSON.stringify(drafts));
        this.renderDraftsList();
    }

    showDraftsModal() {
        const modal = document.getElementById('builder-drafts-modal');
        if (!modal) return;
        this.renderDraftsList();
        modal.style.display = 'flex';
    }

    renderDraftsList() {
        const container = document.getElementById('drafts-list-container');
        if (!container) return;
        container.innerHTML = '';

        const drafts = this.getDrafts();
        if (drafts.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px; color:#aaa; font-size:8px;">
                    📁 No saved map drafts in progress.<br><br>Click "+ NEW BLANK DRAFT" to start building!
                </div>
            `;
            return;
        }

        drafts.forEach(d => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: #16243b; border: 1px solid #2a3b5c; border-radius: 8px; padding: 12px;
                display: flex; justify-content: space-between; align-items: center; gap: 12px;
            `;

            const dateStr = d.updatedAt ? new Date(d.updatedAt).toLocaleString() : 'Recently';

            card.innerHTML = `
                <div style="flex:1;">
                    <div style="font-size:9px; color:#00ffcc; margin-bottom:4px;">${d.title || 'Untitled Draft'}</div>
                    <div style="font-size:7px; color:#88a0c0;">Saved: ${dateStr} | Bldgs: ${d.buildingCount || 0} | Objects: ${d.entityCount || 0} | Trash: ${d.trashCount || 0}</div>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="btn resume-btn" style="font-size:7px; padding:6px 10px; background:linear-gradient(135deg,#0088ff,#0044aa);">Resume ✏️</button>
                    <button class="btn delete-btn secondary" style="font-size:7px; padding:6px 10px; background:#aa2222; border-color:#881111;">Delete 🗑️</button>
                </div>
            `;

            card.querySelector('.resume-btn').addEventListener('click', () => {
                document.getElementById('builder-drafts-modal').style.display = 'none';
                this.loadDraft(d.id);
            });

            card.querySelector('.delete-btn').addEventListener('click', () => {
                if (confirm(`Delete draft '${d.title}'?`)) {
                    this.deleteDraft(d.id);
                }
            });

            container.appendChild(card);
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
                { id: 'dumpster', name: 'Dumpster', icon: '🛢️', type: 'object', spriteId: 'dump' },
                { id: 'vending', name: 'Snacks Stand', icon: '🍿', type: 'object', spriteId: 'item_snacks' },
                { id: 'treasure', name: 'Treasure Chest', icon: '💰', type: 'object', spriteId: 'treasure' },
                { id: 'shroom', name: 'Mushroom', icon: '🍄', type: 'object', spriteId: 'shroom' },
                { id: 'flower', name: 'Flower', icon: '🌸', type: 'object', spriteId: 'flower' },
                { id: 'wings', name: 'Wings', icon: '🪽', type: 'object', spriteId: 'wings' },
                { id: 'paper', name: 'Paper', icon: '📄', type: 'object', spriteId: 'paper' },
                { id: 'cannonball', name: 'Cannonballs', icon: '💣', type: 'object', spriteId: 'cannonball' },
                { id: 'portal_gun', name: 'Portal Gun', icon: '🌀', type: 'object', spriteId: 'portal_gun' },
                { id: 'trash_bomb', name: 'Trash Bomb', icon: '💥', type: 'object', spriteId: 'trash_bomb' },
                { id: 'flashlight', name: 'Flashlight', icon: '🔦', type: 'object', spriteId: 'flashlight' },
                { id: 'borrowed_time', name: 'Borrowed Time', icon: '⏳', type: 'object', spriteId: 'borrowed_time' },
                { id: 'quinine', name: 'Quinine Pills', icon: '💊', type: 'object', spriteId: 'quinine' },
                { id: 'lid_tin', name: 'Tin Lid', icon: '🥫', type: 'object', spriteId: 'lid_tin' },
                { id: 'lid_gold', name: 'Golden Lid', icon: '👑', type: 'object', spriteId: 'lid_gold' }
            ];
        } else if (this.selectedEntityCategory === 'trees') {
            items = [
                { id: 'tree_park', name: 'Park Tree', icon: '🌳', type: 'tree', treeType: 'park' },
                { id: 'tree_burm', name: 'Burm Tree', icon: '🌲', type: 'tree', treeType: 'burm' },
                { id: 'tree_palm', name: 'Palm Tree', icon: '🌴', type: 'tree', treeType: 'palm' },
                { id: 'tree_stump', name: 'Tree Stump', icon: '🪵', type: 'tree', treeType: 'stump' }
            ];
        } else if (this.selectedEntityCategory === 'npcs') {
            items = [
                { id: 'npc_citizen', name: 'Citizen NPC', icon: '🚶', type: 'npc', role: 'citizen', spriteId: 'char_npc' },
                { id: 'npc_police', name: 'Police Officer', icon: '👮', type: 'npc', role: 'police', spriteId: 'char3' },
                { id: 'npc_mafia', name: 'Mafia Thug', icon: '🕶️', type: 'npc', role: 'mafia', spriteId: 'char4' },
                { id: 'npc_cult', name: 'Cultist', icon: '👁️', type: 'npc', role: 'cult', spriteId: 'cult_white_robe' },
                { id: 'npc_pirate', name: 'Pirate Captain', icon: '🏴‍☠️', type: 'npc', role: 'pirate', spriteId: 'char_pirate' },
                { id: 'npc_truck', name: 'Trash Truck', icon: '🚚', type: 'npc', role: 'truck', spriteId: 'char_truck' },
                { id: 'npc_boat', name: 'Boat NPC', icon: '⛵', type: 'npc', role: 'boat', spriteId: 'npc_boat' },
                { id: 'npc_dragon', name: 'Dragon Boss', icon: '🐉', type: 'npc', role: 'dragon', spriteId: 'char_dragon' },
                { id: 'npc_ducky', name: 'Ducky Posse', icon: '🦆', type: 'npc', role: 'ducky', spriteId: 'char_duck' },
                { id: 'npc_dog', name: 'Pet Dog', icon: '🐶', type: 'npc', role: 'dog', spriteId: 'char_dog' },
                { id: 'npc_car', name: 'Traffic Car', icon: '🏎️', type: 'npc', role: 'car', spriteId: 'car1' }
            ];
        }

        items.forEach((item, idx) => {
            const card = document.createElement('button');
            card.className = `btn entity-card ${idx === 0 ? 'active' : ''}`;
            card.style.cssText = `
                display:flex; flex-direction:column; align-items:center; justify-content:center;
                padding:8px; font-size:6px; background:#1e2a3e; border:1px solid #3b4d70; border-radius:6px; cursor:pointer; color:#fff;
            `;
            card.innerHTML = `<span style="font-size:14px; margin-bottom:4px;">${item.icon || '📦'}</span>${item.name}`;
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
        let tx = Math.floor((mouseX - this.camera.x) / (this.tileSize * this.camera.zoom));
        let ty = Math.floor((mouseY - this.camera.y) / (this.tileSize * this.camera.zoom));

        if (tx < 0 || tx >= this.mapW || ty < 0 || ty >= this.mapH) return;

        if (!this.drawStartTile) this.drawStartTile = { x: tx, y: ty };
        if (!this.lastTile) this.lastTile = { x: tx, y: ty };

        if (e.shiftKey && this.drawStartTile) {
            const dx = Math.abs(tx - this.drawStartTile.x);
            const dy = Math.abs(ty - this.drawStartTile.y);
            if (dx >= dy) {
                ty = this.drawStartTile.y;
            } else {
                tx = this.drawStartTile.x;
            }
        }

        if (this.currentTool === 'tile') {
            if (this.brushSize === 'fill') {
                this.floodFillTile(tx, ty, this.selectedTileType);
            } else {
                const applyAt = (targetX, targetY) => {
                    for (let dy = 0; dy < this.brushSize; dy++) {
                        for (let dx = 0; dx < this.brushSize; dx++) {
                            const wx = targetX + dx;
                            const wy = targetY + dy;
                            if (wx >= 0 && wx < this.mapW && wy >= 0 && wy < this.mapH) {
                                this.mapData.tiles[wy][wx] = this.selectedTileType;
                            }
                        }
                    }
                };
                if (e.shiftKey && this.drawStartTile) {
                    this.drawLine(this.drawStartTile.x, this.drawStartTile.y, tx, ty, (lx, ly) => applyAt(lx, ly));
                } else {
                    this.drawLine(this.lastTile.x, this.lastTile.y, tx, ty, (lx, ly) => applyAt(lx, ly));
                }
            }
        } else if (this.currentTool === 'trash_field') {
            this.applyTrashFieldAt(tx, ty);
        } else if (this.currentTool === 'building') {
            const isSpecial = (this.buildingPlopperMode === 'special' && this.selectedSpecialBuilding);
            const bw = isSpecial ? this.selectedSpecialBuilding.w : this.buildingSize.w;
            const bh = isSpecial ? this.selectedSpecialBuilding.h : this.buildingSize.h;
            const bldgType = isSpecial ? this.selectedSpecialBuilding.type : 'custom';
            const bldgLabel = isSpecial ? this.selectedSpecialBuilding.name : `BLDG-${this.mapData.buildings.length + 1}`;
            const bldgId = this.mapData.buildings.length;
            const bldgTiles = [];

            const bldgColors = isSpecial ? {
                base: this.selectedSpecialBuilding.color || '#6b5b73',
                roof: this.selectedSpecialBuilding.borderColor || '#7d6d85',
                dark: '#2a1a3a'
            } : { ...this.buildingColor };

            for (let dy = 0; dy < bh; dy++) {
                for (let dx = 0; dx < bw; dx++) {
                    const wx = tx + dx;
                    const wy = ty + dy;
                    if (wx < this.mapW && wy < this.mapH) {
                        this.mapData.tiles[wy][wx] = 3;
                        this.mapData.buildingMeta[wy][wx] = bldgId;
                        bldgTiles.push({ x: wx, y: wy });
                    }
                }
            }

            const doorTile = { x: tx + Math.floor(bw / 2), y: ty + bh - 1 };
            this.mapData.tiles[doorTile.y][doorTile.x] = 4;

            this.mapData.buildings.push({
                id: bldgId,
                address: bldgLabel,
                tiles: bldgTiles,
                doorTiles: [doorTile],
                customColors: bldgColors,
                type: bldgType,
                x: tx * 64,
                y: ty * 64,
                width: bw * 64,
                height: bh * 64
            });
        } else if (this.currentTool === 'entity') {
            if (this.selectedEntity.type === 'tree') {
                this.mapData.trees.push({
                    id: Date.now() + Math.random(),
                    tileX: tx,
                    tileY: ty,
                    x: tx * 64 + 32,
                    y: ty * 64 + 32,
                    type: this.selectedEntity.treeType || 'park'
                });
            } else if (this.selectedEntity.type === 'object') {
                this.mapData.objects.push({
                    id: Date.now() + Math.random(),
                    tileX: tx,
                    tileY: ty,
                    x: tx * 64 + 32,
                    y: ty * 64 + 32,
                    spriteId: this.selectedEntity.spriteId,
                    name: this.selectedEntity.name
                });
            } else if (this.selectedEntity.type === 'npc') {
                this.mapData.npcs.push({
                    id: Date.now() + Math.random(),
                    tileX: tx,
                    tileY: ty,
                    x: tx * 64 + 32,
                    y: ty * 64 + 32,
                    role: this.selectedEntity.role,
                    spriteId: this.selectedEntity.spriteId || 'char_npc',
                    type: this.selectedEntity.id || 'npc_citizen'
                });
            }
        }

        this.render();
        this.saveDraft(true);
    }

    applyTrashFieldAt(centerTX, centerTY) {
        if (!this.mapData.trash) this.mapData.trash = [];
        const R = this.trashFieldRadius || 3;
        const density = this.trashFieldDensity !== undefined ? this.trashFieldDensity : 0.5;

        for (let dy = -R; dy <= R; dy++) {
            for (let dx = -R; dx <= R; dx++) {
                if (dx * dx + dy * dy > R * R) continue;
                const wx = centerTX + dx;
                const wy = centerTY + dy;

                if (wx < 0 || wx >= this.mapW || wy < 0 || wy >= this.mapH) continue;

                const tile = this.mapData.tiles[wy][wx];
                const bldgIdx = this.mapData.buildingMeta[wy][wx];

                // CRITICAL RULE: Trash CANNOT be placed inside buildings (tile 3, door 4, or buildingMeta >= 0)!
                if (tile === 3 || tile === 4 || bldgIdx >= 0) {
                    continue;
                }

                if (Math.random() > density) continue;

                if (this.mapData.trash.some(t => t.tileX === wx && t.tileY === wy)) continue;

                let type;
                if (this.trashFieldType === 'random' || this.trashFieldType === undefined) {
                    type = Math.floor(Math.random() * 7);
                } else {
                    type = parseInt(this.trashFieldType);
                }

                this.mapData.trash.push({
                    id: Date.now() + Math.random(),
                    tileX: wx,
                    tileY: wy,
                    x: wx * 64 + 32,
                    y: wy * 64 + 32,
                    type: type
                });
            }
        }
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

        ctx.save();
        if (this.activeFilter === 'vintage') ctx.filter = 'sepia(0.6) contrast(1.2)';
        else if (this.activeFilter === 'neon') ctx.filter = 'hue-rotate(180deg) saturate(2)';
        else if (this.activeFilter === 'sepia') ctx.filter = 'sepia(1)';
        else if (this.activeFilter === 'bw') ctx.filter = 'grayscale(1)';
        else if (this.activeFilter === 'vivid') ctx.filter = 'saturate(2.5)';

        const colors = {
            0: (this.mapData.restricted_mode === 'pirate' ? '#0f4c81' : '#4a4a4a'),
            1: (this.mapData.restricted_mode === 'pirate' ? '#d4b36a' : '#b0a89a'),
            2: '#4a8c3f',
            3: '#6b5b73',
            4: '#8b7355',
            5: '#d4d4d4',
            6: '#c8b890',
            11: '#0f5a9e'
        };

        for (let y = 0; y < this.mapH; y++) {
            for (let x = 0; x < this.mapW; x++) {
                const sx = this.camera.x + x * ts;
                const sy = this.camera.y + y * ts;

                if (sx + ts < 0 || sx > this.canvas.width || sy + ts < 0 || sy > this.canvas.height) continue;

                const tile = this.mapData.tiles[y][x];
                let color = colors[tile] || '#4a8c3f';

                const bldgIdx = this.mapData.buildingMeta[y][x];
                if (tile === 3 && bldgIdx >= 0 && this.mapData.buildings[bldgIdx] && this.mapData.buildings[bldgIdx].customColors) {
                    color = this.mapData.buildings[bldgIdx].customColors.base;
                }

                ctx.fillStyle = color;
                ctx.fillRect(sx, sy, ts, ts);

                if (tile === 11 || (tile === 0 && this.mapData.restricted_mode === 'pirate')) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
                    ctx.fillRect(sx + 2, sy + 6, ts - 4, 1.5);
                }

                if (z >= 0.7) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(sx, sy, ts, ts);
                }
            }
        }

        // Draw Specialized Buildings Overlays
        if (this.mapData.buildings) {
            for (const bldg of this.mapData.buildings) {
                if (!bldg || !bldg.tiles || bldg.tiles.length === 0) continue;
                const info = window.getBuildingVisualInfo ? window.getBuildingVisualInfo(bldg.type) : null;
                if (!info && bldg.type === 'custom') continue;

                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const t of bldg.tiles) {
                    if (t.x < minX) minX = t.x;
                    if (t.y < minY) minY = t.y;
                    if (t.x > maxX) maxX = t.x;
                    if (t.y > maxY) maxY = t.y;
                }

                const bsx = this.camera.x + minX * ts;
                const bsy = this.camera.y + minY * ts;
                const bw = (maxX - minX + 1) * ts;
                const bh = (maxY - minY + 1) * ts;

                if (bsx + bw < 0 || bsx > this.canvas.width || bsy + bh < 0 || bsy > this.canvas.height) continue;

                ctx.strokeStyle = (info ? info.borderColor : '#00ffcc');
                ctx.lineWidth = Math.max(1.5, 2 * z);
                ctx.strokeRect(bsx + 2, bsy + 2, bw - 4, bh - 4);

                const themeIcon = info ? info.icon : '🏢';
                const themeLabel = info ? info.label : bldg.address;

                ctx.fillStyle = 'rgba(8, 12, 24, 0.85)';
                const badgeH = Math.max(16, 20 * z);
                ctx.fillRect(bsx + 4, bsy + bh / 2 - badgeH / 2, bw - 8, badgeH);
                ctx.strokeStyle = (info ? info.color : '#00ffcc');
                ctx.lineWidth = 1;
                ctx.strokeRect(bsx + 4, bsy + bh / 2 - badgeH / 2, bw - 8, badgeH);

                ctx.fillStyle = info ? info.color : '#00ffcc';
                ctx.font = `bold ${Math.max(6, Math.min(10, 8 * z))}px "Press Start 2P", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${themeIcon} ${themeLabel}`, bsx + bw / 2, bsy + bh / 2);
            }
        }

        // Draw Placed Trash Items
        if (this.mapData.trash && this.mapData.trash.length > 0) {
            const trashIcons = ['🥫', '📄', '🥤', '🍌', '☣️', '🛞', '💰'];
            for (const t of this.mapData.trash) {
                const sx = this.camera.x + t.tileX * ts;
                const sy = this.camera.y + t.tileY * ts;
                if (sx + ts >= 0 && sx <= this.canvas.width && sy + ts >= 0 && sy <= this.canvas.height) {
                    const icon = trashIcons[t.type] || '🥫';
                    ctx.font = `${Math.max(8, 12 * z)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(icon, sx + ts / 2, sy + ts / 2);
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
            for (const npc of this.mapData.npcs) {
                const spriteKey = npc.spriteId || (npc.type && npc.type.startsWith('char') ? npc.type : 'char_npc');
                let img = (window.game && window.game.spriteManager) ? window.game.spriteManager.getImage(spriteKey) : null;
                if (!img) img = (window.game && window.game.spriteManager) ? window.game.spriteManager.getImage('char_npc') : null;

                const sx = this.camera.x + npc.tileX * ts;
                const sy = this.camera.y + npc.tileY * ts;
                if (sx + ts >= 0 && sx <= this.canvas.width && sy + ts >= 0 && sy <= this.canvas.height) {
                    if (img && (img.complete || img instanceof HTMLCanvasElement)) {
                        ctx.drawImage(img, sx, sy, ts, ts);
                    } else {
                        ctx.fillStyle = '#00ffff';
                        ctx.beginPath();
                        ctx.arc(sx + ts / 2, sy + ts / 2, ts * 0.35, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        ctx.restore();

        // Update Stats Display
        const statsEl = this.container.querySelector('#builder-stats');
        if (statsEl) {
            const bCount = this.mapData.buildings.length;
            const eCount = (this.mapData.trees ? this.mapData.trees.length : 0) + (this.mapData.objects ? this.mapData.objects.length : 0) + (this.mapData.npcs ? this.mapData.npcs.length : 0);
            const tCount = this.mapData.trash ? this.mapData.trash.length : 0;
            statsEl.innerText = `Buildings: ${bCount} | Objects/NPCs: ${eCount} | Trash: ${tCount}`;
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
            const isSpecial = (this.buildingPlopperMode === 'special' && this.selectedSpecialBuilding);
            const bw = (isSpecial ? this.selectedSpecialBuilding.w : this.buildingSize.w) * ts;
            const bh = (isSpecial ? this.selectedSpecialBuilding.h : this.buildingSize.h) * ts;

            ctx.fillStyle = isSpecial ? 'rgba(255, 170, 0, 0.35)' : 'rgba(0, 255, 204, 0.3)';
            ctx.strokeStyle = isSpecial ? '#ffaa00' : '#00ffcc';
            ctx.lineWidth = 2;
            ctx.fillRect(sx, sy, bw, bh);
            ctx.strokeRect(sx, sy, bw, bh);

            const doorW = ts;
            const doorH = Math.max(4, 6 * z);
            const doorX = sx + bw / 2 - doorW / 2;
            const doorY = sy + bh - doorH;
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(doorX, doorY, doorW, doorH);
        } else if (this.currentTool === 'trash_field') {
            const R = this.trashFieldRadius || 3;
            const centerPX = sx + ts / 2;
            const centerPY = sy + ts / 2;
            const radiusPX = R * ts;

            ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerPX, centerPY, radiusPX, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
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

        if (window.game) {
            window.game.initCustomMap(this.mapData);
        } else {
            const playBtn = document.getElementById('btn-start-game');
            if (playBtn) playBtn.click();
        }
    }

    open(existingData = null) {
        this.container.style.display = 'flex';
        this.camera = { x: 50, y: 50, zoom: 0.8 };

        if (existingData) {
            this.mapData = existingData;
            this.currentDraftId = existingData.id || `draft_${Date.now()}`;
        } else {
            const drafts = this.getDrafts();
            if (drafts.length > 0 && !this.mapData.buildings.length) {
                this.showDraftsModal();
            }
        }

        const titleInput = this.container.querySelector('#builder-map-title');
        if (titleInput && this.mapData) titleInput.value = this.mapData.title || 'My Custom 128x128 Map';

        const modeSelect = this.container.querySelector('#builder-restricted-mode');
        if (modeSelect && this.mapData) {
            modeSelect.value = this.mapData.restricted_mode || 'all';
            this.updateTileOptions();
        }

        this.render();

        if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = setInterval(() => this.saveDraft(true), 20000);
    }

    close() {
        this.saveDraft(true);
        if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
        this.container.style.display = 'none';
    }
}

// Global Singleton Instance
window.worldBuilder = new WorldBuilder();
