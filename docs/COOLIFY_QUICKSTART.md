# Coolify Deployment Quick Start

**Goal**: Deploy financial-reports-cli to Hetzner with Coolify in 30 minutes

## Prerequisites Checklist

- [ ] Hetzner Ubuntu server (22.04+) with 4GB+ RAM
- [ ] Domain name with DNS access
- [ ] Coolify installed on server
- [ ] GitHub repository access

## Step-by-Step Deployment

### 1. Server Setup (5 minutes)

```bash
# SSH into your Hetzner server
ssh root@YOUR_SERVER_IP

# Install Coolify if not already installed
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Access Coolify
# Open browser: http://YOUR_SERVER_IP:8000
```

### 2. DNS Configuration (5 minutes)

Configure these DNS A records pointing to your server IP:

```
api.yourdomain.com    → YOUR_SERVER_IP
auth.yourdomain.com   → YOUR_SERVER_IP
```

**Verify DNS propagation**:
```bash
dig api.yourdomain.com
dig auth.yourdomain.com
```

### 3. Create Project in Coolify (2 minutes)

1. Login to Coolify: `http://YOUR_SERVER_IP:8000`
2. Click **Projects** → **New Project**
3. Name: `financial-reports`
4. Click **Create**
5. Click **New Environment** → Name: `production` → **Create**

### 4. Deploy Keycloak (10 minutes)

#### 4.1 Create Keycloak Service

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
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD}
      KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN_USER}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KC_HOSTNAME: ${KEYCLOAK_HOSTNAME}
      KC_HOSTNAME_STRICT: "true"
      KC_HOSTNAME_STRICT_HTTPS: "true"
      KC_PROXY: edge
      KC_HTTP_ENABLED: "true"
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

#### 4.2 Set Environment Variables

Click **Environment Variables** and add:

```bash
# Generate secure passwords first:
# openssl rand -base64 32

POSTGRES_PASSWORD=<your-secure-password>
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=<your-secure-password>
KEYCLOAK_HOSTNAME=auth.yourdomain.com
```

#### 4.3 Configure Domain

