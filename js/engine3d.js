// ============================================================
// engine3d.js — 3D WebGL FPS Engine & Camera Controller
// Powers Retro Wolfenstein / Doom First-Person Mode for Trashmaster
// ============================================================

class Engine3D {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.enabled = true; // 3D FPS Mode enabled by default

        // 3D Three.js core
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015); // Retro Doom sector fog

        this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 500);
        this.camera.position.set(0, 2.0, 0); // Eye height

        // Hardware-accelerated WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false, // Crisp retro pixels
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(canvas.width, canvas.height, false);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Atmospheric lighting
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        this.scene.add(this.ambientLight);

        this.playerLight = new THREE.PointLight(0xfffbeb, 1.2, 35);
        this.playerLight.position.set(0, 2.0, 0);
        this.scene.add(this.playerLight);

        // Subsystems
        this.mapBuilder = new MapBuilder3D(this.scene);
        this.billboardManager = new BillboardManager3D(this.scene, game.spriteManager);
        this.viewmodel = new FPSViewmodel();

        // 2D Canvas Overlay for Doom HUD & Viewmodel
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.width = canvas.width;
        this.overlayCanvas.height = canvas.height;
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
        // Request pointer lock on canvas click
        this.canvas.addEventListener('click', () => {
            if (this.game && this.game.state === GameState.PLAYING && !this.game.isPaused) {
                if (!document.pointerLockElement) {
                    this.canvas.requestPointerLock();
                }
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = (document.pointerLockElement === this.canvas);
        });

        // Mouse movement for mouselook
        document.addEventListener('mousemove', (e) => {
            if (this.pointerLocked && this.game && this.game.state === GameState.PLAYING && !this.game.isPaused) {
                const sensitivity = 0.0028;
                this.yaw -= e.movementX * sensitivity;
                this.pitch -= e.movementY * sensitivity;

                // Clamp pitch so camera doesn't flip upside down (-85 deg to +85 deg)
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
                this.camera.aspect = w / h;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(w, h, false);
                this.overlayCanvas.width = w;
                this.overlayCanvas.height = h;
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
        const mapW = this.game.gameMap ? this.game.gameMap.width : 64;
        const mapH = this.game.gameMap ? this.game.gameMap.height : 64;
        const S = this.TILE_SIZE_3D;

        // Synchronize 3D player position from 2D coordinates
        const player3dX = (player.x / TILE_SIZE - mapW / 2) * S;
        const player3dZ = (player.y / TILE_SIZE - mapH / 2) * S;

        // Head bobbing when walking
        const isMoving = player.moving || (player.keys && (player.keys.up || player.keys.down || player.keys.left || player.keys.right));
        const headBob = isMoving ? Math.sin(performance.now() / 100) * 0.08 : 0;

        this.camera.position.set(player3dX, 1.8 + headBob, player3dZ);
        this.playerLight.position.set(player3dX, 1.8, player3dZ);

        // Update Camera Rotation (Yaw & Pitch)
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.x = this.pitch;
        euler.y = this.yaw;
        this.camera.quaternion.setFromEuler(euler);

        // Update Viewmodel & Billboards
        this.viewmodel.update(dt, isMoving, player.speed / 6.0);
        this.billboardManager.update(this.game, dt);

        // Update Crosshair Raycasting
        this._updateCrosshairRaycast();
    }

    _updateCrosshairRaycast() {
        this.currentCrosshairTarget = null;
        if (!this.game || !this.game.player) return;

        const p = this.game.player;
        const maxDist = 3.5 * TILE_SIZE; // Proximity reach for raycast target

        // Check nearest trash item
        if (this.game.trashManager && this.game.trashManager.trashItems) {
            let closestTrash = null;
            let closestDist = maxDist;

            for (const item of this.game.trashManager.trashItems) {
                const dx = item.x - p.x;
                const dy = item.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestTrash = item;
                }
            }

            if (closestTrash) {
                this.currentCrosshairTarget = {
                    type: 'trash',
                    item: closestTrash,
                    label: `[E] / [Q] GRAB TRASH (${closestTrash.type.toUpperCase()})`
                };
                return;
            }
        }

        // Check nearest NPC
        if (this.game.npcManager) {
            const nearNPC = this.game.npcManager.checkInteraction(p.x, p.y);
            if (nearNPC) {
                this.currentCrosshairTarget = {
                    type: 'npc',
                    npc: nearNPC,
                    label: `[E] TALK TO ${nearNPC.name ? nearNPC.name.toUpperCase() : 'CITIZEN'}`
                };
                return;
            }
        }

        // Check nearest Building Door
        if (this.game.gameMap && this.game.gameMap.buildings) {
            for (const bldg of this.game.gameMap.buildings) {
                if (!bldg || !bldg.doorTiles || bldg.doorTiles.length === 0) continue;
                const door = bldg.doorTiles[0];
                const dx = door.x * TILE_SIZE + TILE_SIZE / 2 - p.x;
                const dy = door.y * TILE_SIZE + TILE_SIZE / 2 - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist) {
                    let label = `[E] ENTER ${bldg.type ? bldg.type.toUpperCase() : 'BUILDING'}`;
                    if (bldg.type === 'dump') label = `[E] UNLOAD AT DUMP`;
                    else if (bldg.type === 'zoo') label = `[E] DELIVER TO ZOO`;
                    else if (bldg.type === 'bank') label = `[E] VISIT BANK`;
                    else if (bldg.type === 'pulp_mill') label = `[E] SELL TIMBER AT PULP MILL`;

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

    render(ctx) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 1. Render 3D WebGL Scene
        this.renderer.render(this.scene, this.camera);

        // 2. Render 2D FPS Viewmodel Hands onto screen
        this.viewmodel.render(ctx, w, h);

        // 3. Render Center Crosshair & Target Prompts
        this._renderCrosshair(ctx, w, h);

        // 4. Render Doom Status Bar HUD
        if (this.game && this.game.hud) {
            this.game.hud.renderDoomStatusBar(ctx, w, h, this.game);
        }
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
            ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
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
