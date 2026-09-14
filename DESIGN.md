---
name: Code Premier League
description: A broadcast control-room system for fast, high-clarity auction play.
colors:
  command-coral: "#ff6047"
  command-coral-deep: "#ca3828"
  tally-lime: "#d8ff45"
  signal-cyan: "#68d9ff"
  timer-gold: "#ffc857"
  console-ink: "#0b1320"
  console-panel: "#111f31"
  console-raised: "#1a2d44"
  paper-field: "#f5f1e8"
  paper-bright: "#fffdf6"
  channel-line: "#33475f"
  instrument-muted: "#9fb1c8"
  warning-coral: "#ff806d"
typography:
  display:
    fontFamily: "Roboto Condensed, Arial Narrow, Helvetica Neue, sans-serif"
    fontSize: "clamp(2.7rem, 6vw, 5.8rem)"
    fontWeight: 950
    lineHeight: 0.85
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Roboto Condensed, Arial Narrow, Helvetica Neue, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.09em"
rounded:
  control: "5px"
  field: "3px"
  pill: "999px"
spacing:
  compact: "8px"
  control: "12px"
  panel: "16px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.command-coral}"
    textColor: "{colors.console-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.console-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
    height: "44px"
  console-panel:
    backgroundColor: "{colors.console-panel}"
    textColor: "{colors.paper-field}"
    rounded: "{rounded.field}"
    padding: "16px"
---

# Design System: Code Premier League

## Overview

**Creative North Star: "The Broadcast Control Room"**

Code Premier League uses the visual logic of a live production switcher: dense but ordered channels, obvious tally states, hard-working labels, and one dominant signal at a time. The system is energetic without relying on casino imagery, generic gaming neon, or ornamental glass.

Light paper surfaces introduce and onboard; deep ink surfaces take over once play begins. Controls should feel tactile and decisive, while every number that affects a bid or score remains large, tabular, and easy to read across a shared screen.

**Key Characteristics:**
- Condensed, uppercase display typography for commands and live state.
- Matte ink panels divided by fine structural channels.
- Coral for actions, lime for live/leading state, cyan for secondary signal, and gold for time.
- Initials-based player geometry instead of photographic likenesses.
- Compact mobile reflow that preserves the auction decision surface.

## Colors

The palette combines a production-console neutral base with a small set of operational signal colors.

### Primary
- **Command Coral:** Main action surfaces and urgent controls. It carries ink text for projector-safe contrast.
- **Command Coral Deep:** Structural shadow and pressed-state counterweight for coral controls.

### Secondary
- **Tally Lime:** Active, connected, leading, and positive state.
- **Signal Cyan:** Role labels, secondary live information, and focus.
- **Timer Gold:** Countdown values and time-sensitive emphasis.

### Neutral
- **Console Ink:** Application shell and highest-contrast foreground.
- **Console Panel:** Default operational panel.
- **Console Raised:** Selected rows and nested squad entries.
- **Paper Field / Paper Bright:** Landing surfaces and editable fields.
- **Channel Line:** Dividers that organize dense controls.
- **Instrument Muted:** Supporting labels and explanatory copy on dark surfaces.

**The Signal Has Meaning Rule.** Coral means act, lime means live or leading, cyan means identify, and gold means time. Do not use these colors interchangeably.

## Typography

**Display Font:** Roboto Condensed with narrow system fallbacks  
**Body Font:** Inter with system sans-serif fallbacks

**Character:** Display text is compressed, assertive, and useful at distance. Body text stays neutral and highly legible so educational and legal context never becomes visual noise.

### Hierarchy
- **Display** (950, responsive 2.7–5.8rem, 0.85 line-height): Hero statements, player names, scores, and auction numerals.
- **Headline** (950, responsive 1.8–4rem, near-solid line-height): Section and state headings.
- **Title** (900, 0.82–1rem): Panel names and compact controls.
- **Body** (400–750, 1rem, 1.5–1.7 line-height): Explanations and instructions, generally within 65–75 characters.
- **Label** (900, 0.75rem, 0.09em, uppercase): Instrument labels, metric names, chips, and command text.

