# Encode a rendered PNG (with alpha) to WebP at 1000 and 600 px, then remove the PNG.
import sys, os
from PIL import Image
src = sys.argv[1]
base = src[:-4]
im = Image.open(src).convert('RGBA')
is_model = os.path.basename(base).startswith('model-')
sizes = [600] if is_model else [1000, 600]
for s in sizes:
    out = im.resize((s, s), Image.LANCZOS)
    out.save(f'{base}-{s}.webp', 'WEBP', quality=84, method=6)
os.remove(src)
