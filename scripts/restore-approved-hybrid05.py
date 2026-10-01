"""
Freeze brand assets to the approved hybrid-05 lockup.
No geometry experiments. Source: hybrids-02x06 + approved mark extract.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
APP = ROOT / "src" / "app"
HYBRID = ROOT / ".tmp-previews" / "logo-iters" / "hybrids-02x06"
ASSETS = Path(r"C:\Users\damia\.cursor\projects\c-Users-damia-Projects-lob\assets")

NAVY = (0, 18, 51)
GOLD_MIN_R = 140


def force_navy_bg(im: Image.Image) -> Image.Image:
    rgb = im.convert("RGB")
    px = rgb.load()
    w, h = rgb.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            # keep near-white
            if r > 200 and g > 200 and b > 200:
                px[x, y] = (255, 255, 255)
                continue
            # keep gold
            if r > GOLD_MIN_R and g > 80 and b < 130 and r > b + 30:
                continue
            # dark / navy-ish -> brand navy
            if r < 90 and g < 100 and b < 140:
                px[x, y] = NAVY
    return rgb


def force_navy_ink_on_white(im: Image.Image) -> Image.Image:
    rgb = im.convert("RGB")
    px = rgb.load()
    w, h = rgb.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r > GOLD_MIN_R and g > 80 and b < 130 and r > b + 30:
                continue
            if r < 100 and g < 110 and b < 150:
                px[x, y] = NAVY
            elif r + g + b > 600:
                px[x, y] = (255, 255, 255)
    return rgb


def to_knockout_from_dark(dark: Image.Image) -> Image.Image:
    """White + gold on transparent from navy-field lockup."""
    rgb = dark.convert("RGB")
    w, h = rgb.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sp, op = rgb.load(), out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = sp[x, y]
            if r > 200 and g > 200 and b > 200:
                op[x, y] = (255, 255, 255, 255)
            elif r > GOLD_MIN_R and g > 80 and b < 130 and r > b + 30:
                op[x, y] = (181, 129, 53, 255)
    bbox = out.getbbox()
    if not bbox:
        return out
    trimmed = out.crop(bbox)
    pad = 16
    canvas = Image.new("RGBA", (trimmed.width + pad * 2, trimmed.height + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(trimmed, (pad, pad))
    return canvas


def mark_from_favicon_src(src: Image.Image, size: int = 1024) -> tuple[Image.Image, Image.Image]:
    """Return (navy-on-white, white-knockout)."""
    im = src.convert("RGB").resize((size, size), Image.Resampling.LANCZOS)
    light = Image.new("RGB", (size, size), (255, 255, 255))
    knock = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sp, lp, kp = im.load(), light.load(), knock.load()
    for y in range(size):
        for x in range(size):
            r, g, b = sp[x, y]
            # treat light / white mark pixels (on navy tile) as mark
            if r > 180 and g > 180 and b > 180:
                lp[x, y] = NAVY
                kp[x, y] = (255, 255, 255, 255)
            elif r < 80 and g < 90 and b < 120:
                # navy field on source — leave white on light icon
                pass
            elif r + g + b > 400:
                lp[x, y] = NAVY
                kp[x, y] = (255, 255, 255, 255)
    return light, knock


def favicon_tile(knock: Image.Image, size: int) -> Image.Image:
    tile = Image.new("RGBA", (size, size), (*NAVY, 255))
    m = knock.resize((size, size), Image.Resampling.LANCZOS)
    tile.alpha_composite(m)
    return tile.convert("RGB")


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    APP.mkdir(parents=True, exist_ok=True)

    # Prefer original hybrid-05 files (approved look), fallback to regenerated
    dark_src = HYBRID / "lob-hybrid-05-inverted-navy-bg.jpg"
    light_src = HYBRID / "lob-hybrid-05-gold-rule-navy-mark.jpg"
    mark_src = ASSETS / "lob-approved-mark-only.jpg"
    if not mark_src.exists():
        mark_src = ASSETS / "lob-mark-official-navy.jpg"

    dark = force_navy_bg(Image.open(dark_src))
    light = force_navy_ink_on_white(Image.open(light_src))

    dark.save(BRAND / "lob-dark-lockup.png", optimize=True)
    light.save(BRAND / "lob-brand-lockup.png", optimize=True)

    knockout = to_knockout_from_dark(dark)
    knockout.save(BRAND / "lob-lockup-knockout.png", optimize=True)

    # Mark / favicon from approved mark-only extract
    if mark_src.exists():
        light_icon, knock_icon = mark_from_favicon_src(Image.open(mark_src), 1024)
    else:
        # crop mark from dark lockup left third
        w, h = dark.size
        crop = dark.crop((0, 0, w // 3, h)).resize((1024, 1024), Image.Resampling.LANCZOS)
        light_icon, knock_icon = mark_from_favicon_src(crop, 1024)

    light_icon.save(BRAND / "lob-app-icon.png", optimize=True)
    light_icon.save(BRAND / "lob-mark-compact.png", optimize=True)
    knock_icon.save(BRAND / "lob-app-icon-knockout.png", optimize=True)

    favicon_tile(knock_icon, 512).save(APP / "icon.png", optimize=True)
    favicon_tile(knock_icon, 180).save(APP / "apple-icon.png", optimize=True)

    # Update brand.ts dimensions from actual files
    dims = {
        "lockup_knockout": knockout.size,
        "brand_lockup": light.size,
        "dark_lockup": dark.size,
    }
    print("Restored approved hybrid-05 assets:", dims)


if __name__ == "__main__":
    main()
