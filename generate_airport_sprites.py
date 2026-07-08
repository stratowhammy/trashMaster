import os
from PIL import Image

def create_sprite(matrix, palette, filename, size=128):
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

airport_matrix = [
    "                ",
    "    aaaa        ",
    "    awwa        ",
    "    awwa        ",
    "    aaaa   aaaa ",
    "   aaaaaa aaaaaa",
    "   awwwwa awwwwa",
    "   awwwwa awwwwa",
    "   aaaaaa awwwwa",
    "   adddda awwwwa",
    "   aaaaaa aaaaaa",
    "                ",
    "                ",
    "                ",
    "                ",
    "                "
]

airport_palette = {
    'a': (120, 130, 140, 255), # Silver building
    'w': (0, 180, 255, 255),   # Cyan windows
    'd': (60, 60, 70, 255)     # Glass doors
}

hospital_matrix = [
    "      rr        ",
    "      rr        ",
    "    rrrrrr      ",
    "    rrrrrr      ",
    "      rr        ",
    "      rr        ",
    "  hhhhhhhhhhhh  ",
    " hhhhhhhhhhhhhh ",
    " hhhwwwhhhwwwhh ",
    " hhhwwwhhhwwwhh ",
    " hhhhhhhhhhhhhh ",
    " hhhhhhhhhhhhhh ",
    " hhddhhhhhhddhh ",
    " hhddhhhhhhddhh ",
    " hhhhhhhhhhhhhh ",
    "                "
]

hospital_palette = {
    'r': (240, 30, 30, 255),   # Bright red cross
    'h': (245, 245, 250, 255), # White/gray brick
    'w': (0, 200, 255, 255),   # Windows
    'd': (50, 50, 60, 255)     # Dark entry door
}

airplane_matrix = [
    "                ",
    "       kk       ",
    "      kwwk      ",
    "      kwwk      ",
    "     kwwwwk     ",
    "    kwwwwwwk    ",
    "   kwwkwwkwwk   ",
    "  kwwwwwwwwwwk  ",
    " kwwwwwwwwwwwwk ",
    "kkkwwwwwwwwwwkkk",
    "   kwwwwwwwwk   ",
    "    kwwwwwwk    ",
    "    kwwwwwwk    ",
    "   kwwwwwwwwk   ",
    "   kkkkkkkkkk   ",
    "                "
]

airplane_palette = {
    'w': (245, 245, 250, 255),
    'k': (40, 40, 50, 255)
}

os.makedirs('assets/sprites', exist_ok=True)
create_sprite(airport_matrix, airport_palette, 'assets/sprites/airport.png', 128)
create_sprite(hospital_matrix, hospital_palette, 'assets/sprites/hospital.png', 128)
create_sprite(airplane_matrix, airplane_palette, 'assets/sprites/airplane_icon.png', 32)

print("Airport, hospital, and airplane icon generated successfully.")
