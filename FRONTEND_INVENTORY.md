# Frontend Route Inventory & API Dependencies

**Generated:** 2026-03-11  
**Total Routes:** 24 page.tsx files  
**API Client:** `src/lib/api.ts` (centralized)

---

## Executive Summary

### Key Findings
- **24 routes** across authentication, application tracking, AI tools, and strategic planning
- **3 instances** of hardcoded API URL patterns (architectural debt)
- **14+ pages** import framer-motion (heavy animation dependency)
- **Landing page** is 732 lines with extensive animations, no lazy loading
- **Only 1 layout.tsx** at root (good architectural separation)
- **4 shared components** (AuthProvider, Navbar, ErrorBoundary, AuthButton)

### Critical Issues
1. **Hardcoded API URL Pattern**: 3 pages duplicate `process.env.NEXT_PUBLIC_API_URL` logic instead of using centralized `API_BASE`
2. **Performance**: Landing page lacks lazy loading of below-fold sections
3. **Dependency Weight**: Framer Motion used on 60%+ of routes, adds significant bundle size

---

## API Infrastructure

### Central API Client: `src/lib/api.ts`

**Exports:**
- `API_BASE`: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"`
- `ApiError` class: Custom error with HTTP status tracking
- `apiFetch<T>(path, options)`: Universal fetch wrapper with error handling and JSON content-type defaults

