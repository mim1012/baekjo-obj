# B2B hero photography

- Mode: built-in image_gen
- Asset: public/images/b2b-partnership-hero-v1.png

## Prompt

Create a premium editorial PHOTOGRAPH for a Korean pet lifestyle brand website B2B partnership hero. Wide landscape 1536x1024. Warm ivory, pale oak, linen, subtle muted sage palette, natural soft window light, restrained luxury and authentic product photography. Composition is CRITICAL: the LEFT 55 percent is clean softly lit ivory plaster wall with very little detail, empty negative space for web headline; all meaningful objects concentrated in RIGHT 40 percent, around x=75%, y=60%, kept away from edges for responsive cropping. On the right a pale oak worktable with an open beautifully prepared unbranded cream care-kit gift box, natural linen cloth, one small ceramic pet bowl, folded sage pet bandana, cotton rope pet toy and two simple blank kraft packages, a couple closed boxes farther behind suggest careful small-batch partnership preparation. Tactile materials, subtle realistic shadows, intentional but not rigid arrangement. No humans, no hands, no dogs or cats, no lettering, no labels, no logos, no watermarks, no typography. Real camera photograph, not illustration, not 3D render. Wide environmental framing with ample breathing room, objects at mid-depth, understated and trustworthy. Upper half mostly calm wall. Do not create a collage.

## Validation

- Targeted ESLint: passed.
- TypeScript (`npx tsc --noEmit`): passed.
- CMS source mapper contract: 6 passed.
- Local Chrome: both pages checked at 360, 390, 768, 1024, and 1440 px; images loaded, no horizontal overflow, CTA destinations retained.
- Evidence: artifacts/hero-pages/verification.json and desktop/mobile screenshots.
- Existing CMS custom images remain authoritative; new images are the source and CMS defaults.

## Mobile full-image correction

- Below 1024px, copy and image occupy separate rows; the image uses a 3:2 frame with object-contain and no overlay. Desktop keeps the full-width background.
- Verified both routes at 360, 390, 768, 1024, and 1440px. Mobile checks cover aspect ratio, object-fit, image below copy, hidden overlay, loaded image and horizontal overflow.
- Evidence: artifacts/hero-pages/uncropped-verification.json and *-uncropped-390.png / *-uncropped-1440.png.
- Targeted ESLint and git diff --check passed.
