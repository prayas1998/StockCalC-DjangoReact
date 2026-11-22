const usernameEmailSuffix = '@users.tradesmart.local';

export function usernameFromEmail(email: string | undefined): string {
  const normalizedEmail = email?.toLowerCase();
  return normalizedEmail?.endsWith(usernameEmailSuffix)
    ? normalizedEmail.slice(0, -usernameEmailSuffix.length)
    : '';
}
