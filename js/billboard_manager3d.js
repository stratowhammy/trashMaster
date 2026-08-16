// ============================================================
// billboard_manager3d.js — 2.5D Camera-Facing Billboard Entity System
// Manages 3D Projections for Follower Posse, Trash, Trees, NPCs, Cars, Props
// with Toroidal Infinite Wrap Support
// ============================================================

class BillboardManager3D {
    constructor(scene, spriteManager) {
        this.scene = scene;
        this.spriteManager = spriteManager;
        this.sprites3D = new Sprites3D();
        this.billboardGroup = new THREE.Group();
        this.scene.add(this.billboardGroup);

        this.trashSprites = [];
        this.npcSprites = new Map();
        this.followerSprites = [];
        this.treeSprites = [];
        this.carSprites = new Map();
        this.animalSprites = new Map();
        this.shroomSprites = [];
        this.flowerSprites = [];
        this.floatingTextSprites = [];

        this.TILE_SIZE_3D = 4;
    }

    _getTexture(key) {
        return this.sprites3D.getTexture(key);
    }

    _createSprite(texture, scaleX = 2.2, scaleY = 2.2) {
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.15
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(scaleX, scaleY, 1.0);
        return sprite;
    }

    _getToroidal3DPos(entityX, entityY, player, p3dX, p3dZ, S) {
        const eNormX = wrapWorldX(entityX);
        const eNormY = wrapWorldY(entityY);
        const pNormX = wrapWorldX(player.x);
        const pNormY = wrapWorldY(player.y);

        let dPixelX = eNormX - pNormX;
        let dPixelY = eNormY - pNormY;

        if (!window.pirateMode) {
            if (dPixelX > MAP_PIXEL_W / 2) dPixelX -= MAP_PIXEL_W;
            else if (dPixelX < -MAP_PIXEL_W / 2) dPixelX += MAP_PIXEL_W;

            if (dPixelY > MAP_PIXEL_H / 2) dPixelY -= MAP_PIXEL_H;
            else if (dPixelY < -MAP_PIXEL_H / 2) dPixelY += MAP_PIXEL_H;
        }

        const d3dX = (dPixelX / TILE_SIZE) * S;
        const d3dZ = (dPixelY / TILE_SIZE) * S;

        return {
            x: p3dX + d3dX,
            z: p3dZ + d3dZ,
            distSq: d3dX * d3dX + d3dZ * d3dZ
        };
    }

    update(game, dt) {
        if (!game || !game.player) return;
        const player = game.player;
        const mapW = (game.gameMap && game.gameMap.width) ? game.gameMap.width : (typeof MAP_WIDTH !== 'undefined' ? MAP_WIDTH : 128);
        const mapH = (game.gameMap && game.gameMap.height) ? game.gameMap.height : (typeof MAP_HEIGHT !== 'undefined' ? MAP_HEIGHT : 128);
        const S = this.TILE_SIZE_3D;
        const time = performance.now() / 1000;

        const pNormX = wrapWorldX(player.x);
        const pNormY = wrapWorldY(player.y);
        const p3dX = (pNormX / TILE_SIZE - mapW / 2) * S;
        const p3dZ = (pNormY / TILE_SIZE - mapH / 2) * S;

        // 1. Synchronize Ground Trash Pickups
        this._syncTrash(game, mapW, mapH, S, time, player, p3dX, p3dZ);

        // 2. Synchronize Follower Posse Billboards
        this._syncFollowers(game, mapW, mapH, S, time, player, p3dX, p3dZ);

        // 3. Synchronize Trees on Burms & Parks
        this._syncTrees(game, mapW, mapH, S, player, p3dX, p3dZ);

        // 4. Synchronize NPC Billboards
        this._syncNPCs(game, mapW, mapH, S, player, p3dX, p3dZ);

        // 5. Synchronize Traffic Cars (Sideways profile)
        this._syncCars(game, mapW, mapH, S, player, p3dX, p3dZ);

        // 6. Synchronize Animals (Ranger Mode)
        this._syncAnimals(game, mapW, mapH, S, player, p3dX, p3dZ);

        // 7. Synchronize Wild Mushrooms & Flowers
        this._syncProps(game, mapW, mapH, S, player, p3dX, p3dZ);

        // 8. Synchronize Floating Text FX
        this._syncFloatingTexts(game, mapW, mapH, S, dt, player, p3dX, p3dZ);
    }

