import { describe, it, expect } from "vitest";
import {
  IDEA_TRANSITIONS,
  allowedIdeaTransitions,
  canTransitionIdea,
  canWithdrawIdea,
  WITHDRAWABLE_IDEA_STATUSES,
} from "@/lib/server/workflow/idea-status";
import type { IdeaStatus } from "@/lib/types";

const ALL_STATUSES: IdeaStatus[] = [
  "DRAFT", "SUBMITTED", "INITIAL_SCREENING", "UNDER_REVIEW", "NEEDS_INFORMATION",
  "UNDER_EVALUATION", "RECOMMENDATION_SUBMITTED", "PENDING_DECISION",
  "APPROVED", "CONDITIONALLY_APPROVED", "IDEA_DEVELOPMENT", "CONVERTED_TO_PROJECT",
  "DEFERRED", "RETURNED_FOR_REVIEW", "NOT_PURSUED", "REJECTED", "WITHDRAWN", "ARCHIVED",
];

describe("idea status workflow — every declared edge is legal", () => {
  for (const [from, tos] of Object.entries(IDEA_TRANSITIONS)) {
    for (const to of tos ?? []) {
      it(`${from} -> ${to} is allowed`, () => {
        expect(canTransitionIdea(from as IdeaStatus, to as IdeaStatus)).toBe(true);
        expect(allowedIdeaTransitions(from as IdeaStatus)).toContain(to);
      });
    }
  }
});

describe("idea status workflow — everything NOT declared is rejected", () => {
  for (const from of ALL_STATUSES) {
    const legal = new Set(IDEA_TRANSITIONS[from] ?? []);
    for (const to of ALL_STATUSES) {
      if (from === to || legal.has(to)) continue;
      it(`${from} -> ${to} is rejected`, () => {
        expect(canTransitionIdea(from, to)).toBe(false);
      });
    }
  }
});

describe("idea status workflow — terminal statuses have no outgoing edges", () => {
  for (const terminal of ["NOT_PURSUED", "REJECTED", "WITHDRAWN", "ARCHIVED"] as IdeaStatus[]) {
    it(`${terminal} has zero legal transitions`, () => {
      expect(allowedIdeaTransitions(terminal)).toEqual([]);
    });
  }
});

describe("approved Phase 5 decision: DEFERRED -> NOT_PURSUED is the only path to NOT_PURSUED", () => {
  it("DEFERRED can reach NOT_PURSUED", () => {
    expect(canTransitionIdea("DEFERRED", "NOT_PURSUED")).toBe(true);
  });
  it("no other status can reach NOT_PURSUED", () => {
    for (const from of ALL_STATUSES) {
      if (from === "DEFERRED") continue;
      expect(canTransitionIdea(from, "NOT_PURSUED")).toBe(false);
    }
  });
});

describe("approved Phase 5 decision: withdrawal allow-list (Innovator's list)", () => {
  it("matches the exact approved set", () => {
    expect([...WITHDRAWABLE_IDEA_STATUSES].sort()).toEqual(
      [
        "SUBMITTED", "UNDER_REVIEW", "NEEDS_INFORMATION", "UNDER_EVALUATION",
        "RECOMMENDATION_SUBMITTED", "PENDING_DECISION", "RETURNED_FOR_REVIEW", "DEFERRED",
      ].sort()
    );
  });

  for (const status of WITHDRAWABLE_IDEA_STATUSES) {
    it(`${status} can be withdrawn`, () => {
      expect(canWithdrawIdea(status)).toBe(true);
    });
  }

  for (const status of ALL_STATUSES) {
    if (WITHDRAWABLE_IDEA_STATUSES.includes(status)) continue;
    it(`${status} cannot be withdrawn`, () => {
      expect(canWithdrawIdea(status)).toBe(false);
    });
  }
});
