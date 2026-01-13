import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ApiServer } from '../../src/api/server.js';

describe('API Server Tests', () => {
  let server: ApiServer;
  let app: any;

  beforeAll(async () => {
    server = new ApiServer({
      port: 0, // Use random port for testing
      enableLogging: false, // Disable logging in tests
      environment: 'test',
    });
    app = server.getApp();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Health Check Endpoints', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment', 'test');
    });
  });

  describe('API Info Endpoints', () => {
    test('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Financial Reports API');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('health');
      expect(response.body.endpoints).toHaveProperty('reports');
    });
  });

  describe('Report Endpoints (Placeholder)', () => {
    test('should return not implemented for POST /api/reports', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({ test: 'data' })
        .expect(501);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_IMPLEMENTED');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should return not implemented for GET /api/reports/:id', async () => {
      const response = await request(app)
        .get('/api/reports/test-id')
        .expect(501);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_IMPLEMENTED');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
      expect(response.body.error.message).toContain('GET /nonexistent not found');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_JSON');
    });
  });

  describe('CORS Headers', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      // CORS middleware should add credentials header
      expect(response.headers).toHaveProperty('access-control-allow-credentials');
    });

    test('should handle OPTIONS requests', async () => {
      await request(app)
        .options('/api/reports')
        .expect(204);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });
});