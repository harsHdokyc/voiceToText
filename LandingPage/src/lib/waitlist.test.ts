import { describe, expect, it } from "vitest";
import {
  normalizeWaitlistInput,
  waitlistResultFromError,
  waitlistSchema,
} from "./waitlist";

describe("waitlistSchema", () => {
  it("accepts a valid email and optional first name", () => {
    const parsed = waitlistSchema.parse({
      email: "  Maya@Example.com ",
      firstName: " Maya ",
    });
    expect(parsed.email).toBe("Maya@Example.com");
    expect(parsed.firstName).toBe("Maya");
  });

  it("rejects an empty email", () => {
    const result = waitlistSchema.safeParse({ email: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email?.[0]).toMatch(/email/i);
    }
  });

  it("rejects an oversized first name", () => {
    const result = waitlistSchema.safeParse({
      email: "a@b.co",
      firstName: "x".repeat(81),
    });
    expect(result.success).toBe(false);
  });
});

describe("normalizeWaitlistInput", () => {
  it("lowercases email and nulls empty first name", () => {
    expect(
      normalizeWaitlistInput({ email: "Maya@Example.com", firstName: "  " }),
    ).toEqual({
      email: "maya@example.com",
      first_name: null,
      source: "landing",
    });
  });
});

describe("waitlistResultFromError", () => {
  it("maps unique violation to already", () => {
    expect(waitlistResultFromError({ code: "23505" })).toEqual({
      ok: true,
      status: "already",
    });
  });

  it("maps other errors to failure with reason", () => {
    expect(
      waitlistResultFromError({ code: "42501", message: "permission denied" }),
    ).toEqual({
      ok: false,
      status: "error",
      reason: "permission denied",
    });
  });
});
