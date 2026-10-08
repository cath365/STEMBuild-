# STEMBuild interface

> **Historical note:** This document reflects an older berry-accent design iteration. The current official colours are the sampled logo-derived palette documented in [BRAND_COLOR_SYSTEM.md](BRAND_COLOR_SYSTEM.md). All new pages and components must use that official palette.

The shared interface uses white surfaces, charcoal text, a berry accent (#b52163), restrained borders and Arial/system typography. The public homepage, sign-in screen, learner/teacher/admin workspaces, offline fallback and saved-lesson viewer share these foundations. Workspace navigation identifies the current page; form focus, disabled buttons, status badges and board selections use consistent states.

Board photographs are stored locally in public/hardware and rendered proportionally with Next Image. The public gallery, configured lesson/project selectors and administrator hardware list reuse the same image catalogue. src/lib/hardware-images.json retains each creator, source page and licence; the gallery exposes credit links. Images illustrate example boards, not universal wiring diagrams. Unknown hardware names receive no misleading substitute photo. Public hardware and workbench images may be cached offline; private pages, evidence and APIs remain uncached.

Validation for this refresh: TypeScript, lint, production compilation and all five existing unit tests passed. The public sample and authenticated classroom end-to-end tests now run against an isolated local database with synthetic accounts. They cover assignments, evidence, assessment, analytics and offline recovery. Production authenticated testing still requires a provisioned account; physical classroom impact is not claimed.

Workbench photograph: Vishnu Mohanan / Unsplash (https://unsplash.com/@vishnumohanan), stored at public/electronics-workbench.jpg. The optional public footer credit is omitted to keep the interface focused on STEMBuild; provenance is retained here.
