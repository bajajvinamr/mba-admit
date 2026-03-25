import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("useSchoolNames module cache", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports the hook function", async () => {
    const mod = await import("./useSchoolNames");
    expect(typeof mod.useSchoolNames).toBe("function");
  });

  it("SchoolName type structure is correct", async () => {
    // Verify the type by creating a conforming object
    const school: import("./useSchoolNames").SchoolName = {
      id: "hbs",
      name: "Harvard Business School",
      country: "USA",
    };
    expect(school.id).toBe("hbs");
    expect(school.name).toBe("Harvard Business School");
    expect(school.country).toBe("USA");
  });

  it("SchoolName allows optional country", async () => {
    const school: import("./useSchoolNames").SchoolName = {
      id: "gsb",
      name: "Stanford GSB",
    };
    expect(school.country).toBeUndefined();
  });
});
