/**
 * Action-layer tests for lib/server/actions/attachments.ts (Phase 6, Group
 * E) — the first test coverage for this action file (Group B built
 * comments' equivalent, attachments had none). Metadata-only, per the
 * approved abstraction: no storage vendor, no file bytes. Creating/listing
 * requires VIEW permission on the underlying entity, resolved via
 * lib/server/services/entity-resolver.ts (same rule as comments.ts).
 * Deletion is uploader-or-ORG_ADMIN only.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getCurrentActor: vi.fn(),
  getCurrentUserProfile: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { getCurrentActor, getCurrentUserProfile } from "@/lib/server/auth/session";
import { query, queryOne, transaction } from "@/lib/server/db";
import { createAttachmentAction, deleteAttachmentAction, listAttachmentsForEntityAction } from "@/lib/server/actions/attachments";
import type { AttachmentRow } from "@/lib/server/services/attachments";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "55555555-5555-4555-8555-555555555555";
const ATTACHMENT_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";

function attachmentRow(overrides: Partial<AttachmentRow> = {}): AttachmentRow {
  return {
    id: ATTACHMENT_ID,
    entity_type: "PROJECT",
    entity_id: PROJECT_ID,
    file_name: "خطة.pdf",
    file_type: "application/pdf",
    size_kb: 512,
    storage_provider: "s3",
    storage_bucket: "manarah-docs",
    storage_key: "projects/plan.pdf",
    uploaded_by: "uploader-1",
    uploaded_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function viewerActor(): Actor {
  return {
    userId: "uploader-1",
    email: "uploader@example.com",
    memberships: [{ membershipId: "m1", organizationId: ORG, role: "PROJECT_MANAGER", grants: [{ area: "PROJECT", action: "VIEW" }] }],
  };
}

function noViewGrantActor(): Actor {
  return {
    userId: "outsider-1",
    email: "outsider@example.com",
    memberships: [{ membershipId: "m2", organizationId: ORG, role: "EVALUATOR", grants: [] }],
  };
}

function orgAdminActor(): Actor {
  return {
    userId: "admin-1",
    email: "admin@example.com",
    memberships: [{ membershipId: "m3", organizationId: ORG, role: "ORG_ADMIN", grants: [{ area: "PROJECT", action: "VIEW" }] }],
  };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
  vi.mocked(getCurrentActor).mockResolvedValue(viewerActor());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("createAttachmentAction", () => {
  it("creates attachment metadata for an actor with VIEW on the underlying project", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(transaction).mockResolvedValueOnce([[attachmentRow()], []]);
    const result = await createAttachmentAction({
      entityType: "PROJECT",
      entityId: PROJECT_ID,
      fileName: "خطة.pdf",
      fileType: "application/pdf",
      sizeKb: 512,
      storageBucket: "manarah-docs",
      storageKey: "projects/plan.pdf",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.entity_type).toBe("PROJECT");
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await createAttachmentAction({
      entityType: "PROJECT",
      entityId: PROJECT_ID,
      fileName: "خطة.pdf",
      fileType: "application/pdf",
      sizeKb: 512,
      storageBucket: "b",
      storageKey: "k",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("returns FORBIDDEN for an actor without VIEW on the underlying project", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(noViewGrantActor());
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    const result = await createAttachmentAction({
      entityType: "PROJECT",
      entityId: PROJECT_ID,
      fileName: "خطة.pdf",
      fileType: "application/pdf",
      sizeKb: 512,
      storageBucket: "b",
      storageKey: "k",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: OTHER_ORG });
    const result = await createAttachmentAction({
      entityType: "PROJECT",
      entityId: PROJECT_ID,
      fileName: "خطة.pdf",
      fileType: "application/pdf",
      sizeKb: 512,
      storageBucket: "b",
      storageKey: "k",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await createAttachmentAction({
      entityType: "PROJECT",
      entityId: PROJECT_ID,
      fileName: "خطة.pdf",
      fileType: "application/pdf",
      sizeKb: 512,
      storageBucket: "b",
      storageKey: "k",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("fails validation for a missing fileName", async () => {
    const result = await createAttachmentAction({
      entityType: "PROJECT",
      entityId: PROJECT_ID,
      fileType: "application/pdf",
      sizeKb: 512,
      storageBucket: "b",
      storageKey: "k",
    });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("deleteAttachmentAction", () => {
  it("allows the uploader to delete their own attachment", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(attachmentRow({ uploaded_by: "uploader-1" })).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(transaction).mockResolvedValueOnce([[], []]);
    const result = await deleteAttachmentAction({ attachmentId: ATTACHMENT_ID });
    expect(result.ok).toBe(true);
  });

  it("allows an ORG_ADMIN to delete someone else's attachment", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(orgAdminActor());
    vi.mocked(queryOne).mockResolvedValueOnce(attachmentRow({ uploaded_by: "someone-else" })).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(transaction).mockResolvedValueOnce([[], []]);
    const result = await deleteAttachmentAction({ attachmentId: ATTACHMENT_ID });
    expect(result.ok).toBe(true);
  });

  it("returns FORBIDDEN when a non-uploader, non-admin tries to delete — update/delete authorization enforced", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(noViewGrantActor());
    vi.mocked(queryOne).mockResolvedValueOnce(attachmentRow({ uploaded_by: "someone-else" })).mockResolvedValueOnce({ organization_id: ORG });
    const result = await deleteAttachmentAction({ attachmentId: ATTACHMENT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for an attachment that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await deleteAttachmentAction({ attachmentId: ATTACHMENT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

describe("listAttachmentsForEntityAction", () => {
  it("returns attachments for an actor with VIEW on the underlying project", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(query).mockResolvedValueOnce([attachmentRow()]);
    const result = await listAttachmentsForEntityAction({ entityType: "PROJECT", entityId: PROJECT_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns FORBIDDEN for an actor without VIEW on the underlying entity", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(noViewGrantActor());
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    const result = await listAttachmentsForEntityAction({ entityType: "PROJECT", entityId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: OTHER_ORG });
    const result = await listAttachmentsForEntityAction({ entityType: "PROJECT", entityId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await listAttachmentsForEntityAction({ entityType: "PROJECT", entityId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});
