import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';

import { AuthenticationMiddlewareService } from '../../src/auth/middleware.js';
import { JWTValidatorService } from '../../src/auth/jwt-validator.js';
import { UserContextExtractorService } from '../../src/auth/user-context-extractor.js';
import { AuthenticationAuditorService } from '../../src/auth/authentication-auditor.js';
import { AuthConfig, JWKSClient, JWKS, JWK } from '../../src/auth/types.js';

// Mock JWKS client
class MockJWKSClient implements JWKSClient {
  private mockJWKS: JWKS = {
    keys: [
      {
        kty: 'RSA',
        use: 'sig',
        kid: 'test-key-id',
        x5t: 'test-thumbprint',
        n: 'test-modulus',
        e: 'AQAB',
        x5c: ['test-cert']
      }
    ]
  };

  async fetchJWKS(): Promise<JWKS> {
    return this.mockJWKS;
  }

  getCachedJWKS(): JWKS | null {
    return this.mockJWKS;
  }

  jwkToPem(_jwk: JWK): string {
    return '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----';
  }

  async getSigningKey(_kid: string): Promise<string> {
    return this.jwkToPem(this.mockJWKS.keys[0]!);
  }

  async getAvailableKeyIds(): Promise<string[]> {
    return this.mockJWKS.keys.map(key => key.kid);
  }

  async hasKey(kid: string): Promise<boolean> {
    return this.mockJWKS.keys.some(key => key.kid === kid);
  }
}

describe('AuthenticationMiddleware - Property Tests', () => {
  let middleware: AuthenticationMiddlewareService;
  let mockJWKSClient: MockJWKSClient;
  let jwtValidator: JWTValidatorService;
  let userContextExtractor: UserContextExtractorService;
  let auditor: AuthenticationAuditorService;
  let mockConfig: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockJWKSClient = new MockJWKSClient();
    jwtValidator = new JWTValidatorService(
      mockJWKSClient,
      'https://keycloak.example.com/realms/test',
      {
        audience: 'test-client',
        clockTolerance: 30,
        algorithms: ['RS256']
      }
    );
    userContextExtractor = new UserContextExtractorService('test');
    auditor = new AuthenticationAuditorService(true, false);
    
    mockConfig = {
      keycloakUrl: 'https://keycloak.example.com',
      realm: 'test',
      clientId: 'test-client',
      cacheTimeout: 3600,
      rateLimitConfig: {
        windowMs: 60000,
        maxRequests: 100
      }
    };

    middleware = new AuthenticationMiddlewareService(
      jwtValidator,
      userContextExtractor,
      auditor,
      mockConfig
    );
  });

  /**
   * Feature: keycloak-authentication, Property 1: Token validation consistency
   * Validates: Requirements 1.1
   * 
   * For any request without a JWT token, the Authentication_Service should return HTTP 401 Unauthorized
   */
  describe('Property 1: Token validation consistency', () => {
    it('should return 401 for any request without valid Bearer token', () => {
      fc.assert(
        fc.asyncProperty(
          // Generate random request properties
          fc.record({
            method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
            url: fc.constantFrom('/api/reports', '/api/health', '/api/data', '/api/users', '/api/config'),
            userAgent: fc.string({ minLength: 10, maxLength: 100 }),
            sourceIp: fc.ipV4(),
            // Generate various invalid authorization scenarios
            authHeader: fc.option(
              fc.oneof(
                fc.constant(undefined),  // No auth header
                fc.constant(''),  // Empty auth header
                fc.constant('Bearer'),  // Just "Bearer" without token
                fc.constant('Bearer '),  // "Bearer " with just space
                fc.string({ minLength: 1, maxLength: 20 }).map(s => `Basic ${s}`),  // Non-Bearer auth
                fc.string({ minLength: 1, maxLength: 20 }).map(s => `Digest ${s}`)  // Non-Bearer auth
              ),
              { nil: undefined }
            )
          }),
          async (requestProps) => {
            // Create fresh middleware instance for each test iteration to avoid state accumulation
            const freshMiddleware = new AuthenticationMiddlewareService(
              jwtValidator,
              userContextExtractor,
              auditor,
              mockConfig
            );
            
            // Arrange - create mock request
            const headers: any = {
              'user-agent': requestProps.userAgent,
              'x-forwarded-for': requestProps.sourceIp
            };
            
            if (requestProps.authHeader !== undefined) {
              headers['authorization'] = requestProps.authHeader;
            }
            
            const mockReq = {
              method: requestProps.method,
              url: requestProps.url,
              originalUrl: requestProps.url,
              headers,
              socket: { remoteAddress: requestProps.sourceIp }
            } as unknown as Request;

            const mockRes = {
              status: vi.fn().mockReturnThis(),
              json: vi.fn().mockReturnThis(),
              setHeader: vi.fn().mockReturnThis()
            } as unknown as Response;

            const mockNext = vi.fn() as NextFunction;

            // Act
            await freshMiddleware.authenticate(mockReq, mockRes, mockNext);

            // Assert - Requirement 1.1: Return 401 for requests without valid JWT token
            try {
              expect(mockRes.status).toHaveBeenCalledWith(401);
              expect(mockRes.json).toHaveBeenCalled();
              
              // Verify error response structure is consistent
              const errorResponse = (mockRes.json as any).mock.calls[0][0];
              expect(errorResponse).toHaveProperty('error');
              expect(errorResponse).toHaveProperty('correlation_id');
              expect(errorResponse).toHaveProperty('timestamp');
              expect(typeof errorResponse.error).toBe('string');
              expect(typeof errorResponse.correlation_id).toBe('string');
              expect(typeof errorResponse.timestamp).toBe('string');
              
              // Verify next() was NOT called (request should not proceed)
              expect(mockNext).not.toHaveBeenCalled();
              
              return true; // All assertions passed
            } catch (error) {
              console.error('Assertion failed:', error);
              return false; // Assertion failed
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
