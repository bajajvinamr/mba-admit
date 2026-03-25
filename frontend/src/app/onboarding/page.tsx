"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useOnboardingStore,
  STEPS_BY_ARCHETYPE,
  type Archetype,
} from "@/stores/onboarding";
import { QuestionCard } from "@/components/onboarding/QuestionCard";
import { SingleChoice } from "@/components/onboarding/SingleChoice";
import { SliderInput } from "@/components/onboarding/SliderInput";
import { MultiSelect } from "@/components/onboarding/MultiSelect";
import { SchoolPicker } from "@/components/onboarding/SchoolPicker";

// ── Branch Options (Q1) ─────────────────────────────────────────────────────

const BRANCH_OPTIONS = [
  "I'm not sure if MBA is right for me",
  "Decided on MBA, figuring out where",
  "Building my school shortlist",
  "Actively applying to schools",
  "Admitted, choosing between schools",
];

// ── Shared Option Sets ──────────────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
  "Consulting",
  "Finance",
  "Tech",
  "Healthcare",
  "Non-profit",
  "Military",
  "Energy",
  "Government",
  "Other",
];

const MOTIVATION_OPTIONS = [
  "Career switch",
  "Higher salary",
  "Build network",
  "Entrepreneurship",
  "Credential / brand",
];

const COUNTRY_OPTIONS = [
  "United States",
  "United Kingdom",
  "Canada",
  "France",
  "Spain",
  "Switzerland",
  "India",
  "Singapore",
  "Hong Kong",
  "Australia",
  "China",
  "Other",
];

const PRIORITY_OPTIONS = [
  "Ranking & prestige",
  "ROI / scholarship",
  "Location",
  "Industry placement",
  "Class size",
  "Diversity",
  "Entrepreneurship focus",
];

const BUDGET_OPTIONS = [
  "Under $50k",
  "50k - 100k",
  "$100k - $150k",
  "Over $150k",
];
const BUDGET_VALUES: Record<string, string> = {
  "Under $50k": "under50k",
  "50k - 100k": "50to100k",
  "$100k - $150k": "100to150k",
  "Over $150k": "over150k",
};

const FORMAT_OPTIONS = ["Full-time", "Part-time", "Executive", "Online"];
const FORMAT_VALUES: Record<string, string> = {
  "Full-time": "fulltime",
  "Part-time": "parttime",
  Executive: "executive",
  Online: "online",
};

const ROUND_OPTIONS = ["R1", "R2", "R3", "Unsure"];
const PHASE_OPTIONS = [
  "Researching schools",
  "Writing essays",
  "Preparing for interviews",
  "Submitted, waiting",
];
const CHALLENGE_OPTIONS = ["Essays", "Time management", "Interviews", "Overall strategy"];
const SCHOLARSHIP_OPTIONS = ["Yes, received offer(s)", "Negotiating", "No scholarship yet", "Not applicable"];
const DECISION_FACTOR_OPTIONS = [
  "ROI / financials",
  "Career outcomes",
  "Location / lifestyle",
  "Brand / prestige",
  "Gut feeling",
];

// ── Confetti Effect ─────────────────────────────────────────────────────────

function ConfettiEffect() {
  const [particles] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.5 + Math.random() * 1.5,
      size: 4 + Math.random() * 8,
      color: ["#D4A843", "#1A1A1A", "#5B8C5A", "#C25B56", "#4A90D9"][
        Math.floor(Math.random() * 5)
      ],
    }))
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{
            y: "110vh",
            rotate: 360 + Math.random() * 360,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
          }}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
}

// ── Step Renderer per Archetype ─────────────────────────────────────────────

