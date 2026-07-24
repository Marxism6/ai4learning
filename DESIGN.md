---
version: alpha
name: Numerical Analysis Tutor
description: A Socratic learning tool for university numerical analysis. The visual language is a "precision notebook" — warm paper-toned surfaces that reduce eye strain during long study sessions, a single deep-teal interactive color, Inter Variable at sub-default weights for quiet warmth, and uppercase letterspaced knowledge-block tags that evoke engineering precision stamped into a handwritten notebook. The conversation is the page; chrome recedes so formulas and thinking can breathe.

colors:
  # === Eye-protection mode (default) ===
  canvas: "#f5f0e8"
  canvas-elevated: "#faf7f2"
  canvas-inset: "#ede8df"
  ink: "#3d3835"
  ink-mute: "#6b6560"
  ink-faint: "#9a938c"
  hairline: "#ddd6cc"
  hairline-strong: "#c8c0b5"
  accent: "#1a5c5c"
  accent-soft: "#e0efef"
  accent-hover: "#144a4a"
  on-accent: "#ffffff"
  nav-bg: "#2c2825"
  nav-text: "#f5f0e8"
  nav-mute: "#b8b0a6"
  user-bubble: "#e8e2d8"
  agent-bubble: "#faf7f2"
  formula-bg: "#fdfcfa"
  success: "#2d7a4f"
  error: "#b5443a"
  warning: "#a67c2e"

  # === Standard mode (alternate) ===
  std-canvas: "#fafaf8"
  std-canvas-elevated: "#ffffff"
  std-canvas-inset: "#f2f1ee"
  std-ink: "#292827"
  std-ink-mute: "#73706d"
  std-ink-faint: "#9a9794"
  std-hairline: "#e8e4dd"
  std-hairline-strong: "#d4cfc7"
  std-accent: "#0e3030"
  std-accent-soft: "#e4eded"
  std-accent-hover: "#155555"
  std-on-accent: "#ffffff"
  std-nav-bg: "#1b1938"
  std-nav-text: "#ffffff"
  std-nav-mute: "#bcbac9"
  std-user-bubble: "#f0eeea"
  std-agent-bubble: "#ffffff"
  std-formula-bg: "#ffffff"

typography:
  display-lg:
    fontFamily: "'Inter Variable', system-ui, -apple-system, sans-serif"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.96px
  display-md:
    fontFamily: "'Inter Variable', system-ui, -apple-system, sans-serif"
    fontSize: 24px
    fontWeight: 540
    lineHeight: 1.15
    letterSpacing: -0.48px
  heading-lg:
    fontFamily: "'Inter Variable', system-ui, -apple-system, sans-serif"
    fontSize: 20px
    fontWeight: 540
    lineHeight: 1.2
    letterSpacing: -0.4px
  heading-md:
    fontFamily: "'Inter Variable', system-ui, -apple-system, sans-serif"
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.2px
  body-lg:
    fontFamily: "'Inter Variable', system-ui, -apple-system, sans-serif"
    fontSize: 17px
    fontWeight: 460
    lineHeight: 1.6
    letterSpacing: 0
  body-md:
    fontFamily: "'Inter Variable', system-ui, -apple-system, sans-serif"
    fontSize: 15px
    fontWeight: 460
    lineHeight: 1.55
    letterSpacing: 0
  body-sm:
    fontFamily: "'Inter Variable', system-ui, -apple-system, sans-serif"
    fontSize: 13px
    fontWeight: 460
    lineHeight: 1.45
    letterSpacing: 0
  block-tag:
    fontFamily: "'Inter Variable', system-ui, -apple-system, sans-serif"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: 1.5px
    textTransform: uppercase
  button-md:
    fontFamily: "'Inter Variable', system-ui, -apple-system, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: 0
  button-sm:
    fontFamily: "'Inter Variable', system-ui, -apple-system, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: 0
  formula:
    fontFamily: "KaTeX_Main, 'Times New Roman', serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: 0
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  pill: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 48px

