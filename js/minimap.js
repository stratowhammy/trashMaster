// ============================================================
// minimap.js — Mini-map renderer (centered 64x64 viewport)
// ============================================================

class MiniMap {
    constructor() {
        this.width = 192;
        this.height = 192;
        this.padding = 16;
        this.viewGridSize = 64; // Show immediate 64x64 tiles surrounding player
        this.pixelPerTile = this.width / this.viewGridSize; // 3px per tile

        // Pre-render the full 128x128 map canvas at 3px/tile
        this.staticCanvas = document.createElement('canvas');
        this.staticCanvas.width = MAP_WIDTH * this.pixelPerTile; // 384px
        this.staticCanvas.height = MAP_HEIGHT * this.pixelPerTile; // 384px
        this.staticDirty = true;
    }

    buildStatic(gameMap) {
        if (!gameMap || !gameMap.tiles) return;
        const ctx = this.staticCanvas.getContext('2d');
        const s = this.pixelPerTile;

        ctx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

        // Mini-map tile colors
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

                if (window.pirateMode || (gameMap && gameMap.islandTiles && gameMap.islandTiles.has(`${x},${y}`))) {
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
                        if (['fast_food', 'goose', 'zippy_ds', 'chinos_steaks', 'rats_steaks'].includes(bldg.type)) {
                            color = bldg.type === 'chinos_steaks' ? '#ff4444' : bldg.type === 'rats_steaks' ? '#33aaff' : bldg.type === 'zippy_ds' ? '#ffcc00' : '#ffaa00'; // Fast Food: Colored
                        } else if (bldg.type === 'hospital') {
                            color = '#ffffff'; // Hospital: White
                        } else if (bldg.type === 'city_hall' || bldg.type === 'cityhall') {
                            color = '#00ffff'; // City Hall: Cyan
                        }
                    }
                    if (bldg.customColors && bldg.customColors.roof) {
                        color = bldg.customColors.roof;
                    }
                }
                
