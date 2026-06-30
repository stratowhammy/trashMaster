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
    }

    isPlayerNear(playerX, playerY) {
        const px = ((playerX % MAP_PIXEL_W) + MAP_PIXEL_W) % MAP_PIXEL_W;
        const py = ((playerY % MAP_PIXEL_H) + MAP_PIXEL_H) % MAP_PIXEL_H;
        const dx = this.x - px;
        const dy = this.y - py;
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
            ctx.drawImage(img, screen.x - drawSize / 2, screen.y - drawSize / 2, drawSize, drawSize);
        } else {
            // Fallback
            ctx.fillStyle = '#4488cc';
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
        ctx.fillText(this.name, screen.x, screen.y - drawSize / 2 - 6);

        if (window.politicsMode && !this.shaken) {
            ctx.save();
            ctx.font = '12px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const bobY = Math.sin(Date.now() / 200) * 3;
            ctx.fillText('🤝', screen.x, screen.y - drawSize / 2 - 18 + bobY);
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

        const positions = [];
        for (const pos of sidewalks) {
            let tooClose = false;
            for (const p of positions) {
                if (Math.hypot(pos.x - p.x, pos.y - p.y) < 10) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) {
                positions.push(pos);
            }
            if (positions.length >= 20) break; // We need at most ~15 NPCs
        }

        const informantIndices = new Set();
        const flowerIndices = new Set();

        const numNPCsToSpawn = Math.min(10, positions.length);

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
            const npcName = availableNames.pop() || "Citizen";

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
                this.npcs.push(new NPC(pos.x, pos.y, 'char_npc', dialogue, npcName, false));
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

        for (const npc of this.npcs) {
            if (npc.isPlayerNear(playerX, playerY)) {
                const dx = npc.x - playerX;
                const dy = npc.y - playerY;
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
            if (camera.isVisible(npc.x - npc.size, npc.y - npc.size, npc.size * 2, npc.size * 2)) {
                npc.render(ctx, camera, spriteManager);
            }
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
        const npc = new NPC(tx, ty, 'char1', ["Go Trash Party!", "Vote for the Council!"], npcName);
        npc.shaken = false;
        this.npcs.push(npc);
        return npc;
    }
}
