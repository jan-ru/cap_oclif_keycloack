import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JWKSClientService } from '../../src/auth/jwks-client.js';
import { JWKS } from '../../src/auth/types.js';

describe('JWKSClientService - Property Tests', () => {
  /**
   * Feature: keycloak-authentication, Property 7: JWKS caching resilience
   * Validates: Requirements 3.2
   * 
   * For any authentication request when JWKS endpoint is unavailable, the Authentication_Service 
   * should continue validation using cached keys
   */
  describe('Property 7: JWKS caching resilience', () => {
    it('should use cached JWKS when endpoint is unavailable after successful initial fetch', () => {
      fc.assert(
        fc.property(
          // Generate random cache timeout (1 second to 10 minutes)
          fc.integer({ min: 1000, max: 600000 }),
          async (cacheTimeout) => {
            // Arrange - Create mock JWKS response with a simple structure
            const mockJWKS: JWKS = {
              keys: [{
                kty: 'RSA',
                use: 'sig',
                kid: 'test-key-1',
                x5t: 'test-thumbprint',
                n: 'test-modulus',
                e: 'AQAB',
                x5c: ['test-cert']
              }]
            };
            
            let fetchCallCount = 0;
            const originalFetch = global.fetch;
            
            // Mock fetch to succeed first, then fail
            global.fetch = vi.fn(async () => {
              fetchCallCount++;
              if (fetchCallCount === 1) {
                // First call succeeds
                return {
                  ok: true,
                  json: async () => mockJWKS,
                  status: 200,
                  statusText: 'OK'
                } as Response;
              } else {
                // Subsequent calls fail (endpoint unavailable)
                return {
                  ok: false,
                  status: 503,
                  statusText: 'Service Unavailable'
                } as Response;
              }
            }) as any;

            const client = new JWKSClientService('http://test.example.com/jwks', cacheTimeout);

            // Act - First fetch should succeed and populate cache
            const firstResult = await client.fetchJWKS();
            
            // Assert - First fetch returns the JWKS
            expect(firstResult.keys).toHaveLength(1);
            expect(firstResult.keys[0]?.kid).toBe('test-key-1');
            
            // Act - Second fetch should use cached JWKS despite endpoint failure
            const secondResult = await client.fetchJWKS();
            
            // Assert - Requirement 3.2: Should return cached JWKS when endpoint unavailable
            expect(secondResult.keys).toHaveLength(1);
            expect(secondResult.keys[0]?.kid).toBe('test-key-1');
            
            // Cleanup
            global.fetch = originalFetch;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error when endpoint fails and no cache is available', () => {
      fc.assert(
        fc.property(
          // Generate random cache timeout
          fc.integer({ min: 1000, max: 600000 }),
          async (cacheTimeout) => {
            // Arrange - Mock fetch to always fail
            const originalFetch = global.fetch;
            global.fetch = vi.fn(async () => ({
              ok: false,
              status: 503,
              statusText: 'Service Unavailable'
            })) as any;

            const client = new JWKSClientService('http://test.example.com/jwks', cacheTimeout);

            // Act & Assert - Should throw error when no cache available
            try {
              await client.fetchJWKS();
              // If we get here, the test should fail
              expect(true).toBe(false);
            } catch (error) {
              // Verify error message contains expected text
              expect(error instanceof Error).toBe(true);
              expect((error as Error).message).toContain('Failed to fetch JWKS and no cache available');
            }
            
            // Cleanup
            global.fetch = originalFetch;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return cached JWKS within cache timeout without refetching', () => {
      fc.assert(
        fc.property(
          // Generate cache timeout (5 seconds to 10 minutes)
          fc.integer({ min: 5000, max: 600000 }),
          async (cacheTimeout) => {
            // Arrange
            const mockJWKS: JWKS = {
              keys: [{
                kty: 'RSA',
                use: 'sig',
                kid: 'test-key-1',
                x5t: 'test-thumbprint',
                n: 'test-modulus',
                e: 'AQAB',
                x5c: ['test-cert']
              }]
            };
            
            let fetchCallCount = 0;
            const originalFetch = global.fetch;
            
            global.fetch = vi.fn(async () => {
              fetchCallCount++;
              return {
                ok: true,
                json: async () => mockJWKS,
                status: 200,
                statusText: 'OK'
              } as Response;
            }) as any;

            const client = new JWKSClientService('http://test.example.com/jwks', cacheTimeout);

            // Act - Multiple fetches within cache timeout
            const firstResult = await client.fetchJWKS();
            const secondResult = await client.fetchJWKS();
            const thirdResult = await client.fetchJWKS();
            
            // Assert - Requirement 3.2: Should use cache and only fetch once
            expect(firstResult.keys[0]?.kid).toBe('test-key-1');
            expect(secondResult.keys[0]?.kid).toBe('test-key-1');
            expect(thirdResult.keys[0]?.kid).toBe('test-key-1');
            expect(fetchCallCount).toBe(1); // Only first call should fetch
            
            // Cleanup
            global.fetch = originalFetch;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle network errors gracefully with cached fallback', () => {
      fc.assert(
        fc.property(
          // Generate random cache timeout
          fc.integer({ min: 1000, max: 600000 }),
          async (cacheTimeout) => {
            // Arrange
            const mockJWKS: JWKS = {
              keys: [{
                kty: 'RSA',
                use: 'sig',
                kid: 'test-key-1',
                x5t: 'test-thumbprint',
                n: 'test-modulus',
                e: 'AQAB',
                x5c: ['test-cert']
              }]
            };
            
            let fetchCallCount = 0;
            const originalFetch = global.fetch;
            
            // Mock fetch to succeed first, then throw network error
            global.fetch = vi.fn(async () => {
              fetchCallCount++;
              if (fetchCallCount === 1) {
                return {
                  ok: true,
                  json: async () => mockJWKS,
                  status: 200,
                  statusText: 'OK'
                } as Response;
              } else {
                throw new Error('Network error: ECONNREFUSED');
              }
            }) as any;

            const client = new JWKSClientService('http://test.example.com/jwks', cacheTimeout);

            // Act - First fetch succeeds
            const firstResult = await client.fetchJWKS();
            expect(firstResult.keys[0]?.kid).toBe('test-key-1');
            
            // Act - Second fetch encounters network error but should use cache
            const secondResult = await client.fetchJWKS();
            
            // Assert - Requirement 3.2: Should fallback to cache on network errors
            expect(secondResult.keys[0]?.kid).toBe('test-key-1');
            
            // Cleanup
            global.fetch = originalFetch;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
