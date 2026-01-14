import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthenticationAuditorService } from '../../src/auth/authentication-auditor.js';
import { AuthEvent, SecurityAlert } from '../../src/auth/types.js';
import { logger } from '../../src/cli.js';

// Mock the logger
vi.mock('../../src/cli.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

describe('AuthenticationAuditorService - Property Tests', () => {
  let auditor: AuthenticationAuditorService;
  const mockLogger = vi.mocked(logger);

  beforeEach(() => {
    vi.clearAllMocks();
    auditor = new AuthenticationAuditorService(true, false);
  });

  /**
   * Feature: keycloak-authentication, Property 10: Comprehensive audit logging
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
   * 
   * For any authentication event (success, failure, expiration), the Audit_Logger should create 
   * structured JSON logs with correlation IDs and appropriate details
   */
  describe('Property 10: Comprehensive audit logging', () => {
    it('should log all successful authentication events with required fields', () => {
      fc.assert(
        fc.property(
          // Generate random AuthEvent for successful authentication
          fc.record({
            correlationId: fc.uuid(),
            endpoint: fc.constantFrom('/api/reports', '/api/health', '/api/data', '/api/users'),
            method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
            sourceIp: fc.ipV4(),
            success: fc.constant(true),
            timestamp: fc.date(),
            userAgent: fc.string({ maxLength: 200, minLength: 10 }),
            userId: fc.uuid(),
            username: fc.string({ maxLength: 50, minLength: 3 })
          }),
          (authEvent: AuthEvent) => {
            // Act
            auditor.logAuthSuccess(authEvent);

            // Assert - should log structured JSON
            expect(mockLogger.info).toHaveBeenCalled();
            
            // Find the JSON log call
            const jsonLogCall = mockLogger.info.mock.calls.find(
              call => call[0] === 'Authentication Success'
            );
            expect(jsonLogCall).toBeDefined();
            
            // Parse and verify the JSON structure
            const loggedJson = JSON.parse(jsonLogCall![1] as string);
            
            // Requirement 5.1: Log successful authentication with user context
            expect(loggedJson.event_type).toBe('AUTH_SUCCESS');
            expect(loggedJson.user_id).toBe(authEvent.userId);
            expect(loggedJson.username).toBe(authEvent.username);
            expect(loggedJson.success).toBe(true);
            
            // Requirement 5.4: Include correlation IDs for request tracing
            expect(loggedJson.correlation_id).toBe(authEvent.correlationId);
            
            // Requirement 5.5: Log in structured JSON format
            expect(loggedJson.timestamp).toBe(authEvent.timestamp.toISOString());
            expect(loggedJson.source_ip).toBe(authEvent.sourceIp);
            expect(loggedJson.user_agent).toBe(authEvent.userAgent);
            expect(loggedJson.endpoint).toBe(authEvent.endpoint);
            expect(loggedJson.method).toBe(authEvent.method);
            
            vi.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log all authentication failures with error details', () => {
      fc.assert(
        fc.property(
          // Generate random AuthEvent for failed authentication
          fc.record({
            correlationId: fc.uuid(),
            endpoint: fc.constantFrom('/api/reports', '/api/health', '/api/data'),
            errorCode: fc.constantFrom('invalid_token', 'expired_token', 'missing_token', 'malformed_token'),
            errorMessage: fc.string({ maxLength: 100, minLength: 10 }),
            method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
            sourceIp: fc.ipV4(),
            success: fc.constant(false),
            timestamp: fc.date(),
            userAgent: fc.string({ maxLength: 200, minLength: 10 }),
            userId: fc.option(fc.uuid(), { nil: undefined }),
            username: fc.option(fc.string({ maxLength: 50, minLength: 3 }), { nil: undefined })
          }),
          (authEvent: AuthEvent) => {
            // Act
            auditor.logAuthFailure(authEvent);

            // Assert - should log structured JSON
            expect(mockLogger.warn).toHaveBeenCalled();
            
            // Find the JSON log call
            const jsonLogCall = mockLogger.warn.mock.calls.find(
              call => call[0] === 'Authentication Failure'
            );
            expect(jsonLogCall).toBeDefined();
            
            // Parse and verify the JSON structure
            const loggedJson = JSON.parse(jsonLogCall![1] as string);
            
            // Requirement 5.2: Log authentication failures with error details
            expect(loggedJson.event_type).toBe('AUTH_FAILURE');
            expect(loggedJson.error_code).toBe(authEvent.errorCode);
            expect(loggedJson.error_message).toBe(authEvent.errorMessage);
            expect(loggedJson.success).toBe(false);
            
            // Requirement 5.4: Include correlation IDs
            expect(loggedJson.correlation_id).toBe(authEvent.correlationId);
            
            // Requirement 5.2: Log source IP for failures
            expect(loggedJson.source_ip).toBe(authEvent.sourceIp);
            
            // Requirement 5.5: Structured JSON format
            expect(loggedJson.timestamp).toBe(authEvent.timestamp.toISOString());
            expect(loggedJson.endpoint).toBe(authEvent.endpoint);
            expect(loggedJson.method).toBe(authEvent.method);
            
            vi.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log all token expiration events with user context', () => {
      fc.assert(
        fc.property(
          // Generate random AuthEvent for token expiration
          fc.record({
            correlationId: fc.uuid(),
            endpoint: fc.constantFrom('/api/reports', '/api/health', '/api/data'),
            method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
            sourceIp: fc.ipV4(),
            success: fc.constant(false),
            timestamp: fc.date(),
            userAgent: fc.string({ maxLength: 200, minLength: 10 }),
            userId: fc.uuid(),
            username: fc.string({ maxLength: 50, minLength: 3 })
          }),
          (authEvent: AuthEvent) => {
            // Act
            auditor.logTokenExpiration(authEvent);

            // Assert - should log structured JSON
            expect(mockLogger.info).toHaveBeenCalled();
            
            // Find the JSON log call
            const jsonLogCall = mockLogger.info.mock.calls.find(
              call => call[0] === 'Token Expiration'
            );
            expect(jsonLogCall).toBeDefined();
            
            // Parse and verify the JSON structure
            const loggedJson = JSON.parse(jsonLogCall![1] as string);
            
            // Requirement 5.3: Log token expiration events
            expect(loggedJson.event_type).toBe('TOKEN_EXPIRED');
            expect(loggedJson.user_id).toBe(authEvent.userId);
            expect(loggedJson.username).toBe(authEvent.username);
            expect(loggedJson.success).toBe(false);
            
            // Requirement 5.4: Include correlation IDs
            expect(loggedJson.correlation_id).toBe(authEvent.correlationId);
            
            // Requirement 5.5: Structured JSON format
            expect(loggedJson.timestamp).toBe(authEvent.timestamp.toISOString());
            expect(loggedJson.source_ip).toBe(authEvent.sourceIp);
            expect(loggedJson.endpoint).toBe(authEvent.endpoint);
            expect(loggedJson.method).toBe(authEvent.method);
            
            vi.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log all security alerts with appropriate severity and details', () => {
      fc.assert(
        fc.property(
          // Generate random SecurityAlert
          fc.record({
            details: fc.dictionary(
              fc.string({ maxLength: 20, minLength: 3 }),
              fc.oneof(fc.string(), fc.integer(), fc.boolean())
            ),
            severity: fc.constantFrom('LOW', 'MEDIUM', 'HIGH'),
            sourceIp: fc.ipV4(),
            timestamp: fc.date(),
            type: fc.constantFrom('RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_PATTERN', 'INVALID_TOKEN_STRUCTURE')
          }),
          (securityAlert: SecurityAlert) => {
            // Act
            auditor.logSecurityAlert(securityAlert);

            // Assert - should log structured JSON
            expect(mockLogger.warn).toHaveBeenCalled();
            
            // Find the JSON log call
            const jsonLogCall = mockLogger.warn.mock.calls.find(
              call => call[0] === 'Security Alert'
            );
            expect(jsonLogCall).toBeDefined();
            
            // Parse and verify the JSON structure
            const loggedJson = JSON.parse(jsonLogCall![1] as string);
            
            // Requirement 7.3: Log security alerts
            expect(loggedJson.event_type).toBe('SECURITY_ALERT');
            expect(loggedJson.alert_type).toBe(securityAlert.type);
            expect(loggedJson.severity).toBe(securityAlert.severity);
            expect(loggedJson.source_ip).toBe(securityAlert.sourceIp);
            
            // Requirement 5.5: Structured JSON format
            expect(loggedJson.timestamp).toBe(securityAlert.timestamp.toISOString());
            expect(loggedJson.details).toEqual(securityAlert.details);
            
            // High severity alerts should also log as error
            if (securityAlert.severity === 'HIGH') {
              expect(mockLogger.error).toHaveBeenCalled();
            }
            
            vi.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain correlation IDs across all log types for request tracing', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.date(),
          fc.ipV4(),
          fc.string({ maxLength: 200, minLength: 10 }),
          fc.constantFrom('/api/reports', '/api/health'),
          fc.constantFrom('GET', 'POST'),
          (correlationId, timestamp, sourceIp, userAgent, endpoint, method) => {
            // Create events with same correlation ID
            const successEvent: AuthEvent = {
              correlationId,
              endpoint,
              method,
              sourceIp,
              success: true,
              timestamp,
              userAgent,
              userId: 'user-123',
              username: 'testuser'
            };

            const failureEvent: AuthEvent = {
              correlationId,
              endpoint,
              errorCode: 'invalid_token',
              errorMessage: 'Token is invalid',
              method,
              sourceIp,
              success: false,
              timestamp,
              userAgent
            };

            const expirationEvent: AuthEvent = {
              correlationId,
              endpoint,
              method,
              sourceIp,
              success: false,
              timestamp,
              userAgent,
              userId: 'user-123',
              username: 'testuser'
            };

            // Act - log all event types
            auditor.logAuthSuccess(successEvent);
            const successLog = JSON.parse(
              mockLogger.info.mock.calls.find(c => c[0] === 'Authentication Success')![1] as string
            );

            vi.clearAllMocks();
            auditor.logAuthFailure(failureEvent);
            const failureLog = JSON.parse(
              mockLogger.warn.mock.calls.find(c => c[0] === 'Authentication Failure')![1] as string
            );

            vi.clearAllMocks();
            auditor.logTokenExpiration(expirationEvent);
            const expirationLog = JSON.parse(
              mockLogger.info.mock.calls.find(c => c[0] === 'Token Expiration')![1] as string
            );

            // Assert - Requirement 5.4: All logs should have same correlation ID
            expect(successLog.correlation_id).toBe(correlationId);
            expect(failureLog.correlation_id).toBe(correlationId);
            expect(expirationLog.correlation_id).toBe(correlationId);

            vi.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not log any events when audit is disabled', () => {
      fc.assert(
        fc.property(
          fc.record({
            correlationId: fc.uuid(),
            endpoint: fc.constantFrom('/api/reports', '/api/health'),
            method: fc.constantFrom('GET', 'POST'),
            sourceIp: fc.ipV4(),
            success: fc.boolean(),
            timestamp: fc.date(),
            userAgent: fc.string({ maxLength: 200, minLength: 10 }),
            userId: fc.uuid(),
            username: fc.string({ maxLength: 50, minLength: 3 })
          }),
          (authEvent: AuthEvent) => {
            // Arrange - disable audit
            const disabledAuditor = new AuthenticationAuditorService(false, false);

            // Act
            disabledAuditor.logAuthSuccess(authEvent);
            disabledAuditor.logAuthFailure(authEvent);
            disabledAuditor.logTokenExpiration(authEvent);

            // Assert - no logs should be generated
            const infoCallsCount = mockLogger.info.mock.calls.filter(
              call => call[0] !== 'Audit logging disabled'
            ).length;
            expect(infoCallsCount).toBe(0);
            expect(mockLogger.warn).not.toHaveBeenCalled();
            expect(mockLogger.error).not.toHaveBeenCalled();

            vi.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
