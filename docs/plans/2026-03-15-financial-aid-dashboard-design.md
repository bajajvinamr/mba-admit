# MBA Financial Aid Dashboard — Design Document

**Date:** 2026-03-15
**Status:** Approved
**Scope:** Scholarship ROI Optimizer + Merit Aid Estimator + Loan Modeler

---

## Problem

MBA is a $150K–$400K decision. Zero platforms help applicants model scholarship impact on ROI across their school list. Existing tools (MBAmo, ApplicantLab, My Admit Coach) offer no financial planning. Our current `/scholarships` page has a basic single-school ROI calculator and an AI negotiation letter generator — but no multi-school comparison, no scholarship likelihood modeling, no loan calculations.

## Solution

Three integrated tools on an enhanced `/scholarships` page:

### Tool 1: Scholarship ROI Optimizer

Compare 2–5 schools side-by-side with scholarships factored into total cost and ROI.

**Inputs:**
- Schools (2–5, selected from DB)
- Scholarship amount per school (user-entered)
- Current annual salary
- Living cost estimate (defaults provided per school location)

**Outputs per school:**
- Tuition (from DB)
- Net cost after scholarship
- Opportunity cost (salary * program years)
- Total investment (net cost + opportunity cost)
- Post-MBA salary (from DB)
- Annual salary increase
- Breakeven years
- 5-year NPV (discount rate 5%)
- 10-year NPV
- "Best Value" badge on the winner

**Calculation details:**
- `net_cost = (tuition_per_year * program_years) + (living_cost * program_years) - scholarship`
- `opportunity_cost = current_salary * program_years`
- `total_investment = net_cost + opportunity_cost`
- `salary_increase = post_mba_salary - current_salary`
- `breakeven = total_investment / salary_increase`
- `npv_n = sum(salary_increase / (1.05)^t for t in 1..n) - total_investment`

### Tool 2: Merit Aid Estimator

Predict scholarship likelihood per school based on applicant profile.

**Inputs:**
- GMAT/GRE score
- GPA
- Work experience (years)
- Target schools (reuses from Tool 1 if populated)

**Outputs per school:**
- Scholarship likelihood: High / Medium / Low / Unlikely
- Estimated range (e.g., "$20K–$40K")
- Rationale (e.g., "Your GMAT is 50 points above median; strong merit aid candidate")

**Heuristic (no LLM needed):**
- `gmat_delta = applicant_gmat - school_gmat_avg`
- If `gmat_delta >= 40` AND `acceptance_rate >= 20%`: HIGH (est. 50–100% tuition)
- If `gmat_delta >= 20` AND `acceptance_rate >= 15%`: MEDIUM (est. 25–50% tuition)
- If `gmat_delta >= 0`: LOW (est. 10–25% tuition)
- If `gmat_delta < 0`: UNLIKELY
- Modifiers: +1 tier if work_exp >= 6, +1 tier if school has known merit programs

### Tool 3: Loan & Payback Modeler

Model different financing scenarios.

**Inputs:**
- Loan amount (default: net_cost from Tool 1)
- Interest rate (default: 7% for private MBA loans)
- Repayment term (options: 10, 15, 20 years)
- Grace period (default: 6 months)

**Outputs:**
- Monthly payment
- Total interest paid
- Total amount repaid
- Debt-to-income ratio (annual payments / post-MBA salary)
- Amortization summary (year 1, 5, 10 balances)

**Formula:** Standard amortization:
- `M = P * [r(1+r)^n] / [(1+r)^n - 1]`
- Where P = principal, r = monthly rate, n = total months

## API Design

### `POST /api/financial/compare`

```json
// Request
{
  "schools": [
    { "school_id": "hbs", "scholarship_amount": 0 },
    { "school_id": "booth", "scholarship_amount": 60000 },
    { "school_id": "kellogg", "scholarship_amount": 30000 }
  ],
  "current_salary": 85000,
  "living_cost_override": null,
  "gmat": 740,
  "gpa": 3.8,
  "work_exp_years": 5,
  "loan_rate": 7.0,
  "loan_term_years": 10
}

// Response
{
  "comparisons": [
    {
      "school_id": "booth",
      "school_name": "Chicago Booth",
      "tuition_total": 155682,
      "scholarship": 60000,
      "living_cost": 40000,
      "net_cost": 135682,
      "opportunity_cost": 170000,
      "total_investment": 305682,
      "post_mba_salary": 175000,
      "salary_increase": 90000,
      "breakeven_years": 3.4,
      "npv_5yr": 84318,
      "npv_10yr": 389318,
      "scholarship_likelihood": "medium",
      "scholarship_est_range": "$30K–$60K",
      "scholarship_rationale": "GMAT 740 is 28pts above Booth median (712). Moderate merit aid candidate.",
      "loan": {
        "principal": 135682,
        "monthly_payment": 1575,
        "total_interest": 53318,
        "total_repaid": 189000,
        "debt_to_income_pct": 10.8
      },
      "is_best_value": true
    }
  ],
  "recommendation": "booth",
  "recommendation_reason": "Highest 10-year NPV with lowest breakeven period."
}
```

## Frontend Design

### Layout
Three-tab interface within the existing `/scholarships` page, above the current Scholarship Negotiator:

1. **Compare Schools** (default tab) — school selector + scholarship inputs → side-by-side comparison cards
2. **Merit Aid Estimator** — profile inputs → per-school likelihood cards
3. **Loan Calculator** — loan parameters → payment breakdown + amortization

### Design tokens (existing system)
- `editorial-card`, `heading-serif`, `text-gold`, `bg-jet`, `bg-alabaster`
- Animated numbers (reuse existing `AnimatedNumber` component)
- Framer Motion transitions
- "Best Value" badge: gold background, jet text

### Interaction flow
1. User adds schools (min 2, max 5) via dropdown
2. User enters scholarship amount per school + current salary
3. Click "Compare" → results appear below with side-by-side cards
4. "Best Value" badge auto-highlights the optimal choice
5. Tabs 2 and 3 auto-populate from Tab 1 inputs if already filled

## What We Skip (YAGNI)
- No database writes (stateless)
- No AI/LLM calls (pure math + heuristics)
- No user accounts
- No historical scholarship tracking
- No currency conversion (USD only, with note for international schools)

## Testing
- Backend: unit tests for all calculations (NPV, breakeven, amortization, likelihood)
- Frontend: integration test for form submission + results rendering

## Living cost defaults
- US urban: $25,000/year
- US suburban: $20,000/year
- Europe: $22,000/year
- Asia: $12,000/year
- Default by school location from DB
