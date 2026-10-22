import { describe, expect, it } from "vitest";
import { offsetForStep, stepAt } from "./scroll-steps";

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

describe("offsetForStep", () => {
  it("lands in the middle of each step's band", () => {
    expect(offsetForStep(0, 900, 3)).toBe(150);
    expect(offsetForStep(1, 900, 3)).toBe(450);
    expect(offsetForStep(2, 900, 3)).toBe(750);
  });

  it("scrolling to a step and reading it back gives the same step", () => {
    for (const total of [3, 4]) {
      for (let i = 0; i < total; i++) expect(stepAt(offsetForStep(i, 1000, total), 1000, total)).toBe(i);
    }
  });

  it("clamps out-of-range steps to the first and last", () => {
    expect(offsetForStep(-1, 900, 3)).toBe(150);
    expect(offsetForStep(9, 900, 3)).toBe(750);
  });

  it("returns 0 when there is no range to scroll", () => {
    expect(offsetForStep(2, 0, 3)).toBe(0);
  });
});
