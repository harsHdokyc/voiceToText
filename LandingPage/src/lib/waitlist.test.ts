import { describe, expect, it } from "vitest";
import {
  toWaitlistRow,
  waitlistSchema,
  waitlistStatusFromError,
} from "./waitlist";

describe("waitlistSchema", () => {
  it("accepts a valid email and optional first name", () => {
    expect(
      waitlistSchema.parse({ email: "  Maya@Example.com ", firstName: " Maya " }),
    ).toEqual({ email: "Maya@Example.com", firstName: "Maya" });
  });

  it("rejects an empty email", () => {
    expect(waitlistSchema.safeParse({ email: "   " }).success).toBe(false);
  });

  it("rejects an oversized first name", () => {
    expect(
      waitlistSchema.safeParse({ email: "a@b.co", firstName: "x".repeat(81) })
        .success,
    ).toBe(false);
  });
});

describe("toWaitlistRow", () => {
  it("lowercases email and nulls empty first name", () => {
    expect(toWaitlistRow({ email: "Maya@Example.com", firstName: "  " })).toEqual({
      email: "maya@example.com",
      first_name: null,
      source: "landing",
    });
  });
});

describe("waitlistStatusFromError", () => {
  it("maps unique violation to already", () => {
    expect(waitlistStatusFromError({ code: "23505" })).toBe("already");
  });

  it("maps other errors to error", () => {
    expect(waitlistStatusFromError({ code: "42501" })).toBe("error");
  });
});
