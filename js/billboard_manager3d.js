// ============================================================
// billboard_manager3d.js — 2.5D Camera-Facing Billboard Entity System
// Manages 3D Projections for Trash, NPCs, Followers, Cars, Police
// ============================================================

class BillboardManager3D {
    constructor(scene, spriteManager) {
        this.scene = scene;
        this.spriteManager = spriteManager;
        this.billboardGroup = new THREE.Group();
        this.scene.add(this.billboardGroup);

        this.spriteTextureCache = new Map();
        this.trashSprites = [];
        this.npcSprites = new Map();
        this.followerSprites = [];
        this.carSprites = new Map();
        this.animalSprites = new Map();
        this.floatingTextSprites = [];

        this.TILE_SIZE_3D = 4;
    }

    _getTextureFromCanvas(canvasOrImg) {
        if (!canvasOrImg) return null;
        if (this.spriteTextureCache.has(canvasOrImg)) {
            return this.spriteTextureCache.get(canvasOrImg);
        }
        const tex = new THREE.CanvasTexture(canvasOrImg);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        this.spriteTextureCache.set(canvasOrImg, tex);
        return tex;
    }

    _createSprite(texture, scaleX = 2.0, scaleY = 2.0) {
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(scaleX, scaleY, 1.0);
        return sprite;
    }

    update(game, dt) {
        const mapW = game.gameMap ? game.gameMap.width : 64;
        const mapH = game.gameMap ? game.gameMap.height : 64;
        const S = this.TILE_SIZE_3D;
        const time = performance.now() / 1000;

        // 1. Synchronize Trash Billboards
        this._syncTrash(game, mapW, mapH, S, time);

        // 2. Synchronize NPC Billboards (Citizens, Dons, Police, Rivals)
        this._syncNPCs(game, mapW, mapH, S);

        // 3. Synchronize Follower Posse Billboards
        this._syncFollowers(game, mapW, mapH, S);

        // 4. Synchronize Traffic Cars
        this._syncCars(game, mapW, mapH, S);

        // 5. Synchronize Animals (Ranger Mode)
        this._syncAnimals(game, mapW, mapH, S);

        // 6. Synchronize Floating Text FX
        this._syncFloatingTexts(game, mapW, mapH, S, dt);
    }

