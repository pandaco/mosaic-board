Generating PNG favicons from SVG

If your system has `rsvg-convert` (librsvg) or ImageMagick (`convert`/`magick`), you can generate the required PNGs with these commands.

Using rsvg-convert:

rsvg-convert -w 32 -h 32 -o icon-32.png ../../public/assets/logo-symbol.svg
rsvg-convert -w 48 -h 48 -o icon-48.png ../../public/assets/logo-symbol.svg
rsvg-convert -w 128 -h 128 -o icon-128.png ../../public/assets/logo-symbol.svg

Using ImageMagick (convert):

convert -background none public/assets/logo-symbol.svg -resize 32x32 public/icons/icon-32.png
convert -background none public/assets/logo-symbol.svg -resize 48x48 public/icons/icon-48.png
convert -background none public/assets/logo-symbol.svg -resize 128x128 public/icons/icon-128.png

Using ImageMagick (magick) on newer versions:

magick public/assets/logo-symbol.svg -background none -resize 32x32 public/icons/icon-32.png
magick public/assets/logo-symbol.svg -background none -resize 48x48 public/icons/icon-48.png
magick public/assets/logo-symbol.svg -background none -resize 128x128 public/icons/icon-128.png

Note: adjust paths if you run commands from a different working directory. After generating, the `manifest.json` already references the PNG paths expected by Chrome.
