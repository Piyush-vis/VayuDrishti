# DESIGN.md — VayuDrishti Impeccable Design System Contract

This document is the source of truth for all frontend styling, component architecture, and design token enforcement across VayuDrishti.

---

## 1. Aesthetic Direction: "Emerald Cyber & Slate"

- **Visual Tone**: Modern, high-craft, command-center intelligence dashboard. Dark theme first.
- **Surface Elevation**: Layered midnight slate (`#080c10` canvas → `#0f1722` surfaces → `rgba(30, 41, 59, 0.6)` cards).
- **Glassmorphism**: Crisp 1px translucent borders (`border: 1px solid rgba(255, 255, 255, 0.08)`), `backdrop-filter: blur(16px)`.

---

## 2. Palette Tokens

| Token | Value | Purpose |
|---|---|---|
| `--color-canvas` | `#080c10` | Full page background |
| `--color-surface` | `#0f1722` | Navigation, headers, panels |
| `--color-card` | `rgba(15, 23, 42, 0.75)` | Interactive Bento cards |
| `--color-accent-emerald` | `#10b981` / `#34d399` | Good AQI, primary CTA, live pulses |
| `--color-accent-cyan` | `#06b6d4` | Secondary telemetry & trajectories |
| `--color-alert-rose` | `#f43f5e` | Severe/Hazardous AQI, emergency alerts |
| `--color-text-primary` | `#f8fafc` (Slate 50) | Main content & headings |
| `--color-text-muted` | `#94a3b8` (Slate 400) | Captions, metadata, secondary labels |

---

## 3. Strict Anti-Pattern Bans (Deterministic Rules)

1. **NO Default AI Gradients**: No purple-to-blue gradients (`linear-gradient(135deg, #6366f1, #a855f7)`).
2. **NO Low-Contrast Text**: Faint gray text on dark backgrounds must have at least 4.5:1 WCAG AA contrast.
3. **NO Unstyled Scrollbars**: Use custom sleek 6px dark scrollbars.
4. **NO Jarring Spinners**: Use progressive skeleton screens or pulsing subtle indicators.
