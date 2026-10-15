---
name: TMTEMS Customer Experience
colors:
  surface: '#faf9f7'
  surface-dim: '#dadad8'
  surface-bright: '#faf9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f1'
  surface-container: '#efeeec'
  surface-container-high: '#e9e8e6'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1b'
  on-surface-variant: '#5d3f3d'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#916f6c'
  outline-variant: '#e6bdb9'
  surface-tint: '#c0001f'
  primary: '#b8001d'
  on-primary: '#ffffff'
  primary-container: '#e11d2e'
  on-primary-container: '#fff8f7'
  inverse-primary: '#ffb3ae'
  secondary: '#5e5e64'
  on-secondary: '#ffffff'
  secondary-container: '#e3e1e9'
  on-secondary-container: '#64646a'
  tertiary: '#805000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a16600'
  on-tertiary-container: '#fff9f5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3ae'
  on-primary-fixed: '#410004'
  on-primary-fixed-variant: '#930015'
  secondary-fixed: '#e3e1e9'
  secondary-fixed-dim: '#c7c6cd'
  on-secondary-fixed: '#1a1b20'
  on-secondary-fixed-variant: '#46464c'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e3e2e0'
  surface-dark: '#14151A'
  surface-light: '#FAF9F7'
  card-surface: '#FFFFFF'
  text-primary: '#14151A'
  text-secondary: '#6B7280'
  border-hairline: '#E5E3DF'
  urgency-amber: '#F59E0B'
  success-green: '#16A34A'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-badge:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.02em
  numeral-price:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

The design system bridges the dynamic, high-conversion energy of BookMyShow with the disciplined restraint, whitespace, and visual elegance of Airbnb. Built for modern travel planning, discovery, and booking, the interface channels inventory scarcity and trip momentum without tipping into cognitive overload or visual clutter.

### Personality & Emotional Response
- **Decisive & Certain:** High-contrast typography and singular focal points give users immediate clarity when evaluating destinations, vehicles, and accommodations.
- **Urgent yet Composed:** Urgency cues act as precise functional signals rather than alarmist marketing banners.
- **Tactile & Cinematic:** 4:3 high-fidelity real photography anchors the discovery flow, framed by disciplined structural borders and warm-tinted surfaces.

### Design Movement: High-Contrast Functionalism with Controlled Glassmorphism
The visual architecture is strictly anti-skeuomorphic and flat—prohibiting gradients, color-to-color transitions, and rainbow vertical tagging. It relies on:
- Crisp solid fills with a deliberate single brand accent.
- Micro-elevations via hairline structural borders (`#E5E3DF`).
- Strictly quarantined glassmorphism reserved exclusively for floating search/filters, the bottom navigation, the trip itinerary summary sheet, and live active-trip/rest-stop overlays.

## Colors

The palette operates on absolute flat fills. Gradients are prohibited across all UI surfaces and elements. 

### Color Strategy
- **Primary Accent (`#E11D2E`):** Reserved strictly for primary action buttons ("Plan This Trip", "Book Now"), active tab indicators, and critical price focal points. It is never applied as an ambient background fill.
- **Neutral Canvas (`#FAF9F7`):** An off-white, warm foundation that softens eye strain compared to clinical white, adding an editorial quality to the customer experience.
- **Card Surfaces (`#FFFFFF`):** Pure white surfaces applied to inventory modules (hotels, vehicles, route waypoints) to create natural separation against the warm light background.
- **Dark Surface (`#14151A`):** Pure near-black deployed for the splash state, immersive itinerary heroes, and high-impact media containers.
- **Semantic Tokens:**
  - `urgency-amber` (`#F59E0B`): Used exclusively for micro-pill scarcity metrics ("Only 2 rooms left", "High demand today").
  - `success-green` (`#16A34A`): Used exclusively for confirmed reservation indicators, verified policy compliance, and successful state feedback.
  - `border-hairline` (`#E5E3DF`): 1px structural separator across all cards, dividers, and standard containers.

## Typography

The typographic hierarchy utilizes a singular, robust grotesque family (`Inter`). It balances BookMyShow's assertive visual authority with structured, scannable editorial columns.

### Application Rules
- **Display & Headlines:** Set in weights 700 to 800 with tight negative tracking (`-0.015em` to `-0.03em`). Applied to destination titles, day milestones, and modal triggers.
- **Numerals & Metrics:** All numeric values—including currency, duration, ratings, and seat tallies—must utilize tabular figures (`font-variant-numeric: tabular-nums lining-nums`) paired with weight 700 to ensure rapid parsing in dense inventory grids.
- **Metadata Hierarchy:** Secondary details (distance, vehicle transmission, room inventory specifications) default strictly to `body-md` or `body-sm` using text secondary (`#6B7280`).

## Layout & Spacing

The layout system enforces fluid horizontal scaling combined with strict 4px vertical baseline increments. 

### Breakpoints & Grid System
- **Mobile (< 768px):** Single-column stack with dynamic full-width edge containers; horizontal page margins fixed at `margin-mobile` (`16px`) with 12px card gutters.
- **Tablet (768px – 1024px):** 6-column grid; section margin `24px`; grid gutters `16px`.
- **Desktop (> 1024px):** 12-column grid capped at `1280px` max viewport width; outer section margins auto-centered with `24px` gutters.

