import { useState } from 'react';
import { ConfirmModal } from '@innovator/components/shared/ConfirmModal';
import { FormAlert } from '@innovator/components/shared/FormAlert';
import { Textarea } from '@innovator/components/ui/Textarea';

export interface WithdrawIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  error?: string | null;
}

export function WithdrawIdeaModal({ isOpen, onClose, onConfirm, error }: WithdrawIdeaModalProps) {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={() => onConfirm(reason)}
      title="سحب الفكرة"
      description="سيتم سحب الفكرة مع الاحتفاظ بسجلها بالكامل. لا يمكن التراجع عن هذا الإجراء."
      confirmLabel="تأكيد السحب"
      confirmVariant="danger"
      isConfirmDisabled={reason.trim().length === 0}
    >
      <div className="flex flex-col gap-3">
        <FormAlert message={error ?? null} />
        <Textarea
          label="سبب السحب"
          required
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
    </ConfirmModal>
  );
}
