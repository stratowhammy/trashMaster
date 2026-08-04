// ============================================================
// minimap.js — Mini-map renderer (bottom-left corner)
// ============================================================

class MiniMap {
    constructor() {
        this.width = 192;
        this.height = 192;
        this.padding = 16;
        this.pixelPerTile = this.width / MAP_WIDTH;  // 3px per tile

        // Pre-render the static map background
        this.staticCanvas = document.createElement('canvas');
        this.staticCanvas.width = this.width;
        this.staticCanvas.height = this.height;
        this.staticDirty = true;
    }

    buildStatic(gameMap) {
        const ctx = this.staticCanvas.getContext('2d');
        const s = this.pixelPerTile;

        ctx.clearRect(0, 0, this.width, this.height);

        // Mini-map tile colors (simplified)
        const miniColors = {
            [TileType.ROAD]:          '#555',
            [TileType.SIDEWALK]:      '#998',
            [TileType.GRASS]:         '#4a8',
            [TileType.BUILDING]:      '#665',
            [TileType.BUILDING_DOOR]: '#885',
            [TileType.CROSSWALK]:     '#777',
            [TileType.PARK_PATH]:     '#ba9',
        };

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const tile = gameMap.tiles[y][x];
                let color = miniColors[tile] || '#333';

                if (window.pirateMode) {
                    if (tile === TileType.SIDEWALK) {
                        color = '#e6ca65'; // Sandy Beach Gold
                    } else if (tile === TileType.BUILDING || tile === TileType.BUILDING_DOOR) {
                        color = '#2a9d8f'; // Island Land Green
                    } else {
                        color = '#1b4965'; // Ocean Water Blue
                    }
                } else if (window.crimeMode) {
                    const bldg = gameMap.getBuildingAtTile(x, y);
                    if (bldg) {
                        if (bldg.type === 'bank') {
                            color = '#ffd700'; // Bank: Yellow
                        } else if (bldg.type === 'police') {
                            color = '#3388ff'; // Police Station: Blue
                        }
                    }
                }

                const bldg = gameMap.getBuildingAtTile(x, y);
                if (bldg) {
                    if (bldg.type === 'dump') {
                        color = '#8b5a2b'; // Dump: Brown
                    } else if (!window.pirateMode) {
                        if (bldg.type === 'fast_food') {
                            color = '#ffaa00'; // Fast Food: Orange
                        } else if (bldg.type === 'hospital') {
                            color = '#ffffff'; // Hospital: White
                        } else if (bldg.type === 'city_hall' || bldg.type === 'cityhall') {
                            color = '#00ffff'; // City Hall: Cyan
                        }
                    }
                }
                
                ctx.fillStyle = color;
                ctx.fillRect(x * s, y * s, s, s);
            }
        }

        // Draw prominent red cross for Hospital anytime it exists in the map
        const hospital = gameMap.buildings.find(b => b.type === 'hospital');
        if (hospital && hospital.tiles.length > 0) {
            let hx = 0, hy = 0;
            for (const t of hospital.tiles) { hx += t.x; hy += t.y; }
            hx /= hospital.tiles.length;
            hy /= hospital.tiles.length;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(hx * s - s, hy * s - 3 * s, 2 * s, 6 * s);
            ctx.fillRect(hx * s - 3 * s, hy * s - s, 6 * s, 2 * s);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(hx * s - 0.5 * s, hy * s - 0.5 * s, s, s);
        }

        this.staticDirty = false;
    }

    render(ctx, canvasWidth, canvasHeight, camera, player, followers, trashItems, gameMap) {
        const s = this.pixelPerTile;
        const mapX = this.padding;
        const mapY = canvasHeight - this.height - this.padding;

        // Background panel with glassmorphism
        ctx.save();

        // Outer glow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(10,15,25,0.75)';
        ctx.beginPath();
        ctx.roundRect(mapX - 4, mapY - 4, this.width + 8, this.height + 8, 8);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = 'rgba(100,200,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(mapX - 4, mapY - 4, this.width + 8, this.height + 8, 8);
        ctx.stroke();

        // Clip to mini-map area
        ctx.beginPath();
        ctx.roundRect(mapX, mapY, this.width, this.height, 4);
        ctx.clip();

        // Draw static map
        if (this.staticDirty && gameMap) {
            this.buildStatic(gameMap);
        }
        ctx.drawImage(this.staticCanvas, mapX, mapY);

        // Highlight open frenzy buildings
        if (gameMap && gameMap.openDoors) {
            const pulse = Math.sin(performance.now() / 150) * 0.4 + 0.6;
            ctx.fillStyle = `rgba(255, 68, 0, ${pulse})`;
            for (const bldgId of gameMap.openDoors) {
                const bldg = gameMap.buildings.find(b => b.id === bldgId);
                if (bldg) {
                    for (const tile of bldg.tiles) {
                        const tx = mapX + tile.x * s;
                        const ty = mapY + tile.y * s;
                        ctx.fillRect(tx, ty, s, s);
                    }
                }
            }
        }

        // Draw Flowers Mode Target Park Highlight
        if (window.flowersMode && window.targetParkId && gameMap && gameMap.parkBlocks) {
            const park = gameMap.parkBlocks.find(p => p.id === window.targetParkId);
            if (park) {
                const pulse = Math.sin(performance.now() / 150) * 0.4 + 0.6;
                ctx.fillStyle = `rgba(255, 105, 180, ${pulse})`; // Pulsing hot pink
                const px = mapX + park.x1 * s;
                const py = mapY + park.y1 * s;
                const pw = (park.x2 - park.x1 + 1) * s;
                const ph = (park.y2 - park.y1 + 1) * s;
                ctx.fillRect(px, py, pw, ph);
            }
        }

        // Draw Crime Mode Task Highlight
        if (window.crimeMode && window.game && window.game.crimeManager && window.game.crimeManager.activeTask) {
            const task = window.game.crimeManager.activeTask;
            const pulse = Math.sin(performance.now() / 100) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 0, 255, ${pulse})`; // flashing purple

            if (task.type === 'collect_gold' && task.targetBldgId !== undefined) {
                const bldg = gameMap.buildings.find(b => b.id === task.targetBldgId);
                if (bldg) {
                    for (const tile of bldg.tiles) {
                        ctx.fillRect(mapX + tile.x * s, mapY + tile.y * s, s, s);
                    }
                }
            } else if (task.type === 'rob_bank') {
                const bldg = gameMap.buildings[0]; // Bank
                if (bldg) {
                    for (const tile of bldg.tiles) {
                        ctx.fillRect(mapX + tile.x * s, mapY + tile.y * s, s, s);
                    }
                }
            } else if ((task.type === 'intimidate' || task.type === 'rob_npc') && task.targetNPCIndex !== undefined && window.game.npcManager) {
                const npcs = window.game.npcManager.npcs;
                if (npcs && npcs.length > 0) {
                    const npc = npcs[task.targetNPCIndex % npcs.length];
                    if (npc) {
                        const nx = mapX + (npc.x / MAP_PIXEL_W) * this.width;
                        const ny = mapY + (npc.y / MAP_PIXEL_H) * this.height;
                        ctx.beginPath();
                        ctx.arc(nx, ny, 6, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            } else if (task.type === 'illegal_dump' && task.targetParkId && gameMap.parkBlocks) {
                const park = gameMap.parkBlocks.find(p => p.id === task.targetParkId);
                if (park) {
                    const pulse = Math.sin(performance.now() / 150) * 0.4 + 0.6;
                    ctx.fillStyle = `rgba(255, 69, 0, ${pulse})`; // Pulsing orange-red
                    const px = mapX + park.x1 * s;
                    const py = mapY + park.y1 * s;
                    const pw = (park.x2 - park.x1 + 1) * s;
                    const ph = (park.y2 - park.y1 + 1) * s;
                    ctx.fillRect(px, py, pw, ph);
                }
            }
        }

        // Draw Pirate Mode Treasure Map Target Highlight (Flashing sequentially)
        if (window.pirateMode && window.game && window.game.pirateModeManager) {
            const pm = window.game.pirateModeManager;
            if (pm.playerStep < 8 && pm.playerLocations[pm.playerStep]) {
                const target = pm.playerLocations[pm.playerStep];
                // Rapid flashing pulse (200ms cycle)
                const pulse = Math.sin(performance.now() / 80) * 0.4 + 0.6;
                ctx.fillStyle = `rgba(255, 235, 0, ${pulse})`;

                // Highlight building tiles if target is a building
                let bldg = target.buildingObj;
                if (!bldg && gameMap && gameMap.buildings) {
                    bldg = gameMap.buildings.find(b => b.id === target.id) || gameMap.getBuildingAtTile(Math.floor(target.x / TILE_SIZE), Math.floor(target.y / TILE_SIZE));
                }

                if (bldg && bldg.tiles) {
                    for (const tile of bldg.tiles) {
                        ctx.fillRect(mapX + tile.x * s, mapY + tile.y * s, s, s);
                    }
                }

                // Draw pulsing location marker & ring
                const tx = mapX + (target.x / MAP_PIXEL_W) * this.width;
                const ty = mapY + (target.y / MAP_PIXEL_H) * this.height;

                ctx.strokeStyle = `rgba(255, 255, 0, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(tx, ty, 8 + Math.sin(performance.now() / 100) * 3, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
                ctx.beginPath();
                ctx.arc(tx, ty, 5, 0, Math.PI * 2);
                ctx.fill();

                // Step label badge on minimap
                ctx.fillStyle = '#ffea00';
                ctx.font = 'bold 8px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`ISLAND ${pm.playerStep + 1}`, tx, ty - 10);
            } else if (pm.treasureBuilding && !pm.treasureClaimed) {
                const target = pm.treasureBuilding;
                const pulse = Math.sin(performance.now() / 60) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;

                let bldg = target.buildingObj;
                if (!bldg && gameMap && gameMap.buildings) {
                    bldg = gameMap.buildings.find(b => b.id === target.id);
                }
                if (bldg && bldg.tiles) {
                    for (const tile of bldg.tiles) {
                        ctx.fillRect(mapX + tile.x * s, mapY + tile.y * s, s, s);
                    }
                }
                const tx = mapX + (target.x / MAP_PIXEL_W) * this.width;
                const ty = mapY + (target.y / MAP_PIXEL_H) * this.height;
                ctx.fillRect(tx - 5, ty - 5, 10, 10);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 8px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('🪙', tx, ty - 8);
            }

            // Draw Rival Pirate Ship position (Prominent skull & glowing marker)
            if (pm.rivalShip && pm.rivalShip.alive) {
                const rx = mapX + (pm.rivalShip.x / MAP_PIXEL_W) * this.width;
                const ry = mapY + (pm.rivalShip.y / MAP_PIXEL_H) * this.height;

                const rPulse = Math.sin(performance.now() / 90) * 0.4 + 0.6;

                // Glowing red outer ring
                ctx.strokeStyle = `rgba(255, 30, 30, ${rPulse})`;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(rx, ry, 9, 0, Math.PI * 2);
                ctx.stroke();

                // Solid red center dot
                ctx.fillStyle = '#ff1111';
                ctx.beginPath();
                ctx.arc(rx, ry, 5, 0, Math.PI * 2);
                ctx.fill();

                // Skull flag badge on minimap
                ctx.fillStyle = '#ff3333';
                ctx.font = 'bold 8px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('🏴‍☠️ RIVALS', rx, ry - 11);
            }

            // Draw individual NPC Pirate Crew members on minimap
            if (pm.npcCrew && pm.npcCrew.members) {
                for (const member of pm.npcCrew.members) {
                    if (!member.alive) continue;
                    const mx = mapX + (member.x / MAP_PIXEL_W) * this.width;
                    const my = mapY + (member.y / MAP_PIXEL_H) * this.height;

                    const mPulse = member.stunTimer > 0 ? 0.4 : (Math.sin(performance.now() / 120 + member.index) * 0.3 + 0.7);

                    // Small red dot per crew member
                    ctx.fillStyle = member.stunTimer > 0 ? `rgba(255, 120, 0, ${mPulse})` : `rgba(220, 38, 38, ${mPulse})`;
                    ctx.beginPath();
                    ctx.arc(mx, my, 4, 0, Math.PI * 2);
                    ctx.fill();

                    // Tiny pirate hat marker
                    ctx.fillStyle = '#ff2222';
                    ctx.font = '7px serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('☠', mx, my - 6);
                }
            }
        }

        // Draw trash as tiny dots
        if (trashItems) {
            ctx.fillStyle = '#ff6';
            for (const item of trashItems) {
                if (item.collected) continue;
                const tx = mapX + item.tileX * s;
                const ty = mapY + item.tileY * s;
                ctx.fillRect(tx, ty, 1.5, 1.5);
            }
        }
        
        // Draw airplane icon for airport if international travel unlocked
        if (window.playerUnlockedInternational && gameMap && gameMap.buildings) {
            const airportBldg = gameMap.buildings.find(b => b.type === 'airport');
            if (airportBldg && airportBldg.doorTiles && airportBldg.doorTiles.length > 0 && window.game && window.game.spriteManager) {
                const door = airportBldg.doorTiles[0];
                const cx = mapX + door.x * s;
                const cy = mapY + door.y * s;
                const airplaneImg = window.game.spriteManager.getImage('airplane_icon');
                if (airplaneImg) {
                    ctx.drawImage(airplaneImg, cx - 8, cy - 8, 16, 16);
                }
            }
        }
        
        // Draw Hospital label anytime hospital exists in map
        if (gameMap && gameMap.buildings) {
            const hosp = gameMap.buildings.find(b => b.type === 'hospital');
            if (hosp && hosp.tiles.length > 0) {
                let hx = 0, hy = 0;
                for (const t of hosp.tiles) { hx += t.x; hy += t.y; }
                hx /= hosp.tiles.length;
                hy /= hosp.tiles.length;
                const cx = mapX + hx * s;
                const cy = mapY + hy * s;
                ctx.fillStyle = '#ff3355';
                ctx.font = 'bold 9px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('HOSPITAL', cx, cy - 6);
            }
        }
        // Draw Dump square marker on minimap in all modes
        if (gameMap && gameMap.buildings) {
            const dumpBldg = gameMap.buildings.find(b => b.type === 'dump');
            if (dumpBldg) {
                const dx = mapX + (dumpBldg.x / MAP_PIXEL_W) * this.width;
                const dy = mapY + (dumpBldg.y / MAP_PIXEL_H) * this.height;
                ctx.fillStyle = '#00ff88';
                ctx.strokeStyle = '#006633';
                ctx.lineWidth = 1.5;
                ctx.fillRect(dx - 4, dy - 4, 8, 8);
                ctx.strokeRect(dx - 4, dy - 4, 8, 8);
                ctx.fillStyle = '#ffffff';
                ctx.font = '7px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('🗑️ DUMP', dx, dy - 6);
            }

            const pulpBldg = gameMap.buildings.find(b => b.type === 'pulp_mill');
            if (pulpBldg) {
                const px = mapX + (pulpBldg.x / MAP_PIXEL_W) * this.width;
                const py = mapY + (pulpBldg.y / MAP_PIXEL_H) * this.height;
                ctx.fillStyle = '#8b5a2b';
                ctx.strokeStyle = '#5c4033';
                ctx.lineWidth = 1.5;
                ctx.fillRect(px - 4, py - 4, 8, 8);
                ctx.strokeRect(px - 4, py - 4, 8, 8);
                ctx.fillStyle = '#ffffff';
                ctx.font = '7px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('🪵 PULP', px, py - 6);
            }

            const bmBldg = gameMap.buildings.find(b => b.type === 'black_market');
            if (bmBldg) {
                const bx = mapX + (bmBldg.x / MAP_PIXEL_W) * this.width;
                const by = mapY + (bmBldg.y / MAP_PIXEL_H) * this.height;
                ctx.fillStyle = '#ff0055';
                ctx.strokeStyle = '#550011';
                ctx.lineWidth = 1.5;
                ctx.fillRect(bx - 4, by - 4, 8, 8);
                ctx.strokeRect(bx - 4, by - 4, 8, 8);
                ctx.fillStyle = '#ffffff';
                ctx.font = '7px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('☠️ B.MARKET', bx, by - 6);
            }
        }

        // Draw viewport rectangle (use wrapped coordinates)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        const wrappedCamX = ((camera.x % MAP_PIXEL_W) + MAP_PIXEL_W) % MAP_PIXEL_W;
        const wrappedCamY = ((camera.y % MAP_PIXEL_H) + MAP_PIXEL_H) % MAP_PIXEL_H;
        const vx = mapX + (wrappedCamX / MAP_PIXEL_W) * this.width;
        const vy = mapY + (wrappedCamY / MAP_PIXEL_H) * this.height;
        const vw = (camera.width / MAP_PIXEL_W) * this.width;
        const vh = (camera.height / MAP_PIXEL_H) * this.height;
        ctx.strokeRect(vx, vy, vw, vh);

        // Draw NPCs as small cyan dots
        if (window.game && window.game.npcManager && window.game.npcManager.npcs) {
            ctx.fillStyle = '#00ffff';
            for (const npc of window.game.npcManager.npcs) {
                if (npc.npcType !== 'flower') {
                    const nx = mapX + (npc.x / MAP_PIXEL_W) * this.width;
                    const ny = mapY + (npc.y / MAP_PIXEL_H) * this.height;
                    ctx.beginPath();
                    ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Draw followers as blue dots
        if (followers) {
            ctx.fillStyle = '#68f';
            for (const f of followers.followers) {
                const fx = mapX + (f.x / MAP_PIXEL_W) * this.width;
                const fy = mapY + (f.y / MAP_PIXEL_H) * this.height;
                ctx.beginPath();
                ctx.arc(fx, fy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw police officers as bright blue dots on the minimap
        if (window.crimeMode && window.game && window.game.crimeManager && window.game.crimeManager.police) {
            ctx.fillStyle = '#0055ff';
            for (const cop of window.game.crimeManager.police) {
                if (cop.alive) {
                    const cx = mapX + (cop.x / MAP_PIXEL_W) * this.width;
                    const cy = mapY + (cop.y / MAP_PIXEL_H) * this.height;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Draw mafia thugs as red dots on the minimap
        if (window.crimeMode && window.game && window.game.crimeManager && window.game.crimeManager.thugs) {
            ctx.fillStyle = '#ff2200';
            for (const thug of window.game.crimeManager.thugs) {
                if (thug.alive) {
                    const tx = mapX + (thug.x / MAP_PIXEL_W) * this.width;
                    const ty = mapY + (thug.y / MAP_PIXEL_H) * this.height;
                    ctx.beginPath();
                    ctx.arc(tx, ty, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Draw player as bright green dot (use wrapped coordinates for infinite map)
        const wrappedPx = player.getWrappedX ? player.getWrappedX() : player.x;
        const wrappedPy = player.getWrappedY ? player.getWrappedY() : player.y;
        const px = mapX + (wrappedPx / MAP_PIXEL_W) * this.width;
        const py = mapY + (wrappedPy / MAP_PIXEL_H) * this.height;

        // Pulsing glow
        const pulse = Math.sin(performance.now() / 300) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(0,255,136,${pulse})`;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f8';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Label
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = 'bold 9px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('MAP', mapX + 2, mapY - 8);
        ctx.fillStyle = '#8cf';
        ctx.fillText('MAP', mapX + 1.5, mapY - 8.5);
    }
}
