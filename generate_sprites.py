import os
from PIL import Image

def create_sprite(matrix, palette, filename, size=64):
    height = len(matrix)
    width = len(matrix[0])
    img = Image.new("RGBA", (width, height), (0,0,0,0))
    pixels = img.load()
    for y in range(height):
        for x in range(width):
            char = matrix[y][x]
            if char in palette:
                pixels[x, y] = palette[char]
            else:
                pixels[x, y] = (0,0,0,0)
    img = img.resize((size, size), resample=Image.NEAREST)
    img.save(filename, "PNG")

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
    'b': (20, 60, 150, 255), # blue cap
    's': (255, 204, 153, 255), # skin
    'e': (0, 0, 0, 255), # eye
    'u': (180, 110, 50, 255), # brown uniform
    'y': (255, 204, 153, 255), # skin arm
    'p': (130, 80, 40, 255), # dark brown pants
    'k': (30, 30, 30, 255) # black shoes
}

truck_matrix = [
    "                ",
    "                ",
    "                ",
    "    ggggggggg   ",
    "   ggggggggggg  ",
    "  ggcccccccggww ",
    "  ggcccccccggwwh",
    "  ggcccccccggggg",
    "  ggcccccccggggy",
    "   ggggggggggggg",
    "   gggggggggggg ",
    "    k k    k k  ",
    "   kkkkk  kkkkk ",
    "    k k    k k  ",
    "                ",
    "                "
]
truck_palette = {
    'g': (30, 160, 60, 255),
    'w': (150, 220, 255, 255),
    'c': (80, 90, 80, 255),
    'h': (255, 255, 0, 255),
    'y': (255, 180, 0, 255),
    'k': (20, 20, 20, 255)
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

wings_matrix = [
    "                ",
    "   w        w   ",
    "  wgw      wgw  ",
    "  wggw    wggw  ",
    "  wgggw  wgggw  ",
    "  wwwww  wwwww  ",
    "  wgggw  wgggw  ",
    "   wggw  wggw   ",
    "   www    www   ",
    "    ww    ww    ",
    "    w      w    ",
    "                ",
    "                ",
    "                ",
    "                ",
    "                "
]
wings_palette = {
    'w': (250, 250, 255, 255),
    'g': (200, 220, 250, 255)
}

os.makedirs('assets/sprites', exist_ok=True)
create_sprite(emp_matrix, emp_palette, 'assets/sprites/employee.png')
create_sprite(truck_matrix, truck_palette, 'assets/sprites/trash_truck.png')
create_sprite(filth_matrix, filth_palette, 'assets/sprites/filthadelphia.png')
create_sprite(watch_matrix, watch_palette, 'assets/sprites/borrowed_time.png')
create_sprite(mush_matrix, mush_palette, 'assets/sprites/mushrooms.png')
create_sprite(wings_matrix, wings_palette, 'assets/sprites/wings.png')

print("All png pixel art generated successfully.")
