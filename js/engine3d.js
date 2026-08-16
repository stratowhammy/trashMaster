// ============================================================
// engine3d.js — 3D WebGL FPS Engine & Camera Controller
// Powers Retro Wolfenstein / Doom First-Person Mode for Trashmaster
// with Continuous Infinite Toroidal World Navigation
// ============================================================

class Engine3D {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.enabled = false; // 2D Retro Mode enabled by default on start

        // 3D Three.js core
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1e3a8a);
        this.scene.fog = new THREE.Fog(0x1e3a8a, 120, 420); // Crisp 16-bit retro atmospheric horizon

        const aspect = (canvas && canvas.height > 0) ? (canvas.width / canvas.height) : (window.innerWidth / window.innerHeight);
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 600);
        this.camera.position.set(0, 2.0, 0); // Eye height

        // Hardware-accelerated WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false, // Crisp retro pixels
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(canvas ? canvas.width : window.innerWidth, canvas ? canvas.height : window.innerHeight, false);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x1e3a8a, 1);

        // Atmospheric lighting for rich 16-bit materials
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xfffbeb, 0.9);
        this.sunLight.position.set(60, 120, 40);
        this.scene.add(this.sunLight);

        this.playerLight = new THREE.PointLight(0xfffbeb, 1.0, 40);
        this.playerLight.position.set(0, 2.0, 0);
        this.scene.add(this.playerLight);

        // Subsystems
        this.mapBuilder = new MapBuilder3D(this.scene);
        this.billboardManager = new BillboardManager3D(this.scene, game.spriteManager);
        this.viewmodel = new FPSViewmodel();

        // 2D Canvas Overlay for Doom HUD & Viewmodel
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.width = canvas ? canvas.width : window.innerWidth;
        this.overlayCanvas.height = canvas ? canvas.height : window.innerHeight;
        this.overlayCtx = this.overlayCanvas.getContext('2d');

        // Camera Orientation
        this.yaw = 0; // Horizontal rotation (radians)
        this.pitch = 0; // Vertical rotation (radians)
        this.pointerLocked = false;
        this.currentCrosshairTarget = null;

        this.TILE_SIZE_3D = 4;

        this._setupPointerLock();
        this._setupResizeHandler();
    }

    _setupPointerLock() {
        const canvas3d = document.getElementById('gameCanvas3d') || this.canvas;
        const mainCanvas = (this.game && this.game.canvas) ? this.game.canvas : null;

        const handleCanvasClick = (e, targetElem) => {
            // Pointer lock only applies when 3D FPS mode is actively enabled!
            if (!this.enabled) return;
            if (!this.game || this.game.state !== GameState.PLAYING || this.game.isPaused) return;
            if (!targetElem || !targetElem.isConnected || targetElem.style.display === 'none') return;

            if (!this.pointerLocked) {
                const rect = targetElem.getBoundingClientRect();
                const clickX = (e.clientX - rect.left) * (targetElem.width / (rect.width || 1));
                const clickY = (e.clientY - rect.top) * (targetElem.height / (rect.height || 1));
                
                // Check 3D Messages Button click
                if (this.game.hud && this.game.hud.messagesBtnBounds) {
                    const b = this.game.hud.messagesBtnBounds;
                    if (clickX >= b.x && clickX <= b.x + b.width && clickY >= b.y && clickY <= b.y + b.height) {
                        this.game.openMessagesLogDialog();
                        return;
                    }
                }
                // Check 3D Avatar Portrait click
                if (this.game.hud && this.game.hud.avatarPortraitBounds3D) {
                    const ab = this.game.hud.avatarPortraitBounds3D;
                    if (clickX >= ab.x && clickX <= ab.x + ab.width && clickY >= ab.y && clickY <= ab.y + ab.height) {
                        if (window.profileManager) window.profileManager.toggleMultiplayerScoreboard();
                        return;
                    }
                }

                // Check Medication Alert click
                if (this.game.medicationAlertActive && this.game.hud && this.game.hud.medicationBtnBounds) {
                    const mb = this.game.hud.medicationBtnBounds;
                    if (clickX >= mb.x && clickX <= mb.x + mb.width && clickY >= mb.y && clickY <= mb.y + mb.height) {
                        this.game.takeMedication();
                        return;
                    }
                }
                
                if (!document.pointerLockElement && typeof targetElem.requestPointerLock === 'function') {
                    try {
                        const lockPromise = targetElem.requestPointerLock();
                        if (lockPromise && typeof lockPromise.catch === 'function') {
                            lockPromise.catch(() => {});
                        }
                    } catch (err) {
                        // Suppress pointer lock errors gracefully
                    }
                }
            }
        };

        if (canvas3d) {
            canvas3d.addEventListener('click', (e) => handleCanvasClick(e, canvas3d));
        }
        if (mainCanvas && mainCanvas !== canvas3d) {
            mainCanvas.addEventListener('click', (e) => handleCanvasClick(e, mainCanvas));
        }

        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = !!(document.pointerLockElement && (document.pointerLockElement === canvas3d || document.pointerLockElement === mainCanvas || document.pointerLockElement === this.canvas));
        });

        // Mouse movement for mouselook
        document.addEventListener('mousemove', (e) => {
            if (this.pointerLocked && this.game && this.game.state === GameState.PLAYING && !this.game.isPaused) {
                const sensitivity = 0.0028;
                this.yaw -= e.movementX * sensitivity;
                this.pitch -= e.movementY * sensitivity;

                // Clamp pitch (-85 deg to +85 deg)
                const maxPitch = (85 * Math.PI) / 180;
                this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
            }
        });
    }

    _setupResizeHandler() {
        window.addEventListener('resize', () => {
            if (this.canvas && this.renderer) {
                const w = this.canvas.width;
                const h = this.canvas.height;
                if (h > 0) {
                    this.camera.aspect = w / h;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(w, h, false);
                    this.overlayCanvas.width = w;
                    this.overlayCanvas.height = h;
                }
            }
        });
    }

    buildMapForGame(gameMap, theme) {
        if (this.mapBuilder) {
            this.mapBuilder.buildMap(gameMap, theme);
        }
    }

    update(dt) {
        if (!this.game || !this.game.player) return;
        const player = this.game.player;
        const mapW = (this.game.gameMap && this.game.gameMap.width) ? this.game.gameMap.width : (typeof MAP_WIDTH !== 'undefined' ? MAP_WIDTH : 128);
        const mapH = (this.game.gameMap && this.game.gameMap.height) ? this.game.gameMap.height : (typeof MAP_HEIGHT !== 'undefined' ? MAP_HEIGHT : 128);
        const S = this.TILE_SIZE_3D;

        // Synchronize 3D player position with continuous toroidal wrapping
        const normX = wrapWorldX(player.x);
        const normY = wrapWorldY(player.y);
        const player3dX = (normX / TILE_SIZE - mapW / 2) * S;
        const player3dZ = (normY / TILE_SIZE - mapH / 2) * S;

        // Head bobbing when walking & Jump elevation
        const isMoving = player.moving || (player.keys && (player.keys.up || player.keys.down || player.keys.left || player.keys.right));
        const headBob = isMoving ? Math.sin(performance.now() / 100) * 0.08 : 0;
        const jumpElev = (player.jumpHeight || 0) * 0.05;

        this.camera.position.set(player3dX, 1.8 + headBob + jumpElev, player3dZ);
        this.playerLight.position.set(player3dX, 1.8 + jumpElev, player3dZ);

        // Keep sky dome and sun light centered around player
        if (this.mapBuilder && this.mapBuilder.skyMesh) {
            this.mapBuilder.skyMesh.position.set(player3dX, 0, player3dZ);
        }
        if (this.sunLight) {
            this.sunLight.position.set(player3dX + 60, 120 + jumpElev, player3dZ + 40);
        }

        // Update Camera Rotation (Yaw & Pitch)
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.x = this.pitch;
        euler.y = this.yaw;
        this.camera.quaternion.setFromEuler(euler);

        // Update Viewmodel & Billboards
        this.viewmodel.update(dt, isMoving, player.speed / 6.0, player.jumpHeight || 0);
        this.billboardManager.update(this.game, dt);

        // Update Crosshair Raycasting with Toroidal Distance
        this._updateCrosshairRaycast();
    }

    _updateCrosshairRaycast() {
        this.currentCrosshairTarget = null;
        if (!this.game || !this.game.player) return;

        const p = this.game.player;
        const maxDist = 3.5 * TILE_SIZE; // Proximity reach for raycast target

        // Check nearest uncollected trash item with toroidal distance
        if (this.game.trashManager) {
            const trashList = this.game.trashManager.items || this.game.trashManager.trashItems || [];
            let closestTrash = null;
            let closestDist = maxDist;

            for (const item of trashList) {
                if (item.collected) continue;
                let dx = wrapWorldX(item.x) - wrapWorldX(p.x);
                let dy = wrapWorldY(item.y) - wrapWorldY(p.y);
                if (!window.pirateMode) {
                    if (dx > MAP_PIXEL_W / 2) dx -= MAP_PIXEL_W;
                    else if (dx < -MAP_PIXEL_W / 2) dx += MAP_PIXEL_W;
                    if (dy > MAP_PIXEL_H / 2) dy -= MAP_PIXEL_H;
                    else if (dy < -MAP_PIXEL_H / 2) dy += MAP_PIXEL_H;
                }
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestTrash = item;
                }
            }

            if (closestTrash) {
                let typeName = 'LITTER';
                if (closestTrash.type === 0 || closestTrash.type === '0') typeName = 'PAPER';
                else if (closestTrash.type === 1 || closestTrash.type === '1') typeName = 'SODA CAN';
                else if (closestTrash.type === 2 || closestTrash.type === '2') typeName = 'PLASTIC BOTTLE';
                else if (closestTrash.type === 3 || closestTrash.type === '3') typeName = 'BANANA PEEL';
                else if (typeof closestTrash.type === 'string') typeName = closestTrash.type.toUpperCase();

                this.currentCrosshairTarget = {
                    type: 'trash',
                    item: closestTrash,
                    label: `[E] / [Q] PICK UP ${typeName} 🗑️`
                };
                return;
            }
        }

        // Check nearest NPC with toroidal distance
        if (this.game.npcManager && this.game.npcManager.npcs) {
            let closestNPC = null;
            let closestDist = maxDist;

            for (const npc of this.game.npcManager.npcs) {
                let dx = wrapWorldX(npc.x) - wrapWorldX(p.x);
                let dy = wrapWorldY(npc.y) - wrapWorldY(p.y);
                if (!window.pirateMode) {
                    if (dx > MAP_PIXEL_W / 2) dx -= MAP_PIXEL_W;
                    else if (dx < -MAP_PIXEL_W / 2) dx += MAP_PIXEL_W;
                    if (dy > MAP_PIXEL_H / 2) dy -= MAP_PIXEL_H;
                    else if (dy < -MAP_PIXEL_H / 2) dy += MAP_PIXEL_H;
                }
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestNPC = npc;
                }
            }

            if (closestNPC) {
                this.currentCrosshairTarget = {
                    type: 'npc',
                    npc: closestNPC,
                    label: `[E] TALK TO ${closestNPC.name ? closestNPC.name.toUpperCase() : 'CITIZEN'}`
                };
                return;
            }
        }

        // Check nearest Building Door with toroidal distance
        if (this.game.gameMap && this.game.gameMap.buildings) {
            for (const bldg of this.game.gameMap.buildings) {
                if (!bldg || !bldg.doorTiles || bldg.doorTiles.length === 0) continue;
                for (const door of bldg.doorTiles) {
                    const doorX = door.x * TILE_SIZE + TILE_SIZE / 2;
                    const doorY = door.y * TILE_SIZE + TILE_SIZE / 2;
                    let dx = wrapWorldX(doorX) - wrapWorldX(p.x);
                    let dy = wrapWorldY(doorY) - wrapWorldY(p.y);
                    if (!window.pirateMode) {
                        if (dx > MAP_PIXEL_W / 2) dx -= MAP_PIXEL_W;
                        else if (dx < -MAP_PIXEL_W / 2) dx += MAP_PIXEL_W;
                        if (dy > MAP_PIXEL_H / 2) dy -= MAP_PIXEL_H;
                        else if (dy < -MAP_PIXEL_H / 2) dy += MAP_PIXEL_H;
                    }
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDist) {
                        const type = (bldg.type || '').toLowerCase();
                        let label = `[E] ENTER ${type ? type.toUpperCase() : 'BUILDING'}`;
                        if (type === 'dump') label = `[E] UNLOAD AT DUMP 🗑️`;
                        else if (type === 'zoo') label = `[E] DELIVER TO ZOO 🦁`;
                        else if (type === 'bank') label = `[E] VISIT BANK 🏦`;
                        else if (type === 'zippy_ds') label = `[E] ENTER ZIPPY D'S (SNACKRAP) 🌯`;
                        else if (type === 'goose' || type === 'fast_food') label = `[E] ENTER GOOSE (CLASSIC HOAGIE) 🥪`;
                        else if (type === 'chinos_steaks') label = `[E] ENTER CHINO'S STEAKS (CHEESESTEAK) 🥩`;
                        else if (type === 'rats_steaks') label = `[E] ENTER RATS STEAKS (CHEESESTEAK) 🥩`;
                        else if (type === 'hospital') label = `[E] ENTER HOSPITAL 🏥`;
                        else if (type === 'police') label = `[E] ENTER POLICE STATION 👮`;
                        else if (type === 'airport') label = `[E] ENTER AIRPORT ✈️`;
                        else if (type === 'pulp_mill' || type === 'pulp mill') label = `[E] SELL TIMBER AT PULP MILL 🪵`;
                        else if (type === 'black_market') label = `[E] ENTER BLACK MARKET ☠️`;
                        else if (window.builderMode) {
                            const idx = this.game.gameMap.buildings.indexOf(bldg);
                            const alreadyOwned = this.game.ownedBuildings ? this.game.ownedBuildings.find(b => b.building_idx === idx) : null;
                            if (alreadyOwned) {
                                label = `[E] APARTMENT: ${bldg.address || 'RESIDENCE'} (${alreadyOwned.tenants || 0}/5 TENANTS) 🏢`;
                            } else {
                                if (this.game.buildingPriceCache && !this.game.buildingPriceCache.has(idx)) {
                                    this.game.buildingPriceCache.set(idx, 2000 + Math.floor(Math.random() * 1501));
                                }
                                const price = (this.game.buildingPriceCache && this.game.buildingPriceCache.get(idx)) || 2500;
                                label = `[E] BUY APARTMENT: ${bldg.address || 'RESIDENCE'} ($${price.toLocaleString()}) 🏢`;
                            }
                        } else if (!type || type === 'default') {
                            label = `[E] ENTER ${bldg.address ? bldg.address.toUpperCase() : 'RESIDENCE'} 🚪`;
                        }

                        this.currentCrosshairTarget = {
                            type: 'building',
                            building: bldg,
                            label: label
                        };
                        return;
                    }
                }
            }
        }
    }

    render(ctx) {
        const w = (ctx && ctx.canvas) ? ctx.canvas.width : (this.canvas ? this.canvas.width : window.innerWidth);
        const h = (ctx && ctx.canvas) ? ctx.canvas.height : (this.canvas ? this.canvas.height : window.innerHeight);

        // 1. Render 3D WebGL Scene
        this.renderer.render(this.scene, this.camera);

        // 2. Render 2D FPS Viewmodel Hands onto screen
        this.viewmodel.render(ctx, w, h);

        // 3. Render Center Crosshair & Target Prompts
        this._renderCrosshair(ctx, w, h);

        // 4. Render Retro Radar Minimap (Top Left)
        this._renderMinimapRadar(ctx, w, h);

        // 5. Render Top Right HUD (Timer, Trash Collected, Messages & Navigation)
        this._renderTopHUD(ctx, w, h);

        // 6. Render Doom Status Bar HUD & Dynamic Status/Timer Bars (Happiness, Hunger, Animals, Buffs)
        if (this.game && this.game.hud) {
            this.game.hud.renderDoomStatusBar(ctx, w, h, this.game);
            this.game.hud.renderStatusAndTimerBars(ctx, w, h, 84, true);
            this.game.hud.renderNotifications(ctx, w, h);
            this.game.hud.renderInventoryUI(ctx, w, h);
        }
    }

    _renderTopHUD(ctx, w, h) {
        if (!this.game || !this.game.hud) return;

        const hud = this.game.hud;
        const timerX = w - 20;
        const timerY = 20;

        let boxHeight = 60;
        let susTimer = 0;
        if (window.fastFoodMode) {
            susTimer = Math.ceil(this.game.fastFoodSuspensionTimer || 0);
            boxHeight = susTimer > 0 ? 72 : 60;
        }

        ctx.save();

        // ── 1. Timer Display (top-right) ──
        const tBoxX = timerX - 140;
        const tBoxY = timerY - 10;
        const tBoxW = 150;
        const tBoxH = boxHeight;

        ctx.fillStyle = 'rgba(10, 15, 25, 0.88)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(tBoxX, tBoxY, tBoxW, tBoxH, 8);
        else ctx.rect(tBoxX, tBoxY, tBoxW, tBoxH);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.lineWidth = 1.5;
        if (typeof ctx.roundRect === 'function') ctx.roundRect(tBoxX, tBoxY, tBoxW, tBoxH, 8);
        else ctx.rect(tBoxX, tBoxY, tBoxW, tBoxH);
        ctx.stroke();

        ctx.fillStyle = '#ff4444';
        ctx.font = '16px serif';
        ctx.textAlign = 'left';
        ctx.fillText('⏱️', tBoxX + 10, tBoxY + 22);

        const timeLeft = Math.max(0, hud.timeRemaining !== undefined ? hud.timeRemaining : 120);
        const mins = Math.floor(timeLeft / 60);
        const secs = Math.floor(timeLeft % 60);
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

        ctx.fillStyle = timeLeft < 30 ? '#ef4444' : '#ffffff';
        ctx.font = 'bold 11px "Press Start 2P", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${timeStr} (${Math.ceil(timeLeft)}s)`, tBoxX + tBoxW - 10, tBoxY + 22);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '7.5px "Press Start 2P", monospace';
        ctx.fillText('TIMER', tBoxX + tBoxW - 10, tBoxY + 40);

        if (window.fastFoodMode && susTimer > 0) {
            ctx.fillStyle = '#00ff88';
            ctx.font = '6.5px "Press Start 2P", monospace';
            ctx.fillText(`No Trash Req: ${susTimer}s`, tBoxX + tBoxW - 10, tBoxY + 56);
        }

        if (window.flowersMode) {
            const fert = (window.playerInventory && window.playerInventory['Fertilizer']) || 0;
            ctx.fillStyle = '#ff66b2';
            ctx.font = '6.5px "Press Start 2P", monospace';
            ctx.fillText(`Fertilizer: ${fert}`, tBoxX + tBoxW - 10, tBoxY + (susTimer > 0 ? 66 : 54));
        }

        // ── 2. Trash Collected & Score Display (to the left of Timer) ──
        const scoreX = timerX - 160;
        const sBoxX = scoreX - 180;
        const sBoxY = timerY - 10;
        const sBoxW = 190;
        const sBoxH = boxHeight;

        ctx.fillStyle = 'rgba(10, 15, 25, 0.88)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(sBoxX, sBoxY, sBoxW, sBoxH, 8);
        else ctx.rect(sBoxX, sBoxY, sBoxW, sBoxH);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.lineWidth = 1.5;
        if (typeof ctx.roundRect === 'function') ctx.roundRect(sBoxX, sBoxY, sBoxW, sBoxH, 8);
        else ctx.rect(sBoxX, sBoxY, sBoxW, sBoxH);
        ctx.stroke();

        ctx.fillStyle = '#ff8844';
        ctx.font = '16px serif';
        ctx.textAlign = 'left';
        ctx.fillText('🗑️', sBoxX + 8, sBoxY + 22);

        // Score number
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('$' + (hud.score || 0).toLocaleString(), sBoxX + sBoxW - 10, sBoxY + 22);

        // Total Trash Collected & Eval Window
        const totalRoundTrash = (this.game.trashCollectedInRound !== undefined) ? this.game.trashCollectedInRound : 0;
        const trashInWindow = (this.game.trashCollectedInWindow !== undefined) ? this.game.trashCollectedInWindow : (hud.trashInWindow || 0);
        const evalTime = Math.ceil(hud.evalTimer || 0);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '7.5px "Press Start 2P", monospace';
        ctx.fillText(`TRASH: ${totalRoundTrash}`, sBoxX + sBoxW - 10, sBoxY + 38);

        ctx.fillStyle = (trashInWindow >= 7) ? '#00ff88' : (trashInWindow >= 5 ? '#facc15' : '#f87171');
        ctx.font = '6.5px "Press Start 2P", monospace';
        ctx.fillText(`Eval: ${trashInWindow}/7 (${evalTime}s)`, sBoxX + sBoxW - 10, sBoxY + 52);

        // ── 3. Navigation & Messages Button (Under Timer Box) ──
        const msgBtnW = 150;
        const msgBtnH = 30;
        const msgBtnX = tBoxX;
        const msgBtnY = tBoxY + tBoxH + 6;

        this.game.hud.messagesBtnBounds = { x: msgBtnX, y: msgBtnY, width: msgBtnW, height: msgBtnH };

        ctx.fillStyle = 'rgba(10, 18, 30, 0.88)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(msgBtnX, msgBtnY, msgBtnW, msgBtnH, 6);
        else ctx.rect(msgBtnX, msgBtnY, msgBtnW, msgBtnH);
        ctx.fill();
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1.5;
        if (typeof ctx.roundRect === 'function') ctx.roundRect(msgBtnX, msgBtnY, msgBtnW, msgBtnH, 6);
        else ctx.rect(msgBtnX, msgBtnY, msgBtnW, msgBtnH);
        ctx.stroke();

        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const msgCount = (hud.roundMessages || []).length;
        ctx.fillText(`💬 MSGS (${msgCount}) [M]`, msgBtnX + msgBtnW / 2, msgBtnY + 18);

        // Active navigation target badge if destination selected
        if (this.game.navigationTarget) {
            let navTarget = this.game.navigationTarget.toUpperCase();
            const ntLower = this.game.navigationTarget.toLowerCase().trim();
            if (ntLower === 'zippy_ds' || ntLower === 'zippy ds' || ntLower === 'zippy') navTarget = "ZIPPY D'S";
            else if (ntLower === 'goose') navTarget = "GOOSE";
            else if (ntLower === 'chinos_steaks' || ntLower === 'chinos' || ntLower === 'chinos steaks') navTarget = "CHINO'S";
            else if (ntLower === 'rats_steaks' || ntLower === 'rats' || ntLower === 'rats steaks') navTarget = "RATS";
            const badgeY = msgBtnY + msgBtnH + 4;
            const badgeH = 20;

            ctx.fillStyle = 'rgba(25, 20, 5, 0.92)';
            ctx.fillRect(msgBtnX, badgeY, msgBtnW, badgeH);
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(msgBtnX, badgeY, msgBtnW, badgeH);

            ctx.fillStyle = '#ffcc00';
            ctx.font = '6px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`📍 GO: ${navTarget}`, msgBtnX + msgBtnW / 2, badgeY + 13);
        }

        if (this.game && this.game.hud && typeof this.game.hud.renderMedicationAlert === 'function') {
            this.game.hud.renderMedicationAlert(ctx, w, h);
        }

        ctx.restore();
    }

    _renderMinimapRadar(ctx, w, h) {
        if (!this.game || !this.game.player || !this.game.miniMap) return;
        const mmSize = 130;
        const mmX = 20;
        const mmY = 20;

        ctx.save();
        // Minimap container box
        ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
        ctx.fillRect(mmX - 4, mmY - 4, mmSize + 8, mmSize + 8);
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.strokeRect(mmX - 4, mmY - 4, mmSize + 8, mmSize + 8);

        // Clip to minimap viewport
        ctx.save();
        ctx.beginPath();
        ctx.rect(mmX, mmY, mmSize, mmSize);
        ctx.clip();

        const p = this.game.player;
        const ptX = wrapTileX(Math.floor(p.x / TILE_SIZE));
        const ptY = wrapTileY(Math.floor(p.y / TILE_SIZE));

        // Draw static minimap canvas centered on player
        if (this.game.miniMap.staticCanvas) {
            const srcSize = 32 * this.game.miniMap.pixelPerTile;
            const srcX = ptX * this.game.miniMap.pixelPerTile - srcSize / 2;
            const srcY = ptY * this.game.miniMap.pixelPerTile - srcSize / 2;
            ctx.drawImage(this.game.miniMap.staticCanvas, srcX, srcY, srcSize, srcSize, mmX, mmY, mmSize, mmSize);
        }

        // Draw center player marker & directional FOV cone
        const cx = mmX + mmSize / 2;
        const cy = mmY + mmSize / 2;

        // FOV cone
        const yaw = this.yaw;
        const fovLen = 24;
        ctx.fillStyle = 'rgba(0, 255, 204, 0.25)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, fovLen, -yaw - Math.PI / 2 - 0.5, -yaw - Math.PI / 2 + 0.5);
        ctx.closePath();
        ctx.fill();

        // Draw Navigation Waypoint if active
        if (this.game.navigationTarget && this.game.gameMap && this.game.gameMap.buildings) {
            const targetType = this.game.navigationTarget.toLowerCase().trim();
            const targetNorm = targetType.replace(/\s+/g, '_');
            const bldg = this.game.gameMap.buildings.find(b => {
                if (!b || !b.type) return false;
                const btNorm = b.type.toLowerCase().replace(/\s+/g, '_');
                return btNorm === targetNorm || btNorm.includes(targetNorm) || targetNorm.includes(btNorm);
            });

            if (bldg) {
                let bX = bldg.x + bldg.width / 2;
                let bY = bldg.y + bldg.height / 2;
                if (bldg.doorTiles && bldg.doorTiles.length > 0) {
                    bX = bldg.doorTiles[0].x * TILE_SIZE + TILE_SIZE / 2;
                    bY = bldg.doorTiles[0].y * TILE_SIZE + TILE_SIZE / 2;
                }

                const px = typeof wrapWorldX === 'function' ? wrapWorldX(p.x) : p.x;
                const py = typeof wrapWorldY === 'function' ? wrapWorldY(p.y) : p.y;
                let dx = wrapWorldX(bX) - px;
                let dy = wrapWorldY(bY) - py;
                if (!window.pirateMode) {
                    if (dx > MAP_PIXEL_W / 2) dx -= MAP_PIXEL_W;
                    else if (dx < -MAP_PIXEL_W / 2) dx += MAP_PIXEL_W;
                    if (dy > MAP_PIXEL_H / 2) dy -= MAP_PIXEL_H;
                    else if (dy < -MAP_PIXEL_H / 2) dy += MAP_PIXEL_H;
                }

                const scale = (mmSize / 32) / TILE_SIZE;
                const wayX = cx + dx * scale;
                const wayY = cy + dy * scale;

                const maxRad = mmSize / 2 - 8;
                const wayDist = Math.hypot(wayX - cx, wayY - cy);
                let drawWX = wayX;
                let drawWY = wayY;
                if (wayDist > maxRad) {
                    drawWX = cx + ((wayX - cx) / wayDist) * maxRad;
                    drawWY = cy + ((wayY - cy) / wayDist) * maxRad;
                }

                // Dotted line towards waypoint
                ctx.strokeStyle = 'rgba(255, 204, 0, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(drawWX, drawWY);
                ctx.stroke();
                ctx.setLineDash([]);

                // Pulsing gold waypoint dot
                const pulseR = 4 + Math.sin(Date.now() / 150) * 1.5;
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                ctx.arc(drawWX, drawWY, pulseR, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        // Player dot & directional pointer
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - Math.sin(yaw) * 12, cy - Math.cos(yaw) * 12);
        ctx.stroke();

        ctx.restore(); // unclip

        // Radar text banner
        ctx.fillStyle = '#00ffcc';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('📡 RADAR', mmX, mmY + mmSize + 14);

        ctx.restore();
    }

    _renderCrosshair(ctx, w, h) {
        const cx = w / 2;
        const cy = h / 2 - 20;

        ctx.save();
        // Retro Crosshair '+'
        ctx.strokeStyle = this.currentCrosshairTarget ? '#00ffcc' : 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(cx - 8, cy);
        ctx.lineTo(cx + 8, cy);
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx, cy + 8);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = this.currentCrosshairTarget ? '#ff0055' : '#ffffff';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);

        // Interactive Target Prompt
        if (this.currentCrosshairTarget && this.currentCrosshairTarget.label) {
            ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2;
            const text = this.currentCrosshairTarget.label;
            ctx.font = 'bold 9px "Press Start 2P", monospace';
            const tw = ctx.measureText(text).width;

            ctx.fillRect(cx - tw / 2 - 8, cy + 20, tw + 16, 22);
            ctx.strokeRect(cx - tw / 2 - 8, cy + 20, tw + 16, 22);

            ctx.fillStyle = '#00ffcc';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, cx, cy + 32);
        }

        ctx.restore();
    }
}

window.Engine3D = Engine3D;
