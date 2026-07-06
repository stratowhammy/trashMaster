const fs = require('fs');
let code = fs.readFileSync('js/main.js', 'utf8');

// Add debug box to _renderGame
code = code.replace(
    'this.gameMap.render(ctx, this.camera, this.player);',
    'this.gameMap.render(ctx, this.camera, this.player);\n        ctx.fillStyle="red"; ctx.fillRect(w/2-50, h/2-50, 100, 100);\n        if (window.gameLog && !this.hasLoggedMap) { this.hasLoggedMap = true; window.gameLog("Map Rendered. Camera.x=" + this.camera.x + ", Tile[20][24]=" + this.gameMap.tiles[24][20]); }'
);

fs.writeFileSync('js/main.js', code);
console.log('Patched main.js');
