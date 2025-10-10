import { assertEquals, assertNotEquals, assertRejects } from '@std/assert';
import { expect } from '@std/expect';
import { restore, stub } from '@std/testing/mock';

import { clearCache, createToken, validateUser, verifyToken } from './auth.ts';

// Mock environment variables for testing
const mockEnv = {
  JWT_SECRET: 'test-secret-key',
  ALLOWED_EMAILS: 'Test:test@localhost.com,Admin:admin@test.com,User:user@example.org',
};

Deno.test('Auth Service Tests', async (t) => {
  // Setup: Mock Deno.env.get before each test
  const envStub = stub(Deno.env, 'get', (key: string) => mockEnv[key as keyof typeof mockEnv]);

  await t.step('setup', () => {
    // Clear cache before tests to ensure clean state
    clearCache();
  });

  await t.step('validateUser - returns username for valid email', () => {
    const result = validateUser('test@localhost.com');
    assertEquals(result, 'Test');
  });

  await t.step('validateUser - returns username for another valid email', () => {
    const result = validateUser('admin@test.com');
    assertEquals(result, 'Admin');
  });

  await t.step('validateUser - returns null for invalid email', () => {
    const result = validateUser('invalid@email.com');
    assertEquals(result, null);
  });

  await t.step('validateUser - returns null for empty email', () => {
    const result = validateUser('');
    assertEquals(result, null);
  });

  await t.step('createToken - creates valid JWT token for valid email', async () => {
    const token = await createToken('test@localhost.com');
    expect(token).toEqual(expect.any(String));
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts separated by dots
  });

  await t.step('createToken - creates different tokens for different emails', async () => {
    const token1 = await createToken('test@localhost.com');
    const token2 = await createToken('admin@test.com');
    assertNotEquals(token1, token2);
  });

  await t.step(
    'createToken - creates token even for invalid email (no validation in createToken)',
    async () => {
      const token = await createToken('invalid@email.com');
      expect(token).toEqual(expect.any(String));
      expect(token.split('.')).toHaveLength(3);
    },
  );

  await t.step('verifyToken - verifies valid token and returns user', async () => {
    const token = await createToken('test@localhost.com');
    const result = await verifyToken(token);
    assertEquals(result?.user, 'Test');
  });

  await t.step('verifyToken - verifies another valid token and returns correct user', async () => {
    const token = await createToken('admin@test.com');
    const result = await verifyToken(token);
    assertEquals(result?.user, 'Admin');
  });

  await t.step('verifyToken - returns null for invalid token', async () => {
    const result = await verifyToken('invalid.token.here');
    assertEquals(result, null);
  });

  await t.step('verifyToken - returns null for empty token', async () => {
    const result = await verifyToken('');
    assertEquals(result, null);
  });

  await t.step('verifyToken - returns null for malformed token', async () => {
    const result = await verifyToken('not.a.valid.jwt.token');
    assertEquals(result, null);
  });

  await t.step('clearCache - clears internal caches', async () => {
    // First, create a token to populate cache
    await createToken('test@localhost.com');
    validateUser('test@localhost.com');

    // Clear cache
    clearCache();

    // This should work fine even after clearing cache
    const result = validateUser('test@localhost.com');
    assertEquals(result, 'Test');

    const token = await createToken('test@localhost.com');
    const verifyResult = await verifyToken(token);
    assertEquals(verifyResult?.user, 'Test');
  });

  // Cleanup
  await t.step('cleanup', () => {
    restore();
    clearCache();
  });
});

