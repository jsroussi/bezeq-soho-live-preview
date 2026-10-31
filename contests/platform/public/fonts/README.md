# Fonts

**Simpler** (`Simpler-{Light,Regular,Bold,Black}.otf`, weights 300/400/700/900) is Bezeq's brand typeface and the one
font of the site, the admin, the passes, the print and the ceremony (FN-1, owner 30.10: "Simpler everywhere"). It is
Bezeq's own brand font, used here for Bezeq's internal contest only. **No licence file ships with it in this repository:
flagged to the coordinator (FN-1 §3); it is not a blocker for internal use.** The build inlines the files as data URIs.

`Assistant-Variable.ttf` (SIL OFL, `Assistant-OFL.txt`) is used only by an archived concept's export.

## The four scripts Simpler cannot draw (FN-1 §6)

Greek, Arabic, Japanese and Devanagari appear only in the local country names (ΕΛΛΑΔΑ, المغرب, 日本, भारत). Each has a token
in `site/src/fonts.css` (`--font-el`, `--font-ar`, `--font-ja`, `--font-hi`): for now the shipped one-word faces in
`site/fonts/local/` (OFL), then a named system stack.

When the owner's fonts arrive, fill `scripts.json` (one entry per script) and drop the files here:

```json
{ "el": { "family": "Noto Sans", "files": { "400": "el-400.woff2", "900": "el-900.woff2" }, "licence": "SIL OFL 1.1" } }
```

- **Licence:** web embedding and subsetting allowed (SIL OFL 1.1, Apache 2.0, or a web licence naming this site), with
  its licence file beside the fonts.
- **Two weights:** 400 and 700 or 900.
- **Subset first**, to the words used, keeping the shaping tables (Arabic, Devanagari):
  `pyftsubset Font.ttf --text="ΕΛΛΑΔΑ" --layout-features='*' --flavor=woff2 --output-file=el-400.woff2`.

The build (`src/site-build.js`, `scriptFontsCss`) then emits each `@font-face` with its script's `unicode-range` and
`font-display: swap`, and points the script's token at the family. Nothing else changes.