components:
  nav-bar:
    backgroundColor: "{colors.nav-bg}"
    textColor: "{colors.nav-text}"
    typography: "{typography.body-md}"
    height: 52px
    padding: 0px 24px
  nav-tab:
    backgroundColor: transparent
    textColor: "{colors.nav-mute}"
    typography: "{typography.block-tag}"
    rounded: "{rounded.xs}"
    padding: 6px 12px
  nav-tab-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.block-tag}"
    rounded: "{rounded.xs}"
    padding: 6px 12px
  chat-area:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    padding: 24px 0px
    maxWidth: 720px
  message-user:
    backgroundColor: "{colors.user-bubble}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    padding: 14px 18px
    maxWidth: 85%
  message-agent:
    backgroundColor: "{colors.agent-bubble}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    padding: 14px 18px
    maxWidth: 92%
    border: 1px solid {colors.hairline}
  formula-card:
    backgroundColor: "{colors.formula-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.formula}"
    rounded: "{rounded.md}"
    padding: 20px 24px
    border: 1px solid {colors.hairline}
  problem-card:
    backgroundColor: "{colors.canvas-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    padding: 20px 24px
    border: 1px solid {colors.hairline-strong}
  knowledge-tag:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    typography: "{typography.block-tag}"
    rounded: "{rounded.xs}"
    padding: 4px 10px
  input-bar:
    backgroundColor: "{colors.canvas-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    padding: 14px 18px
    border: 1px solid {colors.hairline-strong}
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: 12px 20px
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: 12px 20px
  button-secondary:
    backgroundColor: "{colors.canvas-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    border: 1px solid {colors.hairline-strong}
  button-send:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill}"
    size: 40px
  progress-indicator:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  prerequisite-chip:
    backgroundColor: "{colors.canvas-inset}"
    textColor: "{colors.ink-mute}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: 6px 14px
  prerequisite-chip-done:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: 6px 14px
  mode-toggle:
    backgroundColor: "{colors.canvas-inset}"
    textColor: "{colors.ink-mute}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.pill}"
    padding: 6px 14px
---

## Overview

