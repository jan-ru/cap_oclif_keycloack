# Coolify Deployment with IP Address Only

**Scenario**: Using Coolify as a managed service, no custom domain, access via IP address only

**Time**: 20 minutes

## What You Have

- ✅ Coolify managed service (already installed)
- ✅ Server IP address
- ✅ GitHub repository access
- ❌ No custom domain (will use IP address)

## Important Notes

⚠️ **Without a domain, you cannot use HTTPS/SSL certificates**. Your services will run on HTTP only.

⚠️ **For production use, you should get a domain**. Free options: [Freenom](https://www.freenom.com), [DuckDNS](https://www.duckdns.org)

## Quick Deployment Steps

### 1. Access Coolify (1 minute)

1. Open browser: `http://YOUR_SERVER_IP:8000`
2. Login with your Coolify credentials
3. You should see the Coolify dashboard

### 2. Create Project (2 minutes)

1. Click **Projects** → **New Project**
2. Name: `financial-reports`
3. Description: `Financial Reports CLI with Keycloak`
4. Click **Create**
5. Click **New Environment**
6. Name: `production`
7. Click **Create**

### 3. Deploy Keycloak (8 minutes)

#### 3.1 Create Keycloak Service

1. In your environment, click **New Resource** → **Docker Compose**
2. Name: `keycloak`
3. Paste this configuration:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  keycloak:
    image: quay.io/keycloak/keycloak:23.0
    environment:
      # Database
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD}
      
      # Admin credentials
      KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN_USER}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      
      # Hostname configuration for IP-based access
      KC_HOSTNAME_STRICT: "false"
      KC_HOSTNAME_STRICT_HTTPS: "false"
      KC_HTTP_ENABLED: "true"
      
      # Proxy configuration
      KC_PROXY: edge
      
      # Logging
      KC_LOG_LEVEL: INFO
    
    command:
      - start
      - --optimized
    
    ports:
      - "8080:8080"
    
    depends_on:
      postgres:
        condition: service_healthy
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 90s
    
    restart: unless-stopped

volumes:
  postgres-data:
```

#### 3.2 Set Environment Variables

Click **Environment Variables** tab and add:

```bash
# Generate secure passwords:
# openssl rand -base64 32
# Or use: https://passwordsgenerator.net/

POSTGRES_PASSWORD=your-secure-password-here
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=your-secure-admin-password-here
```

**⚠️ Important**: Save these passwords securely! You'll need them to login.

#### 3.3 Configure Port Mapping

1. Go to **Ports** tab
2. Coolify should auto-detect port 8080
3. Note the **public port** assigned (e.g., 32768)
4. Your Keycloak will be accessible at: `http://YOUR_SERVER_IP:PUBLIC_PORT`

#### 3.4 Deploy Keycloak

1. Click **Deploy** button
2. Wait 2-3 minutes
3. Watch the **Logs** tab for deployment progress
4. Once deployed, access Keycloak at: `http://YOUR_SERVER_IP:PUBLIC_PORT`

**Example**: If your server IP is `95.217.123.45` and public port is `32768`:
- Keycloak URL: `http://95.217.123.45:32768`

### 4. Configure Keycloak (5 minutes)

#### 4.1 Login to Keycloak

1. Open: `http://YOUR_SERVER_IP:KEYCLOAK_PUBLIC_PORT`
2. Click **Administration Console**
3. Username: `admin`
4. Password: (your KEYCLOAK_ADMIN_PASSWORD)

#### 4.2 Create Realm

1. Click dropdown at top left (says "master")
2. Click **Create Realm**
3. Realm name: `financial-reports`
4. Click **Create**

#### 4.3 Create Client

1. Navigate to **Clients** → **Create Client**
2. **General Settings**:
   - Client type: `OpenID Connect`
   - Client ID: `financial-reports-api`
   - Click **Next**
3. **Capability config**:
   - Enable **Client authentication**
   - Enable **Service accounts roles**
   - Click **Next**
4. **Login settings**:
   - Leave defaults
   - Click **Save**
5. Go to **Credentials** tab
6. **Copy the Client Secret** - you'll need this!

#### 4.4 Configure Client for IP Access

