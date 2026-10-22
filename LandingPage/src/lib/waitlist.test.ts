import { afterEach, describe, expect, it, vi } from "vitest";
import {
  joinWaitlist,
  toWaitlistRow,
  type WaitlistRow,
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

describe("joinWaitlist", () => {
  afterEach(() => vi.restoreAllMocks());
  const silenceLog = () => vi.spyOn(console, "error").mockImplementation(() => {});

  it("stores the normalised row and reports success", async () => {
    const rows: WaitlistRow[] = [];
    const result = await joinWaitlist({ email: " Maya@Example.com ", firstName: "Maya" }, async (row) => {
      rows.push(row);
      return { error: null };
    });
    expect(result).toEqual({ status: "success" });
    expect(rows).toEqual([{ email: "maya@example.com", first_name: "Maya", source: "landing" }]);
  });

  it("treats a duplicate email as already on the list", async () => {
    const result = await joinWaitlist({ email: "a@b.co" }, async () => ({ error: { code: "23505" } }));
    expect(result).toEqual({ status: "already" });
  });

  it("returns field errors and never inserts invalid input", async () => {
    const rows: WaitlistRow[] = [];
    const result = await joinWaitlist({ email: "not-an-email", firstName: "x".repeat(81) }, async (row) => {
      rows.push(row);
      return { error: null };
    });
    expect(result).toEqual({
      status: "invalid",
      fieldErrors: { email: "That doesn't look like a valid email.", firstName: "Keep it under 80 characters." },
    });
    expect(rows).toEqual([]);
  });

  it("keeps the database code and reason when the insert is rejected", async () => {
    silenceLog();
    const result = await joinWaitlist({ email: "a@b.co" }, async () => ({
      error: { code: "42501", message: "permission denied for table waitlist" },
    }));
    expect(result).toEqual({ status: "error", code: "42501", reason: "permission denied for table waitlist" });
  });

  it("turns a thrown insert into an error with the real reason", async () => {
    silenceLog();
    const result = await joinWaitlist({ email: "a@b.co" }, async () => {
      throw new Error("Failed to fetch");
    });
    expect(result).toEqual({ status: "error", code: "waitlist_insert_threw", reason: "Failed to fetch" });
  });
});