1. Go to **Domains** tab
2. Add: `auth.yourdomain.com`
3. Enable **HTTPS** (Let's Encrypt)
4. Click **Save**

#### 4.4 Deploy

1. Click **Deploy**
2. Wait 2-3 minutes
3. Check logs for errors
4. Access: `https://auth.yourdomain.com`

### 5. Configure Keycloak (5 minutes)

1. Login to Keycloak: `https://auth.yourdomain.com`
2. Username: `admin`
3. Password: (your KEYCLOAK_ADMIN_PASSWORD)

#### 5.1 Create Realm

1. Click **Create Realm**
2. Name: `financial-reports`
3. Click **Create**

#### 5.2 Create Client

1. Navigate to **Clients** → **Create Client**
2. Client ID: `financial-reports-api`
3. Client Protocol: `openid-connect`
4. Click **Next**
5. Enable **Client authentication**
6. Enable **Service accounts roles**
7. Click **Save**
8. Go to **Credentials** tab
9. **Copy the Client Secret** (you'll need this!)

#### 5.3 Create Test User

1. Navigate to **Users** → **Add User**
2. Username: `testuser`
3. Email: `test@example.com`
4. Click **Create**
5. Go to **Credentials** tab
6. Set password: `test123`
7. Disable **Temporary**
8. Click **Set Password**

### 6. Deploy Financial Reports API (8 minutes)

#### 6.1 Create API Service

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
      APP_MODE: api
      NODE_ENV: production
      PORT: 3000
      HOST: 0.0.0.0
      KEYCLOAK_URL: https://auth.yourdomain.com
      KEYCLOAK_REALM: financial-reports
      KEYCLOAK_CLIENT_ID: financial-reports-api
      KEYCLOAK_CLIENT_SECRET: ${KEYCLOAK_CLIENT_SECRET}
      JWT_ISSUER: https://auth.yourdomain.com/realms/financial-reports
      JWT_AUDIENCE: financial-reports-api
      JWT_ALGORITHMS: RS256
      JWT_CLOCK_TOLERANCE: 30
      JWKS_CACHE_TIMEOUT: 3600000
      JWKS_RATE_LIMIT: 10
      JWKS_REQUESTS_PER_MINUTE: 5
      RATE_LIMIT_WINDOW_MS: 900000
      RATE_LIMIT_MAX_REQUESTS: 100
      REQUIRE_HTTPS: "true"
      ALLOWED_ORIGINS: https://api.yourdomain.com,https://auth.yourdomain.com
      LOG_LEVEL: info
      AUDIT_ENABLED: "true"
      INCLUDE_TOKEN_CLAIMS: "false"
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

#### 6.2 Set Environment Variables

Click **Environment Variables** and add:

```bash
# From Keycloak client credentials tab
KEYCLOAK_CLIENT_SECRET=<your-client-secret-from-keycloak>

# Your OData service URL (if you have one)
ODATA_SERVICE_URL=http://your-odata-service:4004/odata/v4/financial
```

#### 6.3 Configure Domain

1. Go to **Domains** tab
2. Add: `api.yourdomain.com`
3. Enable **HTTPS** (Let's Encrypt)
4. Click **Save**

#### 6.4 Deploy

1. Click **Deploy**
2. Wait 3-5 minutes (building from source)
3. Check logs for errors
4. Access: `https://api.yourdomain.com/health`

### 7. Test Deployment (5 minutes)

#### 7.1 Test Health Endpoints

```bash
# API Health
curl https://api.yourdomain.com/health

# Expected response:
# {"status":"healthy","version":"0.1.9",...}

# Keycloak Health
curl https://auth.yourdomain.com/health/ready

# Expected response: 200 OK
```

#### 7.2 Get Authentication Token

```bash
# Get token from Keycloak
TOKEN=$(curl -s -X POST https://auth.yourdomain.com/realms/financial-reports/protocol/openid-connect/token \
  -d "client_id=financial-reports-api" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=password" \
  -d "username=testuser" \
  -d "password=test123" \
  | jq -r '.access_token')

echo "Token: $TOKEN"
```

#### 7.3 Test Authenticated API Call

```bash
# Test API with token
curl -H "Authorization: Bearer $TOKEN" \
  https://api.yourdomain.com/api

# Expected: API information response
```

## Troubleshooting

### Issue: SSL Certificate Not Working

**Solution**:
```bash
# Verify DNS
dig api.yourdomain.com

# Check firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# In Coolify: Domains tab → Regenerate Certificate
```

### Issue: Keycloak Won't Start

**Check logs in Coolify**:
1. Navigate to Keycloak service
2. Click **Logs** tab
3. Look for database connection errors

**Common fix**: Increase server memory or restart PostgreSQL

### Issue: API Can't Connect to Keycloak

**Verify**:
```bash
# Test JWKS endpoint
curl https://auth.yourdomain.com/realms/financial-reports/protocol/openid-connect/certs

# Should return JSON with keys
```

**Fix**: Ensure KEYCLOAK_URL uses `https://` not `http://`

### Issue: 401 Unauthorized

**Verify**:
1. Client secret matches Keycloak
2. Realm name is correct: `financial-reports`
3. User credentials are correct
4. Token hasn't expired

## Next Steps

### Production Hardening

1. **Change default passwords**
2. **Set up backups** (see full guide)
3. **Configure monitoring** (Coolify notifications)
4. **Set up firewall rules**
5. **Enable audit logging**

### Optional Enhancements

1. **Add Redis for caching**
2. **Set up log aggregation**
3. **Configure custom domain for Coolify**
4. **Add monitoring dashboard (Grafana)**
5. **Set up automated backups to S3**

## Quick Reference

### Important URLs

- Coolify Dashboard: `http://YOUR_SERVER_IP:8000`
- Keycloak Admin: `https://auth.yourdomain.com`
- API Health: `https://api.yourdomain.com/health`
- API Docs: `https://api.yourdomain.com/api`

### Important Credentials

Store these securely:
- Coolify admin password
- Keycloak admin password
- PostgreSQL password
- Keycloak client secret

### Useful Commands

```bash
# SSH to server
ssh root@YOUR_SERVER_IP

# View Docker containers
docker ps

# View logs
docker logs <container-id> -f

# Restart service (in Coolify UI)
# Navigate to service → Restart button
```

## Full Documentation

For detailed information, see:
- [Complete Coolify Deployment Guide](COOLIFY_DEPLOYMENT.md)
- [Docker Deployment Guide](DOCKER_DEPLOYMENT.md)
- [Development Guide](DEVELOPMENT.md)
- [Main README](../README.md)

## Support

- **Coolify**: [Discord](https://discord.gg/coolify)
- **Application**: [GitHub Issues](https://github.com/jan-ru/financial-reports-cli/issues)
- **Hetzner**: [Support Portal](https://www.hetzner.com/support)
