import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

const SIZE = { width: 1200, height: 630 };
const INK = "#090909";
const CREAM = "#eceae3";
const YELLOW = "#f4d44d";

const pixelFont = readFile(path.join(process.cwd(), "src/lib/og-fonts/GeistPixel-Square.ttf"));
const monoFont = readFile(path.join(process.cwd(), "src/lib/og-fonts/GeistMono-Medium.ttf"));

const CELL = 32;
const GAP = 6;
const COLS = Math.ceil(SIZE.width / (CELL + GAP));
// Right-aligned bars of different length, like the Dissolve logo: dithered on the left, solid on the right.
const BAR_LENGTHS = [1, 0.78, 0.52];

function hash(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function seedOf(text: string) {
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return h;
}

function DissolveBars({ seed }: { seed: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
      {BAR_LENGTHS.map((length, row) => {
        const len = Math.round(COLS * length);
        return (
          <div key={row} style={{ display: "flex", justifyContent: "flex-end", gap: GAP }}>
            {Array.from({ length: len }, (_, i) => {
              const t = i / (len - 1);
              // Left end mostly empty, right end solid.
              const on = t > 0.55 || hash(seed + row * 97 + i) < Math.pow(t / 0.55, 1.3) * 0.9;
              return <div key={i} style={{ width: CELL, height: CELL, background: on ? YELLOW : "transparent" }} />;
            })}
          </div>
        );
      })}
    </div>
  );
}

function titleSize(title: string, kind: string) {
  const n = title.length;
  if (kind === "home") return 92;
  if (n <= 28) return 100;
  if (n <= 48) return 80;
  if (n <= 72) return 64;
  return 52;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const kind = params.get("kind") ?? "page";
  const title = (params.get("title") ?? "Every agent run, on the record.").slice(0, 110);
  const kicker = (params.get("kicker") ?? "AI agent observability").slice(0, 48);
  const sub = params.get("sub")?.slice(0, 90);
  const [pixel, mono] = await Promise.all([pixelFont, monoFont]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: INK, color: CREAM, paddingTop: 56, paddingLeft: 64, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", paddingRight: 64, gap: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontFamily: "Pixel", fontSize: 40, letterSpacing: "-0.02em", color: CREAM }}>uncoil</div>
            <div style={{ display: "flex", fontFamily: "Mono", fontSize: 22, letterSpacing: "0.16em", textTransform: "uppercase", color: YELLOW }}>{kicker}</div>
          </div>
          <div style={{ display: "flex", fontFamily: "Pixel", fontSize: titleSize(title, kind), lineHeight: 1.04, letterSpacing: "-0.03em", color: CREAM, maxWidth: 1060 }}>{title}</div>
          {sub ? <div style={{ display: "flex", fontFamily: "Mono", fontSize: 26, color: "#a9a79f", maxWidth: 980 }}>{sub}</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontFamily: "Mono", fontSize: 20, letterSpacing: "0.1em", color: "#8d8b84", paddingLeft: 0 }}>uncoil.dev</div>
          <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: 36, marginLeft: -64 }}>
            <DissolveBars seed={seedOf(title)} />
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "Pixel", data: pixel, style: "normal", weight: 400 },
        { name: "Mono", data: mono, style: "normal", weight: 500 },
      ],
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" },
    },
  );
}
