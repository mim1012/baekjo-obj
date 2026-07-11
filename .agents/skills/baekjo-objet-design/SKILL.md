---
name: baekjo-objet-design
description: Applies Baekjo Objet's premium pet lifestyle design system. Strict adherence to professional spacing, advanced color palettes, fluid typography, micro-interactions, responsive architectures, state management, and accessibility. Use this skill whenever styling, creating, or modifying UI components.
---

# Baekjo Objet Design System (Enterprise & Premium Edition)

You are designing for **Baekjo Objet**, a high-end, premium pet lifestyle e-commerce and curation platform. The core philosophy is "Absolute Premium, Unwavering Trust, Careful Curation, and Understated Elegance." Every pixel must be deliberate. Your designs must evoke the feeling of a luxury editorial magazine or a high-end boutique, backed by rock-solid frontend engineering.

## 🤖 AI Agent Directives (Maximizing AI Strengths)
When applying this skill, you (the AI) must fully leverage your advanced capabilities:
1.  **Proactive Componentization:** Do not write monolithic spaghetti code. If you see repeated UI patterns (like a premium card or a custom button), proactively extract them into reusable React components (`src/components/...`).
2.  **Strict TypeScript Enforcement:** Use your deep language understanding to define precise interfaces/types for all component props. Do not use `any`.
3.  **Holistic Refactoring:** When asked to modify a UI, don't just patch it. Analyze the entire component and refactor it to align perfectly with this design system, removing old generic Tailwind classes and replacing them with our strict tokens.
4.  **Flawless First-Pass Execution:** Generate complete, production-ready code. Handle all edge cases, imports, responsive breakpoints, and accessibility attributes in your very first response.
5.  **Context-Aware Styling:** Read surrounding files and existing layouts to ensure the new component seamlessly integrates into the global z-index and spacing architecture.

## 1. Core Principles (Editorial & Spatial Design)
*   **Whitespace is Luxury:** The most important design element is empty space. Use extreme, deliberate padding and margins to let content breathe. Avoid cramped layouts at all costs.
*   **Structure via Typography:** Do not use borders, boxes, or lines to separate content unless absolutely necessary. Let scale, alignment, and spacing define hierarchy.
*   **Anti-Banner Design:** Avoid traditional e-commerce "banners". Use full-bleed imagery, asymmetrical grids, and organic text flows.
*   **Tactile Sensibility:** Digital elements should feel like physical, high-quality materials (e.g., matte paper, frosted glass).

## 2. Strict Color Architecture
**CRITICAL RULE:** NEVER use default Tailwind colors (e.g., `gray-100`, `blue-500`). Use ONLY the exact HEX codes mapped to these semantic roles.

*   **Canvas (Backgrounds):**
    *   Main Canvas: `bg-[#FBFAF7]` (Warm, matte paper white)
    *   Muted Section: `bg-[#FAF8F3]` (Soft beige for pacing)
    *   Deep Accent Canvas: `bg-[#202521]` (For stark, high-contrast editorial sections)
    *   *Texture:* ALWAYS overlay `bg-noise` (a custom CSS class) on major sections to add a fine, premium grain.
*   **Typography (Ink):**
    *   Primary Ink: `text-[#17211D]` (Deep forest/charcoal - NEVER use pure black `#000000`)
    *   Secondary Ink: `text-[#6F766F]` (Soft sage/gray for descriptions)
    *   Signature Accent: `text-[#A8742E]` (Muted Gold/Brass for highlights, active states, and small labels)
    *   Inverse Ink: `text-[#FBFAF7]` (For text on Deep Accent Canvas)
    *   Error/Warning: `text-[#9E3939]` (Muted Brick Red - do not use bright red)
*   **Surfaces & Borders:**
    *   Subtle Dividers: `border-[#E7E0D5]` (Hairline borders only)
    *   Elevated Surface: `bg-white` (Used sparingly for cards floating on the Main Canvas)
    *   Interactive Surface (Hover): `bg-[#F3EEE6]` -> `hover:bg-[#EAE2D3]`

