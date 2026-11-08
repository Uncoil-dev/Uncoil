"""Builds the pixel-snapped Uncoil lockup (public/logos/uncoil/uncoil-logo-crisp-on-*.svg).

Why: the original lockup is a 845x218 viewBox scaled down to ~40px tall, so one dither
pixel lands at ~0.6 screen pixels and every edge is anti-aliased into mush. Here every
pixel of the logo sits on a whole-pixel grid (1 unit = 1 CSS px at scale 1), so the
browser draws sharp edges. Run: python3 scripts/generate-crisp-logo.py
"""
import re, pathlib

D = pathlib.Path(__file__).resolve().parent.parent / "public/logos/uncoil"
src = (D / "uncoil-logo-on-dark.svg").read_text()
word_d = re.search(r'fill="#eceae3" d="([^"]+)"', src).group(1)
icon_d = re.search(r'fill="#f4d44d" d="([^"]+)"', src).group(1)

ICON_X0, ICON_Y0, ICON_CELL = 51.158, 42.0, 3.682
WORD_X0, WORD_Y0, WORD_STEP = 254.6, 41.3, 3.65

# --- icon: rasterise to cells, merge runs per row
cells = set()
for m in re.finditer(r"M([\d.]+) ([\d.]+)h([\d.]+)v([\d.]+)h-[\d.]+z", icon_d):
    x, y, w, h = map(float, m.groups())
    r = round((y - ICON_Y0) / ICON_CELL)
    c0 = round((x - ICON_X0) / ICON_CELL)
    n = max(1, round(w / ICON_CELL))
    for c in range(c0, c0 + n):
        cells.add((c, r))
cols = max(c for c, _ in cells) + 1
rows = max(r for _, r in cells) + 1
icon_path = ""
for r in range(rows):
    c = 0
    while c < cols:
        if (c, r) in cells:
            s = c
            while (c, r) in cells: c += 1
            icon_path += f"M{s} {r}h{c - s}v1h-{c - s}z"
        else:
            c += 1

# --- word: snap every coordinate onto the 1-unit grid
GAP = 10
word_off_x = cols + GAP
tokens = re.findall(r"[MHVZ]|-?[\d.]+", word_d)
out, cmd, i, cx, cy = [], None, 0, 0, 0
while i < len(tokens):
    t = tokens[i]
    if t in "MHVZ":
        cmd = t; i += 1
        if t == "Z": out.append("Z")
        continue
    if cmd == "M":
        x = round((float(tokens[i]) - WORD_X0) / WORD_STEP) + word_off_x
        y = round((float(tokens[i + 1]) - WORD_Y0) / WORD_STEP)
        out.append(f"M{x} {y}"); i += 2
    elif cmd == "H":
        out.append(f"H{round((float(t) - WORD_X0) / WORD_STEP) + word_off_x}"); i += 1
    elif cmd == "V":
        out.append(f"V{round((float(t) - WORD_Y0) / WORD_STEP)}"); i += 1
word_path = "".join(out)
width = max(int(n) for n in re.findall(r"[HM](\d+)", word_path)) + 0
w_all = max(int(n) for n in re.findall(r"H(\d+)", word_path))
h_all = max(rows, max(int(n) for n in re.findall(r"V(\d+)", word_path)))

for tone, ink in (("dark", "#eceae3"), ("light", "#090909")):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_all} {h_all}" width="{w_all}" height="{h_all}" shape-rendering="crispEdges">'
           f'<path fill="#f4d44d" d="{icon_path}"/><path fill="{ink}" d="{word_path}"/></svg>')
    (D / f"uncoil-logo-crisp-on-{tone}.svg").write_text(svg)
print("size", w_all, h_all, "icon", cols, rows)
