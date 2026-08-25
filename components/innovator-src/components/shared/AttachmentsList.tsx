import { Paperclip, Download } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@innovator/components/ui/Card';
import { EmptyState } from '@innovator/components/shared/EmptyState';
import { formatFileSize } from '@innovator/utils/formatFileSize';

/**
 * Structural shape only — `IdeaAttachment` and `ProjectAttachment` both
 * satisfy this already, so either can be passed directly without mapping.
 * If a future domain's attachment shape diverges, that domain maps to this
 * shape at its own boundary; this component stays domain-agnostic.
 */
export interface AttachmentListItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

export interface AttachmentsListProps {
  attachments: AttachmentListItem[];
  title?: string;
  emptyTitle?: string;
}

/**
 * Read-only attachments list — no uploader. Used by both Idea Details and
 * Project Details.
 *
 * Phase 6, Group E: real project attachments are metadata-only (no object
 * storage wired yet — see lib/server/services/attachments.ts's header), so
 * a real attachment has no real `fileUrl`. Rather than link to a fabricated
 * or empty URL, an attachment with no `fileUrl` renders its download
 * control disabled with a tooltip explaining why (approved decision) —
 * metadata (name, size) is still shown for real.
 */
export function AttachmentsList({ attachments, title = 'المرفقات', emptyTitle = 'لا توجد مرفقات' }: AttachmentsListProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-inv-display font-bold text-inv-ink-900">{title}</h2>
      </CardHeader>
      <CardBody>
        {attachments.length === 0 ? (
          <EmptyState icon={Paperclip} title={emptyTitle} />
        ) : (
          <ul className="flex flex-col gap-2">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center gap-3 rounded-inv-control border border-inv-ink-100 px-3 py-2"
              >
                <Paperclip className="size-4 shrink-0 text-inv-ink-500" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm text-inv-ink-900">{attachment.fileName}</span>
                <span className="shrink-0 text-xs text-inv-ink-400">{formatFileSize(attachment.fileSize)}</span>
                {attachment.fileUrl ? (
                  <a
                    href={attachment.fileUrl}
                    download={attachment.fileName}
                    aria-label={`تنزيل ${attachment.fileName}`}
                    className="shrink-0 rounded-inv-control p-1.5 text-inv-ink-500 hover:bg-inv-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700"
                  >
                    <Download className="size-4" aria-hidden="true" />
                  </a>
                ) : (
                  <span
                    className="shrink-0 cursor-not-allowed rounded-inv-control p-1.5 text-inv-ink-300"
                    title="تنزيل الملفات غير متاح حاليًا — تخزين الملفات الفعلي لم يُفعّل بعد."
                    aria-label={`تنزيل ${attachment.fileName} غير متاح حاليًا`}
                  >
                    <Download className="size-4" aria-hidden="true" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
