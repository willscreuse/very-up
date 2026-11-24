#!/usr/bin/env python3
"""Génère l'identité visuelle de Very Up (icônes, écran de démarrage, favicon).

Usage : python3 tools/generate-brand.py   (nécessite rsvg-convert, paquet librsvg)
Les sources SVG sont écrites dans assets/brand/, les PNG dans assets/images/.
"""
import os
import subprocess

ROOT = os.path.join(os.path.dirname(__file__), '..')
BRAND = os.path.join(ROOT, 'assets', 'brand')
IMAGES = os.path.join(ROOT, 'assets', 'images')

NIGHT = '#160B2E'
GLOW = '#3A2378'
YELLOW = '#FFD23F'
PINK = '#FF4F8B'
TEAL = '#2EC4B6'

# Géométrie des cartes (repère 1024 × 1024).
CARD = dict(x=362, y=300, w=300, h=420, rx=44)
PIVOT = (512, 820)  # les cartes s'ouvrent en éventail depuis ce point
ARROW = 'M512 372 L626 498 L560 498 L560 628 L464 628 L464 498 L398 498 Z'


def card(fill, angle, extra=''):
    c = CARD
    return (
        f'<rect x="{c["x"]}" y="{c["y"]}" width="{c["w"]}" height="{c["h"]}" rx="{c["rx"]}" '
        f'fill="{fill}" transform="rotate({angle} {PIVOT[0]} {PIVOT[1]})" {extra}/>'
    )


def sparkle(cx, cy, r, fill):
    k = r * 0.28
    return (
        f'<path d="M{cx} {cy - r} Q{cx + k} {cy - k} {cx + r} {cy} Q{cx + k} {cy + k} {cx} {cy + r} '
        f'Q{cx - k} {cy + k} {cx - r} {cy} Q{cx - k} {cy - k} {cx} {cy - r} Z" fill="{fill}"/>'
    )


def mark(scale=1.0):
    """Le logo en couleurs, centré, mis à l'échelle autour du centre."""
    return f'''
  <g transform="translate(512 512) scale({scale}) translate(-512 -530)">
    <g filter="url(#shadow)">
      {card(PINK, -17)}
      {card(TEAL, 15)}
      {card(YELLOW, 0)}
    </g>
    <rect x="{CARD["x"] + 18}" y="{CARD["y"] + 18}" width="{CARD["w"] - 36}" height="{CARD["h"] - 36}"
          rx="{CARD["rx"] - 14}" fill="none" stroke="{NIGHT}" stroke-opacity="0.12" stroke-width="6"/>
    <path d="{ARROW}" fill="{NIGHT}" stroke="{NIGHT}" stroke-width="26" stroke-linejoin="round"/>
    {sparkle(730, 300, 46, YELLOW)}
    {sparkle(286, 370, 28, '#FFFFFF')}
    {sparkle(770, 430, 20, '#FFFFFF')}
  </g>'''


DEFS = f'''
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="{GLOW}"/>
      <stop offset="1" stop-color="{NIGHT}"/>
    </radialGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>'''


def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">{DEFS}{body}\n</svg>\n'


BACKGROUND = '<rect width="1024" height="1024" fill="url(#bg)"/>'

SOURCES = {
    # Icône classique (Play Store, anciens Android, web) : fond plein + logo.
    'icon': svg(BACKGROUND + mark(1.12)),
    # Icône adaptative Android : le logo doit tenir dans la zone sûre (≈ 66 % central).
    'android-icon-foreground': svg(mark(1.0)),
    'android-icon-background': svg(BACKGROUND),
    # Icône « à thème » (Android 13+) : seule la transparence compte.
    'android-icon-monochrome': svg(f'''
  <defs>
    <mask id="cut">
      <rect width="1024" height="1024" fill="white"/>
      <path d="{ARROW}" fill="black" stroke="black" stroke-width="26" stroke-linejoin="round"/>
    </mask>
  </defs>
  <g transform="translate(512 512) scale(1.0) translate(-512 -530)">
    {card('#FFFFFF', -17, 'opacity="0.45"')}
    {card('#FFFFFF', 15, 'opacity="0.45"')}
    {card('#FFFFFF', 0, 'mask="url(#cut)"')}
  </g>'''),
    # Écran de démarrage : logo seul, le fond est la couleur de l'app.
    'splash-icon': svg(mark(1.0)),
}

SIZES = {
    'icon': 1024,
    'android-icon-foreground': 1024,
    'android-icon-background': 1024,
    'android-icon-monochrome': 1024,
    'splash-icon': 1024,
}


def render(name, size, out_name=None):
    src = os.path.join(BRAND, f'{name}.svg')
    out = os.path.join(IMAGES, f'{out_name or name}.png')
    subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), src, '-o', out], check=True)
    print(f'  {os.path.relpath(out, ROOT)}  {size}px')


if __name__ == '__main__':
    os.makedirs(BRAND, exist_ok=True)
    for name, content in SOURCES.items():
        with open(os.path.join(BRAND, f'{name}.svg'), 'w') as f:
            f.write(content)
    print('Génération de l’identité visuelle :')
    for name, size in SIZES.items():
        render(name, size)
    render('icon', 48, 'favicon')
    render('splash-icon', 256, 'logo')  # petit logo affiché dans l'app
