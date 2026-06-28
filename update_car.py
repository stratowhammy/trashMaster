import re

with open('js/car.js', 'r') as f:
    content = f.read()

car_class = """class Car {
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
}"""

# Replace Car class
content = re.sub(r'class Car \{.*?\n\}\n', car_class + '\n', content, flags=re.DOTALL)

spawn_cars = """    spawnCars(gameMap) {
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
    }"""

# Replace spawnCars
content = re.sub(r'    spawnCars\(\) \{.*?\n    \}', spawn_cars, content, flags=re.DOTALL)

with open('js/car.js', 'w') as f:
    f.write(content)
