# STEMBuild official logo-based colour system

**Source of truth:** `public/brand/stembuild-icon-192x192.png` and `public/brand/stembuild-wordmark.png`, inspected from the repo's original raster assets (not guessed from previous website styling). The icon contains a blue, teal, sky-blue and orange circuit motif on white; the wordmark uses navy and blue.

| Role | Logo colour | CSS token | Application |
| --- | --- | --- | --- |
| Readable titles and typography | Navy `#0E3462` | `--brand-navy` | headings, text, dark areas |
| Primary action and links | Blue `#0172E5` | `--brand-blue` | buttons, active tabs, focus |
| Blue shading from icon | Deep blue `#0454AA` | `--brand-blue-deep` | hover/navigation and dark areas |
| Secondary visual accent | Sky blue `#62C1D4` | `--brand-sky` | borders, information and diagrams |
| Positive progress | Teal `#06BE99` | `--brand-teal` | progress, success states |
| Warm highlight / attention | Orange `#F6B14A` | `--brand-orange` | steps, warnings, featured content |
| Clear neutral surface | White `#FFFFFF` | `--brand-white` | readable cards and pages |

These are **representative values sampled from the original logo**. Antialiasing, pixel-level gradients and logo export compression produce many closely related colours. Design usage keeps these core colours as the only UI hues, plus lighter/darker **tints of those colours mixed with white/navy** where necessary for accessible surfaces and contrast.

## Application conventions

1. **One visual language:** The homepage, public pages, authentication, dashboards, classrooms, projects, Free Build, guided lessons, robot builder and CAD reuse the same logo colour foundation. Use the semantic tokens above instead of arbitrary purple/pink/red/yellow site accents.
2. **Accessibility:** Text is navy on white/light backgrounds; blue-on-white meets readable button/link contrast; text on teal/orange backgrounds is navy, not white. Avoid colour-only success/warning signals; use descriptions and state labels.
3. **Distinct purpose, consistent brand:** Primary action blue, progress teal, informational sky, learning emphasis orange, and structural navigation navy.
4. **Real hardware is exempt from decorative recolouring:** Actual photographs, Arduino component images, LED colour/polarity, jumper colours, error states in schematic visualisations and parts are retained when recolouring would teach incorrect electronics.
5. **Maintenance:** `src/app/globals.css` defines shared tokens. `src/app/logo-theme.css` (last CSS import in layout) consolidates UI overrides; `src/app/home.module.css`, `src/app/learn.css` and `src/app/lab-modes.css` use the same hue families. Keep component-specific functionality intact.

Existing `docs/UI_DESIGN_SYSTEM.md` contains an earlier berry-accent design description from a previous iteration; this document supersedes it for brand colours without changing its historical implementation notes.
