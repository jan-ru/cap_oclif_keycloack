# Service Account Authentication Guide

This guide explains how to use the OAuth 2.0 Client Credentials flow for service account authentication in automated workflows.

## Overview

Service accounts enable machine-to-machine authentication for automated workflows, scheduled jobs, and system-to-system communication without requiring human intervention.

**Requirements Implemented:**
- 4.5: Support service account authentication for automated workflows
- 4.5: Handle service account token refresh

## Quick Start

### 1. Configure Environment Variables

Set up your service account credentials in environment variables:

```bash
# Default service account
export SERVICE_ACCOUNT_CLIENT_ID="your-client-id"
export SERVICE_ACCOUNT_CLIENT_SECRET="your-client-secret"
export SERVICE_ACCOUNT_REALM="optional-realm"  # Optional
export SERVICE_ACCOUNT_SCOPE="optional-scopes"  # Optional

# Named service account (e.g., for reports)
export SERVICE_ACCOUNT_REPORTS_CLIENT_ID="reports-client-id"
export SERVICE_ACCOUNT_REPORTS_CLIENT_SECRET="reports-client-secret"
export SERVICE_ACCOUNT_REPORTS_REALM="reports-realm"
export SERVICE_ACCOUNT_REPORTS_SCOPE="reports:read reports:write"
```

### 2. Basic Usage

```typescript
import { ClientCredentialsService, ServiceAccountCredentials } from './auth';

// Create credentials
const credentials: ServiceAccountCredentials = {
  clientId: 'financial-reports-service',
  clientSecret: 'your-client-secret',
  realm: 'financial-realm',  // Optional
  scope: 'reports:read reports:write'  // Optional
};

// Authenticate
const clientCredentialsService = new ClientCredentialsService();
const tokenResponse = await clientCredentialsService.authenticateServiceAccount(credentials);

// Use the token
const authHeader = `Bearer ${tokenResponse.access_token}`;
console.log('Token expires in:', tokenResponse.expires_in, 'seconds');
```

### 3. Load from Environment

```typescript
import { ClientCredentialsService } from './auth';

// Load default service account
const defaultCredentials = ClientCredentialsService.createCredentialsFromEnv();

// Load named service account
const reportsCredentials = ClientCredentialsService.createCredentialsFromEnv('REPORTS');

// Authenticate
const service = new ClientCredentialsService();
const token = await service.authenticateServiceAccount(defaultCredentials);
```

## Token Management

### Automatic Token Caching

The service automatically caches tokens and reuses them until they expire:

```typescript
const service = new ClientCredentialsService();

// First call acquires new token
const token1 = await service.authenticateServiceAccount(credentials);

// Second call reuses cached token (if not expired)
const token2 = await service.authenticateServiceAccount(credentials);
```

### Token Refresh

Tokens are automatically refreshed when they're about to expire:

```typescript
const service = new ClientCredentialsService();

// Get initial token
const tokenResponse = await service.authenticateServiceAccount(credentials);

// If token has refresh_token, it will be used automatically
if (tokenResponse.refresh_token) {
  // Manual refresh if needed
  const refreshedToken = await service.refreshServiceAccountToken(
    credentials,
    tokenResponse.refresh_token
  );
}
```

### Token Information

Check token status and expiration:

```typescript
const service = new ClientCredentialsService();

const tokenInfo = service.getTokenInfo(credentials);

if (tokenInfo.hasToken) {
  console.log('Token expires at:', tokenInfo.expiresAt);
  console.log('Can refresh:', tokenInfo.canRefresh);
  console.log('Refresh expires at:', tokenInfo.refreshExpiresAt);
}
```

### Clear Cached Tokens

```typescript
const service = new ClientCredentialsService();

// Clear specific token
service.clearCachedToken(credentials);

// Clear all tokens
service.clearAllCachedTokens();
```

## Automated Workflows

### Example: Scheduled Report Generation

```typescript
import { ClientCredentialsService, ServiceAccountCredentials } from './auth';

class AutomatedReportService {
  private clientCredentialsService: ClientCredentialsService;
  private credentials: ServiceAccountCredentials;

  constructor(credentials: ServiceAccountCredentials) {
    this.credentials = credentials;
    this.clientCredentialsService = new ClientCredentialsService();
  }

  async generateDailyReports(): Promise<void> {
    // Authenticate service account
    const tokenResponse = await this.clientCredentialsService.authenticateServiceAccount(
      this.credentials
    );
    
    const authHeader = `Bearer ${tokenResponse.access_token}`;

    // Make authenticated API calls
    await this.callReportAPI('/api/reports/daily', authHeader);
    await this.callReportAPI('/api/reports/weekly', authHeader);
  }

  private async callReportAPI(endpoint: string, authHeader: string): Promise<void> {
    const response = await fetch(`https://api.example.com${endpoint}`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.clientCredentialsService.authenticateServiceAccount(this.credentials);
      return true;
    } catch (error) {
      console.error('Service account health check failed:', error);
      return false;
    }
  }
}

// Usage
const credentials = ClientCredentialsService.createCredentialsFromEnv('REPORTS');
const reportService = new AutomatedReportService(credentials);

