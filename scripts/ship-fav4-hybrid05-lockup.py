"""
Ship Favorite-4 mark + hybrid-05 type (gold ONE) into public/brand.

Writes:
  - lob-lockup-knockout.png  (masthead — white+gold on transparent)
  - lob-dark-lockup.png      (same on navy)
  - lob-brand-lockup.png     (navy+gold on white, light/print)
  - lob-app-icon.png / knockout / mark-compact (Fav4 mark, keeps mark consistent)

Does not commit. Run from repo root:
  python scripts/ship-fav4-hybrid05-lockup.py
"""
from __future__ import annotations

import importlib.util
import shutil
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
APP = ROOT / "src" / "app"
PREVIEW = (
    ROOT
    / ".tmp-previews"
    / "logo-iters"
    / "lob-block-v3"
    / "olb-sketch"
    / "build_pref_type_gold_one.py"
)
OLB = ROOT / ".tmp-previews" / "logo-iters" / "lob-block-v3" / "build_olb_from_sketch.py"

NAVY = (0, 18, 51)
WHITE = (255, 255, 255)
GOLD = (181, 129, 53)
CLEAR = (0, 0, 0, 0)


def load_pref():
    spec = importlib.util.spec_from_file_location("pref", PREVIEW)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


def load_olb():
    spec = importlib.util.spec_from_file_location("olb", OLB)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


def dark_to_knockout(dark_rgb: Image.Image) -> Image.Image:
    rgb = dark_rgb.convert("RGB")
    out = Image.new("RGBA", rgb.size, CLEAR)
    sp, op = rgb.load(), out.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = sp[x, y]
            if r > 200 and g > 200 and b > 200:
                op[x, y] = (255, 255, 255, 255)
            elif r > 140 and 80 < g < 170 and b < 100 and r > b + 30:
                op[x, y] = (*GOLD, 255)
    bbox = out.getbbox()
    if not bbox:
        return out
    trimmed = out.crop(bbox)
    pad = 24
    canvas = Image.new(
        "RGBA", (trimmed.width + pad * 2, trimmed.height + pad * 2), CLEAR
    )
    canvas.alpha_composite(trimmed, (pad, pad))
    return canvas