    _syncTrash(game, mapW, mapH, S, time) {
        if (!game.trashManager || !game.trashManager.trashItems) return;
        const items = game.trashManager.trashItems;

        // Ensure array size matches
        while (this.trashSprites.length < items.length) {
            const placeholderTex = this._createTrashTexture('can');
            const sprite = this._createSprite(placeholderTex, 1.6, 1.6);
            this.billboardGroup.add(sprite);
            this.trashSprites.push(sprite);
        }

        // Hide extra sprites
        for (let i = items.length; i < this.trashSprites.length; i++) {
            this.trashSprites[i].visible = false;
        }

        // Update positions & textures
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const sprite = this.trashSprites[i];
            sprite.visible = true;

            const x3d = (item.x / TILE_SIZE - mapW / 2) * S;
            const z3d = (item.y / TILE_SIZE - mapH / 2) * S;
            const hover = Math.sin(time * 3 + i) * 0.15 + 0.9;

            sprite.position.set(x3d, hover, z3d);

            // Set sprite texture based on item type
            if (!sprite.itemType || sprite.itemType !== item.type) {
                sprite.itemType = item.type;
                sprite.material.map = this._getTrashTexture(item.type);
                sprite.material.needsUpdate = true;
            }
        }
    }

    _getTrashTexture(type) {
        const key = `trash_${type}`;
        if (this.spriteTextureCache.has(key)) {
            return this.spriteTextureCache.get(key);
        }
        const tex = this._createTrashTexture(type);
        this.spriteTextureCache.set(key, tex);
        return tex;
    }

    _createTrashTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        if (type === 'bottle' || type === 'plastic') {
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(12, 6, 8, 20);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(14, 2, 4, 4);
        } else if (type === 'bag') {
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(16, 18, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#facc15';
            ctx.fillRect(13, 6, 6, 4);
        } else if (type === 'radioactive') {
            ctx.fillStyle = '#15803d';
            ctx.fillRect(8, 6, 16, 20);
            ctx.fillStyle = '#a3e635';
            ctx.fillRect(12, 12, 8, 8);
        } else if (type === 'tire') {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(16, 16, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(16, 16, 5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Default Soda Can
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(10, 6, 12, 20);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(10, 6, 12, 3);
            ctx.fillRect(10, 23, 12, 3);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        return tex;
    }

    _syncNPCs(game, mapW, mapH, S) {
        if (!game.npcManager || !game.npcManager.npcs) return;
        const npcs = game.npcManager.npcs;
        const activeIds = new Set();

        npcs.forEach((npc, index) => {
            const id = npc.id || `npc_${index}`;
            activeIds.add(id);

            let sprite = this.npcSprites.get(id);
            if (!sprite) {
                const npcTex = this._createNPCTexture(npc.spriteId || npc.npcType || 'student');
                sprite = this._createSprite(npcTex, 2.4, 2.4);
                this.billboardGroup.add(sprite);
                this.npcSprites.set(id, sprite);
            }

            sprite.visible = true;
            const x3d = (npc.x / TILE_SIZE - mapW / 2) * S;
            const z3d = (npc.y / TILE_SIZE - mapH / 2) * S;
            sprite.position.set(x3d, 1.2, z3d);
        });

        // Add Police officers in Crime Mode
        if (game.crimeManager && game.crimeManager.police) {
            game.crimeManager.police.forEach((cop, idx) => {
                const id = `cop_${idx}`;
                activeIds.add(id);

                let sprite = this.npcSprites.get(id);
                if (!sprite) {
                    const copTex = this._createNPCTexture('police');
                    sprite = this._createSprite(copTex, 2.4, 2.4);
                    this.billboardGroup.add(sprite);
                    this.npcSprites.set(id, sprite);
                }

                sprite.visible = true;
                const x3d = (cop.x / TILE_SIZE - mapW / 2) * S;
                const z3d = (cop.y / TILE_SIZE - mapH / 2) * S;
                sprite.position.set(x3d, 1.2, z3d);
            });
        }

        // Clean up inactive NPCs
        this.npcSprites.forEach((sprite, id) => {
            if (!activeIds.has(id)) {
                sprite.visible = false;
            }
        });
    }

    _createNPCTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        let shirtColor = '#3b82f6';
        let skinColor = '#fed7aa';
        let hatColor = '#1e293b';

        if (type === 'police') {
            shirtColor = '#1e3a8a';
            hatColor = '#172554';
        } else if (type === 'don' || type === 'mafia') {
            shirtColor = '#0f172a';
            hatColor = '#991b1b';
        } else if (type === 'ranger') {
            shirtColor = '#15803d';
            hatColor = '#854d0e';
        } else if (type === 'scientist') {
            shirtColor = '#f8fafc';
            hatColor = '#0284c7';
        }

        // Head
        ctx.fillStyle = skinColor;
        ctx.fillRect(10, 4, 12, 10);
        // Eyes
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(12, 7, 2, 2);
        ctx.fillRect(18, 7, 2, 2);
        // Hat
        ctx.fillStyle = hatColor;
        ctx.fillRect(8, 2, 16, 4);
        // Body / Shirt
        ctx.fillStyle = shirtColor;
        ctx.fillRect(8, 14, 16, 10);
        // Legs
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(10, 24, 4, 8);
        ctx.fillRect(18, 24, 4, 8);

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        return tex;
    }

    _syncFollowers(game, mapW, mapH, S) {
        if (!game.followerManager || !game.followerManager.followers) return;
        const followers = game.followerManager.followers;

        while (this.followerSprites.length < followers.length) {
            const tex = this._createNPCTexture('student');
            const sprite = this._createSprite(tex, 2.2, 2.2);
            this.billboardGroup.add(sprite);
            this.followerSprites.push(sprite);
        }

        for (let i = followers.length; i < this.followerSprites.length; i++) {
            this.followerSprites[i].visible = false;
        }

        followers.forEach((f, i) => {
            const sprite = this.followerSprites[i];
            sprite.visible = true;
            const x3d = (f.x / TILE_SIZE - mapW / 2) * S;
            const z3d = (f.y / TILE_SIZE - mapH / 2) * S;
            sprite.position.set(x3d, 1.1, z3d);
        });
    }

    _syncCars(game, mapW, mapH, S) {
        if (!game.carManager || !game.carManager.cars) return;
        const cars = game.carManager.cars;
        const activeIds = new Set();

        cars.forEach((car, index) => {
            if (!car.active) return;
            const id = `car_${index}`;
            activeIds.add(id);

            let sprite = this.carSprites.get(id);
            if (!sprite) {
                const carTex = this._createCarTexture(car.color || '#ef4444');
                sprite = this._createSprite(carTex, 3.5, 2.0);
                this.billboardGroup.add(sprite);
                this.carSprites.set(id, sprite);
            }

            sprite.visible = true;
            const x3d = (car.x / TILE_SIZE - mapW / 2) * S;
            const z3d = (car.y / TILE_SIZE - mapH / 2) * S;
            sprite.position.set(x3d, 1.0, z3d);
        });

        this.carSprites.forEach((sprite, id) => {
            if (!activeIds.has(id)) sprite.visible = false;
        });
    }

    _createCarTexture(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Body
        ctx.fillStyle = color;
        ctx.fillRect(8, 10, 48, 14);
        ctx.fillRect(16, 4, 32, 8);
        // Windows
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(20, 6, 10, 5);
        ctx.fillRect(34, 6, 10, 5);
        // Wheels
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(18, 24, 6, 0, Math.PI * 2);
        ctx.arc(46, 24, 6, 0, Math.PI * 2);
        ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        return tex;
    }

    _syncAnimals(game, mapW, mapH, S) {
        if (!game.player || !game.player.capturedAnimals) return;
        // Ranger mode animals on map
        if (game.animalNodes) {
            const activeIds = new Set();
            game.animalNodes.forEach((animal, index) => {
                const id = `animal_${index}`;
                activeIds.add(id);

                let sprite = this.animalSprites.get(id);
                if (!sprite) {
                    const tex = this._createAnimalTexture(animal.type || 'fox');
                    sprite = this._createSprite(tex, 2.0, 2.0);
                    this.billboardGroup.add(sprite);
                    this.animalSprites.set(id, sprite);
                }

                sprite.visible = true;
                const x3d = (animal.x / TILE_SIZE - mapW / 2) * S;
                const z3d = (animal.y / TILE_SIZE - mapH / 2) * S;
                sprite.position.set(x3d, 0.8, z3d);
            });

            this.animalSprites.forEach((sprite, id) => {
                if (!activeIds.has(id)) sprite.visible = false;
            });
        }
    }

    _createAnimalTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#ea580c'; // Fox orange
        ctx.beginPath();
        ctx.arc(16, 18, 9, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.fillRect(8, 6, 4, 6);
        ctx.fillRect(20, 6, 4, 6);
        // Face
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(12, 16, 8, 6);
        ctx.fillStyle = '#000';
        ctx.fillRect(15, 18, 2, 2);

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        return tex;
    }

    _syncFloatingTexts(game, mapW, mapH, S, dt) {
        if (!game.trashManager || !game.trashManager.pickupEffects) return;
        const effects = game.trashManager.pickupEffects;

        while (this.floatingTextSprites.length < effects.length) {
            const sprite = this._createFloatingTextSprite('+$50');
            this.billboardGroup.add(sprite);
            this.floatingTextSprites.push(sprite);
        }

        for (let i = effects.length; i < this.floatingTextSprites.length; i++) {
            this.floatingTextSprites[i].visible = false;
        }

        effects.forEach((eff, i) => {
            const sprite = this.floatingTextSprites[i];
            sprite.visible = true;

            const x3d = (eff.x / TILE_SIZE - mapW / 2) * S;
            const z3d = (eff.y / TILE_SIZE - mapH / 2) * S;
            const y3d = 1.8 + (eff.timer || 0) * 1.5;

            sprite.position.set(x3d, y3d, z3d);
        });
    }

    _createFloatingTextSprite(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 16);

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;

        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(2.5, 0.7, 1);
        return sprite;
    }
}

window.BillboardManager3D = BillboardManager3D;
