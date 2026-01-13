// Core type definitions for Financial Reports CLI

/**
 * Supported financial report types
 */
export enum ReportType {
  BalanceSheet = 'BalanceSheet',
  Cashflow = 'Cashflow',
  IncomeStatement = 'IncomeStatement',
}

/**
 * Authentication configuration for OData services
 */
export interface AuthConfig {
  clientId?: string;
  clientSecret?: string;
  password?: string;
  token?: string;
  type: 'basic' | 'bearer' | 'oauth';
  username?: string;
}

/**
 * Destination configuration for OData services
 */
export interface DestinationConfig {
  authentication?: AuthConfig;
  url: string;
}

/**
 * Filter configuration for OData queries
 */
export interface FilterConfig {
  field: string;
  operator: 'eq' | 'ge' | 'gt' | 'le' | 'lt' | 'ne';
  value: number | string;
}

/**
 * Report specification configuration
 */
export interface ReportSpecification {
  destination?: DestinationConfig;
  entity: string;
  filters?: FilterConfig[];
  period: string;
  reportType: ReportType;
}

/**
 * Individual line item in financial reports
 */
export interface LineItem {
  account: string;
  amount: number;
  category?: string;
  currency: string;
  description: string;
}

/**
 * Base financial data interface
 */
export interface FinancialData {
  entity: string;
  lineItems: LineItem[];
  period: string;
  reportType: ReportType;
}

/**
 * Balance sheet specific data structure
 */
export interface BalanceSheetData extends FinancialData {
  assets: LineItem[];
  equity: LineItem[];
  liabilities: LineItem[];
}

/**
 * Income statement specific data structure
 */
export interface IncomeStatementData extends FinancialData {
  expenses: LineItem[];
  netIncome: number;
  revenue: LineItem[];
}

/**
 * Cash flow statement specific data structure
 */
export interface CashFlowData extends FinancialData {
  financingActivities: LineItem[];
  investingActivities: LineItem[];
  netCashFlow: number;
  operatingActivities: LineItem[];
}

/**
 * Report metadata information
 */
export interface ReportMetadata {
  entity: string;
  executionTime: number;
  generatedAt: Date;
  period: string;
  recordCount: number;
  reportType: ReportType;
}

/**
 * Complete report result including data and metadata
 */
export interface ReportResult {
  data: FinancialData[];
  metadata: ReportMetadata;
}

/**
 * Output format options
 */
export type OutputFormat = 'csv' | 'json' | 'table';

/**
 * Report generation options
 */
export interface ReportOptions {
  destination?: string | undefined;
  outputFormat: OutputFormat;
  verbose: boolean;
}

/**
 * Validation result for report specifications
 */
export interface ValidationResult {
  errors: ValidationError[];
  isValid: boolean;
}

/**
 * Individual validation error
 */
export interface ValidationError {
  code: string;
  field: string;
  message: string;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  context?: Record<string, unknown>;
  error: {
    code: string;
    details?: string;
    message: string;
    suggestions?: string[];
  };
  timestamp: Date;
}

/**
 * Command-line argument structure for report command
 */
export interface ReportCommandArgs {
  specFile: string;
}

/**
 * Command-line flags for report command
 */
export interface ReportCommandFlags {
  destination?: string | undefined;
  output?: OutputFormat;
  verbose?: boolean;
}

export * from './guards.js';
// Re-export validation and guard functions
export * from './validation.js';
