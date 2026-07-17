// ============================================================
// npc.js — NPC characters & interaction system
// ============================================================

const NPC_NAMES = [
    'Tony', 'Paulie', 'Vinny', 'Silvio', 'Carmela', 'Adriana', 'Christopher', 'Vito', 
    'Clemenza', 'Tessio', 'Fredo', 'Sonny', 'Tom', 'Michael', 'Frank', 'Joe', 
    'Donnie', 'Lefty', 'Henry', 'Tommy', 'Jimmy', 'Nicky'
];

const NPC_DIALOGUES = [
    ["Hey there!", "Nice day for cleaning up!"],
    ["Watch out for trash piles!", "Keep the streets clean!"],
    ["I heard there's trash everywhere.", "Someone should do something!"],
    ["You're doing great work!", "The city looks better already!"],
    ["Be careful out there.", "Some shady characters around..."],
    ["Need any help?", "Just kidding, I'm busy!"],
    ["The mayor wants this place spotless!", "Better get moving!"],
    ["I saw trash behind the buildings.", "Good luck finding it all!"],
];

class NPC {
    constructor(tileX, tileY, spriteId, dialogueLines, name, isInformant = false) {
        this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
        this.y = tileY * TILE_SIZE + TILE_SIZE / 2;
        this.tileX = tileX;
        this.tileY = tileY;
        this.spriteId = spriteId;
        this.dialogueLines = dialogueLines;
        this.name = name;
        this.isInformant = isInformant;
        this.frenzyBuildingId = null;
        this.interacted = false;
        this.size = TILE_SIZE - 6;
        this.direction = 'down';
        this.animTimer = 0;
        this.shaken = false;
        this.isRedRivalOnly = false;
    }

    isPlayerNear(playerX, playerY) {
        const wrapped = typeof nearestWrap === 'function' ? nearestWrap(this.x, this.y, playerX, playerY) : {x: this.x, y: this.y};
        const dx = wrapped.x - playerX;
        const dy = wrapped.y - playerY;
        return Math.sqrt(dx * dx + dy * dy) < TILE_SIZE * 1.5;
    }

    interact() {
        this.interacted = true;
        return {
            lines: this.dialogueLines,
            isInformant: this.isInformant,
            buildingId: this.frenzyBuildingId,
            name: this.name,
            npcType: this.npcType,
            targetParkId: this.targetParkId
        };
    }

    render(ctx, camera, spriteManager) {
        const screen = camera.worldToScreen(this.x, this.y);
        const drawSize = this.size + 4;

        const img = spriteManager.getCharacterImage(this.spriteId);
        if (img && (img.complete || img instanceof HTMLCanvasElement)) {
            if (this.isRedRivalOnly) {
                let offscreen = NPC._tintCanvas;
                if (!offscreen) {
                    offscreen = document.createElement('canvas');
                    NPC._tintCanvas = offscreen;
                }
                offscreen.width = drawSize;
                offscreen.height = drawSize;
                const octx = offscreen.getContext('2d');
                octx.clearRect(0, 0, drawSize, drawSize);
                octx.drawImage(img, 0, 0, drawSize, drawSize);
                octx.save();
                octx.globalCompositeOperation = 'source-atop';
                octx.fillStyle = 'rgba(255, 0, 0, 0.6)';
                octx.fillRect(0, 0, drawSize, drawSize);
                octx.restore();
                ctx.drawImage(offscreen, screen.x - drawSize / 2, screen.y - drawSize / 2);
            } else {
                ctx.drawImage(img, screen.x - drawSize / 2, screen.y - drawSize / 2, drawSize, drawSize);
            }
        } else {
            // Fallback
            ctx.fillStyle = this.isRedRivalOnly ? '#ff3333' : '#4488cc';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw "!" indicator if not yet interacted
        if (!this.interacted) {
            this.animTimer++;
            const pulse = Math.sin(this.animTimer * 0.05) * 0.3 + 0.7;
            const bobY = Math.sin(this.animTimer * 0.08) * 3;

            ctx.save();
            // Glow
            ctx.fillStyle = this.isInformant
                ? `rgba(255,200,0,${pulse})`
                : `rgba(255,255,100,${pulse})`;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - drawSize / 2 - 20 + bobY, 8, 0, Math.PI * 2);
            ctx.fill();

            // Exclamation mark
            ctx.fillStyle = this.isInformant ? '#ff4400' : '#333';
            ctx.font = 'bold 14px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('!', screen.x, screen.y - drawSize / 2 - 20 + bobY);
            ctx.restore();
        }

        // NPC Name
        ctx.fillStyle = '#fff';
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.name + (this.isRedRivalOnly ? " (R)" : ""), screen.x, screen.y - drawSize / 2 - 6);

