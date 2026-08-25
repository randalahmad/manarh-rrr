import type { IdeaAttachment } from '../types';
import { mockDelay, generateId } from '@innovator/services/mock/utils';

export interface AttachmentUploadResult {
  success: boolean;
  fileName: string;
  attachment?: IdeaAttachment;
  /** Present only when success is false. No UI string here — this is a code-free failure reason for logging/debugging. */
  reason?: string;
}

/**
 * attachmentUploadService abstraction.
 *
 * Knows only how to turn a `File` into an `IdeaAttachment` (or report why it
 * couldn't). Has no idea what an "Idea" is — `ideaWorkflow` is the
 * only caller, and it's the one that knows uploaded attachments belong to a
 * particular idea submission.
 */
export interface AttachmentUploadService {
  upload(file: File): Promise<AttachmentUploadResult>;
  uploadMany(files: File[]): Promise<AttachmentUploadResult[]>;
}

class MockAttachmentUploadService implements AttachmentUploadService {
  async upload(file: File): Promise<AttachmentUploadResult> {
    // No storage provider is confirmed yet — this mock always succeeds and
    // fabricates a local object URL so the UI has something to link to.
    // Swap this method's internals for a real upload (progress, presigned
    // URLs, etc.) once a provider is chosen; the return shape stays the same.
    const attachment: IdeaAttachment = {
      id: generateId('att'),
      ideaId: '', // filled in by ideaService when the idea is actually saved
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
    };
    return mockDelay({ success: true, fileName: file.name, attachment }, 400);
  }

  async uploadMany(files: File[]): Promise<AttachmentUploadResult[]> {
    // Runs uploads concurrently; each result is independent so the caller
    // (ideaWorkflow) can see exactly which files failed, if any.
    return Promise.all(files.map((file) => this.upload(file)));
  }
}

export const attachmentUploadService: AttachmentUploadService = new MockAttachmentUploadService();
