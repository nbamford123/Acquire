import { create, getNumericDate, verify } from 'jsr:@zaubrik/djwt@3';

const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'a-secret-key';
const key = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(JWT_SECRET),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify'],
);

// We're using email as the "password," but it's associated with the username we want to put in the returned token
// e.g. Nate:nate@none.com
const allowedUsers = Deno.env.get('ALLOWED_EMAILS')
  ?.split(',')
  .reduce((acc, entry) => {
    const [name, email] = entry.split(':');
    acc[email.trim()] = name.trim();
    return acc;
  }, {} as Record<string, string>) || {};

export const createToken = async (email: string): Promise<string> => {
  return await create(
    { alg: 'HS256', typ: 'JWT' },
    {
      user: allowedUsers[email],
      exp: getNumericDate(60 * 60 * 24 * 365), // 1 year
    },
    key,
  );
};

export const verifyToken = async (
  token: string,
): Promise<{ user: string } | null> => {
  try {
    const payload = await verify(token, key);
    return { user: payload.user as string };
  } catch {
    return null;
  }
};

export const isEmailAllowed = (email: string): boolean => {
  return Object.keys(allowedUsers).includes(email.toLowerCase());
};