function useArchetypeSteps(archetype: Archetype) {
  const store = useOnboardingStore();

  const explorerSteps = [
    // step 1: industry
    {
      canContinue: store.currentIndustry !== "",
      render: () => (
        <QuestionCard key="explorer-industry" title="What industry are you in?">
          <SingleChoice
            options={INDUSTRY_OPTIONS}
            value={store.currentIndustry}
            onChange={(v) => store.setField("currentIndustry", v)}
          />
        </QuestionCard>
      ),
    },
    // step 2: years
    {
      canContinue: store.yearsExperience !== null,
      render: () => (
        <QuestionCard key="explorer-years" title="How many years of work experience?">
          <SliderInput
            min={0}
            max={20}
            step={1}
            value={store.yearsExperience}
            onChange={(v) => store.setField("yearsExperience", v)}
            label="years"
          />
        </QuestionCard>
      ),
    },
    // step 3: motivation
    {
      canContinue: store.motivations.length > 0,
      render: () => (
        <QuestionCard
          key="explorer-motivation"
          title="What's driving your interest in an MBA?"
          subtitle="Select all that apply"
        >
          <MultiSelect
            options={MOTIVATION_OPTIONS}
            value={store.motivations}
            onChange={(v) => store.setField("motivations", v)}
          />
        </QuestionCard>
      ),
    },
  ];

  const compassSteps = [
    // step 1: target countries (multi)
    {
      canContinue: store.targetCountries.length > 0,
      render: () => (
        <QuestionCard
          key="compass-countries"
          title="Which countries are you considering?"
          subtitle="Select all that apply"
        >
          <MultiSelect
            options={COUNTRY_OPTIONS}
            value={store.targetCountries}
            onChange={(v) => store.setField("targetCountries", v)}
          />
        </QuestionCard>
      ),
    },
    // step 2: priorities
    {
      canContinue: store.priorities.length > 0,
      render: () => (
        <QuestionCard
          key="compass-priorities"
          title="What matters most to you in a program?"
          subtitle="Select your top priorities"
        >
          <MultiSelect
            options={PRIORITY_OPTIONS}
            value={store.priorities}
            onChange={(v) => store.setField("priorities", v)}
          />
        </QuestionCard>
      ),
    },
    // step 3: citizenship
    {
      canContinue: store.citizenshipCountry !== "",
      render: () => (
        <QuestionCard key="compass-citizenship" title="What's your citizenship?">
          <SingleChoice
            options={COUNTRY_OPTIONS}
            value={store.citizenshipCountry}
            onChange={(v) => store.setField("citizenshipCountry", v)}
          />
        </QuestionCard>
      ),
    },
    // step 4: budget
    {
      canContinue: store.budgetRange !== "",
      render: () => (
        <QuestionCard key="compass-budget" title="What's your total budget for the MBA?">
          <SingleChoice
            options={BUDGET_OPTIONS}
            value={
              Object.entries(BUDGET_VALUES).find(
                ([, val]) => val === store.budgetRange
              )?.[0] ?? ""
            }
            onChange={(v) =>
              store.setField("budgetRange", BUDGET_VALUES[v] ?? v)
            }
          />
        </QuestionCard>
      ),
    },
  ];

  const listbuilderSteps = [
    // step 1: country
    {
      canContinue: store.targetCountries.length > 0,
      render: () => (
        <QuestionCard
          key="list-country"
          title="Which countries are you targeting?"
          subtitle="Select all that apply"
        >
          <MultiSelect
            options={COUNTRY_OPTIONS}
            value={store.targetCountries}
            onChange={(v) => store.setField("targetCountries", v)}
          />
        </QuestionCard>
      ),
    },
    // step 2: GMAT
    {
      canContinue: store.gmatScore !== null,
      render: () => (
        <QuestionCard key="list-gmat" title="What's your GMAT score (or target)?">
          <SliderInput
            min={400}
            max={800}
            step={10}
            value={store.gmatScore}
            onChange={(v) => store.setField("gmatScore", v)}
          />
        </QuestionCard>
      ),
    },
    // step 3: GPA
    {
      canContinue: store.gpa !== null,
      render: () => (
        <QuestionCard key="list-gpa" title="What's your GPA?">
          <SliderInput
            min={2.0}
            max={4.0}
            step={0.1}
            value={store.gpa}
            onChange={(v) => store.setField("gpa", v)}
            formatValue={(v) => v.toFixed(1)}
          />
        </QuestionCard>
      ),
    },
    // step 4: years + industry
    {
      canContinue: store.yearsExperience !== null && store.currentIndustry !== "",
      render: () => (
        <QuestionCard key="list-exp" title="Tell us about your experience">
          <div className="space-y-6">
            <SliderInput
              min={0}
              max={20}
              step={1}
              value={store.yearsExperience}
              onChange={(v) => store.setField("yearsExperience", v)}
              label="years of experience"
            />
            <SingleChoice
              options={INDUSTRY_OPTIONS}
              value={store.currentIndustry}
              onChange={(v) => store.setField("currentIndustry", v)}
            />
          </div>
        </QuestionCard>
      ),
    },
    // step 5: format
    {
      canContinue: store.targetFormat !== "",
      render: () => (
        <QuestionCard key="list-format" title="What program format?">
          <SingleChoice
            options={FORMAT_OPTIONS}
            value={
              Object.entries(FORMAT_VALUES).find(
                ([, val]) => val === store.targetFormat
              )?.[0] ?? ""
            }
            onChange={(v) =>
              store.setField("targetFormat", FORMAT_VALUES[v] ?? v)
            }
          />
        </QuestionCard>
      ),
    },
    // step 6: schools
    {
      canContinue: store.targetSchools.length > 0,
      render: () => (
        <QuestionCard
          key="list-schools"
          title="Which schools are on your radar?"
          subtitle="Search and add schools"
        >
          <SchoolPicker
            value={store.targetSchools}
            onChange={(v) => store.setField("targetSchools", v)}
          />
        </QuestionCard>
      ),
    },
  ];

  const strategistSteps = [
    // step 1: schools (picker)
    {
      canContinue: store.targetSchools.length > 0,
      render: () => (
        <QuestionCard
          key="strat-schools"
          title="Which schools are you applying to?"
          subtitle="Search and add your target schools"
        >
          <SchoolPicker
            value={store.targetSchools}
            onChange={(v) => store.setField("targetSchools", v)}
          />
        </QuestionCard>
      ),
    },
    // step 2: round
    {
      canContinue: store.targetRound !== "",
      render: () => (
        <QuestionCard key="strat-round" title="Which round are you targeting?">
          <SingleChoice
            options={ROUND_OPTIONS}
            value={store.targetRound}
            onChange={(v) => store.setField("targetRound", v)}
          />
        </QuestionCard>
      ),
    },
    // step 3: GMAT
    {
      canContinue: store.gmatScore !== null,
      render: () => (
        <QuestionCard key="strat-gmat" title="What's your GMAT score?">
          <SliderInput
            min={400}
            max={800}
            step={10}
            value={store.gmatScore}
            onChange={(v) => store.setField("gmatScore", v)}
          />
        </QuestionCard>
      ),
    },
    // step 4: current phase
    {
      canContinue: store.currentPhase !== "",
      render: () => (
        <QuestionCard key="strat-phase" title="Where are you in the application process?">
          <SingleChoice
            options={PHASE_OPTIONS}
            value={store.currentPhase}
            onChange={(v) => store.setField("currentPhase", v)}
          />
        </QuestionCard>
      ),
    },
    // step 5: biggest challenge
    {
      canContinue: store.biggestChallenge !== "",
      render: () => (
        <QuestionCard key="strat-challenge" title="What's your biggest challenge right now?">
          <SingleChoice
            options={CHALLENGE_OPTIONS}
            value={store.biggestChallenge}
            onChange={(v) => store.setField("biggestChallenge", v)}
          />
        </QuestionCard>
      ),
    },
  ];

  const deciderSteps = [
    // step 1: admitted schools
    {
      canContinue: store.admittedSchools.length > 0,
      render: () => (
        <QuestionCard
          key="decider-admitted"
          title="Which schools have you been admitted to?"
          subtitle="Search and add your admits"
        >
          <SchoolPicker
            value={store.admittedSchools}
            onChange={(v) => store.setField("admittedSchools", v)}
          />
        </QuestionCard>
      ),
    },
    // step 2: waitlists
    {
      canContinue: true, // optional
      render: () => (
        <QuestionCard
          key="decider-waitlist"
          title="Any waitlists?"
          subtitle="Optional - add schools where you're waitlisted"
        >
          <SchoolPicker
            value={store.waitlistedSchools}
            onChange={(v) => store.setField("waitlistedSchools", v)}
          />
        </QuestionCard>
      ),
    },
    // step 3: scholarships
    {
      canContinue: store.scholarships !== "",
      render: () => (
        <QuestionCard key="decider-scholarship" title="Scholarship situation?">
          <SingleChoice
            options={SCHOLARSHIP_OPTIONS}
            value={store.scholarships}
            onChange={(v) => store.setField("scholarships", v)}
          />
        </QuestionCard>
      ),
    },
    // step 4: decision factor
    {
      canContinue: store.decisionFactor !== "",
      render: () => (
        <QuestionCard key="decider-factor" title="What will drive your final decision?">
          <SingleChoice
            options={DECISION_FACTOR_OPTIONS}
            value={store.decisionFactor}
            onChange={(v) => store.setField("decisionFactor", v)}
          />
        </QuestionCard>
      ),
    },
  ];

  const stepsMap: Record<Archetype, typeof explorerSteps> = {
    explorer: explorerSteps,
    compass: compassSteps,
    listbuilder: listbuilderSteps,
    strategist: strategistSteps,
    writer: strategistSteps, // same flow as strategist
    performer: strategistSteps, // same flow as strategist
    decider: deciderSteps,
  };

  return stepsMap[archetype] ?? explorerSteps;
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const store = useOnboardingStore();
  const step = store.currentStep;
  const archetype = store.archetype;
  const [showConfetti, setShowConfetti] = useState(false);

  const branchSteps = useArchetypeSteps(archetype);
  const totalSteps = STEPS_BY_ARCHETYPE[archetype];

  // Redirect if already completed
  useEffect(() => {
    if (store.completed) {
      router.replace("/dashboard");
    }
  }, [store.completed, router]);

  const canContinue = useCallback((): boolean => {
    if (step === 0) {
      return store.branchChoice !== "";
    }
    // Branch-specific steps are 1-indexed (step-1 in the array)
    const branchStep = branchSteps[step - 1];
    if (!branchStep) return true; // final step
    return branchStep.canContinue;
  }, [step, store.branchChoice, branchSteps]);

  const isLastStep = step >= totalSteps - 1;

  const handleNext = () => {
    if (!isLastStep) {
      store.setStep(step + 1);
    } else {
      setShowConfetti(true);
      store.markCompleted();
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    }
  };

  const handleBack = () => {
    if (step > 0) store.setStep(step - 1);
  };

  // Completed state: confetti screen
  if (showConfetti || (isLastStep && store.completed)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <ConfettiEffect />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Sparkles className="h-16 w-16 text-gold mb-6" />
          </motion.div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Your personalized dashboard is ready
          </h1>
          <p className="text-muted-foreground text-sm max-w-md">
            We&apos;ve tailored your experience based on your profile. Redirecting
            you now...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-8 pb-4">
        {Array.from({ length: totalSteps }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (i < step) store.setStep(i);
            }}
            disabled={i > step}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === step
                ? "w-8 bg-gold"
                : i < step
                  ? "w-2 bg-gold/40 cursor-pointer hover:bg-gold/60"
                  : "w-2 bg-muted-foreground"
            )}
          />
        ))}
      </div>

      {/* Step counter */}
      <p className="text-center text-xs text-muted-foreground mb-6">
        {step + 1} of {totalSteps}
      </p>

      {/* Question area */}
      <div className="flex-1 flex items-start sm:items-center justify-center py-4">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <QuestionCard
              key="branch"
              title="Where are you in your MBA journey?"
            >
              <SingleChoice
                options={BRANCH_OPTIONS}
                value={store.branchChoice}
                onChange={(v) => store.setBranch(v)}
              />
            </QuestionCard>
          )}

          {step > 0 && branchSteps[step - 1] && branchSteps[step - 1].render()}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-6 max-w-xl mx-auto w-full">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={step === 0}
          className={cn(step === 0 && "invisible")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={!canContinue()}>
          {isLastStep ? "Finish" : "Continue"}
          {!isLastStep && <ArrowRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}
