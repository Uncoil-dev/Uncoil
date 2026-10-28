"""Generate the Uncoil Dissolve logo files into public/logos/uncoil/.
Run from the repo root: python3 scripts/generate-logo.py [--site]
--site also writes the site icons (favicon, apple icon) into src/app.
The name is set in Geist Pixel Square (src/lib/og-fonts/GeistPixel-Square.ttf)."""
import os
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
NAME="uncoil"; OUT='public/logos/uncoil'
font=TTFont('src/lib/og-fonts/GeistPixel-Square.ttf')
gs=font.getGlyphSet(); cmap=font.getBestCmap()
S=7.3/38  # one font pixel (38 units) = 7.3 svg units, as in the original wordmark
def word_path(x0,base):
    pen=SVGPathPen(gs,lambda v:f'{v:.1f}'.rstrip('0').rstrip('.')); x=x0
    for ch in NAME:
        g=gs[cmap[ord(ch)]]
        g.draw(TransformPen(pen,(S,0,0,-S,x,base))); x+=g.width*S
    return pen.getCommands(),x
Y="#f4d44d"; K="#090909"; C="#eceae3"
U=138/19; TOP=42; BASE=180; TX0=240; DESC=BASE
WORD,TX1=word_path(TX0,BASE)
B=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
ROWS=[(0,50),(14,26),(28,18)]  # half-size pixels: bars 10 tall, gaps 4, right aligned, 50 wide
def icon_cells(dither=True):
    out=[]
    for y0,w in ROWS:
        x0=50-w
        for y in range(y0,y0+10):
            for x in range(x0,50):
                f=(x-x0+0.5)/w
                if not dither or B[y%4][x%4]/16 < f*1.9-0.15: out.append((x,y))
    return out
def rects(cells,ox,oy,u,col):
    return ''.join(f'<rect x="{ox+x*u:.3f}" y="{oy+y*u:.3f}" width="{u+0.05:.3f}" height="{u+0.05:.3f}" fill="{col}"/>' for x,y in cells)
def wsvg(vb,body,w=None,h=None):
    sz=f' width="{w}" height="{h}"' if w else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{sz} shape-rendering="crispEdges">{body}</svg>'
pad=40
def lockup(text):
    gap=3*U; ix=TX0-gap-25*U
    body=rects(icon_cells(),ix,TOP,U/2,Y)+f'<path fill="{text}" d="{WORD}"/>'
    x0=ix-pad; y0=TOP-pad; return wsvg(f'{x0:.1f} {y0} {TX1+pad-x0:.1f} {DESC+pad-y0}',body)
def wordmark(text):
    return wsvg(f'{TX0-pad} {TOP-pad} {TX1-TX0+2*pad} {DESC-TOP+2*pad}',f'<path fill="{text}" d="{WORD}"/>')
def icon(bg=None,dither=True,col=Y,size=None):
    # 50x38 art centred in a 66x66 square
    body=(f'<rect width="66" height="66" fill="{bg}"/>' if bg else '')+rects(icon_cells(dither),8,14,1,col)
    return wsvg('0 0 66 66',body,size,size)
files={
 f'{NAME}-logo-on-dark.svg':lockup(C),f'{NAME}-logo-on-light.svg':lockup(K),
 f'{NAME}-name-on-dark.svg':wordmark(C),f'{NAME}-name-on-light.svg':wordmark(K),
 f'{NAME}-icon.svg':icon(),f'{NAME}-icon-black.svg':icon(col=K),
 f'{NAME}-app-icon.svg':icon(K),f'{NAME}-app-icon-yellow.svg':icon(Y,col=K),
 f'{NAME}-icon-small.svg':icon(K,dither=False),
}
os.makedirs(OUT,exist_ok=True)
for n,s in files.items(): open(OUT+'/'+n,'w').write(s)

# Raster icons. The tab icon is drawn natively at each size (no resampling),
# with a transparent background, using the same dissolve as the logo.
from PIL import Image
yellow=(244,212,77); black=(9,9,9)
def raster(size, bg, fg):
    im=Image.new('RGB',(66,66),bg); px=im.load()
    for x,y in icon_cells(): px[x+8,y+14]=fg
    return im.resize((size,size),Image.NEAREST)
def tab_icon(n):
    k=n/50
    h=max(3,round(10*k)); g=max(1,round(4*k))
    widths=[n,round(26*k),round(18*k)]
    top=(n-(3*h+2*g))//2
    im=Image.new('RGBA',(n,n),(0,0,0,0)); px=im.load()
    for i,w in enumerate(widths):
        x0=n-w; y0=top+i*(h+g)
        for y in range(y0,y0+h):
            for x in range(x0,n):
                f=(x-x0+0.5)/w
                if B[y%4][x%4]/16 < f*1.9-0.15: px[x,y]=yellow+(255,)
    return im
if '--site' in sys.argv: raster(180,black,yellow).save('src/app/(frontend)/apple-icon.png')
ico=[tab_icon(n) for n in (16,32,48)]
for p in (('src/app/favicon.ico','src/app/(frontend)/favicon.ico') if '--site' in sys.argv else ()):
    ico[2].save(p,sizes=[(16,16),(32,32),(48,48)],append_images=ico[:2])
for n,im in zip((16,32,48),ico): im.save(f'{OUT}/{NAME}-tab-icon-{n}.png')