1. In your client settings, go to **Settings** tab
2. **Valid redirect URIs**: `http://YOUR_SERVER_IP:*`
3. **Web origins**: `http://YOUR_SERVER_IP:*`
4. Click **Save**

#### 4.5 Create Test User

1. Navigate to **Users** → **Add User**
2. Username: `testuser`
3. Email: `test@example.com`
4. Email verified: `Yes`
5. Click **Create**
6. Go to **Credentials** tab
7. Click **Set password**
8. Password: `test123`
9. Temporary: `Off`
10. Click **Save**
11. Confirm **Yes**

### 5. Deploy Financial Reports API (8 minutes)

#### 5.1 Create API Service

1. In your Coolify environment, click **New Resource** → **Docker Compose**
2. Name: `financial-reports-api`
3. Paste this configuration:

```yaml
version: '3.8'

services:
  financial-reports-api:
    build:
      context: https://github.com/jan-ru/financial-reports-cli.git#main
      dockerfile: Dockerfile
    
    environment:
      # Application Mode
      APP_MODE: api
      NODE_ENV: production
      PORT: 3000
      HOST: 0.0.0.0
      
      # Keycloak Configuration (using IP address)
      KEYCLOAK_URL: ${KEYCLOAK_URL}
      KEYCLOAK_REALM: financial-reports
      KEYCLOAK_CLIENT_ID: financial-reports-api
      KEYCLOAK_CLIENT_SECRET: ${KEYCLOAK_CLIENT_SECRET}
      
      # JWT Configuration
      JWT_ISSUER: ${JWT_ISSUER}
      JWT_AUDIENCE: financial-reports-api
      JWT_ALGORITHMS: RS256
      JWT_CLOCK_TOLERANCE: 30
      
      # JWKS Configuration
      JWKS_CACHE_TIMEOUT: 3600000
      JWKS_RATE_LIMIT: 10
      JWKS_REQUESTS_PER_MINUTE: 5
      
      # Rate Limiting
      RATE_LIMIT_WINDOW_MS: 900000
      RATE_LIMIT_MAX_REQUESTS: 100
      
      # Security (HTTP only for IP-based deployment)
      REQUIRE_HTTPS: "false"
      ALLOWED_ORIGINS: "*"
      
      # Logging
      LOG_LEVEL: info
      AUDIT_ENABLED: "true"
      INCLUDE_TOKEN_CLAIMS: "false"
      
      # OData Service (optional)
      ODATA_SERVICE_URL: ${ODATA_SERVICE_URL}
    
    ports:
      - "3000:3000"
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    restart: unless-stopped
```

#### 5.2 Set Environment Variables

Click **Environment Variables** tab and add:

```bash
# Keycloak URLs (replace with YOUR values)
# Format: http://YOUR_SERVER_IP:KEYCLOAK_PUBLIC_PORT
KEYCLOAK_URL=http://95.217.123.45:32768
JWT_ISSUER=http://95.217.123.45:32768/realms/financial-reports

# Client Secret (from Keycloak step 4.3)
KEYCLOAK_CLIENT_SECRET=your-client-secret-from-keycloak

# OData Service (optional - leave empty if you don't have one)
ODATA_SERVICE_URL=
```

**⚠️ Replace these values**:
- `95.217.123.45` → Your actual server IP
- `32768` → Your actual Keycloak public port
- `your-client-secret-from-keycloak` → The secret you copied in step 4.3

#### 5.3 Configure Port Mapping

1. Go to **Ports** tab
2. Coolify should auto-detect port 3000
3. Note the **public port** assigned (e.g., 32769)
4. Your API will be accessible at: `http://YOUR_SERVER_IP:PUBLIC_PORT`

#### 5.4 Deploy API

1. Click **Deploy** button
2. Wait 3-5 minutes (building from GitHub)
3. Watch the **Logs** tab for build progress
4. Once deployed, access API at: `http://YOUR_SERVER_IP:API_PUBLIC_PORT/health`

**Example**: If your server IP is `95.217.123.45` and API public port is `32769`:
- API URL: `http://95.217.123.45:32769`
- Health check: `http://95.217.123.45:32769/health`

