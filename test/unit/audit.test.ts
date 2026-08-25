import { describe, it, expect } from "vitest";
import { auditLogStatement } from "@/lib/server/audit";
import type { Actor } from "@/lib/server/rbac/permissions";

const actor: Actor = { userId: "u1", email: "u1@example.com", memberships: [] };

describe("auditLogStatement — audit logging shape (sensitive mutations)", () => {
  it("always sets readonly = true (append-only trail)", () => {
    const stmt = auditLogStatement({
      organizationId: "org-1",
      actor,
      action: "Idea Status Changed",
      actionAr: "تغيير حالة الفكرة",
      entityType: "IDEA",
      entityId: "idea-1",
    });
    expect(stmt.sql).toContain("readonly");
    expect(stmt.sql).toContain("true)");
  });

  it("defaults sensitiveView to false and honors an explicit true", () => {
    const normal = auditLogStatement({
      organizationId: "org-1",
      actor,
      action: "a",
      actionAr: "a",
      entityType: "IDEA",
      entityId: "idea-1",
    });
    expect(normal.params[11]).toBe(false);

    const sensitive = auditLogStatement({
      organizationId: "org-1",
      actor,
      action: "Decision Made",
      actionAr: "اتخاذ قرار",
      entityType: "IDEA",
      entityId: "idea-1",
      sensitiveView: true,
    });
    expect(sensitive.params[11]).toBe(true);
  });

  it("falls back to 'unknown' for unavailable request metadata rather than null/undefined", () => {
    const stmt = auditLogStatement({
      organizationId: "org-1",
      actor,
      action: "a",
      actionAr: "a",
      entityType: "IDEA",
      entityId: "idea-1",
    });
    expect(stmt.params[12]).toBe("unknown"); // ip_address
    expect(stmt.params[13]).toBe("unknown"); // device
  });

  it("captures the acting user's id and email as a denormalized snapshot", () => {
    const stmt = auditLogStatement({
      organizationId: "org-1",
      actor: { userId: "u42", email: "someone@org.example", memberships: [] },
      action: "a",
      actionAr: "a",
      entityType: "IDEA",
      entityId: "idea-1",
    });
    expect(stmt.params[1]).toBe("u42");
    expect(stmt.params[2]).toBe("someone@org.example");
  });
});