### Component Spacing Cadence
- **Inside Cards:** Tight vertical stacking of `8px` (`space-sm`) between content lines; `16px` (`space-md`) inset padding around card copy blocks.
- **Section Rhythm:** Major inventory groups (e.g., "Trending Hotels in Jaipur" to "Available Private Vehicles") separate by `32px` to `48px` (`space-2xl`), enforcing Airbnb-style breathing room and preventing visual fatigue.

## Elevation & Depth

Visual separation relies on sharp structural hairlines (`#E5E3DF`) and localized frosted glass, completely avoiding traditional multi-tier blurry drop shadows on standard cards.

### Standard Surface Separation
All standard inventory modules (destination, hotel, vehicle, and route items) sit flush on `#FFFFFF` against `#FAF9F7` backgrounds with a continuous border:
- `border: 1px solid #E5E3DF; box-shadow: none;`

### Dedicated Glassmorphic Instances
Frosted glass depth is restricted strictly to four designated contexts:

1. **Floating Search / Filter Header:** Floating over photography or map views.
2. **Bottom Navigation Bar:** Anchored to bottom viewports.
3. **Trip Itinerary Summary Card:** Floating floating preview overlay.
4. **Active-Trip & Rest-Stop Overlays:** Critical navigational alerts during transit.

#### Light Surface Glass Token
- Background: `rgba(255, 255, 255, 0.65)`
- Blur: `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);`
- Border: `1px solid rgba(255, 255, 255, 0.40)`
- Shadow: `0 4px 24px rgba(20, 21, 26, 0.08)`
- Corner Radius: `20px` (or full width with top corners `20px`)

#### Dark Hero / Media Surface Glass Token
- Background: `rgba(20, 21, 26, 0.55)`
- Blur: `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);`
- Border: `1px solid rgba(255, 255, 255, 0.12)`
- Shadow: `0 8px 32px rgba(0, 0, 0, 0.24)`

## Shapes

The geometric framework balances structural reliability with accessible consumer touchpoints:
- **Cards & Primary Modules:** Fixed `16px` (`1rem`) border radius on all destination, stay, and transport containers.
- **Glassmorphic Floating Panels:** Fixed `20px` (`1.25rem`) radius to distinguish floating layers from resting cards.
- **Urgency Pills & Semantic Tags:** Fully rounded pill silhouette (`9999px`) to create an immediate shape-language contrast against rectangular card frames.
- **Form Fields & Buttons:** Standardized `12px` to `16px` radius matching the base card hierarchy.

## Components

### 1. Cards (Destinations, Hotels, Vehicles, Rest Stops)
- **Geometry:** `16px` corner radius, `1px solid #E5E3DF`, `#FFFFFF` flat background fill.
- **Media Inset:** Fixed 4:3 aspect ratio photograph with zero inset margins at the top; corner radius masked at the top corners (`16px 16px 0 0`).
- **Content Block:** `16px` padding. Title set in `headline-sm` (`#14151A`). Metadata line directly below set in `body-sm` (`#6B7280`).
- **Bottom Shelf:** Flex row aligning tabular price metric (`numeral-price` in `#14151A` or `#E11D2E`) on the left and a micro-CTA or directional icon button on the right.

### 2. Urgency & Social-Proof Badges
- **Placement:** Overlaid top-left on 4:3 media, inset `12px` from top and left edges.
- **Structure:** Pill shape (`roundedness: 9999px`), flat fill of `#F59E0B` (or `rgba(20, 21, 26, 0.65)` for standard social proof), text in `#FFFFFF`, set in `label-badge` (`11px`, weight 700).
- **Prohibited:** Never apply urgency amber as a card background or full button fill.

### 3. Primary & Secondary Buttons
- **Primary Action ("Plan This Trip", "Book Now"):** Flat fill `#E11D2E`, label `#FFFFFF`, `14px` weight 700 uppercase or title-case, vertical padding `14px`, horizontal padding `24px`, radius `12px`. Hover state: darkened flat red (`#C81423`). Gradients prohibited.
- **Secondary / Utility Button:** Flat `#FAF9F7` background, `1px solid #E5E3DF`, text `#14151A`, radius `12px`. Hover state: `#FFFFFF` fill with border `#14151A`.

### 4. Floating Glass Bottom Navigation
- **Structure:** 4 tabs: `Home`, `Recent Trips`, `B2B Commercial Trip`, `Profile`.
- **Surface:** Applied using the Light Surface Glass token, fixed `20px` radius floating inset `16px` from canvas edges, or docked full-width with a `1px` top border.
- **Active State:** Active icon and label tinted in `#E11D2E`. No background indicator pill or bubble.
- **Inactive State:** Tinted in `#6B7280`.

### 5. Input Fields & Search Bars
- **Surface:** `#FFFFFF` background, `1.5px solid #E5E3DF`, `12px` radius, typography `body-md` (`#14151A`), placeholder in `#6B7280`.
- **Focus State:** `1.5px solid #14151A`, no outer glow rings.
- **Floating Hero Search Bar:** Utilizes the Light Glass spec (`rgba(255,255,255,0.65)`), `20px` border radius, containing unified destination, date, and party pickers.

### 6. Chips & Filters
- **Dormant:** `#FFFFFF` surface, `1px solid #E5E3DF`, `8px` vertical by `16px` horizontal padding, radius `9999px`, text `label-md` (`#14151A`).
- **Active:** `#14151A` solid fill, text `#FFFFFF`, border `#14151A`. (Reserving brand red strictly for booking conversions and global navigation).