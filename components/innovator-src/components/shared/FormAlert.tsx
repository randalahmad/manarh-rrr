import { Alert, type AlertTone } from '@innovator/components/ui/Alert';

export interface FormAlertProps {
  message: string | null;
  tone?: AlertTone;
}

/**
 * Generic form-level feedback banner. Renders nothing when there's no
 * message, so callers can use it unconditionally:
 * `<FormAlert message={formError} />`.
 *
 * Not auth-specific — any form (Submit Idea, Complete Information, Profile,
 * Login, Forgot Password...) can use this for server/submission errors.
 */
export function FormAlert({ message, tone = 'danger' }: FormAlertProps) {
  if (!message) return null;
  return (
    <Alert tone={tone}>
      <span>{message}</span>
    </Alert>
  );
}