**The Numeral Leads Rule.** Auction time, bid value, room code, and final score always outrank their labels in size and contrast.

## Layout

Operational pages use channel-based grids rather than floating cards. A one-pixel divider separates state areas, while the active player and highest bid receive the largest regions. The host uses a main control surface plus a narrower monitoring rail; participant and spectator layouts follow the same hierarchy.

Desktop landing content pairs a decisive message with an illustrative auction switcher, then exposes the three-step run of show at the viewport edge. At 1100px, control rails stack below the main surface. At 760px, auction content becomes a single column, the timer and highest bid share a row, action controls expand to full width, and nonessential metadata collapses without hiding the core scoring explanation.

## Elevation & Depth

The system is flat by default. Depth is structural rather than ambient: paper panels and primary controls use a deliberate down-right offset shadow, while dark operational surfaces rely on tone and hairline channels.

### Shadow Vocabulary
- **Paper Lift** (`6px 7px 0 rgba(11, 19, 32, 0.16)`): Large forms and selected light surfaces.
- **Command Key** (`3px 4px 0 #ca3828`): Primary coral buttons only.

**The Console Stays Flat Rule.** Dark live-play panels do not use soft card shadows; border channels and tonal layers define hierarchy.

## Shapes

Controls use tight 3–5px corners, reflecting physical switcher keys and instrument panels. Pills are reserved for true compact status labels such as Auto-play, phase, and connection. Initials avatars use rectangular clipping, diagonal color fields, and a hard bottom signal bar.

## Components

### Buttons
- **Shape:** Tight command key (5px radius), minimum 44px height.
- **Primary:** Command Coral with Console Ink text and a deep-coral offset shadow.
- **Hover / Focus:** Moves upward by 2px; focus uses a 3px Signal Cyan outline.
- **Secondary:** Paper Bright with Console Ink border and offset shadow.
- **Quiet / Danger:** Transparent, one-pixel channel border, no decorative fill at rest.

### Chips
- **Style:** Compact uppercase condensed label with a one-pixel border.
- **State:** Auto-play uses Tally Lime; phase uses Signal Cyan; connection uses a lime dot plus text.

### Cards / Containers
- **Corner Style:** Nearly square (3px or none).
- **Background:** Console Panel for live operation; paper for onboarding and share surfaces.
- **Shadow Strategy:** Flat on dark surfaces; hard-offset lift on paper.
- **Border:** One-pixel Channel Line.
- **Internal Padding:** Usually 16px, increasing to 32–48px only for hero states.

### Inputs / Fields
- **Style:** Paper Bright field on ink, 3px corners, strong dark text.
- **Focus:** Cyan outline plus lime border where the field is embedded in a host console.
- **Error / Disabled:** Explicit error banner; disabled actions remain visible at reduced opacity.

### Navigation
- **Style:** Compact brand lockup, uppercase actions, and a single hairline baseline. Mobile keeps Join and Host visible while moving Auto-play into the hero.

### Auction Stage
The signature component pairs a real player name with locally generated initials artwork and clearly simulated ratings, plus a dedicated timer/highest-bid instrument. Active, paused, sold, and unsold states use a full-width state flag and never rely on color alone.

## Do's and Don'ts

### Do:
- **Do** give one live number clear visual authority on every auction surface.
- **Do** preserve 44px minimum controls and the stacked mobile auction layout.
- **Do** label every automated mode and simulated rating plainly.
- **Do** use hairline channels to make dense information scannable.
- **Do** keep score weights, penalties, and budget effects visible and explainable.

### Don't:
- **Don't** replace the control-room grammar with generic rounded dashboard cards.
- **Don't** use glow, glass, gradient text, or decorative neon as shorthand for gaming.
- **Don't** use signal colors without their established semantic role.
- **Don't** introduce league marks, athlete likenesses, copied biographies, money imagery, or betting language.
- **Don't** hide the active bid, countdown, budget, or final score behind hover-only interaction.
