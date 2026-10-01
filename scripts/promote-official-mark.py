"""Promote AI mark extract to production PNGs with exact brand navy."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
APP = ROOT / "src" / "app"
SRC_NAVY = Path(r"C:\Users\damia\.cursor\projects\c-Users-damia-Projects-lob\assets\lob-mark-official-navy.jpg")
NAVY = (0, 18, 51, 255)
WHITE = (255, 255, 255, 255)
GOLD = (181, 129, 53, 255)
CLEAR = (0, 0, 0, 0)


def to_navy_on_white(src: Image.Image, size: int = 1024) -> Image.Image:
    im = src.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
    px = im.load()
    out = Image.new("RGBA", (size, size), WHITE)
    op = out.load()
    for y in range(size):
        for x in range(size):
            r, g, b, a = px[x, y]
            # dark / navy-ish pixels → brand navy
            if r < 100 and g < 110 and b < 140 and (r + g + b) < 280:
                op[x, y] = NAVY
            else:
                op[x, y] = WHITE
    return out


def to_white_knockout(navy_on_white: Image.Image) -> Image.Image:
    size = navy_on_white.size[0]
    px = navy_on_white.load()
    out = Image.new("RGBA", (size, size), CLEAR)
    op = out.load()
    for y in range(size):
        for x in range(size):
            r, g, b, a = px[x, y]
            if r < 40 and g < 50 and b < 90:
                op[x, y] = WHITE
    return out


def favicon_tile(knockout: Image.Image, size: int) -> Image.Image:
    tile = Image.new("RGBA", (size, size), NAVY)
    mark = knockout.resize((size, size), Image.Resampling.LANCZOS)
    tile.alpha_composite(mark)
    return tile.convert("RGB")


def try_font(size: int):
    for c in (r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\arial.ttf"):
        if Path(c).exists():
            return ImageFont.truetype(c, size=size)
    return ImageFont.load_default()


def build_lockup(mark_navy_white: Image.Image, dark: bool) -> Image.Image:
    W, H = 1024, 420
    bg = NAVY if dark else WHITE
    fg = WHITE if dark else NAVY
    canvas = Image.new("RGBA", (W, H), bg)
    mark_size = 240
    if dark:
        knock = to_white_knockout(mark_navy_white).resize((mark_size, mark_size), Image.Resampling.LANCZOS)
        canvas.alpha_composite(knock, (40, (H - mark_size) // 2))
    else:
        m = mark_navy_white.resize((mark_size, mark_size), Image.Resampling.LANCZOS)
        canvas.alpha_composite(m, (40, (H - mark_size) // 2))

    d = ImageDraw.Draw(canvas)
    rule_x = 40 + mark_size + 28
    d.rectangle([rule_x, H // 2 - 72, rule_x + 4, H // 2 + 72], fill=GOLD)
    font_lob = try_font(92)
    font_sub = try_font(26)
    text_x = rule_x + 32
    d.text((text_x, H // 2 - 78), "LOB", font=font_lob, fill=fg)
    d.text((text_x, H // 2 + 30), "LUMBER ONE BOARD", font=font_sub, fill=fg)
    return canvas


def write_svg(path: Path) -> None:
    # Approximate nested L + inverted L geometry for vector source
    path.write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Lumber One Board mark">
  <!-- Outer L (left + bottom) -->
  <path fill="#001233" d="M14 14h16v56h56v16H14z"/>
  <!-- Inverted L (top + right) -->
  <path fill="#001233" d="M38 14h48v16H54v40H38z"/>
  <!-- Inner L -->
  <path fill="#001233" d="M38 38h16v28h28v16H38z"/>
</svg>
""",
        encoding="utf-8",
    )


def build_lockup_knockout(knock: Image.Image) -> Image.Image:
    """Full logo white+gold on transparent for navy masthead."""
    W, H = 1100, 320
    canvas = Image.new("RGBA", (W, H), CLEAR)
    ms = 220
    canvas.alpha_composite(knock.resize((ms, ms), Image.Resampling.LANCZOS), (24, (H - ms) // 2))
    d = ImageDraw.Draw(canvas)
    rule_x = 24 + ms + 28
    d.rectangle([rule_x, H // 2 - 70, rule_x + 4, H // 2 + 70], fill=GOLD)
    font_lob = try_font(96)
    font_sub = try_font(26)
    text_x = rule_x + 32
    d.text((text_x, H // 2 - 78), "LOB", font=font_lob, fill=WHITE)
    d.text((text_x, H // 2 + 28), "LUMBER ONE BOARD", font=font_sub, fill=WHITE)
    bbox = canvas.getbbox()
    assert bbox is not None
    trimmed = canvas.crop(bbox)
    pad = 16
    out = Image.new("RGBA", (trimmed.width + pad * 2, trimmed.height + pad * 2), CLEAR)
    out.alpha_composite(trimmed, (pad, pad))
    return out


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    APP.mkdir(parents=True, exist_ok=True)

    src = Image.open(SRC_NAVY)
    icon = to_navy_on_white(src, 1024)
    knock = to_white_knockout(icon)

    icon.convert("RGB").save(BRAND / "lob-app-icon.png", optimize=True)
    icon.convert("RGB").save(BRAND / "lob-mark-compact.png", optimize=True)
    knock.save(BRAND / "lob-app-icon-knockout.png", optimize=True)
    write_svg(BRAND / "lob-mark.svg")

    # Favicon = mark only
    favicon_tile(knock, 512).save(APP / "icon.png", optimize=True)
    favicon_tile(knock, 180).save(APP / "apple-icon.png", optimize=True)

    # Main logo = full lockup
    build_lockup(icon, False).save(BRAND / "lob-brand-lockup.png", optimize=True)
    build_lockup(icon, True).save(BRAND / "lob-dark-lockup.png", optimize=True)
    build_lockup_knockout(knock).save(BRAND / "lob-lockup-knockout.png", optimize=True)

    confirmed = BRAND / "confirmed"
    confirmed.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGB", (560, 200), (250, 248, 245))
    sheet.paste(icon.convert("RGB").resize((160, 160), Image.Resampling.LANCZOS), (20, 20))
    sheet.paste(favicon_tile(knock, 160), (200, 20))
    for i, s in enumerate((16, 32, 48, 64)):
        sheet.paste(icon.resize((s, s), Image.Resampling.LANCZOS).convert("RGB"), (390 + i * 40, 30))
        sheet.paste(favicon_tile(knock, s), (390 + i * 40, 110))
    sheet.save(confirmed / "new-mark-preview-sheet.png")
    print("Promoted official hybrid-05 mark to public/brand + app icons")


if __name__ == "__main__":
    main()