    _syncTrash(game, mapW, mapH, S, time, player, p3dX, p3dZ) {
        if (!game.trashManager) return;
        const items = game.trashManager.items || game.trashManager.trashItems || [];

        // Expand sprite pool if needed
        while (this.trashSprites.length < items.length) {
            const tex = this._getTexture('trash2');
            const sprite = this._createSprite(tex, 1.6, 1.6);
            this.billboardGroup.add(sprite);
            this.trashSprites.push(sprite);
        }

        // Hide unused pool sprites
        for (let i = items.length; i < this.trashSprites.length; i++) {
            this.trashSprites[i].visible = false;
        }

        // Update active trash items with Toroidal relative projection
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const sprite = this.trashSprites[i];

            if (item.collected) {
                sprite.visible = false;
                continue;
            }

            const pos = this._getToroidal3DPos(item.x, item.y, player, p3dX, p3dZ, S);
            if (pos.distSq > 380 * 380) {
                sprite.visible = false;
                continue;
            }

            sprite.visible = true;
            const hover = Math.sin(time * 3.5 + i) * 0.08 + 0.55;
            sprite.position.set(pos.x, hover, pos.z);

            // Determine appropriate texture key
            let key = 'trash2';
            if (item.type === 0 || item.type === '0' || item.type === 'paper') key = 'trash1';
            else if (item.type === 1 || item.type === '1' || item.type === 'can' || item.type === 'soda') key = 'trash2';
            else if (item.type === 2 || item.type === '2' || item.type === 'plastic' || item.type === 'bottle' || item.type === 'bag') key = 'trash3';
            else if (item.type === 3 || item.type === '3' || item.type === 'banana' || item.type === 'organic') key = 'trash4';
            else if (item.type === 'radioactive') key = 'trash_radioactive';
            else if (item.type === 'tire') key = 'trash_tire';
            else if (item.type === 'treasure') key = 'treasure';

            if (sprite.itemKey !== key) {
                sprite.itemKey = key;
                sprite.material.map = this._getTexture(key);
                sprite.material.needsUpdate = true;
            }
        }
    }

    _syncFollowers(game, mapW, mapH, S, time, player, p3dX, p3dZ) {
        if (!game.followerManager || !game.followerManager.followers) return;
        const followers = game.followerManager.followers;

        while (this.followerSprites.length < followers.length) {
            const defaultTex = this._getTexture('char2');
            const sprite = this._createSprite(defaultTex, 2.4, 2.4);
            this.billboardGroup.add(sprite);
            this.followerSprites.push(sprite);
        }

        for (let i = followers.length; i < this.followerSprites.length; i++) {
            this.followerSprites[i].visible = false;
        }

        followers.forEach((f, i) => {
            const sprite = this.followerSprites[i];
            const pos = this._getToroidal3DPos(f.x, f.y, player, p3dX, p3dZ, S);
            sprite.visible = true;

            const isMoving = f.moving || (Math.abs(f.vx || 0) > 0.1 || Math.abs(f.vy || 0) > 0.1);
            const bob = isMoving ? Math.sin(time * 8 + i) * 0.08 : 0;

            const isTruck = f.isTruck || f.type === 'truck' || f.spriteId === 'char_truck';
            if (isTruck) {
                sprite.scale.set(4.4, 2.6, 1.0); // Side view vehicle aspect
                sprite.position.set(pos.x, 1.3 + bob, pos.z);
            } else {
                sprite.scale.set(2.4, 2.4, 1.0); // Head-on character aspect
                sprite.position.set(pos.x, 1.2 + bob, pos.z);
            }

            let key = f.spriteId;
            if (!key) {
                if (isTruck) key = 'char_truck';
                else if (f.type === 'scientist') key = 'char3';
                else if (f.type === 'robot') key = 'char5';
                else if (f.type === 'athlete') key = 'char4';
                else if (f.type === 'superhero') key = 'char6';
                else if (f.type === 'ranger') key = 'char1';
                else key = 'char2';
            }

            if (sprite.currentKey !== key) {
                sprite.currentKey = key;
                sprite.material.map = this._getTexture(key);
                sprite.material.needsUpdate = true;
            }
        });
    }

    _syncTrees(game, mapW, mapH, S, player, p3dX, p3dZ) {
        if (!game.gameMap || !game.gameMap.trees) return;
        const trees = game.gameMap.trees;

        while (this.treeSprites.length < trees.length) {
            const treeTex = this._getTexture('tree');
            const sprite = this._createSprite(treeTex, 3.2, 4.4);
            this.billboardGroup.add(sprite);
            this.treeSprites.push(sprite);
        }

        for (let i = trees.length; i < this.treeSprites.length; i++) {
            this.treeSprites[i].visible = false;
        }

        for (let i = 0; i < trees.length; i++) {
            const tree = trees[i];
            const sprite = this.treeSprites[i];
            if (tree.cut) {
                sprite.visible = false;
                continue;
            }

            const pos = this._getToroidal3DPos(tree.x, tree.y, player, p3dX, p3dZ, S);
            if (pos.distSq > 380 * 380) {
                sprite.visible = false;
                continue;
            }

            sprite.visible = true;
            sprite.position.set(pos.x, 2.2, pos.z);
        }
    }

    _syncNPCs(game, mapW, mapH, S, player, p3dX, p3dZ) {
        if (!game.npcManager || !game.npcManager.npcs) return;
        const npcs = game.npcManager.npcs;
        const activeIds = new Set();

        npcs.forEach((npc, index) => {
            const id = npc.id || `npc_${index}`;
            activeIds.add(id);

            let sprite = this.npcSprites.get(id);
            if (!sprite) {
                const key = (npc.spriteId && npc.spriteId.startsWith('char')) ? npc.spriteId : (npc.isPolice ? 'police' : 'char_npc');
                const npcTex = this._getTexture(key);
                sprite = this._createSprite(npcTex, 2.4, 2.4);
                this.billboardGroup.add(sprite);
                this.npcSprites.set(id, sprite);
            }

            const pos = this._getToroidal3DPos(npc.x, npc.y, player, p3dX, p3dZ, S);
            if (pos.distSq > 380 * 380) {
                sprite.visible = false;
            } else {
                sprite.visible = true;
                sprite.position.set(pos.x, 1.2, pos.z);
            }
        });

        // Police Officers in Crime Mode
        if (game.crimeManager && game.crimeManager.police) {
            game.crimeManager.police.forEach((cop, idx) => {
                const id = `cop_${idx}`;
                activeIds.add(id);

                let sprite = this.npcSprites.get(id);
                if (!sprite) {
                    const copTex = this._getTexture('police');
                    sprite = this._createSprite(copTex, 2.4, 2.4);
                    this.billboardGroup.add(sprite);
                    this.npcSprites.set(id, sprite);
                }

                const pos = this._getToroidal3DPos(cop.x, cop.y, player, p3dX, p3dZ, S);
                if (pos.distSq > 380 * 380) {
                    sprite.visible = false;
                } else {
                    sprite.visible = true;
                    sprite.position.set(pos.x, 1.2, pos.z);
                }
            });
        }

        this.npcSprites.forEach((sprite, id) => {
            if (!activeIds.has(id)) sprite.visible = false;
        });
    }

    _syncCars(game, mapW, mapH, S, player, p3dX, p3dZ) {
        if (!game.carManager || !game.carManager.cars) return;
        const cars = game.carManager.cars;
        const activeIds = new Set();

        cars.forEach((car, index) => {
            if (!car.active) return;
            const id = `car_${index}`;
            activeIds.add(id);

            let sprite = this.carSprites.get(id);
            if (!sprite) {
                let carKey = 'black_cadillac';
                if (car.carType === 'suv') carKey = 'black_suv';
                else if (car.carType === 'truck' || car.color === 'red') carKey = 'red_truck';

                const carTex = this._getTexture(carKey);
                sprite = this._createSprite(carTex, 4.4, 2.2);
                this.billboardGroup.add(sprite);
                this.carSprites.set(id, sprite);
            }

            const pos = this._getToroidal3DPos(car.x, car.y, player, p3dX, p3dZ, S);
            if (pos.distSq > 380 * 380) {
                sprite.visible = false;
            } else {
                sprite.visible = true;
                sprite.position.set(pos.x, 1.1, pos.z);
            }
        });

        this.carSprites.forEach((sprite, id) => {
            if (!activeIds.has(id)) sprite.visible = false;
        });
    }

    _syncAnimals(game, mapW, mapH, S, player, p3dX, p3dZ) {
        if (!game.animalNodes) return;
        const activeIds = new Set();
        game.animalNodes.forEach((animal, index) => {
            const id = `animal_${index}`;
            activeIds.add(id);

            let sprite = this.animalSprites.get(id);
            if (!sprite) {
                const tex = this._getTexture('animal');
                sprite = this._createSprite(tex, 2.0, 2.0);
                this.billboardGroup.add(sprite);
                this.animalSprites.set(id, sprite);
            }

            const pos = this._getToroidal3DPos(animal.x, animal.y, player, p3dX, p3dZ, S);
            if (pos.distSq > 380 * 380) {
                sprite.visible = false;
            } else {
                sprite.visible = true;
                sprite.position.set(pos.x, 1.0, pos.z);
            }
        });

        this.animalSprites.forEach((sprite, id) => {
            if (!activeIds.has(id)) sprite.visible = false;
        });
    }

    _syncProps(game, mapW, mapH, S, player, p3dX, p3dZ) {
        // Wild mushrooms
        if (game.gameMap && game.gameMap.shrooms) {
            const shrooms = game.gameMap.shrooms;
            while (this.shroomSprites.length < shrooms.length) {
                const shroomTex = this._getTexture('shroom');
                const sprite = this._createSprite(shroomTex, 1.4, 1.4);
                this.billboardGroup.add(sprite);
                this.shroomSprites.push(sprite);
            }
            for (let i = 0; i < shrooms.length; i++) {
                const sh = shrooms[i];
                const sprite = this.shroomSprites[i];
                if (sh.collected) {
                    sprite.visible = false;
                    continue;
                }
                const pos = this._getToroidal3DPos(sh.x, sh.y, player, p3dX, p3dZ, S);
                if (pos.distSq > 380 * 380) {
                    sprite.visible = false;
                    continue;
                }
                sprite.visible = true;
                sprite.position.set(pos.x, 0.7, pos.z);
            }
        }

        // Flowers
        if (game.flowers) {
            while (this.flowerSprites.length < game.flowers.length) {
                const flowerTex = this._getTexture('flower');
                const sprite = this._createSprite(flowerTex, 1.4, 1.4);
                this.billboardGroup.add(sprite);
                this.flowerSprites.push(sprite);
            }
            for (let i = 0; i < game.flowers.length; i++) {
                const fl = game.flowers[i];
                const sprite = this.flowerSprites[i];
                const pos = this._getToroidal3DPos(fl.x, fl.y, player, p3dX, p3dZ, S);
                if (pos.distSq > 380 * 380) {
                    sprite.visible = false;
                    continue;
                }
                sprite.visible = true;
                sprite.position.set(pos.x, 0.7, pos.z);
            }
        }
    }

    _syncFloatingTexts(game, mapW, mapH, S, dt, player, p3dX, p3dZ) {
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
            const pos = this._getToroidal3DPos(eff.x, eff.y, player, p3dX, p3dZ, S);
            sprite.visible = true;

            const y3d = 1.8 + (eff.timer || 0) * 1.5;
            sprite.position.set(pos.x, y3d, pos.z);
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

        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.1 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(2.5, 0.7, 1);
        return sprite;
    }
}

window.BillboardManager3D = BillboardManager3D;
