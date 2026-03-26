# AdmitIQ (Admit Compass) -- Comprehensive UI/UX Design Document

> **Single source of truth** for the product's visual design, interaction patterns, page inventory, and user journeys.
>
> Last updated: 2026-03-26

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Navigation Architecture](#2-navigation-architecture)
3. [Page-by-Page UI Spec](#3-page-by-page-ui-spec)
4. [User Journeys](#4-user-journeys)
5. [Responsive Design](#5-responsive-design)
6. [Accessibility](#6-accessibility)
7. [Data Visualization](#7-data-visualization)
8. [Design Debt & Recommendations](#8-design-debt--recommendations)

---

## 1. Design System

### 1.1 Color Palette

The system is built on a **gold-anchored editorial palette** -- warm, confident, premium. Colors are defined as HSL CSS custom properties in `globals.css`.

#### Light Mode (default)

| Token | HSL | Hex (approx) | Usage |
|-------|-----|--------------|-------|
| `--background` | `0 0% 100%` | `#FFFFFF` | Page background |
| `--foreground` | `222 47% 11%` | `#0F172A` | Primary text, editorial-dark sections |
| `--primary` | `42 50% 57%` | `#C9A962` | Gold accent -- CTAs, active states, rings |
| `--primary-foreground` | `0 0% 5%` | `#0D0D0D` | Text on primary buttons |
| `--secondary` | `220 14% 96%` | `#F1F5F9` | Secondary surface |
| `--secondary-foreground` | `222 47% 11%` | `#0F172A` | Text on secondary |
| `--muted` | `220 14% 96%` | `#F1F5F9` | Muted surface (dropdowns, cards) |
| `--muted-foreground` | `220 9% 46%` | `#64748B` | Secondary text, labels |
| `--accent` | `42 50% 97%` | `#FBF8F0` | Gold-tinted highlight surface |
| `--accent-foreground` | `42 50% 40%` | `#997A33` | Text on accent surface |
| `--destructive` | `0 72% 51%` | `#DC2626` | Errors, remove actions |
| `--success` | `160 84% 39%` | `#10B981` | Positive outcomes, safety schools |
| `--warning` | `38 92% 50%` | `#F59E0B` | Caution states, target schools |
| `--border` | `220 13% 91%` | `#E2E8F0` | Dividers, card borders |
| `--card` | `0 0% 100%` | `#FFFFFF` | Card backgrounds |
| `--ring` | `42 50% 57%` | `#C9A962` | Focus rings |

#### Dark Mode

| Token | HSL | Hex (approx) | Usage |
|-------|-----|--------------|-------|
| `--background` | `240 6% 6%` | `#0F0F11` | Page background |
| `--foreground` | `220 14% 96%` | `#F1F5F9` | Primary text |
| `--primary` | `42 50% 65%` | `#D4B872` | Brighter gold for contrast |
| `--card` | `240 4% 10%` | `#18181B` | Card surfaces |
| `--muted` | `240 4% 14%` | `#232326` | Muted surfaces |
| `--muted-foreground` | `220 9% 66%` | `#94A3B8` | Secondary text |
| `--border` | `240 4% 18%` | `#2C2C30` | Borders |
| `--accent` | `42 50% 14%` | `#332B1A` | Gold-tinted highlight |
| `--accent-foreground` | `42 50% 65%` | `#D4B872` | Text on dark accent |

#### Chart Colors

| Token | Light | Dark | Semantic |
|-------|-------|------|----------|
| `--chart-1` | Gold | Bright gold | Primary metric |
| `--chart-2` | Emerald | Bright emerald | Success / positive |
| `--chart-3` | Amber | Bright amber | Warning / neutral |
| `--chart-4` | Slate | Light slate | Muted data |
| `--chart-5` | Red | Bright red | Destructive / negative |

#### Semantic Probability Colors (inline, not tokens)

| Range | Text Class | Bar Class | Usage |
|-------|-----------|-----------|-------|
| >= 60% | `text-emerald-600` | `bg-emerald-500` | Safety school |
| 30-59% | `text-amber-600` | `bg-amber-500` | Target school |
| < 30% | `text-red-600` | `bg-red-500` | Reach school |

#### Urgency Colors (deadline pages)

| Days left | Class | Meaning |
|-----------|-------|---------|
| < 0 | `text-foreground/30` | Past due |
| <= 7 | `text-red-400` | Critical |
| <= 30 | `text-amber-400` | Soon |
| > 30 | `text-emerald-400` | Comfortable |

---

### 1.2 Typography

Three font families loaded via `next/font/google` in the root layout:

| Token | Family | Usage |
|-------|--------|-------|
| `--font-display` | Plus Jakarta Sans (400, 500, 600, 700) | Headings, logo, hero text |
| `--font-sans` / `--font-inter` | Inter + Geist (system fallback) | Body copy, UI labels |
| `--font-mono` | JetBrains Mono | Code, keyboard shortcuts |

#### Heading Scale (utility classes in `globals.css`)

| Class | Font | Size | Weight | Tracking |
|-------|------|------|--------|----------|
| `.heading-display` | Display | 4xl (2.25rem) | 600 | tight |
| `.heading-1` | Display | 3xl (1.875rem) | 600 | tight |
| `.heading-2` | Display | 2xl (1.5rem) | 500 | default |
| `.heading-3` | Sans | xl (1.25rem) | 600 | default |
| `.body-small` | Sans | sm (0.875rem) | 400 | default |
| `.label-text` | Sans | sm (0.875rem) | 500 | wide |

Hero sections use `heading-serif text-4xl md:text-5xl` with `font-[family-name:var(--font-heading)]`.

Category labels use `text-[10px] font-bold uppercase tracking-[0.15em]` or `tracking-widest`.

Keyboard shortcuts use `font-mono text-[10px]` inside `<kbd>` elements.

---

### 1.3 Spacing System

Tailwind CSS v4 default scale (rem-based, 4px grid):

| Token | Value | Common usage |
|-------|-------|-------------|
| `px-6` | 1.5rem (24px) | Page horizontal padding |
| `py-3.5` | 0.875rem | Navbar vertical padding |
| `pt-8` | 2rem | Section top padding |
| `py-16` | 4rem | Hero sections, footer |
| `gap-8` | 2rem | Column gutters |
| `gap-3` | 0.75rem | Card grid gaps |
| `mb-6` | 1.5rem | Between section blocks |

Max content widths:
- `max-w-7xl` (80rem): Schools page, dashboard, footer
- `max-w-6xl` (72rem): Recommended schools
- `max-w-4xl` (56rem): ROI calculator, compare
- `max-w-3xl` (48rem): Simulator, hero text
- `max-w-xl` (36rem): Onboarding cards
- `max-w-sm` (24rem): Footer description

---

### 1.4 Component Library (shadcn/ui)

Components located in `src/components/ui/`:

| Component | File | Usage |
|-----------|------|-------|
| `Accordion` | `accordion.tsx` | FAQ sections, expandable details |
| `AnimatedCounter` | `animated-counter.tsx` | Trust stats number animation |
| `Avatar` | `avatar.tsx` | User profile, mentor photos |
| `Badge` | `badge.tsx` | Tags (New, Beta), tier badges |
| `BentoGrid` | `bento-grid.tsx` | Dashboard feature grids |
| `Button` | `button.tsx` | Primary/secondary/ghost variants |
| `Card` | `card.tsx` | Content containers (`Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`) |
| `Command` | `command.tsx` | Command palette (Cmd+K) |
| `Confetti` | `confetti.tsx` | Celebration on onboarding complete |
| `Dialog` | `dialog.tsx` | Modal dialogs |
| `DotBackground` | `dot-background.tsx` | Decorative dot pattern |
| `DropdownMenu` | `dropdown-menu.tsx` | Context menus |
| `Globe` | `globe.tsx` | 3D globe visualization |
| `InputGroup` | `input-group.tsx` | Input with icon prefix |
| `Input` | `input.tsx` | Text inputs |
| `Marquee` | `marquee.tsx` | Scrolling testimonial carousel |
| `ScoreGauge` | `score-gauge.tsx` | Circular score visualization |
| `ScrollArea` | `scroll-area.tsx` | Custom scrollbar regions |
| `Select` | `select.tsx` | Dropdown selects |
| `Separator` | `separator.tsx` | Horizontal rules |
| `Sheet` | `sheet.tsx` | Slide-over panels (sidebar on mobile) |
| `Skeleton` | `skeleton.tsx` | Loading placeholder shapes |
| `SpotlightCard` | `spotlight-card.tsx` | Hover-spotlight effect cards |
| `Tabs` | `tabs.tsx` | Tab navigation (`TabsList`, `TabsTrigger`, `TabsContent`) |
| `Textarea` | `textarea.tsx` | Multi-line text input |
| `Tooltip` | `tooltip.tsx` | Hover tooltips |

#### Custom Components (non-shadcn)

| Component | File | Purpose |
|-----------|------|---------|
| `Navbar` | `Navbar.tsx` | Top navigation with journey-based dropdowns |
| `MobileTabBar` | `MobileTabBar.tsx` | iOS-style bottom tab bar |
| `CommandPalette` | `CommandPalette.tsx` | Cmd+K school search overlay |
| `EmptyState` | `EmptyState.tsx` | Zero-data states (icon + title + description + CTA) |
| `EmailCapture` | `EmailCapture.tsx` | Waitlist email forms (banner, compact, contextual variants) |
| `ToolCrossLinks` | `ToolCrossLinks.tsx` | "Related tools" links at page bottom |
| `UsageGate` | `UsageGate.tsx` | Paywall wrapper with feature-specific copy |
| `LoadingSkeleton` | `LoadingSkeleton.tsx` | Full-page spinner |
| `ThemeToggle` | `ThemeToggle.tsx` | Sun/Moon dark mode toggle |
| `AuthButton` | `AuthButton.tsx` | Sign in / Sign out |
| `ProfilePill` | `ProfilePill.tsx` | User avatar pill in navbar |
| `PlanPill` | `PlanPill.tsx` | Current tier badge in navbar |
| `RadarChart` | `RadarChart.tsx` | SVG radar chart (custom, no library) |
| `ErrorBoundary` | `ErrorBoundary.tsx` | React error boundary |
| `OfflineBanner` | `OfflineBanner.tsx` | Offline detection banner |
| `ScrollToTop` | `ScrollToTop.tsx` | Scroll-to-top button |
| `Toast` | `Toast.tsx` | Notification toasts |
| `WebVitals` | `WebVitals.tsx` | Core Web Vitals reporting |
| `GlobalErrorHandler` | `GlobalErrorHandler.tsx` | Unhandled error catcher |
| `KeyboardShortcuts` | `KeyboardShortcuts.tsx` | Global keyboard shortcut handler |

---

### 1.5 Icon Library

**Lucide React** is the sole icon library. Icons are imported individually per page. Commonly used icons:

- **Navigation**: `Menu`, `X`, `ChevronDown`, `ChevronUp`, `ArrowRight`, `ArrowLeft`, `Search`
- **Domains**: `GraduationCap`, `Briefcase`, `DollarSign`, `Globe`, `Users`, `FileText`, `Mic`
- **Actions**: `Plus`, `Trash2`, `Copy`, `Download`, `Send`, `RefreshCw`, `RefreshCcw`
- **Status**: `CheckCircle2`, `AlertTriangle`, `AlertCircle`, `Clock`, `Hourglass`, `Loader2`
- **Features**: `Target`, `BarChart3`, `TrendingUp`, `Sparkles`, `Flame`, `BookOpen`, `Scale`

Default icon size is 16px in navigation, 18-20px in tool cards, 48px in empty states.

---

### 1.6 Motion / Animation Principles

#### Libraries
- **Framer Motion** (`motion`, `AnimatePresence`): Page transitions, card reveals, onboarding steps
- **tw-animate-css**: Tailwind-native animations (`animate-in`, `fade-in`, `slide-in-from-top-1`)
- **Custom CSS keyframes** in `globals.css`

#### Animation Inventory

| Animation | Duration | Easing | Where Used |
|-----------|----------|--------|------------|
| `fade-in` | 0.4s | ease-out | Interview chat messages |
| `orb-float-1/2/3` | 8-12s | ease-in-out | Hero background orbs |
| `marquee-left/right` | linear infinite | linear | Testimonial carousel |
| `blink` | 0.8s | step-end | Typewriter cursor |
| `timer-pulse` | 2s | ease-in-out | Interview timer (warning) |
| `timer-pulse-fast` | 0.6s | ease-in-out | Interview timer (critical) |
| `checkmark-draw` | 0.5s | ease-out | Completion checkmark |
| `score-flash` | 2s | ease-out | Score reveal |
| `ripple` | 0.6s | ease-out | Button click effect |
| `grain` | 8s | steps(10) | Film grain overlay |
| Framer `y: 12 -> 0` | delay: i * 0.05-0.06s | default | Staggered card reveals (results) |
| Framer scale 0.9 -> 1 | 0.5s | ease-out | Onboarding completion |
| `animate-spin` | CSS default | linear | Loading spinners |
| `animate-pulse` | CSS default | ease | Skeleton loaders |

#### Principles
1. **Entrance only** -- items animate in; no exit animations except `AnimatePresence` for step transitions
2. **Staggered reveals** -- result lists use `delay: i * 0.05s` for sequential appearance
3. **Subtle parallax** -- hero floating badges respond to mouse position via `data-parallax` depth
4. **Performance-first** -- heavy sections (testimonials, featured schools) are lazy-loaded via `next/dynamic`
5. **Reduced motion respected** -- Framer Motion respects `prefers-reduced-motion` by default

---

## 2. Navigation Architecture

### 2.1 Primary Navigation (Navbar)

**File**: `src/components/Navbar.tsx`

The navbar uses a **journey-based mental model** -- 5 stages that mirror how an MBA aspirant thinks:

```
EXPLORE  |  BUILD  |  APPLY  |  INTERVIEW  |  DECIDE  |  Pricing  |  [Search]  |  [Theme]  |  [Plan]  |  [Profile]  |  [Auth]
```

Each stage is a dropdown with max 6 items:

| Stage | Items |
|-------|-------|
| **Explore** | School Directory, Odds Calculator, Community Decisions, Compare Schools, Profile Report, Rankings |
| **Build** | Essay Evaluator, Resume Roaster, Storyteller, Goal Sculptor, Essay Drafts |
| **Apply** | Application Tracker, Deadline Calendar, App Checklist, Rec Strategy, Networking Hub |
| **Interview** | Mock Interview, Question Bank |
| **Decide** | Scholarships & Aid, Waitlist Strategy, ROI Calculator, Salary Calculator |

Dropdown behavior:
- Opens on hover (desktop) with 150ms close delay
- Each item has icon (16px Lucide) + label + description
- Active state: `text-primary` on group label, `bg-accent text-primary` on item
- Dropdown surface: `bg-muted border border-border` with `animate-in fade-in slide-in-from-top-1`

Right section: Search trigger (Cmd+K kbd badge), ThemeToggle, divider, PlanPill, ProfilePill, AuthButton.

Fixed positioning: `fixed w-full z-50` with `bg-background border-b border-border`.

### 2.2 Mobile Navigation

**Hamburger + Right Drawer** (md breakpoint, <768px):

- Hamburger button top-right toggles right-side drawer (w-80, max-w-[85vw])
- Backdrop: `bg-black/70` overlay, click to close
- Drawer surface: `bg-muted border-l border-border`
- Content: All journey groups rendered vertically with stage labels
- Bottom: PlanPill, ProfilePill, AuthButton
- Body scroll locked when open
- Auto-closes on route change

**Bottom Tab Bar** (`MobileTabBar.tsx`):

Fixed bottom bar visible only on mobile (md:hidden):

| Tab | Icon | Route |
|-----|------|-------|
| Home | `LayoutDashboard` | `/dashboard` |
| Schools | `Search` | `/schools` |
| Essay AI | `FileText` | `/evaluator` |
| My List | `GraduationCap` | `/my-schools` |

- Height: `h-14` with `safe-area-inset-bottom` padding
- Active: `text-primary` + thicker stroke (2.5 vs 1.5)
- Surface: `bg-card border-t border-border`

### 2.3 Sidebar Navigation (Dashboard)

**File**: `src/components/layout/Sidebar.tsx`

The dashboard page includes a sidebar with **journey stage navigation** (6 stages from `JOURNEY_STAGES`):

| Stage | Icon | Description |
|-------|------|-------------|
| Explore | `Search` | Research schools and programs |
| Prepare | `BookOpen` | GMAT prep, timeline, recommenders |
| Write | `PenTool` | Essays, applications, supplements |
| Practice | `Mic` | Interview prep and mock sessions |
| Decide | `Scale` | Compare offers and choose |
| Engage | `Users` | Connect with admitted community |

Stage status: `past` (completed), `current` (active), `future` (locked).

Mobile: Sidebar collapses into a `Sheet` slide-over component.

### 2.4 Command Palette (Cmd+K)

**File**: `src/components/CommandPalette.tsx`

- Triggered by Cmd+K (macOS) / Ctrl+K (Windows) or clicking search button in navbar
- Modal overlay with search input
- Real-time school search via `/api/schools` endpoint
- Quick links: School Directory, Compare Schools, Community Decisions, Profile Report, Dashboard
- Keyboard navigation: arrow keys + Enter
- Escape to close

### 2.5 Cross-Linking Between Tools

**File**: `src/components/ToolCrossLinks.tsx`

Every tool page renders a "Related Tools" section at the bottom. The component:
- Takes `current` route to exclude itself
- Shows 4 contextually relevant tools from the same and adjacent journey stages
- Uses deterministic hash-based selection for consistency
- Links organized by category: explore, build, apply, interview, decide, utility

### 2.6 Breadcrumb Patterns

No dedicated breadcrumb component exists. Navigation context is provided through:
- Category labels (e.g., `text-xs uppercase tracking-widest text-muted-foreground` reading "School Directory")
- Back links (e.g., `<- Back to schools` on school detail page)
- The active state highlighting in the navbar dropdowns

---

## 3. Page-by-Page UI Spec

### 3.1 Landing Page

| Attribute | Value |
|-----------|-------|
| **Route** | `/` |
| **Purpose** | Convert visitors into onboarded users via trust signals, social proof, and a live odds calculator. |
| **Layout** | Full-width, stacked sections |
| **Key Components** | `HeroSection`, `WelcomeBack`, `TrustBar`, `OddsCalculator`, `HowItWorks` (lazy), `TestimonialGrid` (lazy), `FeaturedSchools` (lazy), `EmailCapture`, `RecommendedSchools` |
| **Data Sources** | `GET /api/schools` (featured schools, total count) |
| **User Interactions** | Toggle odds calculator, email capture, CTA to onboarding/pricing |
| **Conditional Rendering** | Returning users (`hasProfile`) see `WelcomeBack` + `RecommendedSchools` instead of `HeroSection` + `HowItWorks` |
| **Empty State** | Fallback total count of 840 if API fails |
| **Error State** | Silent -- fallback data shown |
| **Loading State** | Lazy sections load on scroll |

Hero section features:
- Floating school badges with parallax on mouse move
- Animated gradient orbs (CSS keyframes)
- Trust stats: "840+ Programs", "12K+ Real Decisions", "100+ AI Tools", "5K+ Applicants"
- Two CTAs: "Start Your Profile" (primary gold) and "Watch Demo" or toggle odds calculator

### 3.2 Onboarding

| Attribute | Value |
|-----------|-------|
| **Route** | `/onboarding` |
| **Purpose** | Collect user profile data through a branching questionnaire to personalize dashboard. |
| **Layout** | Full-screen centered, no navbar chrome |
| **Key Components** | `QuestionCard`, `SingleChoice`, `SliderInput`, `MultiSelect`, `SchoolPicker`, `ConfettiEffect` |
| **Data Sources** | Zustand persisted store (`onboarding.ts`), school list from `/api/schools` (SchoolPicker) |
| **User Interactions** | Select branch, fill profile fields, navigate with Back/Continue |
| **State Management** | `useOnboardingStore` (Zustand + persist) |
| **Completion** | Confetti animation, 3s delay, redirect to `/dashboard` |

7 archetypes with different step counts:

| Archetype | Trigger Answer | Steps |
|-----------|---------------|-------|
| Explorer | "I'm not sure if MBA is right for me" | 4 (branch + industry, years, motivation) |
| Compass | "Decided on MBA, figuring out where" | 5 (branch + countries, priorities, citizenship, budget) |
| List Builder | "Building my school shortlist" | 7 (branch + countries, GMAT, GPA, experience, format, schools) |
| Strategist | "Actively applying to schools" | 6 (branch + schools, round, GMAT, phase, challenge) |
| Writer | Same flow as Strategist | 6 |
| Performer | Same flow as Strategist | 6 |
| Decider | "Admitted, choosing between schools" | 5 (branch + admitted schools, waitlists, scholarships, decision factor) |

UI elements:
- Progress dots: `h-2 rounded-full`, active dot `w-8 bg-gold`, past dots `w-2 bg-gold/40`, future dots `w-2 bg-muted-foreground`
- Step counter: `text-xs text-muted-foreground`
- AnimatePresence for smooth step transitions

### 3.3 Dashboard

| Attribute | Value |
|-----------|-------|
| **Route** | `/dashboard` |
| **Purpose** | Personalized command center showing journey progress, next steps, deadlines, and relevant tools. |
| **Layout** | Shell with sidebar + main content area |
| **Key Components** | `Sidebar`, `JourneyProgress`, `DashboardHero`, `NextStepCard`, `DeadlineWidget`, `StageToolGrid`, `PortfolioPage` (lazy) |
| **Data Sources** | `GET /api/schools` (enriched list), deadlines from school data, onboarding store |
| **User Interactions** | Switch journey stages, click next actions, expand tools |
| **Loading State** | Skeleton pulse for portfolio board |
| **Conditional** | Strategist archetypes get embedded `PortfolioPage`; others get stage-specific tool grid |

### 3.4 School Directory

| Attribute | Value |
|-----------|-------|
| **Route** | `/schools` |
| **Purpose** | Browse, search, filter, and sort 840+ MBA programs with infinite scroll. |
| **Layout** | Full-width, left filter panel + right results grid |
| **Key Components** | `SearchBar`, `FilterPanel`, `MobileFilterTrigger`, `FilterChip`, `SchoolCard3D`, `SchoolCardSkeleton`, `EmptyState`, `EmailCapture`, `ToolCrossLinks` |
| **Data Sources** | `POST /api/schools/search` (paginated, filterable), `GET /api/schools` (country list) |
| **User Interactions** | Type search (300ms debounce), adjust filters (GMAT, acceptance, tuition, country, format, tier, test-optional), sort (ranking, fit score, acceptance, tuition, GMAT, name), infinite scroll |
| **Empty State** | `SearchX` icon + contextual message + "Clear All Filters" button |
| **Error State** | Red alert card with "Retry" button |
| **Loading State** | 12-card skeleton grid, 6-card skeleton during pagination |

Sub-routes:
- `/schools/city/[slug]` -- Schools by city
- `/schools/country/[slug]` -- Schools by country
- `/schools/region/[slug]` -- Schools by region

### 3.5 School Detail

| Attribute | Value |
|-----------|-------|
| **Route** | `/school/[schoolId]` |
| **Purpose** | Comprehensive school profile with tabs for overview, essays, deadlines, admissions, employment, and costs. |
| **Layout** | Full-width with tab navigation |
| **Key Components** | `Tabs` (shadcn), `SchoolHeader`, `ApplicantInsights`, `RealApplicantData`, `ApplicationSection`, `OverviewTab`, `EssaysTab`, `DeadlinesTab`, `AdmissionsTab`, `EmploymentTab`, `CostsTab` |
| **Data Sources** | `GET /api/schools/{schoolId}`, `GET /api/schools/{schoolId}/insights` |
| **User Interactions** | Tab switching (6 tabs), generate applicant insights with profile input, track school |
| **Error State** | 404 triggers `notFound()` |
| **Loading State** | Component-level loading per tab |

Tab structure:
1. **Overview** -- Key stats, class profile, specializations
2. **Essays** -- Current essay prompts
3. **Deadlines** -- Round deadlines with countdown
4. **Admissions** -- Acceptance rates, GMAT/GPA distributions
5. **Employment** -- Post-MBA outcomes, industry placement
6. **Costs** -- Tuition, living costs, financial aid

### 3.6 Simulator (Odds Calculator)

| Attribute | Value |
|-----------|-------|
| **Route** | `/simulator` |
| **Purpose** | Monte Carlo simulation to estimate admit probability at selected schools. |
| **Layout** | Dark hero banner + centered content (`max-w-3xl`) |
| **Key Components** | `UsageGate`, `EmptyState`, `EmailCapture`, `ToolCrossLinks`, Framer Motion staggered cards |
| **Data Sources** | `POST /api/admit-simulator`, `GET /api/schools` |
| **User Interactions** | Set GMAT (Focus/Classic toggle), GPA, work years, checkboxes (URM, International, Military, Nonprofit), add/remove schools (max 8), apply presets (M7, T15), run simulation |
| **Empty State** | Dices icon + "No simulation results yet" |
| **Error State** | Red alert card with dismiss button |
| **Loading State** | Rotating Dices icon + "Running 100 simulations..." |
| **Gated** | Results wrapped in `UsageGate` for `odds_calculator` |

Result cards show:
- School name (links to `/school/{id}`), verdict badge (Reach/Target/Safety), probability percentage (color-coded)
- Confidence interval bar visualization
- Simulation breakdown (accepted/rejected out of 100 rounds)
- Post-result CTAs: contextual next actions based on results

### 3.7 ROI Calculator

| Attribute | Value |
|-----------|-------|
| **Route** | `/roi` |
| **Purpose** | Compare 10-year return on investment across schools. |
| **Layout** | Dark hero banner + centered content (`max-w-4xl`) |
| **Key Components** | `UsageGate`, `EmailCapture`, `ToolCrossLinks`, Framer Motion cards |
| **Data Sources** | `GET /api/schools/{id}/roi?current_salary={n}&years=10` (per school) |
| **User Interactions** | Set current salary, add/remove schools (max 8), auto-calculates on selection change |
| **Empty State** | `TrendingUp` icon or `Calculator` icon depending on whether schools are selected |
| **Error State** | Red banner with dismiss |
| **Loading State** | Centered spinner |
| **Gated** | Results in `UsageGate` for `roi_calculator` |

Each result card shows: Total Investment, Post-MBA Salary, 10-Year Net Gain, Breakeven Year, ROI percentage.

### 3.8 Career Simulator

| Attribute | Value |
|-----------|-------|
| **Route** | `/career-simulator` |
| **Purpose** | Compare salary trajectories with and without an MBA over 10 years. |
| **Layout** | Full-width, form + chart |
| **Key Components** | Recharts `LineChart`, `ResponsiveContainer`, `ToolCrossLinks` |
| **Data Sources** | Backend career trajectory API |
| **User Interactions** | Input current role/industry/salary, select MBA vs no-MBA paths |
| **Data Viz** | Dual line chart (with MBA vs without MBA) over 10-year timeline |

### 3.9 Compare Schools

| Attribute | Value |
|-----------|-------|
| **Route** | `/compare` |
| **Purpose** | Side-by-side school comparison with real applicant data and charts. |
| **Layout** | Full-width (`max-w-4xl` or wider) |
| **Key Components** | `UsageGate`, `GmatDistributionChart`, `GpaDistributionChart`, `IndustryChart`, `ProfileFitBars`, `EmptyState`, `EmailCapture`, `ToolCrossLinks` |
| **Data Sources** | `GET /api/schools/{id}` (per school), community decisions data |
| **User Interactions** | Add/remove schools (up to 4), view comparison across all dimensions |
| **Gated** | Detailed comparison in `UsageGate` for `school_compare` |

### 3.10 Compare Countries

| Attribute | Value |
|-----------|-------|
| **Route** | `/compare-countries` |
| **Purpose** | Compare MBA destinations across tuition, visa, salary, cost of living. |
| **Layout** | Full-width table/card comparison |
| **Key Components** | `ToolCrossLinks`, country selection, comparison table |
| **Data Sources** | `/api/compare-countries` endpoint |
| **User Interactions** | Select 2-4 countries to compare, view side-by-side metrics |

### 3.11 MBA in [Country]

| Attribute | Value |
|-----------|-------|
| **Route** | `/mba-in/[country]` |
| **Purpose** | Country-specific MBA guide with tuition, visa, top schools, cost data. |
| **Layout** | Full-width, static content |
| **Key Components** | `CountryProfileClient` (client component) |
| **Data Sources** | Static params generation for 10 countries; API for country data |
| **SEO** | Server-side metadata generation per country |

### 3.12 Essay Coach

| Attribute | Value |
|-----------|-------|
| **Route** | `/essays/coach` |
| **Purpose** | AI-powered essay writing workspace with prompt selection, editor, and real-time coaching. |
| **Layout** | Split panel (prompt list left, editor right) |
| **Key Components** | `EssayEditor`, `AICoach`, `PromptCard`, `Button` (shadcn), `Badge` (shadcn) |
| **Data Sources** | Mock prompts for HBS, Stanford GSB, Wharton, Booth, Kellogg |
| **User Interactions** | Select school, pick prompt, write essay, get AI coaching feedback |

### 3.13 Essay Examples

| Attribute | Value |
|-----------|-------|
| **Route** | `/essays/examples` |
| **Purpose** | Library of 42 anonymized essays across 14 schools with filtering and search. |
| **Layout** | Full-width with search + filter bar + card grid |
| **Key Components** | `EmailCapture`, `ToolCrossLinks`, filter/search, card expand |
| **Data Sources** | `GET /api/essays/examples` (paginated), `GET /api/essays/examples/{id}` (full content) |
| **User Interactions** | Search by keyword, filter by school/theme/outcome, expand to read full essay with coach notes |

### 3.14 Essay Themes

| Attribute | Value |
|-----------|-------|
| **Route** | `/essays/themes` |
| **Purpose** | Analyze theme distribution across multiple essays to avoid overlap and find gaps. |
| **Layout** | Full-width with essay input forms + analysis matrix |
| **Key Components** | `ToolCrossLinks`, `EmailCapture`, theme color coding |
| **Data Sources** | `/api/essays/analyze-themes` |
| **User Interactions** | Add multiple essays (school + prompt + content), analyze themes, view overlap matrix and gap recommendations |

Theme colors: Leadership (amber), Innovation (violet), Social Impact (emerald), Global (sky), Analytical (indigo), Personal Growth (rose), Collaboration (teal), Vision (primary/gold), Diversity (pink), Ethics (orange).

### 3.15 Essay Prompts

| Attribute | Value |
|-----------|-------|
| **Route** | `/essay-prompts` |
| **Purpose** | Browse all essay prompts across schools with search and copy-to-clipboard. |
| **Layout** | Full-width, searchable list |
| **Key Components** | `EmptyState`, `ToolCrossLinks`, `EmailCapture`, copy button |
| **Data Sources** | `GET /api/essay-prompts` |
| **User Interactions** | Search prompts, filter by school, copy prompt text, load more (paginated at 50) |

### 3.16 Interview (Mock Interview)

| Attribute | Value |
|-----------|-------|
| **Route** | `/interview` |
| **Purpose** | AI-powered mock interview simulator with voice support, timer, and feedback scoring. |
| **Layout** | Immersive full-screen when active (hides scrollbar) |
| **Key Components** | `UsageGate`, `EmailCapture`, `ToolCrossLinks`, custom voice hooks (`useVoice`) |
| **Data Sources** | `/api/interviews/mock` (streaming), `/api/interviews/feedback` |
| **User Interactions** | Select school + difficulty (friendly/standard/pressure), start interview, respond via text or voice, skip questions, end early, view 8-dimension feedback |
| **Gated** | `UsageGate` for `interview_simulator` |

Feedback dimensions: Conciseness, STAR Method, Narrative Strength, Communication Clarity, Authenticity, Self-Awareness, School Fit, Overall Score.

Custom animations: Timer pulse (warning/critical/flash), checkmark draw, score flash, grain overlay.

Sub-route: `/interview/questions` -- Curated question bank.

### 3.17 Interview Guide

| Attribute | Value |
|-----------|-------|
| **Route** | `/interviews/guide/[slug]` |
| **Purpose** | School-specific interview intelligence: format, style, sample questions, tips. |
| **Layout** | Full-width content page |
| **Key Components** | `InterviewGuideClient` (client component) |
| **Data Sources** | `GET /api/interviews/guide/{slug}` (server-side fetch with 1hr revalidation) |
| **SEO** | Server-side metadata with school name |

### 3.18 Portfolio Board

| Attribute | Value |
|-----------|-------|
| **Route** | `/portfolio` |
| **Purpose** | Kanban-style application tracker with drag-and-drop status management. |
| **Layout** | Full-width horizontal kanban board |
| **Key Components** | `DndContext`, `SortableContext` (dnd-kit), `useSortable`, `DragOverlay`, React Query mutations |
| **Data Sources** | Portfolio API (CRUD) |
| **User Interactions** | Drag schools between columns, add new schools, view completion percentage |
| **Columns** | Researching, Preparing, Drafting, Submitted, Interview, Decided |

### 3.19 Decision Matrix

| Attribute | Value |
|-----------|-------|
| **Route** | `/decide` |
| **Purpose** | Weighted decision matrix for choosing between admitted schools. |
| **Layout** | Full-width (`max-w-4xl`) |
| **Key Components** | `ToolCrossLinks`, `EmailCapture`, weighted scoring system |
| **Data Sources** | `GET /api/schools/{id}` (per admitted school) |
| **User Interactions** | Add admitted/waitlisted schools, set financial aid amounts, set deposit deadlines, adjust dimension weights (sliders), view ranked comparison |

Dimensions: Tuition (net of aid), Median Salary, Employment Rate, Location, Class Size, Acceptance Rate -- each with configurable weight.

### 3.20 Recommendations

| Attribute | Value |
|-----------|-------|
| **Route** | `/recommendations` |
| **Purpose** | AI-generated school recommendations categorized as Reach/Target/Safety. |
| **Layout** | Full-width, form + results |
| **Key Components** | School cards with fit scores, categorized sections |
| **Data Sources** | `/api/recommendations` (POST with profile) |
| **User Interactions** | Input profile (GMAT, GPA, work years, industry), generate recommendations |

### 3.21 Peer Compare

| Attribute | Value |
|-----------|-------|
| **Route** | `/peer-compare` |
| **Purpose** | Compare your profile against the applicant pool at specific schools. |
| **Layout** | Full-width with radar chart + dimension breakdowns |
| **Key Components** | `RadarChart` (custom SVG), `UsageGate`, `EmptyState`, `ToolCrossLinks` |
| **Data Sources** | `/api/peer-compare` (POST) |
| **User Interactions** | Select school, input profile, view percentile rankings across dimensions |
| **Gated** | `UsageGate` for peer comparison |

### 3.22 Mentors

| Attribute | Value |
|-----------|-------|
| **Route** | `/mentors` |
| **Purpose** | Browse and connect with MBA alumni mentors, filtered by school, industry, expertise. |
| **Layout** | Full-width, search/filter + card grid |
| **Key Components** | `ToolCrossLinks`, search, filter, sort |
| **Data Sources** | `/api/mentors` |
| **User Interactions** | Search mentors, filter by school/industry/availability, sort by rating/price, view profiles |

Sub-routes:
- `/mentors/[id]` -- Mentor detail profile
- `/mentors/apply` -- Apply to become a mentor

### 3.23 Recommenders

| Attribute | Value |
|-----------|-------|
| **Route** | `/recommenders` |
| **Purpose** | Plan and track recommendation letters -- AI strategy + status tracker. |
| **Layout** | Full-width, two sections (strategy generator + tracker) |
| **Key Components** | `UsageGate`, `ToolCrossLinks`, `EmailCapture`, status tracker with `RecStatus` states |
| **Data Sources** | `/api/recommenders/strategy` (POST), local state for tracker |
| **User Interactions** | Input recommender details, generate AI strategy, track rec status (not_asked -> asked -> accepted -> submitted), send reminders |
| **Gated** | AI strategy in `UsageGate` for `rec_strategy` |

### 3.24 Financial Aid

| Attribute | Value |
|-----------|-------|
| **Route** | `/financial-aid` |
| **Purpose** | Compare net cost across schools with scholarship amounts factored in. |
| **Layout** | Full-width, input form + comparison cards |
| **Key Components** | School picker, scholarship input per school, ROI comparison |
| **Data Sources** | School data APIs, financial aid APIs |
| **User Interactions** | Add schools, input scholarship amounts, view net tuition + total cost + ROI |

### 3.25 Pricing

| Attribute | Value |
|-----------|-------|
| **Route** | `/pricing` |
| **Purpose** | Display pricing tiers (Free, Pro, Premium, Consultant) with billing toggle. |
| **Layout** | Centered, cards side-by-side |
| **Key Components** | `Card` (shadcn), `Button`, `Badge`, billing interval toggle |
| **Data Sources** | Static tier definitions; PostHog for tracking |
| **User Interactions** | Toggle monthly/annual billing, select tier, CTA to checkout |

Tiers:

| Tier | Monthly | Annual | Key Limits |
|------|---------|--------|------------|
| Free | $0 | $0 | 3 odds/day, 1 essay/mo, 3 interviews/mo |
| Pro | $29 | $199 (43% off) | 10 essays/mo, 20 interviews/mo, unlimited odds |
| Premium | $79 | $449 | Unlimited everything, priority AI |
| Consultant | Custom | Custom | Multi-client, white-label |

### 3.26 Scholarship Estimate

| Attribute | Value |
|-----------|-------|
| **Route** | `/scholarship-estimate` |
| **Purpose** | Estimate scholarship probability and amount at target schools. |
| **Layout** | Full-width, profile form + school picker + results |
| **Key Components** | `UsageGate`, `EmptyState`, `EmailCapture`, `ToolCrossLinks` |
| **Data Sources** | `/api/scholarship-estimate` (POST) |
| **User Interactions** | Input profile, select schools, view estimated awards with probability |
| **Gated** | `UsageGate` for `scholarship_estimate` |

### 3.27 Upcoming Deadlines

| Attribute | Value |
|-----------|-------|
| **Route** | `/upcoming-deadlines` |
| **Purpose** | Chronological view of all MBA deadlines with countdown timers and urgency coloring. |
| **Layout** | Full-width, timeline-style list |
| **Key Components** | `ToolCrossLinks`, `EmailCapture`, urgency color coding |
| **Data Sources** | `/api/calendar` (events + months) |
| **User Interactions** | Filter by type (deadline/decision), expand months |
| **Color coding** | Red (<7d), Amber (<30d), Emerald (>30d), Muted (past) |

### 3.28 Storyteller

| Attribute | Value |
|-----------|-------|
| **Route** | `/storyteller` |
| **Purpose** | AI-powered narrative brainstorming through a conversational chat interface. |
| **Layout** | Three-step flow: setup -> chat -> outline |
| **Key Components** | `UsageGate`, `ToolCrossLinks`, `EmailCapture`, chat interface |
| **Data Sources** | `/api/storyteller` (streaming), `GET /api/schools` |
| **User Interactions** | Select school + essay prompt, engage in AI conversation, generate essay outline |
| **Gated** | `UsageGate` for `storyteller` |

### 3.29 Resume Roaster

| Attribute | Value |
|-----------|-------|
| **Route** | `/roaster` |
| **Purpose** | Brutal AI critique of resume bullet points with improvement suggestions. |
| **Layout** | Centered single-input form + result |
| **Key Components** | `UsageGate`, `ToolCrossLinks`, `EmailCapture` |
| **Data Sources** | `/api/resume-roast` (POST) |
| **User Interactions** | Paste bullet point, submit, view score + roast + improved version, copy to clipboard |
| **Validation** | Zod schema (`resumeRoastSchema`) at form boundary |
| **Gated** | `UsageGate` for `resume_roaster` |

### 3.30 Tools Directory

| Attribute | Value |
|-----------|-------|
| **Route** | `/tools` |
| **Purpose** | Complete directory of all 100+ tools organized by category. |
| **Layout** | Full-width, grouped card grid |
| **Key Components** | `EmailCapture`, tool cards with icons and descriptions |
| **Data Sources** | Static tool definitions |
| **User Interactions** | Browse by category, click to navigate |

Tool categories:
1. Research & Compare (12 tools)
2. Essay & Application (multiple tools)
3. Interview (tools)
4. Financial (tools)
5. Career & Outcomes (tools)

### 3.31 Auth Pages

#### Sign In (`/auth/signin`)

| Attribute | Value |
|-----------|-------|
| **Layout** | Centered card on minimal background |
| **Key Components** | Email/password inputs, submit button, link to signup |
| **Auth** | NextAuth `signIn("credentials")` with 10s timeout |
| **Error State** | Inline error message |
| **Loading State** | `Loader2` spinner in button |

#### Sign Up (`/auth/signup`)

| Attribute | Value |
|-----------|-------|
| **Layout** | Centered card on minimal background |
| **Key Components** | Name/email/password inputs, Zod validation (`signUpSchema`), submit button |
| **Auth** | `POST /api/auth/signup` then auto-sign-in |
| **Validation** | Client-side Zod validation before submission |

### 3.32 Evaluator (Essay Evaluator)

| Attribute | Value |
|-----------|-------|
| **Route** | `/evaluator` |
| **Purpose** | AI essay evaluation with score, detailed feedback, and improvement suggestions. |
| **Layout** | Full-width, form (school + prompt + textarea) + result |
| **Key Components** | `UsageGate`, `ToolCrossLinks`, `EmailCapture` |
| **Data Sources** | `/api/essay-evaluate` (POST), `GET /api/schools` |
| **User Interactions** | Select school, pick prompt, paste/write essay, submit for evaluation |
| **Persistence** | Draft auto-saved to `sessionStorage` (debounced), results saved for session restoration |
| **Validation** | Zod schema (`essayEvaluationSchema`) |
| **Gated** | `UsageGate` for `essay_evaluator` |

### 3.33 Additional Pages (Abbreviated)

The following pages follow the same patterns established above:

| Route | Purpose | Layout | Notable |
|-------|---------|--------|---------|
| `/about` | About the platform | Full-width editorial | Static content |
| `/acceptance-history` | Historical acceptance rates | Full-width data | Charts |
| `/admission-trends` | Year-over-year admission trends | Full-width | Charts |
| `/admit-rate-calc` | Simple admission rate calculator | Centered form | Calculator tool |
| `/alerts` | Notification preferences | Full-width settings | User settings |
| `/alumni` | Alumni network directory | Search + grid | Filterable |
| `/alumni-interview` | Alumni interview prep guide | Content page | Gated |
| `/app-checklist` | Application requirements checklist | Full-width checklist | Per-school |
| `/app-dashboard` | Application management dashboard | Shell layout | Overview |
| `/application-timeline-builder` | Custom timeline builder | Full-width builder | Interactive |
| `/budget` | MBA budget planner | Calculator | Financial tool |
| `/calendar` | Deadline calendar view | Full-width calendar | Date-based |
| `/campus-life` | Campus life comparison | Content cards | Informational |
| `/career-switcher` | Career switch analysis | Form + results | AI-powered |
| `/careers` | Post-MBA career paths | Content grid | Informational |
| `/checklist` | Per-school application checklist | Full-width | Interactive |
| `/checkout` | Payment checkout | Centered form | Stripe integration |
| `/class-profile` | Class demographics comparison | Data + charts | Visual |
| `/class-size` | Class size comparisons | Data table | Rankings |
| `/community` | Community forum/feed | Feed layout | Social |
| `/concentrations` | MBA concentrations guide | Content grid | Filterable |
| `/contact` | Contact form | Centered form | Simple |
| `/cost-of-living` | City cost comparison | Table/cards | Data-driven |
| `/countdown` | Countdown to deadline | Full-screen timer | Single-purpose |
| `/culture` | School culture profiles | Content cards | Informational |
| `/culture-quiz` | Culture fit quiz | Interactive quiz | Gamified |
| `/day-in-life` | Day-in-the-life stories | Content cards | Informational |
| `/decisions` | Community decision database | Search + table | 12K+ entries |
| `/diversity` | Diversity statistics | Data + charts | Visual |
| `/dual-degrees` | Dual degree programs | Content grid | Filterable |
| `/employment/[schoolId]` | School employment report | Data dashboard | Charts |
| `/employment-reports` | Employment reports index | Card grid | Browse |
| `/essay-drafts` | Saved essay drafts | List/card view | CRUD |
| `/essay-length-optimizer` | Real-time word/char counter | Split panel | Live counter |
| `/essay-templates` | Essay structure templates | Content cards | Copyable |
| `/essay-tone-checker` | Essay tone analysis | Form + results | AI-powered |
| `/essay-word-frequency` | Word frequency analyzer | Form + visualization | Text analysis |
| `/evals` | Evaluation history | List view | Saved results |
| `/events` | MBA events calendar | Calendar/list | Date-based |
| `/exchange-programs` | Exchange program directory | Content grid | Filterable |
| `/fee-calculator` | Application fee calculator | Calculator | Financial |
| `/fee-tracker` | Fee payment tracker | Checklist | Per-school |
| `/fee-waivers` | Fee waiver information | Content page | Informational |
| `/fees` | Tuition fee database | Data table | Sortable |
| `/financial-aid-comparison` | Aid package comparison | Table | Side-by-side |
| `/fit-score` | School fit score calculator | Form + results | Gated |
| `/glossary` | MBA admissions glossary | Alphabetical list | Searchable |
| `/gmat-planner` | GMAT study planner | Interactive planner | Calendar |
| `/gmat-predictor` | GMAT score predictor | Calculator | AI-powered |
| `/gmat-score-breakdown` | GMAT section analysis | Data + charts | Visual |
| `/gmat-targets` | GMAT score targets by tier | Data table | Tiered |
| `/gmat-vs-gre` | GMAT vs GRE comparison | Side-by-side | Informational |
| `/goals` | Goal Sculptor -- post-MBA narrative | Chat + outline | AI-powered, gated |
| `/guide` | General admissions guide | Long-form content | Editorial |
| `/guides` | Guides index | Card grid | Browse |
| `/guides/[slug]` | Individual guide | Long-form content | Dynamic |
| `/international-guide` | International applicant guide | Long-form content | Comprehensive |
| `/interview-bank` | Interview question database | Searchable list | Filterable |
| `/loi-builder` | Letter of intent builder | Form + AI generation | Gated |
| `/mba-glossary-quiz` | Glossary quiz | Interactive quiz | Gamified |
| `/mba-myths-quiz` | MBA myths quiz | Interactive quiz | Gamified |
| `/mba-networking-tracker` | Networking contact tracker | CRUD list | Tracker |
| `/mba-roi-by-industry` | ROI by industry | Data + charts | Visual |
| `/mentors/[id]` | Mentor profile | Detail page | Contact CTA |
| `/mentors/apply` | Mentor application | Form | Multi-step |
| `/my-schools` | Application tracker (Kanban light) | Board/list | CRUD |
| `/myths` | MBA myths debunked | Content cards | Informational |
| `/networking-guide` | Networking strategy guide | Long-form | Editorial |
| `/outreach` | Alumni outreach planner | Form + AI generation | Gated |
| `/plan` | Application plan overview | Dashboard-like | Summary |
| `/podcasts` | MBA podcasts directory | Card grid | External links |
| `/post-mba-locations` | Post-MBA city comparison | Map + data | Visual |
| `/pre-mba-checklist` | Pre-application checklist | Interactive checklist | Progress tracking |
| `/privacy` | Privacy policy | Long-form legal text | Static |
| `/profile-report` | AI profile strength report | Form + detailed results | Gated |
| `/program-formats` | Program format guide | Content grid | Informational |
| `/programs` | Programs index (MBA, MiM, EMBA, CAT) | Card grid | Browse |
| `/programs/mba` | Full-time MBA programs | Filtered school list | Search |
| `/programs/mim` | Masters in Management | Filtered school list | Search |
| `/programs/emba` | Executive MBA programs | Filtered school list | Search |
| `/programs/cat` | CAT-based MBA (India) | Filtered school list | Search |
| `/radar` | Profile radar visualization | Radar chart | Visual |
| `/rankings` | School rankings table | Sortable data table | Multi-column sort |
| `/reading-list` | Recommended reading | Card grid | External links |
| `/reapplicant` | Reapplicant strategy guide | Long-form + tools | Editorial |
| `/rec-tracker` | Recommendation letter tracker | CRUD list | Status management |
| `/recommendation-letter-tips` | Rec letter tips | Long-form content | Informational |
| `/resume-keywords` | Resume keyword analyzer | Form + results | AI-powered |
| `/round-strategy` | R1 vs R2 vs R3 strategy | Content + calculator | Decision tool |
| `/salary` | Post-MBA salary calculator | Form + results | Data-driven |
| `/salary-database` | Salary database browser | Searchable table | Filterable |
| `/salary-negotiation` | Salary negotiation guide | Long-form + tools | Actionable |
| `/scholarship-tips` | Scholarship strategy tips | Long-form content | Informational |
| `/scholarships` | Scholarship database | Search + cards | Filterable |
| `/school-culture-map` | Culture visualization | Map/grid | Visual |
| `/school-news` | School news aggregator | Feed layout | Dynamic |
| `/school-visit-checklist` | Campus visit checklist | Interactive checklist | Printable |
| `/score-convert` | GMAT/GRE score converter | Calculator | Two-way |
| `/similar/[schoolId]` | Schools similar to X | Card grid | Algorithmic |
| `/specialty-rankings` | Rankings by specialty | Data table | Filterable |
| `/strength` | Application strength finder | Form + results | Gated |
| `/study-group` | Study group finder | Social feature | Community |
| `/success` | Payment success | Confirmation | Post-checkout |
| `/timeline` | Application timeline | Visual timeline | Interactive |
| `/timeline-viz` | Timeline visualization | Visual | Graphic |
| `/track` | Application status tracker | Status board | CRUD |
| `/tracker` | General tracker tool | List/board | CRUD |
| `/visa` | Visa information guide | Long-form content | By country |
| `/visit-planner` | Campus visit planner | Calendar + checklist | Planning |
| `/waitlist` | Waitlist strategy | Content + tools | Gated |
| `/waitlist-guide` | Waitlist guide | Long-form content | Informational |
| `/word-bank` | Essay word bank | Categorized list | Copyable |
| `/word-counter` | Word/character counter | Live tool | Real-time |

---

## 4. User Journeys

### Archetype 1: Explorer

**Profile**: "I'm not sure if MBA is right for me"

```
Landing (/) --> Onboarding (/onboarding)
  Q1: "I'm not sure if MBA is right for me" --> archetype: explorer
  Q2: What industry? (SingleChoice)
  Q3: Years of experience? (Slider)
  Q4: Motivations? (MultiSelect)
  --> Confetti --> Dashboard (/dashboard, explore stage)
    --> Career Simulator (/career-simulator) -- compare with/without MBA
    --> School Directory (/schools) -- browse programs
    --> Profile Report (/profile-report) -- understand strengths
    --> Compare Countries (/compare-countries) -- decide geography
```

### Archetype 2: Compass

**Profile**: "Decided on MBA, figuring out where"

```
Landing (/) --> Onboarding (/onboarding)
  Q1: "Decided on MBA, figuring out where" --> archetype: compass
  Q2: Target countries? (MultiSelect)
  Q3: Priorities? (MultiSelect)
  Q4: Citizenship? (SingleChoice)
  Q5: Budget range? (SingleChoice)
  --> Dashboard (/dashboard, explore stage)
    --> Compare Countries (/compare-countries)
    --> School Directory (/schools) -- filter by country/budget
    --> Rankings (/rankings) -- sort by priorities
    --> Recommendations (/recommendations) -- AI-matched schools
    --> Compare Schools (/compare) -- shortlist 3-5
```

### Archetype 3: List Builder

**Profile**: "Building my school shortlist"

```
Landing (/) --> Onboarding (/onboarding)
  Q1: "Building my school shortlist" --> archetype: listbuilder
  Q2: Target countries? (MultiSelect)
  Q3: GMAT score? (Slider 400-800)
  Q4: GPA? (Slider 2.0-4.0)
  Q5: Experience + industry? (Slider + SingleChoice)
  Q6: Program format? (SingleChoice)
  Q7: Schools on radar? (SchoolPicker)
  --> Dashboard (/dashboard, explore stage)
    --> Simulator (/simulator) -- odds at selected schools
    --> Compare Schools (/compare) -- deep comparison
    --> Peer Compare (/peer-compare) -- how you stack up
    --> School Detail (/school/[id]) -- drill into each
    --> Portfolio (/portfolio) -- organize shortlist
```

### Archetype 4: Strategist

**Profile**: "Actively applying to schools"

```
Landing (/) --> Onboarding (/onboarding)
  Q1: "Actively applying to schools" --> archetype: strategist
  Q2: Target schools? (SchoolPicker)
  Q3: Target round? (SingleChoice: R1/R2/R3/Unsure)
  Q4: GMAT score? (Slider)
  Q5: Current phase? (SingleChoice)
  Q6: Biggest challenge? (SingleChoice)
  --> Dashboard (/dashboard, embedded PortfolioPage)
    --> Portfolio Board (/portfolio) -- track all apps
    --> Upcoming Deadlines (/upcoming-deadlines) -- countdown view
    --> Calendar (/calendar) -- deadline calendar
    --> Checklist (/checklist) -- per-school requirements
    --> Round Strategy (/round-strategy) -- timing optimization
```

### Archetype 5: Writer

**Profile**: Same onboarding as Strategist, but dashboard emphasis on essays

```
  --> Dashboard (/dashboard, write stage)
    --> Essay Coach (/essays/coach) -- AI writing workspace
    --> Storyteller (/storyteller) -- narrative brainstorming
    --> Essay Themes (/essays/themes) -- theme balance analysis
    --> Evaluator (/evaluator) -- AI essay feedback
    --> Essay Examples (/essays/examples) -- read successful essays
    --> Essay Drafts (/essay-drafts) -- manage all drafts
    --> Essay Length Optimizer (/essay-length-optimizer) -- word counting
```

### Archetype 6: Performer

**Profile**: Same onboarding as Strategist, but dashboard emphasis on interviews

```
  --> Dashboard (/dashboard, practice stage)
    --> Interview Guide (/interviews/guide/[school]) -- school-specific prep
    --> Mock Interview (/interview) -- AI practice session
    --> Interview Bank (/interview-bank) -- question database
    --> Interview Questions (/interview/questions) -- curated Q&A
    --> Alumni Interview (/alumni-interview) -- alumni prep tips
```

### Archetype 7: Decider

**Profile**: "Admitted, choosing between schools"

```
Landing (/) --> Onboarding (/onboarding)
  Q1: "Admitted, choosing between schools" --> archetype: decider
  Q2: Admitted schools? (SchoolPicker)
  Q3: Waitlisted schools? (SchoolPicker, optional)
  Q4: Scholarship situation? (SingleChoice)
  Q5: Decision driver? (SingleChoice)
  --> Dashboard (/dashboard, decide stage)
    --> Decision Matrix (/decide) -- weighted comparison
    --> Financial Aid (/financial-aid) -- net cost comparison
    --> Scholarship Estimate (/scholarship-estimate) -- negotiate aid
    --> ROI Calculator (/roi) -- 10-year returns
    --> Salary Calculator (/salary) -- post-MBA earnings
    --> Cost of Living (/cost-of-living) -- city comparison
    --> Waitlist Strategy (/waitlist) -- if applicable
```

---

## 5. Responsive Design

### 5.1 Breakpoints

| Breakpoint | Width | Tailwind Prefix |
|-----------|-------|-----------------|
| Default | 0-639px | (none) -- mobile-first |
| sm | 640px | `sm:` |
| md | 768px | `md:` |
| lg | 1024px | `lg:` |
| xl | 1280px | `xl:` |

### 5.2 What Changes at Each Breakpoint

#### Mobile (< 640px)
- Single-column layouts for all grids
- Hamburger menu + right drawer navigation
- Bottom tab bar visible (MobileTabBar)
- Main content has `pt-16 pb-16` (navbar + bottom tab clearance)
- Filter panel hidden; replaced by `MobileFilterTrigger` (sheet overlay)
- Hero headings scale down (`text-4xl` to default)
- Cards stack vertically
- SchoolCard3D renders as flat cards (no 3D effects)
- Sidebar collapses into Sheet component

#### Tablet (768px+, `md:`)
- Hamburger menu disappears, desktop nav appears
- Bottom tab bar hidden
- School grid: 2 columns (`md:grid-cols-2`)
- Footer: 4-column grid (`md:grid-cols-4`)
- Simulator inputs: 3-column grid (`md:grid-cols-3`)
- ROI results: 4-column stats grid (`md:grid-cols-4`)
- Side-by-side layouts for filter + results
- Hero text scales up (`md:text-5xl`)

#### Desktop (1024px+, `lg:`)
- School grid: 3 columns (`lg:grid-cols-3`)
- Full-width content uses `max-w-7xl mx-auto`
- Beta badge visible in navbar (`hidden lg:inline`)
- Cmd+K keyboard shortcut badge visible (`hidden lg:inline`)
- Filter panel displayed as sidebar (left column)

#### Wide Desktop (1280px+, `xl:`)
- No additional breakpoint changes currently defined
- Content remains centered in `max-w-7xl`

### 5.3 Mobile-First Patterns

- All layouts start as single-column stacks
- `flex flex-col` base with `md:flex-row` for side-by-side
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for card grids
- Touch targets: minimum 44px for interactive elements
- `safe-area-inset-bottom` padding on MobileTabBar
- Body scroll lock when mobile menu is open

---

## 6. Accessibility

### 6.1 Color Contrast

- Primary text (`foreground` on `background`): ~15:1 contrast ratio (light), ~14:1 (dark) -- exceeds WCAG AAA
- Muted text (`muted-foreground` on `background`): ~4.6:1 (light) -- meets WCAG AA
- Primary gold on white: ~3.5:1 -- **borderline for small text** (see Design Debt)
- Dark mode primary gold on dark background: improved contrast
- Semantic colors (emerald, amber, red) meet WCAG AA for large text / informational use

### 6.2 Keyboard Navigation

- Skip-to-content link: `<a href="#main-content">` with `sr-only focus:not-sr-only` styling
- `Cmd+K` / `Ctrl+K`: Opens command palette for school search
- Arrow keys: Navigate command palette results, dropdown menus
- `Escape`: Close modals, command palette, mobile menu
- `Tab`: Standard focus traversal
- Focus ring: `outline-ring/50` globally applied

### 6.3 Screen Reader Considerations

- `role="main"` on `<main>` element
- `role="contentinfo"` on `<footer>`
- `role="status"` on `EmptyState` component
- `role="alert"` on error messages (simulator)
- `aria-label="Main navigation"` on `<nav>`
- `aria-label="Journey stages"` on sidebar nav
- `aria-label="Simulation results"` with `aria-live="polite"` on results
- `aria-label={label}` on icon-only buttons (hamburger, remove school, theme toggle)
- `aria-expanded` on hamburger menu
- `aria-busy` on loading buttons
- `aria-describedby` linking inputs to their range hints
- `aria-hidden="true"` on decorative elements (infinite scroll sentinel)
- `<kbd>` elements for keyboard shortcuts

### 6.4 Focus Management

- Command palette auto-focuses search input on open
- School picker auto-focuses search input when shown
- Mobile menu traps focus within drawer (via backdrop click handler)
- Route changes close menus and reset focus state
- Form inputs use `:focus-visible` ring styling (via Tailwind `focus:ring-2 focus:ring-primary/50`)

---

## 7. Data Visualization

### 7.1 Charts Used

| Chart Type | Library | Where Used |
|-----------|---------|------------|
| **GMAT Distribution** (bar chart) | Custom component (`GmatDistributionChart`) | Compare schools page |
| **GPA Distribution** (bar chart) | Custom component (`GpaDistributionChart`) | Compare schools page |
| **Industry Breakdown** (horizontal bar) | Custom component (`IndustryChart`) | Compare schools page |
| **Profile Fit Bars** (horizontal bars) | Custom component (`ProfileFitBars`) | Compare schools page |
| **Radar Chart** | Custom SVG (`RadarChart.tsx`) | Peer compare page |
| **Score Gauge** | Custom SVG (`score-gauge.tsx`) | Essay evaluation results |
| **Line Chart** | Recharts (`LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ResponsiveContainer`) | Career simulator |
| **Confidence Interval Bar** | Inline CSS | Simulator results (probability bars) |
| **Probability Bar** | Inline CSS | Simulator, scholarship estimates |

### 7.2 Color Coding Conventions

| Context | Green | Amber/Yellow | Red | Gray |
|---------|-------|-------------|-----|------|
| Admit probability | >= 60% (Safety) | 30-59% (Target) | < 30% (Reach) | N/A |
| ROI | Positive ROI | -- | Negative ROI | -- |
| Deadline urgency | > 30 days | 7-30 days | < 7 days | Past due |
| Verdict badges | `bg-emerald-100 text-emerald-700` | `bg-amber-100 text-amber-700` | `bg-red-100 text-red-700` | -- |
| Theme colors | Unique per theme (see 3.14) | -- | -- | -- |
| Chart series | chart-2 (emerald) | chart-3 (amber) | chart-5 (red) | chart-4 (slate) |

### 7.3 Empty / Loading Chart States

- **Empty**: Chart area replaced with `EmptyState` component (icon + message)
- **Loading**: `animate-pulse` skeleton blocks sized to chart area, or centered `Loader2` spinner
- **Error**: Red-tinted card with retry button (consistent across all data-fetching pages)

---

## 8. Design Debt & Recommendations

### 8.1 Known UI Inconsistencies

| Issue | Severity | Location |
|-------|----------|----------|
| **Gold on white contrast** | Medium | `--primary` (#C9A962) on white fails WCAG AA for small text (~3.5:1). CTA buttons use `text-primary-foreground` (dark) which is fine, but gold text links on white may be hard to read. |
| **Inconsistent card styling** | Low | Some pages use `editorial-card` class (not defined in `globals.css` -- likely from a shared CSS file or component), while others use shadcn `Card`. Standardize to one pattern. |
| **Missing dark mode on editorial sections** | Medium | The `.editorial-dark` utility exists but hero banners use hardcoded `bg-foreground text-white` which works differently in dark mode. |
| **Hero section pattern variation** | Low | Simulator and ROI use `bg-foreground text-white` dark hero banners. Most other pages don't. No clear rule for when to use a dark hero. |
| **Inline Tailwind `border-border/10` and `border-border/5`** | Low | Various opacity overrides on borders throughout tool pages. Should be standardized into design tokens. |
| **Font inconsistency** | Low | Root layout applies both `geist.variable` on `<html>` and `inter.variable` on `<body>`. Geist serves as `--font-sans` but Inter was the original sans. May cause font-flash or priority conflicts. |
| **No 404 page styling** | Low | `not-found.tsx` exists but content not verified. Should match brand. |
| **Missing loading.tsx content** | Low | `loading.tsx` exists at app root but style not verified against `LoadingSkeleton.tsx`. |

### 8.2 Pages Needing Design Attention

| Page | Issue | Priority |
|------|-------|----------|
| `/essays/coach` | Uses mock data only -- no API integration | High |
| Multiple pages (100+) | Many pages were generated rapidly and may share identical layout patterns without unique design treatment | Medium |
| `/tools` | Tool directory is a long flat list -- would benefit from search/filter | Medium |
| `/community`, `/study-group` | Social features likely minimal -- need full UX design | Medium |
| `/checkout`, `/success` | Payment flow needs polished design treatment | High |
| `/evals` | Evaluation history -- may be placeholder | Low |
| `/track`, `/tracker` | Overlapping functionality with `/my-schools` and `/portfolio` | Medium |
| Dark mode | Several pages use hardcoded colors (e.g., `text-white`, `bg-black/70`) that may not adapt properly | Medium |

### 8.3 Recommended Improvements

| Recommendation | Impact | Effort |
|---------------|--------|--------|
| **Fix gold contrast**: Darken `--primary` in light mode to `hsl(42 50% 47%)` (~#B38F3A) for AA compliance on white backgrounds, or ensure gold is only used on dark surfaces | High | Low |
| **Consolidate card patterns**: Create a single `ToolCard` wrapper component that handles the editorial card style, loading skeleton, and error state consistently | Medium | Medium |
| **Route consolidation**: Merge `/track`, `/tracker`, `/my-schools`, `/portfolio`, `/app-dashboard`, `/app-checklist` into a unified application management experience | High | High |
| **Add breadcrumbs**: Implement a `Breadcrumb` component for nested routes (`/school/[id]`, `/interviews/guide/[slug]`, `/schools/country/[slug]`) | Medium | Low |
| **Search on /tools page**: Add search/filter to the 100+ tool directory page | Medium | Low |
| **Skeleton standardization**: Create page-level skeleton variants instead of ad-hoc `animate-pulse` blocks | Low | Medium |
| **Dark mode audit**: Systematically replace hardcoded light/dark colors with CSS custom properties | Medium | Medium |
| **Reduce page count**: Many pages (quizzes, niche guides, etc.) could be consolidated under parent routes to simplify navigation and reduce maintenance burden | Medium | High |
| **Add transition animations between pages**: Currently no page-level transitions. A subtle fade would improve perceived polish | Low | Low |
| **Keyboard shortcut discoverability**: The `KeyboardShortcuts` component exists but there's no visible shortcut reference sheet. Add a `?` key to show shortcuts overlay | Low | Low |

---

## Appendix: Provider Stack

The root layout wraps all pages in:

```
ThemeProvider          (next-themes, dark/light/system)
  AuthProvider         (NextAuth session)
    QueryProvider      (TanStack React Query)
      PostHogProvider  (Analytics)
```

Global overlay components rendered outside `<main>`:
- `CommandPalette` (Cmd+K)
- `WebVitals` (Core Web Vitals reporting)
- `GlobalErrorHandler` (unhandled errors)
- `KeyboardShortcuts` (global key bindings)
- `ScrollToTop` (scroll-to-top button)
- `ToastContainer` (notifications)
- `OfflineBanner` (network detection)
- `MobileTabBar` (bottom nav)
