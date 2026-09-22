# AUDIT hero photography

- Mode: built-in image_gen
- Asset: public/images/audit-review-hero-v1.png

## Prompt

Create a premium editorial PHOTOGRAPH for a Korean pet lifestyle brand website hero about thoughtful brand and product review criteria. Wide landscape 1536x1024. Match a refined warm ivory, pale oak, natural linen and muted sage visual language, soft daylight and quiet tactile realism. Composition is CRITICAL: LEFT 55 percent is an almost empty softly lit ivory plaster wall with very little detail, clean negative space for a website heading. Concentrate still-life objects in the RIGHT 40 percent around x=76%, y=61%, keeping them inside a central-right crop for mobile. On a pale oak desk, an open blank ivory notebook with a simple dark pencil placed diagonally, a small unbranded ceramic pet bowl, neatly arranged linen and woven cotton material swatches, a natural cotton rope pet toy, one small blank kraft product carton and a small slender olive branch. An understated product editor's workspace conveying careful observation, material review and recording. No medical or laboratory apparatus, no certification seals, no checkmarks or graphs, no documents with readable content, no text, no labels, no branding, no watermarks, no humans or hands. Real camera still-life photograph, not illustration, no 3D render. Soft shadows, authentic fine material textures. All objects scale coherent, uncluttered styling, airy wide framing, top half mostly calm wall.

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
