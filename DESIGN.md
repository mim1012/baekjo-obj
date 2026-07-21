# Baekjo Objet Design System

## 1. Product Tone

Baekjo Objet is a quiet luxury pet commerce and insurance platform. The interface should feel calm,
curated, and operationally clear: premium but restrained, never decorative for its own sake.

## 2. Color Tokens

- `ink`: `#17201B`, `#1A1D1B`, `#202521`
- `surface`: `#FBFAF7`, `#FAF9F5`, `#F9F8F3`, `#F4F2EC`
- `line`: `#DED8CC`, `#D1D0C8`, `#C9C8C0`
- `muted`: `#68776C`, `#6F766F`, `#747B75`, `#8A918B`
- `accent`: `#2F3B34`, `#3C4941`, `#687069`
- `danger`: `#A65348`, `#9E3939`

Avoid saturated primary colors, purple-blue gradients, decorative orbs, and large rounded cards.

## 3. Typography

- Korean/body text uses Pretendard through `font-sans`.
- Editorial English accents may use Playfair Display through `font-editorial`.
- Korean headings must not force Playfair Display.
- Letter spacing remains `0` unless an existing uppercase micro-label pattern requires Tailwind's
  default tracking utility already used nearby.

## 4. Spacing And Shape

- Use a 4px spacing rhythm.
- Cards and panels use restrained borders, small radius, and light shadows only when already present.
- Admin screens favor dense, scannable controls over marketing-style hero layouts.
- Fixed controls need stable dimensions so labels and icons do not shift layout.

## 5. Component Patterns

- Admin forms use section panels with `bg-white`, `border-gray-200`, and compact labels.
- Actions use lucide icons where an icon is meaningful.
- Binary state uses checkboxes/toggles; option sets use selects or segmented controls.
- Image management uses explicit upload surfaces with visible preview, replace, and remove states.
- Repeated content blocks may use small bordered rows with stable drag handles and explicit delete controls.

## 6. Interaction

- Hover states should be subtle tonal shifts or border changes.
- Motion must use transform/opacity and remain responsive.
- Loading, empty, and error states must be visible and specific enough for admin users to recover.

## 7. Accessibility

- Every input has a label or aria-label.
- Icon-only buttons need aria-label.
- Error messages use visible text and, where appropriate, `role="alert"`.
- Meaningful images need alt text; decorative previews may use empty alt text.
