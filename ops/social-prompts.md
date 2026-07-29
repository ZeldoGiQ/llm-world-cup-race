# Social-Prompts für FutureBench

Erzeugt von `npm run share:prompts` — nicht von Hand pflegen, sondern
`scripts/arena/social-prompts.mts` anpassen und neu erzeugen.

So benutzt du sie: Prompt kopieren, in GPT Image 2 (oder ein anderes
Bildmodell) einfügen, Bild erzeugen lassen, fertig.

**Diagramme gehören nicht hierher.** Die Leaderboard-Grafik mit echten
Zahlen liegt fertig unter `https://www.futurebench.ai/arena/share/<kategorie>.svg`.
Ein Bildmodell würde die Balkenhöhen erfinden.

## Kanal-/Profilbanner (X, LinkedIn, YouTube)

`npm run share:prompts -- --preset banner` · 1500x500 · 3:1

```text
A wide, calm masthead. Left third holds the wordmark; the rest is quiet ink-black space with a single brass hairline running the full width and one small red disc sitting on it like a marker on a ruler. Think the cover plate of a ledger, not a hero banner.

Visual style: a modern printed record book — editorial, archival, precise. Flat matte color only: deep ink black #16130f as the ground, warm paper #f4f1ea for light surfaces, a single deep red #a4232a used sparingly as the one accent, thin brass #c9a463 hairlines. Absolutely no gradients, no glows, no lens flare, no 3D shading, no neon, no cyber aesthetic. Sharp corners throughout (nothing more rounded than a 2px radius). Generous negative space. A single fine horizontal rule may divide the composition. Typography: high-contrast serif display in the spirit of Fraunces; small text in a clean grotesque like Inter. Subtle paper grain is welcome; keep it quiet.
Recurring brand motifs you may use: a laurel wreath drawn as two thin arcs, a solid red disc, a dashed baseline, a hairline grid.

The only text in the image is exactly this line, spelled letter for letter: "FutureBench". Set it large, legible and correctly spelled; add no other words, labels, numbers or captions.

Do not draw any chart, bar graph, line graph, dashboard, table of numbers or statistics — no invented data of any kind, and no numerals other than those explicitly given below. No stock-photo people, no glossy 3D robots, no brain or circuit clichés, no watermark, no UI screenshots, no gibberish or garbled lettering.

Aspect ratio 3:1 (1500x500 pixels).
```

Eigene Schlagzeile:

```bash
npm run share:prompts -- --preset banner --headline "Dein Text"
```

## Ankündigungsbild (Post/Link-Vorschau)

`npm run share:prompts -- --preset announcement` · 1200x630 · 1.91:1

```text
A landscape editorial plate. The sentence sits in the upper left on ink black, a brass hairline below it, and beneath that a wide expanse of paper-white left deliberately empty, as if awaiting a printed entry. One red disc in the lower right corner, small.

Visual style: a modern printed record book — editorial, archival, precise. Flat matte color only: deep ink black #16130f as the ground, warm paper #f4f1ea for light surfaces, a single deep red #a4232a used sparingly as the one accent, thin brass #c9a463 hairlines. Absolutely no gradients, no glows, no lens flare, no 3D shading, no neon, no cyber aesthetic. Sharp corners throughout (nothing more rounded than a 2px radius). Generous negative space. A single fine horizontal rule may divide the composition. Typography: high-contrast serif display in the spirit of Fraunces; small text in a clean grotesque like Inter. Subtle paper grain is welcome; keep it quiet.
Recurring brand motifs you may use: a laurel wreath drawn as two thin arcs, a solid red disc, a dashed baseline, a hairline grid.

The only text in the image is exactly this line, spelled letter for letter: "Every prediction, published before the event.". Set it large, legible and correctly spelled; add no other words, labels, numbers or captions.

Do not draw any chart, bar graph, line graph, dashboard, table of numbers or statistics — no invented data of any kind, and no numerals other than those explicitly given below. No stock-photo people, no glossy 3D robots, no brain or circuit clichés, no watermark, no UI screenshots, no gibberish or garbled lettering.

Aspect ratio 1.91:1 (1200x630 pixels).
```

Eigene Schlagzeile:

```bash
npm run share:prompts -- --preset announcement --headline "Dein Text"
```

## Instagram-Feed / LinkedIn-Quadrat

`npm run share:prompts -- --preset square` · 1080x1080 · 1:1

```text
A square title card. The question is centered, set in the serif display face, breaking across two or three lines. Above it a laurel wreath drawn in thin paper-white arcs with a red disc at its center. Ink-black ground, wide margins.

Visual style: a modern printed record book — editorial, archival, precise. Flat matte color only: deep ink black #16130f as the ground, warm paper #f4f1ea for light surfaces, a single deep red #a4232a used sparingly as the one accent, thin brass #c9a463 hairlines. Absolutely no gradients, no glows, no lens flare, no 3D shading, no neon, no cyber aesthetic. Sharp corners throughout (nothing more rounded than a 2px radius). Generous negative space. A single fine horizontal rule may divide the composition. Typography: high-contrast serif display in the spirit of Fraunces; small text in a clean grotesque like Inter. Subtle paper grain is welcome; keep it quiet.
Recurring brand motifs you may use: a laurel wreath drawn as two thin arcs, a solid red disc, a dashed baseline, a hairline grid.

The only text in the image is exactly this line, spelled letter for letter: "Which AI reads the future best?". Set it large, legible and correctly spelled; add no other words, labels, numbers or captions.

Do not draw any chart, bar graph, line graph, dashboard, table of numbers or statistics — no invented data of any kind, and no numerals other than those explicitly given below. No stock-photo people, no glossy 3D robots, no brain or circuit clichés, no watermark, no UI screenshots, no gibberish or garbled lettering.

Aspect ratio 1:1 (1080x1080 pixels).
```

