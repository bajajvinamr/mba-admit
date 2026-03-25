import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateEnv } from "./env";

describe("validateEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clone env to avoid mutation between tests
    process.env = { ...originalEnv };
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("does nothing during build phase", () => {
    process.env.NEXT_PHASE = "phase-production-build";
    (process.env as any).NODE_ENV = "production";
    // Should not throw even with missing vars
    expect(() => validateEnv()).not.toThrow();
  });

  it("warns about missing optional vars in development", () => {
    (process.env as any).NODE_ENV = "development";
    process.env.NEXTAUTH_SECRET = "test-secret";
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PHASE;

    validateEnv();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("STRIPE_SECRET_KEY"),
    );
  });

  it("errors about missing required vars in development", () => {
    (process.env as any).NODE_ENV = "development";
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXT_PHASE;

    validateEnv();

    // "always" required vars should trigger console.error in dev
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("NEXTAUTH_SECRET"),
    );
  });

  it("throws in production when required vars are missing", () => {
    (process.env as any).NODE_ENV = "production";
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PHASE;

    expect(() => validateEnv()).toThrow(/NEXTAUTH_SECRET/);
  });

  it("does not throw in production when all required vars are set", () => {
    (process.env as any).NODE_ENV = "production";
    process.env.NEXTAUTH_SECRET = "prod-secret";
    process.env.NEXTAUTH_URL = "https://admitcompass.ai";
    process.env.NEXT_PUBLIC_API_URL = "https://api.admitcompass.ai";
    process.env.STRIPE_SECRET_KEY = "sk_live_test";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    delete process.env.NEXT_PHASE;

    expect(() => validateEnv()).not.toThrow();
  });

  it("does not warn about optional vars (Google OAuth)", () => {
    (process.env as any).NODE_ENV = "production";
    process.env.NEXTAUTH_SECRET = "prod-secret";
    process.env.NEXTAUTH_URL = "https://admitcompass.ai";
    process.env.NEXT_PUBLIC_API_URL = "https://api.admitcompass.ai";
    process.env.STRIPE_SECRET_KEY = "sk_live_test";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.NEXT_PHASE;

    expect(() => validateEnv()).not.toThrow();
    // Google OAuth vars are optional — should not appear in warnings
    const warnCalls = (console.warn as ReturnType<typeof vi.fn>).mock.calls;
    const warnText = warnCalls.map(c => String(c[0])).join("");
    expect(warnText).not.toContain("GOOGLE_CLIENT_ID");
  });
});
