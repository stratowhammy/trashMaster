// ============================================================
// sprites.js — Sprite image loader & manager
// ============================================================

const SPRITE_CONFIG = {
    characters: [
        { id: 'char1', name: 'Ranger',     src: 'assets/sprites/char1.png', color: '#2d6b2d' },
        { id: 'char2', name: 'Student',    src: 'assets/sprites/char2.png', color: '#2d5aa0' },
        { id: 'char3', name: 'Scientist',  src: 'assets/sprites/char3.png', color: '#e0e0e0' },
        { id: 'char4', name: 'Athlete',    src: 'assets/sprites/char4.png', color: '#cc3333' },
        { id: 'char5', name: 'Robot',      src: 'assets/sprites/char5.png', color: '#8899aa' },
        { id: 'char6', name: 'Superhero',  src: 'assets/sprites/char6.png', color: '#7733cc' },
    ],
    trash: [
        { id: 'trash1', name: 'Paper',       src: 'assets/sprites/trash1.png' },
        { id: 'trash2', name: 'Soda Can',    src: 'assets/sprites/trash2.png' },
        { id: 'trash3', name: 'Plastic Bag', src: 'assets/sprites/trash3.png' },
        { id: 'trash4', name: 'Banana Peel', src: 'assets/sprites/trash4.png' },
    ],
    other: [
        { id: 'char_truck', name: 'Trash Truck', src: 'assets/sprites/trash_truck.png', color: '#00aa55' },
        { id: 'char_npc', name: 'NPC', src: 'assets/sprites/npc.png', color: '#33aa55' },
        { id: 'char_pirate', name: 'Pirate', src: 'assets/sprites/pirate.png', color: '#aa3333' },
        { id: 'item_protection', name: 'Protection', src: 'assets/sprites/protection.png', color: '#4488cc' },
        { id: 'fast_food_sign', name: 'Fast Food Sign', src: 'assets/sprites/fast_food.png', color: '#ffaa00' },
        { id: 'flower', name: 'Flower', src: 'assets/sprites/flower.png' },
        { id: 'mud', name: 'Mud', src: 'assets/sprites/mud.png' }
    ]
};

class SpriteManager {
    constructor() {
        this.images = {};
        this.loaded = false;
        this.totalToLoad = 0;
        this.totalLoaded = 0;
    }

    loadAll() {
        return new Promise((resolve, reject) => {
            const allSprites = [
                ...SPRITE_CONFIG.characters,
                ...SPRITE_CONFIG.trash,
                ...(SPRITE_CONFIG.other || []),
            ];

            this.totalToLoad = allSprites.length;
            this.totalLoaded = 0;

            if (this.totalToLoad === 0) {
                this.loaded = true;
                resolve();
                return;
            }

            for (const sprite of allSprites) {
                const img = new Image();
                img.onload = () => {
                    this.images[sprite.id] = img;
                    this.totalLoaded++;
                    if (this.totalLoaded >= this.totalToLoad) {
                        this.loaded = true;
                        resolve();
                    }
                };
                img.onerror = () => {
                    // On error, create a fallback canvas sprite
                    console.warn(`Failed to load sprite: ${sprite.src}, using fallback`);
                    this.images[sprite.id] = this._createFallbackSprite(sprite);
                    this.totalLoaded++;
                    if (this.totalLoaded >= this.totalToLoad) {
                        this.loaded = true;
                        resolve();
                    }
                };
                img.src = sprite.src;
            }
        });
    }

    _processTransparency(img, sprite) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Sample the background color from the corner pixel (top-left)
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];

        // Increased tolerance for JPEG artifact compression around details
        const tolerance = 60;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            // Distance metric to background color
            const dist = Math.sqrt(
                (r - bgR) * (r - bgR) +
                (g - bgG) * (g - bgG) +
                (b - bgB) * (b - bgB)
            );

            if (dist < tolerance) {
                data[i+3] = 0; // Set Alpha to 0
            }
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    _createFallbackSprite(sprite) {
        const size = sprite.id.startsWith('char') ? 64 : 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (sprite.id.startsWith('char')) {
            // Character fallback: colored circle with initial
            const color = sprite.color || '#888';
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${size / 2}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sprite.name[0], size / 2, size / 2);
        } else {
            // Trash fallback: small colored shape
            const colors = { trash1: '#eee', trash2: '#cc4444', trash3: '#aaddff', trash4: '#ffdd33' };
            ctx.fillStyle = colors[sprite.id] || '#888';
            ctx.fillRect(4, 4, size - 8, size - 8);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(4, 4, size - 8, size - 8);
        }

        return canvas;
    }

    getCharacterImage(id) {
        return this.images[id] || null;
    }

    getTrashImage(id) {
        return this.images[id] || null;
    }

    getImage(id) {
        return this.images[id] || null;
    }

    getLoadingProgress() {
        if (this.totalToLoad === 0) return 1;
        return this.totalLoaded / this.totalToLoad;
    }
}
