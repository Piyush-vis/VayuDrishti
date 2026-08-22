# Impeccable UI/UX Design Standards & Anti-Pattern Rules

> "Eliminate generic AI designs. Enforce strict design systems, rich color harmonies, typography mastery, and polished craft."

## 1. Zero AI Slop Anti-Patterns (Mandatory Bans)
- **NO Generic Purple-to-Blue Gradients**: Never use cliché `linear-gradient(135deg, #6366f1, #a855f7)` as default backgrounds.
- **NO Default Inter Font Everywhere**: Pair distinctive, purposeful display typography with readable body fonts (e.g., Plus Jakarta Sans + Inter, Outfit + JetBrains Mono, Syne + Space Grotesk).
- **NO Floating Card Overload**: Avoid nesting 5 levels of white/gray cards on top of cards. Use subtle background tone shifts, borders, and structured grids instead.
- **NO Low-Contrast Faint Text**: Ensure all text passes WCAG AA (minimum 4.5:1 for body text, 3:1 for large headings). Never put light gray `#9ca3af` text on white or light backgrounds.
- **NO Unstyled Browser Defaults**: Custom-style all scrollbars, tooltips, select dropdowns, inputs, and focus rings.

## 2. Design Tokens & Visual Hierarchy
- **Curated Color Harmonies**: Use tailored HSL / OKLCH color palettes with 60-30-10 distribution:
  - 60% Dominant canvas / background (`--bg-primary`, `--bg-secondary`)
  - 30% Structural elements, cards, and borders (`--border-subtle`, `--card-surface`)
  - 10% Intentional high-impact accent / brand color (`--accent-brand`, `--accent-glow`)
- **Spacing Scale**: Enforce a strict 4px/8px modular spacing grid (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`).
- **Glassmorphism & Depth**:
  - Use subtle glass layers: `background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08);`
  - Layered multi-stop box shadows: `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05);`

## 3. Micro-Interactions & Motion
- Add subtle transitions to all interactive elements (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`).
- Hover feedback on cards: subtle translate (`transform: translateY(-2px)`), glow shift, or border brightness.
- Active feedback: scale down on click (`active:scale-[0.98]`).
- Skeleton loaders and progressive rendering instead of jarring blank spinners.

## 4. Responsive & Data-Dense Layouts
- Design Bento Grid layouts for dashboards with varying card aspect ratios (1x1, 2x1, 2x2).
- Ensure mobile-first responsive breakpoints: Mobile (<640px), Tablet (640px-1024px), Desktop (>1024px).
