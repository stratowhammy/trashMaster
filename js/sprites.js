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
        { id: 'mud', name: 'Mud', src: 'assets/sprites/mud.png' },
        { id: 'red_truck', name: 'Red Truck', src: 'assets/sprites/red_truck.png' },
        { id: 'red_balloon', name: 'Red Balloon', src: 'assets/sprites/red_balloon.png' },
        { id: 'parade', name: 'Parade', src: 'assets/sprites/parade.png' },
        { id: 'dump', name: 'Dump', src: 'assets/sprites/dump.png' },
        { id: 'philly_city_hall', name: 'City Hall', src: 'assets/sprites/philly_city_hall.png' },
        { id: 'philly_art_museum', name: 'Art Museum', src: 'assets/sprites/philly_art_museum.png' },
        { id: 'philly_liberty_bell', name: 'Liberty Bell', src: 'assets/sprites/philly_liberty_bell.png' },
        { id: 'philly_one_liberty', name: 'One Liberty', src: 'assets/sprites/philly_one_liberty.png' },
        { id: 'philly_franklin_inst', name: 'Franklin Institute', src: 'assets/sprites/philly_franklin_inst.png' },
        { id: 'philly_station', name: '30th Street Station', src: 'assets/sprites/philly_station.png' },
        { id: 'black_cadillac', name: 'Black Cadillac', src: 'assets/sprites/black_cadillac.png' },
        { id: 'black_suv', name: 'Black SUV', src: 'assets/sprites/black_suv.png' },
        { id: 'airport', name: 'Airport', src: 'assets/sprites/airport.png' },
        { id: 'airplane_icon', name: 'Airplane Icon', src: 'assets/sprites/airplane_icon.png' },
        { id: 'hospital_landmark', name: 'Hospital', src: 'assets/sprites/hospital.png' },
        // Dahgbad Landmarks
        { id: 'burj_khalifa', name: 'Burj Khalifa', src: 'assets/sprites/burj_khalifa.jpg' },
        { id: 'petra', name: 'Petra', src: 'assets/sprites/petra.jpg' },
        { id: 'dome_of_rock', name: 'Dome of the Rock', src: 'assets/sprites/dome_of_rock.jpg' },
        { id: 'pyramids', name: 'Pyramids', src: 'assets/sprites/pyramids.jpg' },
        { id: 'burj_al_arab', name: 'Burj Al Arab', src: 'assets/sprites/burj_al_arab.jpg' },
        { id: 'kingdom_centre', name: 'Kingdom Centre', src: 'assets/sprites/kingdom_centre.jpg' },
        // Cucaracha Landmarks
        { id: 'christ_redeemer', name: 'Christ Redeemer', src: 'assets/sprites/christ_redeemer.jpg' },
        { id: 'machu_picchu', name: 'Machu Picchu', src: 'assets/sprites/machu_picchu.jpg' },
        { id: 'obelisco_ba', name: 'Obelisco', src: 'assets/sprites/obelisco_ba.jpg' },
        { id: 'torre_entel', name: 'Torre Entel', src: 'assets/sprites/torre_entel.jpg' },
        { id: 'palacio_salvo', name: 'Palacio Salvo', src: 'assets/sprites/palacio_salvo.jpg' },
        { id: 'congresso_nacional', name: 'Congresso Nacional', src: 'assets/sprites/congresso_nacional.jpg' }
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

            const timeout = setTimeout(() => {
                console.warn(`Sprite loading timed out (${this.totalLoaded}/${this.totalToLoad} loaded). Continuing...`);
                // Create fallbacks for any sprites that failed to load
                for (const sprite of allSprites) {
                    if (!this.images[sprite.id]) {
                        this.images[sprite.id] = this._createFallbackSprite(sprite);
                    }
                }
                this.loaded = true;
                resolve();
            }, 3000);

            if (this.totalToLoad === 0) {
                clearTimeout(timeout);
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
                        clearTimeout(timeout);
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
                        clearTimeout(timeout);
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
