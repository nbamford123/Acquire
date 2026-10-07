import { create, getNumericDate, verify } from 'jsr:@zaubrik/djwt@3';

import { onDenoDeploy } from './env.ts';

let keyCache: CryptoKey | null = null;
let allowedUsersCache: Record<string, string> | null = null;

// We're using email as the "password," but it's associated with the username we want to put in the returned token
// e.g. Nate:nate@none.com
const getKey = async (): Promise<CryptoKey> => {
  if (!keyCache) {
    const JWT_SECRET = Deno.env.get('JWT_SECRET');
    // A default secret is public, so anyone could sign a token; only allow one locally
    if (!JWT_SECRET && onDenoDeploy()) {
      throw new Error('JWT_SECRET must be set on Deno Deploy');
    }
    keyCache = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET || 'a-secret-key'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
  }
  return keyCache;
};

const getAllowedUsers = (): Record<string, string> => {
  if (!allowedUsersCache) {
    allowedUsersCache = Deno.env.get('ALLOWED_EMAILS')
      ?.split(',')
      .reduce((acc, entry) => {
        const [name, email] = entry.split(':');
        if (name && email) {
          acc[email.trim()] = name.trim();
        }
        return acc;
      }, {} as Record<string, string>) || {};
  }
  return allowedUsersCache;
};
export const createToken = async (email: string): Promise<string> => {
  return await create(
    { alg: 'HS256', typ: 'JWT' },
    {
      user: getAllowedUsers()[email],
      exp: getNumericDate(60 * 60 * 24 * 365), // 1 year
    },
    await getKey(),
  );
};

export const verifyToken = async (
  token: string,
): Promise<{ user: string } | null> => {
  try {
    const payload = await verify(token, await getKey());
    return { user: payload.user as string };
  } catch {
    return null;
  }
};

export const validateUser = (email: string): string | null => {
  return getAllowedUsers()[email] || null;
};

// For testing - clears caches so env changes take effect
// Everyone who can log in, by the name they play under
export const allowedNames = (): Set<string> => new Set(Object.values(getAllowedUsers()));

export const clearCache = () => {
  keyCache = null;
  allowedUsersCache = null;
};