### 6. Test Your Deployment (5 minutes)

#### 6.1 Test Health Endpoints

```bash
# Replace with your actual IP and ports
export SERVER_IP="95.217.123.45"
export API_PORT="32769"
export KEYCLOAK_PORT="32768"

# Test API Health
curl http://$SERVER_IP:$API_PORT/health

# Expected response:
# {"status":"healthy","version":"0.1.9",...}

# Test Keycloak Health
curl http://$SERVER_IP:$KEYCLOAK_PORT/health/ready

# Expected: 200 OK
```

#### 6.2 Get Authentication Token

```bash
# Set your values
export SERVER_IP="95.217.123.45"
export KEYCLOAK_PORT="32768"
export CLIENT_SECRET="your-client-secret"

# Get token
TOKEN=$(curl -s -X POST \
  "http://$SERVER_IP:$KEYCLOAK_PORT/realms/financial-reports/protocol/openid-connect/token" \
  -d "client_id=financial-reports-api" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "grant_type=password" \
  -d "username=testuser" \
  -d "password=test123" \
  | jq -r '.access_token')

echo "Token: $TOKEN"
```

If you don't have `jq` installed:
```bash
# Without jq
curl -s -X POST \
  "http://$SERVER_IP:$KEYCLOAK_PORT/realms/financial-reports/protocol/openid-connect/token" \
  -d "client_id=financial-reports-api" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "grant_type=password" \
  -d "username=testuser" \
  -d "password=test123"

# Copy the access_token value manually
```

#### 6.3 Test Authenticated API Call

```bash
# Set your values
export SERVER_IP="95.217.123.45"
export API_PORT="32769"
export TOKEN="your-token-from-previous-step"

# Test API with authentication
curl -H "Authorization: Bearer $TOKEN" \
  http://$SERVER_IP:$API_PORT/api

# Expected: API information response
```

## Your Deployment Summary

After successful deployment, you'll have:

| Service | URL | Credentials |
|---------|-----|-------------|
| Coolify Dashboard | `http://YOUR_SERVER_IP:8000` | Your Coolify login |
| Keycloak Admin | `http://YOUR_SERVER_IP:KEYCLOAK_PORT` | admin / your-password |
| Financial Reports API | `http://YOUR_SERVER_IP:API_PORT` | Token-based auth |

**Example with real values**:
- Coolify: `http://95.217.123.45:8000`
- Keycloak: `http://95.217.123.45:32768`
- API: `http://95.217.123.45:32769`

## Important Security Notes

⚠️ **This setup is NOT production-ready** because:

1. **No HTTPS**: All traffic is unencrypted
2. **No domain**: Cannot get SSL certificates
3. **Exposed ports**: Services accessible on random ports
4. **Weak security**: HTTP-only authentication

### For Production Use

You **MUST** get a domain name to:
- Enable HTTPS/SSL encryption
- Use standard ports (80/443)
- Secure authentication tokens
- Meet security compliance