                ctx.fillStyle = color;
                ctx.fillRect(x * s, y * s, s, s);
            }
        }

        // Draw hospital cross if present
        const hospital = gameMap.buildings ? gameMap.buildings.find(b => b.type === 'hospital') : null;
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
        if (!player) return;
        const s = this.pixelPerTile;
        const mapX = this.padding;
        const mapY = canvasHeight - this.height - this.padding;
        const halfSize = this.viewGridSize / 2; // 32

        const playerPx = player.getWrappedX ? player.getWrappedX() : player.x;
        const playerPy = player.getWrappedY ? player.getWrappedY() : player.y;
        const ptx = Math.floor(playerPx / TILE_SIZE);
        const pty = Math.floor(playerPy / TILE_SIZE);

        const getMinimapPos = (wx, wy) => {
            const wrapped = nearestWrap(wx, wy, playerPx, playerPy);
            const dxTile = (wrapped.x - playerPx) / TILE_SIZE;
            const dyTile = (wrapped.y - playerPy) / TILE_SIZE;
            return {
                x: mapX + this.width / 2 + dxTile * s,
                y: mapY + this.height / 2 + dyTile * s,
                visible: Math.abs(dxTile) <= halfSize && Math.abs(dyTile) <= halfSize
            };
        };

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

        // Draw static map tiles in 64x64 view centered on player
        if (this.staticDirty && gameMap) {
            this.buildStatic(gameMap);
        }

        const startTileX = ptx - halfSize;
        const startTileY = pty - halfSize;

        const stx = wrapTileX(startTileX);
        const sty = wrapTileY(startTileY);

        const tilesRight = Math.min(this.viewGridSize, MAP_WIDTH - stx);
        const tilesLeft = this.viewGridSize - tilesRight;

        const tilesDown = Math.min(this.viewGridSize, MAP_HEIGHT - sty);
        const tilesUp = this.viewGridSize - tilesDown;

        const w1 = tilesRight * s;
        const w2 = tilesLeft * s;
        const h1 = tilesDown * s;
        const h2 = tilesUp * s;

        // Draw pre-rendered static map using at most 4 sub-rectangle draw calls
        ctx.drawImage(this.staticCanvas, stx * s, sty * s, w1, h1, mapX, mapY, w1, h1);
        if (w2 > 0) {
            ctx.drawImage(this.staticCanvas, 0, sty * s, w2, h1, mapX + w1, mapY, w2, h1);
        }
        if (h2 > 0) {
            ctx.drawImage(this.staticCanvas, stx * s, 0, w1, h2, mapX, mapY + h1, w1, h2);
        }
        if (w2 > 0 && h2 > 0) {
            ctx.drawImage(this.staticCanvas, 0, 0, w2, h2, mapX + w1, mapY + h1, w2, h2);
        }

        // Highlight open frenzy buildings
        if (gameMap && gameMap.openDoors) {
            const pulse = Math.sin(performance.now() / 150) * 0.4 + 0.6;
            ctx.fillStyle = `rgba(255, 68, 0, ${pulse})`;
            for (const bldgId of gameMap.openDoors) {
                const bldg = gameMap.buildings.find(b => b.id === bldgId);
                if (bldg) {
                    for (const tile of bldg.tiles) {
                        const pos = getMinimapPos(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
                        if (pos.visible) ctx.fillRect(pos.x, pos.y, s, s);
                    }
                }
            }
        }

        // Draw Flowers Mode Target Park Highlight
        if (window.flowersMode && window.targetParkId && gameMap && gameMap.parkBlocks) {
            const park = gameMap.parkBlocks.find(p => p.id === window.targetParkId);
            if (park) {
                const pulse = Math.sin(performance.now() / 150) * 0.4 + 0.6;
                ctx.fillStyle = `rgba(255, 105, 180, ${pulse})`;
                const pos = getMinimapPos(park.x1 * TILE_SIZE, park.y1 * TILE_SIZE);
                if (pos.visible) {
                    const pw = (park.x2 - park.x1 + 1) * s;
                    const ph = (park.y2 - park.y1 + 1) * s;
                    ctx.fillRect(pos.x, pos.y, pw, ph);
                }
            }
        }

        // Draw Crime Mode Task Highlight
        if (window.crimeMode && window.game && window.game.crimeManager && window.game.crimeManager.activeTask) {
            const task = window.game.crimeManager.activeTask;
            const pulse = Math.sin(performance.now() / 100) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 0, 255, ${pulse})`;

            if (task.type === 'collect_gold' && task.targetBldgId !== undefined) {
                const bldg = gameMap.buildings.find(b => b.id === task.targetBldgId);
                if (bldg) {
                    for (const tile of bldg.tiles) {
                        const pos = getMinimapPos(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
                        if (pos.visible) ctx.fillRect(pos.x, pos.y, s, s);
                    }
                }
            } else if (task.type === 'rob_bank') {
                const bldg = gameMap.buildings[0];
                if (bldg) {
                    for (const tile of bldg.tiles) {
                        const pos = getMinimapPos(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
                        if (pos.visible) ctx.fillRect(pos.x, pos.y, s, s);
                    }
                }
            } else if ((task.type === 'intimidate' || task.type === 'rob_npc') && task.targetNPCIndex !== undefined && window.game.npcManager) {
                const npcs = window.game.npcManager.npcs;
                if (npcs && npcs.length > 0) {
                    const npc = npcs[task.targetNPCIndex % npcs.length];
                    if (npc) {
                        const pos = getMinimapPos(npc.x, npc.y);
                        if (pos.visible) {
                            ctx.beginPath();
                            ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            } else if (task.type === 'illegal_dump' && task.targetParkId && gameMap.parkBlocks) {
                const park = gameMap.parkBlocks.find(p => p.id === task.targetParkId);
                if (park) {
                    const pulse = Math.sin(performance.now() / 150) * 0.4 + 0.6;
                    ctx.fillStyle = `rgba(255, 69, 0, ${pulse})`;
                    const pos = getMinimapPos(park.x1 * TILE_SIZE, park.y1 * TILE_SIZE);
                    if (pos.visible) {
                        const pw = (park.x2 - park.x1 + 1) * s;
                        const ph = (park.y2 - park.y1 + 1) * s;
                        ctx.fillRect(pos.x, pos.y, pw, ph);
                    }
                }
            }
        }

        // Draw trash items
        if (trashItems) {
            ctx.fillStyle = '#ff6';
            for (const item of trashItems) {
                if (item.collected) continue;
                const pos = getMinimapPos(item.x || (item.tileX * TILE_SIZE + 32), item.y || (item.tileY * TILE_SIZE + 32));
                if (pos.visible) {
                    ctx.fillRect(pos.x, pos.y, 2, 2);
                }
            }
        }

        // Draw GD Cube Speed Changers on minimap if playing as GD Cube
        const isNpestaCube = player && (player.spriteId === 'char7' || player.characterClass === 'char7');
        if (isNpestaCube && gameMap && gameMap.speedChangers) {
            const mmColors = {
                yellow: '#ffcc00',
                green: '#00ff44',
                pink: '#ff44ff',
                red: '#ff2222'
            };
            for (const ch of gameMap.speedChangers) {
                const pos = getMinimapPos(ch.x, ch.y);
                if (pos.visible) {
                    ctx.fillStyle = mmColors[ch.type] || '#ffffff';
                    ctx.fillRect(pos.x - 2, pos.y - 2, 4, 4);
                }
            }
        }

        // Draw GD Spikes on minimap if playing as GD Cube
        if (isNpestaCube && gameMap && gameMap.spikes) {
            for (const cluster of gameMap.spikes) {
                const pos = getMinimapPos(cluster.centerX, cluster.centerY);
                if (pos.visible) {
                    ctx.fillStyle = cluster.count === 4 ? '#ff0055' : (cluster.count === 3 ? '#ffaa00' : '#ffffff');
                    ctx.fillRect(pos.x - (cluster.count >= 3 ? 2 : 1), pos.y - 1, cluster.count >= 3 ? 4 : 3, 3);
                }
            }
        }

        // Draw Dump, Black Market, Library, Landmarks
        if (gameMap && gameMap.buildings) {
            for (const bldg of gameMap.buildings) {
                if (['dump', 'pulp_mill', 'black_market', 'hospital', 'library'].includes(bldg.type)) {
                    const pos = getMinimapPos(bldg.x + bldg.width / 2, bldg.y + bldg.height / 2);
                    if (pos.visible) {
                        ctx.fillStyle = bldg.type === 'dump' ? '#00ff88' : bldg.type === 'pulp_mill' ? '#8b5a2b' : bldg.type === 'black_market' ? '#ff0055' : bldg.type === 'library' ? '#60a5fa' : '#ff3355';
                        ctx.fillRect(pos.x - 3, pos.y - 3, 6, 6);
                    }
                }
            }
        }

        // Third Eye Cosmic Vision: Reveal all trash across the map on minimap
        if (window.playerThirdEye || (window.game && window.game.playerHasThirdEye)) {
            const items = Array.isArray(trashItems) ? trashItems : (trashItems && trashItems.trash ? trashItems.trash : (window.game && window.game.trashManager ? window.game.trashManager.trash : []));
            if (items && items.length > 0) {
                ctx.fillStyle = '#38bdf8';
                for (const item of items) {
                    if (item && item.x !== undefined && item.y !== undefined) {
                        const pos = getMinimapPos(item.x, item.y);
                        if (pos.visible) {
                            ctx.fillRect(pos.x - 1, pos.y - 1, 3, 3);
                        }
                    }
                }
            }
        }

        // Draw NPCs
        if (window.game && window.game.npcManager && window.game.npcManager.npcs) {
            ctx.fillStyle = '#00ffff';
            for (const npc of window.game.npcManager.npcs) {
                if (npc.npcType !== 'flower') {
                    const pos = getMinimapPos(npc.x, npc.y);
                    if (pos.visible) {
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // Draw followers
        if (followers && followers.followers) {
            ctx.fillStyle = '#68f';
            for (const f of followers.followers) {
                const pos = getMinimapPos(f.x, f.y);
                if (pos.visible) {
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Draw police officers
        if (window.crimeMode && window.game && window.game.crimeManager && window.game.crimeManager.police) {
            ctx.fillStyle = '#0055ff';
            for (const cop of window.game.crimeManager.police) {
                if (cop.alive) {
                    const pos = getMinimapPos(cop.x, cop.y);
                    if (pos.visible) {
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // Draw mafia thugs
        if (window.crimeMode && window.game && window.game.crimeManager && window.game.crimeManager.thugs) {
            ctx.fillStyle = '#ff2200';
            for (const thug of window.game.crimeManager.thugs) {
                if (thug.alive) {
                    const pos = getMinimapPos(thug.x, thug.y);
                    if (pos.visible) {
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // Draw camera viewport bounds relative to player center
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        const camCenterX = camera.x + camera.width / 2;
        const camCenterY = camera.y + camera.height / 2;
        const camPos = getMinimapPos(camCenterX, camCenterY);
        const vw = (camera.width / TILE_SIZE) * s;
        const vh = (camera.height / TILE_SIZE) * s;
        ctx.strokeRect(camPos.x - vw / 2, camPos.y - vh / 2, vw, vh);

        // Player marker fixed in center of minimap
        const playerCenterX = mapX + this.width / 2;
        const playerCenterY = mapY + this.height / 2;
        const pulse = Math.sin(performance.now() / 300) * 0.3 + 0.7;

        ctx.fillStyle = `rgba(0,255,136,${pulse})`;
        ctx.beginPath();
        ctx.arc(playerCenterX, playerCenterY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f8';
        ctx.beginPath();
        ctx.arc(playerCenterX, playerCenterY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Label
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = 'bold 9px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('MINIMAP (64x64)', mapX + 2, mapY - 8);
        ctx.fillStyle = '#8cf';
        ctx.fillText('MINIMAP (64x64)', mapX + 1.5, mapY - 8.5);
    }
}