Eigene Schlagzeile:

```bash
npm run share:prompts -- --preset square --headline "Dein Text"
```

## Story / Reel (Hochformat)

`npm run share:prompts -- --preset story` · 1080x1920 · 9:16

```text
A tall poster. The line sits in the upper third; the lower two thirds are an empty paper-white field with a single dashed hairline running across, suggesting a baseline on a chart that has not been drawn yet. Keep the top and bottom 250 pixels free of anything important.

Visual style: a modern printed record book — editorial, archival, precise. Flat matte color only: deep ink black #16130f as the ground, warm paper #f4f1ea for light surfaces, a single deep red #a4232a used sparingly as the one accent, thin brass #c9a463 hairlines. Absolutely no gradients, no glows, no lens flare, no 3D shading, no neon, no cyber aesthetic. Sharp corners throughout (nothing more rounded than a 2px radius). Generous negative space. A single fine horizontal rule may divide the composition. Typography: high-contrast serif display in the spirit of Fraunces; small text in a clean grotesque like Inter. Subtle paper grain is welcome; keep it quiet.
Recurring brand motifs you may use: a laurel wreath drawn as two thin arcs, a solid red disc, a dashed baseline, a hairline grid.

The only text in the image is exactly this line, spelled letter for letter: "Locked before kickoff.". Set it large, legible and correctly spelled; add no other words, labels, numbers or captions.

Do not draw any chart, bar graph, line graph, dashboard, table of numbers or statistics — no invented data of any kind, and no numerals other than those explicitly given below. No stock-photo people, no glossy 3D robots, no brain or circuit clichés, no watermark, no UI screenshots, no gibberish or garbled lettering.

Aspect ratio 9:16 (1080x1920 pixels).
```

Eigene Schlagzeile:

```bash
npm run share:prompts -- --preset story --headline "Dein Text"
```

## YouTube-Thumbnail

`npm run share:prompts -- --preset thumbnail` · 1280x720 · 16:9

```text
A bold but restrained thumbnail. The two words stack in heavy serif capitals on ink black, the word FUTURE picked out in the deep red. A laurel arc curves in from the right edge. High contrast so it still reads at 210 pixels wide.

Visual style: a modern printed record book — editorial, archival, precise. Flat matte color only: deep ink black #16130f as the ground, warm paper #f4f1ea for light surfaces, a single deep red #a4232a used sparingly as the one accent, thin brass #c9a463 hairlines. Absolutely no gradients, no glows, no lens flare, no 3D shading, no neon, no cyber aesthetic. Sharp corners throughout (nothing more rounded than a 2px radius). Generous negative space. A single fine horizontal rule may divide the composition. Typography: high-contrast serif display in the spirit of Fraunces; small text in a clean grotesque like Inter. Subtle paper grain is welcome; keep it quiet.
Recurring brand motifs you may use: a laurel wreath drawn as two thin arcs, a solid red disc, a dashed baseline, a hairline grid.

The only text in the image is exactly this line, spelled letter for letter: "AI vs. THE FUTURE". Set it large, legible and correctly spelled; add no other words, labels, numbers or captions.

Do not draw any chart, bar graph, line graph, dashboard, table of numbers or statistics — no invented data of any kind, and no numerals other than those explicitly given below. No stock-photo people, no glossy 3D robots, no brain or circuit clichés, no watermark, no UI screenshots, no gibberish or garbled lettering.

Aspect ratio 16:9 (1280x720 pixels).
```

Eigene Schlagzeile:

```bash
npm run share:prompts -- --preset thumbnail --headline "Dein Text"
```

## Hintergrund-Textur (Text kommt später drauf)

`npm run share:prompts -- --preset texture` · 1600x900 · 16:9

```text
An abstract ledger surface: faint ruled hairlines in brass on ink black, a few dashed baselines, one red disc off-center as the only bright point. Everything low contrast so headline type can be laid on top later.

Visual style: a modern printed record book — editorial, archival, precise. Flat matte color only: deep ink black #16130f as the ground, warm paper #f4f1ea for light surfaces, a single deep red #a4232a used sparingly as the one accent, thin brass #c9a463 hairlines. Absolutely no gradients, no glows, no lens flare, no 3D shading, no neon, no cyber aesthetic. Sharp corners throughout (nothing more rounded than a 2px radius). Generous negative space. A single fine horizontal rule may divide the composition. Typography: high-contrast serif display in the spirit of Fraunces; small text in a clean grotesque like Inter. Subtle paper grain is welcome; keep it quiet.
Recurring brand motifs you may use: a laurel wreath drawn as two thin arcs, a solid red disc, a dashed baseline, a hairline grid.

Render no text at all — the image must be usable as a background under separately typeset text.

Do not draw any chart, bar graph, line graph, dashboard, table of numbers or statistics — no invented data of any kind, and no numerals other than those explicitly given below. No stock-photo people, no glossy 3D robots, no brain or circuit clichés, no watermark, no UI screenshots, no gibberish or garbled lettering.

Aspect ratio 16:9 (1600x900 pixels).
```

Eigene Schlagzeile:

```bash
npm run share:prompts -- --preset texture --headline "Dein Text"
```
