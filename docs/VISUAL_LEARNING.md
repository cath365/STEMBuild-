# STEMBuild Visual Learning

STEMBuild uses real component photos and reviewed technical visuals to help a learner recognise physical hardware before wiring it.

## Visual types

- **PHOTO** — a real photograph used for physical recognition.
- **PINOUT** — a labelled pin/reference visual for a specific model or version.
- **WIRING** — a reviewed connection diagram for a specific board/component combination.
- **EXPECTED_RESULT** — an example of what a successful output can look like.
- **COMMON_MISTAKE** — a visual showing a common fault or unsafe/incorrect arrangement.

## Trust rule

An image is not public merely because it was uploaded. Admin uploads are stored privately and start with `verified = false`. Only an administrator can explicitly verify/publish the visual. Public component pages query only verified media.

Static built-in photos in `src/lib/component-visuals.ts` are reviewed source images with creator/licence metadata. Components without a verified image display an explicit “Photo not yet verified” state rather than a guessed or generated hardware image.

## Learner experience

Component cards show a compact recognition photo where available. Component detail pages show a larger recognition section with attribution. Build Mode shows the same component photo beside the parts checklist. Uploaded pinouts, wiring diagrams, expected-result visuals and common-mistake visuals appear in the component’s Visual Learning Aids section after verification.

## Admin workflow

Go to **Administration → Visual media**.

1. Select the exact public component.
2. Select the visual type.
3. Upload JPG, PNG or WEBP up to 3.5 MB.
4. Add descriptive alt text and a learner-facing caption.
5. Add creator/licence/source metadata when appropriate.
6. Upload for private review.
7. Inspect the image in the review queue.
8. Choose **Verify & publish** only when the image truly matches the named component/version.

Deleting a media record also removes its private stored asset.

## Safety and versioning

A photograph helps recognition but does not prove a pinout. Board clones, breakout boards and module revisions can change labels, supply ranges and pin order. Wiring/pinout visuals must name the exact model/revision they represent. Learners are always told to check markings and documentation on the physical hardware before power is applied.

## Storage

Uploaded media reuses STEMBuild’s private Vercel Blob abstraction. The public API route serves a media file only when its database record is verified; unverified files are visible only to an authenticated administrator.