// Run daily
await reportService.generateDailyReports();
```

## Integration with Existing Authentication

### Using ServiceAccountHelper

The `ServiceAccountHelper` integrates service account authentication with the existing JWT validation pipeline:

```typescript
import { ServiceAccountHelper, JWTValidatorService } from './auth';

// Create helper (requires configured JWTValidator)
const helper = new ServiceAccountHelper(
  clientCredentialsService,
  jwtValidator,
  userContextExtractor,
  config
);

// Authenticate and get user context
const authResult = await helper.authenticateServiceAccount(credentials);

if (authResult.success && authResult.userContext) {
  console.log('Service account:', authResult.userContext.username);
  console.log('Roles:', authResult.userContext.roles);
  console.log('Is service account:', authResult.userContext.isServiceAccount);
}
```

### Express Middleware

Create middleware for service account-only routes:

```typescript
import { ServiceAccountHelper } from './auth';

const helper = new ServiceAccountHelper(/* ... */);

// Create middleware
const serviceAccountMiddleware = helper.createServiceAccountMiddleware(credentials);

// Use in Express routes
app.post('/api/admin/reports', serviceAccountMiddleware, async (req, res) => {
  // Only accessible by service accounts
  const user = (req as AuthenticatedRequest).user;
  console.log('Service account:', user.username);
  
  // Generate report...
  res.json({ status: 'success' });
});
```

## Error Handling

```typescript
import { ClientCredentialsService } from './auth';

const service = new ClientCredentialsService();

try {
  const token = await service.authenticateServiceAccount(credentials);
  console.log('Authentication successful');
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('Token acquisition failed: 401')) {
      console.error('Invalid client credentials');
    } else if (error.message.includes('Token acquisition failed: 403')) {
      console.error('Client not authorized for client credentials flow');
    } else if (error.message.includes('Failed to acquire service account token')) {
      console.error('Network or server error:', error.message);
    } else {
      console.error('Unexpected error:', error.message);
    }
  }
}
```

## Validation

Validate credentials before use:

```typescript
const service = new ClientCredentialsService();

try {
  service.validateCredentials(credentials);
  console.log('Credentials are valid');
} catch (error) {
  console.error('Invalid credentials:', error.message);
}
```

## Multi-Realm Support

Service accounts can authenticate against different Keycloak realms:

```typescript
const credentials: ServiceAccountCredentials = {
  clientId: 'service-account',
  clientSecret: 'secret',
  realm: 'production-realm'  // Specify realm
};

const service = new ClientCredentialsService();
const token = await service.authenticateServiceAccount(credentials);
```

## Best Practices

1. **Store Secrets Securely**: Never hardcode client secrets. Use environment variables or secret management systems.

2. **Use Token Caching**: Let the service handle token caching automatically to reduce authentication requests.

3. **Handle Token Expiration**: The service automatically handles token refresh, but implement retry logic for expired tokens.

4. **Monitor Token Health**: Use `getTokenInfo()` to monitor token expiration and refresh status.

5. **Implement Health Checks**: Add health check endpoints that verify service account authentication.

6. **Use Appropriate Scopes**: Request only the scopes your service account needs.

7. **Log Authentication Events**: Monitor service account authentication for security auditing.

## Troubleshooting

### "Service account credentials not found"
- Ensure environment variables are set correctly
- Check variable naming (SERVICE_ACCOUNT_CLIENT_ID, etc.)

### "Token acquisition failed: 401"
- Verify client ID and secret are correct
- Check that the client exists in Keycloak
- Ensure the client has "Service Accounts Enabled" in Keycloak

### "Token acquisition failed: 403"
- Verify the client is configured for client credentials flow
- Check that the client has appropriate roles/permissions

### "Invalid realm"
- Ensure the realm name matches a configured realm
- Check KEYCLOAK_REALM or realm-specific configuration

### Token not refreshing
- Verify the token response includes a refresh_token
- Check that refresh_expires_in is greater than 0
- Ensure the refresh token hasn't expired

## API Reference

### ClientCredentialsService

- `authenticateServiceAccount(credentials)`: Authenticate and get token
- `refreshServiceAccountToken(credentials, refreshToken)`: Refresh token
- `getTokenInfo(credentials)`: Get token status
- `clearCachedToken(credentials)`: Clear specific cached token
- `clearAllCachedTokens()`: Clear all cached tokens
- `validateCredentials(credentials)`: Validate credential format
- `static createCredentialsFromEnv(name?)`: Load credentials from environment

### ServiceAccountHelper

- `authenticateServiceAccount(credentials)`: Full authentication with user context
- `createServiceAccountMiddleware(credentials)`: Create Express middleware
- `getServiceAccountToken(credentials)`: Get token for API calls
- `refreshServiceAccountToken(credentials)`: Refresh token
- `hasValidToken(credentials)`: Check if valid token exists
- `getTokenExpiration(credentials)`: Get token expiration date
- `clearToken(credentials)`: Clear cached token
- `createAuthorizationHeader(credentials)`: Create Bearer token header

## See Also

- [Keycloak Client Credentials Documentation](https://www.keycloak.org/docs/latest/securing_apps/#_client_credentials_grant)
- [OAuth 2.0 Client Credentials Flow](https://oauth.net/2/grant-types/client-credentials/)
- Authentication Configuration Guide
- JWT Validation Documentation
