# shiori brand assets

Approved wordmark: shiori-logo.png. App icon source: shiori-icon-source.png.
Generated and edited with built-in image_gen. The approved logo identity is retained in the app icon.

## Icon prompt

Edit this approved shiori logo into a macOS application icon. Preserve the exact bookmark silhouette, negative-space S curve, and muted forest-green color of the existing symbol. Remove only the wordmark text. Center the same bookmark mark, comfortably large, on a warm ivory rounded-square tile, with a small transparent margin outside the tile. Clean flat design, no additional graphics, no new lettering, no perspective, no mockup, minimal or no shadow. Square 1024x1024 icon composition, bookmark occupies approximately 65% of tile height. Keep the approved identity unchanged.

Follow-up edit: remove the checkerboard outside the ivory tile and replace it with actual transparent alpha, preserving the mark and tile.

Run `python3 scripts/generate-icons.py` from the repository root to resize and package the icon. This uses macOS sips and creates PNG sizes and the ICNS container without redesigning the image.
