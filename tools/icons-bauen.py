"""Baut die App-Symbole von Workflow Calculate aus Klaus' Vorlage (icons/quelle/icon-klaus.png,
2026-10-12: Zahnrad mit Rechenzeichen und Pfeil, rot). python3 tools/icons-bauen.py — danach Cache erhöhen.
Maskierbar: Motiv auf 78 % verkleinert und auf derselben roten Fläche zentriert (sichere Zone 80 %)."""
from PIL import Image
import os
W = os.path.join(os.path.dirname(__file__), "..", "icons")
quelle = Image.open(os.path.join(W, "quelle", "icon-klaus.png")).convert("RGB")
rot = quelle.getpixel((5, 5))

def normal(n):
    return quelle.resize((n, n), Image.LANCZOS)

def maskierbar(n):
    grund = Image.new("RGB", (n, n), rot)
    k = round(n * 0.78)
    grund.paste(quelle.resize((k, k), Image.LANCZOS), ((n - k) // 2, (n - k) // 2))
    return grund

normal(192).save(os.path.join(W, "icon-192.png"))
normal(512).save(os.path.join(W, "icon-512.png"))
normal(180).save(os.path.join(W, "apple-touch-icon.png"))
normal(48).save(os.path.join(W, "favicon-48.png"))
normal(32).save(os.path.join(W, "favicon-32.png"))
maskierbar(512).save(os.path.join(W, "maskable-512.png"))
print("icons gebaut aus icon-klaus.png, Grundfarbe", rot)