**Pattern Usage:**
```typescript
// Correct (used by most pages)
const data = await apiFetch("/api/endpoint", { method: "POST" });

// Incorrect (hardcoded in 3 pages)
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/endpoint`);
```

---

## Complete Route Inventory

### 1. Authentication Routes

#### `/auth/signin/page.tsx`
**Purpose:** Email/password + Google OAuth sign-in  
**Type:** Client component with Suspense fallback  
**API Calls:**
- NextAuth `signIn("credentials", { email, password })`
- NextAuth `signIn("google", { callbackUrl })`

**Framer Motion:** No  
**API Pattern:** NextAuth (not backend API)  
**Issues:** None identified

---

#### `/auth/signup/page.tsx`
**Purpose:** User registration with email, password, name  
**Type:** Client component  
**API Calls:**
- `fetch("${API_BASE}/api/auth/signup", POST)` → Create account
- Auto sign-in via NextAuth after success

**Framer Motion:** No  
**API Pattern:** ⚠️ **HARDCODED ENV VAR** (should use API_BASE from lib/api.ts)  
**Issues:**
- Direct fetch with hardcoded `process.env.NEXT_PUBLIC_API_URL` pattern
- Not using centralized `apiFetch` wrapper

---

### 2. Core Application Routes

#### `/page.tsx` (Landing Page)
**Purpose:** Marketing homepage with hero, features, testimonials, pricing  
**Line Count:** 732 lines  
**Type:** Client component with heavy animations  
**API Calls:**
- `fetch("${API}/api/schools")` → Load schools for featured display
- `fetch("${API}/api/calculate_odds", POST)` → Odds calculator widget

**Framer Motion:** Yes (extensive usage)
- 50+ motion.div/motion.section elements
- AnimatePresence for modal animations
- Multiple staggered children animations
- Auto-rotating testimonials carousel (5s interval)

**API Pattern:** Correct (uses API_BASE)  
**Issues:**
- **Performance**: No lazy loading of below-fold sections (hero, features, testimonials all load eagerly)
- **Animation Weight**: Heavy framer-motion usage with no Code Splitting consideration
- **Data**: Hardcoded mentors and testimonials (not API-driven, makes maintenance harder)
- **Carousel**: Auto-rotation without pause-on-hover may reduce perceived performance

---

#### `/dashboard/page.tsx`
**Purpose:** Smart redirect based on user state  
**Type:** Server component with client redirect logic  
**API Calls:** None  
**Framer Motion:** No  
**API Pattern:** N/A  
**Logic:**
- Redirects to `/my-schools` if user hasn't selected schools
- Redirects to `/school/[schoolId]` if query param present
- Uses Next.js `redirect()` function

**Issues:** None identified

---

#### `/my-schools/page.tsx` (Application Tracker)
**Purpose:** Kanban board + list view of user's tracked schools with status workflow  
**Type:** Client component  
**API Calls:**
- `fetch("${API_BASE}/api/user/schools")` → Get user's tracked schools
- `fetch("${API_BASE}/api/schools")` → Get all schools for dropdown
- `apiFetch("/api/user/schools", POST)` → Add school
- `apiFetch("/api/user/schools/{entryId}", PUT)` → Update status (Applied/Accepted/Rejected/etc)
- `apiFetch("/api/user/schools/{entryId}", DELETE)` → Remove school

**Framer Motion:** Yes (motion for card animations)  
**API Pattern:** Correct (uses API_BASE and apiFetch)  
**Features:**
- Toggle between Kanban and list views
- Drag-and-drop compatible structure
- Status workflow (On List → Applied → Interview → Accepted/Rejected)
- School search in dropdown

**Issues:** None identified

---

#### `/schools/page.tsx` (School Directory)
**Purpose:** Searchable, filterable directory of all MBA schools  
**Type:** Client component  
**API Calls:**
- `fetch("${API}/api/schools")` → Load all schools on mount

**Framer Motion:** Yes (motion for results grid)  
**API Pattern:** Correct (uses API_BASE)  
**Features:**
- Full-text search across school names
- Multi-filter: country, degree type, GMAT range, specialization, STEM-designation
- Pagination (24 per page)
- Responsive grid layout
- Computed filtering via useMemo

**Issues:**
- **Performance**: Loads all schools upfront (no pagination at API level)
- Should implement server-side search/filter for large datasets

---

#### `/school/[schoolId]/page.tsx` (School Detail & Application)
**Purpose:** School overview (requirements, deadlines, stats) + essay interview engine  
**Type:** Client component with dynamic route  
**API Calls:**
- `fetch("${API}/api/schools/${schoolId}")` → Get school details
- `fetch("${API}/api/start_session", POST)` → Create application session
- `fetch("${API}/api/chat", POST)` → Multi-turn essay interview
- `fetch("${API}/api/unlock", POST)` → Unlock essays after payment

**Framer Motion:** Yes (motion for tab transitions, essay drafts)  
**API Pattern:** Correct (uses API_BASE)  
**Features:**
- 2-tab interface: Overview (stats/deadlines/requirements) + Apply (essay interview)
- Deep Socratic interview for essay brainstorming
- Real-time essay draft generation
- Unlock mechanism after payment verification
- Essay history and revision tracking

**Issues:**
- High API call density during interview (POST /chat per message)
- No request debouncing or rate limiting on client

---

### 3. Payment & Checkout Routes

#### `/checkout/page.tsx` (Stripe Checkout)
**Purpose:** Secure payment page for 1:1 strategy calls  
**Type:** Client component with Suspense  
**API Calls:**
- `fetch("/api/create-checkout-session", POST)` → Local Next.js API route (not backend)
- Redirects to Stripe hosted checkout via `window.location.href`

**Framer Motion:** No  
**API Pattern:** Correct (local route pattern)  
**Features:**
- NextAuth session check (redirects unauthenticated users)
- Displays order details: 1-hour profile review, school selection, essay brainstorming
- Stripe payment button
- Money-back guarantee messaging
- Sticky payment summary on desktop

**Issues:** None identified

---

#### `/success/page.tsx` (Post-Payment Success)
**Purpose:** Confirmation page + booking calendar for strategy call  
**Type:** Client component  
**API Calls:** None (embedded Calendly widget)  
**Framer Motion:** No  
**API Pattern:** N/A  
**Features:**
- Success confirmation with checkmark icon
- Embedded Calendly InlineWidget for booking 1:1 call
- NextAuth session check

**Issues:** None identified

---

### 4. AI-Powered Evaluation & Interview Tools

#### `/evaluator/page.tsx` (Essay Evaluation)
**Purpose:** AI feedback on essay drafts with scoring  
**Type:** Client component  
**API Calls:**
- `fetch("${API}/api/schools")` → Load school list for context
- `fetch("${API}/api/evaluate_essay", POST)` → Evaluate essay draft

**Framer Motion:** Yes (motion for score animation)  
**API Pattern:** Correct (uses API_BASE)  
**Features:**
- Select school + paste essay prompt
- Multi-turn evaluation with score (0-100)
- Sections: feedback, strengths, improvements, rewrite suggestions
- Animated score counter

**Issues:** None identified

---

#### `/interview/page.tsx` (Mock Interview Simulator)
**Purpose:** Practice MBA interview with AI + transcript + scoring  
**Type:** Client component  
**API Calls:**
- `fetch("${API}/api/schools")` → Load school list
- `fetch("${API}/api/interview/start", POST)` → Initialize mock interview
- `fetch("${API}/api/interview/respond", POST)` → Process interview response

**Framer Motion:** Yes (motion for video UI, transcript animations)  
**API Pattern:** Correct (uses API_BASE)  
**Features:**
- Video call UI mockup (placeholder for future Twilio/Agora integration)
- Interview transcript display
- Real-time response evaluation
- Performance scoring breakdown
- Animated transcript updates

**Issues:**
- No actual video capability (UI-only mockup)
- High latency on response evaluation if interview/respond endpoint is slow

---

#### `/guide/page.tsx` (MBA Readiness Quiz)
**Purpose:** 5-question readiness assessment with ROI calculator  
**Type:** Client component  
**API Calls:** None (hardcoded quiz data)  
**Framer Motion:** Yes (motion for quiz transitions, results reveal)  
**API Pattern:** N/A  
**Features:**
- 5-question scored quiz
- Result tiers: Ready, Prepare, Plan, Explore
- ROI calculator tables (salary, debt, time)
- Animated result reveal

**Issues:** None identified

---

### 5. Strategic Planning Tools

#### `/goals/page.tsx` (Career Goal Sculptor)
**Purpose:** Transform vague career goals into AdCom-ready narratives  
**Type:** Client component (2-column form + results)  
**API Calls:**
- `fetch("${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/schools")` → Load schools
- `fetch("${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/goals/sculpt", POST)` → Sculpt goal narrative

**Framer Motion:** No  
**API Pattern:** ⚠️ **HARDCODED ENV VAR** (two instances of duplicated pattern)  
**Features:**
- Input: current role, industry, vague goal, target school
- Output: AdCom-ready pitch, "why MBA" explanation, school fit map (name-drop opportunities), red flag defenses
- Loading state with multi-step animation
- Results displayed in card layout

**Issues:**
- **Code Quality**: Duplicated `process.env.NEXT_PUBLIC_API_URL` pattern (should use API_BASE from lib/api.ts)
- Should use `apiFetch` wrapper instead of direct fetch for error handling

---

#### `/roaster/page.tsx` (Resume Bullet Roaster)
**Purpose:** AI critique of resume bullets with rewrite suggestions  
**Type:** Client component  
**API Calls:**
- `fetch("${API}/api/roast_resume", POST)` → Roast resume bullet

**Framer Motion:** Yes (motion for scoring reveal)  
**API Pattern:** Correct (uses API_BASE)  
**Features:**
- Paste resume bullet point
- AI roast with score (0-10)
- Critique sections + rewrite suggestions
- Dark theme with red accent colors
- Animated score reveal

**Issues:** None identified

---

#### `/storyteller/page.tsx` (Essay Brainstorming Chat)
**Purpose:** Socratic interview for essay ideation with outline extraction  
**Type:** Client component (3-step flow: setup → chat → outline)  
**API Calls:**
- `fetch("${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/schools")` → Load schools
- `fetch("${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/essays/storyteller", POST)` → Multi-turn essay brainstorm

**Framer Motion:** No  
**API Pattern:** ⚠️ **HARDCODED ENV VAR** (two instances)  
**Features:**
- Step 1: Select school + paste essay prompt
- Step 2: Chat interface with AI consultant asking probing questions
- Step 3: Display extracted essay outline (auto-advances after final response)
- Copy outline to clipboard functionality
- "Start Over" to reset conversation

**Issues:**
- **Code Quality**: Hardcoded env var pattern (same as /goals page)
- Missing Copy icon import (defined inline as custom SVG component, lines 333-340)
- Should use `apiFetch` wrapper

---

#### `/compare/page.xyz` (School Comparison)
**Purpose:** Compare 2-4 schools across 11+ dimensions  
**Type:** Client component  
**API Calls:**
- `fetch("${API_BASE}/api/schools")` → Load all schools
- `apiFetch("/api/schools/compare", POST)` → Compare selected schools

**Framer Motion:** Yes (motion for chart animations)  
**API Pattern:** Correct (uses apiFetch)  
**Features:**
- Select 2-4 schools from dropdown
- Comparison matrix: acceptance rate, GMAT/GPA medians, employment stats, salary, specializations, etc.
- Responsive: table on desktop, cards on mobile
- Animated comparison reveal

**Issues:** None identified

---

#### `/profile-report/page.tsx` (Profile Strength Analysis)
**Purpose:** 6-dimension profile analysis with school fit scoring  
**Type:** Client component  
**API Calls:**
- `apiFetch("/api/profile/analyze", POST)` → Analyze GMAT/GPA/experience profile

**Framer Motion:** Yes (motion for score bar animations)  
**API Pattern:** Correct (uses apiFetch)  
**Features:**
- Input: GMAT, GPA, years of work experience, industry, role
- Output: 6 scores (Academic, Professional, GMAT, Experience, Leadership, Diversity)
- School fit prediction based on profile
- Animated score bars with transitions
- Actionable recommendations

**Issues:** None identified

---

#### `/decisions/page.tsx` (Decision Tracker & Community)
**Purpose:** Track admission decisions with community crowdsourced data  
**Type:** Client component with modal UI  
**API Calls:**
- `fetch("${API_BASE}/api/decisions")` → Get mock decisions
- `fetch("${API_BASE}/api/community/decisions")` → Get community decisions
- `apiFetch("/api/community/decisions", POST)` → Submit decision anonymously

**Framer Motion:** Yes (motion for decision submissions, table rows)  
**API Pattern:** Correct (mixed fetch and apiFetch, both use API_BASE)  
**Features:**
- Decision table with filtering: status, school search
- Statistics: acceptance rate, yield rate by school
- Submit decision modal (school, status, GMAT, GPA, company, role)
- Anonymous submission
- Community insights display

**Issues:** None identified

---

#### `/recommenders/page.tsx` (Recommender Strategy Engine)
**Purpose:** Generate personalized prep emails for recommenders  
**Type:** Client component  
**API Calls:**
- `fetch("${API}/api/schools")` → Load schools
- `fetch("${API}/api/recommender_strategy", POST)` → Generate strategy

**Framer Motion:** Yes (motion for email reveals)  
**API Pattern:** Correct (uses API_BASE)  
**Features:**
- Add 1-3 recommenders with strengths/stories
- Select target school(s)
- AI generates personalized prep email for each recommender
- Emphasizes school fit, specific strengths, storytelling hooks
- Custom RefreshCcw icon definition (missing from lucide-react, defined inline)

**Issues:**
- Missing icon import (RefreshCcw): Defined as custom component inline, should use lucide-react
- API expects array of recommenders but UI design may not be clear on multi-recommender flow

---

#### `/scholarships/page.tsx` (Scholarship Negotiation)
**Purpose:** Generate negotiation strategy and appeal letter templates  
**Type:** Client component  
**API Calls:**
- `fetch("${API_BASE}/api/schools")` → Load schools
- `fetch("${API_BASE}/api/negotiate_scholarship", POST)` → Generate negotiation strategy

**Framer Motion:** Yes (motion for step reveals, score animation)  
**API Pattern:** Correct (uses API_BASE)  
**Features:**
- Input primary offer (school, scholarship) + competing offers
- Output: leverage score (0-100), appeal letter template, negotiation tactics
- Simulated loading steps (1500ms delays for UX)
- Formatted letter with placeholder customization

**Issues:** None identified

---

#### `/waitlist/page.tsx` (Waitlist Management)
**Purpose:** Generate Letter of Continued Interest (LOCI) + 30-day action plan  
**Type:** Client component  
**API Calls:**
- `fetch("${API}/api/schools")` → Load schools
- `fetch("${API}/api/waitlist_strategy", POST)` → Generate LOCI draft

**Framer Motion:** Yes (motion for action plan reveals)  
**API Pattern:** Correct (uses API_BASE)  
**Features:**
- Input: waitlist school, profile updates (new experience, recommender upgrades, etc)
- Output: LOCI draft letter, 30-day action plan with numbered tactical steps
- Emphasizes differentiation and sustained interest
- Copy to clipboard for LOCI

**Issues:** None identified

---

#### `/outreach/page.tsx` (Alumni Networking)
**Purpose:** Generate personalized cold outreach email templates for alumni  
**Type:** Client component  
**API Calls:**
- `fetch("${API}/api/schools")` → Load schools
- `fetch("${API}/api/outreach_strategy", POST)` → Generate outreach templates

**Framer Motion:** Yes (motion for template reveals)  
**API Pattern:** Correct (uses API_BASE)  
**Features:**
- Select school
- AI generates 3 personalized email templates for alumni outreach
- Each template includes: school culture brief, specific accomplishment hooks, personal connection points
- Pro tips for each template (timing, follow-up, customization)

**Issues:** None identified

---

### 6. Redirect/Stub Routes

#### `/track/page.tsx`
**Purpose:** Redirect to application tracker  
**Type:** Server component  
**API Calls:** None  
**Framer Motion:** No  
**Logic:** Simple `redirect("/my-schools")`  
**Issues:** None identified

---

#### `/evals/page.tsx` (CTO Internal Dashboard - LLM Judge)
**Purpose:** Automated regression testing dashboard for AI agents  
**Type:** Client component  
**API Calls:**
- `fetch("${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/eval/run", POST)` → Run full evaluation pipeline

**Framer Motion:** No  
**API Pattern:** ⚠️ **HARDCODED ENV VAR** (one instance)  
**Features:**
- "Run Full Evaluation" button triggers agent pipeline
- Global stats: profiles tested, avg scores for Consultant/Interviewer/Writer agents
- Detailed logs per test case with 3-column score breakdown
- Performance reasoning for each agent

**Issues:**
- **Code Quality**: Hardcoded env var pattern (should use API_BASE)
- **Access Control**: No authentication check shown (internal CTO tool should be protected)
- **Styling**: Uses generic Tailwind (not custom theme like other pages)

---

## Shared Components

### Located: `src/components/`

| Component | Purpose | Size | Notes |
|-----------|---------|------|-------|
| `AuthProvider.tsx` | Wraps app with NextAuth SessionProvider | ~1KB | Initializes NextAuth session context |
| `Navbar.tsx` | Top navigation with logo, links, auth button | ~11KB | Used in root layout |
| `ErrorBoundary.tsx` | React error boundary for error isolation | ~2KB | Client component error handling |
| `AuthButton.tsx` | Sign in/out button with user menu | ~1KB | Used in Navbar |

---

## Issues & Recommendations

### 🔴 Critical Issues

1. **Hardcoded API URL Pattern** (3 pages)
   - **Pages**: `/goals`, `/storyteller`, `/evals`
   - **Current**: `fetch(\`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/...\`)`
   - **Fix**: Import `API_BASE` from `lib/api.ts` and use `apiFetch()` wrapper
   - **Impact**: Harder to maintain, duplicated logic, inconsistent error handling
   - **Effort**: 5 minutes (3 files, 2 lines each)

   ```typescript
   // ❌ Current (goals/page.tsx, line 70)
   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/goals/sculpt`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ ... }),
   });

   // ✅ Fixed
   import { apiFetch } from "@/lib/api";
   const data = await apiFetch<SculptedGoal>("/api/goals/sculpt", {
     method: "POST",
     body: JSON.stringify({ ... }),
   });
   ```

2. **Missing Icon Imports** (2 pages)
   - **Pages**: `/recommenders` (RefreshCcw), `/storyteller` (Copy)
   - **Current**: Icons defined as inline SVG components
   - **Issue**: Lucide React should provide these; inline definitions are maintainability risk
   - **Fix**: Verify lucide-react version exports these icons, or add proper conditional imports

3. **Landing Page Performance** (732 lines)
   - **Issues**:
     - No lazy loading of below-fold sections (hero, features, testimonials all eager)
     - Extensive framer-motion animations (~50+ motion elements) with no code-splitting
     - Auto-rotating carousel (5s interval) without pause-on-hover
     - Hardcoded mentor/testimonial data (not API-driven)
   - **Recommendations**:
     - Wrap below-fold sections in `React.lazy()` + `Suspense`
     - Extract framer-motion animations to separate code-split modules
     - Add `onMouseEnter/Leave` carousel pause logic
     - Move testimonials to API if content changes frequently

### 🟡 Medium Priority Issues

4. **Framer-Motion Bundle Weight** (14+ pages)
   - **Impact**: Likely adds 50-100KB+ to bundle across 60%+ of app
   - **Recommendation**: Audit animation necessity, consider replacing simple transitions with CSS
   - **Pages with heavy usage**: landing, my-schools, compare, profile-report, decisions, recommenders, scholarships, waitlist, outreach, interview, roaster, evaluator, goals (partial), storyteller (partial), evals (partial)

5. **School Directory Performance** (`/schools`)
   - **Issue**: Loads all schools in memory on mount (no server-side pagination)
   - **Fix**: Implement API-level pagination or infinite scroll
   - **Current**: Clients filter 24 per page client-side

6. **School Detail API Call Density** (`/school/[schoolId]`)
   - **Issue**: Chat interface sends POST request on every message (no batching/debouncing)
   - **Risk**: Potential for request floods if user spams send
   - **Fix**: Add 500ms debounce on form submit, disable button during request

7. **Access Control** (`/evals` dashboard)
   - **Issue**: CTO internal tool has no visible authentication check
   - **Risk**: Public exposure of evaluation metrics
   - **Fix**: Add role-based access control check or redirect unauthenticated users

### 🟢 Minor Issues

8. **Type Safety**: Some pages use `any` type for API responses (review them during refactor)
9. **Error Handling**: Some pages don't display user-friendly error messages on failed API calls
10. **Accessibility**: Carousel on landing page may need ARIA labels for auto-rotation

---

## API Endpoint Summary

| Endpoint | Method | Used By | Purpose |
|----------|--------|---------|---------|
| `/api/schools` | GET | 10+ pages | Fetch all schools |
| `/api/schools/{id}` | GET | /school/[schoolId] | School details |
| `/api/schools/compare` | POST | /compare | Compare multiple schools |
| `/api/user/schools` | GET/POST/PUT/DELETE | /my-schools | Track application progress |
| `/api/start_session` | POST | /school/[schoolId] | Create application session |
| `/api/chat` | POST | /school/[schoolId] | Essay interview |
| `/api/unlock` | POST | /school/[schoolId] | Unlock essays after payment |
| `/api/evaluate_essay` | POST | /evaluator | Evaluate essay draft |
| `/api/interview/start` | POST | /interview | Start mock interview |
| `/api/interview/respond` | POST | /interview | Process interview response |
| `/api/calculate_odds` | POST | /page (landing) | Odds calculator |
| `/api/goals/sculpt` | POST | /goals | Sculpt career goal |
| `/api/roast_resume` | POST | /roaster | Critique resume bullet |
| `/api/essays/storyteller` | POST | /storyteller | Essay brainstorming chat |
| `/api/profile/analyze` | POST | /profile-report | Analyze profile strength |
| `/api/decisions` | GET | /decisions | Get mock decisions |
| `/api/community/decisions` | GET/POST | /decisions | Community decision data |
| `/api/recommender_strategy` | POST | /recommenders | Generate recommender emails |
| `/api/negotiate_scholarship` | POST | /scholarships | Scholarship negotiation strategy |
| `/api/waitlist_strategy` | POST | /waitlist | LOCI generation |
| `/api/outreach_strategy` | POST | /outreach | Alumni outreach templates |
| `/api/eval/run` | POST | /evals | Run agent evaluations |
| `/api/auth/signup` | POST | /auth/signup | User registration |
| `/api/create-checkout-session` | POST | /checkout | Stripe session (local route) |

---

## Architecture Observations

### Strengths
✅ Centralized API client (`lib/api.ts`) with error handling  
✅ NextAuth for secure authentication  
✅ Server components for redirects (`/dashboard`, `/track`)  
✅ Consistent use of Tailwind CSS + custom theme colors  
✅ Good separation of concerns (routes, components, utilities)  
✅ Suspense boundaries for async operations  

### Weaknesses
❌ Hardcoded env var pattern in 3 pages (code smell)  
❌ No pagination at API level for large datasets (schools)  
❌ Heavy framer-motion usage without bundle analysis  
❌ Landing page lacks lazy loading (performance regression risk)  
❌ Missing access control on internal CTO dashboard  
❌ No request debouncing/rate limiting on chat interfaces  

### Recommendations for Next Sprint
1. **Refactor hardcoded URLs** (5 min) → Use API_BASE consistently
2. **Add lazy loading to landing page** (30 min) → Wrap sections in React.lazy()
3. **Implement access control on /evals** (15 min) → Add role check
4. **Add API-level pagination to /schools** (1 hour) → Server-side filtering
5. **Audit framer-motion usage** (2 hours) → Identify animations that can use CSS
