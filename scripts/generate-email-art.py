"""Dithered artwork for the lifecycle emails (welcome, no-trace nudge).

Same procedural pixel language and three brand colors as the landing page art.
Run: python3 scripts/generate-email-art.py  -> public/images/email/*.png
"""
import importlib.util
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location("landing_art", os.path.join(HERE, "generate-landing-art.py"))
art = importlib.util.module_from_spec(spec)
spec.loader.exec_module(art)
art.OUT = os.path.join(HERE, "..", "public", "images", "email")
os.makedirs(art.OUT, exist_ok=True)
Canvas, glow, render = art.Canvas, art.glow, art.render
RNG = np.random.default_rng(11)


def bar(layer, x0, x1, y0, y1, fade=0.45, hollow=False):
    """A span bar: dithered on the left, solid on the right, like the Dissolve logo."""
    x0, x1, y0, y1 = int(x0), int(x1), int(y0), int(y1)
    ramp = np.linspace(0.12, 1.4, max(x1 - x0, 1)) ** (1 / fade) if fade else np.ones(x1 - x0)
    block = np.tile(ramp, (y1 - y0, 1))
    if hollow:
        block[2:-2, 2:-2] = 0
        block[:, :] *= 0.8
    layer[y0:y1, x0:x1] += block


def lanes(c, w, h, top, rows, pitch, cols=24):
    for i in range(rows):
        y = int(top + i * pitch)
        c.base[y:y + 3, 60:w - 60] += 0.09
    for k in range(cols + 1):
        x = int(60 + k * (w - 120) / cols)
        c.base[int(top - 20):int(top + rows * pitch), x:x + 3] += 0.06
        c.base[int(top - 20):int(top - 8), x:x + 2] += 0.55


def welcome_hero():
    w, h = 1200, 600
    c = Canvas(w, h)
    top, pitch, th = 70, 33, 20
    lanes(c, w, h, top, 15, pitch)
    x = 80
    plan = [(0, 1.0, "b"), (1, 0.34, "y"), (2, 0.2, "y"), (3, 0.28, "b"), (4, 0.4, "y"), (5, 0.16, "b"), (6, 0.22, "b"),
            (7, 0.34, "y"), (8, 0.12, "b"), (9, 0.3, "b"), (10, 0.18, "y"), (11, 0.26, "b"), (12, 0.14, "b"), (13, 0.2, "y"), (14, 0.12, "b")]
    span_total = w - 160
    cursor = 0.0
    for i, frac, kind in plan:
        start = x + cursor * span_total
        length = frac * span_total * (0.8 if i else 1)
        end = min(start + length, w - 80)
        bar(c.accent if kind == "y" else c.base, start, end, top + i * pitch + 4, top + i * pitch + 4 + th)
        cursor += 0.045 if i else 0.0
    # soaring yellow glow at the bottom right: the first trace arriving
    yy, xx = np.mgrid[0:h, 0:w]
    c.accent += np.clip(1 - np.hypot((xx - w * 0.82) / 1.4, yy - h * 0.95) / 220, 0, 1) ** 1.6 * 1.1
    c.base, c.accent = glow(c.base, 1, 0.35, 3), glow(c.accent, 1, 0.9, 7)
    render(c, "welcome-hero", px=3)


def no_trace_hero():
    w, h = 1200, 600
    c = Canvas(w, h)
    top, pitch, th = 70, 33, 20
    lanes(c, w, h, top, 15, pitch)
    # ghost outlines where spans should be, and one bar that dissolves into nothing
    for i, (s, e) in {2: (0.10, 0.32), 4: (0.22, 0.58), 5: (0.30, 0.46), 7: (0.40, 0.78), 9: (0.55, 0.70), 11: (0.62, 0.90)}.items():
        bar(c.base, 80 + s * (w - 160), 80 + e * (w - 160), top + i * pitch + 4, top + i * pitch + 4 + th, hollow=True)
    y = top + 0 * pitch + 4
    bar(c.accent, 80, 80 + 0.34 * (w - 160), y, y + th, fade=0.9)
    # a blinking-cursor block where the next span should start
    x0 = int(80 + 0.34 * (w - 160)) + 14
    c.accent[y - 6:y + th + 6, x0:x0 + 22] += 1.6
    # dust of pixels drifting off the end of the bar
    xs = RNG.normal(x0 + 120, 90, 900)
    ys = RNG.normal(y + th / 2, 36, 900)
    c.splat(xs, ys, 0.9, "accent")
    c.base, c.accent = glow(c.base, 1, 0.3, 3), glow(c.accent, 1, 0.8, 7)
    render(c, "no-trace-hero", px=3)


def banner():
    """Thin closing strip of dissolving pixel bars."""
    w, h = 1200, 150
    c = Canvas(w, h)
    for i, y in enumerate(range(18, h - 34, 38)):
        end = w - 40 - i * 90
        bar(c.accent if i == 1 else c.base, 40, end, y, y + 22, fade=0.5)
    c.base, c.accent = glow(c.base, 1, 0.25, 2), glow(c.accent, 1, 0.5, 4)
    render(c, "strip", px=3)


if __name__ == "__main__":
    welcome_hero()
    no_trace_hero()
    banner()