Deno.test('Auth Service - Environment Variable Edge Cases', async (t) => {
  await t.step('handles missing JWT_SECRET', async () => {
    const envStub = stub(Deno.env, 'get', (key: string) => {
      if (key === 'ALLOWED_EMAILS') return mockEnv.ALLOWED_EMAILS;
      return undefined; // No JWT_SECRET
    });

    clearCache();

    // Should use default secret
    const token = await createToken('test@localhost.com');
    expect(token).toEqual(expect.any(String));

    const result = await verifyToken(token);
    assertEquals(result?.user, 'Test');

    restore();
    clearCache();
  });

  await t.step('handles missing ALLOWED_EMAILS', () => {
    const envStub = stub(Deno.env, 'get', (key: string) => {
      if (key === 'JWT_SECRET') return mockEnv.JWT_SECRET;
      return undefined; // No ALLOWED_EMAILS
    });

    clearCache();

    // Should return null for any email when no allowed emails are configured
    const result = validateUser('test@localhost.com');
    assertEquals(result, null);

    restore();
    clearCache();
  });

  await t.step('handles malformed ALLOWED_EMAILS', () => {
    const envStub = stub(Deno.env, 'get', (key: string) => {
      if (key === 'JWT_SECRET') return mockEnv.JWT_SECRET;
      if (key === 'ALLOWED_EMAILS') return 'malformed-entry-without-colon,Another:valid@email.com';
      return undefined;
    });

    clearCache();

    // Should handle malformed entries gracefully
    const result1 = validateUser('malformed-entry-without-colon');
    assertEquals(result1, null);

    const result2 = validateUser('valid@email.com');
    assertEquals(result2, 'Another');

    restore();
    clearCache();
  });

  await t.step('handles ALLOWED_EMAILS with extra whitespace', () => {
    const envStub = stub(Deno.env, 'get', (key: string) => {
      if (key === 'JWT_SECRET') return mockEnv.JWT_SECRET;
      if (key === 'ALLOWED_EMAILS') return ' Test : test@localhost.com , Admin : admin@test.com ';
      return undefined;
    });

    clearCache();

    // Should trim whitespace correctly
    const result1 = validateUser('test@localhost.com');
    assertEquals(result1, 'Test');

    const result2 = validateUser('admin@test.com');
    assertEquals(result2, 'Admin');

    restore();
    clearCache();
  });
});

Deno.test('Auth Service - Token Expiration and Security', async (t) => {
  const envStub = stub(Deno.env, 'get', (key: string) => mockEnv[key as keyof typeof mockEnv]);

  await t.step('setup', () => {
    clearCache();
  });

  await t.step('token contains expected payload structure', async () => {
    const token = await createToken('test@localhost.com');
    const result = await verifyToken(token);

    expect(result).toEqual({
      user: 'Test',
    });
  });

  await t.step('tokens created with different secrets cannot be verified', async () => {
    // Create token with one secret
    const token = await createToken('test@localhost.com');

    // Remove old stub first
    restore();
    clearCache();

    // Change the secret and clear cache
    const newEnvStub = stub(Deno.env, 'get', (key: string) => {
      if (key === 'JWT_SECRET') return 'different-secret-key';
      if (key === 'ALLOWED_EMAILS') return mockEnv.ALLOWED_EMAILS;
      return undefined;
    });

    clearCache();

    // Try to verify with different secret
    const result = await verifyToken(token);
    assertEquals(result, null);

    restore();
    clearCache();
  });

  await t.step('cleanup', () => {
    restore();
    clearCache();
  });
});

Deno.test('Auth Service - Caching Behavior', async (t) => {
  const envStub = stub(Deno.env, 'get', (key: string) => mockEnv[key as keyof typeof mockEnv]);

  await t.step('setup', () => {
    clearCache();
  });

  await t.step('caching works correctly for allowed users', () => {
    // First call should populate cache
    const result1 = validateUser('test@localhost.com');
    assertEquals(result1, 'Test');

    // Second call should use cache (same result)
    const result2 = validateUser('test@localhost.com');
    assertEquals(result2, 'Test');

    // Different email should also work
    const result3 = validateUser('admin@test.com');
    assertEquals(result3, 'Admin');
  });

  await t.step('caching works correctly for crypto key', async () => {
    // First token creation should populate key cache
    const token1 = await createToken('test@localhost.com');
    expect(token1).toEqual(expect.any(String));

    // Second token creation should use cached key
    const token2 = await createToken('admin@test.com');
    expect(token2).toEqual(expect.any(String));

    // Both tokens should be verifiable
    const verify1 = await verifyToken(token1);
    assertEquals(verify1?.user, 'Test');

    const verify2 = await verifyToken(token2);
    assertEquals(verify2?.user, 'Admin');
  });

  await t.step('cleanup', () => {
    restore();
    clearCache();
  });
});
