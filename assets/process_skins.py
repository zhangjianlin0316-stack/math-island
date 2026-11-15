"""Upscale generated art 4x with Real-ESRGAN (realesr-general-x4v3, SRVGGNetCompact) on CPU,
remove the white background from characters/pets, and export display WebPs."""
import glob, os, sys, numpy as np, torch, torch.nn as nn, torch.nn.functional as Fn
from PIL import Image, ImageFilter
from scipy import ndimage
torch.set_num_threads(8)
class SRVGG(nn.Module):
    def __init__(s, nf=64, nc=32, up=4):
        super().__init__(); s.up = up
        b = [nn.Conv2d(3, nf, 3, 1, 1), nn.PReLU(nf)]
        for _ in range(nc): b += [nn.Conv2d(nf, nf, 3, 1, 1), nn.PReLU(nf)]
        b += [nn.Conv2d(nf, 3 * up * up, 3, 1, 1)]
        s.body = nn.ModuleList(b); s.ps = nn.PixelShuffle(up)
    def forward(s, x):
        o = x
        for m in s.body: o = m(o)
        return s.ps(o) + Fn.interpolate(x, scale_factor=s.up, mode="nearest")
net = SRVGG(); sd = torch.load("models/realesr-general-x4v3.pth", map_location="cpu")
net.load_state_dict(sd.get("params", sd)); net.eval()
def upscale(img):
    x = torch.from_numpy(np.asarray(img.convert("RGB"), dtype=np.float32) / 255).permute(2, 0, 1)[None]
    H, W = x.shape[2:]; T = 256; P = 12; out = torch.zeros(1, 3, H * 4, W * 4)
    with torch.no_grad():
        for y in range(0, H, T):
            for xx in range(0, W, T):
                y0, x0, y1, x1 = max(y - P, 0), max(xx - P, 0), min(y + T + P, H), min(xx + T + P, W)
                o = net(x[:, :, y0:y1, x0:x1])
                oy, ox = (y - y0) * 4, (xx - x0) * 4; h, w = min(T, H - y) * 4, min(T, W - xx) * 4
                out[:, :, y * 4:y * 4 + h, xx * 4:xx * 4 + w] = o[:, :, oy:oy + h, ox:ox + w]
    return Image.fromarray((out[0].clamp(0, 1).permute(1, 2, 0).numpy() * 255).round().astype(np.uint8))
_rs = None
def white_mask(img):
    global _rs
    from rembg import remove, new_session
    if _rs is None: _rs = new_session("isnet-general-use")
    return remove(img, session=_rs, only_mask=True).convert("L")
def _old_mask(img, thr=232):
    a = np.asarray(img.convert("RGB")).astype(int)
    near = (a.min(axis=2) > thr) & ((a.max(axis=2) - a.min(axis=2)) < 22)
    lab, _ = ndimage.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    bg = ndimage.binary_opening(bg, iterations=1)
    alpha = Image.fromarray(((~bg) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    return alpha
FULL = "assets/skins-full"; DISP = "web/dist/skins"; os.makedirs(DISP, exist_ok=True)
for f in sorted(glob.glob(f"{FULL}/*.jpg")):
    name = os.path.basename(f)[:-4]
    if name.endswith("_4x"): continue
    img = Image.open(f).convert("RGB")
    cut = not name.startswith("bg_")
    alpha = white_mask(img) if cut else None
    out4 = f"{FULL}/{name}_4x.webp"
    if not os.path.exists(out4) or (cut and not os.path.exists(f"{FULL}/{name}_cutout.png.v2")):
        big = Image.open(out4).convert("RGB") if os.path.exists(out4) else upscale(img)
        if cut: big.putalpha(alpha.resize(big.size, Image.LANCZOS)); open(f"{FULL}/{name}_cutout.png.v2", "w").close()
        big.save(out4, "WEBP", quality=92, method=4)
        print(name, "4x", big.size, os.path.getsize(out4) // 1024, "KB", flush=True)
    if cut:
        rgba = img.copy(); rgba.putalpha(alpha); rgba.save(f"{FULL}/{name}_cutout.png")
    disp = img.copy()
    if cut: disp.putalpha(alpha)
    size = (480, 640) if not name.startswith("pet_") else (360, 360)
    disp = disp.resize(size, Image.LANCZOS)
    disp.save(f"{DISP}/{name}.webp", "WEBP", quality=80, method=6)
    print(name, "display", size, os.path.getsize(f"{DISP}/{name}.webp") // 1024, "KB", flush=True)
