import {
  executeHttpRequest,
  HttpRequestConfig,
} from '@sap-cloud-sdk/http-client';

import {
  BalanceSheetData,
  CashFlowData,
  DestinationConfig,
  ErrorResponse,
  FilterConfig,
  IncomeStatementData,
  LineItem,
  ReportType,
} from '../types/index.js';
import { ODataQuery, QueryBuilder } from './query-builder.js';

/**
 * HTTP destination configuration for OData services
 */
interface HttpDestination {
  clientId?: string;
  clientSecret?: string;
  headers?: Record<string, string>;
  password?: string;
  url: string;
  username?: string;
}

/**
 * Client for querying financial data from OData v4 services using SAP Cloud SDK
 */
export class FinancialDataClient {
  private destination: HttpDestination;
  private queryBuilder: QueryBuilder;

  /**
   * Creates a new FinancialDataClient instance
   * @param destinationConfig Configuration for the OData service connection
   */
  constructor(destinationConfig: DestinationConfig) {
    this.destination = this.createDestination(destinationConfig);
    this.queryBuilder = new QueryBuilder();
  }

  /**
   * Queries balance sheet data for a specific entity and period
   * @param entity The entity identifier
   * @param period The period in YYYY-MM format
   * @param filters Optional additional filters
   * @returns Promise resolving to balance sheet data
   */
  async queryBalanceSheet(
    entity: string,
    period: string,
    filters?: FilterConfig[]
  ): Promise<BalanceSheetData[]> {
    try {
      const query = this.queryBuilder.buildBalanceSheetQuery(
        entity,
        period,
        filters
      );

      // Query assets, liabilities, and equity separately using the query builder
      const [assets, liabilities, equity] = await Promise.all([
        this.executeQuery('BalanceSheetAssets', query),
        this.executeQuery('BalanceSheetLiabilities', query),
        this.executeQuery('BalanceSheetEquity', query),
      ]);

      const balanceSheetData: BalanceSheetData = {
        assets,
        entity,
        equity,
        liabilities,
        lineItems: [...assets, ...liabilities, ...equity],
        period,
        reportType: ReportType.BalanceSheet,
      };

      return [balanceSheetData];
    } catch (error) {
      throw this.handleODataError(error, 'queryBalanceSheet', {
        entity,
        filters,
        period,
      });
    }
  }

  /**
   * Queries cash flow data for a specific entity and period
   * @param entity The entity identifier
   * @param period The period in YYYY-MM format
   * @param filters Optional additional filters
   * @returns Promise resolving to cash flow data
   */
  async queryCashFlow(
    entity: string,
    period: string,
    filters?: FilterConfig[]
  ): Promise<CashFlowData[]> {
    try {
      const query = this.queryBuilder.buildCashFlowQuery(
        entity,
        period,
        filters
      );

      // Query operating, investing, and financing activities separately using the query builder
      const [operatingActivities, investingActivities, financingActivities] =
        await Promise.all([
          this.executeQuery('CashFlowOperating', query),
          this.executeQuery('CashFlowInvesting', query),
          this.executeQuery('CashFlowFinancing', query),
        ]);

      // Calculate net cash flow
      const totalOperating = operatingActivities.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      const totalInvesting = investingActivities.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      const totalFinancing = financingActivities.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      const netCashFlow = totalOperating + totalInvesting + totalFinancing;

      const cashFlowData: CashFlowData = {
        entity,
        financingActivities,
        investingActivities,
        lineItems: [
          ...operatingActivities,
          ...investingActivities,
          ...financingActivities,
        ],
        netCashFlow,
        operatingActivities,
        period,
        reportType: ReportType.Cashflow,
      };

      return [cashFlowData];
    } catch (error) {
      throw this.handleODataError(error, 'queryCashFlow', {
        entity,
        filters,
        period,
      });
    }
  }

