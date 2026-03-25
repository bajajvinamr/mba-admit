import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Archetype Types ─────────────────────────────────────────────────────────

export type Archetype =
  | "explorer"
  | "compass"
  | "listbuilder"
  | "strategist"
  | "writer"
  | "performer"
  | "decider";

// ── State ───────────────────────────────────────────────────────────────────

export interface OnboardingState {
  currentStep: number;
  archetype: Archetype;

  // Q1 branch selection (raw text)
  branchChoice: string;

  // Shared fields
  gmatScore: number | null;
  greScore: number | null;
  gpa: number | null;
  yearsExperience: number | null;
  currentIndustry: string;
  currentRole: string;
  targetFormat: string;
  targetSchools: string[];
  targetIndustries: string[];
  challenges: string[];

  // Archetype-specific fields
  // Compass (archetype 2)
  targetCountries: string[];
  priorities: string[];
  citizenshipCountry: string;
  budgetRange: string;

  // Explorer (archetype 1)
  motivations: string[];

  // Strategist/Writer/Performer (archetype 4-6)
  targetRound: string;
  currentPhase: string;
  biggestChallenge: string;

  // Decider (archetype 7)
  admittedSchools: string[];
  waitlistedSchools: string[];
  scholarships: string;
  decisionFactor: string;

  // Journey stage (legacy compat)
  journeyStage: string;

  completed: boolean;
}

interface OnboardingActions {
  setStep: (step: number) => void;
  setField: <K extends keyof OnboardingState>(
    key: K,
    value: OnboardingState[K]
  ) => void;
  setBranch: (choice: string) => void;
  markCompleted: () => void;
  reset: () => void;
}

// ── Branch Mapping ──────────────────────────────────────────────────────────

const BRANCH_MAP: Record<string, Archetype> = {
  "I'm not sure if MBA is right for me": "explorer",
  "Decided on MBA, figuring out where": "compass",
  "Building my school shortlist": "listbuilder",
  "Actively applying to schools": "strategist",
  "Admitted, choosing between schools": "decider",
};

// ── Initial State ───────────────────────────────────────────────────────────

const initialState: OnboardingState = {
  currentStep: 0,
  archetype: "explorer",
  branchChoice: "",
  gmatScore: null,
  greScore: null,
  gpa: null,
  yearsExperience: null,
  currentIndustry: "",
  currentRole: "",
  targetFormat: "",
  targetSchools: [],
  targetIndustries: [],
  challenges: [],
  targetCountries: [],
  priorities: [],
  citizenshipCountry: "",
  budgetRange: "",
  motivations: [],
  targetRound: "",
  currentPhase: "",
  biggestChallenge: "",
  admittedSchools: [],
  waitlistedSchools: [],
  scholarships: "",
  decisionFactor: "",
  journeyStage: "",
  completed: false,
};

// ── Step Counts per Archetype ───────────────────────────────────────────────

export const STEPS_BY_ARCHETYPE: Record<Archetype, number> = {
  explorer: 5,      // Q1 + Q2(industry) + Q3(years) + Q4(motivation) + finish
  compass: 6,       // Q1 + Q2(countries) + Q3(priorities) + Q4(citizenship) + Q5(budget) + finish
  listbuilder: 8,   // Q1 + Q2(country) + Q3(GMAT) + Q4(GPA) + Q5(years+industry) + Q6(format) + Q7(schools) + finish
  strategist: 7,    // Q1 + Q2(schools) + Q3(round) + Q4(GMAT) + Q5(phase) + Q6(challenge) + finish
  writer: 7,
  performer: 7,
  decider: 6,       // Q1 + Q2(admitted) + Q3(waitlists) + Q4(scholarships) + Q5(decision factor) + finish
};

// ── Store ───────────────────────────────────────────────────────────────────

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ currentStep: step }),
      setField: (key, value) => set({ [key]: value }),
      setBranch: (choice) => {
        const archetype = BRANCH_MAP[choice] ?? "explorer";
        set({
          branchChoice: choice,
          archetype,
          currentStep: 1, // advance past Q1
        });
      },
      markCompleted: () => set({ completed: true }),
      reset: () => set(initialState),
    }),
    { name: "admitiq-onboarding" }
  )
);
