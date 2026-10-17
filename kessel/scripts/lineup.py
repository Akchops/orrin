# Composes kessel/stills/lineup.webp from the three profile renders
# (lineup-1..3, transparent background): each lens cropped to its
# silhouette and stood on its mount, side by side with the mounts on one
# line, as in a product lineup. Run after kessel/scripts/stills.mjs lineup-1 lineup-2 lineup-3.
#   python3 kessel/scripts/lineup.py
from PIL import Image

parts = [Image.open(f'kessel/stills/lineup-{i}.webp').convert('RGBA') for i in (1, 2, 3)]
crops = [p.crop(p.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()) for p in parts]
# In the profile renders the mount is on the right: turn each lens so it
# stands on it.
crops = [c.rotate(-90, expand=True) for c in crops]
gap, pad = 90, 24
w = sum(c.width for c in crops) + gap * (len(crops) - 1) + pad * 2
h = max(c.height for c in crops) + pad * 2
out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
x = pad
for c in crops:
    out.paste(c, (x, h - pad - c.height), c)
    x += c.width + gap
scale = 1800 / w
out = out.resize((1800, round(h * scale)), Image.LANCZOS)
out.save('kessel/stills/lineup.webp', 'WEBP', quality=84, method=6)
print('lineup', out.size)
