import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { Avatar } from '@innovator/components/ui/Avatar';

export interface ProfileAvatarProps {
  name: string;
  imageUrl?: string;
}

/**
 * UI-only avatar change: no avatar-upload service exists yet (no storage
 * provider confirmed), so selecting a file only previews it locally via an
 * object URL — it is NOT persisted to `profileService` and will revert on
 * reload. Clearly labeled rather than silently pretending to save.
 */
export function ProfileAvatar({ name, imageUrl }: ProfileAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} imageUrl={previewUrl ?? imageUrl} size="lg" />
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-sm font-medium text-inv-brand-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700 rounded-inv-control"
        >
          <Camera className="size-4" aria-hidden="true" />
          تغيير الصورة
        </button>
        <p className="mt-1 text-xs text-inv-ink-400">معاينة مؤقتة فقط — رفع الصور الدائم غير متاح بعد.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
