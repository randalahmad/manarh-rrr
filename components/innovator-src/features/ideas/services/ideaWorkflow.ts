import type { Idea, IdeaAttachment, IdeaFormValues, IdeaStatus, SubmitterType } from '../types';
import { ideaService } from './ideaService';
import { attachmentUploadService } from './attachmentUploadService';
import { membershipService } from '@innovator/services/membershipService';
import { canPerformIdeaOperation, type IdeaOperation } from '../policies';

export type IdeaWorkflowErrorCode =
  | 'INVALID_TRANSITION'
  | 'ATTACHMENT_UPLOAD_FAILED'
  | 'SAVE_FAILED'
  | 'SUBMIT_FAILED'
  | 'WITHDRAW_FAILED'
  | 'COMPLETE_INFORMATION_FAILED';

export interface IdeaWorkflowErrorDetails {
  /** Names of the files that failed to upload — only set for ATTACHMENT_UPLOAD_FAILED. */
  failedFileNames?: string[];
  /** The operation that was refused — only set for INVALID_TRANSITION. */
  operation?: IdeaOperation;
}

/**
 * Structured, code-only error (no Arabic strings — same pattern as
 * `AuthError`). The UI maps `code` (+ `details`) to a message via
 * `features/ideas/workflowErrorMessages.ts` and presents it with
 * `FormAlert`.
 */
export class IdeaWorkflowError extends Error {
  code: IdeaWorkflowErrorCode;
  details?: IdeaWorkflowErrorDetails;
  constructor(code: IdeaWorkflowErrorCode, details?: IdeaWorkflowErrorDetails) {
    super(code);
    this.name = 'IdeaWorkflowError';
    this.code = code;
    this.details = details;
  }
}

/** Every workflow operation returns the updated idea AND where the page should navigate next — the page never constructs that route itself. */
export interface IdeaWorkflowResult {
  idea: Idea;
  redirectTo: string;
}

export interface IdeaSaveOrSubmitInput {
  values: IdeaFormValues;
  /** Newly selected local files, not yet uploaded. */
  pendingFiles: File[];
  /** Already-uploaded attachments to keep (edit mode only). */
  existingAttachments?: IdeaAttachment[];
  /** `null` when creating a brand-new idea (no existing record yet). */
  currentStatus: IdeaStatus | null;
  /** Present when saving/submitting an existing draft. */
  draftId?: string;
  /**
   * The submitting user's id — used only when creating a brand-new idea
   * (`draftId` absent) to resolve `submitterType` via `membershipService`.
   * Ignored on updates, since `submitterType` never changes after creation.
   */
  currentUserId: string;
}

export interface IdeaWithdrawInput {
  ideaId: string;
  currentStatus: IdeaStatus;
  reason: string;
}

export interface IdeaCompleteInformationInput {
  ideaId: string;
  currentStatus: IdeaStatus;
  requestId: string;
  response: string;
  pendingFiles: File[];
  existingAttachments: IdeaAttachment[];
}

/**
 * ideaWorkflow abstraction — the single application-service layer for every
 * idea lifecycle operation. Pages call only this; never `ideaService` or
 * `attachmentUploadService` directly.
 *
 *   SubmitIdeaPage / IdeaDetailsPage → ideaWorkflow.<operation>()
 *                                          → policy check (features/ideas/policies.ts)
 *                                          → attachmentUploadService.uploadMany()  (save/submit only)
 *                                          → ideaService.<matching method>()
 *
 * Generalized (Phase 4C refinement) beyond just "submission" so
 * `withdraw`/`completeInformation` share the same policy-checked,
 * error-structured, navigation-aware shape as `saveDraft`/`submit` — no
 * future operation needs its own bespoke orchestration pattern.
 */
export interface IdeaWorkflow {
  saveDraft(input: IdeaSaveOrSubmitInput): Promise<IdeaWorkflowResult>;
  submit(input: IdeaSaveOrSubmitInput): Promise<IdeaWorkflowResult>;
  withdraw(input: IdeaWithdrawInput): Promise<IdeaWorkflowResult>;
  completeInformation(input: IdeaCompleteInformationInput): Promise<IdeaWorkflowResult>;
}

