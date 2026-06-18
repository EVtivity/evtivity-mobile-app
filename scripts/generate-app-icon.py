#!/usr/bin/env python3
# Copyright (c) 2024-2026 EVtivity. All rights reserved.
# SPDX-License-Identifier: BUSL-1.1
#
# Regenerate the app icons from assets/logo.png. The logo is tight-cropped, then
# centered on a square canvas at a configurable scale and background color.
#
#   python3 scripts/generate-app-icon.py [bgColor] [scale]
#
# Defaults: bg #0f172a, scale 0.70 (logo occupies 70% of the icon).
#
# Outputs:
#   assets/icon.png          iOS icon, opaque background (iOS bakes the bg in)
#   assets/adaptive-icon.png Android foreground, transparent (Android draws the
#                            background from app.config.ts android.adaptiveIcon
#                            .backgroundColor)

import sys
from PIL import Image

BG = sys.argv[1] if len(sys.argv) > 1 else "#0f172a"
SCALE = float(sys.argv[2]) if len(sys.argv) > 2 else 0.70
SIZE = 1024


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


logo = Image.open("assets/logo.png").convert("RGBA")
bbox = logo.getbbox()
if bbox is not None:
    logo = logo.crop(bbox)

# Android adaptive icons render only the central safe zone (~2/3 of the 108dp
# foreground), so the launcher effectively zooms the foreground ~1.5x. To make
# the logo APPEAR at SCALE of the visible icon on Android, the foreground content
# must be SCALE * 2/3 of the canvas. iOS has no such zoom, so its icon uses SCALE
# directly.
SAFE_ZONE = 2 / 3
ADAPTIVE_SCALE = SCALE * SAFE_ZONE


def place(scale: float) -> tuple[Image.Image, tuple[int, int]]:
    target = int(SIZE * scale)
    w, h = logo.size
    ratio = target / max(w, h)
    resized = logo.resize((round(w * ratio), round(h * ratio)), Image.LANCZOS)
    rw, rh = resized.size
    return resized, ((SIZE - rw) // 2, (SIZE - rh) // 2)


ios_logo, ios_offset = place(SCALE)
icon = Image.new("RGBA", (SIZE, SIZE), hex_to_rgb(BG) + (255,))
icon.alpha_composite(ios_logo, ios_offset)
icon.convert("RGB").save("assets/icon.png")

android_logo, android_offset = place(ADAPTIVE_SCALE)
foreground = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
foreground.alpha_composite(android_logo, android_offset)
foreground.save("assets/adaptive-icon.png")

print(
    f"wrote assets/icon.png (iOS scale={SCALE}) and "
    f"assets/adaptive-icon.png (Android foreground scale={ADAPTIVE_SCALE:.3f}), bg={BG}"
)
