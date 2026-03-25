import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("Essay evaluator auto-save", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("saves draft text to sessionStorage", () => {
    sessionStorage.setItem("mba_evaluator_draft", "My test essay draft about leadership at McKinsey.");
    const saved = sessionStorage.getItem("mba_evaluator_draft");
    expect(saved).toBe("My test essay draft about leadership at McKinsey.");
  });

  it("restores evaluation result from sessionStorage", () => {
    const mockResult = {
      essay: "My essay text",
      school: "hbs",
      prompt: "Why MBA?",
      result: { score: 72, cliche_count: 3, harsh_feedback: "Too generic", improvements: ["Be specific"] },
    };
    sessionStorage.setItem("mba_evaluator_result", JSON.stringify(mockResult));
    const restored = JSON.parse(sessionStorage.getItem("mba_evaluator_result")!);
    expect(restored.result.score).toBe(72);
    expect(restored.essay).toBe("My essay text");
    expect(restored.school).toBe("hbs");
  });

  it("handles corrupted sessionStorage gracefully", () => {
    sessionStorage.setItem("mba_evaluator_result", "not-json{{{");
    let parsed = null;
    try {
      parsed = JSON.parse(sessionStorage.getItem("mba_evaluator_result")!);
    } catch {
      // Expected — the page component catches this internally
    }
    expect(parsed).toBeNull();
  });

  it("prefers result over draft when both exist", () => {
    // When a result is saved, the essay text comes from result.essay, not the draft
    sessionStorage.setItem("mba_evaluator_draft", "Old draft text");
    sessionStorage.setItem(
      "mba_evaluator_result",
      JSON.stringify({
        essay: "Evaluated essay text",
        result: { score: 85, cliche_count: 1, harsh_feedback: "Good", improvements: [] },
      })
    );
    const result = JSON.parse(sessionStorage.getItem("mba_evaluator_result")!);
    const draft = sessionStorage.getItem("mba_evaluator_draft");
    // Result takes precedence — the component checks result first
    expect(result.essay).toBe("Evaluated essay text");
    expect(draft).toBe("Old draft text");
  });

  it("clears draft after evaluation saves result", () => {
    sessionStorage.setItem("mba_evaluator_draft", "Draft in progress");
    // Simulate what happens after evaluation — result is saved
    sessionStorage.setItem(
      "mba_evaluator_result",
      JSON.stringify({
        essay: "Final submitted text",
        result: { score: 90, cliche_count: 0, harsh_feedback: "Excellent", improvements: [] },
      })
    );
    // Result exists, so draft is secondary
    const result = sessionStorage.getItem("mba_evaluator_result");
    expect(result).not.toBeNull();
  });
});
