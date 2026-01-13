import {
  BalanceSheetData,
  CashFlowData,
  ErrorResponse,
  FinancialData,
  IncomeStatementData,
  LineItem,
  ReportMetadata,
  ReportType,
} from './index.js';

/**
 * Type guard to check if data is BalanceSheetData
 */
export function isBalanceSheetData(
  data: FinancialData
): data is BalanceSheetData {
  return (
    data.reportType === ReportType.BalanceSheet &&
    'assets' in data &&
    'liabilities' in data &&
    'equity' in data
  );
}

/**
 * Type guard to check if data is IncomeStatementData
 */
export function isIncomeStatementData(
  data: FinancialData
): data is IncomeStatementData {
  return (
    data.reportType === ReportType.IncomeStatement &&
    'revenue' in data &&
    'expenses' in data &&
    'netIncome' in data
  );
}

/**
 * Type guard to check if data is CashFlowData
 */
export function isCashFlowData(data: FinancialData): data is CashFlowData {
  return (
    data.reportType === ReportType.Cashflow &&
    'operatingActivities' in data &&
    'investingActivities' in data &&
    'financingActivities' in data &&
    'netCashFlow' in data
  );
}

/**
 * Type guard to check if an object is a valid LineItem
 */
export function isLineItem(obj: unknown): obj is LineItem {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof (obj as LineItem).account === 'string' &&
    typeof (obj as LineItem).description === 'string' &&
    typeof (obj as LineItem).amount === 'number' &&
    typeof (obj as LineItem).currency === 'string' &&
    ((obj as LineItem).category === undefined ||
      typeof (obj as LineItem).category === 'string')
  );
}

/**
 * Type guard to check if an object is valid ReportMetadata
 */
export function isReportMetadata(obj: unknown): obj is ReportMetadata {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    (obj as ReportMetadata).generatedAt instanceof Date &&
    Object.values(ReportType).includes((obj as ReportMetadata).reportType) &&
    typeof (obj as ReportMetadata).entity === 'string' &&
    typeof (obj as ReportMetadata).period === 'string' &&
    typeof (obj as ReportMetadata).recordCount === 'number' &&
    typeof (obj as ReportMetadata).executionTime === 'number'
  );
}

/**
 * Type guard to check if an object is an ErrorResponse
 */
export function isErrorResponse(obj: unknown): obj is ErrorResponse {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    (obj as ErrorResponse).error !== undefined &&
    typeof (obj as ErrorResponse).error.code === 'string' &&
    typeof (obj as ErrorResponse).error.message === 'string' &&
    (obj as ErrorResponse).timestamp instanceof Date
  );
}

/**
 * Validates that an array contains only LineItems
 */
export function areValidLineItems(items: unknown[]): items is LineItem[] {
  return (
    Array.isArray(items) &&
    items.every((item): item is LineItem => isLineItem(item))
  );
}
