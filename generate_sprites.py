import os
import struct
import zlib

def write_png(filename, width, height, rgba_data):
    raw_lines = bytearray()
    for y in range(height):
        raw_lines.append(0)
        for x in range(width):
            r, g, b, a = rgba_data[y * width + x]
            raw_lines.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw_lines))
    
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)
    
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png_bytes = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')
    with open(filename, 'wb') as f:
        f.write(png_bytes)

def create_sprite(matrix, palette, filename, size=64):
    height = len(matrix)
    width = len(matrix[0])
    pixels = []
    for sy in range(size):
        my = int(sy * height / size)
        for sx in range(size):
            mx = int(sx * width / size)
            char = matrix[my][mx]
            pixels.append(palette.get(char, (0, 0, 0, 0)))
    write_png(filename, size, size, pixels)

emp_matrix = [
    "                ",
    "      bbbbbb    ",
    "     bssssssb   ",
    "    bbsssseesb  ",
    "      ssssss    ",
    "     uuuuuuuu   ",
    "    yuuuuuuuuy  ",
    "    yyuuuuuuyy  ",
    "    yyuuuuuuyy  ",
    "     yuuuuuuy   ",
    "      pppppp    ",
    "      pp  pp    ",
    "      pp  pp    ",
    "     kkk  kkk   ",
    "    kkkk  kkkk  ",
    "                "
]
emp_palette = {
    'b': (20, 60, 150, 255),
    's': (255, 204, 153, 255),
    'e': (0, 0, 0, 255),
    'u': (180, 110, 50, 255),
    'y': (255, 204, 153, 255),
    'p': (130, 80, 40, 255),
    'k': (30, 30, 30, 255)
}

filth_matrix = [
    "                ",
    "        y       ",
    "      bdob      ",
    "     dbgygd     ",
    "    dggbooyd    ",
    "   dbygrbobgd   ",
    "   rggybbgogb   ",
    "  dgbryygybod   ",
    "  dogygrbgbgrd  ",
    " rdgybbrogbgord ",
    " droyybggorbygd ",
    " dggrogygbrbogd ",
    " dgbdydggrbgybd ",
    "  bbbbbbbbbbbb  ",
    "                ",
    "                "
]
filth_palette = {
    'b': (140, 100, 60, 255),
    'd': (100, 70, 40, 255),
    'g': (100, 200, 80, 255),
    'r': (220, 60, 60, 255),
    'y': (240, 230, 60, 255),
    'o': (255, 160, 40, 255)
}

watch_matrix = [
    "                ",
    "       ss       ",
    "      s  s      ",
    "      ssss      ",
    "     gggggg     ",
    "    ggwwwwgg    ",
    "   ggwwkkwwgg   ",
    "   ggwkwkwwgg   ",
    "   ggwwkwwwgg   ",
    "   ggwwwwwwgg   ",
    "    ggwwwwgg    ",
    "     gggggg     ",
    "                ",
    "                ",
    "                ",
    "                "
]
watch_palette = {
    's': (200, 200, 200, 255),
    'g': (255, 215, 0, 255),
    'w': (240, 240, 245, 255),
    'k': (40, 40, 40, 255)
}

mush_matrix = [
    "                ",
    "      rrrr      ",
    "    rrrwrrwr    ",
    "   rrwwrrwwrr   ",
    "  rwwrrrrrrwwr  ",
    "  rrrrwrwwrrrr  ",
    "  rrrwwwwwwrrr  ",
    "   rrrrrrrrrr   ",
    "     ssssss     ",
    "     ssssss     ",
    "     ssssss     ",
    "     ssssss     ",
    "      ssss      ",
    "                ",
    "                ",
    "                "
]
mush_palette = {
    'r': (220, 40, 40, 255),
    'w': (255, 255, 255, 255),
    's': (240, 230, 200, 255)
}

ship_matrix = [
    "       fff      ",
    "       fff      ",
    "        m       ",
    "      wwmww     ",
    "     wwwmwww    ",
    "    wwwwmwwww   ",
    "     wwwmwww    ",
    "        m       ",
    "   bbbbbmbbbbb  ",
    "  bbbbbbbbbbbbb ",
    " bbcbcbcbcbcbbb ",
    " bbbbbbbbbbbbbb ",
    "  bbbbbbbbbbbb  ",
    "   dddddddddd   ",
    "                ",
    "                "
]
ship_palette_blue = {
    'f': (30, 120, 255, 255),
    'w': (240, 240, 230, 255),
    'm': (100, 60, 20, 255),
    'b': (140, 80, 30, 255),
    'd': (90, 50, 20, 255),
    'c': (20, 20, 20, 255)
}

ship_palette_red = {
    'f': (230, 30, 30, 255),
    'w': (240, 240, 230, 255),
    'm': (100, 60, 20, 255),
    'b': (140, 80, 30, 255),
    'd': (90, 50, 20, 255),
    'c': (20, 20, 20, 255)
}

map_matrix = [
    "                ",
    "  pppppppppppp  ",
    "  pddddddddddp  ",
    "  pd  r  r  dp  ",
    "  pd   r r  dp  ",
    "  pd    r   dp  ",
    "  pd   r r  dp  ",
    "  pd  r  r  dp  ",
    "  pd        dp  ",
    "  pd   c    dp  ",
    "  pd  ccc   dp  ",
    "  pd   c    dp  ",
    "  pddddddddddp  ",
    "  pppppppppppp  ",
    "                ",
    "                "
]
map_palette = {
    'p': (180, 140, 80, 255),
    'd': (240, 210, 150, 255),
    'r': (220, 30, 30, 255),
    'c': (140, 90, 30, 255)
}

cannonball_matrix = [
    "      kkkk      ",
    "     kggggk     ",
    "    kgwggggk    ",
    "    kggggggk    ",
    "    kggggggk    ",
    "     kggggk     ",
    "      kkkk      ",
    "                "
]
cannonball_palette = {
    'k': (20, 20, 20, 255),
    'g': (60, 60, 65, 255),
    'w': (200, 200, 200, 255)
}

os.makedirs('assets/sprites', exist_ok=True)
create_sprite(emp_matrix, emp_palette, 'assets/sprites/employee.png')
create_sprite(filth_matrix, filth_palette, 'assets/sprites/filthadelphia.png')
create_sprite(watch_matrix, watch_palette, 'assets/sprites/borrowed_time.png')
create_sprite(mush_matrix, mush_palette, 'assets/sprites/mushrooms.png')
create_sprite(ship_matrix, ship_palette_blue, 'assets/sprites/pirate_ship_blue.png')
create_sprite(ship_matrix, ship_palette_red, 'assets/sprites/pirate_ship_red.png')
create_sprite(ship_matrix, ship_palette_blue, 'assets/sprites/pirate_ship.png')
create_sprite(map_matrix, map_palette, 'assets/sprites/treasure_map.png')
create_sprite(cannonball_matrix, cannonball_palette, 'assets/sprites/cannonball.png', size=32)

print("All png pixel art generated successfully.")
