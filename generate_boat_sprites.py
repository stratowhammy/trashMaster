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

npc_boat_matrix = [
    "                ",
    "                ",
    "      bbb       ",
    "     bsssbb     ",
    "    bbssseeb    ",
    "      ssss      ",
    "     uuuuuu     ",
    "    yuuuuuuy    ",
    "   ww  oo  ww   ",
    "   ww  oo  ww   ",
    "  dddddddddddd  ",
    " dddddddddddddd ",
    "  dddddddddddd  ",
    "   wwwwwwwwww   ",
    "                ",
    "                "
]
npc_boat_palette = {
    'b': (20, 60, 150, 255),
    's': (255, 204, 153, 255),
    'e': (0, 0, 0, 255),
    'u': (34, 139, 34, 255),
    'y': (255, 204, 153, 255),
    'w': (200, 150, 90, 255),
    'o': (140, 70, 20, 255),
    'd': (110, 60, 25, 255),
}

organizer_boat_matrix = [
    "       fff      ",
    "       fff      ",
    "        m       ",
    "      ggggg     ",
    "     gsssssg    ",
    "    ggssseegg   ",
    "      ssss      ",
    "     bbbbbb     ",
    "    ybbbbbby    ",
    "   ww  oo  ww   ",
    "  dddddddddddd  ",
    " dddggggggddddd ",
    "  dddddddddddd  ",
    "   wwwwwwwwww   ",
    "                ",
    "                "
]
organizer_boat_palette = {
    'f': (255, 215, 0, 255),
    'm': (80, 50, 20, 255),
    'g': (255, 191, 0, 255),
    's': (255, 204, 153, 255),
    'e': (0, 0, 0, 255),
    'b': (30, 80, 200, 255),
    'y': (255, 204, 153, 255),
    'w': (210, 160, 90, 255),
    'o': (150, 80, 30, 255),
    'd': (120, 65, 25, 255),
}

cult_boat_matrix = [
    "                ",
    "      wwww      ",
    "     wwwwww     ",
    "    wwssseeww   ",
    "     wwssww     ",
    "    wwwwwwww    ",
    "   ywwwwwwwwwy  ",
    "   ywwwwwwwwwy  ",
    "   ss  oo  ss   ",
    "  cccccccccccc  ",
    " cccccccccccccc ",
    "  cccggggggccc  ",
    "   cccccccccc   ",
    "   ssssssssss   ",
    "                ",
    "                "
]
cult_boat_palette = {
    'w': (245, 245, 250, 255),
    's': (255, 204, 153, 255),
    'e': (40, 40, 40, 255),
    'y': (255, 204, 153, 255),
    'o': (180, 180, 190, 255),
    'c': (230, 230, 240, 255),
    'g': (255, 215, 0, 255),
}

follower_boat_matrix = [
    "                ",
    "      bbbb      ",
    "     bbbbbb     ",
    "    bbssseebb   ",
    "      ssss      ",
    "     cccccc     ",
    "    yccccccy    ",
    "   ww  oo  ww   ",
    "  dddddddddddd  ",
    " dddddddddddddd ",
    "  dddbbbbbbddd  ",
    "   dddddddddd   ",
    "   wwwwwwwwww   ",
    "                ",
    "                "
]
follower_boat_palette = {
    'b': (59, 130, 246, 255),
    's': (255, 204, 153, 255),
    'e': (0, 0, 0, 255),
    'c': (30, 40, 60, 255),
    'y': (255, 204, 153, 255),
    'w': (200, 150, 90, 255),
    'o': (140, 70, 20, 255),
    'd': (130, 75, 30, 255),
}

trash_truck_boat_matrix = [
    "                ",
    "     ggggggg    ",
    "    ggggggggg   ",
    "   ggggggggggg  ",
    "   ggggggggggg  ",
    "   gggggggwwkg  ",
    "   gggggggwwkg  ",
    "   ggggggggggg  ",
    "  dddddddddddd  ",
    " dddddddddddddd ",
    "  dddrrrrrrddd  ",
    "   dddddddddd   ",
    "   kkkk  kkkk   ",
    "   wwww  wwww   ",
    "                ",
    "                "
]
trash_truck_boat_palette = {
    'g': (0, 170, 85, 255),
    'w': (220, 240, 255, 255),
    'k': (30, 30, 30, 255),
    'r': (220, 50, 50, 255),
    'd': (110, 65, 25, 255),
}

os.makedirs('assets/sprites', exist_ok=True)
create_sprite(npc_boat_matrix, npc_boat_palette, 'assets/sprites/npc_boat.png')
create_sprite(organizer_boat_matrix, organizer_boat_palette, 'assets/sprites/organizer_boat.png')
create_sprite(cult_boat_matrix, cult_boat_palette, 'assets/sprites/cult_boat.png')
create_sprite(follower_boat_matrix, follower_boat_palette, 'assets/sprites/follower_boat.png')
create_sprite(trash_truck_boat_matrix, trash_truck_boat_palette, 'assets/sprites/trash_truck_boat.png')

print("Boat transparent PNG sprites generated successfully.")
