// ============================================================
// map_browser.js — Community Map Sharing & Browser Screen
// ============================================================

class MapBrowser {
    constructor() {
        this.container = null;
        this.maps = [];
        this.activeFilter = 'all';
        this.initDOM();
    }

    initDOM() {
        const modal = document.createElement('div');
        modal.id = 'map-browser-overlay';
        modal.className = 'custom-modal';
        modal.style.cssText = `
            display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(8, 12, 20, 0.96); backdrop-filter: blur(10px); z-index: 10000;
            color: #fff; font-family: 'Press Start 2P', monospace; flex-direction: column;
        `;

        modal.innerHTML = `
            <!-- Top Header Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 24px; background:linear-gradient(180deg,#151c28,#0c1018); border-bottom:2px solid #2a3b5c; flex-shrink:0;">
                <div style="display:flex; align-items:center; gap:16px;">
                    <span style="color:#00ffcc; font-size:14px; text-shadow:0 0 10px rgba(0,255,204,0.5);">🌐 COMMUNITY MAP SHARING</span>
                    <span style="color:#aaa; font-size:8px;">Play & edit community maps from builders worldwide!</span>
                </div>
                <button id="btn-browser-close" class="btn secondary" style="font-size:9px; padding:10px 16px; background:#aa2222; border-color:#881111;">CLOSE</button>
            </div>

            <!-- Filter Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 24px; background:#0f1522; border-bottom:1px solid #2a3b5c; flex-shrink:0;">
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn filter-mode-btn active" data-mode="all" style="font-size:7px; padding:8px 12px;">🌐 All Modes</button>
                    <button class="btn filter-mode-btn" data-mode="standard" style="font-size:7px; padding:8px 12px;">🏙️ Standard</button>
                    <button class="btn filter-mode-btn" data-mode="pirate" style="font-size:7px; padding:8px 12px;">🏴‍☠️ Pirate</button>
                    <button class="btn filter-mode-btn" data-mode="car" style="font-size:7px; padding:8px 12px;">🏎️ Car</button>
                    <button class="btn filter-mode-btn" data-mode="crime" style="font-size:7px; padding:8px 12px;">💰 Crime</button>
                    <button class="btn filter-mode-btn" data-mode="cult" style="font-size:7px; padding:8px 12px;">👁️ Cult</button>
                    <button class="btn filter-mode-btn" data-mode="flowers" style="font-size:7px; padding:8px 12px;">🌸 Flowers</button>
                </div>
                <button id="btn-browser-open-builder" class="btn" style="background:linear-gradient(135deg,#00aa55,#006633); font-size:8px; padding:8px 14px;">+ CREATE MAP</button>
            </div>

            <!-- Maps Grid Container -->
            <div id="browser-maps-grid" style="flex:1; overflow-y:auto; padding:24px; display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:20px; align-content:start;">
                <!-- Map Cards populated dynamically -->
            </div>
        `;

        document.body.appendChild(modal);
        this.container = modal;

        this.bindEvents();
    }