  /**
   * Queries income statement data for a specific entity and period
   * @param entity The entity identifier
   * @param period The period in YYYY-MM format
   * @param filters Optional additional filters
   * @returns Promise resolving to income statement data
   */
  async queryIncomeStatement(
    entity: string,
    period: string,
    filters?: FilterConfig[]
  ): Promise<IncomeStatementData[]> {
    try {
      const query = this.queryBuilder.buildIncomeStatementQuery(
        entity,
        period,
        filters
      );

      // Query revenue and expenses separately using the query builder
      const [revenue, expenses] = await Promise.all([
        this.executeQuery('IncomeStatementRevenue', query),
        this.executeQuery('IncomeStatementExpenses', query),
      ]);

      // Calculate net income
      const totalRevenue = revenue.reduce((sum, item) => sum + item.amount, 0);
      const totalExpenses = expenses.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      const netIncome = totalRevenue - totalExpenses;

      const incomeStatementData: IncomeStatementData = {
        entity,
        expenses,
        lineItems: [...revenue, ...expenses],
        netIncome,
        period,
        reportType: ReportType.IncomeStatement,
        revenue,
      };

      return [incomeStatementData];
    } catch (error) {
      throw this.handleODataError(error, 'queryIncomeStatement', {
        entity,
        filters,
        period,
      });
    }
  }

  /**
   * Tests the connection to the OData service
   * @returns Promise resolving to true if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to execute a simple metadata request
      const request: HttpRequestConfig = {
        method: 'GET',
        url: '$metadata',
      };

      await executeHttpRequest(this.destination, request);
      return true;
    } catch (error) {
      throw this.handleODataError(error, 'testConnection', {});
    }
  }

  /**
   * Creates an HttpDestination from DestinationConfig
   */
  private createDestination(config: DestinationConfig): HttpDestination {
    const destination: HttpDestination = {
      url: config.url,
    };

    // Add authentication if provided
    if (config.authentication) {
      const auth = config.authentication;

      switch (auth.type) {
        case 'basic': {
          if (auth.username && auth.password) {
            destination.username = auth.username;
            destination.password = auth.password;
          }

          break;
        }

        case 'bearer': {
          if (auth.token) {
            destination.headers = {
              Authorization: `Bearer ${auth.token}`,
            };
          }

          break;
        }

        case 'oauth': {
          if (auth.clientId && auth.clientSecret) {
            destination.clientId = auth.clientId;
            destination.clientSecret = auth.clientSecret;
          }

          break;
        }
      }
    }

    return destination;
  }

  /**
   * Executes an OData query using the query builder configuration
   */
  private async executeQuery(
    entitySet: string,
    query: ODataQuery
  ): Promise<LineItem[]> {
    try {
      const request: HttpRequestConfig = {
        method: 'GET',
        url: `${entitySet}?$filter=${query.filter}${query.select ? `&$select=${query.select}` : ''}${query.orderBy ? `&$orderby=${query.orderBy}` : ''}${query.top ? `&$top=${query.top}` : ''}${query.skip ? `&$skip=${query.skip}` : ''}`,
      };

      const response = await executeHttpRequest(this.destination, request);

      // Parse the OData response
      const { data } = response;
      if (!data || !data.value || !Array.isArray(data.value)) {
        return [];
      }

      // Transform OData entities to LineItem format
      return data.value.map((item: Record<string, unknown>) => ({
        account: item.Account || item.account || '',
        amount: Number.parseFloat(String(item.Amount || item.amount || '0')),
        category: item.Category || item.category,
        currency: item.Currency || item.currency || 'USD',
        description: item.Description || item.description || '',
      }));
    } catch (error) {
      // If the entity set doesn't exist, return empty array instead of throwing
      if (this.isNotFoundError(error)) {
        return [];
      }

      throw error;
    }
  }

