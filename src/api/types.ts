import { ReportSpecification, ReportResult, OutputFormat } from '../types/index.js';

/**
 * Request body for POST /api/reports
 */
export interface CreateReportRequest {
  specification: ReportSpecification;
  outputFormat?: OutputFormat;
  verbose?: boolean;
}

/**
 * Response for POST /api/reports (synchronous)
 */
export interface CreateReportResponse {
  id: string;
  status: 'completed' | 'failed';
  result?: ReportResult;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  createdAt: string;
  completedAt?: string;
  executionTime?: number;
}

/**
 * Response for GET /api/reports/:id
 */
export interface GetReportStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: ReportResult;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  createdAt: string;
  completedAt?: string;
  executionTime?: number;
  progress?: {
    step: string;
    percentage: number;
  };
}

/**
 * Internal report job tracking
 */
export interface ReportJob {
  id: string;
  specification: ReportSpecification;
  outputFormat: OutputFormat;
  verbose: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: ReportResult;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  createdAt: Date;
  completedAt?: Date;
  progress?: {
    step: string;
    percentage: number;
  };
}

/**
 * Validation error for API requests
 */
export interface ApiValidationError {
  field: string;
  message: string;
  value?: unknown;
}