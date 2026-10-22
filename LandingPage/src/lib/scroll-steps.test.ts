import { describe, expect, it } from "vitest";
import { stepAt } from "./scroll-steps";

describe("stepAt", () => {
  it("splits the pinned range into equal bands per step", () => {
    expect(stepAt(0, 900, 3)).toBe(0);
    expect(stepAt(299, 900, 3)).toBe(0);
    expect(stepAt(300, 900, 3)).toBe(1);
    expect(stepAt(600, 900, 3)).toBe(2);
  });

  it("stays on the first step before the section is pinned", () => {
    expect(stepAt(-250, 900, 3)).toBe(0);
  });

  it("holds the last step at and past the end of the range", () => {
    expect(stepAt(900, 900, 3)).toBe(2);
    expect(stepAt(5000, 900, 3)).toBe(2);
  });

  it("returns the first step when there is no range to scroll", () => {
    expect(stepAt(100, 0, 4)).toBe(0);
    expect(stepAt(100, -20, 4)).toBe(0);
  });
});
