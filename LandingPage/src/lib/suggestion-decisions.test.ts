import { describe, expect, it } from "vitest";
import { displayTitle, withDecision, withoutDecision, type Decisions } from "./suggestion-decisions";

const proposal = { id: 1, title: "Send revised proposal to Maya", kind: "Follow-up" as const };

describe("withDecision", () => {
  it("approving a dismissed suggestion replaces the dismissal", () => {
    expect(withDecision({ 1: "dismissed" }, 1, "approved")).toEqual({ 1: "approved" });
  });

  it("leaves other suggestions' decisions and the original record untouched", () => {
    const before: Decisions = { 2: "approved" };
    expect(withDecision(before, 1, "dismissed")).toEqual({ 1: "dismissed", 2: "approved" });
    expect(before).toEqual({ 2: "approved" });
  });
});

describe("withoutDecision", () => {
  it("undo returns only that suggestion to pending", () => {
    const before: Decisions = { 1: "approved", 2: "dismissed" };
    expect(withoutDecision(before, 1)).toEqual({ 2: "dismissed" });
    expect(before).toEqual({ 1: "approved", 2: "dismissed" });
  });

  it("undo on an undecided suggestion changes nothing", () => {
    expect(withoutDecision({ 2: "dismissed" }, 1)).toEqual({ 2: "dismissed" });
  });
});

describe("displayTitle", () => {
  it("shows the user's trimmed rewording", () => {
    expect(displayTitle({ 1: "  Email Maya the proposal " }, proposal)).toBe("Email Maya the proposal");
  });

  it("falls back to the original title when the edit is blank", () => {
    expect(displayTitle({ 1: "   " }, proposal)).toBe("Send revised proposal to Maya");
    expect(displayTitle({}, proposal)).toBe("Send revised proposal to Maya");
  });
});
