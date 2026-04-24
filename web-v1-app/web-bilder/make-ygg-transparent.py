from PIL import Image
import math

input_path = "ygg.png"
output_path = "ygg-transparent.png"

img = Image.open(input_path).convert("RGBA")
pixels = img.load()
w, h = img.size

# Bakgrunnsfarge samplet fra hjørnene
corners = [
    pixels[0, 0],
    pixels[w - 1, 0],
    pixels[0, h - 1],
    pixels[w - 1, h - 1],
]

bg = tuple(sum(px[i] for px in corners) // len(corners) for i in range(3))

def distance(a, b):
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(3)))

# Juster disse hvis nødvendig
transparent_threshold = 42
soft_threshold = 82

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        d = distance((r, g, b), bg)

        if d <= transparent_threshold:
            pixels[x, y] = (r, g, b, 0)
        elif d <= soft_threshold:
            # Myk overgang i kantene rundt treet
            alpha = int(255 * ((d - transparent_threshold) / (soft_threshold - transparent_threshold)))
            pixels[x, y] = (r, g, b, min(a, alpha))

img.save(output_path)
print(f"Saved {output_path}")