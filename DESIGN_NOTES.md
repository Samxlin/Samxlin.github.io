# Luminous Field design notes

These notes were extracted from both approved references before implementation:

- `design-reference/luminous-field.html`
- `design-reference/luminous-field-preview.png` (1440 × 1000 desktop viewport)

The reference is the design source of truth. The new site must be decomposed
from this system; it must not begin with an Astro blog theme.

## Design thesis

The identity comes from four systems working together:

1. editorial, oversized mixed-style typography;
2. an asymmetric 1180 px engineering-notebook grid with generous whitespace;
3. a pale, physically suggestive field made of toroidal particles and light;
4. scientific-instrument details: mono readouts, single-pixel rules, restrained
   HUD surfaces, and publication-like technical diagrams.

“White site plus particles” is not sufficient. Removing any of these systems
turns the result into a generic developer portfolio or SaaS page.

## Core tokens

The implementation starts with the prototype's values and adds semantic aliases
only where needed.

```css
:root {
  --paper: #f2f4f1;
  --paper-2: #eaeeec;
  --paper-3: #f8f8f5;

  --ink: #18202c;
  --ink-soft: #525c6c;
  --ink-faint: #7c8592;
  --ink-micro: #646d79;

  --violet: #716d8f;
  --blue: #697f9c;
  --teal: #769897;
  --mist: rgb(117 127 164 / 0.12);

  --line: rgb(51 65 86 / 0.16);
  --line-strong: rgb(51 65 86 / 0.28);
  --surface: rgb(248 249 246 / 0.62);
  --surface-hud: rgb(247 248 245 / 0.54);
  --surface-button: rgb(255 255 255 / 0.36);

  --shadow-float: 0 22px 70px rgb(34 48 66 / 0.10);
  --shadow-soft: 0 20px 70px rgb(52 67 88 / 0.05);

  --radius-card: 22px;
  --radius-hud: 16px;
  --radius-contact: 32px;
  --radius-pill: 999px;

  --container: 1180px;
  --article: 780px;
  --page: min(var(--container), calc(100vw - 48px));
  --header-h: 78px;
  --section-y: clamp(100px, 12vw, 170px);

  --font-sans: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont,
    "Segoe UI", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial,
    sans-serif;
  --font-serif: "Iowan Old Style", "Palatino Linotype", Palatino, Baskerville,
    Georgia, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --text-hero: clamp(51px, 7.1vw, 104px);
  --text-section: clamp(36px, 5.2vw, 70px);
  --text-card-title: clamp(23px, 2.3vw, 34px);
  --ease-reveal: cubic-bezier(.22, 1, .36, 1);
}
```

`--ink-faint` is retained for decorative marks. Very small functional labels use
the slightly darker `--ink-micro` to maintain readable contrast.

## Background and material

The page is warm mist-white, never pure white. It combines:

- a pointer-following blue-violet radial glow;
- a pale blue-green glow in the upper-right;
- a pale violet glow in the lower-left;
- a vertical `paper-3 → paper → paper-2` gradient;
- a 42 px grid that fades toward the bottom;
- extremely subtle multiply-blended paper noise.

Cards use a one-pixel border, spacing, and mild surface contrast before shadow.
Only floating or hovered objects receive a visible soft shadow. Glass treatment
is milky white with restrained blur; it is not transparent dark glass.

Radius hierarchy is deliberate: 16 px HUD, 18 px mobile panel, 22 px card,
32 px closing panel, and fully rounded buttons/chips.

## Layout rhythm

- Page shell: `min(1180px, 100vw - 48px)`.
- Header: 78 px, `1fr auto 1fr` so navigation remains geometrically centered.
- Hero: minimum `100svh - header`, two columns at roughly `1.05fr / .95fr`.
- Section padding: `clamp(100px, 12vw, 170px)`.
- Section headings: 150 px index rail plus flexible title column.
- About: `1.2fr / .8fr`.
- Interests: four connected cells, not independent floating cards.
- Featured notes: 12-column grid with alternating 7/5 and 5/7 spans.
- Publications: ruled rows with a compact venue/year rail.
- Contact: one large 1.18/.82 panel, not a set of social cards.

The large whitespace and ruled transitions are structural, not optional polish.

## Typography

