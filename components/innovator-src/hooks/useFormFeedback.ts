import { useState } from 'react';

export interface FormFeedbackState {
  message: string | null;
  tone: 'success' | 'danger';
}

/**
 * Replaces the hand-duplicated `useState<string | null>` pair
 * (successMessage/formError) that every form page previously rolled on its
 * own. One state object, one `<FormAlert message={feedback.message}
 * tone={feedback.tone} />` — instead of two separate alerts per page.
 */
export function useFormFeedback() {
  const [feedback, setFeedback] = useState<FormFeedbackState>({ message: null, tone: 'danger' });

  return {
    message: feedback.message,
    tone: feedback.tone,
    setSuccess: (message: string) => setFeedback({ message, tone: 'success' }),
    setError: (message: string) => setFeedback({ message, tone: 'danger' }),
    clear: () => setFeedback({ message: null, tone: 'danger' }),
  };
}
