import { describe, it, expect } from "vitest";
import {
  PROJECT_LINEAR_TRANSITIONS,
  PAUSE_ENTRY_STATUSES,
  canEnterPause,
  isPauseStatus,
  canTransitionProject,
  resolveProjectTransition,
} from "@/lib/server/workflow/project-status";
import type { ProjectStatus } from "@/lib/types";

const ALL_STATUSES: ProjectStatus[] = [
  "PROJECT_CREATED", "DEVELOPMENT", "PLANNING", "ASSIGN_STAKEHOLDERS", "DEFINE_REQUIREMENTS",
  "DEFINE_TIMELINE", "EXECUTION", "TESTING", "LAUNCH", "IN_PROGRESS", "BLOCKED",
  "ON_HOLD", "COMPLETED", "CLOSED", "ARCHIVED",
];

describe("project status workflow (user-supplied canonical graph) — the linear chain", () => {
  for (const [from, to] of Object.entries(PROJECT_LINEAR_TRANSITIONS)) {
    if (to === null) continue;
    it(`${from} -> ${to} is the one legal forward step`, () => {
      expect(canTransitionProject(from as ProjectStatus, to as ProjectStatus, null)).toBe(true);
    });
  }

  it("no status may skip ahead in the chain", () => {
    expect(canTransitionProject("PROJECT_CREATED", "PLANNING", null)).toBe(false);
    expect(canTransitionProject("DEVELOPMENT", "EXECUTION", null)).toBe(false);
    expect(canTransitionProject("TESTING", "IN_PROGRESS", null)).toBe(false);
  });

  it("no status may move backward in the chain", () => {
    expect(canTransitionProject("PLANNING", "DEVELOPMENT", null)).toBe(false);
    expect(canTransitionProject("CLOSED", "COMPLETED", null)).toBe(false);
  });

  it("terminal statuses (ARCHIVED) have no forward transition at all", () => {
    for (const to of ALL_STATUSES) {
      if (to === "ARCHIVED") continue;
      expect(canTransitionProject("ARCHIVED", to, null)).toBe(false);
    }
  });
});

describe("project status workflow — pause states (BLOCKED / ON_HOLD)", () => {
  it("matches the exact approved 8-status pause-entry list", () => {
    expect([...PAUSE_ENTRY_STATUSES].sort()).toEqual(
      [
        "DEVELOPMENT", "PLANNING", "ASSIGN_STAKEHOLDERS", "DEFINE_REQUIREMENTS",
        "DEFINE_TIMELINE", "EXECUTION", "TESTING", "IN_PROGRESS",
      ].sort()
    );
  });

  for (const from of PAUSE_ENTRY_STATUSES) {
    it(`${from} -> BLOCKED is allowed`, () => {
      expect(canTransitionProject(from, "BLOCKED", null)).toBe(true);
      expect(canEnterPause(from)).toBe(true);
    });
    it(`${from} -> ON_HOLD is allowed`, () => {
      expect(canTransitionProject(from, "ON_HOLD", null)).toBe(true);
    });
  }

  for (const from of ["PROJECT_CREATED", "LAUNCH", "COMPLETED", "CLOSED", "ARCHIVED"] as ProjectStatus[]) {
    it(`${from} -> BLOCKED is rejected (not a named pause-entry status)`, () => {
      expect(canTransitionProject(from, "BLOCKED", null)).toBe(false);
      expect(canEnterPause(from)).toBe(false);
    });
    it(`${from} -> ON_HOLD is rejected`, () => {
      expect(canTransitionProject(from, "ON_HOLD", null)).toBe(false);
    });
  }

  it("BLOCKED and ON_HOLD cannot transition directly into each other", () => {
    expect(canTransitionProject("BLOCKED", "ON_HOLD", "EXECUTION")).toBe(false);
    expect(canTransitionProject("ON_HOLD", "BLOCKED", "EXECUTION")).toBe(false);
  });

  it("leaving a pause state restores exactly the stored previous active status", () => {
    expect(canTransitionProject("BLOCKED", "EXECUTION", "EXECUTION")).toBe(true);
    expect(isPauseStatus("BLOCKED")).toBe(true);
  });

  it("leaving a pause state to any OTHER destination is rejected, even a legal-looking chain step", () => {
    expect(canTransitionProject("BLOCKED", "TESTING", "EXECUTION")).toBe(false);
  });

  it("leaving a pause state with no recorded previousActiveStatus is rejected", () => {
    expect(canTransitionProject("BLOCKED", "EXECUTION", null)).toBe(false);
    expect(canTransitionProject("BLOCKED", "EXECUTION", undefined)).toBe(false);
  });
});

describe("project status workflow — resolveProjectTransition", () => {
  it("entering a pause remembers the prior active status", () => {
    expect(resolveProjectTransition("EXECUTION", "BLOCKED", null)).toEqual({
      nextStatus: "BLOCKED",
      nextPreviousActiveStatus: "EXECUTION",
    });
  });

  it("leaving a pause clears the memory", () => {
    expect(resolveProjectTransition("BLOCKED", "EXECUTION", "EXECUTION")).toEqual({
      nextStatus: "EXECUTION",
      nextPreviousActiveStatus: null,
    });
  });

  it("an ordinary linear step leaves previousActiveStatus untouched (undefined = no column change)", () => {
    expect(resolveProjectTransition("PLANNING", "ASSIGN_STAKEHOLDERS", null)).toEqual({
      nextStatus: "ASSIGN_STAKEHOLDERS",
    });
  });

  it("an illegal transition resolves to null", () => {
    expect(resolveProjectTransition("PROJECT_CREATED", "COMPLETED", null)).toBeNull();
  });

  it("ARCHIVED is reachable only from CLOSED", () => {
    expect(resolveProjectTransition("CLOSED", "ARCHIVED", null)).toEqual({ nextStatus: "ARCHIVED" });
    for (const from of ALL_STATUSES) {
      if (from === "CLOSED") continue;
      expect(resolveProjectTransition(from, "ARCHIVED", null)).toBeNull();
    }
  });
});