The Numerical Analysis Tutor is a conversational learning tool where a student works through knowledge blocks (interpolation, Newton's method, Gaussian elimination, Runge-Kutta…) via Socratic dialogue. The visual language is a **precision notebook**: warm paper-toned surfaces that feel like a well-used engineering notebook, a single deep-teal accent for all interactive moments, and uppercase letterspaced block tags that stamp engineering precision into the softness.

The page's job is to disappear. The student is thinking about why Newton's method diverges when f''(x) changes sign — the interface must not compete for attention. Chrome is minimal: a dark nav strip with block tabs at top, a centered conversation column, and an input bar anchored at the bottom. Everything else is the student's thinking made visible.

**Key Characteristics:**
- Warm paper canvas (`{colors.canvas}` — #f5f0e8) as the default "eye-protection" mode — simulates the color temperature of a physical textbook page. A standard mode (#fafaf8) is available via toggle.
- Single deep-teal accent (`{colors.accent}` — #1a5c5c) carries every interactive element: active tabs, buttons, links, progress indicators. No second color competes.
- Inter Variable at sub-default weights (460 body / 540 headings / 600 emphasis) — the in-between weights create a quiet warmth that standard 400/700 cannot.
- Uppercase letterspaced knowledge-block tags (`{typography.block-tag}` — 11px / 600 / 1.5px tracking) — the "stamped label" that evokes engineering precision. Used on nav tabs, knowledge tags, and section markers.
- 1px hairline borders (`{colors.hairline}`) define formula cards and problem cards — structure without weight.
- Body text at 17px with 1.6 line-height — the reading pace of a textbook, not a chat app.
- Conversation centered at 720px max-width — the comfortable column width of a printed page.
- Formula rendering via KaTeX in a dedicated card with its own background tone (`{colors.formula-bg}`) — formulas are visually "lifted" from the conversation flow as objects to contemplate.

## Colors

### Eye-Protection Mode (Default)

The default palette simulates warm paper under a desk lamp — the color temperature of a physical numerical analysis textbook.

#### Surface
- **Canvas** (`{colors.canvas}` — #f5f0e8): The page background. Warm parchment, not white.
- **Canvas Elevated** (`{colors.canvas-elevated}` — #faf7f2): Cards, input bar, agent messages. One step lighter than canvas.
- **Canvas Inset** (`{colors.canvas-inset}` — #ede8df): Recessed areas, inactive chips, mode toggle track.

#### Text
- **Ink** (`{colors.ink}` — #3d3835): Primary text. Warm dark brown-grey, never pure black.
- **Ink Mute** (`{colors.ink-mute}` — #6b6560): Secondary text, timestamps, metadata.
- **Ink Faint** (`{colors.ink-faint}` — #9a938c): Placeholders, disabled states.

#### Borders
- **Hairline** (`{colors.hairline}` — #ddd6cc): Default 1px border on cards and dividers.
- **Hairline Strong** (`{colors.hairline-strong}` — #c8c0b5): Emphasized borders (input bar, problem cards).

#### Accent (Single Interactive Color)
- **Accent** (`{colors.accent}` — #1a5c5c): Deep teal. All buttons, active tabs, links, progress. The only chromatic element on the page.
- **Accent Soft** (`{colors.accent-soft}` — #e0efef): Pale teal wash for tag backgrounds, progress pills, completed prerequisites.
- **Accent Hover** (`{colors.accent-hover}` — #144a4a): Darkened teal for hover/press states.
- **On Accent** (`{colors.on-accent}` — #ffffff): Text on accent-filled surfaces.

#### Navigation
- **Nav BG** (`{colors.nav-bg}` — #2c2825): Dark warm strip at top. Grounds the page.
- **Nav Text** (`{colors.nav-text}` — #f5f0e8): Active nav text, matches canvas.
- **Nav Mute** (`{colors.nav-mute}` — #b8b0a6): Inactive tab text.

#### Conversation
- **User Bubble** (`{colors.user-bubble}` — #e8e2d8): Student's messages. Slightly darker than canvas.
- **Agent Bubble** (`{colors.agent-bubble}` — #faf7f2): Tutor's messages. Matches elevated surface.
- **Formula BG** (`{colors.formula-bg}` — #fdfcfa): Formula card background. Near-white to maximize formula legibility.

#### Semantic
- **Success** (`{colors.success}` — #2d7a4f): Correct answer, completed block.
- **Error** (`{colors.error}` — #b5443a): Incorrect answer, validation.
- **Warning** (`{colors.warning}` — #a67c2e): Hints, partial credit.

### Standard Mode (Alternate)

Available via toggle. Shifts to cooler, higher-contrast tones for well-lit environments.

- Canvas #fafaf8, Elevated #ffffff, Ink #292827, Accent #0e3030 (deeper teal), Nav #1b1938 (indigo-navy from Superhuman).
- All structural relationships remain identical; only hex values shift.

## Typography

### Font Family

**Inter Variable** (open-source, Google Fonts) at sub-default weights. The variable axis allows 460 / 540 / 600 — weights that sit between the standard 400/500/700 ladder and create a quieter, warmer reading texture.

Formula rendering uses **KaTeX_Main** (loaded with KaTeX) — a Computer Modern derivative optimized for mathematical typesetting.

Code/numeric output uses **JetBrains Mono** for algorithm traces and iteration tables.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-lg}` | 32px | 600 | 1.1 | -0.96px | Page title, welcome screen |
| `{typography.display-md}` | 24px | 540 | 1.15 | -0.48px | Section openers, block titles |
| `{typography.heading-lg}` | 20px | 540 | 1.2 | -0.4px | Problem card titles |
| `{typography.heading-md}` | 17px | 600 | 1.3 | -0.2px | Inline emphasis, step labels |
| `{typography.body-lg}` | 17px | 460 | 1.6 | 0 | Conversation text — the primary reading size |
| `{typography.body-md}` | 15px | 460 | 1.55 | 0 | Secondary text, nav, metadata |
| `{typography.body-sm}` | 13px | 460 | 1.45 | 0 | Captions, timestamps, progress labels |
| `{typography.block-tag}` | 11px | 600 | 1.0 | 1.5px | UPPERCASE knowledge-block tags — the signature |
| `{typography.button-md}` | 15px | 600 | 1.0 | 0 | Button labels |
| `{typography.button-sm}` | 13px | 600 | 1.0 | 0 | Compact button labels |
| `{typography.formula}` | 18px | 400 | 1.8 | 0 | KaTeX-rendered mathematics |
| `{typography.mono}` | 13px | 400 | 1.5 | 0 | Algorithm traces, iteration tables |

### Principles

- **Sub-default weights are the brand.** 460 for body, 540 for headings, 600 for emphasis. Never use 400 for body or 700 for headings — the in-between weights are the warmth.
- **Negative tracking on display sizes only.** -0.96px at 32px, scaling to -0.2px at 17px. Body and below stay at 0.
- **17px body, not 16px.** The extra pixel gives the reading pace of a textbook paragraph.
- **Block tags are UPPERCASE + 1.5px tracking.** This is the "engineering stamp" — precise, machined, contrasting with the soft warm surfaces around them.
- **Formula gets its own typographic world.** KaTeX_Main at 18px with 1.8 line-height — formulas need vertical breathing room.

## Layout

### Structure

```
┌─────────────────────────────────────────────────┐
│  NAV BAR (dark strip, 52px)                     │
│  [Logo] [INTERPOLATION] [NEWTON] [GAUSS] [...]  │
├─────────────────────────────────────────────────┤
│                                                 │
│           CONVERSATION COLUMN                   │
│              (max 720px)                        │
│                                                 │
│   ┌─ agent message ──────────────────────┐      │
│   │  Socratic question / explanation     │      │
│   │  ┌─ formula card ─────────────┐      │      │
│   │  │  x_{n+1} = x_n - f(x_n)/f'(x_n) │ │      │
│   │  └────────────────────────────┘      │      │
│   └──────────────────────────────────────┘      │
│                                                 │
│        ┌─ user message ──────────┐              │
│        │  Student's answer       │              │
│        └─────────────────────────┘              │
│                                                 │
│   ┌─ problem card ───────────────────────┐      │
│   │  [NEWTON METHOD]  Verification #1    │      │
│   │  Apply two iterations of Newton's... │      │
│   └──────────────────────────────────────┘      │
│                                                 │
├─────────────────────────────────────────────────┤
│  INPUT BAR (sticky bottom)                      │
│  [Type your answer or question...]    [Send ●]  │
└─────────────────────────────────────────────────┘
```

### Spacing System
- **Base unit**: 4px.
- **Tokens**: xxs 2px · xs 4px · sm 8px · md 12px · lg 16px · xl 24px · xxl 32px · section 48px.
- **Conversation column**: 720px max-width, centered. Horizontal padding 24px on mobile.
- **Message spacing**: 16px between consecutive messages; 24px between message groups (topic shifts).
- **Card internal padding**: 20px vertical, 24px horizontal.
- **Nav height**: 52px fixed.

### Grid & Container
- Single centered column for conversation. No multi-column layout in the main flow.
- Knowledge-block navigation is a horizontal scrollable tab strip inside the nav bar.
- On mobile (< 768px): tabs become a horizontally scrollable strip with overflow-x auto.

### Whitespace Philosophy
Whitespace is thinking room. The student is solving equations in their head — the page breathes with them. Generous vertical gaps between messages (16–24px), formula cards get 20px internal padding so the math doesn't feel cramped. The input bar has 14px internal padding so typing feels spacious.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | No border, no shadow | Canvas, nav bar, conversation background |
| 1 — Hairline | 1px `{colors.hairline}` border | Formula cards, agent messages, dividers |
| 2 — Strong hairline | 1px `{colors.hairline-strong}` border | Input bar, problem cards |
| 3 — Whisper shadow | `0 2px 8px rgba(61,56,53,0.06)` | Sticky input bar (subtle lift from content) |

No heavy shadows. No layered elevation. The system is paper-flat with hairline structure — like a notebook where sections are divided by ruled lines, not by depth.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Knowledge tags, nav tabs — the "stamped label" shape |
| `{rounded.sm}` | 6px | Small utility elements |
| `{rounded.md}` | 10px | Formula cards, problem cards, buttons |
| `{rounded.lg}` | 14px | Message bubbles, input bar |
| `{rounded.pill}` | 9999px | Send button, progress pills, prerequisite chips |

The radius language: **tags are sharp (4px), cards are soft (10px), bubbles are rounder (14px), actions are circular (pill).** The progression from angular to round maps from "label" → "content" → "conversation" → "action."

## Components

### Navigation

**`nav-bar`** — Dark warm strip pinned to top. 52px tall, `{colors.nav-bg}` background. Left: product name in `{typography.heading-md}`. Center/right: horizontal scrollable knowledge-block tabs. Far right: mode toggle (eye-protection / standard) and user avatar.

**`nav-tab`** / **`nav-tab-active`** — Knowledge block tabs rendered in `{typography.block-tag}` (UPPERCASE, 1.5px tracking). Inactive: transparent bg, `{colors.nav-mute}` text. Active: `{colors.accent}` fill, white text, 4px radius. The uppercase precision tags against the dark warm nav strip are the brand's signature moment.

### Conversation

**`message-user`** — Student's messages. `{colors.user-bubble}` background, 14px radius, right-aligned, max-width 85%. No border.

**`message-agent`** — Tutor's messages. `{colors.agent-bubble}` background with 1px `{colors.hairline}` border, 14px radius, left-aligned, max-width 92%. The hairline distinguishes the tutor's voice without adding weight.

**`formula-card`** — A dedicated card for KaTeX-rendered mathematics. `{colors.formula-bg}` background (near-white for maximum formula contrast), 1px `{colors.hairline}` border, 10px radius, 20px/24px padding. Formulas are objects to contemplate — they sit inside the agent message but are visually lifted.

**`problem-card`** — Verification problems and exercises. `{colors.canvas-elevated}` background, 1px `{colors.hairline-strong}` border (stronger than formula cards — problems demand attention), 10px radius. Top-left: a `{component.knowledge-tag}` labeling the block. Title in `{typography.heading-lg}`. Body in `{typography.body-lg}`.

**`knowledge-tag`** — The uppercase letterspaced block label. `{colors.accent-soft}` background, `{colors.accent}` text, `{typography.block-tag}`, 4px radius. Appears on problem cards, nav tabs (active variant), and progress indicators. Example: `NEWTON METHOD`, `GAUSS ELIMINATION`, `RUNGE-KUTTA`.

### Input

**`input-bar`** — Sticky at bottom of viewport. `{colors.canvas-elevated}` background, 1px `{colors.hairline-strong}` border, 14px radius, 14px/18px padding. Contains a text field and a circular send button. Subtle whisper shadow to lift from scrolling content above.

**`button-send`** — Circular 40px send button. `{colors.accent}` fill, white arrow icon, `{rounded.pill}`. The only circular action element.

### Progress & Prerequisites

**`progress-indicator`** — Pill showing block completion. `{colors.accent-soft}` bg, `{colors.accent}` text, `{typography.body-sm}`, pill radius. Example: "3/7 blocks completed".

**`prerequisite-chip`** / **`prerequisite-chip-done`** — Small pills showing prerequisite knowledge blocks. Incomplete: `{colors.canvas-inset}` bg, mute text. Complete: `{colors.accent-soft}` bg, accent text. Used when the tutor checks "do you know X before we proceed?"

### Buttons

**`button-primary`** — `{colors.accent}` fill, white text, 10px radius, 12px/20px padding. Used for "Start Block", "Next Problem", "Verify Answer".

**`button-secondary`** — `{colors.canvas-elevated}` fill, ink text, 1px hairline-strong border, 10px radius. Used for "Skip", "Show Hint", "Switch Block".

**`mode-toggle`** — Pill toggle for eye-protection / standard mode. `{colors.canvas-inset}` track, slides between two labels.

## Do's and Don'ts

### Do
- Keep the canvas warm (#f5f0e8 default). The paper tone IS the brand — it says "this is a study space, not an app."
- Use `{colors.accent}` (deep teal) for every interactive element. One color, no exceptions.
- Render knowledge-block labels in UPPERCASE + 1.5px tracking (`{typography.block-tag}`). The precision-stamp contrast against warm surfaces is the signature.
- Set conversation text at 17px / weight 460 / line-height 1.6. The reading pace of a textbook.
- Give formulas their own card with near-white background. Math needs contrast and breathing room.
- Use 1px hairlines to define structure. No shadows on cards (only the input bar gets a whisper shadow).
- Center the conversation at 720px. The column width of a printed page.

### Don't
- Don't introduce a second accent color. Teal is the only chromatic element. Semantic colors (success/error/warning) are for feedback states only, never for navigation or decoration.
- Don't use pure black (#000) or pure white (#fff) as surface colors. The warmth is the point.
- Don't bold body text to weight 700. The ladder is 460 / 540 / 600. Weight 700 does not exist in this system.
- Don't add shadows to formula cards or message bubbles. Hairlines only.
- Don't shrink body text below 15px in the conversation area. Students read for extended periods.
- Don't use rounded pills for content cards. Pills are for actions and status chips only; cards stay at 10px.
- Don't animate message appearance with bouncy or elastic easing. If messages animate, use a simple 150ms fade-in with ease-out. The tool is calm.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Nav tabs scroll horizontally; conversation padding 16px; input bar full-width with 12px margin; formula cards allow horizontal scroll for wide equations |
| Tablet | 768–1024px | Conversation at 640px; nav tabs may wrap to two rows |
| Desktop | > 1024px | Conversation at 720px centered; full nav tab strip visible |

### Touch Targets
- Input bar: 48px minimum height.
- Send button: 40px circular.
- Nav tabs: 32px height with 12px horizontal padding — effective tap area 44px with spacing.
- Buttons: 44px minimum height via 12px vertical padding.

### Formula Overflow
Wide formulas (large matrices, long expressions) get `overflow-x: auto` on the formula card. The card never breaks the conversation column width. A subtle scroll indicator (fade edge) hints at horizontal scrollability.

## Motion

- **Message appearance**: 150ms opacity 0→1, translateY 4px→0, ease-out. Calm, not bouncy.
- **Tab switch**: 100ms background-color transition on nav tabs.
- **Mode toggle**: 200ms cross-fade between palettes. No layout shift.
- **Formula card**: no entrance animation. It appears with the message.
- **Reduced motion**: all animations disabled via `prefers-reduced-motion: reduce`.

## Iteration Guide

1. Focus on ONE component at a time. Reference its YAML key.
2. The warm canvas is non-negotiable in eye-protection mode. If testing in standard mode, switch the palette but keep all structural relationships.
3. Knowledge-block tags are always UPPERCASE + 1.5px tracking. This is the brand's only "loud" typographic moment.
4. Formula cards always get the near-white background. Never render KaTeX directly on the warm canvas — the contrast drop hurts legibility.
5. When adding new components, default to 1px hairline border + 10px radius. Only deviate for navigation (4px) or conversation (14px).
6. The single teal accent rule is absolute. If you need to distinguish something, use weight or size, not a new color.
