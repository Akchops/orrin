# Composes kessel/stills/lineup.webp from the three profile renders
# (lineup-1..3, transparent background, one common scale): each lens cropped
# to its silhouette and stood on its mount, the mounts on one line, each
# lens's axis at 20%, 50% and 80% across the picture (the live lineup,
# src/app/viewer.js LINEUP_X, and the label columns on #lenses use the same
# places). The picture is as narrow as those places allow with a clear gap
# between lenses, with room under the mounts and over the tallest hood.
# Run after kessel/scripts/stills.mjs lineup-1 lineup-2 lineup-3.
#   python3 kessel/scripts/lineup.py
from PIL import Image

X = [0.2, 0.5, 0.8]
PAD, GAP, TOP, BASE = 30, 70, 40, 60   # px at the renders' scale (about 5.4 px per mm)

parts = [Image.open(f'kessel/stills/lineup-{i}.webp').convert('RGBA') for i in (1, 2, 3)]
crops = [p.crop(p.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()) for p in parts]
# In the profile renders the mount is on the right: turn each lens so it
# stands on it.
crops = [c.rotate(-90, expand=True) for c in crops]


def axis(c):
    # The barrel's middle, from a band across the body (the tripod foot and
    # the petals stick out to one side or both, so not the box's centre).
    band = c.crop((0, int(c.height * 0.45), c.width, int(c.height * 0.6))).getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return (band[0] + band[2]) / 2


ax = [axis(c) for c in crops]
w = [c.width for c in crops]
need = [(PAD + ax[0]) / X[0], (w[2] - ax[2] + PAD) / (1 - X[2])]
for i in range(2):
    need.append(((w[i] - ax[i]) + GAP + ax[i + 1]) / (X[i + 1] - X[i]))
W = int(max(need)) + 1
H = max(c.height for c in crops) + TOP + BASE
out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for c, a, x in zip(crops, ax, X):
    out.paste(c, (round(x * W - a), H - BASE - c.height), c)
scale = 1800 / W
out = out.resize((1800, round(H * scale)), Image.LANCZOS)
out.save('kessel/stills/lineup.webp', 'WEBP', quality=84, method=6)
print('lineup', out.size, 'aspect', round(out.size[0] / out.size[1], 4), 'base share', round(BASE / H, 4), 'top share', round(TOP / H, 4))