def dark_to_light(dark_rgb: Image.Image, size: tuple[int, int] = (1280, 720)) -> Image.Image:
    """Navy + gold ink on white field, letterboxed into size."""
    rgb = dark_rgb.convert("RGB")
    ko = dark_to_knockout(rgb)
    # Recolor white → navy for light field
    light_ink = Image.new("RGBA", ko.size, CLEAR)
    kp, lp = ko.load(), light_ink.load()
    for y in range(ko.height):
        for x in range(ko.width):
            r, g, b, a = kp[x, y]
            if a < 10:
                continue
            if r > 200 and g > 200 and b > 200:
                lp[x, y] = (*NAVY, a)
            else:
                lp[x, y] = (r, g, b, a)

    canvas = Image.new("RGB", size, WHITE)
    # Fit lockup into ~78% of frame
    max_w, max_h = int(size[0] * 0.88), int(size[1] * 0.62)
    scale = min(max_w / light_ink.width, max_h / light_ink.height)
    nw = max(1, int(light_ink.width * scale))
    nh = max(1, int(light_ink.height * scale))
    fitted = light_ink.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.paste(
        fitted,
        ((size[0] - nw) // 2, (size[1] - nh) // 2),
        fitted,
    )
    return canvas


def fav4_mark_pair(olb, size: int = 1024) -> tuple[Image.Image, Image.Image]:
    w = olb.WEIGHTS["thick"]
    mark = olb.draw_structure_a(
        size,
        T=w["T"],
        G=w["G"],
        pad=w["pad"],
        gap=olb.NAVY,
        o_scale=0.75,
        g_outer_scale=1.0,
        o_radius=2.8,
        o_radius_inner=1.1,
        b_right_radius=0.9,
    ).convert("RGB")
    # Light: navy ink on white
    light = Image.new("RGB", (size, size), WHITE)
    mp = mark.load()
    lp = light.load()
    for y in range(size):
        for x in range(size):
            r, g, b = mp[x, y]
            if r > 200 and g > 200 and b > 200:
                lp[x, y] = NAVY
    # Knockout: white on transparent
    ko = Image.new("RGBA", (size, size), CLEAR)
    kp = ko.load()
    for y in range(size):
        for x in range(size):
            r, g, b = mp[x, y]
            if r > 200 and g > 200 and b > 200:
                kp[x, y] = (255, 255, 255, 255)
    return light, ko


def backup(path: Path, bak_dir: Path) -> None:
    if path.exists():
        shutil.copy2(path, bak_dir / path.name)


def main() -> None:
    pref = load_pref()
    olb = load_olb()

    bak = (
        BRAND
        / "catalog"
        / f"pre-fav4-ship-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    )
    bak.mkdir(parents=True, exist_ok=True)

    # Frozen hybrid-05 type plate (pre-Fav4). Fallback: current dark lockup.
    type_source = BRAND / "sources" / "hybrid05-type-source-dark.png"
    if not type_source.exists():
        type_source = BRAND / "lob-dark-lockup.png"
    dark_src = Image.open(type_source)
    type_rgba = pref.extract_type_rgba(dark_src)

    w = olb.WEIGHTS["thick"]

    def draw_mark(size: int) -> Image.Image:
        return olb.draw_structure_a(
            size,
            T=w["T"],
            G=w["G"],
            pad=w["pad"],
            gap=olb.NAVY,
            o_scale=0.75,
            g_outer_scale=1.0,
            o_radius=2.8,
            o_radius_inner=1.1,
            b_right_radius=0.9,
        )

    lock = pref.compose_lockup(
        draw_mark, type_rgba, mark_size=560, type_to_mark_ink=0.90
    )
    dark = lock.convert("RGB")
    knockout = dark_to_knockout(dark)
    light = dark_to_light(dark, (1280, 720))
    mark_light, mark_ko = fav4_mark_pair(olb, 1024)

    targets = {
        BRAND / "lob-dark-lockup.png": dark,
        BRAND / "lob-lockup-knockout.png": knockout,
        BRAND / "lob-brand-lockup.png": light,
        BRAND / "lob-app-icon.png": mark_light,
        BRAND / "lob-app-icon-knockout.png": mark_ko,
        BRAND / "lob-mark-compact.png": mark_light,
    }

    for path, im in targets.items():
        backup(path, bak)
        im.save(path, optimize=True)
        print(f"wrote {path.relative_to(ROOT)} {im.size} {im.mode}")

    # Favicon from knockout mark on navy (match existing app/icon.png pattern)
    icon_path = APP / "icon.png"
    if icon_path.exists():
        backup(icon_path, bak)
    tile = 512
    fav = Image.new("RGB", (tile, tile), NAVY)
    mk = mark_ko.resize((tile, tile), Image.Resampling.LANCZOS)
    fav.paste(mk, (0, 0), mk)
    # slight inset so mark isn't edge-clipped
    inset = int(tile * 0.08)
    inner = tile - inset * 2
    fav2 = Image.new("RGB", (tile, tile), NAVY)
    mk2 = mark_ko.resize((inner, inner), Image.Resampling.LANCZOS)
    fav2.paste(mk2, (inset, inset), mk2)
    fav2.save(icon_path, optimize=True)
    print(f"wrote {icon_path.relative_to(ROOT)} {fav2.size}")

    print("backup ->", bak.relative_to(ROOT))
    print("Update brand.ts widths/heights to match:")
    print(f"  knockout {knockout.size}")
    print(f"  dark     {dark.size}")
    print(f"  light    {light.size}")


if __name__ == "__main__":
    main()
