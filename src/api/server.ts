import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { logger } from '../cli.js';
import { ErrorResponse } from '../types/index.js';

/**
 * Configuration interface for the API server
 */
export interface ApiServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  enableLogging: boolean;
  environment: 'development' | 'production' | 'test';
}

/**
 * Default configuration for the API server
 */
const DEFAULT_CONFIG: ApiServerConfig = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
  enableLogging: process.env.NODE_ENV !== 'test',
  environment: (process.env.NODE_ENV as ApiServerConfig['environment']) || 'development',
};

/**
 * Express.js API server for HTTP mode
 * Provides REST endpoints for financial report generation
 */
export class ApiServer {
  private app: Application;
  private config: ApiServerConfig;
  private server?: import('http').Server;

  constructor(config: Partial<ApiServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: this.config.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }));

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging (only in non-test environments)
    if (this.config.enableLogging) {
      this.app.use(morgan('combined', {
        stream: {
          write: (message: string) => {
            logger.info(`HTTP: ${message.trim()}`);
          },
        },
      }));
    }

    // Request ID middleware for tracing
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'] || 
                       `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.headers['x-request-id'] = requestId as string;
      res.setHeader('X-Request-ID', requestId);
      next();
    });
  }

  /**
   * Set up API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.3',
        environment: this.config.environment,
      });
    });

    // API info endpoint
    this.app.get('/api', (_req: Request, res: Response) => {
      res.json({
        name: 'Financial Reports API',
        version: process.env.npm_package_version || '0.1.3',
        description: 'REST API for generating financial reports from OData services',
        endpoints: {
          health: 'GET /health',
          reports: 'POST /api/reports',
          reportStatus: 'GET /api/reports/:id',
        },
        documentation: 'https://github.com/jan-ru/financial-reports-cli',
      });
    });

    // Placeholder for report endpoints (to be implemented in next tasks)
    this.app.post('/api/reports', (_req: Request, res: Response) => {
      res.status(501).json({
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Report generation endpoint not yet implemented',
        },
        timestamp: new Date(),
      });
    });

    this.app.get('/api/reports/:id', (_req: Request, res: Response) => {
      res.status(501).json({
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Report status endpoint not yet implemented',
        },
        timestamp: new Date(),
      });
    });

    // 404 handler for unknown routes
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`,
        },
        timestamp: new Date(),
      });
    });
  }

  /**
   * Set up global error handling middleware
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
      const requestId = req.headers['x-request-id'] as string;
      
      logger.error(`Request ${requestId} failed:`, error.message);
      
      // Check if it's a structured error response
      if (this.isErrorResponse(error)) {
        res.status(this.getHttpStatusForErrorCode(error.error.code)).json(error);
        return;
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Handle JSON parsing errors
      if (error instanceof SyntaxError && 'body' in error) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body',
          },
          timestamp: new Date(),
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Default error response
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: this.config.environment === 'production' 
            ? 'An internal server error occurred' 
            : error.message,
        },
        timestamp: new Date(),
      };

      res.status(500).json(errorResponse);
    });
  }

  /**
   * Type guard to check if an object is an ErrorResponse
   */
  private isErrorResponse(obj: unknown): obj is ErrorResponse {
    return Boolean(
      obj &&
      typeof obj === 'object' &&
      'error' in obj &&
      typeof (obj as ErrorResponse).error.code === 'string' &&
      typeof (obj as ErrorResponse).error.message === 'string' &&
      'timestamp' in obj
    );
  }

  /**
   * Map error codes to HTTP status codes
   */
  private getHttpStatusForErrorCode(errorCode: string): number {
    const statusMap: Record<string, number> = {
      // Client errors (4xx)
      'VALIDATION_ERROR': 400,
      'INVALID_JSON': 400,
      'MALFORMED_SPECIFICATION': 400,
      'PARSE_ERROR': 400,
      'INVALID_PERIOD_FORMAT': 400,
      'UNSUPPORTED_REPORT_TYPE': 400,
      'SPECIFICATION_INVALID': 400,
      
      'UNAUTHORIZED': 401,
      'AUTHENTICATION_ERROR': 401,
      
      'ACCESS_DENIED': 403,
      'PERMISSION_ERROR': 403,
      
      'FILE_NOT_FOUND': 404,
      'SPECIFICATION_NOT_FOUND': 404,
      'ENTITY_NOT_FOUND': 404,
      'ROUTE_NOT_FOUND': 404,
      
      'TIMEOUT_ERROR': 408,
      
      // Server errors (5xx)
      'INTERNAL_ERROR': 500,
      'UNKNOWN_ERROR': 500,
      'REPORT_GENERATION_ERROR': 500,
      
      'NOT_IMPLEMENTED': 501,
      
      'CONNECTION_ERROR': 502,
      'NETWORK_ERROR': 502,
      'ODATA_SERVICE_ERROR': 502,
      'DATA_RETRIEVAL_ERROR': 502,
      
      'FILE_WRITE_ERROR': 503,
    };

    return statusMap[errorCode] || 500;
  }

  /**
   * Start the HTTP server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          logger.success(`API server started on http://${this.config.host}:${this.config.port}`);
          logger.info(`Environment: ${this.config.environment}`);
          logger.info(`CORS origins: ${this.config.corsOrigins.join(', ')}`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          logger.error('Failed to start API server:', error.message);
          reject(error);
        });

        // Graceful shutdown handling
        process.on('SIGTERM', () => this.stop());
        process.on('SIGINT', () => this.stop());

      } catch (error) {
        logger.error('Error starting API server:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the HTTP server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        logger.info('Stopping API server...');
        this.server.close(() => {
          logger.success('API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the Express application instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Get the current configuration
   */
  public getConfig(): ApiServerConfig {
    return { ...this.config };
  }
}