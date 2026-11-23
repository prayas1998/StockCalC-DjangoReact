const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
const INTERNAL_EMAIL_DOMAIN = "users.tradesmart.local";

export const normalizeUsername = (value: string): string => value.trim().toLowerCase();

export const isLikelyEmail = (value: string): boolean => value.includes("@");

export const isValidUsername = (value: string): boolean => {
  const normalized = normalizeUsername(value);
  return USERNAME_REGEX.test(normalized);
};

export const usernameToInternalEmail = (username: string): string =>
  `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;

export const resolveIdentifierToEmail = (identifier: string): string => {
  const trimmed = identifier.trim();
  return isLikelyEmail(trimmed) ? trimmed : usernameToInternalEmail(trimmed);
};