  /**
   * Handles and transforms OData errors into standardized ErrorResponse format
   */
  private handleODataError(
    error: unknown,
    operation: string,
    context: Record<string, unknown>
  ): ErrorResponse {
    let code = 'ODATA_ERROR';
    let message = 'OData service error occurred';
    let details = '';
    const suggestions: string[] = [];

    if ((error as any)?.response) {
      const { status } = (error as any).response;
      const { statusText } = (error as any).response;

      switch (status) {
        case 400: {
          code = 'ODATA_BAD_REQUEST';
          message = 'Invalid OData request';
          details = `Bad request (400): ${statusText}`;
          suggestions.push(
            'Check the entity name and period format',
            'Verify the OData service supports the requested entities'
          );
          break;
        }

        case 401: {
          code = 'ODATA_UNAUTHORIZED';
          message = 'Authentication failed';
          details = `Unauthorized (401): ${statusText}`;
          suggestions.push(
            'Check authentication credentials',
            'Verify the authentication type is correct'
          );
          break;
        }

        case 403: {
          code = 'ODATA_FORBIDDEN';
          message = 'Access denied';
          details = `Forbidden (403): ${statusText}`;
          suggestions.push(
            'Check user permissions',
            'Verify access rights to the requested data'
          );
          break;
        }

        case 404: {
          code = 'ODATA_NOT_FOUND';
          message = 'OData service or entity not found';
          details = `Not found (404): ${statusText}`;
          suggestions.push(
            'Check the service URL',
            'Verify the entity set exists in the service'
          );
          break;
        }

        case 500: {
          code = 'ODATA_SERVER_ERROR';
          message = 'OData service internal error';
          details = `Server error (500): ${statusText}`;
          suggestions.push(
            'Check OData service status',
            'Try again later',
            'Contact service administrator'
          );
          break;
        }

        default: {
          details = `HTTP ${status}: ${statusText}`;
          suggestions.push(
            'Check network connectivity',
            'Verify service availability'
          );
        }
      }
    } else if ((error as any)?.code) {
      switch ((error as any).code) {
        case 'ECONNREFUSED': {
          code = 'ODATA_CONNECTION_REFUSED';
          message = 'Connection to OData service refused';
          details = 'Connection refused by the server';
          suggestions.push(
            'Check if the service is running',
            'Verify the port number',
            'Check firewall settings'
          );
          break;
        }

        case 'ENOTFOUND': {
          code = 'ODATA_CONNECTION_ERROR';
          message = 'Cannot connect to OData service';
          details = 'DNS lookup failed - service URL not found';
          suggestions.push(
            'Check the service URL',
            'Verify network connectivity',
            'Check DNS settings'
          );
          break;
        }

        case 'ETIMEDOUT': {
          code = 'ODATA_TIMEOUT';
          message = 'OData service request timed out';
          details = 'Request timed out waiting for response';
          suggestions.push(
            'Check network connectivity',
            'Try again later',
            'Increase timeout if possible'
          );
          break;
        }

        default: {
          details = `Network error: ${(error as any).code} - ${(error as any).message}`;
          suggestions.push(
            'Check network connectivity',
            'Verify service configuration'
          );
        }
      }
    } else if (error instanceof Error) {
      details = error.message;
      suggestions.push(
        'Check the error details',
        'Verify service configuration'
      );
    } else {
      details = String(error);
      suggestions.push('Check service configuration', 'Try again');
    }

    return {
      context: {
        operation,
        ...context,
        originalError: (error as any)?.message || String(error),
      },
      error: {
        code,
        details,
        message,
        suggestions,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Checks if an error is a "not found" error (404)
   */
  private isNotFoundError(error: unknown): boolean {
    return (
      (error as any)?.response?.status === 404 ||
      (error as any)?.status === 404 ||
      (error as any)?.code === 'ENOTFOUND'
    );
  }
}

/**
 * Factory function to create a FinancialDataClient instance
 * @param destinationConfig Configuration for the OData service
 * @returns New FinancialDataClient instance
 */
export function createFinancialDataClient(
  destinationConfig: DestinationConfig
): FinancialDataClient {
  return new FinancialDataClient(destinationConfig);
}
