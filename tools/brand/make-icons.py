import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT = sys.argv[1]
OUT = sys.argv[2]
BLUE, BLUE_D = (39, 71, 224), (26, 51, 176)
BLACK, RED, GOLD = (20, 22, 31), (221, 0, 0), (255, 200, 61)
S = 4  # supersampling

def gradient(size):
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x + y) / (w + h)
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip((52, 92, 245), BLUE_D))
    return img

def bubble(size, scale, color=(255, 255, 255), text_color=BLUE, flag=True, cut=False):
    """Speech bubble with 'A1', centred in a transparent canvas of `size`; scale = bubble width / size."""
    W = size * S
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bw = int(W * scale); bh = int(bw * 0.78)
    x0 = (W - bw) // 2; y0 = (W - bh) // 2 - int(bh * 0.06)
    r = int(bw * 0.24)
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=r, fill=color)
    # tail, bottom left
    tx = x0 + int(bw * 0.22); ty = y0 + bh - 2
    d.polygon([(tx, ty - int(bh * 0.1)), (tx + int(bw * 0.2), ty - 2), (tx - int(bw * 0.04), ty + int(bh * 0.2))], fill=color)
    # text
    font = ImageFont.truetype(FONT, int(bh * 0.56))
    text = "A1"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    cx = x0 + bw // 2; cy = y0 + int(bh * 0.44)
    tc = (0, 0, 0, 0) if cut else text_color
    if cut:
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).text((cx - tw // 2 - bbox[0], cy - th // 2 - bbox[1]), text, font=font, fill=255)
        img.putalpha(Image.composite(Image.new("L", img.size, 0), img.getchannel("A"), mask))
    else:
        d.text((cx - tw // 2 - bbox[0], cy - th // 2 - bbox[1]), text, font=font, fill=tc)
    if flag:
        fw = int(bw * 0.5); fh = int(bh * 0.07); fy = y0 + int(bh * 0.78)
        seg = fw // 3; fx = cx - fw // 2
        for i, c in enumerate((BLACK, RED, GOLD)):
            d.rounded_rectangle([fx + i * seg + (6 if i else 0), fy, fx + (i + 1) * seg - (6 if i < 2 else 0), fy + fh],
                                radius=fh // 2, fill=c)
    return img.resize((size, size), Image.LANCZOS)

def rounded_icon(size, radius_ratio=0.0):
    bg = gradient((size, size)).convert("RGBA")
    if radius_ratio:
        m = Image.new("L", (size * S, size * S), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, size * S - 1, size * S - 1], radius=int(size * S * radius_ratio), fill=255)
        bg.putalpha(m.resize((size, size), Image.LANCZOS))
    # soft shadow under bubble
    b = bubble(size, 0.66)
    shadow = Image.new("RGBA", b.size, (0, 0, 0, 0))
    shadow.putalpha(b.getchannel("A").point(lambda a: int(a * 0.25)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(size * 0.02))
    bg.alpha_composite(shadow, (0, int(size * 0.015)))
    bg.alpha_composite(b)
    return bg

# Store / iOS icon: full square (stores round the corners themselves)
rounded_icon(1024).convert("RGB").save(f"{OUT}/icon.png")
# Android adaptive: content inside the 66% safe zone
bubble(512, 0.5).save(f"{OUT}/android-icon-foreground.png")
gradient((512, 512)).convert("RGBA").save(f"{OUT}/android-icon-background.png")
bubble(432, 0.6, color=(255, 255, 255), flag=False, cut=True).save(f"{OUT}/android-icon-monochrome.png")
# Splash: rounded logo on transparent background
splash = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
splash.alpha_composite(rounded_icon(1024, 0.23))
splash.save(f"{OUT}/splash-icon.png")
rounded_icon(256, 0.23).resize((48, 48), Image.LANCZOS).save(f"{OUT}/favicon.png")
# Store extras
rounded_icon(512).convert("RGB").save(f"{OUT}/store-icon-512.png")
