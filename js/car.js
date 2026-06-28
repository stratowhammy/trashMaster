// ============================================================
// car.js — Traffic on the street grid
// ============================================================

class Car {
    constructor(isVertical, roadIndex, startPos, speed, color) {
        this.isVertical = isVertical;
        this.roadIndex = roadIndex;
        this.color = color; // 'green' or 'red'
        this.speed = speed;
        this.width = 40;
        this.height = 40;
        this.active = true;

        if (isVertical) {
            this.x = roadIndex * TILE_SIZE + TILE_SIZE / 2;
            this.y = startPos;
            this.dirY = Math.random() < 0.5 ? 1 : -1;
            this.dirX = 0;
        } else {
            this.x = startPos;
            this.y = roadIndex * TILE_SIZE + TILE_SIZE / 2;
            this.dirX = Math.random() < 0.5 ? 1 : -1;
            this.dirY = 0;
        }
    }

    update(dt) {
        if (!this.active) return;

        if (this.isVertical) {
            this.y += this.dirY * this.speed * dt;
            const mapHeightPx = MAP_HEIGHT * TILE_SIZE;
            this.y = (this.y + mapHeightPx) % mapHeightPx;
        } else {
            this.x += this.dirX * this.speed * dt;
            const mapWidthPx = MAP_WIDTH * TILE_SIZE;
            this.x = (this.x + mapWidthPx) % mapWidthPx;
        }
    }

    render(ctx, camera) {
        if (!this.active) return;
        
        const screen = camera.worldToScreen(this.x, this.y);
        if (!camera.isVisible(this.x - 20, this.y - 20, 40, 40)) return;

        ctx.save();
        
        // Base car body drawing
        ctx.fillStyle = this.color === 'green' ? '#22b14c' : '#ed1c24';
        
        if (this.isVertical) {
            // Draw vertical car
            ctx.beginPath();
            ctx.roundRect(screen.x - 12, screen.y - 20, 24, 40, 6);
            ctx.fill();
            
            // Windshield
            ctx.fillStyle = '#aaddff';
            if (this.dirY > 0) {
                ctx.fillRect(screen.x - 8, screen.y + 6, 16, 5); // windshield pointing down
            } else {
                ctx.fillRect(screen.x - 8, screen.y - 11, 16, 5); // windshield pointing up
            }
        } else {
            // Draw horizontal car
            ctx.beginPath();
            ctx.roundRect(screen.x - 20, screen.y - 12, 40, 24, 6);
            ctx.fill();

            // Windshield
            ctx.fillStyle = '#aaddff';
            if (this.dirX > 0) {
                ctx.fillRect(screen.x + 6, screen.y - 8, 5, 16); // windshield pointing right
            } else {
                ctx.fillRect(screen.x - 11, screen.y - 8, 5, 16); // windshield pointing left
            }
        }
        ctx.restore();
    }
}

class CarManager {
    constructor() {
        this.cars = [];
    }

    spawnCars() {
        this.cars = [];
        const roads = [4, 18, 32, 46, 60];
        
        // Spawn 4 Green Cars and 4 Red Cars
        const colors = ['green', 'green', 'green', 'green', 'red', 'red', 'red', 'red'];
        
        for (let i = 0; i < colors.length; i++) {
            const isVertical = Math.random() < 0.5;
            const roadIndex = roads[Math.floor(Math.random() * roads.length)];
            const startPos = Math.random() * (MAP_WIDTH * TILE_SIZE);
            const speed = 80 + Math.random() * 60; // 80 to 140 pixels per second
            
            this.cars.push(new Car(isVertical, roadIndex, startPos, speed, colors[i]));
        }
    }

    update(dt, game) {
        // Update all cars
        for (const car of this.cars) {
            car.update(dt);
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
                        game.followerManager.addFollower(player.x, player.y);
                        game.hud.showFollowerNotification('Recruited a new posse member from the green car!', true);
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