        if ((window.politicsMode || window.elPresidenteElection) && !this.shaken) {
            ctx.save();
            ctx.font = '12px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const bobY = Math.sin(Date.now() / 200) * 3;
            if (window.elPresidenteElection) {
                if (this.isRedRivalOnly) {
                    ctx.fillText('😡🔴', screen.x, screen.y - drawSize / 2 - 18 + bobY);
                } else {
                    ctx.fillText('😡', screen.x, screen.y - drawSize / 2 - 18 + bobY);
                }
            } else {
                if (this.isRedRivalOnly) {
                    ctx.fillText('🤝🔴', screen.x, screen.y - drawSize / 2 - 18 + bobY);
                } else {
                    ctx.fillText('🤝', screen.x, screen.y - drawSize / 2 - 18 + bobY);
                }
            }
            ctx.restore();
        }

        // "E to talk" prompt when player is near (set externally)
        if (this._showPrompt) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Press E', screen.x, screen.y + drawSize / 2 + 12);
        }
    }
}

class NPCManager {
    constructor() {
        this.npcs = [];
        this.activeDialogue = null; // { lines, lineIndex, timer }
    }

    spawnNPCs(gameMap, buildings, frenzyMode) {
        this.npcs = [];
        this.activeDialogue = null;

        // Find all sidewalk tiles
        const sidewalks = [];
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (gameMap.tiles[y][x] === TileType.SIDEWALK) {
                    sidewalks.push({ x, y });
                }
            }
        }

        // Shuffle sidewalks
        for (let i = sidewalks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sidewalks[i], sidewalks[j]] = [sidewalks[j], sidewalks[i]];
        }

        const maxPositions = (window.politicsMode || window.elPresidenteElection || window.builderMode || window.cultMode) ? 150 : 20;
        const positions = [];
        for (const pos of sidewalks) {
            let tooClose = false;
            for (const p of positions) {
                const minDist = (window.politicsMode || window.elPresidenteElection || window.builderMode || window.cultMode) ? 5 : 10;
                if (Math.hypot(pos.x - p.x, pos.y - p.y) < minDist) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) {
                positions.push(pos);
            }
            if (positions.length >= maxPositions) break;
        }

        const informantIndices = new Set();
        const flowerIndices = new Set();

        const numNPCsToSpawn = (window.politicsMode || window.elPresidenteElection || window.builderMode || window.cultMode) ? Math.min(60, positions.length) : Math.min(10, positions.length);

        if (frenzyMode && buildings && buildings.length >= 5) {
            // Pick 5 random NPCs to be informants
            while (informantIndices.size < Math.min(5, numNPCsToSpawn)) {
                informantIndices.add(Math.floor(Math.random() * numNPCsToSpawn));
            }
        }

        let numFlowerNPCs = 0;
        if (window.flowersMode) {
            numFlowerNPCs = 3;
            // Pick 3 random NPCs to be flower NPCs, ensuring they aren't informants
            let attempts = 0;
            while (flowerIndices.size < Math.min(numFlowerNPCs, numNPCsToSpawn - informantIndices.size) && attempts < 100) {
                const idx = Math.floor(Math.random() * numNPCsToSpawn);
                if (!informantIndices.has(idx)) {
                    flowerIndices.add(idx);
                }
                attempts++;
            }
        }

        let availableNames = [...NPC_NAMES];
        for (let i = availableNames.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableNames[i], availableNames[j]] = [availableNames[j], availableNames[i]];
        }

        for (let i = 0; i < numNPCsToSpawn; i++) {
            const pos = positions[i];
            const isInformant = informantIndices.has(i);
            const isFlower = flowerIndices.has(i);
            const npcName = availableNames[i % availableNames.length];

            let dialogue;
            let npcType = 'normal';
            let targetParkId = null;

            if (isInformant) {
                const bldg = buildings[Math.floor(Math.random() * buildings.length)];
                dialogue = [
                    `Psst! There's a ton of trash at building ${bldg.address}!`,
                    "The door is now open. Be careful of pirates!"
                ];
                const npc = new NPC(pos.x, pos.y, 'char_npc', dialogue, npcName, true);
                npc.frenzyBuildingId = bldg.id;
                this.npcs.push(npc);
                continue;
            } else if (isFlower) {
                npcType = 'flower';
                const parkNum = Math.floor(Math.random() * 6) + 1;
                targetParkId = `park_${parkNum}`;
                dialogue = [
                    `Hey! We need some help planting flowers in park ${parkNum}!`,
                    "I marked it on your minimap. Don't forget your fertilizer!"
                ];
                const npc = new NPC(pos.x, pos.y, 'char_npc', dialogue, npcName, false);
                npc.npcType = 'flower';
                npc.targetParkId = targetParkId;
                // Tint flower NPCs differently? We can rely on sprite tint if we want.
                this.npcs.push(npc);
                continue;
            } else {
                dialogue = NPC_DIALOGUES[i % NPC_DIALOGUES.length];
                const npc = new NPC(pos.x, pos.y, 'char_npc', dialogue, npcName, false);
                if ((window.politicsMode || window.elPresidenteElection) && Math.random() < 0.6) {
                    npc.isRedRivalOnly = true;
                }
                this.npcs.push(npc);
            }
        }
    }

    checkInteraction(playerX, playerY) {
        // Clear prompt from all NPCs
        for (const npc of this.npcs) {
            npc._showPrompt = false;
        }

        let nearest = null;
        let nearestDist = Infinity;

        const px = ((playerX % MAP_PIXEL_W) + MAP_PIXEL_W) % MAP_PIXEL_W;
        const py = ((playerY % MAP_PIXEL_H) + MAP_PIXEL_H) % MAP_PIXEL_H;

        for (const npc of this.npcs) {
            if (npc.isPlayerNear(playerX, playerY)) {
                const wrapped = typeof nearestWrap === 'function' ? nearestWrap(npc.x, npc.y, playerX, playerY) : {x: npc.x, y: npc.y};
                const dx = wrapped.x - playerX;
                const dy = wrapped.y - playerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = npc;
                }
            }
        }

        if (nearest) {
            nearest._showPrompt = true;
        }

        return nearest;
    }

    interactWithNearest(playerX, playerY) {
        const nearest = this.checkInteraction(playerX, playerY);
        if (nearest && !nearest.interacted) {
            const result = nearest.interact();
            this.activeDialogue = {
                lines: result.lines,
                lineIndex: 0,
                timer: 180, // ~3 seconds per line
                isInformant: result.isInformant,
                buildingId: result.buildingId,
                name: result.name
            };
            return result;
        }
        return null;
    }

    update() {
        // Update dialogue timer
        if (this.activeDialogue) {
            this.activeDialogue.timer--;
            if (this.activeDialogue.timer <= 0) {
                this.activeDialogue.lineIndex++;
                if (this.activeDialogue.lineIndex >= this.activeDialogue.lines.length) {
                    this.activeDialogue = null;
                } else {
                    this.activeDialogue.timer = 180;
                }
            }
        }
    }

    render(ctx, camera, spriteManager) {
        for (const npc of this.npcs) {
            const origX = npc.x;
            const origY = npc.y;
            const wrapped = typeof nearestWrap === 'function' ? nearestWrap(npc.x, npc.y, camera.getCenterX(), camera.getCenterY()) : {x: npc.x, y: npc.y};
            npc.x = wrapped.x;
            npc.y = wrapped.y;
            if (camera.isVisible(npc.x - npc.size, npc.y - npc.size, npc.size * 2, npc.size * 2)) {
                npc.render(ctx, camera, spriteManager);
            }
            npc.x = origX;
            npc.y = origY;
        }
    }

    renderDialogue(ctx, canvasWidth, canvasHeight) {
        if (!this.activeDialogue) return;

        const line = this.activeDialogue.lines[this.activeDialogue.lineIndex];
        const boxW = Math.min(canvasWidth - 40, 500);
        const boxH = 60;
        const boxX = (canvasWidth - boxW) / 2;
        const boxY = canvasHeight - boxH - 20;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();

        // Border
        ctx.strokeStyle = this.activeDialogue.isInformant ? '#ff8800' : '#4488cc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.stroke();

        // NPC Name
        ctx.fillStyle = '#f0d048';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.activeDialogue.name + ":", boxX + 15, boxY + 16);

        // Text
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Word wrap
        const words = line.split(' ');
        let lines = [];
        let currentLine = '';
        for (const word of words) {
            const test = currentLine ? currentLine + ' ' + word : word;
            if (ctx.measureText(test).width > boxW - 30) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = test;
            }
        }
        lines.push(currentLine);

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], canvasWidth / 2, boxY + 32 + i * 16);
        }
    }

    spawnSingleNPC(gameMap) {
        let tx = 0, ty = 0;
        for (let attempt = 0; attempt < 500; attempt++) {
            tx = Math.floor(Math.random() * MAP_WIDTH);
            ty = Math.floor(Math.random() * MAP_HEIGHT);
            if (gameMap.getTile(tx, ty) === TileType.SIDEWALK) {
                break;
            }
        }
        const nameList = [
            'Tony', 'Paulie', 'Vinny', 'Silvio', 'Carmela', 'Adriana', 'Christopher', 'Vito', 
            'Clemenza', 'Tessio', 'Fredo', 'Sonny', 'Tom', 'Michael', 'Frank', 'Joe', 
            'Donnie', 'Lefty', 'Henry', 'Tommy', 'Jimmy', 'Nicky', 'Bobby', 'Phil'
        ];
        const npcName = nameList[Math.floor(Math.random() * nameList.length)];
        const npc = new NPC(tx, ty, 'char_npc', ["Go Trash Party!", "Vote for the Council!"], npcName);
        if ((window.politicsMode || window.elPresidenteElection) && Math.random() < 0.6) {
            npc.isRedRivalOnly = true;
        }
        npc.shaken = false;
        this.npcs.push(npc);
        return npc;
    }

    // ── Lost Child Quest ──
    spawnChildQuest(gameMap, buildings) {
        this.childNPC = null;
        this.parentNPCs = [];
        this.childQuestBuilding = null;
        this.childDelivered = false;
        this.childFollowing = false;

        // Pick a target building (not bank, not police, not airport, not hospital)
        const eligible = buildings.filter(b => 
            b.type !== 'bank' && b.type !== 'police' && b.type !== 'airport' &&
            b.type !== 'hospital' && b.doorTiles.length > 0
        );
        if (eligible.length === 0) return;
        const targetBldg = eligible[Math.floor(Math.random() * eligible.length)];
        this.childQuestBuilding = targetBldg;

        // Spawn child on a random sidewalk tile far from building
        let childTX = 0, childTY = 0;
        for (let attempt = 0; attempt < 500; attempt++) {
            childTX = Math.floor(Math.random() * MAP_WIDTH);
            childTY = Math.floor(Math.random() * MAP_HEIGHT);
            if (gameMap.getTile(childTX, childTY) === TileType.SIDEWALK) {
                const doorTile = targetBldg.doorTiles[0];
                if (Math.hypot(childTX - doorTile.x, childTY - doorTile.y) > 15) break;
            }
        }
        const child = new NPC(childTX, childTY, 'char_npc', ["I am looking for my parents."], "Little Timmy", false);
        child.npcType = 'child';
        child.interacted = false;
        child._tintColor = 'rgba(255, 220, 80, 0.65)'; // golden tint
        this.childNPC = child;

        // Spawn parents near the target building door
        const door = targetBldg.doorTiles[0];
        const parent1 = new NPC(door.x + 1, door.y, 'char_npc', ["Thank you for bringing our child home!", "You've earned your reward!"], "Mother", false);
        parent1.npcType = 'parent';
        parent1.interacted = true; // don't show '!' until child is following
        const parent2 = new NPC(door.x, door.y + 1, 'char_npc', ["Our child is safe! Bless you!", "Take these followers as thanks!"], "Father", false);
        parent2.npcType = 'parent';
        parent2.interacted = true;
        this.parentNPCs = [parent1, parent2];
    }

    // ── Cult Families ──
    spawnCultFamilies(gameMap) {
        this.cultFamilies = [];
        const numFamilies = 4 + Math.floor(Math.random() * 3); // 4-6 families
        
        const sidewalks = [];
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (gameMap.tiles[y][x] === TileType.SIDEWALK) sidewalks.push({ x, y });
            }
        }

        for (let f = 0; f < numFamilies; f++) {
            if (sidewalks.length < 2) break;
            const pos = sidewalks.splice(Math.floor(Math.random() * sidewalks.length), 1)[0];
            const pos2 = sidewalks.splice(Math.floor(Math.random() * sidewalks.length), 1)[0];
            const familyId = f;
            
            const member1 = new NPC(pos.x, pos.y, 'char_npc', 
                ["We got separated from our family!", "Can you help us reunite?"], 
                `Family ${f+1} Mom`, false);
            member1.npcType = 'cult_family';
            member1.familyId = familyId;
            member1._tintColor = 'rgba(180, 80, 255, 0.55)'; // purple tint

            const member2 = new NPC(pos2.x, pos2.y, 'char_npc', 
                ["I'm looking for my family!", "They were right behind me..."], 
                `Family ${f+1} Dad`, false);
            member2.npcType = 'cult_family';
            member2.familyId = familyId;
            member2._tintColor = 'rgba(180, 80, 255, 0.55)';

            this.cultFamilies.push({ id: familyId, members: [member1, member2], reunited: false });
            this.npcs.push(member1);
            this.npcs.push(member2);
        }
    }

    updateChildFollow(playerX, playerY, gameMap) {
        if (!this.childNPC || !this.childFollowing || this.childDelivered) return;
        const child = this.childNPC;
        const px = wrapWorldX(playerX);
        const py = wrapWorldY(playerY);
        const dx = px - child.x;
        const dy = py - child.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > TILE_SIZE * 1.2) {
            const speed = 2.5;
            const nx = child.x + (dx / dist) * speed;
            const ny = child.y + (dy / dist) * speed;
            const nextTX = Math.floor(nx / TILE_SIZE);
            const nextTY = Math.floor(ny / TILE_SIZE);
            if (gameMap.isWalkable(nextTX, nextTY)) {
                child.x = nx;
                child.y = ny;
            }
        }
    }

    renderChildAndParents(ctx, camera, spriteManager) {
        if (!this.childNPC || this.childDelivered) return;
        const child = this.childNPC;
        const screen = camera.worldToScreen(child.x, child.y);
        const drawSize = child.size + 4;

        // Render child with golden tint
        if (!NPC._tintCanvas2) NPC._tintCanvas2 = document.createElement('canvas');
        const off = NPC._tintCanvas2;
        off.width = drawSize; off.height = drawSize;
        const octx = off.getContext('2d');
        const img = spriteManager.getCharacterImage(child.spriteId);
        octx.clearRect(0, 0, drawSize, drawSize);
        if (img && img.complete) octx.drawImage(img, 0, 0, drawSize, drawSize);
        octx.save();
        octx.globalCompositeOperation = 'source-atop';
        octx.fillStyle = child._tintColor || 'rgba(255,220,80,0.65)';
        octx.fillRect(0, 0, drawSize, drawSize);
        octx.restore();
        ctx.drawImage(off, screen.x - drawSize / 2, screen.y - drawSize / 2);

        // Child label
        ctx.fillStyle = '#ffd700';
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('👦 ' + child.name, screen.x, screen.y - drawSize / 2 - 6);

        // Show "Press E" if player near and not following
        if (!this.childFollowing && child._showPrompt) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Press E', screen.x, screen.y + drawSize / 2 + 12);
        }

        // Render parents
        for (const parent of this.parentNPCs) {
            if (!this.childFollowing) continue; // don't render parents until child is following
            const ps = camera.worldToScreen(parent.x, parent.y);
            const pDrawSize = parent.size + 4;
            if (img && img.complete) ctx.drawImage(img, ps.x - pDrawSize / 2, ps.y - pDrawSize / 2, pDrawSize, pDrawSize);
            ctx.fillStyle = '#ff88ff';
            ctx.font = '6px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('👨‍👩 ' + parent.name, ps.x, ps.y - pDrawSize / 2 - 6);
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillText('Press E', ps.x, ps.y + pDrawSize / 2 + 12);
        }
    }

    checkChildInteraction(playerX, playerY) {
        if (!this.childNPC || this.childDelivered) return null;
        if (this.childNPC.isPlayerNear(playerX, playerY)) {
            this.childNPC._showPrompt = true;
            return this.childNPC;
        }
        this.childNPC._showPrompt = false;
        return null;
    }

    checkParentInteraction(playerX, playerY) {
        if (!this.childFollowing || this.childDelivered || this.parentNPCs.length === 0) return null;
        for (const parent of this.parentNPCs) {
            if (parent.isPlayerNear(playerX, playerY)) return parent;
        }
        return null;
    }
}

