export type JwtPayload = {
  exp?: number;
  iat?: number;
  sub?: string;
  role?: string;
  email?: string;
  userId?: string;
  id?: string;
  [key: string]: unknown;
};

const TOKEN_KEY = 'token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function base64UrlDecode(input: string): string {
  const padLen = (4 - (input.length % 4)) % 4;
  const padded = input + '='.repeat(padLen);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');

  // atob handles base64 -> binary string
  const binary = atob(base64);

  // Convert binary string -> utf-8 string (best effort)
  try {
    const percentEncoded = Array.from(binary)
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
    return decodeURIComponent(percentEncoded);
  } catch {
    return binary;
  }
}

export function getJwtPayload(): JwtPayload | null {
  const token = getToken();
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getRole(): string | null {
  const payload = getJwtPayload();
  const role = (payload?.role as string | undefined) ?? null;
  return role;
}

export function isAdmin(): boolean {
  const role = getRole();
  if (!role) return false;
  return role.toLowerCase() === 'admin';
}

export function isTutor(): boolean {
  const role = getRole();
  if (!role) return false;
  return role.toLowerCase() === 'tutor';
}

export function isLearner(): boolean {
  const role = getRole();
  if (!role) return false;
  return role.toLowerCase() === 'learner';
}
