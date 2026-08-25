import { clsx, type ClassValue } from 'clsx';

/** Merge class names conditionally. Kept simple (no tailwind-merge) — no conflicting utility groups yet. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
