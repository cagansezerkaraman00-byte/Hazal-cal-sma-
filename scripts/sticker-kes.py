#!/usr/bin/env python3
"""Sticker sayfası fotoğraflarından tek tek sticker keser (sticker defteri için).

Arka planı (düz kâğıt, ızgara, açık gri) siler, her stickerın etrafına beyaz kesim kenarı ekler ve küçük, saydam WebP olarak kaydeder.
Gerekenler: Python 3, Pillow, numpy, scipy  (pip install pillow numpy scipy)

Kullanım:
  python3 scripts/sticker-kes.py <png klasörü> <çıkış klasörü> [s01,s02] ['{"erode": 7, "tf": 0.75}']
  - Dosyalar adındaki sayıya göre s01, s02… önekini alır; çıktılar s01-01.webp, s01-02.webp… olur.
  - Sıkışık sayfalarda stickerlar birbirine yapışırsa "erode" (7 gibi) büyütülür; dokulu arka planda "tf" (0.75 gibi) artırılır.
  - Yarım kalan parçalar elle ayıklanır; seçilenler assets/stickers/<paket>/ içine kopyalanıp js/stickers.js'te bir bölüme yazılır.
"""
import sys, os, json
import numpy as np
from scipy import ndimage as ndi
from PIL import Image, ImageFilter


def cut(path, out_dir, prefix, size=192, border=7, thr=26, min_area=900, erode=3, tf=0.55):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    h, w, _ = a.shape
    edge = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    bg = np.median(edge, axis=0)
    d = np.linalg.norm(a - bg, axis=2)
    # eşik: arka planın kendi dokusunun (kâğıt, ızgara) üstünde kalsın (Otsu, en az thr)
    hist, edges = np.histogram(d, bins=256, range=(0, 256))
    p = hist / hist.sum(); om = np.cumsum(p); mu = np.cumsum(p * np.arange(256)); mt = mu[-1]
    sb = (mt * om - mu) ** 2 / (om * (1 - om) + 1e-9)
    otsu = float(np.argmax(sb))
    t = max(thr, min(otsu * tf, 70))
    mask = d > t
    mask = ndi.binary_opening(mask, structure=np.ones((7, 7)))          # ince ızgara çizgileri ve toz gider
    mask = ndi.binary_closing(mask, structure=np.ones((5, 5)))
    mask = ndi.binary_fill_holes(mask)
    core = ndi.binary_erosion(mask, structure=np.ones((3, 3)), iterations=erode)  # birbirine değen stickerlar ayrılsın
    lab, n = ndi.label(core)
    if n == 0: return []
    # her piksel en yakın çekirdeğe (yalnızca maske içinde)
    dist, (iy, ix) = ndi.distance_transform_edt(lab == 0, return_indices=True)
    full = np.where(mask & (dist < 8), lab[iy, ix], 0)
    objs = ndi.find_objects(full)
    items = []
    for i, sl in enumerate(objs, start=1):
        if sl is None: continue
        m = full[sl] == i
        if m.sum() < min_area: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        items.append((y0, x0, y1, x1, i))
    # okuma sırası: satır satır (üstten alta, soldan sağa)
    items.sort(key=lambda t: (round(((t[0] + t[2]) / 2) / 120), (t[1] + t[3]) / 2))
    saved = []
    pad = border + 4
    for k, (y0, x0, y1, x1, i) in enumerate(items, start=1):
        Y0, X0, Y1, X1 = max(0, y0 - pad), max(0, x0 - pad), min(h, y1 + pad), min(w, x1 + pad)
        m = ndi.binary_fill_holes(full[Y0:Y1, X0:X1] == i)
        outline = ndi.binary_dilation(m, structure=np.ones((3, 3)), iterations=border)
        crop = a[Y0:Y1, X0:X1].copy()
        crop[outline & ~m] = 255  # beyaz kesim kenarı
        alpha = Image.fromarray((outline * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
        rgba = Image.fromarray(crop.astype(np.uint8)).convert('RGBA')
        rgba.putalpha(alpha)
        s = size / max(rgba.size)
        if s < 1: rgba = rgba.resize((max(1, round(rgba.width * s)), max(1, round(rgba.height * s))), Image.LANCZOS)
        name = f'{prefix}-{k:02d}'
        rgba.save(os.path.join(out_dir, name + '.webp'), 'WEBP', quality=84, method=6)
        saved.append({'id': name, 'w': rgba.width, 'h': rgba.height, 'box': [int(X0), int(Y0), int(X1), int(Y1)]})
    return saved

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    only = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] else None
    opts = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    for f in sorted(os.listdir(src)):
        if not f.lower().endswith('.png'): continue
        prefix = 's' + ''.join(ch for ch in f if ch.isdigit()).zfill(2)[-2:]
        if only and prefix not in only: continue
        print(f, len(cut(os.path.join(src, f), out, prefix, **opts)), 'sticker')