    bindEvents() {
        const modal = this.container;

        modal.querySelector('#btn-browser-close').addEventListener('click', () => this.close());
        modal.querySelector('#btn-browser-open-builder').addEventListener('click', () => {
            this.close();
            if (window.worldBuilder) window.worldBuilder.open();
        });

        modal.querySelectorAll('.filter-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.filter-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeFilter = btn.dataset.mode;
                this.renderGrid();
            });
        });
    }

    async loadMaps() {
        try {
            let serverMaps = await window.fetchPublishedMaps();
            let localMaps = JSON.parse(localStorage.getItem('published_custom_maps') || '[]');

            // Merge local and server maps
            const merged = [...localMaps, ...serverMaps];
            const uniqueMap = new Map();
            merged.forEach(m => uniqueMap.set(m.id, m));

            this.maps = Array.from(uniqueMap.values());
        } catch (err) {
            this.maps = JSON.parse(localStorage.getItem('published_custom_maps') || '[]');
        }

        this.renderGrid();
    }

    renderGrid() {
        const grid = this.container.querySelector('#browser-maps-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const filtered = this.maps.filter(m => {
            if (this.activeFilter === 'all') return true;
            return m.restricted_mode === this.activeFilter;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px; color:#aaa;">
                    <div style="font-size:32px; margin-bottom:12px;">🗺️</div>
                    <div style="font-size:12px; color:#ffaa00; margin-bottom:8px;">No Custom Maps Found</div>
                    <div style="font-size:8px;">Be the first builder to create and publish a map for this mode!</div>
                </div>
            `;
            return;
        }

        filtered.forEach(mapObj => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: linear-gradient(135deg, rgba(20,30,50,0.9), rgba(10,18,32,0.9));
                border: 2px solid #2a3b5c; border-radius: 12px; padding: 18px;
                display: flex; flex-direction: column; gap: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                transition: transform 0.2s, border-color 0.2s;
            `;

            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px)';
                card.style.borderColor = '#00ffcc';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'none';
                card.style.borderColor = '#2a3b5c';
            });

            const modeLabels = {
                all: '🌐 ALL MODES',
                standard: '🏙️ STANDARD',
                pirate: '🏴‍☠️ PIRATE MODE',
                car: '🏎️ CAR MODE',
                crime: '💰 CRIME MODE',
                cult: '👁️ CULT MODE',
                flowers: '🌸 FLOWERS MODE'
            };

            const modeBadge = modeLabels[mapObj.restricted_mode] || '🌐 CUSTOM';

            const authorAvatar = mapObj.author_avatar_path || (mapObj.author_avatar ? `assets/stickers/${mapObj.author_avatar}` : 'assets/stickers/ducky_sticker.png');

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="font-size:11px; color:#00ffcc; line-height:1.3;">${mapObj.title || 'Untitled Map'}</div>
                    <span style="font-size:6px; background:#16243b; color:#ffaa00; padding:4px 8px; border-radius:4px; border:1px solid #3b4d70;">
                        ${modeBadge}
                    </span>
                </div>
                
                <div style="font-size:7px; color:#aaa; line-height:1.4; flex:1;">
                    ${mapObj.description || 'No description provided.'}
                </div>

                <div style="font-size:7px; color:#667a9a; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #1a283e; padding-top:8px;">
                    <div class="map-author-badge" style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:2px 4px; border-radius:4px; transition:background 0.15s;" title="View ${mapObj.author_username || 'Author'}'s Profile">
                        <img src="${authorAvatar}" style="width:20px; height:20px; object-fit:contain; image-rendering:pixelated; border-radius:3px; border:1px solid #00ffcc; background:#050a12;" />
                        <span style="color:#38bdf8; text-decoration:underline;">${mapObj.author_username || 'Anonymous'}</span>
                    </div>
                    <span>▶️ ${mapObj.play_count || 0} Plays</span>
                </div>

                <div style="display:flex; gap:8px; margin-top:4px;">
                    <button class="btn play-map-btn" style="flex:1; font-size:7px; padding:8px 0; background:linear-gradient(135deg,#00aa55,#006633);">PLAY MAP 🎮</button>
                    <button class="btn edit-map-btn secondary" style="flex:1; font-size:7px; padding:8px 0;">EDIT COPY ✏️</button>
                </div>
            `;

            const authorEl = card.querySelector('.map-author-badge');
            if (authorEl && mapObj.author_username) {
                authorEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.profileManager) {
                        window.profileManager.openProfile(mapObj.author_username);
                    }
                });
            }

            card.querySelector('.play-map-btn').addEventListener('click', async () => {
                let fullData = mapObj.map_data;
                if (!fullData && mapObj.id) {
                    const fetched = await window.fetchMapById(mapObj.id);
                    if (fetched) fullData = fetched.map_data;
                }
                if (mapObj.id) {
                    window.recordMapPlay(mapObj.id);
                }
                this.close();

                // Apply mode restrictions if specified
                if (mapObj.restricted_mode === 'pirate') window.pirateMode = true;
                else if (mapObj.restricted_mode === 'crime') window.crimeMode = true;
                else if (mapObj.restricted_mode === 'cult') window.cultMode = true;
                else if (mapObj.restricted_mode === 'flowers') window.flowersMode = true;

                window.customMapData = fullData;
                if (window.game) {
                    window.game.initCustomMap(fullData);
                } else {
                    const playBtn = document.getElementById('btn-start-game');
                    if (playBtn) playBtn.click();
                }
            });

            card.querySelector('.edit-map-btn').addEventListener('click', async () => {
                let fullData = mapObj.map_data;
                if (!fullData && mapObj.id) {
                    const fetched = await window.fetchMapById(mapObj.id);
                    if (fetched) fullData = fetched.map_data;
                }
                this.close();
                if (window.worldBuilder) {
                    window.worldBuilder.open(fullData);
                }
            });

            grid.appendChild(card);
        });
    }

    open() {
        this.container.style.display = 'flex';
        this.loadMaps();
    }

    close() {
        this.container.style.display = 'none';
    }
}

// Global Singleton Instance
window.mapBrowser = new MapBrowser();
