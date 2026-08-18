// ============================================================
// sprites3d.js — High-Fidelity 2.5D Retro Pixel Art Sprite Generator
// Generates Head-on Characters, Side-view Vehicles, 2.5D Trash, and Props
// ============================================================

class Sprites3D {
    constructor() {
        this.cache = new Map();
    }

    _createCanvas(w, h, drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        drawFn(ctx, w, h);
        return canvas;
    }

    getTexture(key) {
        if (window.alexJonesCheat || (window.game && window.game.alexJonesModeActive)) {
            const charKeys = ['char1', 'char2', 'char3', 'char4', 'char5', 'char6', 'char7', 'char_trashmaster', 'char_npc', 'police', 'char_pirate', 'char_dragon_master', 'cult_white_robe', 'leatherdaddy_frog'];
            if (charKeys.includes(key)) {
                return this._getLeatherdaddyFrogTexture();
            }
        }

        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        let canvas = null;
        switch (key) {
            // Characters (Head-on Front View)
            case 'leatherdaddy_frog': return this._getLeatherdaddyFrogTexture();
            case 'char1': canvas = this._drawRanger(); break;
            case 'char2': canvas = this._drawStudent(); break;
            case 'char3': canvas = this._drawScientist(); break;
            case 'char4': canvas = this._drawAthlete(); break;
            case 'char5': canvas = this._drawRobot(); break;
            case 'char6': canvas = this._drawSuperhero(); break;
            case 'char7': canvas = this._drawGDCube(); break;
            case 'char_trashmaster': canvas = this._drawTrashMaster(); break;
            case 'char_npc': canvas = this._drawCitizen(); break;
            case 'police': canvas = this._drawPolice(); break;
            case 'char_pirate': canvas = this._drawPirate(); break;
            case 'cheese_monster': canvas = this._drawCheeseMonster(); break;

            // Vehicles (2.5D Side Profile View)
            case 'char_truck': canvas = this._drawTrashTruck(); break;
            case 'black_cadillac': canvas = this._drawCadillac(); break;
            case 'black_suv': canvas = this._drawSUV(); break;
            case 'red_truck': canvas = this._drawRedTruck(); break;

            // Trash Items (Vibrant 2.5D Floating Pickups)
            case 'trash1':
            case 'trash_0':
            case 'trash_paper': canvas = this._drawTrashPaper(); break;

            case 'trash2':
            case 'trash_1':
            case 'trash_soda':
            case 'trash_can': canvas = this._drawTrashSodaCan(); break;

            case 'trash3':
            case 'trash_2':
            case 'trash_plastic':
            case 'trash_bottle': canvas = this._drawTrashBottle(); break;

            case 'trash4':
            case 'trash_3':
            case 'trash_banana':
            case 'trash_organic': canvas = this._drawTrashBanana(); break;

            case 'trash_radioactive': canvas = this._drawTrashRadioactive(); break;
            case 'trash_tire': canvas = this._drawTrashTire(); break;
            case 'treasure': canvas = this._drawTreasure(); break;

            // Props & Flora
            case 'tree': canvas = this._drawTree(); break;
            case 'shroom': canvas = this._drawShroom(); break;
            case 'flower': canvas = this._drawFlower(); break;
            case 'animal': canvas = this._drawAnimal(); break;
            case 'third_eye': canvas = this._drawThirdEye(); break;

            // Speed Changers (Geometry Dash Speed Portals)
            case 'speed_yellow':
            case 'speed_green':
            case 'speed_pink':
            case 'speed_red':
                return this._getSpeedChangerTexture(key);

            // Geometry Dash Spikes
            case 'gd_spike':
                canvas = this._drawGDSpike();
                break;

            default:
                canvas = this._drawStudent();
                break;
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        this.cache.set(key, texture);
        return texture;
    }

    _getSpeedChangerTexture(key) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const spriteMgr = (window.game && window.game.spriteManager) || window.spriteManager;
        const img = spriteMgr && spriteMgr.images ? spriteMgr.images[key] : null;
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const renderChanger = () => {
            ctx.clearRect(0, 0, 128, 128);
            if (img && (img.complete || img.naturalWidth > 0 || img.width > 0)) {
                ctx.drawImage(img, 0, 0, 128, 128);
            } else {
                const colors = {
                    speed_yellow: '#ffcc00',
                    speed_green: '#00ff44',
                    speed_pink: '#ff44ff',
                    speed_red: '#ff2222'
                };
                ctx.fillStyle = colors[key] || '#ffffff';
                ctx.beginPath();
                ctx.moveTo(30, 20); ctx.lineTo(80, 64); ctx.lineTo(30, 108);
                ctx.lineTo(50, 108); ctx.lineTo(100, 64); ctx.lineTo(50, 20);
                ctx.closePath();
                ctx.fill();
            }
        };

        renderChanger();

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;

        if (img && !img.complete && typeof img.addEventListener === 'function') {
            img.addEventListener('load', () => {
                renderChanger();
                tex.needsUpdate = true;
            });
        }

        this.cache.set(key, tex);
        return tex;
    }

