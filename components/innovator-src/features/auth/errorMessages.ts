import type { AuthErrorCode } from './types';

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  UNKNOWN_EMAIL: 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني.',
  INVALID_CREDENTIALS: 'كلمة المرور غير صحيحة.',
  NETWORK_ERROR: 'تعذر الاتصال بالخادم. تحقق من الاتصال بالإنترنت وحاول مرة أخرى.',
  VALIDATION_ERROR: 'يرجى التحقق من البيانات المدخلة.',
  EMAIL_ALREADY_REGISTERED: 'هذا البريد الإلكتروني مسجّل بالفعل. جرّب تسجيل الدخول بدلًا من ذلك.',
};

const FALLBACK_MESSAGE = 'حدث خطأ غير متوقع. حاول مرة أخرى.';

export function getAuthErrorMessage(code: AuthErrorCode | undefined): string {
  if (!code) return FALLBACK_MESSAGE;
  return AUTH_ERROR_MESSAGES[code] ?? FALLBACK_MESSAGE;
}
