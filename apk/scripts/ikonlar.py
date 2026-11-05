# Luna'nın simgesinden Android uygulama simgelerini ve açılış görsellerini üretir (bir kez çalıştırılır, çıktılar depoda durur).
# Kullanım: python3 -I apk/scripts/ikonlar.py   (depo kökünden)
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
RES = os.path.join(ROOT, 'apk', 'android', 'app', 'src', 'main', 'res')
src = Image.open(os.path.join(ROOT, 'icons', 'icon-512-maskable.png')).convert('RGBA')
BG = (36, 28, 61)  # Luna'nın açılış rengi #241c3d
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def resized(size):
    return src.resize((size, size), Image.LANCZOS)


def rounded(img, radius_ratio):
    mask = Image.new('L', img.size, 0)
    r = int(img.size[0] * radius_ratio)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], r, fill=255)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


for name, d in DENS.items():
    folder = os.path.join(RES, 'mipmap-' + name)
    # Uyarlanabilir simge (Android 8+): 108dp katman; görünen orta 72dp'ye kedinin yüzü sığsın diye resim %88
    layer = int(108 * d)
    fg = Image.new('RGBA', (layer, layer), (0, 0, 0, 0))
    inner = int(layer * 0.88)
    fg.paste(resized(inner), ((layer - inner) // 2, (layer - inner) // 2))
    fg.save(os.path.join(folder, 'ic_launcher_foreground.png'))
    # Eski Android'ler için kare ve yuvarlak simge (48dp)
    size = int(48 * d)
    rounded(resized(size), 0.22).save(os.path.join(folder, 'ic_launcher.png'))
    circle = Image.new('L', (size, size), 0)
    ImageDraw.Draw(circle).ellipse([0, 0, size - 1, size - 1], fill=255)
    rnd = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    rnd.paste(resized(size), (0, 0), circle)
    rnd.save(os.path.join(folder, 'ic_launcher_round.png'))

# Açılış görselleri: Luna'nın koyu açılış rengi, ortada simge (mevcut boyutlar korunur)
for folder in sorted(os.listdir(RES)):
    p = os.path.join(RES, folder, 'splash.png')
    if not os.path.exists(p):
        continue
    w, h = Image.open(p).size
    canvas = Image.new('RGB', (w, h), BG)
    s = int(min(w, h) * 0.28)
    icon = rounded(resized(s), 0.22)
    canvas.paste(icon, ((w - s) // 2, (h - s) // 2), icon)
    canvas.save(p)
print('simgeler ve açılış görselleri hazır')
