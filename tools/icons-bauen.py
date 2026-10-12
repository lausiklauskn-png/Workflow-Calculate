"""Baut die App-Symbole von Workflow Calculate (Pillow). python3 tools/icons-bauen.py — danach Cache erhöhen.
Blau/Petrol wie die Akzentfarbe; ein Taschenrechner mit Euro-Zeichen."""
from PIL import Image, ImageDraw, ImageFont
import os
W = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(W, exist_ok=True)

def font(px):
    for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"]:
        if os.path.exists(f):
            return ImageFont.truetype(f, px)
    return ImageFont.load_default()

def bauen(n, rand=0.0, rund=True):
    s = 1024
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Verlauf Blau → Petrol
    grund = Image.new("RGBA", (s, s))
    gd = ImageDraw.Draw(grund)
    for y in range(s):
        t = y / s
        r = int(0x1f * (1 - t) + 0x17 * t); g = int(0x6f * (1 - t) + 0x80 * t); b = int(0xb2 * (1 - t) + 0x6d * t)
        gd.line([(0, y), (s, y)], fill=(r, g, b, 255))
    maske = Image.new("L", (s, s), 0)
    ImageDraw.Draw(maske).rounded_rectangle([0, 0, s - 1, s - 1], radius=220 if rund else 0, fill=255)
    im.paste(grund, (0, 0), maske)
    k = int(s * rand)
    # Rechner
    x0, y0, x1, y1 = 250 + k // 2, 170 + k // 2, 774 - k // 2, 854 - k // 2
    d.rounded_rectangle([x0, y0, x1, y1], radius=60, fill=(255, 255, 255, 240))
    d.rounded_rectangle([x0 + 50, y0 + 50, x1 - 50, y0 + 230], radius=24, fill=(13, 40, 64, 255))
    f = font(150 - k // 6)
    d.text(((x0 + x1) // 2 + 70, y0 + 140), "€", font=f, fill=(124, 199, 255, 255), anchor="mm")
    bw = (x1 - x0 - 100 - 2 * 30) / 3
    for r_ in range(3):
        for c in range(3):
            bx = x0 + 50 + c * (bw + 30); by = y0 + 270 + r_ * (bw * 0.62 + 26)
            farbe = (47, 179, 154, 255) if (r_, c) == (2, 2) else (205, 220, 233, 255)
            d.rounded_rectangle([bx, by, bx + bw, by + bw * 0.62], radius=18, fill=farbe)
    return im.resize((n, n), Image.LANCZOS)

bauen(192).save(os.path.join(W, "icon-192.png"))
bauen(512).save(os.path.join(W, "icon-512.png"))
bauen(512, rand=0.16, rund=False).save(os.path.join(W, "maskable-512.png"))
bauen(180).save(os.path.join(W, "apple-touch-icon.png"))
bauen(48).save(os.path.join(W, "favicon-48.png"))
bauen(32).save(os.path.join(W, "favicon-32.png"))
print("icons gebaut")
