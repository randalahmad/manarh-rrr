import type { EmploymentStatus } from '@innovator/types/common';

/** Single source of truth for employment status → Arabic label. Literal values only — no others invented. */
export const EMPLOYMENT_STATUS_CONFIG: Record<EmploymentStatus, { label: string }> = {
  STUDENT: { label: 'طالب' },
  EMPLOYED: { label: 'موظف' },
  JOB_SEEKER: { label: 'باحث عن عمل' },
};

export function getEmploymentStatusLabel(status: EmploymentStatus): string {
  return EMPLOYMENT_STATUS_CONFIG[status].label;
}