    _drawGDSpike() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            const gradient = ctx.createLinearGradient(32, 4, 32, 60);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.45, '#000000');
            gradient.addColorStop(0.55, '#0f2b66');
            gradient.addColorStop(1, '#1d4ed8');

            ctx.beginPath();
            ctx.moveTo(32, 4);
            ctx.lineTo(58, 60);
            ctx.lineTo(6, 60);
            ctx.closePath();

            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3.5;
            ctx.lineJoin = 'round';
            ctx.stroke();

            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        });
    }

    _getLeatherdaddyFrogTexture() {
        if (this.cache.has('leatherdaddy_frog')) {
            return this.cache.get('leatherdaddy_frog');
        }
        const spriteMgr = (window.game && window.game.spriteManager) || window.spriteManager;
        const img = spriteMgr && spriteMgr.images ? spriteMgr.images['leatherdaddy_frog'] : null;
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const renderFrog = () => {
            ctx.clearRect(0, 0, 256, 256);
            if (img && (img.complete || img.naturalWidth > 0 || img.width > 0)) {
                ctx.drawImage(img, 0, 0, 256, 256);
            } else {
                // Retro frog fallback
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(40, 40, 176, 176);
                ctx.fillStyle = '#111';
                ctx.fillRect(60, 60, 40, 40);
                ctx.fillRect(156, 60, 40, 40);
            }
        };

        renderFrog();

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;

        if (img && !img.complete && typeof img.addEventListener === 'function') {
            img.addEventListener('load', () => {
                renderFrog();
                tex.needsUpdate = true;
            });
        }

        this.cache.set('leatherdaddy_frog', tex);
        return tex;
    }

    // ============================================================
    // 👤 HEAD-ON 2.5D CHARACTER SPRITES (64 x 64)
    // ============================================================

    _drawCheeseMonster() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(32, 60, 22, 5, 0, 0, Math.PI * 2); ctx.fill();

            // Menacing Cheddar Body (glowing yellow-orange wedge / blob)
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(32, 6);
            ctx.lineTo(56, 48);
            ctx.lineTo(8, 48);
            ctx.closePath();
            ctx.fill();

            // Outer crust / rind
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Swiss Cheese Holes
            const holes = [
                { x: 22, y: 22, r: 4 },
                { x: 42, y: 26, r: 5 },
                { x: 30, y: 42, r: 6 },
                { x: 18, y: 44, r: 3 },
                { x: 46, y: 44, r: 4 }
            ];
            holes.forEach(hole => {
                ctx.fillStyle = '#b45309';
                ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#78350f';
                ctx.beginPath(); ctx.arc(hole.x + 0.5, hole.y + 0.5, hole.r - 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fef08a';
                ctx.beginPath(); ctx.arc(hole.x + 1, hole.y + 1, Math.max(1, hole.r - 2.5), 0, Math.PI * 2); ctx.fill();
            });

            // Glowing Demonic Red Eyes
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(20, 24, 6, 6);
            ctx.fillRect(38, 24, 6, 6);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(22, 25, 2, 2);
            ctx.fillRect(40, 25, 2, 2);

            // Gaping Maw / Mouth with Sharp Teeth
            ctx.fillStyle = '#180a02';
            ctx.beginPath();
            ctx.ellipse(32, 36, 14, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Sharp White Teeth
            ctx.fillStyle = '#ffffff';
            // Top teeth
            ctx.fillRect(22, 30, 3, 4);
            ctx.fillRect(27, 30, 3, 5);
            ctx.fillRect(34, 30, 3, 5);
            ctx.fillRect(39, 30, 3, 4);
            // Bottom teeth
            ctx.fillRect(24, 38, 3, 4);
            ctx.fillRect(31, 38, 3, 5);
            ctx.fillRect(37, 38, 3, 4);

            // Waving Melted Cheese Claws / Arms
            ctx.fillStyle = '#f59e0b';
            // Left arm
            ctx.beginPath();
            ctx.moveTo(14, 32);
            ctx.lineTo(2, 24);
            ctx.lineTo(4, 38);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Right arm
            ctx.beginPath();
            ctx.moveTo(50, 32);
            ctx.lineTo(62, 24);
            ctx.lineTo(60, 38);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Cheese Drips at Bottom
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(16, 48, 6, 6);
            ctx.fillRect(28, 48, 8, 8);
            ctx.fillRect(42, 48, 6, 5);
        });
    }

    _drawRanger() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(32, 60, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

            // Boots
            ctx.fillStyle = '#451a03';
            ctx.fillRect(20, 50, 10, 10);
            ctx.fillRect(34, 50, 10, 10);
            ctx.fillStyle = '#1c0a00';
            ctx.fillRect(19, 58, 12, 3);
            ctx.fillRect(33, 58, 12, 3);

            // Khaki Pants
            ctx.fillStyle = '#a16207';
            ctx.fillRect(22, 38, 20, 14);
            ctx.fillStyle = '#78350f';
            ctx.fillRect(31, 40, 2, 12);

            // Ranger Green Shirt
            ctx.fillStyle = '#15803d';
            ctx.fillRect(18, 20, 28, 19);
            // Chest pockets & collar
            ctx.fillStyle = '#166534';
            ctx.fillRect(22, 24, 7, 7);
            ctx.fillRect(35, 24, 7, 7);
            // Gold Ranger Badge
            ctx.fillStyle = '#eab308';
            ctx.fillRect(24, 25, 3, 3);

            // Arms & Sleeves
            ctx.fillStyle = '#15803d';
            ctx.fillRect(14, 22, 5, 14);
            ctx.fillRect(45, 22, 5, 14);
            // Hands
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(13, 35, 6, 6);
            ctx.fillRect(45, 35, 6, 6);

            // Neck & Head
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(28, 17, 8, 4);
            ctx.fillRect(24, 8, 16, 12);
            // Eyes & Beard/Mouth
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(27, 12, 3, 3);
            ctx.fillRect(34, 12, 3, 3);
            ctx.fillStyle = '#78350f';
            ctx.fillRect(28, 17, 8, 2);

            // Ranger Campaign Hat (Wide Brim & Montana Peak)
            ctx.fillStyle = '#78350f';
            ctx.fillRect(14, 8, 36, 4); // Wide Brim
            ctx.fillStyle = '#92400e';
            ctx.fillRect(22, 1, 20, 8); // Crown
            ctx.fillStyle = '#1c0a00';
            ctx.fillRect(22, 7, 20, 2); // Hat band
        });
    }

    _drawStudent() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(32, 60, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

            // Red/White Sneakers
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(20, 52, 10, 8);
            ctx.fillRect(34, 52, 10, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(19, 57, 12, 3);
            ctx.fillRect(33, 57, 12, 3);

            // Blue Denim Jeans
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(22, 38, 20, 15);
            ctx.fillStyle = '#172554';
            ctx.fillRect(31, 40, 2, 13);

            // Royal Blue Hoodie / Jacket
            ctx.fillStyle = '#2563eb';
            ctx.fillRect(18, 20, 28, 19);
            // White hoodie strings & zipper
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(31, 20, 2, 19);
            ctx.fillRect(27, 22, 1, 6);
            ctx.fillRect(36, 22, 1, 6);

            // Backpack Straps
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(21, 20, 3, 18);
            ctx.fillRect(40, 20, 3, 18);

            // Arms & Sleeves
            ctx.fillStyle = '#2563eb';
            ctx.fillRect(14, 22, 5, 14);
            ctx.fillRect(45, 22, 5, 14);
            // Hands
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(13, 35, 6, 6);
            ctx.fillRect(45, 35, 6, 6);

            // Head & Face
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(24, 9, 16, 12);
            // Eyes
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(27, 13, 3, 3);
            ctx.fillRect(34, 13, 3, 3);
            ctx.fillStyle = '#f87171';
            ctx.fillRect(29, 18, 6, 1); // Smile

            // Brown Styled Hair
            ctx.fillStyle = '#451a03';
            ctx.fillRect(22, 4, 20, 7);
            ctx.fillRect(22, 8, 3, 6);
            ctx.fillRect(39, 8, 3, 6);
        });
    }

    _drawScientist() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(32, 60, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

            // Black dress shoes
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(20, 52, 10, 8);
            ctx.fillRect(34, 52, 10, 8);

            // Grey Slacks
            ctx.fillStyle = '#475569';
            ctx.fillRect(22, 42, 20, 11);
            ctx.fillStyle = '#334155';
            ctx.fillRect(31, 42, 2, 11);

            // Crisp White Lab Coat
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(18, 18, 28, 25);
            // Cyan Shirt & Red Tie under coat
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(28, 18, 8, 8);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(31, 20, 2, 10);
            // Pocket with pens
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(36, 26, 7, 7);
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(37, 24, 2, 3);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(40, 24, 2, 3);

            // Left Hand holding glowing green flask
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(14, 20, 5, 14); // Sleeve
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(13, 34, 5, 5);
            // Glass Flask
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillRect(9, 36, 6, 8);
            ctx.fillStyle = '#22c55e'; // Bubbling green acid
            ctx.fillRect(10, 39, 4, 4);

            // Right Arm
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(45, 20, 5, 14);
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(45, 34, 5, 5);

            // Head & Glasses
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(24, 8, 16, 11);
            // Thick black spectacles
            ctx.fillStyle = '#0f172a';
            ctx.strokeRect(26, 11, 5, 5);
            ctx.strokeRect(33, 11, 5, 5);
            ctx.fillRect(30, 13, 4, 1);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(27, 12, 3, 3);
            ctx.fillRect(34, 12, 3, 3);

            // Wild White/Grey Einstein Hair
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(20, 4, 24, 6);
            ctx.fillRect(18, 7, 5, 7);
            ctx.fillRect(41, 7, 5, 7);
        });
    }

    _drawAthlete() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(32, 60, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

            // Neon Yellow Running Shoes
            ctx.fillStyle = '#eab308';
            ctx.fillRect(20, 52, 10, 8);
            ctx.fillRect(34, 52, 10, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(20, 47, 10, 5); // White socks
            ctx.fillRect(34, 47, 10, 5);

            // Muscular bare legs & Athletic Shorts
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(22, 40, 7, 8);
            ctx.fillRect(35, 40, 7, 8);
            ctx.fillStyle = '#1e293b'; // Black shorts with white trim
            ctx.fillRect(20, 34, 24, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(20, 41, 24, 1);

            // Red Track Jersey #7
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(20, 18, 24, 17);
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('7', 29, 29);

            // Muscular Arms with Sweatbands
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(14, 20, 6, 14);
            ctx.fillRect(44, 20, 6, 14);
            ctx.fillStyle = '#ffffff'; // White wristbands
            ctx.fillRect(14, 30, 6, 3);
            ctx.fillRect(44, 30, 6, 3);

            // Head & Face
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(24, 8, 16, 11);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(27, 12, 3, 3);
            ctx.fillRect(34, 12, 3, 3);
            ctx.fillStyle = '#ffffff'; // White Sweatband
            ctx.fillRect(22, 6, 20, 4);
            ctx.fillStyle = '#451a03'; // Spiky black hair
            ctx.fillRect(24, 2, 16, 5);
        });
    }

    _drawRobot() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(32, 60, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

            // Robotic Heavy Feet
            ctx.fillStyle = '#475569';
            ctx.fillRect(18, 52, 12, 8);
            ctx.fillRect(34, 52, 12, 8);
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(20, 56, 8, 2);
            ctx.fillRect(36, 56, 8, 2);

            // Hydraulic Legs
            ctx.fillStyle = '#64748b';
            ctx.fillRect(22, 38, 8, 14);
            ctx.fillRect(34, 38, 8, 14);

            // Metallic Torso with Gauges
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(18, 18, 28, 21);
            ctx.fillStyle = '#475569';
            ctx.strokeRect(18, 18, 28, 21);

            // Chest screen with glowing power bar
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(22, 22, 20, 12);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(24, 25, 16, 3);
            ctx.fillStyle = '#eab308';
            ctx.fillRect(24, 29, 4, 3);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(30, 29, 4, 3);

            // Robotic Clamp Arms
            ctx.fillStyle = '#64748b';
            ctx.fillRect(12, 20, 6, 14);
            ctx.fillRect(46, 20, 6, 14);
            ctx.fillStyle = '#e2e8f0'; // Claws
            ctx.fillRect(10, 34, 8, 3);
            ctx.fillRect(10, 37, 2, 4);
            ctx.fillRect(16, 37, 2, 4);
            ctx.fillRect(46, 34, 8, 3);
            ctx.fillRect(46, 37, 2, 4);
            ctx.fillRect(52, 37, 2, 4);

            // Robotic Head & Visor
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(22, 8, 20, 11);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(24, 11, 16, 5);
            ctx.fillStyle = '#00ffcc'; // Glowing Cyan Visor
            ctx.fillRect(25, 12, 14, 3);

            // Antenna with Glowing Red Orb
            ctx.fillStyle = '#64748b';
            ctx.fillRect(31, 3, 2, 5);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(32, 3, 3, 0, Math.PI * 2); ctx.fill();
        });
    }

    _drawSuperhero() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(32, 60, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

            // Gold Boots
            ctx.fillStyle = '#eab308';
            ctx.fillRect(20, 50, 10, 10);
            ctx.fillRect(34, 50, 10, 10);

            // Purple Spandex Tights
            ctx.fillStyle = '#581c87';
            ctx.fillRect(22, 36, 20, 16);
            ctx.fillStyle = '#eab308'; // Gold Utility Belt
            ctx.fillRect(20, 34, 24, 4);

            // Gold Cape flowing behind
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.moveTo(18, 18); ctx.lineTo(10, 56); ctx.lineTo(54, 56); ctx.lineTo(46, 18);
            ctx.fill();

            // Purple Suit Torso
            ctx.fillStyle = '#6b21a8';
            ctx.fillRect(18, 18, 28, 18);
            // Chest Crest
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.moveTo(32, 22); ctx.lineTo(40, 27); ctx.lineTo(32, 32); ctx.lineTo(24, 27);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 6px monospace';
            ctx.fillText('TM', 29, 29);

            // Power Gauntlets
            ctx.fillStyle = '#6b21a8';
            ctx.fillRect(14, 20, 5, 12);
            ctx.fillRect(45, 20, 5, 12);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(13, 32, 6, 7);
            ctx.fillRect(45, 32, 6, 7);

            // Head, Mask & Face
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(24, 8, 16, 11);
            // Gold Domino Mask
            ctx.fillStyle = '#eab308';
            ctx.fillRect(22, 10, 20, 5);
            ctx.fillStyle = '#ffffff'; // White Eyes
            ctx.fillRect(26, 11, 4, 3);
            ctx.fillRect(34, 11, 4, 3);
            ctx.fillStyle = '#0f172a'; // Black Cowl/Hair
            ctx.fillRect(22, 4, 20, 6);
        });
    }

    _drawGDCube() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(32, 60, 22, 4, 0, 0, Math.PI * 2); ctx.fill();

            // Helper to draw regular octagon
            const drawOctagon = (cx, cy, r) => {
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI / 4) + (Math.PI / 8);
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
            };

            // Outer Black Rounded Square Border
            ctx.fillStyle = '#000000';
            ctx.fillRect(4, 4, 56, 56);

            // White Inner Background Square
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(8, 8, 48, 48);

            // 4 Green Triangular Corners
            ctx.fillStyle = '#00ff99';
            // Top-left
            ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(24, 8); ctx.lineTo(8, 24); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 3; ctx.stroke();
            // Top-right
            ctx.beginPath(); ctx.moveTo(56, 8); ctx.lineTo(40, 8); ctx.lineTo(56, 24); ctx.closePath(); ctx.fill();
            ctx.stroke();
            // Bottom-left
            ctx.beginPath(); ctx.moveTo(8, 56); ctx.lineTo(24, 56); ctx.lineTo(8, 40); ctx.closePath(); ctx.fill();
            ctx.stroke();
            // Bottom-right
            ctx.beginPath(); ctx.moveTo(56, 56); ctx.lineTo(40, 56); ctx.lineTo(56, 40); ctx.closePath(); ctx.fill();
            ctx.stroke();

            // Outer Black Octagon Outline
            ctx.fillStyle = '#000000';
            drawOctagon(32, 32, 23);
            ctx.fill();

            // Outer White Octagon Ring
            ctx.fillStyle = '#ffffff';
            drawOctagon(32, 32, 19);
            ctx.fill();

            // Middle Black Octagon Outline
            ctx.fillStyle = '#000000';
            drawOctagon(32, 32, 16);
            ctx.fill();

            // Middle Green Octagon Ring
            ctx.fillStyle = '#00ff99';
            drawOctagon(32, 32, 13);
            ctx.fill();

            // Inner Black Octagon Outline
            ctx.fillStyle = '#000000';
            drawOctagon(32, 32, 9);
            ctx.fill();

            // Inner White Octagon Center
            ctx.fillStyle = '#ffffff';
            drawOctagon(32, 32, 6);
            ctx.fill();
        });
    }

    _drawTrashMaster() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(32, 60, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

            // Heavy Work Boots
            ctx.fillStyle = '#451a03';
            ctx.fillRect(19, 50, 11, 10);
            ctx.fillRect(34, 50, 11, 10);
            ctx.fillStyle = '#1c0a00';
            ctx.fillRect(18, 57, 13, 3);
            ctx.fillRect(33, 57, 13, 3);

            // Blue Work Denim Overalls
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(21, 36, 22, 16);

            // High-Visibility Orange Safety Vest
            ctx.fillStyle = '#ea580c';
            ctx.fillRect(18, 18, 28, 19);
            // Silver Reflective Stripes
            ctx.fillStyle = '#facc15';
            ctx.fillRect(22, 18, 4, 19);
            ctx.fillRect(38, 18, 4, 19);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(18, 28, 28, 4);

            // Right hand holding metallic claw
            ctx.fillStyle = '#ea580c';
            ctx.fillRect(45, 20, 5, 12);
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(45, 32, 5, 5);
            // Metal claw shaft
            ctx.fillStyle = '#64748b';
            ctx.fillRect(47, 24, 2, 28);
            ctx.fillStyle = '#22c55e'; // Green claw
            ctx.beginPath(); ctx.arc(48, 22, 4, 0, Math.PI * 2); ctx.fill();

            // Left hand holding black trash bag
            ctx.fillStyle = '#ea580c';
            ctx.fillRect(14, 20, 5, 12);
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(14, 32, 5, 5);
            ctx.fillStyle = '#0f172a'; // Full Trash Bag
            ctx.beginPath(); ctx.ellipse(10, 42, 7, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#facc15'; // Yellow tie
            ctx.fillRect(8, 32, 4, 3);

            // Head, Face & Green Ballcap
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(24, 8, 16, 11);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(27, 12, 3, 3);
            ctx.fillRect(34, 12, 3, 3);

            // Green Trash Master Cap with brim
            ctx.fillStyle = '#15803d';
            ctx.fillRect(22, 4, 20, 7);
            ctx.fillRect(16, 9, 14, 3); // Brim
            ctx.fillStyle = '#facc15';
            ctx.fillRect(28, 5, 8, 3); // Gold logo
        });
    }

    _drawCitizen() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(32, 60, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#1e293b';
            ctx.fillRect(20, 52, 10, 8);
            ctx.fillRect(34, 52, 10, 8);

            ctx.fillStyle = '#334155';
            ctx.fillRect(22, 38, 20, 15);

            ctx.fillStyle = '#0284c7';
            ctx.fillRect(18, 20, 28, 19);

            ctx.fillStyle = '#0284c7';
            ctx.fillRect(14, 22, 5, 14);
            ctx.fillRect(45, 22, 5, 14);
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(13, 35, 6, 6);
            ctx.fillRect(45, 35, 6, 6);

            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(24, 9, 16, 12);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(27, 13, 3, 3);
            ctx.fillRect(34, 13, 3, 3);

            ctx.fillStyle = '#172554';
            ctx.fillRect(22, 4, 20, 7);
        });
    }

    _drawPolice() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(32, 60, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(20, 52, 10, 8);
            ctx.fillRect(34, 52, 10, 8);

            ctx.fillStyle = '#1e293b';
            ctx.fillRect(22, 38, 20, 15);

            // Navy Police Uniform
            ctx.fillStyle = '#0f2b5c';
            ctx.fillRect(18, 18, 28, 21);
            // Gold Star Badge
            ctx.fillStyle = '#eab308';
            ctx.fillRect(23, 23, 5, 5);
            ctx.fillStyle = '#000';
            ctx.fillRect(20, 34, 24, 4); // Duty belt

            ctx.fillStyle = '#0f2b5c';
            ctx.fillRect(14, 20, 5, 14);
            ctx.fillRect(45, 20, 5, 14);
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(13, 34, 6, 6);
            ctx.fillRect(45, 34, 6, 6);

            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(24, 8, 16, 11);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(27, 12, 3, 3);
            ctx.fillRect(34, 12, 3, 3);

            // Police Peaked Hat
            ctx.fillStyle = '#0f2b5c';
            ctx.fillRect(20, 4, 24, 6);
            ctx.fillRect(16, 8, 32, 3); // Black visor
            ctx.fillStyle = '#eab308'; // Gold hat badge
            ctx.fillRect(30, 4, 4, 3);
        });
    }

    _drawPirate() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(32, 60, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

            // Cuffed pirate boots
            ctx.fillStyle = '#451a03';
            ctx.fillRect(19, 48, 11, 12);
            ctx.fillRect(34, 48, 11, 12);

            // Striped Sailor Pants
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(22, 36, 20, 14);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(22, 38, 20, 2);
            ctx.fillRect(22, 44, 20, 2);

            // Red Captain's Coat & Gold Buttons
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(18, 18, 28, 20);
            ctx.fillStyle = '#eab308';
            ctx.fillRect(30, 22, 4, 14);

            // Cutlass Sword on Hip
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(12, 30, 3, 18);
            ctx.fillStyle = '#eab308';
            ctx.fillRect(10, 28, 7, 3);

            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(24, 8, 16, 11);
            // Eyepatch
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(26, 11, 4, 4);
            ctx.fillRect(24, 10, 16, 1);
            ctx.fillRect(34, 12, 3, 3); // Good eye

            // Black Tricorn Hat with Skull
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.moveTo(12, 8); ctx.lineTo(32, 0); ctx.lineTo(52, 8); ctx.lineTo(44, 12); ctx.lineTo(20, 12);
            ctx.fill();
            ctx.fillStyle = '#ffffff'; // Jolly Roger skull
            ctx.fillRect(30, 5, 4, 4);
        });
    }

    // ============================================================
    // 🚚 2.5D SIDE PROFILE VEHICLE SPRITES (128 x 64)
    // ============================================================

    _drawTrashTruck() {
        return this._createCanvas(128, 64, (ctx, w, h) => {
            // Drop Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath(); ctx.ellipse(64, 58, 56, 5, 0, 0, Math.PI * 2); ctx.fill();

            // Main Green Garbage Hopper Body
            ctx.fillStyle = '#15803d';
            ctx.fillRect(32, 12, 86, 36);
            ctx.fillStyle = '#166534';
            ctx.fillRect(32, 12, 86, 4);
            ctx.strokeRect(32, 12, 86, 36);

            // Rear trash hopper opening & bags
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(104, 18, 16, 28);
            ctx.fillStyle = '#eab308'; // Trash bag
            ctx.beginPath(); ctx.arc(110, 28, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff'; // Paper waste
            ctx.fillRect(106, 32, 8, 6);

            // Yellow/Black Hazard Caution Stripes
            for (let x = 34; x < 116; x += 12) {
                ctx.fillStyle = '#eab308';
                ctx.beginPath();
                ctx.moveTo(x, 44); ctx.lineTo(x + 6, 44); ctx.lineTo(x + 2, 48); ctx.lineTo(x - 4, 48);
                ctx.fill();
            }

            // Hydraulic Arm on Side
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(60, 20, 6, 22);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath(); ctx.arc(63, 20, 5, 0, Math.PI * 2); ctx.fill();

            // Front Truck Cab (Green)
            ctx.fillStyle = '#16a34a';
            ctx.beginPath();
            ctx.moveTo(10, 48); ctx.lineTo(10, 32); ctx.lineTo(20, 20); ctx.lineTo(34, 20); ctx.lineTo(34, 48);
            ctx.fill();

            // Front Windshield & Side Window
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(14, 31); ctx.lineTo(21, 22); ctx.lineTo(31, 22); ctx.lineTo(31, 31);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillRect(18, 24, 8, 3); // Glare

            // Front Headlights & Bumper
            ctx.fillStyle = '#facc15'; // Glowing Headlight
            ctx.fillRect(8, 38, 4, 6);
            ctx.fillStyle = '#475569'; // Steel Bumper
            ctx.fillRect(6, 46, 12, 6);

            // Big Heavy Duty Wheels (Front & Tandem Rear)
            const wheelPositions = [22, 74, 98];
            wheelPositions.forEach(wx => {
                ctx.fillStyle = '#0f172a'; // Black Tire
                ctx.beginPath(); ctx.arc(wx, 50, 10, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#cbd5e1'; // Silver Rim
                ctx.beginPath(); ctx.arc(wx, 50, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#0f172a'; // Hub
                ctx.beginPath(); ctx.arc(wx, 50, 2, 0, Math.PI * 2); ctx.fill();
            });
        });
    }

    _drawCadillac() {
        return this._createCanvas(128, 64, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath(); ctx.ellipse(64, 56, 56, 5, 0, 0, Math.PI * 2); ctx.fill();

            // Gloss Black Luxury Car Body
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.moveTo(10, 48); ctx.lineTo(10, 36); ctx.lineTo(32, 34); ctx.lineTo(44, 22);
            ctx.lineTo(84, 22); ctx.lineTo(98, 34); ctx.lineTo(120, 36); ctx.lineTo(120, 48);
            ctx.fill();

            // Chrome Trim Line
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(10, 36, 110, 2);

            // Tinted Windows & Pillars
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.moveTo(46, 24); ctx.lineTo(60, 24); ctx.lineTo(60, 33); ctx.lineTo(36, 33);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(64, 24); ctx.lineTo(82, 24); ctx.lineTo(94, 33); ctx.lineTo(64, 33);
            ctx.fill();

            // Chrome Bumpers & Lights
            ctx.fillStyle = '#fde047'; // Headlight
            ctx.fillRect(8, 38, 4, 5);
            ctx.fillStyle = '#dc2626'; // Taillight
            ctx.fillRect(118, 38, 4, 5);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(6, 44, 8, 4);
            ctx.fillRect(116, 44, 8, 4);

            // Low Profile Spoke Wheels
            [28, 100].forEach(wx => {
                ctx.fillStyle = '#0f172a';
                ctx.beginPath(); ctx.arc(wx, 50, 9, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#f8fafc';
                ctx.beginPath(); ctx.arc(wx, 50, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#eab308';
                ctx.beginPath(); ctx.arc(wx, 50, 2, 0, Math.PI * 2); ctx.fill();
            });
        });
    }

    _drawSUV() {
        return this._createCanvas(128, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath(); ctx.ellipse(64, 56, 56, 5, 0, 0, Math.PI * 2); ctx.fill();

            // Chunky Black SUV Frame
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(12, 48); ctx.lineTo(12, 32); ctx.lineTo(34, 18); ctx.lineTo(104, 18);
            ctx.lineTo(116, 32); ctx.lineTo(116, 48);
            ctx.fill();

            // Roof Rack
            ctx.fillStyle = '#475569';
            ctx.fillRect(40, 15, 60, 3);

            // Privacy Tinted Windows
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(36, 21, 24, 11);
            ctx.fillRect(64, 21, 24, 11);
            ctx.fillRect(92, 21, 16, 11);

            // Lights
            ctx.fillStyle = '#fde047';
            ctx.fillRect(10, 34, 4, 6);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(114, 34, 4, 6);

            // Chunky 4x4 Wheels
            [30, 96].forEach(wx => {
                ctx.fillStyle = '#0f172a';
                ctx.beginPath(); ctx.arc(wx, 50, 10, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#94a3b8';
                ctx.beginPath(); ctx.arc(wx, 50, 5, 0, Math.PI * 2); ctx.fill();
            });
        });
    }

    _drawRedTruck() {
        return this._createCanvas(128, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath(); ctx.ellipse(64, 56, 56, 5, 0, 0, Math.PI * 2); ctx.fill();

            // Red Pickup Cab & Open Bed
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.moveTo(12, 48); ctx.lineTo(12, 34); ctx.lineTo(34, 22); ctx.lineTo(68, 22);
            ctx.lineTo(68, 34); ctx.lineTo(116, 34); ctx.lineTo(116, 48);
            ctx.fill();

            // Windshield
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(16, 32); ctx.lineTo(32, 24); ctx.lineTo(64, 24); ctx.lineTo(64, 32);
            ctx.fill();

            // Chrome Grille & Wheels
            ctx.fillStyle = '#fde047';
            ctx.fillRect(10, 36, 4, 6);

            [28, 98].forEach(wx => {
                ctx.fillStyle = '#0f172a';
                ctx.beginPath(); ctx.arc(wx, 50, 9, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath(); ctx.arc(wx, 50, 5, 0, Math.PI * 2); ctx.fill();
            });
        });
    }

    // ============================================================
    // 🗑️ 2.5D GROUND TRASH PICKUP SPRITES (64 x 64)
    // ============================================================

    _drawTrashPaper() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            // Pulsing Ground Glow / Shadow
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.beginPath(); ctx.ellipse(32, 50, 16, 5, 0, 0, Math.PI * 2); ctx.fill();

            // Crumpled Newspaper / Cardboard Sheets
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.moveTo(16, 42); ctx.lineTo(24, 20); ctx.lineTo(44, 24); ctx.lineTo(50, 46); ctx.lineTo(30, 50);
            ctx.fill();
            ctx.fillStyle = '#cbd5e1';
            ctx.stroke();

            // Newspaper Headline & Text Lines
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(24, 26, 16, 3);
            ctx.fillRect(22, 32, 22, 1);
            ctx.fillRect(22, 35, 20, 1);
            ctx.fillRect(22, 38, 23, 1);
            ctx.fillRect(22, 41, 18, 1);

            // Flying crumpled sheet
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(34, 16); ctx.lineTo(48, 12); ctx.lineTo(42, 26);
            ctx.fill();

            // Sparkle Particle
            ctx.fillStyle = '#facc15';
            ctx.fillRect(48, 14, 3, 3);
        });
    }

    _drawTrashSodaCan() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
            ctx.beginPath(); ctx.ellipse(32, 52, 16, 5, 0, 0, Math.PI * 2); ctx.fill();

            // Red Soda Can Body
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.roundRect(22, 18, 20, 32, 4);
            ctx.fill();

            // Silver Top & Bottom Rims
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath(); ctx.ellipse(32, 18, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(32, 50, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

            // Soda Can Pop Tab
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(30, 16, 4, 3);

            // White Wave Ribbon Logo
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(22, 30); ctx.quadraticCurveTo(32, 24, 42, 36); ctx.lineTo(42, 40); ctx.quadraticCurveTo(32, 28, 22, 34);
            ctx.fill();

            // Metallic Glare Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillRect(24, 20, 3, 28);

            // Sparkle Star
            ctx.fillStyle = '#facc15';
            ctx.fillRect(44, 18, 3, 3);
        });
    }

    _drawTrashBottle() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
            ctx.beginPath(); ctx.ellipse(32, 52, 16, 5, 0, 0, Math.PI * 2); ctx.fill();

            // Translucent Cyan Plastic Water Bottle
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.roundRect(24, 22, 16, 28, 3);
            ctx.fill();

            // Bottle Neck & Royal Blue Screw Cap
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(28, 16, 8, 6);
            ctx.fillStyle = '#1d4ed8'; // Blue Cap
            ctx.fillRect(27, 12, 10, 5);

            // White Product Label with waves
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(24, 30, 16, 10);
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(26, 34, 12, 2);

            // Transparent Water Slosh
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(26, 40, 12, 8);

            // White Glare streak
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillRect(25, 24, 2, 24);
        });
    }

    _drawTrashBanana() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
            ctx.beginPath(); ctx.ellipse(32, 50, 18, 5, 0, 0, Math.PI * 2); ctx.fill();

            // Curved Yellow Banana Peel (4 Splayed Peels)
            ctx.fillStyle = '#eab308';
            // Center Core
            ctx.fillRect(28, 32, 8, 12);
            // Left Peel
            ctx.beginPath();
            ctx.moveTo(28, 34); ctx.quadraticCurveTo(14, 36, 12, 48); ctx.lineTo(18, 48); ctx.quadraticCurveTo(24, 40, 30, 42);
            ctx.fill();
            // Right Peel
            ctx.beginPath();
            ctx.moveTo(36, 34); ctx.quadraticCurveTo(50, 36, 52, 48); ctx.lineTo(46, 48); ctx.quadraticCurveTo(40, 40, 34, 42);
            ctx.fill();
            // Top Stem & Brown Tips
            ctx.fillStyle = '#713f12';
            ctx.fillRect(30, 24, 4, 8);
            ctx.fillRect(10, 47, 4, 3);
            ctx.fillRect(50, 47, 4, 3);

            // Bright Yellow Highlights
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(18, 38, 6, 3);
            ctx.fillRect(40, 38, 6, 3);
        });
    }

    _drawTrashRadioactive() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            // Glowing Toxic Sludge Barrel
            ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
            ctx.beginPath(); ctx.ellipse(32, 54, 20, 6, 0, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#15803d';
            ctx.fillRect(20, 18, 24, 34);
            ctx.fillStyle = '#166534';
            ctx.fillRect(20, 28, 24, 3);
            ctx.fillRect(20, 40, 24, 3);

            // Radioactive Yellow Trefoil Symbol
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(32, 35, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(32, 35, 2, 0, Math.PI * 2); ctx.fill();

            // Dripping Neon Slime
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(22, 14, 6, 8);
            ctx.fillRect(38, 14, 4, 12);
        });
    }

    _drawTrashTire() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath(); ctx.ellipse(32, 52, 18, 6, 0, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(32, 34, 18, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#334155';
            ctx.beginPath(); ctx.arc(32, 34, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'transparent';
            ctx.clearRect(24, 26, 16, 16);
        });
    }

    _drawTreasure() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(234, 179, 8, 0.4)';
            ctx.beginPath(); ctx.ellipse(32, 54, 22, 6, 0, 0, Math.PI * 2); ctx.fill();

            // Wooden Chest
            ctx.fillStyle = '#78350f';
            ctx.fillRect(16, 26, 32, 24);
            ctx.fillStyle = '#eab308'; // Gold Bands & Lock
            ctx.fillRect(16, 26, 4, 24);
            ctx.fillRect(44, 26, 4, 24);
            ctx.fillRect(30, 32, 5, 7);

            // Sparkling Gold Coins Overflowing
            ctx.fillStyle = '#fde047';
            for (let i = 0; i < 20; i++) {
                const rx = 18 + Math.random() * 28;
                const ry = 18 + Math.random() * 10;
                ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI * 2); ctx.fill();
            }
        });
    }

    // ============================================================
    // 🌳 2.5D FLORA & PROPS
    // ============================================================

    _drawTree() {
        return this._createCanvas(64, 96, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath(); ctx.ellipse(32, 90, 20, 5, 0, 0, Math.PI * 2); ctx.fill();

            // Gnarled Tree Trunk
            ctx.fillStyle = '#5c3a21';
            ctx.fillRect(27, 44, 10, 48);
            ctx.fillStyle = '#3d2412';
            ctx.fillRect(32, 44, 5, 48);
            // Root flares
            ctx.beginPath();
            ctx.moveTo(27, 80); ctx.lineTo(18, 92); ctx.lineTo(27, 92);
            ctx.moveTo(37, 80); ctx.lineTo(46, 92); ctx.lineTo(37, 92);
            ctx.fill();

            // Lush Foliage Canopy (Layered Spheres)
            ctx.fillStyle = '#14532d';
            ctx.beginPath(); ctx.arc(32, 38, 26, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#16a34a';
            ctx.beginPath(); ctx.arc(26, 30, 20, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#22c55e';
            ctx.beginPath(); ctx.arc(36, 26, 16, 0, Math.PI * 2); ctx.fill();

            // Highlights
            ctx.fillStyle = '#86efac';
            ctx.fillRect(20, 18, 4, 4);
            ctx.fillRect(32, 14, 6, 4);
            ctx.fillRect(40, 22, 4, 4);
        });
    }

    _drawShroom() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(217, 70, 239, 0.35)';
            ctx.beginPath(); ctx.ellipse(32, 54, 14, 4, 0, 0, Math.PI * 2); ctx.fill();

            // Cream Stem
            ctx.fillStyle = '#fdf4ff';
            ctx.fillRect(28, 32, 8, 22);

            // Spotted Magenta Toadstool Cap
            ctx.fillStyle = '#c026d3';
            ctx.beginPath();
            ctx.arc(32, 32, 18, Math.PI, 0);
            ctx.fill();

            // White Polka Dots
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(24, 24, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(38, 22, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(32, 16, 3, 0, Math.PI * 2); ctx.fill();
        });
    }

    _drawFlower() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.ellipse(32, 54, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

            // Green Stem
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(30, 28, 4, 26);
            ctx.fillRect(24, 38, 6, 3); // Leaf

            // Bright Yellow/Pink Flower Petals
            ctx.fillStyle = '#ec4899';
            for (let i = 0; i < 5; i++) {
                const ang = (i * Math.PI * 2) / 5;
                const px = 32 + Math.cos(ang) * 8;
                const py = 24 + Math.sin(ang) * 8;
                ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(32, 24, 5, 0, Math.PI * 2); ctx.fill();
        });
    }

    _drawAnimal() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(32, 56, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

            // Cute 2.5D Raccoon
            ctx.fillStyle = '#64748b';
            ctx.beginPath(); ctx.ellipse(32, 42, 14, 12, 0, 0, Math.PI * 2); ctx.fill();

            // Head & Bandit Mask
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath(); ctx.arc(32, 24, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0f172a'; // Black Mask
            ctx.fillRect(22, 22, 20, 5);
            ctx.fillStyle = '#ffffff'; // White Eyes
            ctx.fillRect(24, 23, 3, 3);
            ctx.fillRect(37, 23, 3, 3);

            // Striped Tail
            ctx.fillStyle = '#64748b';
            ctx.fillRect(44, 38, 14, 6);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(48, 38, 4, 6);
            ctx.fillRect(56, 38, 2, 6);
        });
    }

    _drawThirdEye() {
        return this._createCanvas(64, 64, (ctx, w, h) => {
            // Radiant Aura
            ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
            ctx.beginPath(); ctx.arc(32, 32, 26, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
            ctx.beginPath(); ctx.arc(32, 32, 20, 0, Math.PI * 2); ctx.fill();

            // Eye Almond Shape
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath(); ctx.ellipse(32, 32, 22, 13, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.ellipse(32, 32, 20, 11, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath(); ctx.ellipse(32, 32, 18, 9, 0, 0, Math.PI * 2); ctx.fill();

            // Glowing Cyan Iris
            ctx.fillStyle = '#0284c7';
            ctx.beginPath(); ctx.arc(32, 32, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath(); ctx.arc(32, 32, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#a5f3fc';
            ctx.beginPath(); ctx.arc(32, 32, 4, 0, Math.PI * 2); ctx.fill();

            // Pupil slit
            ctx.fillStyle = '#090d16';
            ctx.fillRect(31, 27, 2, 10);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(30, 29, 2, 2);
        });
    }
}

window.Sprites3D = Sprites3D;
