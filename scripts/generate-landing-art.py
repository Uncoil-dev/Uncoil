"""Generate the dithered artwork used on the marketing landing page.

Every image is procedural (no stock or AI imagery) and uses only the three
brand colors: near-black #090909, cream #eceae3 and yellow #f4d44d.
Run: python3 scripts/generate-landing-art.py  -> public/images/landing/*.png
"""
import math
import os

import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "images", "landing")
BLACK, CREAM, YELLOW = (9, 9, 9), (236, 234, 227), (244, 212, 77)
RNG = np.random.default_rng(7)

BAYER8 = np.array([
    [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
]) / 64.0


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.base = np.zeros((h, w))
        self.accent = np.zeros((h, w))

    def splat(self, xs, ys, vals, layer="base"):
        xs = np.asarray(xs).round().astype(int)
        ys = np.asarray(ys).round().astype(int)
        vals = np.broadcast_to(np.asarray(vals, dtype=float), xs.shape)
        ok = (xs >= 0) & (xs < self.w) & (ys >= 0) & (ys < self.h)
        np.add.at(getattr(self, layer), (ys[ok], xs[ok]), vals[ok])


def blur(a, r):
    if r <= 0:
        return a
    for axis in (0, 1):
        c = np.cumsum(np.pad(a, [(r + 1, r) if i == axis else (0, 0) for i in range(2)], mode="edge"), axis=axis)
        if axis == 0:
            a = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
        else:
            a = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return a


def glow(a, sharp=1.0, soft=0.6, r=6):
    return np.clip(blur(a, 1) * sharp + blur(blur(a, r), r) * soft, 0, None)


def render(c, name, px=3, base_gain=1.0, accent_gain=1.0):
    def dither(layer, gain):
        small = layer[::px, ::px] * gain
        small = small / (np.percentile(small, 99.6) + 1e-9)
        small = np.clip(small, 0, 1) ** 0.8
        hh, ww = small.shape
        th = np.tile(BAYER8, (hh // 8 + 1, ww // 8 + 1))[:hh, :ww]
        return small > th
    b = dither(c.base, base_gain)
    a = dither(c.accent, accent_gain) if c.accent.any() else np.zeros_like(b)
    img = np.zeros(b.shape + (3,), dtype=np.uint8)
    img[:] = BLACK
    img[b] = CREAM
    img[a] = YELLOW
    im = Image.fromarray(img).resize((b.shape[1] * px, b.shape[0] * px), Image.NEAREST)
    im = im.quantize(colors=3, method=Image.Quantize.FASTOCTREE)
    path = os.path.join(OUT, f"{name}.png")
    im.save(path, optimize=True)
    print(name, im.size, os.path.getsize(path) // 1024, "KB")


def project(x, y, z, w, h, cam_h=3.2, fov=1.1, horizon=0.36):
    """Perspective onto screen; z is depth (>0), y up."""
    f = w / (2 * math.tan(fov / 2))
    sx = w / 2 + x * f / z
    sy = h * horizon + (cam_h - y) * f / z
    return sx, sy


def floor_grid(c, w, h, step=1.0, depth=60, density=900, gain=0.12, horizon=0.36, cam_h=3.2):
    for gx in np.arange(-30, 30.01, step):
        z = np.linspace(1.2, depth, density)
        sx, sy = project(np.full_like(z, gx), 0 * z, z, w, h, cam_h=cam_h, horizon=horizon)
        c.splat(sx, sy, gain / (z ** 0.6))
    for gz in np.arange(1.5, depth, step):
        x = np.linspace(-30, 30, density * 2)
        sx, sy = project(x, 0 * x, np.full_like(x, gz), w, h, cam_h=cam_h, horizon=horizon)
        c.splat(sx, sy, gain / (gz ** 0.6))


def bezier(p0, p1, n=400):
    t = np.linspace(0, 1, n)[:, None]
    p0, p1 = np.array(p0, float), np.array(p1, float)
    m0 = p0 + np.array([0, 0, (p1[2] - p0[2]) * 0.5])
    m1 = p1 - np.array([0, 0, (p1[2] - p0[2]) * 0.5])
    return ((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * m0 + 3 * (1 - t) * t * t * m1 + t ** 3 * p1


def sphere_blob(c, cx, cy, r, gain, layer="base", n=2500):
    ang = RNG.uniform(0, 2 * np.pi, n)
    rad = r * np.sqrt(RNG.uniform(0, 1, n))
    c.splat(cx + rad * np.cos(ang), cy + rad * np.sin(ang), gain, layer)


# 1. HERO: a run's flow graph floating over an endless floor grid
def hero():
    w, h = 1800, 1100
    c = Canvas(w, h)
    cam, hz = 7.5, 0.12
    P = lambda x, y, z: project(x, y, z, w, h, cam_h=cam, horizon=hz)
    floor_grid(c, w, h, gain=0.22, horizon=hz, cam_h=cam)
    Y = 0.4
    nodes = {
        "agent": (0, Y, 10), "chat": (0, Y, 13), "docs": (-4, Y, 13.5),
        "order": (4, Y, 13.5), "retry": (0, Y, 20), "refund": (0, Y, 24),
        "a1": (-8, Y, 20), "a2": (8, Y, 22), "a3": (-6, Y, 27), "a4": (6, Y, 29),
    }
    edges = [("agent", "chat"), ("chat", "docs"), ("chat", "order"), ("docs", "retry"),
             ("order", "retry"), ("retry", "refund"), ("docs", "a1"), ("order", "a2"),
             ("a1", "a3"), ("a2", "a4")]
    for a, b in edges:
        pts = bezier(nodes[a], nodes[b], 1400)
        sx, sy = P(pts[:, 0], pts[:, 1], pts[:, 2])
        c.splat(sx, sy, 0.7)
        for t in RNG.uniform(0.2, 0.8, 2):
            p = pts[int(t * len(pts))]
            qx, qy = P(*p)
            sphere_blob(c, qx, qy, 70 / p[2], 0.08, "accent", 500)
    for k, (x, y, z) in nodes.items():
        layer = "accent" if k == "refund" else "base"
        # card: rectangle lying on the floor plane
        hw, hd = 1.5, 0.7
        t = np.linspace(-1, 1, 800)
        for xs, zs in ((t * hw, np.full_like(t, -hd)), (t * hw, np.full_like(t, hd)),
                       (np.full_like(t, -hw), t * hd), (np.full_like(t, hw), t * hd)):
            sx, sy = P(x + xs, y + 0 * xs, z + zs)
            c.splat(sx, sy, 1.4, layer)
        gx, gz = np.meshgrid(np.linspace(-hw, hw, 60), np.linspace(-hd, hd, 30))
        sx, sy = P(x + gx.ravel(), y + 0 * gx.ravel(), z + gz.ravel())
        c.splat(sx, sy, 0.06 if layer == "base" else 0.2, layer)
        # pillar of light above each node
        hy = np.linspace(0, 2.5 if k == "refund" else 1.0, 500)
        sx, sy = P(np.full_like(hy, x), y + hy, np.full_like(hy, z))
        c.splat(sx, sy, np.linspace(0.6, 0, 500), layer)
        if k == "refund":
            qx, qy = P(x, y, z)
            sphere_blob(c, qx, qy, 220, 0.02, "accent", 12000)
    c.base, c.accent = glow(c.base, 1, 0.8, 5), glow(c.accent, 1, 1.4, 10)
    render(c, "hero-graph", px=3)


# 2. CAPTURE: hundreds of noisy streams converge into one clean line
def capture():
    w, h = 1400, 1000
    c = Canvas(w, h)
    x = np.linspace(0, w, 2400)
    for i in range(70):
        y0 = RNG.uniform(-100, h + 100)
        phase, amp = RNG.uniform(0, 6.3), RNG.uniform(10, 60)
        k = np.clip(x / (w * 0.72), 0, 1)
        y = y0 * (1 - k ** 1.6) + h / 2 * k ** 1.6 + amp * np.sin(x / 70 + phase) * (1 - k)
        c.splat(x, y, 0.35, "accent" if i == 11 else "base")
    xx = np.linspace(w * 0.72, w, 600)
    c.splat(xx, np.full_like(xx, h / 2), 6, "accent")
    c.base, c.accent = glow(c.base, 1, 0.5, 4), glow(c.accent, 1, 1.2, 8)
    render(c, "capture-streams", px=3)


# 3. COST: an isometric city of bars, one tower burning budget
def cost():
    w, h = 1400, 1000
    c = Canvas(w, h)
    iso = lambda gx, gy, z: (w / 2 + (gx - gy) * 46, h * 0.62 + (gx + gy) * 24 - z)
    for gx in range(-6, 7):
        for gy in range(-6, 7):
            hgt = 30 + 120 * abs(math.sin(gx * 0.7) * math.cos(gy * 0.5)) + RNG.uniform(0, 40)
            hot = (gx, gy) == (2, -1)
            if hot:
                hgt = 520
            layer = "accent" if hot else "base"
            for ex, ey in ((0, 0), (1, 0), (0, 1), (1, 1)):
                bx, by = iso(gx + ex * 0.7, gy + ey * 0.7, 0)
                zz = np.linspace(0, hgt, int(hgt * 2))
                c.splat(np.full_like(zz, bx), by - zz, 0.6, layer)
            for z in (0, hgt):
                t = np.linspace(0, 0.7, 120)
                for a, b in ((t, 0 * t), (t, 0 * t + 0.7), (0 * t, t), (0 * t + 0.7, t)):
                    sx, sy = iso(gx + a, gy + b, z)
                    c.splat(sx, sy, 1.0 if z else 0.3, layer)
            if hot:
                sx, sy = iso(gx + 0.35, gy + 0.35, hgt)
                sphere_blob(c, sx, sy, 160, 0.02, "accent", 9000)
    c.base, c.accent = glow(c.base, 1, 0.4, 4), glow(c.accent, 1, 1.2, 9)
    render(c, "cost-city", px=3)


# 4. FAILURE: a chain of steps where one shatters
def failure():
    w, h = 1400, 1000
    c = Canvas(w, h)
    xs = np.linspace(140, w - 140, 7)
    for i, x in enumerate(xs):
        y = h / 2 + math.sin(i * 0.9) * 60
        if i == 4:
            frag = RNG.normal(0, 1, (5000, 2)) * [120, 90]
            frag[:, 0] += np.abs(frag[:, 0]) * 0.8
            c.splat(x + frag[:, 0], y + frag[:, 1], 0.5, "accent")
            sphere_blob(c, x, y, 70, 0.08, "accent", 3000)
            continue
        t = np.linspace(0, 2 * np.pi, 1400)
        c.splat(x + 48 * np.cos(t), y + 48 * np.sin(t), 1.2)
        sphere_blob(c, x, y, 30, 0.05, "base", 1500)
        if i < len(xs) - 1 and i != 3:
            nx, ny = xs[i + 1], h / 2 + math.sin((i + 1) * 0.9) * 60
            tt = np.linspace(0, 1, 800)
            c.splat(x + (nx - x) * tt, y + (ny - y) * tt, 0.8)
    floor_grid(c, w, h, gain=0.05, horizon=0.5)
    c.base, c.accent = glow(c.base, 1, 0.5, 4), glow(c.accent, 1, 1.3, 9)
    render(c, "failure-shatter", px=3)


# 5. GLOBE: point sphere with orbiting runs, for "works with your stack"
def globe():
    w = h = 1200
    c = Canvas(w, h)
    n = 26000
    phi = np.arccos(RNG.uniform(-1, 1, n))
    th = RNG.uniform(0, 2 * np.pi, n)
    r = 380
    x, y, z = r * np.sin(phi) * np.cos(th), r * np.cos(phi), r * np.sin(phi) * np.sin(th)
    shade = np.clip((z / r + 1) / 2, 0, 1) ** 1.5
    c.splat(w / 2 + x, h / 2 + y, 0.4 * shade)
    for i, (tilt, rr) in enumerate(((0.4, 470), (-0.7, 520), (1.2, 560))):
        t = np.linspace(0, 2 * np.pi, 4000)
        ox, oy = rr * np.cos(t), rr * 0.32 * np.sin(t)
        rx = ox * math.cos(tilt) - oy * math.sin(tilt)
        ry = ox * math.sin(tilt) + oy * math.cos(tilt)
        c.splat(w / 2 + rx, h / 2 + ry, 0.5, "accent" if i == 0 else "base")
        k = 900 + i * 1100
        sphere_blob(c, w / 2 + rx[k], h / 2 + ry[k], 14, 0.15, "accent", 600)
    c.base, c.accent = glow(c.base, 1, 0.6, 5), glow(c.accent, 1, 1.0, 8)
    render(c, "globe-orbits", px=3)


# 6. HORIZON: a sun rising over the grid, for the final call to action
def horizon():
    w, h = 1800, 900
    c = Canvas(w, h)
    floor_grid(c, w, h, gain=0.2, horizon=0.55)
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy, r = w / 2, h * 0.625, 330
    d = np.hypot(xx - cx, yy - cy)
    sun = np.clip(1 - d / r, 0, 1) * (yy < cy)
    bands = (np.sin((yy - cy) * 0.12 * (1 + (cy - yy) / 200)) > -0.2) | (yy < cy - 160)
    c.accent += sun * bands * 3
    c.accent += np.clip(1 - d / (r * 2.2), 0, 1) ** 3 * 0.6 * (yy < cy)
    c.base, c.accent = glow(c.base, 1, 0.5, 4), c.accent
    render(c, "horizon-sun", px=3)


# 7-10. USE CASES
def uc_support():
    w, h = 1000, 1250
    c = Canvas(w, h)
    y = 120
    for i in range(7):
        left = i % 2 == 0
        bw = RNG.uniform(380, 620)
        bh = RNG.uniform(90, 150)
        x0 = 90 if left else w - 90 - bw
        t = np.linspace(0, 1, 900)
        layer = "accent" if i == 4 else "base"
        for xs, ys in ((x0 + t * bw, np.full_like(t, y)), (x0 + t * bw, np.full_like(t, y + bh)),
                       (np.full_like(t, x0), y + t * bh), (np.full_like(t, x0 + bw), y + t * bh)):
            c.splat(xs, ys, 1.0, layer)
        for r in range(int(bh // 34)):
            lw = bw * RNG.uniform(0.4, 0.85)
            xx = np.linspace(x0 + 28, x0 + 28 + lw, 500)
            c.splat(xx, np.full_like(xx, y + 34 + r * 30), 0.5, layer)
        if layer == "accent":
            sphere_blob(c, x0 + bw / 2, y + bh / 2, bw * 0.7, 0.012, "accent", 9000)
        y += bh + 50
    c.base, c.accent = glow(c.base, 1, 0.5, 4), glow(c.accent, 1, 1.2, 9)
    render(c, "uc-support", px=3)


def uc_research():
    w, h = 1000, 1250
    c = Canvas(w, h)
    n = 30000
    arm = RNG.integers(0, 3, n)
    r = RNG.exponential(170, n)
    th = r / 90 + arm * 2.094 + RNG.normal(0, 0.25, n)
    c.splat(w / 2 + r * np.cos(th), h / 2 + r * np.sin(th) * 0.8, 0.35)
    tt = np.linspace(0, 1, 2000)
    rr = 40 + tt * 420
    th2 = rr / 90 + 0.4
    c.splat(w / 2 + rr * np.cos(th2), h / 2 + rr * np.sin(th2) * 0.8, 3, "accent")
    sphere_blob(c, w / 2, h / 2, 60, 0.1, "accent", 3000)
    c.base, c.accent = glow(c.base, 1, 0.8, 5), glow(c.accent, 1, 1.1, 8)
    render(c, "uc-research", px=3)


def uc_automation():
    w, h = 1000, 1250
    c = Canvas(w, h)
    for row in range(6):
        for col in range(4):
            x, y = 170 + col * 220, 160 + row * 190
            t = np.linspace(0, 2 * np.pi, 900)
            teeth = 1 + 0.12 * (np.sin(t * 10) > 0)
            hot = (row, col) == (3, 2)
            layer = "accent" if hot else "base"
            c.splat(x + 62 * teeth * np.cos(t), y + 62 * teeth * np.sin(t), 0.9, layer)
            c.splat(x + 18 * np.cos(t), y + 18 * np.sin(t), 0.9, layer)
            if col < 3:
                xx = np.linspace(x + 75, x + 145, 200)
                c.splat(xx, np.full_like(xx, y), 0.6)
            if hot:
                a = np.linspace(0.3, 2 * np.pi - 0.3, 900)
                c.splat(x + 110 * np.cos(a), y + 110 * np.sin(a), 2, "accent")
                sphere_blob(c, x, y, 140, 0.02, "accent", 8000)
    c.base, c.accent = glow(c.base, 1, 0.5, 4), glow(c.accent, 1, 1.2, 9)
    render(c, "uc-automation", px=3)


def uc_tools():
    w, h = 1000, 1250
    c = Canvas(w, h)
    cx, cy = w / 2, h / 2
    t = np.linspace(0, 2 * np.pi, 1500)
    c.splat(cx + 90 * np.cos(t), cy + 90 * np.sin(t), 1.5)
    sphere_blob(c, cx, cy, 80, 0.05, "base", 3000)
    for k in range(10):
        a = k / 10 * 2 * np.pi + 0.2
        L = RNG.uniform(260, 400)
        hot = k == 3
        layer = "accent" if hot else "base"
        rr = np.linspace(100, L if not hot else L * 0.55, 600)
        c.splat(cx + rr * np.cos(a), cy + rr * np.sin(a), 0.9, layer)
        if hot:
            rr2 = np.linspace(L * 0.68, L, 300)
            c.splat(cx + rr2 * np.cos(a), cy + rr2 * np.sin(a), 0.9, layer)
            sphere_blob(c, cx + L * 0.6 * np.cos(a), cy + L * 0.6 * np.sin(a), 90, 0.03, "accent", 6000)
        ex, ey = cx + L * np.cos(a), cy + L * np.sin(a)
        sq = np.linspace(-26, 26, 300)
        for xs, ys in ((sq, np.full_like(sq, -26)), (sq, np.full_like(sq, 26)), (np.full_like(sq, -26), sq), (np.full_like(sq, 26), sq)):
            c.splat(ex + xs, ey + ys, 1.2, layer)
    c.base, c.accent = glow(c.base, 1, 0.5, 4), glow(c.accent, 1, 1.2, 9)
    render(c, "uc-tools", px=3)


# 11. LOGS WALL: what debugging looks like without a trace
def logs_wall():
    w, h = 1600, 1000
    c = Canvas(w, h)
    y = 20
    while y < h:
        x = 20
        while x < w:
            seg = RNG.uniform(10, 120)
            xx = np.linspace(x, x + seg, int(seg * 2))
            c.splat(xx, np.full_like(xx, y), RNG.uniform(0.25, 0.8))
            x += seg + RNG.uniform(6, 22)
        y += 16
    c.base = glow(c.base, 1, 0.2, 3)
    render(c, "logs-wall", px=2)


# 12. MAP FLAT: the same run, as a clean top-down map
def map_flat():
    w, h = 1600, 1000
    c = Canvas(w, h)
    nodes = {"a": (190, 500), "b": (520, 500), "c": (850, 260), "d": (850, 740), "e": (1150, 500), "f": (1420, 500)}
    for a, b in (("a", "b"), ("b", "c"), ("b", "d"), ("c", "e"), ("d", "e"), ("e", "f")):
        (x0, y0), (x1, y1) = nodes[a], nodes[b]
        x0, x1 = x0 + 122, x1 - 122
        t = np.linspace(0, 1, 1500)
        xm = (x0 + x1) / 2
        xs = (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * xm + 3 * (1 - t) * t * t * xm + t ** 3 * x1
        ys = (1 - t) ** 3 * y0 + 3 * (1 - t) ** 2 * t * y0 + 3 * (1 - t) * t * t * y1 + t ** 3 * y1
        c.splat(xs, ys, 0.9)
    for k, (x, y) in nodes.items():
        layer = "accent" if k == "f" else "base"
        t = np.linspace(-1, 1, 900)
        for xs, ys in ((t * 120, np.full_like(t, -50)), (t * 120, np.full_like(t, 50)), (np.full_like(t, -120), t * 50), (np.full_like(t, 120), t * 50)):
            c.splat(x + xs, y + ys, 1.4, layer)
        gx, gy = np.meshgrid(np.linspace(-120, 120, 90), np.linspace(-50, 50, 36))
        c.splat(x + gx.ravel(), y + gy.ravel(), 0.05 if layer == "base" else 0.35, layer)
        if layer == "accent":
            sphere_blob(c, x, y, 300, 0.012, "accent", 12000)
    c.base, c.accent = glow(c.base, 1, 0.5, 4), glow(c.accent, 1, 1.2, 9)
    render(c, "map-flat", px=2)


# 13. SPAN ANATOMY: one step exploded into layers
def span_anatomy():
    w, h = 1200, 1300
    c = Canvas(w, h)
    iso = lambda x, y, z: (w / 2 + (x - y) * 0.87, z + (x + y) * 0.5)
    S = 300
    for i in range(5):
        z0 = 230 + i * 190
        layer = "accent" if i == 2 else "base"
        t = np.linspace(-S, S, 1400)
        for xs, ys in ((t, np.full_like(t, -S)), (t, np.full_like(t, S)), (np.full_like(t, -S), t), (np.full_like(t, S), t)):
            sx, sy = iso(xs, ys, z0)
            c.splat(sx, sy, 1.2, layer)
        gx, gy = np.meshgrid(np.linspace(-S, S, 70), np.linspace(-S, S, 70))
        sx, sy = iso(gx.ravel(), gy.ravel(), z0)
        c.splat(sx, sy, 0.08 if layer == "base" else 0.3, layer)
        for _ in range(3):
            lx = RNG.uniform(-S * 0.8, S * 0.2)
            ly = RNG.uniform(-S * 0.7, S * 0.7)
            ll = np.linspace(lx, lx + RNG.uniform(120, 360), 500)
            sx, sy = iso(ll, np.full_like(ll, ly), z0)
            c.splat(sx, sy, 0.7, layer)
    for corner in ((-S, -S), (S, -S), (-S, S), (S, S)):
        zz = np.linspace(230, 230 + 4 * 190, 1200)
        sx, sy = iso(np.full_like(zz, corner[0]), np.full_like(zz, corner[1]), zz)
        c.splat(sx, sy, 0.25)
    c.base, c.accent = glow(c.base, 1, 0.5, 4), glow(c.accent, 1, 1.0, 9)
    render(c, "span-anatomy", px=3)


# 14. TUNNEL: perspective corridor of frames, for the mobile menu
def tunnel():
    w, h = 1000, 1600
    c = Canvas(w, h)
    for i in range(1, 40):
        z = i * 0.6
        sw, sh = 520 / z, 820 / z
        t = np.linspace(-1, 1, 1200)
        layer = "accent" if i == 7 else "base"
        for xs, ys in ((t * sw, np.full_like(t, -sh)), (t * sw, np.full_like(t, sh)), (np.full_like(t, -sw), t * sh), (np.full_like(t, sw), t * sh)):
            c.splat(w / 2 + xs, h / 2 + ys, 1.6 / z ** 0.5, layer)
    for a in np.linspace(0, 2 * np.pi, 16, endpoint=False):
        rr = np.linspace(10, 1100, 1500)
        c.splat(w / 2 + rr * np.cos(a) * 0.65, h / 2 + rr * np.sin(a), 0.15)
    c.base, c.accent = glow(c.base, 1, 0.5, 4), glow(c.accent, 1, 1.0, 9)
    render(c, "nav-tunnel", px=3)


# 16. STAIRS: four steps rising in isometric view, one lit, for the pricing page
def pricing_stairs():
    w, h = 1800, 1000
    c = Canvas(w, h)
    iso = lambda x, y, z: (w * 0.5 + (x - y) * 0.87, h * 0.66 + (x + y) * 0.5 - z)
    floor_grid(c, w, h, gain=0.05, horizon=0.3)
    W, D = 190, 190
    heights = (60, 170, 320, 500)
    for i, hg in enumerate(heights):
        ox = (i - 1.5) * 300
        hot = i == 1
        layer = "accent" if hot else "base"
        x0, y0 = ox - W / 2, -D / 2
        t = np.linspace(0, 1, 500)
        for z in (0, hg):
            for a, b in ((t * W, 0 * t), (t * W, 0 * t + D), (0 * t, t * D), (0 * t + W, t * D)):
                sx, sy = iso(x0 + a, y0 + b, z)
                c.splat(sx, sy, 1.3 if z else 0.5, layer)
        for ex, ey in ((0, 0), (W, 0), (0, D), (W, D)):
            zz = np.linspace(0, hg, 400)
            sx, sy = iso(np.full_like(zz, x0 + ex), np.full_like(zz, y0 + ey), zz)
            c.splat(sx, sy, 0.7, layer)
        gx, gy = np.meshgrid(np.linspace(0, W, 60), np.linspace(0, D, 60))
        sx, sy = iso(x0 + gx.ravel(), y0 + gy.ravel(), np.full(gx.size, hg))
        c.splat(sx, sy, 0.16 if hot else 0.07, layer)
        for k in range(1, 6):
            zz = hg * k / 6
            a = np.linspace(0, W, 300)
            sx, sy = iso(x0 + a, np.full_like(a, y0 + D), np.full_like(a, zz))
            c.splat(sx, sy, 0.18, layer)
        if hot:
            sx, sy = iso(ox, 0, hg)
            sphere_blob(c, sx, sy, 260, 0.014, "accent", 14000)
    c.base, c.accent = glow(c.base, 1, 0.5, 4), glow(c.accent, 1, 1.2, 9)
    render(c, "pricing-stairs", px=3)


# 17. GATE: nested doorway frames glowing at the centre, for the checkout page
def checkout_gate():
    w, h = 1200, 1500
    c = Canvas(w, h)
    for i in range(1, 30):
        z = 0.9 + i * 0.45
        sw, sh = 560 / z, 760 / z
        t = np.linspace(-1, 1, 1200)
        layer = "accent" if i >= 22 else "base"
        for xs, ys in ((t * sw, np.full_like(t, -sh)), (t * sw, np.full_like(t, sh)), (np.full_like(t, -sw), t * sh), (np.full_like(t, sw), t * sh)):
            c.splat(w / 2 + xs, h * 0.52 + ys, 1.8 / z ** 0.5, layer)
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot((xx - w / 2) / 0.7, yy - h * 0.52)
    c.accent += np.clip(1 - d / 190, 0, 1) ** 1.5 * 2.2
    floor_grid(c, w, h, gain=0.04, horizon=0.52, cam_h=2.0)
    c.base, c.accent = glow(c.base, 1, 0.5, 4), glow(c.accent, 1, 1.0, 9)
    render(c, "checkout-gate", px=3)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    import sys
    all_fns = (hero, capture, cost, failure, globe, horizon, uc_support, uc_research, uc_automation, uc_tools, logs_wall, map_flat, span_anatomy, tunnel, pricing_stairs, checkout_gate)
    # Pass function names to regenerate only those: python3 generate-landing-art.py pricing_stairs
    wanted = set(sys.argv[1:])
    for fn in all_fns:
        if not wanted or fn.__name__ in wanted:
            fn()