## 3. Strict Spacing & Grid System (8pt System)
All spacing must follow a strict multiple of 4px/8px (Tailwind's default scale). DO NOT use arbitrary values (like `mt-[17px]`).
*   **Micro (4-8px):** `gap-1`, `gap-2`, `p-2`. Use for internal component alignment (e.g., icon next to text).
*   **Component (16-24px):** `p-4`, `p-6`, `gap-4`, `gap-6`. Use for padding inside cards or spacing between grouped components.
*   **Section (48-64px):** `py-12`, `py-16`, `gap-12`. Use for spacing between distinct blocks of content on a page.
*   **Editorial (96-128px+):** `py-24`, `py-32`. Use for dramatic whitespace between major landing page sections.

## 4. Advanced Typography & Typesetting
*   **Font Pairing:**
    *   *Sans-Serif (Default):* Used for modern, clean UI elements. Must use `tracking-tight` for headings.
    *   *Serif (Editorial):* Use `font-editorial` strictly for large numbers, short evocative quotes, brand signatures, or pricing accents.
*   **Rhythm and Leading (Line Height):**
    *   Headings (`h1`, `h2`): `leading-[1.15]` to `leading-[1.25]`. Tight leading creates a solid block.
    *   Body Text (`p`): `leading-[1.7]` to `leading-[1.9]`. Loose leading ensures effortless reading.
*   **Korean Typesetting:** ALWAYS apply `break-keep` (`word-break: keep-all`) to text blocks to prevent awkward word-breaking.

## 5. Sophisticated Micro-interactions (The "Feel")
Animations must be slow, fluid, and deliberate. No bouncy or jarring movements.
*   **Easing:** Standardize on `transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]` (a smooth, friction-based ease-out). In Tailwind: `duration-500` or `duration-700` with `ease-out`.
*   **Card Elevation:** Instead of standard drop shadows, use a combination of subtle lift, border glow, and a diffuse shadow.
    *   `hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(23,33,29,0.05)] hover:border-[#D8C4A3]/50`
*   **Image Reveal (Masking):** Images should load or hover with a slow scale effect inside a fixed container.
    *   `overflow-hidden` -> `transition-transform duration-[1.5s] ease-out group-hover:scale-105`

## 6. Component Architecture & States
Professional UI handles ALL states (Default, Hover, Focus, Active, Disabled, Loading, Error).

### 6.1. Buttons
Buttons must feel heavy and tactile. Never use default focus rings.
*   **Primary Button:** `bg-[#17211D] text-[#FBFAF7] hover:bg-[#202521] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`
*   **Secondary Button:** `bg-transparent border border-[#E7E0D5] text-[#17211D] hover:border-[#D8C4A3] hover:bg-[#F3EEE6] active:scale-[0.98]`
*   **Focus Ring (A11y):** `focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBFAF7]`

### 6.2. Forms & Inputs
Inputs must look like elegant document fields, not standard web forms.
*   **Input Style:** Bottom line only. `border-b border-[#E7E0D5] bg-transparent pb-3 pt-4 text-[16px] text-[#17211D] placeholder:text-[#6F766F]/50 focus:border-[#A8742E] focus:outline-none transition-colors rounded-none w-full`
*   **Error State:** Change border to `#9E3939` and display a subtle, small error message below (`text-[12px] text-[#9E3939] mt-2`).
*   **Label:** Floating labels or very small (`text-[12px] uppercase tracking-widest text-[#6F766F]`) above the input.

### 6.3. Loading & Skeleton States
**NEVER use basic spinning circles for page content.**
*   Use Skeleton loaders that match the exact dimension of the content.
*   *Skeleton Class:* `animate-pulse bg-[#E7E0D5]/50 rounded-xl`

## 7. Layout Architectures

### The "Bento" / Asymmetrical Grid
Move away from 3-column layouts. Use varied column spans to create visual interest.
```tsx
<div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
  <div className="md:col-span-8 bg-white p-8 lg:p-12 rounded-3xl border border-[#E7E0D5]">...</div>
  <div className="md:col-span-4 bg-[#F3EEE6] p-8 lg:p-12 rounded-3xl">...</div>
</div>
```

### The Cinematic Hero Section
```tsx
<section className="relative w-full h-[80vh] min-h-[600px] flex items-end pb-24 px-8 lg:px-16 bg-[#202521] overflow-hidden group">
  <div className="absolute inset-0 bg-gradient-to-t from-[#17211D]/90 via-[#17211D]/30 to-transparent z-10" />
  <img 
    src="..." 
    alt="Premium Pet" 
    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-105"
  />
  <div className="relative z-20 max-w-4xl">
    <span className="text-[#A8742E] font-editorial text-sm lg:text-lg tracking-widest uppercase mb-4 block">New Collection</span>
    <h1 className="text-[48px] lg:text-[72px] text-[#FBFAF7] leading-[1.1] font-bold tracking-tighter mb-6">
      The Art of<br/>Mindful Living.
    </h1>
    <p className="text-[16px] lg:text-[18px] text-[#FBFAF7]/80 leading-[1.6] max-w-lg break-keep font-light">
      Discover curated essentials designed to bring harmony to your space and joy to your companions.
    </p>
  </div>
</section>
```

### Refined Card Component
```tsx
<article className="group flex flex-col items-start bg-white rounded-3xl p-6 lg:p-8 border border-[#E7E0D5] transition-all duration-700 ease-out hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(23,33,29,0.05)] hover:border-[#D8C4A3]/60 relative overflow-hidden cursor-pointer w-full">
  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#A8742E]/30 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
  <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-[#F3EEE6] text-[#A8742E] flex items-center justify-center mb-6 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:bg-[#EAE2D3]">
    <Icon size={24} strokeWidth={1.2} />
  </div>
  <h3 className="text-lg lg:text-xl font-bold text-[#17211D] mb-3 tracking-tight transition-colors group-hover:text-[#A8742E]">
    Veterinary Consultation
  </h3>
  <p className="text-[14px] lg:text-[15px] text-[#6F766F] leading-[1.8] break-keep mb-8">
    Connect with top-tier specialists for personalized care plans.
  </p>
  <div className="mt-auto flex items-center text-[#17211D] text-sm font-semibold tracking-wide">
    <span className="relative">
      Explore Service
      <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#A8742E] transition-all duration-500 ease-out group-hover:w-full"></span>
    </span>
    <ArrowRightIcon className="ml-2 w-4 h-4 transition-transform duration-500 ease-out group-hover:translate-x-1 text-[#A8742E]" />
  </div>
</article>
```

## 8. Z-Index Architecture & Modals
Prevent overlapping issues by strictly following this z-index hierarchy:
*   `z-0` / `z-10`: Base page content, floating background decorations.
*   `z-30`: Sticky headers and bottom navigation bars.
*   `z-40`: Dropdowns, popovers, and tooltips.
*   `z-50`: Modals, Drawers, Dialogs, and their backdrops.
*   *Modals/Drawers Backdrop:* `fixed inset-0 bg-[#17211D]/40 backdrop-blur-sm z-50 transition-opacity`

## 9. Semantic HTML & Accessibility (A11y)
*   **Headings:** Use ONE `<h1>` per page. Structure `<h2-h6>` logically.
*   **Buttons vs Links:** Use `<button>` for actions (submit, open modal). Use `<Link>` or `<a>` for navigation.
*   **ARIA Attributes:** Add `aria-label` to icon-only buttons. Add `aria-expanded` for dropdowns. Add `aria-invalid` and `aria-errormessage` on inputs with errors.
