# shiori brand assets

Approved wordmark: shiori-logo.png. App icon source: shiori-icon-source.png.
Generated and edited with built-in image_gen. The approved logo identity is retained in the app icon.

## Icon prompt

Edit this approved shiori logo into a macOS application icon. Preserve the exact bookmark silhouette, negative-space S curve, and muted forest-green color of the existing symbol. Remove only the wordmark text. Center the same bookmark mark, comfortably large, on a warm ivory rounded-square tile, with a small transparent margin outside the tile. Clean flat design, no additional graphics, no new lettering, no perspective, no mockup, minimal or no shadow. Square 1024x1024 icon composition, bookmark occupies approximately 65% of tile height. Keep the approved identity unchanged.

Follow-up edit: remove the checkerboard outside the ivory tile and replace it with actual transparent alpha, preserving the mark and tile.

Run `python3 scripts/generate-icons.py` from the repository root to resize and package the icon. This uses macOS sips and creates PNG sizes and the ICNS container without redesigning the image.

## Application screenshots (#42)

Use two native app captures: the reader with the integrated terminal open, and the HTML link graph. This two-image layout was chosen by the maintainer, with the terminal shown in the first image. Capture dark mode, the bundled `sample-vault`, and an empty sidebar filter. Keep the same window size and crop, excluding the desktop. Do not reconstruct or mock screenshots.

| Asset | View | Source PNG | Pixel size |
| --- | --- | --- | --- |
| `screenshot-reader.jpg` | `00-はじめに.html`, folder tree and tag row, terminal open | `スクリーンショット 2026-09-09 3.39.23.png` | 1066 × 1033 |
| `screenshot-graph.jpg` | Eight sample notes, four HTML links | `スクリーンショット 2026-09-09 3.39.08.png` | 1065 × 1035 |

The maintainer supplied these native macOS captures on 2026-09-09. The app commit, macOS version, display scale, and window size in points were not recorded; do not infer them from pixel dimensions. The first capture includes the existing shell prompt and a local `uv` startup error; it has not been retouched or presented as a successful AI-tool run. These images illustrate the UI, not completion of the broader native verification in #3/#4.

Converted the supplied PNGs to JPEG with macOS `sips -s format jpeg -s formatOptions 85 input.png --out docs/assets/screenshot-reader.jpg` (and `screenshot-graph.jpg`), without cropping, resizing, or altering the UI. Review both images at README size. For future replacements, record app commit, macOS version, architecture, display scale, window/pixel dimensions, sample note paths, and capture date. Use a clean shell prompt with no secrets or private note contents.

## License

Project images, logos, and screenshots are included under the repository's MIT license, as approved by the maintainer. Third-party components shown in screenshots retain their own terms; the project license does not relicense them.
