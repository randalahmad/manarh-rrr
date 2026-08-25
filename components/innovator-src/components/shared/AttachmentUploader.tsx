import { useRef, useState, type DragEvent } from 'react';
import { Paperclip, UploadCloud, X, FileText } from 'lucide-react';
import { cn } from '@innovator/utils/cn';
import { formatFileSize } from '@innovator/utils/formatFileSize';

export interface PendingAttachment {
  id: string;
  file: File;
}

export interface AttachmentUploaderProps {
  files: PendingAttachment[];
  onFilesChange: (files: PendingAttachment[]) => void;
  /**
   * All limits are caller-configurable — NOT hardcoded business rules.
   * Pass values from confirmed backend constraints once available.
   */
  acceptedTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  error?: string;
  disabled?: boolean;
}

export function AttachmentUploader({
  files,
  onFilesChange,
  acceptedTypes,
  maxFileSize,
  maxFiles,
  error,
  disabled,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    setLocalError(null);

    const incoming = Array.from(newFiles);
    let combined = [...files];

    for (const file of incoming) {
      if (maxFileSize && file.size > maxFileSize) {
        setLocalError(`الملف "${file.name}" يتجاوز الحجم المسموح (${formatFileSize(maxFileSize)}).`);
        continue;
      }
      if (maxFiles && combined.length >= maxFiles) {
        setLocalError(`الحد الأقصى لعدد المرفقات هو ${maxFiles}.`);
        break;
      }
      combined = [...combined, { id: `${file.name}-${file.size}-${Date.now()}`, file }];
    }

    onFilesChange(combined);
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-inv-card border-2 border-dashed px-4 py-8 text-center transition-colors',
          isDragging ? 'border-inv-brand-700 bg-inv-brand-50' : 'border-inv-ink-200',
          disabled && 'opacity-60',
        )}
      >
        <UploadCloud className="size-6 text-inv-ink-500" aria-hidden="true" />
        <p className="text-sm text-inv-ink-700">
          اسحب الملفات هنا أو{' '}
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="font-medium text-inv-brand-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700"
          >
            تصفح الملفات
          </button>
        </p>
        {(acceptedTypes || maxFileSize) && (
          <p className="text-xs text-inv-ink-500">
            {acceptedTypes && `الأنواع المسموحة: ${acceptedTypes.join('، ')}`}
            {acceptedTypes && maxFileSize && ' — '}
            {maxFileSize && `الحد الأقصى للحجم: ${formatFileSize(maxFileSize)}`}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          disabled={disabled}
          accept={acceptedTypes?.join(',')}
          onChange={(e) => addFiles(e.target.files)}
          className="sr-only"
        />
      </div>

      {(localError || error) && <p className="text-sm text-inv-status-danger-fg">{localError ?? error}</p>}

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map(({ id, file }) => (
            <li
              key={id}
              className="flex items-center justify-between gap-3 rounded-inv-control border border-inv-ink-100 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-inv-ink-500" aria-hidden="true" />
                <span className="truncate text-sm text-inv-ink-900">{file.name}</span>
                <span className="shrink-0 text-xs text-inv-ink-500">{formatFileSize(file.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(id)}
                aria-label={`إزالة ${file.name}`}
                className="shrink-0 rounded-inv-control p-1 text-inv-ink-500 hover:bg-inv-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Small inline icon-only badge used elsewhere to indicate an idea has attachments. */
export function AttachmentCountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-inv-ink-500">
      <Paperclip className="size-3.5" aria-hidden="true" />
      {count}
    </span>
  );
}