class DefaultIdeaWorkflow implements IdeaWorkflow {
  private assertAllowed(operation: IdeaOperation, currentStatus: IdeaStatus | null) {
    if (!canPerformIdeaOperation(operation, currentStatus)) {
      throw new IdeaWorkflowError('INVALID_TRANSITION', { operation });
    }
  }

  /**
   * Uploads any new files and merges them with existing attachments.
   * Aborts (throws) the moment any file fails — the idea itself is never
   * saved/submitted with a partial attachment set, guaranteeing consistency
   * between the idea and what it claims to have attached.
   */
  private async resolveAttachments(input: {
    pendingFiles: File[];
    existingAttachments?: IdeaAttachment[];
  }): Promise<IdeaAttachment[]> {
    const existing = input.existingAttachments ?? [];
    if (input.pendingFiles.length === 0) return existing;

    const results = await attachmentUploadService.uploadMany(input.pendingFiles);
    const failed = results.filter((r) => !r.success);

    if (failed.length > 0) {
      throw new IdeaWorkflowError('ATTACHMENT_UPLOAD_FAILED', {
        failedFileNames: failed.map((f) => f.fileName),
      });
    }

    return [...existing, ...results.map((r) => r.attachment!)];
  }

  /**
   * `submitterType` is only meaningful — and only computed — when creating a
   * brand-new idea. On updates, `ideaService` preserves whatever was
   * recorded at creation (Phase 1: immutable once set). Determined via
   * `membershipService`, never guessed from the session (which deliberately
   * carries no internal/external flag — see `features/auth/types.ts`).
   */
  private async resolveSubmitterType(input: IdeaSaveOrSubmitInput): Promise<SubmitterType | undefined> {
    if (input.draftId) return undefined;
    const isInternal = await membershipService.isInternalMember(input.currentUserId, input.values.organizationId);
    return isInternal ? 'internal' : 'external';
  }

  async saveDraft(input: IdeaSaveOrSubmitInput): Promise<IdeaWorkflowResult> {
    this.assertAllowed('SAVE_DRAFT', input.currentStatus);
    const attachments = await this.resolveAttachments(input);
    const submitterType = await this.resolveSubmitterType(input);

    let idea: Idea;
    try {
      idea = await ideaService.saveDraft(input.values, attachments, input.draftId, submitterType);
    } catch {
      throw new IdeaWorkflowError('SAVE_FAILED');
    }

    return { idea, redirectTo: `/innovator/ideas/${idea.id}/edit` };
  }

  async submit(input: IdeaSaveOrSubmitInput): Promise<IdeaWorkflowResult> {
    this.assertAllowed('SUBMIT', input.currentStatus);
    const attachments = await this.resolveAttachments(input);
    const submitterType = await this.resolveSubmitterType(input);

    let idea: Idea;
    try {
      idea = await ideaService.submit(input.values, attachments, input.draftId, submitterType);
    } catch {
      throw new IdeaWorkflowError('SUBMIT_FAILED');
    }

    return { idea, redirectTo: `/innovator/ideas/${idea.id}` };
  }

  async withdraw(input: IdeaWithdrawInput): Promise<IdeaWorkflowResult> {
    this.assertAllowed('WITHDRAW', input.currentStatus);

    let idea: Idea;
    try {
      idea = await ideaService.withdraw(input.ideaId, input.reason);
    } catch {
      throw new IdeaWorkflowError('WITHDRAW_FAILED');
    }

    return { idea, redirectTo: `/innovator/ideas/${idea.id}` };
  }

  async completeInformation(input: IdeaCompleteInformationInput): Promise<IdeaWorkflowResult> {
    this.assertAllowed('COMPLETE_INFORMATION', input.currentStatus);
    const attachments = await this.resolveAttachments(input);

    let idea: Idea;
    try {
      idea = await ideaService.respondToInformationRequest(input.ideaId, input.requestId, input.response, attachments);
    } catch {
      throw new IdeaWorkflowError('COMPLETE_INFORMATION_FAILED');
    }

    return { idea, redirectTo: `/innovator/ideas/${idea.id}` };
  }
}

export const ideaWorkflow: IdeaWorkflow = new DefaultIdeaWorkflow();
