#!/usr/bin/env python3
"""Génère les icônes PWA (192, 512, maskable) dans public/icons/.

Dessine un avion en papier ambre sur fond bleu nuit, cohérent avec la charte
de l'app (amber #f0a020 sur navy #070c14). Lancer :  python3 scripts/generate-icons.py
Dépend de Pillow (PIL).
"""
import os
from PIL import Image, ImageDraw, ImageFilter

NAVY_TOP    = (16, 26, 46)
NAVY_BOT    = (7, 12, 20)
AMBER       = (240, 160, 32)
AMBER_SHADE = (190, 120, 18)
BORDER      = (52, 78, 116)

LANCZOS = Image.Resampling.LANCZOS


def vgradient(size, top, bot):
    """Dégradé vertical top→bot."""
    w, h = size
    col = Image.new('RGB', (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        col.putpixel((0, y), (
            int(top[0] + (bot[0] - top[0]) * t),
            int(top[1] + (bot[1] - top[1]) * t),
            int(top[2] + (bot[2] - top[2]) * t),
        ))
    return col.resize((w, h))


def draw_plane(draw, cx, cy, s, main, shade):
    """Avion en papier pointant vers le haut, centré sur (cx, cy)."""
    tip   = (cx,          cy - s * 1.00)
    bl    = (cx - s*0.82, cy + s * 0.78)
    notch = (cx,          cy + s * 0.42)
    br    = (cx + s*0.82, cy + s * 0.78)
    draw.polygon([tip, bl, notch], fill=main)    # face gauche (claire)
    draw.polygon([tip, notch, br], fill=shade)   # face droite (ombrée)


def make_icon(size, maskable=False):
    ss = 4
    big = size * ss
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    grad = vgradient((big, big), NAVY_TOP, NAVY_BOT).convert('RGBA')

    if maskable:
        # Plein cadre (l'OS applique son propre masque) ; icône dans la zone sûre
        img = grad
        plane_s = big * 0.26
    else:
        radius = int(big * 0.22)
        mask = Image.new('L', (big, big), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, big - 1, big - 1], radius=radius, fill=255)
        img.paste(grad, (0, 0), mask)
        ImageDraw.Draw(img).rounded_rectangle(
            [ss, ss, big - 1 - ss, big - 1 - ss],
            radius=radius, outline=BORDER, width=ss * 2,
        )
        plane_s = big * 0.30

    # Halo ambre derrière l'avion
    glow = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    r = plane_s * 1.6
    ImageDraw.Draw(glow).ellipse(
        [big/2 - r, big/2 - r, big/2 + r, big/2 + r], fill=(240, 160, 32, 70),
    )
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(big * 0.04)))

    # Avion
    plane = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    draw_plane(ImageDraw.Draw(plane), big/2, big/2 + plane_s * 0.08, plane_s, AMBER, AMBER_SHADE)
    img = Image.alpha_composite(img, plane)

    return img.resize((size, size), LANCZOS)


def main():
    out = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
    os.makedirs(out, exist_ok=True)
    make_icon(192).save(os.path.join(out, 'icon-192.png'))
    make_icon(512).save(os.path.join(out, 'icon-512.png'))
    make_icon(512, maskable=True).save(os.path.join(out, 'icon-maskable.png'))
    print('Icônes générées dans', os.path.abspath(out))


if __name__ == '__main__':
    main()
