#!/usr/bin/env bash
# Regenerates the PNG icons in public/icons/ from public/icons/icon.svg.
# Needs ImageMagick (`magick`). The PNGs are committed, so only run this after changing the SVG.
set -euo pipefail

if ! command -v magick >/dev/null 2>&1; then
	echo "make icons needs ImageMagick (the 'magick' command); install it and try again." >&2
	exit 1
fi

cd "$(dirname "$0")/../public/icons"
src=icon.svg
bg='#2b2b2b'

for spec in icon-192.png:192 icon-512.png:512 apple-touch-icon.png:180; do
	magick -background none -density 384 "$src" -resize "${spec#*:}x${spec#*:}" "${spec%%:*}"
done

# Maskable: artwork at about 80% centered on a full-bleed canvas.
magick -background none -density 384 "$src" -resize 410x410 \
	-background "$bg" -gravity center -extent 512x512 icon-maskable-512.png