- Hero: up to 104 px, `.91` line-height, tight negative tracking, medium-weight
  sans. Preserve explicit line breaks.
- One expressive word uses italic Palatino/Iowan/Georgia-style serif in muted
  violet; the final hero word uses a very light sans.
- Section headings: up to 70 px, near-normal sans with a single serif phrase.
- About statement: 20–31 px and declarative, not résumé body copy.
- Technical labels: 9–12 px, uppercase, tracked, and often monospace.
- Body text uses robust English and Chinese system fallbacks and does not depend
  on private fonts.

Serif usage remains sparse. Monospace is reserved for metadata, numeric
readouts, code, and engineering labels.

## Luminous field

The canvas model is a slowly rotating torus-like resonant field, not random
stars or a node network:

- 20 rings × 23 particles (460 field particles);
- 92 very slow background dust points;
- three low-saturation particle families: blue-gray, violet-gray, teal-gray;
- sparse quadratic field-line connections;
- depth-based scale and opacity;
- near-white radial core;
- subtle pointer repulsion within roughly 190 px, capped around 16 px;
- device-pixel-ratio capped at 1.75;
- particle counts reduced on narrow/low-capability displays;
- animation suspended when the document is hidden;
- static halo fallback and no animation under `prefers-reduced-motion`.

Desktop field center is around 74.5% viewport width and 46% viewport height.
Mobile shifts it below the copy while retaining the halo and instrument readout.

## Motion

Motion is slow and functional:

- reveal: 850 ms, 26 px maximum travel;
- field trace: about 12 s;
- status pulse: about 2.4 s;
- HUD bars: about 2.7 s;
- signal dot: about 3.3 s;
- card tilt: roughly ±4°, desktop fine-pointer devices only;
- hover lift: 2–3 px.

Reduced-motion mode disables canvas animation, reveal transforms, animated HUD
values, card tilt, and continuous decorative animations.

## Technical visuals

Technical-note covers are abstract engineering diagrams made from native SVG:
converter blocks and a transfer path, transformer layers, bandwidth curves, and
resonant/ZVS orbits. They use the same one-pixel rules and muted spectral palette
as the page. They are diagrams, not stock-photo covers or decorative AI art.

Figures inside notes use publication conventions (`Fig. 1`, captions, readable
axes and labels) and may break slightly wider than the prose column.

## Responsive behavior

At 980 px:

- navigation becomes a menu;
- hero becomes one column;
- field stage moves below copy and remains visible;
- interests become two columns;
- note cards become equal six-column spans;
- contact becomes one column.

At 720 px:

- page gutter becomes 14 px and header height 68 px;
- hero type uses `clamp(48px, 16vw, 78px)`;
- main structures stack to one column;
- publication rows become `68px / 1fr` with links on the second row;
- footer stacks vertically;
- equations, code, tables, and wide figures scroll within their own bounds.

Acceptance viewports are 1440×900, 1920×1080, 1024×768, and 390×844.

## Component boundaries

Use a small number of meaningful components:

- global: `BaseLayout`, `Header`, `Footer`, `SEO`, global field layers;
- home: `Hero`, `ParticleField`, `FieldHud`, `SectionHeading`, interest strip,
  featured notes, publication preview, and contact panel;
- content: `NoteCard`, `PublicationItem`, `Tag`, `TableOfContents`,
  `TechnicalFigure`;
- visuals: one reusable diagram component keyed by a small visual vocabulary.

Do not componentize individual lines or micro-labels. Do not paste the prototype
into one page file.

The note schema includes two visual design fields in addition to editorial
metadata: a diagram `visual` key and a `featureSize` (`wide` or `narrow`). These
preserve the homepage's alternating card rhythm.

## Anti-patterns

Reject implementations that introduce any of the following:

- an Astro theme with recolored defaults;
- equal three-column blog cards;
- pure-white background or pure-black type;
- saturated blue/purple gradients or dark cyberpunk styling;
- stock imagery, code screenshots, or generic gradient covers;
- dense glassmorphism, large shadows, or rounded containers everywhere;
- star-field particles, bright cursor trails, or network-diagram connections;
- compact sections that remove the notebook's breathing room;
- generic “knowledge sharing” copy instead of concrete engineering questions.