**Free domain options**:
- [DuckDNS](https://www.duckdns.org) - Free dynamic DNS
- [Freenom](https://www.freenom.com) - Free domains (.tk, .ml, .ga)
- [No-IP](https://www.noip.com) - Free dynamic DNS

Once you have a domain, follow the [full deployment guide](COOLIFY_QUICKSTART.md).

## Troubleshooting

### Issue: Can't Access Services

**Check**:
```bash
# Test if ports are open
telnet YOUR_SERVER_IP KEYCLOAK_PORT
telnet YOUR_SERVER_IP API_PORT

# Check firewall on server
sudo ufw status
```

**Fix**: Ensure firewall allows the ports
```bash
# On your server
sudo ufw allow 8000/tcp  # Coolify
sudo ufw allow 32768/tcp # Keycloak (your actual port)
sudo ufw allow 32769/tcp # API (your actual port)
```

### Issue: Keycloak Won't Start

**Check logs in Coolify**:
1. Navigate to Keycloak service
2. Click **Logs** tab
3. Look for errors

**Common issues**:
- Database connection failed → Check PostgreSQL is running
- Port already in use → Restart the service
- Out of memory → Increase server resources

### Issue: API Can't Connect to Keycloak

**Verify environment variables**:
1. Check `KEYCLOAK_URL` is correct
2. Check `JWT_ISSUER` is correct
3. Ensure using `http://` not `https://`
4. Verify port numbers match

**Test JWKS endpoint**:
```bash
curl http://YOUR_SERVER_IP:KEYCLOAK_PORT/realms/financial-reports/protocol/openid-connect/certs

# Should return JSON with keys
```

### Issue: 401 Unauthorized

**Verify**:
1. Client secret matches Keycloak
2. Realm name is exactly: `financial-reports`
3. User credentials are correct
4. Token hasn't expired (tokens expire after 5 minutes by default)

**Get fresh token**:
```bash
# Always get a new token for testing
TOKEN=$(curl -s -X POST \
  "http://$SERVER_IP:$KEYCLOAK_PORT/realms/financial-reports/protocol/openid-connect/token" \
  -d "client_id=financial-reports-api" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "grant_type=password" \
  -d "username=testuser" \
  -d "password=test123" \
  | jq -r '.access_token')
```

### Issue: Build Fails

**Check logs in Coolify**:
1. Navigate to API service
2. Click **Logs** tab
3. Look for build errors

**Common issues**:
- GitHub access denied → Check repository is public or add deploy key
- Out of disk space → Clean up Docker images
- Build timeout → Increase build timeout in Coolify settings

## Finding Your Port Numbers

If you forget your port numbers:

1. **In Coolify**:
   - Navigate to your service
   - Click **Ports** tab
   - Look for "Public Port"

2. **On Server** (if you have SSH access):
   ```bash
   # List all Docker containers with ports
   docker ps --format "table {{.Names}}\t{{.Ports}}"
   ```

## Next Steps

### Immediate Actions

1. ✅ Test all endpoints work
2. ✅ Save all passwords securely
3. ✅ Document your port numbers
4. ✅ Create additional test users in Keycloak

### Recommended Improvements

1. **Get a domain name** (even a free one)
2. **Enable HTTPS** with domain
3. **Set up backups** (database)
4. **Configure monitoring** (Coolify notifications)
5. **Harden security** (firewall rules)

### For Development

This IP-based setup is perfect for:
- ✅ Development and testing
- ✅ Internal network use
- ✅ Proof of concept
- ✅ Learning and experimentation

### For Production

You need:
- ❌ Custom domain
- ❌ HTTPS/SSL certificates
- ❌ Proper firewall configuration
- ❌ Backup strategy
- ❌ Monitoring and alerts

## Quick Reference

### Your URLs Template

```bash
# Replace these with your actual values
SERVER_IP="95.217.123.45"
KEYCLOAK_PORT="32768"
API_PORT="32769"
CLIENT_SECRET="your-client-secret"

# Coolify Dashboard
http://$SERVER_IP:8000

# Keycloak Admin Console
http://$SERVER_IP:$KEYCLOAK_PORT

# API Health Check
http://$SERVER_IP:$API_PORT/health

# Get Token
curl -X POST \
  "http://$SERVER_IP:$KEYCLOAK_PORT/realms/financial-reports/protocol/openid-connect/token" \
  -d "client_id=financial-reports-api" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "grant_type=password" \
  -d "username=testuser" \
  -d "password=test123"

# Test API
curl -H "Authorization: Bearer $TOKEN" \
  http://$SERVER_IP:$API_PORT/api
```

### Important Credentials

Store these securely:
- Coolify admin password
- Keycloak admin password: `admin` / (your password)
- PostgreSQL password: (your password)
- Keycloak client secret: (from Keycloak)
- Test user: `testuser` / `test123`

## Related Documentation

- [Full Coolify Deployment Guide](COOLIFY_DEPLOYMENT.md) - For domain-based deployment
- [Docker Deployment Guide](DOCKER_DEPLOYMENT.md) - For manual Docker deployment
- [Main README](../README.md) - Application documentation

## Support

- **Coolify**: [Discord](https://discord.gg/coolify)
- **Application**: [GitHub Issues](https://github.com/jan-ru/financial-reports-cli/issues)

---

**Remember**: This is a development setup. For production, get a domain and enable HTTPS!
