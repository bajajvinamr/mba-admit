import { describe, it, expect } from "vitest";
import {
  oddsCalculatorSchema,
  profileSchema,
  chatMessageSchema,
  essayEvaluationSchema,
  resumeRoastSchema,
  signInSchema,
  signUpSchema,
  checkoutSchema,
  storytellerSchema,
} from "./schemas";

describe("oddsCalculatorSchema", () => {
  it("accepts valid input", () => {
    const result = oddsCalculatorSchema.safeParse({ gmat: 720, gpa: 3.6 });
    expect(result.success).toBe(true);
  });

  it("rejects GMAT below 200", () => {
    const result = oddsCalculatorSchema.safeParse({ gmat: 100, gpa: 3.5 });
    expect(result.success).toBe(false);
  });

  it("rejects GMAT above 800", () => {
    const result = oddsCalculatorSchema.safeParse({ gmat: 900, gpa: 3.5 });
    expect(result.success).toBe(false);
  });

  it("rejects GPA above 4.0", () => {
    const result = oddsCalculatorSchema.safeParse({ gmat: 720, gpa: 4.5 });
    expect(result.success).toBe(false);
  });

  it("applies defaults for optional fields", () => {
    const result = oddsCalculatorSchema.parse({ gmat: 720, gpa: 3.6 });
    expect(result.undergrad_tier).toBe("");
    expect(result.industry).toBe("");
    expect(result.intl_experience).toBe(false);
  });
});

describe("profileSchema", () => {
  it("accepts valid profile", () => {
    const result = profileSchema.safeParse({
      name: "Test User",
      gmat: 740,
      gpa: 3.8,
      industry_background: "Consulting",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = profileSchema.safeParse({
      name: "",
      gmat: 740,
      gpa: 3.8,
      industry_background: "Tech",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing industry", () => {
    const result = profileSchema.safeParse({
      name: "Test",
      gmat: 740,
      gpa: 3.8,
    });
    expect(result.success).toBe(false);
  });
});

describe("chatMessageSchema", () => {
  it("accepts valid message", () => {
    const result = chatMessageSchema.safeParse({
      session_id: "sess-123",
      message: "Tell me about HBS",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty message", () => {
    const result = chatMessageSchema.safeParse({
      session_id: "sess-123",
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects message exceeding 5000 chars", () => {
    const result = chatMessageSchema.safeParse({
      session_id: "sess-123",
      message: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

describe("essayEvaluationSchema", () => {
  it("accepts valid essay", () => {
    const result = essayEvaluationSchema.safeParse({
      school_id: "hbs",
      prompt: "What is your career vision?",
      essay_text: "A".repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it("rejects essay under 50 chars", () => {
    const result = essayEvaluationSchema.safeParse({
      school_id: "hbs",
      prompt: "Why MBA?",
      essay_text: "Short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts essay at exactly 50 chars", () => {
    const result = essayEvaluationSchema.safeParse({
      school_id: "hbs",
      prompt: "Why MBA?",
      essay_text: "A".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty school_id", () => {
    const result = essayEvaluationSchema.safeParse({
      school_id: "",
      prompt: "Why MBA?",
      essay_text: "A".repeat(100),
    });
    expect(result.success).toBe(false);
  });
});

describe("resumeRoastSchema", () => {
  it("accepts valid bullet", () => {
    const result = resumeRoastSchema.safeParse({
      bullet: "Led a team of 10 engineers to deliver a $5M project",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty bullet", () => {
    const result = resumeRoastSchema.safeParse({ bullet: "" });
    expect(result.success).toBe(false);
  });

  it("rejects bullet exceeding 2000 chars", () => {
    const result = resumeRoastSchema.safeParse({ bullet: "A".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("accepts bullet at exactly 2000 chars", () => {
    const result = resumeRoastSchema.safeParse({ bullet: "A".repeat(2000) });
    expect(result.success).toBe(true);
  });
});

describe("signInSchema", () => {
  it("accepts valid credentials", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "pass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = signInSchema.safeParse({
      email: "not-an-email",
      password: "pass123",
    });
    expect(result.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("accepts valid registration", () => {
    const result = signUpSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "securepass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = signUpSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 8");
    }
  });

  it("rejects missing name", () => {
    const result = signUpSchema.safeParse({
      email: "alice@example.com",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });
});

describe("checkoutSchema", () => {
  it("accepts valid pro monthly checkout", () => {
    const result = checkoutSchema.safeParse({ plan: "pro" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.billing).toBe("monthly"); // default
  });

  it("accepts valid premium annual checkout", () => {
    const result = checkoutSchema.safeParse({ plan: "premium", billing: "annual" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid plan", () => {
    const result = checkoutSchema.safeParse({ plan: "enterprise" });
    expect(result.success).toBe(false);
  });

  it("rejects missing plan", () => {
    const result = checkoutSchema.safeParse({ billing: "monthly" });
    expect(result.success).toBe(false);
  });
});

describe("storytellerSchema", () => {
  it("accepts valid input", () => {
    const result = storytellerSchema.safeParse({
      background: "I worked in consulting for 5 years at McKinsey",
      goals: "I want to transition into tech product management",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short background", () => {
    const result = storytellerSchema.safeParse({
      background: "Short",
      goals: "I want to be a PM at Google",
    });
    expect(result.success).toBe(false);
  });

  it("rejects background exceeding 3000 chars", () => {
    const result = storytellerSchema.safeParse({
      background: "A".repeat(3001),
      goals: "Valid goal here with enough length",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short goals", () => {
    const result = storytellerSchema.safeParse({
      background: "Valid background with enough length here",
      goals: "Short",
    });
    expect(result.success).toBe(false);
  });
});
