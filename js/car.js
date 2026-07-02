// ============================================================
// car.js — Traffic on the street grid
// ============================================================

class Car {
    constructor(startX, startY, startDir, speed, color) {
        this.x = startX;
        this.y = startY;
        this.dir = startDir; // [dx, dy]
        this.color = color;
        this.speed = speed;
        this.width = 40;
        this.height = 40;
        this.active = true;
    }

    update(dt, gameMap) {
        if (!this.active) return;

        let nextX = this.x + this.dir[0] * this.speed * dt;
        let nextY = this.y + this.dir[1] * this.speed * dt;

        const mapWidthPx = MAP_WIDTH * TILE_SIZE;
        const mapHeightPx = MAP_HEIGHT * TILE_SIZE;
        nextX = (nextX + mapWidthPx) % mapWidthPx;
        nextY = (nextY + mapHeightPx) % mapHeightPx;

        if (gameMap) {
            const tx = Math.floor(nextX / TILE_SIZE);
            const ty = Math.floor(nextY / TILE_SIZE);
            const tile = gameMap.getTile(tx, ty);
            
            if (tile === TileType.ROAD_UP) this.dir = [0, -1];
            else if (tile === TileType.ROAD_DOWN) this.dir = [0, 1];
            else if (tile === TileType.ROAD_LEFT) this.dir = [-1, 0];
            else if (tile === TileType.ROAD_RIGHT) this.dir = [1, 0];
            else if (tile !== TileType.CROSSWALK && tile !== TileType.ROAD) {
                // Hit a non-road tile, turn around
                this.dir = [-this.dir[0], -this.dir[1]];
            }
        }
        
        this.x = nextX;
        this.y = nextY;
    }

    render(ctx, camera) {
        if (!this.active) return;
        const screen = camera.worldToScreen(this.x, this.y);
        if (!camera.isVisible(this.x - 20, this.y - 20, 40, 40)) return;

        ctx.save();
        ctx.translate(screen.x, screen.y);
        
        let angle = 0;
        if (this.dir[0] === 1) angle = Math.PI / 2;
        else if (this.dir[0] === -1) angle = -Math.PI / 2;
        else if (this.dir[1] === 1) angle = Math.PI;
        else if (this.dir[1] === -1) angle = 0;
        ctx.rotate(angle);

        ctx.fillStyle = this.color === 'green' ? '#22b14c' : '#ed1c24';
        ctx.beginPath();
        ctx.roundRect(-12, -20, 24, 40, 6);
        ctx.fill();
        
        ctx.fillStyle = '#aaddff';
        ctx.fillRect(-8, -11, 16, 5);
        ctx.restore();
    }
}

class CarManager {
    constructor() {
        this.cars = [];
    }

    spawnCars(gameMap) {
        this.cars = [];
        const colors = ['green', 'green', 'green', 'green', 'green', 'green', 'red', 'red', 'red', 'red', 'red', 'red'];
        
        const hRoads = [4, 5, 14, 15, 24, 25, 34, 35, 44, 45, 54, 55];
        const vRoads = [4, 5, 14, 15, 24, 25, 34, 35, 44, 45, 54, 55];
        
        for (let i = 0; i < colors.length; i++) {
            const speed = 80 + Math.random() * 60;
            let startX = 0;
            let startY = 0;
            let dir = [1, 0];
            
            if (Math.random() < 0.5) {
                // Horizontal spawn
                const ry = hRoads[Math.floor(Math.random() * hRoads.length)];
                startY = ry * TILE_SIZE + TILE_SIZE / 2;
                startX = Math.random() * (MAP_WIDTH * TILE_SIZE);
                dir = (ry % 2 === 0) ? [-1, 0] : [1, 0];
            } else {
                // Vertical spawn
                const rx = vRoads[Math.floor(Math.random() * vRoads.length)];
                startX = rx * TILE_SIZE + TILE_SIZE / 2;
                startY = Math.random() * (MAP_HEIGHT * TILE_SIZE);
                dir = (rx % 2 === 0) ? [0, 1] : [0, -1];
            }
            
            this.cars.push(new Car(startX, startY, dir, speed, colors[i]));
        }
    }

    update(dt, game) {
        // Update all cars
        for (const car of this.cars) {
            car.update(dt, game ? game.gameMap : null);
        }

        if (!game || !game.player) return;

        const player = game.player;
        const followers = game.followerManager.followers;

        // Collision check
        for (const car of this.cars) {
            if (!car.active) continue;

            // Check collision with player
            const pdx = player.x - car.x;
            const pdy = player.y - car.y;
            const pDist = Math.sqrt(pdx * pdx + pdy * pdy);

            if (car.color === 'red') {
                // Red Car: kills player or posse members
                if (pDist < TILE_SIZE * 0.5) {
                    if (game.followerManager.getFollowerCount() > 0) {
                        // Kill a follower instead of the player (posse member dies)
                        game.followerManager.removeFollower();
                        game.hud.showFollowerNotification('A posse member was run over by a red car!', true);
                        // Temporarily disable car to prevent multi-kills
                        car.active = false;
                        setTimeout(() => { car.active = true; }, 3000);
                    } else {
                        // Player dies!
                        game._triggerCarDefeat();
                        return;
                    }
                }

                // Check collision with followers
                for (let i = followers.length - 1; i >= 0; i--) {
                    const fol = followers[i];
                    const fdx = fol.x - car.x;
                    const fdy = fol.y - car.y;
                    const fDist = Math.sqrt(fdx * fdx + fdy * fdy);
                    
                    if (fDist < TILE_SIZE * 0.5) {
                        game.followerManager.removeFollowerAt(i);
                        game.hud.showFollowerNotification('A posse member was run over by a red car!', true);
                        // Temporarily disable car
                        car.active = false;
                        setTimeout(() => { car.active = true; }, 3000);
                        break;
                    }
                }
            } else if (car.color === 'green') {
                // Green Car: Near interaction check (Press E)
                if (pDist < TILE_SIZE * 0.8) {
                    // Show prompt on HUD
                    game.hud.showFollowerNotification('Press [E] to recruit green car helper!', false);
                    
                    // Check if player presses interaction key 'E'
                    if (player.interactionTriggered) {
                        player.interactionTriggered = false; // consume
                        car.active = false;
                        const newFollower = game.followerManager.addFollower(player.x, player.y);
                        const charConfig = SPRITE_CONFIG.characters.find(c => c.id === newFollower.spriteId);
                        game.hud.showFollowerNotification(charConfig ? `${charConfig.name} joined your posse!` : 'New posse member joined your posse!', true);
                    }
                }
            }
        }
    }

    render(ctx, camera) {
        for (const car of this.cars) {
            car.render(ctx, camera);
        }
    }
}
